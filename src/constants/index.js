/**
 * 应用配置常量
 */

/**
 * 窗口配置
 */
export const WINDOW_CONFIG = {
  /** 默认子窗口 URL */
  DEFAULT_CHILD_URL: 'https://www.baidu.com',
}

/**
 * 关闭行为类型
 */
export const CLOSE_ACTIONS = {
  /** 每次询问 */
  ASK: 'ask',
  /** 最小化到托盘 */
  MINIMIZE: 'minimize',
  /** 直接退出 */
  EXIT: 'exit',
}

/**
 * 关闭行为文本映射
 */
export const CLOSE_ACTION_LABELS = {
  [CLOSE_ACTIONS.ASK]: '每次询问',
  [CLOSE_ACTIONS.MINIMIZE]: '最小化到托盘',
  [CLOSE_ACTIONS.EXIT]: '直接退出',
}

/**
 * 主题类型
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
}

/**
 * 菜单项配置
 */
export const MENU_ITEMS = [
  { icon: '🏠', text: '首页', path: '/' },
  { icon: '💼', text: '文件管理器', path: '/file-manager' },
  { icon: '📁', text: '文件树', path: '/file-tree-demo' },
  { icon: '📋', text: '剪贴板', path: '/clipboard' },
  { icon: '💬', text: '对话框', path: '/dialog' },
  { icon: '🔔', text: '系统通知', path: '/notification' },
  { icon: '💻', text: '系统信息', path: '/system-info' },
  { icon: '⚙️', text: '进程管理', path: '/process' },
  { icon: '💻', text: 'Shell 命令', path: '/shell' },
  { icon: '🔗', text: '打开应用', path: '/opener' },
  { icon: '🌐', text: 'HTTP 客户端', path: '/http' },
  { icon: '🗄️', text: 'SQL 数据库', path: '/sql' },
  { icon: '🔌', text: 'WebSocket', path: '/websocket' },
  { icon: '📤', text: '文件上传', path: '/upload' },
  { icon: '📁', text: '文件操作', path: '/fs' },
  { icon: '⌨️', text: '全局快捷键', path: '/global-shortcut' },
  { icon: '💻', text: '命令行接口', path: '/cli' },
  { icon: '📍', text: '窗口定位', path: '/positioner' },
  { icon: '📝', text: '日志记录', path: '/log' },
  { icon: '🔄', text: '应用更新', path: '/updater' },
  { icon: '🪟', text: '窗口自定义', path: '/window-custom' },
  { icon: '📋', text: '原生菜单', path: '/menu' },
  { icon: '🎬', text: '启动动画', path: '/splash-animation' },
  { icon: '⚙️', text: '设置', path: '/settings' },
  { icon: 'ℹ️', text: '关于', path: '/about' },
]

/**
 * 功能特性列表
 */
export const FEATURES = [
  {
    title: '🚀 Vue Router 4',
    description: '单页应用路由管理，支持动态路由和路由守卫',
  },
  {
    title: '📦 Pinia 状态管理',
    description: '轻量级状态管理库，支持状态持久化',
  },
  {
    title: '🎨 Element Plus',
    description: '完整的 UI 组件库，按需自动导入',
  },
  {
    title: '⚡ 自动导入',
    description: 'Vue API 和组件自动导入，无需手动 import',
  },
  {
    title: '🖥️ Tauri API 封装',
    description: 'JavaScript 工具类封装所有 Tauri 原生 API',
  },
  {
    title: '🪟 窗口控制',
    description: '自定义标题栏和完整的窗口控制功能',
  },
]

/**
 * Tauri 功能模块列表
 */
export const TAURI_FEATURES = [
  {
    icon: '💼',
    title: '文件管理器',
    description: '高性能文件浏览、搜索、预览功能',
    path: '/file-manager',
    category: '文件系统'
  },
  {
    icon: '📁',
    title: '文件树',
    description: '递归扫描目录，构建完整文件树结构',
    path: '/file-tree',
    category: '文件系统'
  },
  {
    icon: '📁',
    title: '文件操作',
    description: '完整的文件系统操作功能，包括文件的增删改查、移动、复制、重命名等',
    path: '/fs',
    category: '文件系统'
  },
  {
    icon: '📋',
    title: '剪贴板管理',
    description: '读取和写入系统剪贴板内容',
    path: '/clipboard',
    category: '系统交互'
  },
  {
    icon: '💬',
    title: '对话框',
    description: '文件选择、保存、消息、确认对话框',
    path: '/dialog',
    category: '系统交互'
  },
  {
    icon: '🔔',
    title: '系统通知',
    description: '发送系统级桌面通知',
    path: '/notification',
    category: '系统交互'
  },
  {
    icon: '💻',
    title: '系统信息',
    description: '获取操作系统、架构、版本等信息',
    path: '/system-info',
    category: '系统信息'
  },
  {
    icon: '⚙️',
    title: '进程管理',
    description: '应用退出、重启等进程控制',
    path: '/process',
    category: '系统信息'
  },
  {
    icon: '💻',
    title: 'Shell 命令',
    description: '执行系统 Shell 命令',
    path: '/shell',
    category: '系统交互'
  },
  {
    icon: '🔗',
    title: '打开外部应用',
    description: '在浏览器中打开 URL 或打开文件/目录',
    path: '/opener',
    category: '系统交互'
  },
  {
    icon: '⚙️',
    title: '配置存储',
    description: '使用 Tauri Store 持久化存储配置',
    path: '/settings',
    category: '数据存储'
  },
  {
    icon: '🌐',
    title: 'HTTP 客户端',
    description: '使用 Rust 编写的 HTTP 客户端发送请求',
    path: '/http',
    category: '网络通信'
  },
  {
    icon: '🗄️',
    title: 'SQL 数据库',
    description: '通过 sqlx 与 SQLite 数据库进行交互',
    path: '/sql',
    category: '数据存储'
  },
  {
    icon: '🔌',
    title: 'WebSocket',
    description: '建立 WebSocket 连接进行实时通信',
    path: '/websocket',
    category: '网络通信'
  },
  {
    icon: '📤',
    title: '文件上传',
    description: '通过 HTTP 上传文件到服务器',
    path: '/upload',
    category: '网络通信'
  },
  {
    icon: '⌨️',
    title: '全局快捷键',
    description: '注册全局键盘快捷键',
    path: '/global-shortcut',
    category: '系统交互'
  },
  {
    icon: '💻',
    title: '命令行接口',
    description: '解析应用程序启动时的命令行参数',
    path: '/cli',
    category: '系统信息'
  },
  {
    icon: '📍',
    title: '窗口定位',
    description: '将窗口移动到屏幕的指定位置',
    path: '/positioner',
    category: '系统交互'
  },
  {
    icon: '📝',
    title: '日志记录',
    description: '可配置的日志记录功能',
    path: '/log',
    category: '系统信息'
  },
  {
    icon: '🔄',
    title: '应用更新',
    description: '检查和安装应用程序更新',
    path: '/updater',
    category: '系统信息'
  },
  {
    icon: '🪟',
    title: '窗口自定义',
    description: '自定义标题栏和窗口控制功能',
    path: '/window-custom',
    category: '系统交互'
  },
  {
    icon: '📋',
    title: '原生菜单',
    description: '创建和管理应用程序原生菜单',
    path: '/menu',
    category: '系统交互'
  }
]
