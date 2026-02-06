//! 示例命令

/// 问候命令
///
/// # Arguments
///
/// * `name` - 要问候的名字
///
/// # Returns
///
/// 包含问候语的字符串
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
