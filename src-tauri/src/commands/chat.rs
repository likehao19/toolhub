use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::Response,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    net::{SocketAddr, UdpSocket},
    sync::{
        atomic::{AtomicU16, Ordering},
        Arc, OnceLock,
    },
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::sync::{broadcast, oneshot, Mutex, RwLock};

const UDP_PORT: u16 = 18766;
const PREFIX: &str = "TOOLHUB_CHAT:";

// ---- 服务器状态 ----

#[derive(Clone)]
struct RoomState {
    tx: broadcast::Sender<String>,
    users: Arc<RwLock<Vec<String>>>,
}

#[derive(Clone)]
struct ServerState {
    rooms: Arc<RwLock<HashMap<String, RoomState>>>,
}

impl ServerState {
    fn new() -> Self {
        Self { rooms: Arc::new(RwLock::new(HashMap::new())) }
    }

    async fn get_or_create_room(&self, id: &str) -> RoomState {
        {
            let rooms = self.rooms.read().await;
            if let Some(r) = rooms.get(id) {
                return r.clone();
            }
        }
        let (tx, _) = broadcast::channel(128);
        let room = RoomState { tx, users: Arc::new(RwLock::new(Vec::new())) };
        self.rooms.write().await.insert(id.to_string(), room.clone());
        room
    }
}

// ---- 全局生命周期 ----

static SHUTDOWN: OnceLock<Mutex<Option<oneshot::Sender<()>>>> = OnceLock::new();
static ACTIVE_PORT: AtomicU16 = AtomicU16::new(0);

fn shutdown_cell() -> &'static Mutex<Option<oneshot::Sender<()>>> {
    SHUTDOWN.get_or_init(|| Mutex::new(None))
}

fn hhmm() -> String {
    let s = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let d = s % 86400;
    format!("{:02}:{:02}", d / 3600, (d % 3600) / 60)
}

// ---- Tauri 命令 ----

/// 获取本机局域网 IP
#[tauri::command]
pub async fn get_local_ip() -> Result<String, String> {
    let s = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    s.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    Ok(s.local_addr().map_err(|e| e.to_string())?.ip().to_string())
}

/// 扫描局域网，寻找已有聊天室（UDP 广播，等待 2 秒）
#[tauri::command]
pub async fn discover_lan_chat() -> Result<Vec<Value>, String> {
    tokio::task::spawn_blocking(|| -> Result<Vec<Value>, String> {
        let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
        sock.set_broadcast(true).map_err(|e| e.to_string())?;
        sock.set_read_timeout(Some(std::time::Duration::from_millis(2000)))
            .map_err(|e| e.to_string())?;

        sock.send_to(
            format!("{}QUERY", PREFIX).as_bytes(),
            format!("255.255.255.255:{}", UDP_PORT),
        )
        .map_err(|e| e.to_string())?;

        let mut found: Vec<Value> = Vec::new();
        let mut buf = [0u8; 256];
        loop {
            match sock.recv_from(&mut buf) {
                Ok((len, src)) => {
                    let msg = String::from_utf8_lossy(&buf[..len]);
                    if let Some(payload) = msg.strip_prefix(PREFIX) {
                        if payload == "QUERY" { continue; }
                        // 格式：{port}:{host_ip}
                        let parts: Vec<&str> = payload.splitn(2, ':').collect();
                        let port: u16 = parts.first().and_then(|p| p.parse().ok()).unwrap_or(18765);
                        let host = parts.get(1).copied().unwrap_or(&src.ip().to_string()).to_string();
                        // 去重
                        if !found.iter().any(|v| v["host"] == host && v["port"] == port) {
                            found.push(json!({ "host": host, "port": port }));
                        }
                    }
                }
                Err(_) => break,
            }
        }
        Ok(found)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 启动内嵌局域网聊天服务器，返回本机 IP
#[tauri::command]
pub async fn start_lan_server(port: u16) -> Result<String, String> {
    stop_lan_server().await?;

    let local_ip = get_local_ip().await?;
    let ip_clone = local_ip.clone();

    let (tx, rx) = oneshot::channel::<()>();
    *shutdown_cell().lock().await = Some(tx);
    ACTIVE_PORT.store(port, Ordering::SeqCst);

    // 在 spawn 前绑定，保证 start_lan_server 返回时服务已就绪
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("端口 {} 启动失败：{}", port, e))?;

    let state = ServerState::new();
    tokio::spawn(async move {
        let app = Router::new()
            .route("/chat/:room_id", get(ws_handler))
            .with_state(state);
        axum::serve(listener, app)
            .with_graceful_shutdown(async { let _ = rx.await; })
            .await
            .ok();
    });

    // UDP：定期广播 + 响应查询
    let ip_udp = ip_clone.clone();
    tokio::spawn(async move {
        // 尝试监听 UDP 发现端口（可能已被占用，忽略错误）
        let Ok(udp) = UdpSocket::bind(format!("0.0.0.0:{}", UDP_PORT)) else { return };
        let _ = udp.set_broadcast(true);
        let _ = udp.set_read_timeout(Some(std::time::Duration::from_millis(500)));

        loop {
            if ACTIVE_PORT.load(Ordering::SeqCst) == 0 { break; }

            // 广播自身
            let announce = format!("{}{}:{}", PREFIX, port, ip_udp);
            let _ = udp.send_to(announce.as_bytes(), format!("255.255.255.255:{}", UDP_PORT));

            // 响应查询
            let mut buf = [0u8; 256];
            if let Ok((len, src)) = udp.recv_from(&mut buf) {
                let msg = String::from_utf8_lossy(&buf[..len]);
                if msg == format!("{}QUERY", PREFIX) {
                    let reply = format!("{}{}:{}", PREFIX, port, ip_udp);
                    let _ = udp.send_to(reply.as_bytes(), src);
                }
            }

            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
    });

    Ok(ip_clone)
}

/// 停止局域网聊天服务器
#[tauri::command]
pub async fn stop_lan_server() -> Result<(), String> {
    ACTIVE_PORT.store(0, Ordering::SeqCst);
    if let Some(tx) = shutdown_cell().lock().await.take() {
        let _ = tx.send(());
    }
    Ok(())
}

// ---- WebSocket 处理 ----

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<String>,
    State(state): State<ServerState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state, room_id))
}

