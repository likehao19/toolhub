use base64::Engine;
use serde::Serialize;
use std::io::Cursor;

#[derive(Debug, Clone, Serialize)]
pub struct ScreenCapture {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub data: String, // base64 PNG
    pub scale_factor: f32,
}

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
                .map_err(|e| format!("截图失败 ({}): {}", monitor.name(), e))?;

            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            let file_path = tmp_dir.join(format!("cap-{}-{}.bmp", monitor.id(), ts));

            img.save_with_format(&file_path, image::ImageFormat::Bmp)
                .map_err(|e| format!("保存BMP失败: {}", e))?;

            captures.push(ScreenCaptureMeta {
                id: monitor.id(),
                name: monitor.name().to_string(),
                x: monitor.x(),
                y: monitor.y(),
                width: monitor.width(),
                height: monitor.height(),
                path: file_path.to_string_lossy().to_string(),
                scale_factor: monitor.scale_factor(),
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

/// 捕获所有显示器截图（base64 PNG，全屏截图用）
#[tauri::command]
pub async fn capture_all_screens() -> Result<Vec<ScreenCapture>, String> {
    tokio::task::spawn_blocking(|| {
        let monitors = xcap::Monitor::all().map_err(|e| format!("枚举显示器失败: {}", e))?;
        let mut captures = Vec::new();

        for monitor in monitors {
            let img = monitor
                .capture_image()
                .map_err(|e| format!("截图失败 ({}): {}", monitor.name(), e))?;

            let mut buf = Vec::new();
            img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
                .map_err(|e| format!("编码PNG失败: {}", e))?;

            captures.push(ScreenCapture {
                id: monitor.id(),
                name: monitor.name().to_string(),
                x: monitor.x(),
                y: monitor.y(),
                width: monitor.width(),
                height: monitor.height(),
                data: base64::engine::general_purpose::STANDARD.encode(&buf),
                scale_factor: monitor.scale_factor(),
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
            .filter(|w| !w.is_minimized() && w.width() > 50 && w.height() > 50)
            .map(|w| WindowInfo {
                id: w.id(),
                title: w.title().to_string(),
                app_name: w.app_name().to_string(),
                x: w.x(),
                y: w.y(),
                width: w.width(),
                height: w.height(),
            })
            .collect())
    })
    .await
    .map_err(|e| format!("线程错误: {}", e))?
}

/// 删除临时文件
#[tauri::command]
pub async fn delete_temp_file(path: String) -> Result<(), String> {
    // 安全检查：只允许删除 toolhub 临时目录下的文件
    let tmp_dir = std::env::temp_dir().join("toolhub-screenshots");
    let target = std::path::Path::new(&path);
    if !target.starts_with(&tmp_dir) {
        return Err("不允许删除非临时目录的文件".into());
    }
    tokio::fs::remove_file(&path).await.ok();
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
#[tauri::command]
pub async fn save_screenshot_file(path: String, data: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Base64解码失败: {}", e))?;
    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}
