import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('@/views/NoteView.vue'),
    meta: { title: '笔记管理' }
  },
  {
    path: '/md-preview-test',
    name: 'mdPreviewTest',
    component: () => import('@/views/MdPreviewTest.vue'),
    meta: { title: 'MD预览测试' }
  },
  {
    path: '/passwords',
    name: 'passwords',
    component: () => import('@/views/Passwords.vue'),
    meta: { title: '密码管理' }
  },
  {
    path: '/bookmarks',
    name: 'bookmarks',
    component: () => import('@/views/Bookmarks.vue'),
    meta: { title: '书签管理' }
  },
  {
    path: '/ai-chat',
    name: 'aiChat',
    component: () => import('@/views/AIChat.vue'),
    meta: { title: 'AI 助手' }
  },
  {
    path: '/ai-conversation',
    name: 'aiConversation',
    component: () => import('@/views/AIConversation.vue'),
    meta: { title: 'AI 对话' }
  },
  {
    path: '/agent-team',
    name: 'agentTeam',
    component: () => import('@/views/AgentTeam.vue'),
    meta: { title: '团队讨论' }
  },
  {
    path: '/todos',
    name: 'todos',
    component: () => import('@/views/Todos.vue'),
    meta: { title: '待办管理' }
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/Calendar.vue'),
    meta: { title: '日程管理' }
  },
  {
    path: '/file-manager',
    name: 'fileManager',
    component: () => import('@/views/FileManager.vue'),
    meta: { title: '文件管理器' }
  },
  {
    path: '/file-tree',
    name: 'fileTree',
    component: () => import('@/views/FileTreeDemo.vue'),
    meta: { title: '文件树' }
  },
  {
    path: '/clipboard',
    name: 'clipboard',
    component: () => import('@/views/components/Clipboard.vue'),
    meta: { title: '剪贴板管理' }
  },
  {
    path: '/dialog',
    name: 'dialog',
    component: () => import('@/views/components/Dialog.vue'),
    meta: { title: '对话框' }
  },
  {
    path: '/notification',
    name: 'notification',
    component: () => import('@/views/components/Notification.vue'),
    meta: { title: '系统通知' }
  },
  {
    path: '/system-info',
    name: 'systemInfo',
    component: () => import('@/views/components/SystemInfo.vue'),
    meta: { title: '系统信息' }
  },
  {
    path: '/process',
    name: 'process',
    component: () => import('@/views/components/Process.vue'),
    meta: { title: '进程管理' }
  },
  {
    path: '/shell',
    name: 'shell',
    component: () => import('@/views/components/Shell.vue'),
    meta: { title: 'Shell 命令' }
  },
  {
    path: '/opener',
    name: 'opener',
    component: () => import('@/views/components/Opener.vue'),
    meta: { title: '打开外部应用' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' }
  },
  {
    path: '/http',
    name: 'http',
    component: () => import('@/views/components/Http.vue'),
    meta: { title: 'HTTP 客户端' }
  },
  {
    path: '/sql',
    name: 'sql',
    component: () => import('@/views/components/Sql.vue'),
    meta: { title: 'SQL 数据库' }
  },
  {
    path: '/websocket',
    name: 'websocket',
    component: () => import('@/views/components/WebSocket.vue'),
    meta: { title: 'WebSocket' }
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/components/Upload.vue'),
    meta: { title: '文件上传' }
  },
  {
    path: '/fs',
    name: 'fs',
    component: () => import('@/views/components/Fs.vue'),
    meta: { title: '文件操作' }
  },
  {
    path: '/global-shortcut',
    name: 'globalShortcut',
    component: () => import('@/views/components/GlobalShortcut.vue'),
    meta: { title: '全局快捷键' }
  },
  {
    path: '/cli',
    name: 'cli',
    component: () => import('@/views/components/Cli.vue'),
    meta: { title: '命令行接口' }
  },
  {
    path: '/positioner',
    name: 'positioner',
    component: () => import('@/views/components/Positioner.vue'),
    meta: { title: '窗口定位' }
  },
  {
    path: '/log',
    name: 'log',
    component: () => import('@/views/components/Log.vue'),
    meta: { title: '日志记录' }
  },
  {
    path: '/updater',
    name: 'updater',
    component: () => import('@/views/components/Updater.vue'),
    meta: { title: '应用更新' }
  },
  {
    path: '/window-custom',
    name: 'windowCustom',
    component: () => import('@/views/components/WindowCustom.vue'),
    meta: { title: '窗口自定义' }
  },
  {
    path: '/menu',
    name: 'menu',
    component: () => import('@/views/components/Menu.vue'),
    meta: { title: '原生菜单' }
  },
  {
    path: '/splash-animation',
    name: 'splashAnimation',
    component: () => import('@/views/components/SplashAnimation.vue'),
    meta: { title: '启动动画' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: { title: '数据统计' }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于' }
  },
  {
    path: '/ai-assistant-window',
    name: 'aiAssistantWindow',
    component: () => import('@/views/AIAssistantWindow.vue'),
    meta: { title: 'AI 智能助手' }
  },
  {
    path: '/desktop-floating-ball',
    name: 'desktopFloatingBall',
    component: () => import('@/views/DesktopFloatingBall.vue'),
    meta: { title: 'AI助手' }
  },
  {
    path: '/sticky-notes',
    name: 'stickyNotes',
    component: () => import('@/views/StickyNotes.vue'),
    meta: { title: '便签' }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/Chat.vue'),
    meta: { title: '即时聊天' }
  },
  {
    path: '/toolbox',
    name: 'toolbox',
    component: () => import('@/views/Toolbox.vue'),
    meta: { title: '工具箱' }
  },
  {
    path: '/toolbox/sticky-notes',
    name: 'toolboxStickyNotes',
    component: () => import('@/views/ToolboxStickyNotes.vue'),
    meta: { title: '便签管理' }
  },
  {
    path: '/toolbox/sdk-manager',
    name: 'sdkManager',
    component: () => import('@/views/SdkManager.vue'),
    meta: { title: 'SDK版本管理' }
  },
  {
    path: '/toolbox/port-manager',
    name: 'portManager',
    component: () => import('@/views/PortManager.vue'),
    meta: { title: '端口管理' }
  },
  {
    path: '/toolbox/code-formatter',
    name: 'codeFormatter',
    component: () => import('@/views/CodeFormatter.vue'),
    meta: { title: '代码格式化' }
  },
  {
    path: '/toolbox/git-manager',
    name: 'gitManager',
    component: () => import('@/views/GitManager.vue'),
    meta: { title: 'Git管理' }
  },
  {
    path: '/toolbox/git-daily-report',
    name: 'gitDailyReport',
    component: () => import('@/views/GitDailyReport.vue'),
    meta: { title: 'Git日报' }
  },
  {
    path: '/toolbox/file-diff',
    name: 'fileDiff',
    component: () => import('@/views/FileDiff.vue'),
    meta: { title: '文件比对' }
  },
  {
    path: '/toolbox/api-workbench',
    redirect: '/toolbox/api-debug',
  },
  {
    path: '/toolbox/api-debug',
    name: 'apiDebug',
    component: () => import('@/views/ApiDebug.vue'),
    meta: { title: '接口调试' }
  },
  {
    path: '/toolbox/api-docs',
    name: 'apiDocs',
    component: () => import('@/views/ApiDocs.vue'),
    meta: { title: '接口文档' }
  },
  {
    path: '/toolbox/mock-service',
    name: 'mockService',
    component: () => import('@/views/MockService.vue'),
    meta: { title: 'Mock 服务' }
  },
  {
    path: '/toolbox/perf-test',
    name: 'perfTest',
    component: () => import('@/views/PerfTest.vue'),
    meta: { title: '性能测试' }
  },
  {
    path: '/toolbox/auto-test',
    name: 'autoTest',
    component: () => import('@/views/AutoTest.vue'),
    meta: { title: '自动化测试' }
  },
  {
    path: '/toolbox/ebook-shelf',
    name: 'ebookShelf',
    component: () => import('@/views/EbookShelf.vue'),
    meta: { title: '电子书' }
  },
  {
    path: '/toolbox/ebook-reader/:id',
    name: 'ebookReader',
    component: () => import('@/views/EbookReader.vue'),
    meta: { title: '阅读' }
  },
  {
    path: '/toolbox/screenshot',
    name: 'screenshotManager',
    component: () => import('@/views/ScreenshotManager.vue'),
    meta: { title: '截图工具' }
  },
  {
    path: '/toolbox/redis-client',
    name: 'redisClient',
    component: () => import('@/views/RedisClient.vue'),
    meta: { title: 'Redis 客户端' }
  },
  {
    path: '/toolbox/image-to-base64',
    name: 'imageToBase64',
    component: () => import('@/views/ImageToBase64.vue'),
    meta: { title: '图片Base64' }
  },
  {
    path: '/toolbox/image-format-converter',
    name: 'imageFormatConverter',
    component: () => import('@/views/ImageFormatConverter.vue'),
    meta: { title: '图片格式转换' }
  },
  {
    path: '/toolbox/regex-tester',
    name: 'regexTester',
    component: () => import('@/views/RegexTester.vue'),
    meta: { title: '正则测试' }
  },
  {
    path: '/toolbox/crypto-tool',
    name: 'cryptoTool',
    component: () => import('@/views/CryptoTool.vue'),
    meta: { title: '加密解密' }
  },
  {
    path: '/toolbox/sqlite-manager',
    name: 'sqliteManager',
    component: () => import('@/views/SqliteManager.vue'),
    meta: { title: 'SQLite 管理器' }
  },
  {
    path: '/toolbox/maven-repo',
    name: 'mavenRepo',
    component: () => import('@/views/MavenRepo.vue'),
    meta: { title: 'Maven 仓库' }
  },
  {
    path: '/toolbox/wallpaper-manager',
    name: 'wallpaperManager',
    component: () => import('@/views/WallpaperManager.vue'),
    meta: { title: '壁纸管理' }
  },
  {
    path: '/toolbox/log-analyzer',
    name: 'logAnalyzer',
    component: () => import('@/views/LogAnalyzer.vue'),
    meta: { title: '日志分析' }
  },
  {
    path: '/screenshot-overlay',
    name: 'screenshotOverlay',
    component: () => import('@/views/ScreenshotOverlay.vue'),
    meta: { title: '截图' }
  },
  {
    path: '/screenshot-pin',
    name: 'screenshotPin',
    component: () => import('@/views/ScreenshotPin.vue'),
    meta: { title: '贴图' }
  },
  {
    path: '/screenshot-pin-toolbar',
    name: 'screenshotPinToolbar',
    component: () => import('@/views/ScreenshotPinToolbar.vue'),
    meta: { title: '贴图工具栏' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
