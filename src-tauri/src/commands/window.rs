//! 窗口管理命令

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Window};

use crate::config::{close_action, window};
use crate::scripts::LINK_INTERCEPTION_SCRIPT;
use crate::state::ChildWindowCounter;

/// 创建子窗口
///
/// 创建一个新的 webview 窗口，用于显示外部网页内容。
/// 窗口会自动注入链接拦截脚本，确保所有链接在窗口内导航。
///
/// # Arguments
///
/// * `app` - Tauri 应用句柄
/// * `url` - 要加载的外部 URL
///
/// # Returns
///
/// * `Ok(String)` - 成功时返回窗口标签
/// * `Err(String)` - 失败时返回错误信息
///
/// # Example
///
/// ```javascript
/// await invoke('create_child_window', { url: 'https://example.com' });
/// ```
#[tauri::command]
pub async fn create_child_window(app: AppHandle, url: String) -> Result<String, String> {
    // 验证 URL 格式
    let parsed_url = url
        .parse::<url::Url>()
        .map_err(|e| format!("无效的URL: {}", e))?;

    // 生成唯一的窗口标签
    let counter = app.state::<ChildWindowCounter>();
    let count = counter.next()?;
    let window_label = format!("{}-{}", window::CHILD_WINDOW_LABEL_PREFIX, count);

    // 构建子窗口
    WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::External(parsed_url))
        .title(window::DEFAULT_CHILD_WINDOW_TITLE)
        .inner_size(
            window::DEFAULT_CHILD_WINDOW_WIDTH,
            window::DEFAULT_CHILD_WINDOW_HEIGHT,
        )
        .center()
        .initialization_script(LINK_INTERCEPTION_SCRIPT)
        .build()
        .map_err(|e| format!("创建窗口失败: {}", e))?;

    Ok(window_label)
}

/// 处理窗口关闭行为
///
/// 根据用户选择的动作执行相应的窗口关闭操作。
///
/// # Arguments
///
/// * `app` - Tauri 应用句柄
/// * `action` - 关闭动作，可选值：
///   - "minimize": 最小化到托盘
///   - "exit": 退出应用
///
/// # Returns
///
/// * `Ok(())` - 成功
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn handle_close_action(app: AppHandle, action: String) -> Result<(), String> {
    match action.as_str() {
        close_action::MINIMIZE => {
            // 隐藏主窗口到托盘
            if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                window.hide().map_err(|e| e.to_string())?;
            }
        }
        close_action::EXIT => {
            // 关闭所有子窗口
            let windows: Vec<_> = app.webview_windows().into_iter().collect();
            for (label, window) in windows {
                if label != window::MAIN_WINDOW_LABEL && label != window::SPLASH_WINDOW_LABEL {
                    let _ = window.close();
                }
            }
            // 退出应用
            app.exit(0);
        }
        _ => {
            return Err(format!("未知的关闭动作: {}", action));
        }
    }
    Ok(())
}

/// 关闭启动窗口
///
/// 关闭启动画面窗口并显示主窗口。
///
/// # Arguments
///
/// * `window` - Tauri 窗口句柄
///
/// # Returns
///
/// * `Ok(())` - 成功
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn close_splashscreen(window: Window) -> Result<(), String> {
    // 关闭启动窗口
    if let Some(splashscreen) = window.get_webview_window(window::SPLASH_WINDOW_LABEL) {
        splashscreen.close().map_err(|e| e.to_string())?;
    }

    // 显示并聚焦主窗口
    if let Some(main) = window.get_webview_window(window::MAIN_WINDOW_LABEL) {
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 在默认浏览器中打开 URL
///
/// 这个命令确保在主窗口上下文中打开 URL，避免权限问题。
/// 使用系统命令来打开 URL，绕过前端权限限制。
///
/// # Arguments
///
/// * `url` - 要打开的 URL
///
/// # Returns
///
/// * `Ok(())` - 成功
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn open_url_in_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("打开 URL 失败: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开 URL 失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开 URL 失败: {}", e))?;
    }
    
    Ok(())
}

/// 创建自定义标题栏窗口
///
/// 创建一个没有系统标题栏的窗口，展示自定义标题栏的实现。
///
/// # Arguments
///
/// * `app` - Tauri 应用句柄
///
/// # Returns
///
/// * `Ok(String)` - 成功时返回窗口标签
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn create_custom_titlebar_window(app: AppHandle) -> Result<String, String> {
    // 生成唯一的窗口标签
    let counter = app.state::<ChildWindowCounter>();
    let count = counter.next()?;
    let window_label = format!("custom-titlebar-{}", count);

    // 使用 public 目录中的 HTML 文件，并传递窗口标签作为 URL 参数
    let url = format!("custom-titlebar-window.html?label={}", window_label);
    WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(url.into()))
        .title("自定义标题栏窗口")
        .inner_size(800.0, 600.0)
        .decorations(false) // 禁用系统标题栏
        .center()
        .build()
        .map_err(|e| format!("创建窗口失败: {}", e))?;

    Ok(window_label)
}

