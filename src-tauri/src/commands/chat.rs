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
    sync::{Arc, OnceLock},
    time::Instant,
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
        // 先快路径用读锁:绝大多数请求是已存在的 room,直接 clone 句柄返回
        {
            let rooms = self.rooms.read().await;
            if let Some(r) = rooms.get(id) {
                return r.clone();
            }
        }
        // 慢路径:取写锁后再 check-then-insert,避免 read→write 之间的 TOCTOU race
        // (旧实现两次锁中间另一个 task 也在创建同一个 room,会互相覆盖,把订阅者拆成两组隔离 room)
        let mut rooms = self.rooms.write().await;
        if let Some(r) = rooms.get(id) {
            return r.clone();
        }
        // 增大 channel 容量，应对高速文件传输大量块
        // 8192 ≈ 8 GB 缓冲（按 1MB chunk 算），覆盖多用户高速传输场景，
        // 把 RecvError::Lagged 触发概率压到极低 —— Lagged 一旦发生,
        // 文件分块会被静默丢弃,接收端永远拼不齐。
        let (tx, _) = broadcast::channel::<BroadcastMsg>(8192);
        let room = RoomState { tx, users: Arc::new(RwLock::new(Vec::new())) };
        rooms.insert(id.to_string(), room.clone());
        room
    }
}

// ---- 全局生命周期 ----
//
// 关停旧实现是「设 ACTIVE_PORT=0」+ 让 UDP 任务自己 poll AtomicU16 退出,
// 但 stop→start 之间老任务可能还没醒来检查,新 start 又把 port 改成新值,
// 老任务看到非 0 继续跑、新任务的 UdpSocket::bind 又因端口被占用静默失败,
// 结果 LAN 广播持续用旧端口。改成持有完整的关停句柄(http + udp 任务),stop 时显式 abort+await。

struct ServerHandles {
    http_shutdown: oneshot::Sender<()>,
    udp_shutdown: oneshot::Sender<()>,
    udp_task: tokio::task::JoinHandle<()>,
    http_task: tokio::task::JoinHandle<()>,
}

static HANDLES: OnceLock<Mutex<Option<ServerHandles>>> = OnceLock::new();

fn handles_cell() -> &'static Mutex<Option<ServerHandles>> {
    HANDLES.get_or_init(|| Mutex::new(None))
}

