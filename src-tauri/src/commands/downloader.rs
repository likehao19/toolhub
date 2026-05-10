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

    /// 应用进程退出时调用 —— 同步杀掉持有的 aria2c 子进程,避免变成孤儿继续占带宽和内存。
    /// std::process::Child::drop() 默认 NOT 杀 child(Rust 文档明确说明),所以必须显式 kill。
    /// 用同步 API:Tauri 的 RunEvent::Exit 处理函数不在 async runtime 上下文里,而且我们也希望
    /// 在进程真正退出前确保信号已送达,不能 fire-and-forget。
    pub fn shutdown(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                // 短暂等一下,让 OS 把 SIGKILL/TerminateProcess 投递完,避免 zombie
                let _ = child.wait();
            }
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

/// 平台对应的 aria2c 可执行文件名
/// Windows: aria2c.exe / Mac & Linux: aria2c
const fn aria2c_filename() -> &'static str {
    if cfg!(target_os = "windows") {
        "aria2c.exe"
    } else {
        "aria2c"
    }
}

/// 平台对应的"在 PATH 里查命令"工具:Windows 用 where,其余 Unix 系用 which
const fn which_command() -> &'static str {
    if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    }
}

/// 查找 aria2c 可执行文件路径
/// 优先从应用资源目录查找，其次从开发目录、应用数据目录，最后从系统 PATH 查找
fn find_aria2c(app_handle: &tauri::AppHandle) -> Option<String> {
    let bin_name = aria2c_filename();

    // 1. 生产环境：Tauri 资源目录（安装后 binaries/<bin_name> 在此）
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let aria2_path = resource_dir.join("binaries").join(bin_name);
        if aria2_path.exists() {
            return Some(aria2_path.to_string_lossy().to_string());
        }
    }

    // 2. 开发环境：src-tauri/binaries/<bin_name>（cargo 编译时的 CARGO_MANIFEST_DIR）
    {
        let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(bin_name);
        if dev_path.exists() {
            return Some(dev_path.to_string_lossy().to_string());
        }
    }

    // 3. 应用数据目录
    if let Some(app_data) = dirs::data_local_dir() {
        let aria2_path = app_data.join("com.toolhub.app").join("binaries").join(bin_name);
        if aria2_path.exists() {
            return Some(aria2_path.to_string_lossy().to_string());
        }
    }

    // 4. 系统 PATH (where on Windows / which on Unix)
    if let Ok(output) = std::process::Command::new(which_command())
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
    // 检查是否已经在运行 —— 用 try_wait 验证进程真活着,而不是只看 child 句柄是否 Some。
    // 否则上次 aria2c 自己 crash 后,child 还在 Some 里,假阳性返回"已在运行",前端连 ws 失败,
    // 用户再点"启动"按钮也无效,等于死锁。
    {
        let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
        if let Some(child) = child_lock.as_mut() {
            match child.try_wait() {
                Ok(None) => {
                    // 进程仍在跑 → 直接复用
                    let port = *state.rpc_port.lock().map_err(|e| e.to_string())?;
                    return Ok(Aria2StartResult {
                        success: true,
                        rpc_port: port,
                        message: "aria2c 已在运行中".to_string(),
                    });
                }
                Ok(Some(_)) | Err(_) => {
                    // 进程已退出或检测失败 → 丢弃 stale 句柄,继续走下面的启动流程
                    *child_lock = None;
                }
            }
        }
    }

    // 查找 aria2c
    let aria2c_path = find_aria2c(&app_handle)
        .ok_or_else(|| {
            if cfg!(target_os = "windows") {
                "未找到 aria2c.exe,请确保已安装 aria2 或将 aria2c.exe 放入 binaries 目录".to_string()
            } else {
                "未找到 aria2c,请通过包管理器安装(macOS: brew install aria2;Linux: apt/yum/pacman install aria2)或放入 binaries 目录".to_string()
            }
        })?;

    // 准备 aria2 会话/DHT 数据目录
    // 旧实现:.unwrap_or_else(|_| dirs::data_local_dir().unwrap_or_default().join(...))
    // 当两个都失败时 PathBuf::default() 是空字符串,join 后变成相对路径,
    // aria2c 会用 cwd(Tauri 启动目录,通常用户没写权限)解析,DHT/session 持续丢失。
    let aria2_data_dir = match app_handle.path().app_data_dir() {
        Ok(d) => d.join("aria2"),
        Err(_) => match dirs::data_local_dir() {
            Some(d) => d.join("com.toolhub.app").join("aria2"),
            None => return Err("无法定位应用数据目录,无法持久化 aria2 会话".to_string()),
        },
    };
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

    let concurrent = max_concurrent.unwrap_or(8);
    let split_num = split.unwrap_or(64);
    // aria2 文档限制 max-connection-per-server ∈ [1,16],设大于 16 会让 aria2c exit 28(bad option arg)。
    // 之前默认 64 会导致启动失败。这里在硬上限处 clamp,既保留调用方传值的灵活性,也避免起不来。
    let conn_per_server = max_conn_per_server.unwrap_or(16).clamp(1, 16);

    let mut args = vec![
        "--enable-rpc".to_string(),
        format!("--rpc-listen-port={}", port),
        "--rpc-allow-origin-all=true".to_string(),
        "--rpc-listen-all=false".to_string(),
        format!("--max-concurrent-downloads={}", concurrent),
        format!("--split={}", split_num),
        format!("--max-connection-per-server={}", conn_per_server),
        // 高速下载关键参数 ——
        // min-split-size 调到 1M:即便 100M 文件也能切成 100 段并发,而不是 aria2 默认 20M 限制下只切 5 段
        "--min-split-size=1M".to_string(),
        // 磁盘缓存:写盘前在内存里聚合,大文件 + 高带宽时显著提速。64M 足够覆盖大多数场景
        "--disk-cache=64M".to_string(),
        // 慢节点切换:某个 connection 持续低于 10KB/s 就切到其他源/线程,避免被烂线路拖慢整体
        "--lowest-speed-limit=10K".to_string(),
        // 失败快速重试:单个 connection 失败 5 次重试,每次间隔 2s,总体不卡死
        "--max-tries=5".to_string(),
        "--retry-wait=2".to_string(),
        "--connect-timeout=10".to_string(),
        "--timeout=60".to_string(),
        // 接受 gzip 让小文本类资源响应更快
        "--http-accept-gzip=true".to_string(),
        // 一些服务器(尤其国内 CDN)拒绝默认 aria2/X.X UA,伪装成浏览器避免 403
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(),
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

    // 启动进程 —— stderr 用 piped 而不是 null,这样进程瞬死时能把 aria2c 自己的错误读出来给前端。
    // (之前丢到 null,exit 28 这种参数错误就只剩一个 exit code,前端永远不知道是哪个参数坏了。)
    let mut child = std::process::Command::new(&aria2c_path)
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 aria2c 失败: {}", e))?;

    // spawn() 立即返回 OK 不代表进程跑起来了 —— 端口冲突 / 参数错误等会让 aria2c 在几十毫秒内退出。
    // 给 300ms 让它把这种"瞬死"暴露出来,然后 try_wait 验一下还在不在,以免前端拿到 success 后连不上 RPC。
    // 注意:必须用 tokio::time::sleep,std::thread::sleep 会把整个 tokio worker 阻塞 300ms,影响并发的其他 invoke。
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    match child.try_wait() {
        Ok(Some(status)) => {
            // 把 aria2c 自己写到 stderr 的诊断信息读出来,大多数情况下它会告诉你具体哪个参数错了
            // 或哪个端口冲突——这比我们瞎猜"端口被占用或参数错误"准确得多。
            let stderr_msg = if let Some(mut err_out) = child.stderr.take() {
                use std::io::Read;
                let mut s = String::new();
                let _ = err_out.read_to_string(&mut s);
                s.trim().to_string()
            } else {
                String::new()
            };
            // aria2 exit code 速查:
            //   28 = 参数错误(bad/unrecognized option or unexpected option argument)
            //   1  = 未知/通用错误(常包括端口被占用 RPC bind 失败)
            let exit_code = status.code();
            let hint = match exit_code {
                Some(28) => "参数错误(aria2c 不接受其中某个 --xxx 选项,详见下方 stderr)",
                Some(1)  => "通用错误,常见原因是 RPC 端口被占用",
                _ => "进程异常退出",
            };
            let detail = if stderr_msg.is_empty() {
                String::new()
            } else {
                format!("\n--- aria2c stderr ---\n{}", stderr_msg)
            };
            return Err(format!(
                "aria2c 启动后立即退出 (exit={:?}): {}{}",
                exit_code, hint, detail
            ));
        }
        Ok(None) => { /* 仍在跑,正常 */ }
        Err(e) => {
            return Err(format!("无法检测 aria2c 进程状态: {}", e));
        }
    }

    // 进程存活到这里,把 stderr pipe 持续 drain 掉,否则 aria2c 长期运行时 stderr buffer 写满会 block 它自己。
    // (我们之所以 piped 而不是 null,是为了上面的瞬死分支能读到错误。运行起来后就不需要内容了。)
    if let Some(mut err_out) = child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = [0u8; 4096];
            // 读到 EOF (进程退出) 或出错就停;不关心内容
            while let Ok(n) = err_out.read(&mut buf) {
                if n == 0 { break; }
            }
        });
    }

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
    // 关键点:先把 child 句柄从 Mutex 里 take 出来再松锁,后面的等待循环就不再持锁了。
    // 否则 std::sync::Mutex 会被持有最长 2 秒,期间任何 get_aria2_status / start_aria2 调用都会卡死。
    let child_opt = {
        let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
        child_lock.take()
    };

    if let Some(mut child) = child_opt {
        let _ = child.kill();
        // child.wait() 是阻塞的 —— 如果 aria2c hang 了会让整个 Tauri command 永久卡住。
        // 改成轮询 try_wait,最多等 2s。仍未退出就把句柄放回 state,下次调用时再清理。
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
        let mut exited = false;
        loop {
            match child.try_wait() {
                Ok(Some(_)) => {
                    exited = true;
                    break;
                }
                Ok(None) => {
                    if std::time::Instant::now() >= deadline {
                        break;
                    }
                    // 同样:tokio::time::sleep 而不是 std::thread::sleep,避免阻塞 tokio worker。
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
                Err(_) => break,
            }
        }
        if !exited {
            // 进程还没退,尝试把句柄放回去给下一轮 stop / get_status 处理。
            // 但要小心:释放锁等待这 2 秒里,可能有并发的 start_aria2 已经创建了新进程并写入 state.child。
            // 如果直接 *child_lock = Some(child),会把新进程句柄覆盖掉(变成 zombie 泄漏),
            // 而我们手里的 child 已经发过 kill 了——它会自己慢慢退,不需要再追踪。
            let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
            if child_lock.is_none() {
                *child_lock = Some(child);
            }
            // else: 另一次 start 已经接手,直接丢弃这个垂死的 child(kill 信号已发,OS 会回收)
            return Ok("aria2c 已发送停止信号,正在退出中".to_string());
        }
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
