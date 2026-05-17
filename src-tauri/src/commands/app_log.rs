//! 运行日志（app.log）— 文件路径解析 + 读/清/打开命令
//!
//! 日志路径策略（按优先级）：
//! 1. `<exe_dir>/logs/`  — 开发环境 (target/debug/logs) 和 per-user 安装时直接生效
//! 2. `%LOCALAPPDATA%\com.toolhub.app\logs\` (Windows) / `~/.local/share/com.toolhub.app/logs/` (Linux) / `~/Library/Application Support/com.toolhub.app/logs/` (macOS) — perMachine 安装到 Program Files 时的回退
//! 3. `<tmp>/toolhub/logs/` — 兜底
//!
//! 文件命名（由 tauri-plugin-log 控制）：当前活动文件 `app.log`，
//! 历史文件 `app_<timestamp>.log`（KeepAll rotation，max 5MB）。

use std::path::PathBuf;

use serde::Serialize;

const APP_ID: &str = "com.toolhub.app";

/// 计算日志目录。被 lib.rs 的 plugin-log Builder 调用，必须在 Tauri 初始化前同步可用。
pub fn resolve_log_dir() -> PathBuf {
    // 1. exe 同级 logs/
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let logs = dir.join("logs");
            if try_make_writable(&logs) {
                return logs;
            }
        }
    }

    // 2. local data dir / app id / logs/
    if let Some(local) = dirs::data_local_dir() {
        let logs = local.join(APP_ID).join("logs");
        if try_make_writable(&logs) {
            return logs;
        }
    }

    // 3. tmp
    let tmp = std::env::temp_dir().join("toolhub").join("logs");
    let _ = std::fs::create_dir_all(&tmp);
    tmp
}

fn try_make_writable(dir: &PathBuf) -> bool {
    if std::fs::create_dir_all(dir).is_err() {
        return false;
    }
    let probe = dir.join(".write_probe");
    match std::fs::write(&probe, b"") {
        Ok(_) => {
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

#[derive(Serialize)]
pub struct LogFileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified_ms: i64,
    pub is_active: bool,
}

#[derive(Serialize)]
pub struct LogReadResult {
    pub path: String,
    pub total_lines: usize,
    pub returned_lines: usize,
    pub truncated: bool,
    pub content: String,
}

/// 当前活动日志文件路径
#[tauri::command]
pub fn get_log_file_path() -> Result<String, String> {
    let dir = resolve_log_dir();
    Ok(dir.join("app.log").to_string_lossy().to_string())
}

/// 当前日志目录
#[tauri::command]
pub fn get_log_dir() -> Result<String, String> {
    Ok(resolve_log_dir().to_string_lossy().to_string())
}

/// 读取最近 N 行（默认 1000，最大 50000，越界自动截断）
#[tauri::command]
pub fn read_recent_log(lines: Option<usize>) -> Result<LogReadResult, String> {
    let max_lines = lines.unwrap_or(1000).min(50_000);
    let path = resolve_log_dir().join("app.log");
    let path_str = path.to_string_lossy().to_string();

    if !path.exists() {
        return Ok(LogReadResult {
            path: path_str,
            total_lines: 0,
            returned_lines: 0,
            truncated: false,
            content: String::new(),
        });
    }

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Read log failed: {}", e))?;

    let all_lines: Vec<&str> = content.lines().collect();
    let total = all_lines.len();
    let (start, truncated) = if total > max_lines {
        (total - max_lines, true)
    } else {
        (0, false)
    };
    let returned: Vec<&str> = all_lines[start..].to_vec();

    Ok(LogReadResult {
        path: path_str,
        total_lines: total,
        returned_lines: returned.len(),
        truncated,
        content: returned.join("\n"),
    })
}

/// 清空当前日志文件（不动历史 rotation 文件）
#[tauri::command]
pub fn clear_log_file() -> Result<(), String> {
    let path = resolve_log_dir().join("app.log");
    if !path.exists() {
        return Ok(());
    }
    std::fs::write(&path, b"").map_err(|e| format!("Clear log failed: {}", e))?;
    log::info!("[app_log] Log file cleared by user");
    Ok(())
}

/// 列出日志目录下所有 .log 文件（包括 rotation 历史），按修改时间倒序
#[tauri::command]
pub fn list_log_files() -> Result<Vec<LogFileInfo>, String> {
    let dir = resolve_log_dir();
    let active = dir.join("app.log");

    let mut files: Vec<LogFileInfo> = Vec::new();
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(files),
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext_ok = path
            .extension()
            .map(|e| e == "log")
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        files.push(LogFileInfo {
            name: path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
            path: path.to_string_lossy().to_string(),
            size: meta.len(),
            modified_ms,
            is_active: path == active,
        });
    }
    files.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
    Ok(files)
}

/// 在系统文件管理器中打开日志目录
#[tauri::command]
pub fn open_log_dir() -> Result<(), String> {
    let dir = resolve_log_dir();
    let path = dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Open dir failed: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Open dir failed: {}", e))?;
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Open dir failed: {}", e))?;
    }
    Ok(())
}
