//! 应用配置常量

/// 窗口配置
pub mod window {
    /// 默认子窗口宽度
    pub const DEFAULT_CHILD_WINDOW_WIDTH: f64 = 1000.0;

    /// 默认子窗口高度
    pub const DEFAULT_CHILD_WINDOW_HEIGHT: f64 = 700.0;

    /// 子窗口默认标题
    pub const DEFAULT_CHILD_WINDOW_TITLE: &str = "子窗口";

    /// 子窗口标签前缀
    pub const CHILD_WINDOW_LABEL_PREFIX: &str = "child";

    /// 主窗口标签
    pub const MAIN_WINDOW_LABEL: &str = "main";

    /// 启动窗口标签
    pub const SPLASH_WINDOW_LABEL: &str = "splashscreen";
}

/// 启动配置
pub mod startup {
    use std::time::Duration;

    /// 启动窗口延迟（毫秒）
    pub const SPLASH_INITIAL_DELAY: Duration = Duration::from_millis(500);

    /// 主窗口加载等待时间（毫秒）
    /// 在开发模式下，需要更长时间等待 Vite 服务器启动
    pub const MAIN_WINDOW_LOAD_DELAY: Duration = Duration::from_millis(3000);
}

/// 托盘菜单项 ID
pub mod tray {
    pub const MENU_SHOW: &str = "show";
    pub const MENU_HIDE: &str = "hide";
    pub const MENU_QUIT: &str = "quit";

    pub const MENU_SHOW_LABEL: &str = "显示窗口";
    pub const MENU_HIDE_LABEL: &str = "隐藏窗口";
    pub const MENU_QUIT_LABEL: &str = "退出";
}

/// 窗口关闭动作
pub mod close_action {
    pub const MINIMIZE: &str = "minimize";
    pub const EXIT: &str = "exit";
}