// 注:服务端不再注入 time 字段。
// 旧版用 SystemTime + UNIX_EPOCH 算 hh:mm,但取的是 UTC 当日秒数,UTC+8 用户全部慢 8 小时。
// 没有 chrono/time 依赖时,正确做时区转换需要新增 crate;
// 把责任交给客户端的 ft()(基于浏览器 new Date() 本地时间),消息时间天然本地化、零依赖。

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
        // 1500 = 一般以太网 MTU,留足空间装 PREFIX + port + hostname,
        // 旧的 256 字节在加 hostname / 多语言主机名时会被静默截断。
        let mut buf = [0u8; 2048];
        let deadline = Instant::now() + std::time::Duration::from_secs(2);

        while Instant::now() < deadline {
            let _ = sock.send_to(query.as_bytes(), &broadcast_addr);
            match sock.recv_from(&mut buf) {
                Ok((len, src)) => {
                    let msg = String::from_utf8_lossy(&buf[..len]);
                    if let Some(payload) = msg.strip_prefix(PREFIX) {
                        if payload == "QUERY" { continue; }
                        // announce 现在用 JSON 编码:{"port":1234,"host":"..."}
                        // 旧的 "port:host" 格式遇到 IPv6 host(含冒号)会被 splitn(2,':') 错误切分。
                        // 严格 JSON 解析:格式错误的包不再回退到默认值,避免恶意/损坏包让我们去连不存在的服务。
                        let Ok(data) = serde_json::from_str::<Value>(payload) else { continue };
                        let Some(port) = data.get("port").and_then(|v| v.as_u64()) else { continue };
                        let Ok(port) = u16::try_from(port) else { continue };
                        let host = data.get("host").and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| src.ip().to_string());
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
    // stop 现在会 await 老的 http+udp 任务退出,UDP_PORT 真正释放后才返回,
    // 这样下面的 tokio UdpSocket::bind(UDP_PORT) 不会被旧任务占着导致悄悄失败。
    stop_lan_server().await?;

    let local_ip = get_local_ip().await?;
    let ip_clone = local_ip.clone();

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("端口 {} 启动失败：{}", port, e))?;

    // UDP 公告 socket:用 tokio::net::UdpSocket,这样能在 select! 里同时等 recv 和关停信号,
    // 不再像旧版同步 UdpSocket::recv_from 那样阻塞 tokio worker 300ms 一轮。
    let udp = tokio::net::UdpSocket::bind(format!("0.0.0.0:{}", UDP_PORT))
        .await
        .map_err(|e| format!("UDP 端口 {} 绑定失败：{}", UDP_PORT, e))?;
    udp.set_broadcast(true).map_err(|e| e.to_string())?;

    let (http_tx, http_rx) = oneshot::channel::<()>();
    let (udp_tx, mut udp_rx) = oneshot::channel::<()>();

    // ---- HTTP/WebSocket 服务任务 ----
    let state = ServerState::new();
    let http_task = tokio::spawn(async move {
        let app = Router::new()
            .route("/chat/:room_id", get(ws_handler))
            .with_state(state);
        axum::serve(listener, app)
            .with_graceful_shutdown(async { let _ = http_rx.await; })
            .await
            .ok();
    });

    // ---- UDP 公告任务 ----
    let ip_udp = ip_clone.clone();
    let udp_task = tokio::spawn(async move {
        // announce 用 JSON 编码,IPv6 host(含冒号)也能安全携带
        let announce = format!(
            "{}{}",
            PREFIX,
            json!({ "port": port, "host": ip_udp }).to_string()
        );
        let query_msg = format!("{}QUERY", PREFIX);
        let broadcast_addr = format!("255.255.255.255:{}", UDP_PORT);
        // 与 discover 端保持一致,扩到 2048 防止主机名 / 后续扩展字段被截断
        let mut buf = [0u8; 2048];

        let _ = udp.send_to(announce.as_bytes(), &broadcast_addr).await;
        let mut announce_ticker = tokio::time::interval(std::time::Duration::from_secs(2));
        announce_ticker.tick().await; // 立刻消费第一次 tick(刚已发过)

        loop {
            tokio::select! {
                _ = &mut udp_rx => break,
                _ = announce_ticker.tick() => {
                    let _ = udp.send_to(announce.as_bytes(), &broadcast_addr).await;
                }
                Ok((len, src)) = udp.recv_from(&mut buf) => {
                    let msg = String::from_utf8_lossy(&buf[..len]);
                    if msg.as_ref() == query_msg {
                        let _ = udp.send_to(announce.as_bytes(), src).await;
                    }
                }
            }
        }
    });

    *handles_cell().lock().await = Some(ServerHandles {
        http_shutdown: http_tx,
        udp_shutdown: udp_tx,
        udp_task,
        http_task,
    });

    Ok(ip_clone)
}

/// 停止局域网聊天服务器
#[tauri::command]
pub async fn stop_lan_server() -> Result<(), String> {
    let handles = handles_cell().lock().await.take();
    if let Some(h) = handles {
        let _ = h.http_shutdown.send(());
        let _ = h.udp_shutdown.send(());
        // await 两个任务真正退出,UDP_PORT 才真的释放。否则下一轮 start 立即 bind 会撞 EADDRINUSE。
        let _ = h.http_task.await;
        let _ = h.udp_task.await;
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
    // 注意 broadcast::Receiver 在订阅者跟不上时会返回 RecvError::Lagged(n) —— 这是「跳过 n 条」
    // 而不是「连接坏了」。旧代码用 while let Ok 直接退出整个循环,结果文件高速传输时一旦被挤出
    // 512 容量,客户端就再也收不到任何消息(还能发,但接收彻底死掉)。这里改成只在真关闭时退出。
    let send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    let res = match msg {
                        BroadcastMsg::Text(t)   => sink.send(Message::Text(t)).await,
                        BroadcastMsg::Binary(b) => sink.send(Message::Binary(b.into())).await,
                    };
                    if res.is_err() { break; }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    // 跳过被丢弃的消息,继续接收后续。文件传输场景下宁可丢中间块也别整体掉线。
                    continue;
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
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
                        if name.is_empty() { continue; }
                        username = name.clone();
                        // 每个连接占一个 slot(允许多设备同名)。原来的"去重 push"配合后面的
                        // retain(|u| u != &username) 会让"先掉线的连接"把"还活着的同名连接"也清出列表,
                        // 反而比不去重更糟。这里坚持一连一 slot,断开时只 remove 一个(见下方)。
                        users.write().await.push(name.clone());
                        sys_msg(&tx, &format!("{} 加入了聊天室", name));
                        push_users(&tx, &users).await;
                    }
                    "message" => {
                        let content = v["content"].as_str().unwrap_or("").trim().to_string();
                        if !content.is_empty() && !username.is_empty() {
                            // time 字段交给客户端 ft() 填充（本地时间）—— 服务端没有时区信息,
                            // 旧实现用 UTC 秒导致中国用户消息时间慢 8 小时。
                            let _ = tx.send(BroadcastMsg::Text(json!({
                                "type": "message",
                                "username": username,
                                "content": content,
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
                // 用 checked_add 避免 32-bit 平台 4 + header_len 溢出绕过校验后 panic。
                // 恶意 header_len = 0xFFFFFFFC 时 wrapping 加法会回 0,通过 > data.len() 校验。
                let Some(payload_start) = header_len.checked_add(4) else { continue };
                if payload_start > data.len() { continue; }

                if let Ok(header_str) = std::str::from_utf8(&data[4..payload_start]) {
                    if let Ok(mut v) = serde_json::from_str::<Value>(header_str) {
                        // 同步删除 time 注入,客户端用本地时间(详见上文 message 分支)
                        v["username"] = json!(username);

                        let new_header = v.to_string().into_bytes();
                        let chunk_data = &data[payload_start..];

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
        // 关键:只 remove 一条,不要 retain 把所有同名 slot 全清掉。
        // 多设备 / 网络抖动重连场景下,users 里可能有多个同名条目,每个对应一个真实连接,
        // 当前这个连接掉线只对应其中一个 slot。
        {
            let mut list = users.write().await;
            if let Some(pos) = list.iter().position(|u| u == &username) {
                list.remove(pos);
            }
        }
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