/// 最小化窗口
#[tauri::command]
pub async fn minimize_window(window_label: String, app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.minimize().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("窗口 {} 不存在", window_label))
    }
}

/// 切换最大化窗口
#[tauri::command]
pub async fn toggle_maximize_window(window_label: String, app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
        if is_maximized {
            window.unmaximize().map_err(|e| e.to_string())?;
        } else {
            window.maximize().map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err(format!("窗口 {} 不存在", window_label))
    }
}

/// 关闭窗口
#[tauri::command]
pub async fn close_window(window_label: String, app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("窗口 {} 不存在", window_label))
    }
}

/// 创建自定义通知窗口
///
/// 创建一个美化的通知窗口，显示自定义通知内容。
///
/// # Arguments
///
/// * `app` - Tauri 应用句柄
/// * `title` - 通知标题
/// * `message` - 通知内容
/// * `notification_type` - 通知类型：success, error, warning, info
/// * `duration` - 显示时长（毫秒），默认 10000
/// * `position` - 显示位置：topLeft, topRight, topCenter, bottomLeft, bottomRight, bottomCenter, leftCenter, rightCenter, center
/// * `position_type` - 位置类型：'window'（软件内位置）或 'screen'（桌面窗口位置）
///
/// # Returns
///
/// * `Ok(String)` - 成功时返回窗口标签
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn create_custom_notification_window(
    app: AppHandle,
    title: String,
    message: String,
    notification_type: Option<String>,
    duration: Option<u64>,
    position: Option<String>,
    position_type: Option<String>,
    taskbar_margin: Option<f64>,
    notif_width: Option<f64>,
    notif_height: Option<f64>,
) -> Result<String, String> {
    // 生成唯一的窗口标签
    let counter = app.state::<ChildWindowCounter>();
    let count = counter.next()?;
    let window_label = format!("custom-notification-{}", count);

    // 构建 URL 参数
    let notif_type = notification_type.unwrap_or_else(|| "info".to_string());
    let duration_ms = duration.unwrap_or(10000);
    let url = format!(
        "custom-notification-window.html?label={}&type={}&title={}&message={}&duration={}",
        window_label,
        notif_type,
        urlencoding::encode(&title),
        urlencoding::encode(&message),
        duration_ms
    );

    // 获取主窗口位置和尺寸来计算通知窗口位置
    let main_window = app
        .get_webview_window("main")
        .ok_or("主窗口不存在")?;

    // 通知窗口尺寸（用户可配置）
    let notif_width = notif_width.unwrap_or(400.0);
    let notif_height = notif_height.unwrap_or(150.0);
    
    // 获取位置类型
    let pos_type = position_type.as_deref().unwrap_or("screen");
    let pos = position.as_deref().unwrap_or("topRight");
    
    let (x, y) = if pos_type == "window" {
        // 软件内位置：相对于主窗口的四个角落
        let inner_pos = main_window.inner_position()
            .map_err(|e| format!("获取窗口位置失败: {}", e))?;
        let inner_size = main_window.inner_size()
            .map_err(|e| format!("获取窗口尺寸失败: {}", e))?;
        
        let win_x = inner_pos.x as f64;
        let win_y = inner_pos.y as f64;
        let win_w = inner_size.width as f64;
        let win_h = inner_size.height as f64;
        
        eprintln!("[DEBUG] 软件内位置 - 窗口位置: ({}, {}), 尺寸: {}x{}, 通知尺寸: {}x{}", 
                  win_x, win_y, win_w, win_h, notif_width, notif_height);
        
        // 直接计算四个角落
        let (calc_x, calc_y) = match pos {
            "topLeft" => (win_x, win_y),
            "topRight" => (win_x + win_w - notif_width, win_y),
            "bottomLeft" => (win_x, win_y + win_h - notif_height),
            "bottomRight" => (win_x + win_w - notif_width, win_y + win_h - notif_height),
            "topCenter" => (win_x + (win_w - notif_width) / 2.0, win_y),
            "bottomCenter" => (win_x + (win_w - notif_width) / 2.0, win_y + win_h - notif_height),
            "leftCenter" => (win_x, win_y + (win_h - notif_height) / 2.0),
            "rightCenter" => (win_x + win_w - notif_width, win_y + (win_h - notif_height) / 2.0),
            "center" => (win_x + (win_w - notif_width) / 2.0, win_y + (win_h - notif_height) / 2.0),
            _ => (win_x + win_w - notif_width, win_y),
        };
        
        eprintln!("[DEBUG] 软件内位置 - 位置: {}, 计算结果: ({}, {})", pos, calc_x, calc_y);
        (calc_x, calc_y)
    } else {
        // 桌面窗口位置：参考软件内位置的计算方式
        // 获取显示器信息，就像软件内位置获取 inner_position 和 inner_size 一样
        let monitor = main_window.current_monitor()
            .map_err(|e| format!("获取显示器失败: {}", e))?
            .ok_or("无法获取显示器")?;
        
        let mon_size = monitor.size();
        let mon_pos = monitor.position();
        
        // 使用显示器的位置和尺寸，完全参考软件内位置的计算方式
        let mon_x = mon_pos.x as f64;
        let mon_y = mon_pos.y as f64;
        let mon_w = mon_size.width as f64;
        let mon_h = mon_size.height as f64;
        
        // Windows 任务栏的典型尺寸（像素）
        // 任务栏通常在底部，高度约40-50像素；如果在右边，宽度约40-50像素
        // 用户可配置边距
        let taskbar_margin = taskbar_margin.unwrap_or(50.0);
        
        eprintln!("[DEBUG] 桌面位置 - 显示器位置: ({}, {}), 尺寸: {}x{}, 通知尺寸: {}x{}, 任务栏边距: {}", 
                  mon_x, mon_y, mon_w, mon_h, notif_width, notif_height, taskbar_margin);
        
        // 计算四个角落，考虑任务栏边距
        // 底部位置需要减去任务栏高度，右边位置需要减去任务栏宽度
        let (calc_x, calc_y) = match pos {
            "topLeft" => (mon_x, mon_y),
            "topRight" => (mon_x + mon_w - notif_width - taskbar_margin, mon_y),
            "bottomLeft" => (mon_x, mon_y + mon_h - notif_height - taskbar_margin),
            "bottomRight" => (mon_x + mon_w - notif_width - taskbar_margin, mon_y + mon_h - notif_height - taskbar_margin),
            "topCenter" => (mon_x + (mon_w - notif_width) / 2.0, mon_y),
            "bottomCenter" => (mon_x + (mon_w - notif_width) / 2.0, mon_y + mon_h - notif_height - taskbar_margin),
            "leftCenter" => (mon_x, mon_y + (mon_h - notif_height) / 2.0),
            "rightCenter" => (mon_x + mon_w - notif_width - taskbar_margin, mon_y + (mon_h - notif_height) / 2.0),
            "center" => (mon_x + (mon_w - notif_width) / 2.0, mon_y + (mon_h - notif_height) / 2.0),
            _ => (mon_x + mon_w - notif_width - taskbar_margin, mon_y),
        };
        
        eprintln!("[DEBUG] 桌面位置 - 位置: {}, 计算结果: ({}, {})", pos, calc_x, calc_y);
        (calc_x, calc_y)
    };
    
    eprintln!("[DEBUG] 最终通知窗口位置: ({}, {})", x, y);

    // 构建自定义通知窗口
    // position() 设置的是窗口的 outer_position（窗口左上角的位置）
    // 对于没有装饰的窗口，outer_position 就是窗口的位置
    let notification_window = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(url.into()))
        .title("通知")
        .inner_size(notif_width, notif_height)
        .position(x, y)
        .decorations(false) // 禁用系统标题栏
        .transparent(true) // 透明背景
        .always_on_top(true) // 始终置顶
        .skip_taskbar(true) // 不在任务栏显示
        .resizable(false) // 不可调整大小
        .shadow(false) // 禁用窗口阴影（Windows）
        .build()
        .map_err(|e| format!("创建通知窗口失败: {}", e))?;
    
    // 显示窗口
    notification_window.show().map_err(|e| format!("显示窗口失败: {}", e))?;
    
    // 等待一小段时间确保窗口已创建
    std::thread::sleep(std::time::Duration::from_millis(50));
    
    // 再次设置位置，确保位置正确
    // 使用 PhysicalPosition，因为显示器坐标是物理坐标
    notification_window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32))
        .map_err(|e| format!("设置窗口位置失败: {}", e))?;
    
    // 验证位置
    if let Ok(actual_pos) = notification_window.outer_position() {
        eprintln!("[DEBUG] 窗口实际位置: ({}, {})", actual_pos.x, actual_pos.y);
    }

    Ok(window_label)
}

/// 打开开发者工具
///
/// 注意：Tauri v2 中开发者工具功能已更改，
/// 在生产构建中此功能被禁用。
///
/// # Arguments
///
/// * `app` - Tauri 应用句柄
///
/// # Returns
///
/// * `Ok(())` - 成功
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn toggle_devtools(_app: AppHandle) -> Result<(), String> {
    // Tauri v2 中 open_devtools 方法已被移除
    // 开发者工具需要在 tauri.conf.json 中配置并通过快捷键访问
    #[cfg(debug_assertions)]
    {
        // 在开发模式下，开发者工具可以通过 F12 或右键菜单访问
        log::info!("开发者工具可通过 F12 或右键菜单打开");
        Ok(())
    }
    
    #[cfg(not(debug_assertions))]
    {
        Err("生产环境中不支持开发者工具".to_string())
    }
}