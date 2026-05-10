//! 应用启动配置

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::Color,
    App, Emitter, Manager,
};

use crate::config::{tray, window};

/// 从 Store 中获取启动动画配置
fn get_splash_animation(app: &App) -> Result<String, Box<dyn std::error::Error>> {
    // 使用安全的错误处理，确保即使读取失败也不会崩溃
    let store_path = match app.path().app_data_dir() {
        Ok(dir) => dir.join("settings.json"),
        Err(_) => {
            // 如果无法获取 app_data_dir，返回默认值
            return Ok("default".to_string());
        }
    };
    
    // 尝试读取文件内容
    if store_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&store_path) {
            // Store 插件可能使用两种格式：
            // 1. 简单格式：{"key": "value"}
            // 2. 复杂格式：{"key": {"type": "string", "value": "..."}}
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(anim_value) = json.get("splashAnimation") {
                    let anim_str = if anim_value.is_string() {
                        // 简单格式：直接是字符串
                        anim_value.as_str()
                    } else if anim_value.is_object() {
                        // 复杂格式：{"type": "string", "value": "..."}
                        anim_value.get("value").and_then(|v| v.as_str())
                    } else {
                        None
                    };
                    
                    if let Some(anim_str) = anim_str {
                        // 验证动画ID是否有效
                        let valid_animations = [
                            "default", "minimal", "wave", "matrix", "geometric",
                            "gradient", "particles", "neon", "space", "custom"
                        ];
                        if valid_animations.contains(&anim_str) {
                            eprintln!("读取到启动动画配置: {}", anim_str);
                            return Ok(anim_str.to_string());
                        } else {
                            eprintln!("无效的启动动画ID: {}", anim_str);
                        }
                    }
                } else {
                    eprintln!("配置文件中未找到 splashAnimation 键");
                }
            } else {
                eprintln!("无法解析配置文件 JSON 格式");
            }
        } else {
            eprintln!("无法读取配置文件: {:?}", store_path);
        }
    } else {
        eprintln!("配置文件不存在: {:?}", store_path);
    }
    
    // 默认返回 default（即使出错也返回默认值，确保应用能正常启动）
    Ok("default".to_string())
}

/// 配置应用启动逻辑
///
/// 包括：
/// - 启动窗口和主窗口的初始化
/// - 系统托盘的创建和配置
/// - 窗口关闭事件的监听
pub fn setup_app(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // 初始化启动窗口
    setup_splash_screen(app)?;

    // 初始化系统托盘
    setup_tray(app)?;

    // 设置窗口事件监听
    setup_window_events(app);

    Ok(())
}

