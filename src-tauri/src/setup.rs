//! 应用启动配置

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Emitter, Manager,
};

use crate::config::{startup, tray, window};

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
    
    // 显示启动窗口
    splashscreen_window.show()?;
    
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

    // 克隆窗口用于异步任务
    let splash_clone = splashscreen_window.clone();
    let main_clone = main_window.clone();

    // 启动后台任务：等待主窗口加载完成
    tauri::async_runtime::spawn(async move {
        // 初始化延迟
        std::thread::sleep(startup::SPLASH_INITIAL_DELAY);

        // 等待主窗口加载完成
        std::thread::sleep(startup::MAIN_WINDOW_LOAD_DELAY);

        // 关闭启动窗口并显示主窗口
        if let Err(e) = splash_clone.close() {
            eprintln!("关闭启动窗口失败: {}", e);
        }

        if let Err(e) = main_clone.show() {
            eprintln!("显示主窗口失败: {}", e);
        }

        if let Err(e) = main_clone.set_focus() {
            eprintln!("聚焦主窗口失败: {}", e);
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
    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
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
