use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, State};

/// aria2 进程状态管理
pub struct Aria2State {
    child: Mutex<Option<std::process::Child>>,
    rpc_port: Mutex<u16>,
}

impl Aria2State {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            rpc_port: Mutex::new(6800),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Aria2Status {
    pub running: bool,
    pub rpc_port: u16,
    pub pid: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Aria2StartResult {
    pub success: bool,
    pub rpc_port: u16,
    pub message: String,
}

/// 查找 aria2c 可执行文件路径
/// 优先从应用资源目录查找，其次从开发目录、应用数据目录，最后从系统 PATH 查找
fn find_aria2c(app_handle: &tauri::AppHandle) -> Option<String> {
    // 1. 生产环境：Tauri 资源目录（安装后 binaries/aria2c.exe 在此）
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let aria2_path = resource_dir.join("binaries").join("aria2c.exe");
        if aria2_path.exists() {
            return Some(aria2_path.to_string_lossy().to_string());
        }
    }

    // 2. 开发环境：src-tauri/binaries/aria2c.exe（cargo 编译时的 CARGO_MANIFEST_DIR）
    {
        let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("aria2c.exe");
        if dev_path.exists() {
            return Some(dev_path.to_string_lossy().to_string());
        }
    }

    // 3. 应用数据目录
    if let Some(app_data) = dirs::data_local_dir() {
        let aria2_path = app_data.join("com.toolhub.app").join("binaries").join("aria2c.exe");
        if aria2_path.exists() {
            return Some(aria2_path.to_string_lossy().to_string());
        }
    }

    // 4. 系统 PATH
    if let Ok(output) = std::process::Command::new("where")
        .arg("aria2c")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout);
            let first_line = path.lines().next().unwrap_or("").trim();
            if !first_line.is_empty() {
                return Some(first_line.to_string());
            }
        }
    }

    None
}

