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
use commands::downloader::Aria2State;
use commands::ssh::SshState;
use log::LevelFilter;
use tauri::{Emitter, Manager};
use tauri::webview::PageLoadEvent;

/// 应用程序入口点
///
/// 配置并运行 Tauri 应用程序
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // dev2 feature 下禁用单实例限制，允许多开用于测试
    #[cfg(not(feature = "dev2"))]
    let builder = builder.plugin(configure_single_instance());

    builder
        .on_page_load(|webview, payload| {
            if webview.label() == "splashscreen" && matches!(payload.event(), PageLoadEvent::Finished) {
                if let Some(window) = webview.app_handle().get_webview_window("splashscreen") {
                    let _ = window.show();
                    let _ = window.emit("splash-page-ready", ());
                }
            }
        })
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
        .manage(Aria2State::new())
        .manage(SshState::new())
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
            commands::log_analysis::open_log_analysis_session,
            commands::log_analysis::get_log_analysis_summary,
            commands::log_analysis::query_log_blocks,
            commands::log_analysis::get_log_block_detail,
            commands::log_analysis::cancel_log_analysis_session,
            commands::log_analysis::close_log_analysis_session,
            commands::shell::execute_shell_command,
            commands::database::get_database_init_sql,
            commands::chat::get_local_ip,
            commands::chat::discover_lan_chat,
            commands::chat::start_lan_server,
            commands::chat::stop_lan_server,
            commands::credential::list_credentials,
            commands::credential::read_credential,
            commands::credential::add_credential,
            commands::credential::delete_credential,
            commands::credential::open_passkey_settings,
            commands::credential::list_passkeys,
            commands::credential::delete_passkey,
            commands::bookmark::fetch_website_info,
            commands::sdk::get_user_env_var,
            commands::sdk::get_env_var_scoped,
            commands::sdk::get_merged_path,
            commands::sdk::set_user_env_var,
            commands::sdk::set_env_vars_batch,
            commands::sdk::check_system_privilege,
            commands::sdk::setup_system_privilege,
            commands::sdk::kill_process_with_privilege,
            commands::sdk::run_privileged_action,
            commands::port::list_ports,
            commands::port::kill_process,
            commands::sdk::broadcast_env_change,
            commands::sdk::detect_sdk_version,
            commands::sdk::find_sdk_in_path,
            commands::sdk::list_subdirs,
            commands::mock_server::start_mock_server,
            commands::mock_server::stop_mock_server,
            commands::mock_server::update_mock_rules,
            commands::mock_server::get_mock_server_status,
            commands::screenshot::capture_all_screens,
            commands::screenshot::capture_screen_fast,
            commands::screenshot::list_visible_windows,
            commands::screenshot::save_screenshot_file,
            commands::screenshot::get_temp_dir,
            commands::screenshot::delete_temp_file,
            commands::redis::redis_connect,
            commands::redis::redis_disconnect,
            commands::redis::redis_test_connection,
            commands::redis::redis_execute,
            commands::redis::redis_scan_keys,
            commands::redis::redis_get_key_detail,
            commands::redis::redis_set_key,
            commands::redis::redis_delete_keys,
            commands::redis::redis_rename_key,
            commands::redis::redis_set_ttl,
            commands::redis::redis_server_info,
            commands::redis::redis_db_size,
            commands::redis::redis_select_db,
            commands::sqlite::sqlite_open,
            commands::sqlite::sqlite_close,
            commands::sqlite::sqlite_tables,
            commands::sqlite::sqlite_table_info,
            commands::sqlite::sqlite_table_indexes,
            commands::sqlite::sqlite_query,
            commands::sqlite::sqlite_execute,
            commands::sqlite::sqlite_count,
            commands::sqlite::sqlite_db_info,
            commands::image_convert::image_get_info,
            commands::image_convert::image_preview,
            commands::image_convert::image_convert,
            commands::image_convert::image_batch_convert,
            commands::maven::maven_parse_settings,
            commands::maven::maven_scan_repo,
            commands::maven::maven_get_artifact,
            commands::maven::maven_check_integrity,
            commands::maven::maven_parse_pom,
            commands::maven::maven_dep_tree,
            commands::maven::maven_repo_stats,
            commands::maven::maven_scan_project_poms,
            commands::wallpaper::get_current_wallpaper,
            commands::wallpaper::set_wallpaper,
            commands::wallpaper::scan_images,
            commands::wallpaper::fetch_bing_wallpapers,
            commands::wallpaper::download_wallpaper,
            commands::wallpaper::download_and_set_wallpaper,
            commands::wallpaper::fetch_wallhaven_wallpapers,
            commands::wallpaper::scan_downloaded_wallpapers,
            commands::hardware::get_hardware_info,
            commands::network::network_dns_lookup,
            commands::network::network_ip_lookup,
            commands::dev_server::get_dev_server_port,
            commands::downloader::start_aria2,
            commands::downloader::stop_aria2,
            commands::downloader::get_aria2_status,
            commands::downloader::get_default_download_dir,
            commands::ssh::ssh_connect,
            commands::ssh::ssh_write,
            commands::ssh::ssh_resize,
            commands::ssh::ssh_disconnect,
            commands::ssh::ssh_list_sessions,
            commands::ssh::ssh_host_key_response,
            commands::ssh::encrypt_credential,
            commands::ssh::decrypt_credential,
            commands::crypto::crypto_get_master_key,
            commands::ssh::sftp_list,
            commands::ssh::sftp_download,
            commands::ssh::sftp_upload,
            commands::ssh::sftp_mkdir,
            commands::ssh::sftp_remove,
            commands::ssh::sftp_rename,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // 应用进程真正退出前,显式 kill 掉 aria2c 子进程。
            // std::process::Child 在 Aria2State drop 时不会自动杀子进程(Rust 文档明确说明),
            // 不处理的话每次关软件 aria2c.exe 都会变孤儿进程留在 services.exe 下继续占带宽。
            // ExitRequested 在窗口关闭准备退出时触发,Exit 在真正退出前触发——
            // 都监听是为了多渠道兜底(比如用户从托盘菜单选 quit 走的可能是 Exit 直达)。
            match event {
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    app_handle.state::<Aria2State>().shutdown();
                }
                _ => {}
            }
        });
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
