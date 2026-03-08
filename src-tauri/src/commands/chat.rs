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
    time::{Instant, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{broadcast, oneshot, Mutex, RwLock};

const UDP_PORT: u16 = 18766;
const PREFIX: &str = "TOOLHUB_CHAT:";

// ---- 广播消息类型 ----

#[derive(Clone)]
enum BroadcastMsg {
    Text(String),
    Binary(Vec<u8>),
}

// ---- 服务器状态 ----

#[derive(Clone)]
struct RoomState {
    tx: broadcast::Sender<BroadcastMsg>,
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
        // 增大 channel 容量，应对高速文件传输大量块
        let (tx, _) = broadcast::channel::<BroadcastMsg>(512);
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

/// 扫描局域网，寻找已有聊天室（UDP 广播，持续 2 秒反复发送查询）
#[tauri::command]
pub async fn discover_lan_chat() -> Result<Vec<Value>, String> {
    tokio::task::spawn_blocking(|| -> Result<Vec<Value>, String> {
        let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
        sock.set_broadcast(true).map_err(|e| e.to_string())?;
        sock.set_read_timeout(Some(std::time::Duration::from_millis(200)))
            .map_err(|e| e.to_string())?;

        let broadcast_addr = format!("255.255.255.255:{}", UDP_PORT);
        let query = format!("{}QUERY", PREFIX);
        let mut found: Vec<Value> = Vec::new();
        let mut buf = [0u8; 256];
        let deadline = Instant::now() + std::time::Duration::from_secs(2);

        while Instant::now() < deadline {
            let _ = sock.send_to(query.as_bytes(), &broadcast_addr);
            match sock.recv_from(&mut buf) {
                Ok((len, src)) => {
                    let msg = String::from_utf8_lossy(&buf[..len]);
                    if let Some(payload) = msg.strip_prefix(PREFIX) {
                        if payload == "QUERY" { continue; }
                        let parts: Vec<&str> = payload.splitn(2, ':').collect();
                        let port: u16 = parts.first().and_then(|p| p.parse().ok()).unwrap_or(18765);
                        let host = parts.get(1).copied().unwrap_or(&src.ip().to_string()).to_string();
                        if !found.iter().any(|v| v["host"] == host && v["port"] == port) {
                            found.push(json!({ "host": host, "port": port }));
                        }
                    }
                }
                Err(_) => {}
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

    let ip_udp = ip_clone.clone();
    tokio::spawn(async move {
        let Ok(udp) = UdpSocket::bind(format!("0.0.0.0:{}", UDP_PORT)) else { return };
        let _ = udp.set_broadcast(true);
        let _ = udp.set_read_timeout(Some(std::time::Duration::from_millis(300)));

        let announce = format!("{}{}:{}", PREFIX, port, ip_udp);
        let query_msg = format!("{}QUERY", PREFIX);
        let broadcast_addr = format!("255.255.255.255:{}", UDP_PORT);
        let mut buf = [0u8; 256];

        let _ = udp.send_to(announce.as_bytes(), &broadcast_addr);
        let mut last_announce = Instant::now();

        loop {
            if ACTIVE_PORT.load(Ordering::SeqCst) == 0 { break; }

            if last_announce.elapsed() >= std::time::Duration::from_secs(2) {
                let _ = udp.send_to(announce.as_bytes(), &broadcast_addr);
                last_announce = Instant::now();
            }

            if let Ok((len, src)) = udp.recv_from(&mut buf) {
                let msg = String::from_utf8_lossy(&buf[..len]);
                if msg.as_ref() == query_msg {
                    let _ = udp.send_to(announce.as_bytes(), src);
                }
            }
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
    // 提高 WebSocket 帧大小上限，支持大块二进制传输（最大 2MB 帧）
    ws.max_message_size(2 * 1024 * 1024)
      .max_frame_size(2 * 1024 * 1024)
      .on_upgrade(move |socket| handle_socket(socket, state, room_id))
}

async fn handle_socket(socket: WebSocket, state: ServerState, room_id: String) {
    let room = state.get_or_create_room(&room_id).await;
    let tx = room.tx.clone();
    let users = room.users.clone();
    let mut rx = tx.subscribe();
    let mut username = String::new();

    let (mut sink, mut stream) = socket.split();

    // 发送任务：支持 Text 和 Binary 两种广播消息
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let res = match msg {
                BroadcastMsg::Text(t)   => sink.send(Message::Text(t)).await,
                BroadcastMsg::Binary(b) => sink.send(Message::Binary(b.into())).await,
            };
            if res.is_err() { break; }
        }
    });

    while let Some(Ok(msg)) = stream.next().await {
        match msg {
            // ---- 文本消息（聊天文字 / 加入 / 用户列表）----
            Message::Text(text) => {
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
                            let _ = tx.send(BroadcastMsg::Text(json!({
                                "type": "message",
                                "username": username,
                                "content": content,
                                "time": hhmm(),
                            }).to_string()));
                        }
                    }
                    _ => {}
                }
            }

            // ---- 二进制消息（文件分块，高性能无 base64）----
            // 格式：[4字节 header长度 big-endian][header JSON][块二进制数据]
            // header JSON 由客户端提供：{ fileId, chunkIndex, totalChunks, size, filename, mime }
            // 服务端注入 username 和 time 后重新广播
            Message::Binary(data) => {
                if username.is_empty() || data.len() < 4 { continue; }
                let header_len = u32::from_be_bytes([data[0], data[1], data[2], data[3]]) as usize;
                if 4 + header_len > data.len() { continue; }

                if let Ok(header_str) = std::str::from_utf8(&data[4..4 + header_len]) {
                    if let Ok(mut v) = serde_json::from_str::<Value>(header_str) {
                        v["username"] = json!(username);
                        v["time"]     = json!(hhmm());

                        let new_header = v.to_string().into_bytes();
                        let chunk_data = &data[4 + header_len..];

                        let mut out = Vec::with_capacity(4 + new_header.len() + chunk_data.len());
                        out.extend_from_slice(&(new_header.len() as u32).to_be_bytes());
                        out.extend_from_slice(&new_header);
                        out.extend_from_slice(chunk_data);

                        let _ = tx.send(BroadcastMsg::Binary(out));
                    }
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

fn sys_msg(tx: &broadcast::Sender<BroadcastMsg>, content: &str) {
    let _ = tx.send(BroadcastMsg::Text(
        json!({ "type": "system", "content": content }).to_string()
    ));
}

async fn push_users(tx: &broadcast::Sender<BroadcastMsg>, users: &Arc<RwLock<Vec<String>>>) {
    let list = users.read().await.clone();
    let _ = tx.send(BroadcastMsg::Text(
        json!({ "type": "users", "list": list }).to_string()
    ));
}
