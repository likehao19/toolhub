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
    path: '/toolbox',
    name: 'toolbox',
    component: () => import('@/views/Toolbox.vue'),
    meta: { title: '工具箱' }
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
