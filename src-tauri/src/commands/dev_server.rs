//! 开发服务器端口查询

/// 获取当前开发服务器端口
///
/// 读取环境变量 `TOOLHUB_DEV_PORT`，返回 Vite 开发服务器实际使用的端口。
/// 生产模式下返回 0（生产模式不使用开发服务器）。
#[tauri::command]
pub fn get_dev_server_port() -> u16 {
    std::env::var("TOOLHUB_DEV_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}