/// 启动 aria2c 进程
#[tauri::command]
pub async fn start_aria2(
    app_handle: tauri::AppHandle,
    state: State<'_, Aria2State>,
    download_dir: Option<String>,
    rpc_port: Option<u16>,
    max_concurrent: Option<u32>,
    split: Option<u32>,
    max_conn_per_server: Option<u32>,
    rpc_secret: Option<String>,
) -> Result<Aria2StartResult, String> {
    // 检查是否已经在运行
    {
        let child_lock = state.child.lock().map_err(|e| e.to_string())?;
        if child_lock.is_some() {
            let port = *state.rpc_port.lock().map_err(|e| e.to_string())?;
            return Ok(Aria2StartResult {
                success: true,
                rpc_port: port,
                message: "aria2c 已在运行中".to_string(),
            });
        }
    }

    // 查找 aria2c
    let aria2c_path = find_aria2c(&app_handle)
        .ok_or_else(|| "未找到 aria2c，请确保已安装 aria2 或将 aria2c.exe 放入应用目录".to_string())?;

    // 准备 aria2 会话/DHT 数据目录
    let aria2_data_dir = app_handle.path().app_data_dir()
        .unwrap_or_else(|_| dirs::data_local_dir().unwrap_or_default().join("com.toolhub.app"))
        .join("aria2");
    let _ = std::fs::create_dir_all(&aria2_data_dir);
    let dht_file = aria2_data_dir.join("dht.dat").to_string_lossy().to_string();
    let dht6_file = aria2_data_dir.join("dht6.dat").to_string_lossy().to_string();
    let session_file = aria2_data_dir.join("aria2.session").to_string_lossy().to_string();
    // 确保 session 文件存在（aria2 要求文件必须存在）
    if !std::path::Path::new(&session_file).exists() {
        let _ = std::fs::write(&session_file, "");
    }

    let port = rpc_port.unwrap_or(6800);
    let dir = download_dir.unwrap_or_else(|| {
        dirs::download_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"))
            .to_string_lossy()
            .to_string()
    });

    let concurrent = max_concurrent.unwrap_or(5);
    let split_num = split.unwrap_or(16);
    let conn_per_server = max_conn_per_server.unwrap_or(16);

    let mut args = vec![
        "--enable-rpc".to_string(),
        format!("--rpc-listen-port={}", port),
        "--rpc-allow-origin-all=true".to_string(),
        "--rpc-listen-all=false".to_string(),
        format!("--max-concurrent-downloads={}", concurrent),
        format!("--split={}", split_num),
        format!("--max-connection-per-server={}", conn_per_server),
        "--min-split-size=1M".to_string(),
        "--continue=true".to_string(),
        format!("--dir={}", dir),
        "--file-allocation=none".to_string(),
        "--auto-file-renaming=true".to_string(),
        "--allow-overwrite=false".to_string(),
        // BT/磁力 关键配置
        "--enable-dht=true".to_string(),
        "--enable-dht6=true".to_string(),
        format!("--dht-file-path={}", dht_file),
        format!("--dht-file-path6={}", dht6_file),
        "--dht-listen-port=6881-6999".to_string(),
        "--listen-port=6881-6999".to_string(),
        "--enable-peer-exchange=true".to_string(),
        "--bt-enable-lpd=true".to_string(),
        "--bt-require-crypto=false".to_string(),
        "--bt-request-peer-speed-limit=10M".to_string(),
        "--bt-max-peers=128".to_string(),
        "--seed-time=0".to_string(),
        "--seed-ratio=0".to_string(),
        "--bt-save-metadata=true".to_string(),
        "--bt-load-saved-metadata=true".to_string(),
        "--follow-torrent=true".to_string(),
        "--follow-metalink=true".to_string(),
        // 会话持久化（断点续传）
        format!("--input-file={}", session_file),
        format!("--save-session={}", session_file),
        "--save-session-interval=30".to_string(),
        // BT Tracker 列表（公共 tracker 加速磁力解析）
        format!("--bt-tracker={}",
            [
                "udp://tracker.opentrackr.org:1337/announce",
                "udp://open.demonii.com:1337/announce",
                "udp://open.stealth.si:80/announce",
                "udp://tracker.torrent.eu.org:451/announce",
                "udp://exodus.desync.com:6969/announce",
                "udp://tracker.tiny-vps.com:6969/announce",
                "udp://tracker.moeking.me:6969/announce",
                "udp://explodie.org:6969/announce",
                "udp://tracker.pomf.se:80/announce",
                "udp://tracker1.bt.moack.co.kr:80/announce",
                "udp://tracker.theoks.net:6969/announce",
                "udp://tracker-udp.gbitt.info:80/announce",
                "https://tracker.tamersunion.org:443/announce",
                "https://tracker.gbitt.info:443/announce",
                "http://tracker.files.fm:6969/announce",
                "udp://new-line.net:6969/announce",
                "udp://tracker.bittor.pw:1337/announce",
                "udp://tracker.dump.cl:6969/announce",
                "udp://tracker2.dler.org:80/announce",
            ].join(",")
        ),
        // 日志
        "--console-log-level=warn".to_string(),
    ];

    if let Some(secret) = rpc_secret {
        if !secret.is_empty() {
            args.push(format!("--rpc-secret={}", secret));
        }
    }

    // 启动进程
    let child = std::process::Command::new(&aria2c_path)
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 aria2c 失败: {}", e))?;

    *state.rpc_port.lock().map_err(|e| e.to_string())? = port;
    *state.child.lock().map_err(|e| e.to_string())? = Some(child);

    Ok(Aria2StartResult {
        success: true,
        rpc_port: port,
        message: "aria2c 启动成功".to_string(),
    })
}

/// 停止 aria2c 进程
#[tauri::command]
pub async fn stop_aria2(state: State<'_, Aria2State>) -> Result<String, String> {
    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = child_lock.take() {
        let _ = child.kill();
        let _ = child.wait();
        Ok("aria2c 已停止".to_string())
    } else {
        Ok("aria2c 未在运行".to_string())
    }
}

/// 获取 aria2c 状态
#[tauri::command]
pub async fn get_aria2_status(state: State<'_, Aria2State>) -> Result<Aria2Status, String> {
    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
    let port = *state.rpc_port.lock().map_err(|e| e.to_string())?;

    if let Some(child) = child_lock.as_mut() {
        // 检查进程是否还活着
        match child.try_wait() {
            Ok(Some(_)) => {
                // 进程已退出
                *child_lock = None;
                Ok(Aria2Status {
                    running: false,
                    rpc_port: port,
                    pid: None,
                })
            }
            Ok(None) => {
                // 仍在运行
                Ok(Aria2Status {
                    running: true,
                    rpc_port: port,
                    pid: Some(child.id()),
                })
            }
            Err(_) => {
                *child_lock = None;
                Ok(Aria2Status {
                    running: false,
                    rpc_port: port,
                    pid: None,
                })
            }
        }
    } else {
        Ok(Aria2Status {
            running: false,
            rpc_port: port,
            pid: None,
        })
    }
}

/// 获取默认下载目录
#[tauri::command]
pub async fn get_default_download_dir() -> Result<String, String> {
    let dir = dirs::download_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"));
    Ok(dir.to_string_lossy().to_string())
}
