use base64::Engine;
use serde::Serialize;

/// 快速截图元数据（不含图片数据，只有文件路径）
#[derive(Debug, Clone, Serialize)]
pub struct ScreenCaptureMeta {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub path: String,
    pub scale_factor: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// 快速截图 — 写 BMP 到临时文件（零压缩，极快）
/// 前端通过 readFile 读取二进制，不走 base64/IPC 传输大数据
#[tauri::command]
pub async fn capture_screen_fast() -> Result<Vec<ScreenCaptureMeta>, String> {
    tokio::task::spawn_blocking(|| {
        let monitors = xcap::Monitor::all().map_err(|e| format!("枚举显示器失败: {}", e))?;
        let mut captures = Vec::new();
        let tmp_dir = std::env::temp_dir().join("toolhub-screenshots");
        std::fs::create_dir_all(&tmp_dir).ok();

        for monitor in monitors {
            let img = monitor
                .capture_image()
                .map_err(|e| format!("截图失败 ({}): {}", monitor.name().unwrap_or_default(), e))?;

            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            let id = monitor.id().unwrap_or(0);
            let file_path = tmp_dir.join(format!("cap-{}-{}.bmp", id, ts));

            img.save_with_format(&file_path, image::ImageFormat::Bmp)
                .map_err(|e| format!("保存BMP失败: {}", e))?;

            captures.push(ScreenCaptureMeta {
                id,
                name: monitor.name().unwrap_or_default(),
                x: monitor.x().unwrap_or(0),
                y: monitor.y().unwrap_or(0),
                width: monitor.width().unwrap_or(0),
                height: monitor.height().unwrap_or(0),
                path: file_path.to_string_lossy().to_string(),
                scale_factor: monitor.scale_factor().unwrap_or(1.0),
            });
        }

        // 清理 >2 分钟的旧文件
        if let Ok(entries) = std::fs::read_dir(&tmp_dir) {
            let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(120);
            for entry in entries.flatten() {
                if let Ok(m) = entry.metadata() {
                    if m.modified().unwrap_or(std::time::SystemTime::now()) < cutoff {
                        std::fs::remove_file(entry.path()).ok();
                    }
                }
            }
        }

        Ok(captures)
    })
    .await
    .map_err(|e| format!("线程错误: {}", e))?
}

/// 捕获所有显示器截图(写 PNG 到临时文件,返回路径列表)
///
/// 旧实现把每张 PNG base64 编码后塞进结构体经 IPC 传到前端 ——
/// 4K 屏一张 5-15 MB,base64 后 ~7-20 MB,再被 JSON 序列化复制一遍,
/// 多屏环境下这一次调用会瞬时占用上百 MB 字符串。
/// 改成走 capture_screen_fast 的"写文件 + 返回路径"模式后,前端用
/// convertFileSrc(path) + fetch 拿 Blob,内存压力消失。
#[tauri::command]
pub async fn capture_all_screens() -> Result<Vec<ScreenCaptureMeta>, String> {
    tokio::task::spawn_blocking(|| {
        let monitors = xcap::Monitor::all().map_err(|e| format!("枚举显示器失败: {}", e))?;
        let mut captures = Vec::new();
        let tmp_dir = std::env::temp_dir().join("toolhub-screenshots");
        std::fs::create_dir_all(&tmp_dir).ok();

        for monitor in monitors {
            let img = monitor
                .capture_image()
                .map_err(|e| format!("截图失败 ({}): {}", monitor.name().unwrap_or_default(), e))?;

            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            let id = monitor.id().unwrap_or(0);
            let file_path = tmp_dir.join(format!("full-{}-{}.png", id, ts));

            img.save_with_format(&file_path, image::ImageFormat::Png)
                .map_err(|e| format!("保存PNG失败: {}", e))?;

            captures.push(ScreenCaptureMeta {
                id,
                name: monitor.name().unwrap_or_default(),
                x: monitor.x().unwrap_or(0),
                y: monitor.y().unwrap_or(0),
                width: monitor.width().unwrap_or(0),
                height: monitor.height().unwrap_or(0),
                path: file_path.to_string_lossy().to_string(),
                scale_factor: monitor.scale_factor().unwrap_or(1.0),
            });
        }

        Ok(captures)
    })
    .await
    .map_err(|e| format!("线程错误: {}", e))?
}

/// 获取所有可见窗口
#[tauri::command]
pub async fn list_visible_windows() -> Result<Vec<WindowInfo>, String> {
    tokio::task::spawn_blocking(|| {
        let windows = xcap::Window::all().map_err(|e| format!("枚举窗口失败: {}", e))?;
        Ok(windows
            .iter()
            .filter(|w| !w.is_minimized().unwrap_or(false) && w.width().unwrap_or(0) > 50 && w.height().unwrap_or(0) > 50)
            .map(|w| WindowInfo {
                id: w.id().unwrap_or(0),
                title: w.title().unwrap_or_default(),
                app_name: w.app_name().unwrap_or_default(),
                x: w.x().unwrap_or(0),
                y: w.y().unwrap_or(0),
                width: w.width().unwrap_or(0),
                height: w.height().unwrap_or(0),
            })
            .collect())
    })
    .await
    .map_err(|e| format!("线程错误: {}", e))?
}

/// 删除临时文件
#[tauri::command]
pub async fn delete_temp_file(path: String) -> Result<(), String> {
    // 安全检查：只允许删除 toolhub 临时目录下的文件。
    //
    // 旧实现:`target.starts_with(&tmp_dir)` —— 如果攻击者能在临时目录里塞一个符号链接
    // 指向系统文件,starts_with 仍然返回 true,而 remove_file 会沿着 link 删掉真实目标。
    // 修法:canonicalize 解析符号链接后再比较 —— 只接受真实路径仍在 tmp_dir 子树里的请求。
    let tmp_dir = std::env::temp_dir().join("toolhub-screenshots");
    let tmp_dir_canonical = match tmp_dir.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            // 临时目录不存在 = 没东西可删
            return Ok(());
        }
    };

    let target = std::path::PathBuf::from(&path);
    let target_canonical = target.canonicalize().map_err(|e| format!("路径解析失败: {}", e))?;

    if !target_canonical.starts_with(&tmp_dir_canonical) {
        return Err("不允许删除非临时目录的文件".into());
    }

    // 错误不再吞掉 —— 前端可以根据 Err 决定是否需要重试或提示。
    tokio::fs::remove_file(&target_canonical)
        .await
        .map_err(|e| format!("删除文件失败: {}", e))?;
    Ok(())
}