async fn handle_socket(socket: WebSocket, state: ServerState, room_id: String) {
    let room = state.get_or_create_room(&room_id).await;
    let tx = room.tx.clone();
    let users = room.users.clone();
    let mut rx = tx.subscribe();
    let mut username = String::new();

    let (mut sink, mut stream) = socket.split();

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sink.send(Message::Text(msg)).await.is_err() { break; }
        }
    });

    while let Some(Ok(msg)) = stream.next().await {
        let Message::Text(text) = msg else { continue };
        let Ok(v): Result<Value, _> = serde_json::from_str(&text) else { continue };

        match v["type"].as_str().unwrap_or("") {
            "join" => {
                let name = v["username"].as_str().unwrap_or("匿名").trim().to_string();
                username = name.clone();
                users.write().await.push(name.clone());
                sys_msg(&tx, &format!("{} 加入了聊天室", name));
                push_users(&tx, &users).await;
            }
            "message" => {
                let content = v["content"].as_str().unwrap_or("").trim().to_string();
                if !content.is_empty() && !username.is_empty() {
                    let _ = tx.send(json!({
                        "type": "message",
                        "username": username,
                        "content": content,
                        "time": hhmm(),
                    }).to_string());
                }
            }
            "file_chunk" => {
                if !username.is_empty() {
                    let file_id = v["fileId"].as_str().unwrap_or("").to_string();
                    let filename = v["filename"].as_str().unwrap_or("file").to_string();
                    let mime = v["mime"].as_str().unwrap_or("application/octet-stream").to_string();
                    let size = v["size"].as_i64().unwrap_or(0);
                    let chunk_index = v["chunkIndex"].as_i64().unwrap_or(0);
                    let total_chunks = v["totalChunks"].as_i64().unwrap_or(1);
                    let data = v["data"].as_str().unwrap_or("").to_string();
                    let _ = tx.send(json!({
                        "type": "file_chunk",
                        "username": username,
                        "fileId": file_id,
                        "filename": filename,
                        "mime": mime,
                        "size": size,
                        "chunkIndex": chunk_index,
                        "totalChunks": total_chunks,
                        "data": data,
                        "time": hhmm(),
                    }).to_string());
                }
            }
            _ => {}
        }
    }

    send_task.abort();
    if !username.is_empty() {
        users.write().await.retain(|u| u != &username);
        sys_msg(&tx, &format!("{} 离开了聊天室", username));
        push_users(&tx, &users).await;
    }
}

fn sys_msg(tx: &broadcast::Sender<String>, content: &str) {
    let _ = tx.send(json!({ "type": "system", "content": content }).to_string());
}

async fn push_users(tx: &broadcast::Sender<String>, users: &Arc<RwLock<Vec<String>>>) {
    let list = users.read().await.clone();
    let _ = tx.send(json!({ "type": "users", "list": list }).to_string());
}