/// 设置启动窗口
fn setup_splash_screen(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // 读取配置以确定使用哪个启动动画（使用安全的错误处理）
    let splash_animation = get_splash_animation(app).unwrap_or_else(|_| {
        eprintln!("读取启动动画配置失败，使用默认动画");
        "default".to_string()
    });
    
    eprintln!("读取到的启动动画配置: {}", splash_animation);
    
    let splashscreen_window = app
        .get_webview_window(window::SPLASH_WINDOW_LABEL)
        .ok_or("启动窗口不存在")?;
    let main_window = app
        .get_webview_window(window::MAIN_WINDOW_LABEL)
        .ok_or("主窗口不存在")?;

    // 通过eval向splash窗口传递动画类型
    // 注意：由于窗口已经加载，我们需要在窗口显示后通过eval传递参数
    let anim_type = splash_animation.clone();
    let splash_clone_for_eval = splashscreen_window.clone();
    
    // 在显示前先把原生窗口和 webview 底色压成与 splash 首屏一致，尽量消除 HTML/CSS 首次绘制前的白底。
    let splash_bg = Some(Color(234, 241, 251, 255));
    let _ = splashscreen_window.set_background_color(splash_bg);

    // 这里先不主动 show，等 splash 页面真正完成首帧加载后再显示，
    // 否则 Windows 下会出现背景先出来、内容后补上的抖动。

    // 延迟一下确保窗口已加载，然后通过eval设置动画类型
    // 使用多次尝试确保设置成功
    tauri::async_runtime::spawn(async move {
        // 第一次尝试：在窗口加载后立即设置
        std::thread::sleep(std::time::Duration::from_millis(100));
        let eval_script1 = format!(
            "window.splashAnimationType = '{}';",
            anim_type
        );
        let _ = splash_clone_for_eval.eval(&eval_script1);
        
        // 第二次尝试：确保 applyAnimation 函数存在后再调用
        std::thread::sleep(std::time::Duration::from_millis(200));
        let eval_script2 = format!(
            "if (typeof applyAnimation === 'function') {{ applyAnimation('{}'); }} else {{ setTimeout(function() {{ if (typeof applyAnimation === 'function') applyAnimation('{}'); }}, 100); }}",
            anim_type, anim_type
        );
        eprintln!("尝试设置启动动画: {}", anim_type);
        if let Err(e) = splash_clone_for_eval.eval(&eval_script2) {
            eprintln!("设置启动动画类型失败: {}", e);
        } else {
            eprintln!("启动动画设置成功: {}", anim_type);
        }
    });

    // 主窗口的显示与 splash 的关闭统一交给前端在真正 ready 后触发，
    // 避免开发环境下主窗口过早显示而出现白屏空档。
    //
    // 安全超时：如果前端 15 秒内未调用 close_splashscreen，则 Rust 端强制关闭 splash 并显示主窗口，
    // 防止因前端加载失败导致用户永远卡在启动画面。
    let splash_for_timeout = splashscreen_window.clone();
    let main_for_timeout = main_window.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(15)).await;
        // 如果 splash 窗口仍然存在（未被前端关闭），说明启动超时
        if splash_for_timeout.is_visible().unwrap_or(false) {
            eprintln!("[安全超时] 前端 15s 内未关闭 splash，强制进入主界面");
            let _ = main_for_timeout.show();
            let _ = main_for_timeout.set_focus();
            let _ = splash_for_timeout.close();
        }
    });

    Ok(())
}

/// 设置系统托盘
fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // 创建托盘菜单项
    let show_item = MenuItem::with_id(
        app,
        tray::MENU_SHOW,
        tray::MENU_SHOW_LABEL,
        true,
        None::<&str>,
    )?;
    let hide_item = MenuItem::with_id(
        app,
        tray::MENU_HIDE,
        tray::MENU_HIDE_LABEL,
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(
        app,
        tray::MENU_QUIT,
        tray::MENU_QUIT_LABEL,
        true,
        None::<&str>,
    )?;

    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

    // 创建系统托盘
    // 旧代码:default_window_icon().unwrap() —— 打包配置缺图标资源时直接 panic,应用启动失败。
    // 现在改为:没图标就跳过托盘构建(主窗口仍可正常用),并在控制台留一条警告。
    let Some(icon) = app.default_window_icon().cloned() else {
        eprintln!("[setup] no default window icon, skipping tray icon");
        return Ok(());
    };
    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(handle_tray_menu_event)
        .on_tray_icon_event(handle_tray_icon_event)
        .build(app)?;

    Ok(())
}

/// 处理托盘菜单事件
fn handle_tray_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.as_ref() {
        tray::MENU_SHOW => {
            if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        tray::MENU_HIDE => {
            if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                let _ = window.hide();
            }
        }
        tray::MENU_QUIT => {
            app.exit(0);
        }
        _ => {}
    }
}

/// 处理托盘图标事件
fn handle_tray_icon_event(tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    // 左键单击托盘图标显示并聚焦窗口（不再切换隐藏）
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
            if window.is_visible().unwrap_or(false) {
                // 窗口已可见，聚焦到前台
                let _ = window.set_focus();
                let _ = window.unminimize();
            } else {
                // 窗口不可见，显示并聚焦
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

/// 设置窗口事件监听
fn setup_window_events(app: &App) {
    if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
        let window_clone = window.clone();

        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 阻止默认关闭行为
                api.prevent_close();

                // 发送事件到前端，让前端弹出对话框
                let _ = window_clone.emit("window-close-requested", ());
            }
        });
    }
}