/// 获取临时目录路径
#[tauri::command]
pub fn get_temp_dir() -> String {
    std::env::temp_dir()
        .join("toolhub-screenshots")
        .to_string_lossy()
        .to_string()
}

/// 保存截图到文件
///
/// 安全:前端可控的 path + base64 data 不能直接写到任意位置 ——
/// 比如 `C:\Windows\System32\xxx.exe` 或 `~/.ssh/authorized_keys`。
/// 这里做几道闸:
/// 1) 拒绝相对路径 / 含 ".." 的路径(防穿越)
/// 2) 拒绝写入已知系统目录(Windows/System32、/etc、/usr/bin 等)
/// 3) 父目录必须已存在(走过 save dialog 的路径必然满足)
/// 4) 限制 base64 解码后的体积(64 MB,够装 8K PNG)
#[tauri::command]
pub async fn save_screenshot_file(path: String, data: String) -> Result<(), String> {
    const MAX_BYTES: usize = 64 * 1024 * 1024;

    let target = std::path::PathBuf::from(&path);

    // 1) 必须是绝对路径,且不含任何 ".." 组件
    if !target.is_absolute() {
        return Err("保存路径必须是绝对路径".into());
    }
    for component in target.components() {
        if matches!(component, std::path::Component::ParentDir) {
            return Err("保存路径不允许包含 '..'".into());
        }
    }

    // 2) 黑名单:常见系统目录拒绝写入
    let lower = path.to_lowercase().replace('\\', "/");
    const FORBIDDEN: &[&str] = &[
        "/windows/system32/",
        "/windows/syswow64/",
        "/program files/",
        "/program files (x86)/",
        "/etc/",
        "/usr/bin/",
        "/usr/sbin/",
        "/bin/",
        "/sbin/",
        "/system/",
        "/library/",
    ];
    for prefix in FORBIDDEN {
        if lower.contains(prefix) {
            return Err(format!("禁止写入系统目录: {}", path));
        }
    }

    // 3) 父目录必须存在 —— save dialog 选出来的路径父目录天然存在,
    //    不允许我们隐式创建,避免被骗着 mkdir 系统位置
    if let Some(parent) = target.parent() {
        if !parent.exists() {
            return Err(format!("父目录不存在: {}", parent.display()));
        }
    }

    // 4) 解码 + 大小限制
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Base64解码失败: {}", e))?;
    if bytes.len() > MAX_BYTES {
        return Err(format!(
            "图片数据过大({} 字节),超过 {} MB 上限",
            bytes.len(), MAX_BYTES / 1024 / 1024
        ));
    }

    tokio::fs::write(&target, &bytes)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}
