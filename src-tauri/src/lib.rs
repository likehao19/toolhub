//! Vue3 + Vite + Tauri 应用程序
//!
//! 这是一个使用 Tauri 框架构建的桌面应用程序，
//! 前端使用 Vue3 + Vite，后端使用 Rust。

// 模块声明
mod commands;
mod config;
mod error;
mod scripts;
mod setup;
mod state;

use setup::setup_app;
use state::ChildWindowCounter;
use log::LevelFilter;

/// 应用程序入口点
///
/// 配置并运行 Tauri 应用程序
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 插件配置
        .plugin(configure_single_instance())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            )
        )
        // 状态管理
        .manage(ChildWindowCounter::new())
        // 应用启动配置
        .setup(|app| {
            setup_app(app)?;
            Ok(())
        })
        // 注册命令处理器
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::window::create_child_window,
            commands::window::handle_close_action,
            commands::window::close_splashscreen,
            commands::window::open_url_in_browser,
            commands::window::create_custom_titlebar_window,
            commands::window::minimize_window,
            commands::window::toggle_maximize_window,
            commands::window::close_window,
            commands::window::create_custom_notification_window,
            commands::window::toggle_devtools,
            commands::file_tree::read_file_tree,
            commands::file_tree::read_file_tree_stream,
            commands::file_tree::cancel_file_tree_scan,
            commands::file_tree::scan_directory_stats,
            commands::file_tree::read_directory_content,
            commands::file_ops::read_text_file,
            commands::file_ops::write_text_file,
            commands::file_ops::read_file_as_base64,
            commands::file_ops::copy_file,
            commands::file_ops::move_file,
            commands::file_ops::rename_file,
            commands::shell::execute_shell_command,
            commands::database::get_database_init_sql,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 配置单实例插件
///
/// 确保应用程序只能运行一个实例，
/// 当尝试启动第二个实例时，会显示并聚焦现有实例的主窗口。
fn configure_single_instance() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri::Manager;

    tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window(config::window::MAIN_WINDOW_LABEL) {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.unminimize();
        }
    })
}
