import { createApp } from "vue";
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import router from './router';
import App from "./App.vue";
import pluginManager from './plugins/pluginManager';
import examplePlugin from './plugins/examplePlugin';

// 导入 Element Plus 样式
import 'element-plus/dist/index.css'
// 导入全局通用样式
import './styles/common.css'

import 'md-editor-v3/lib/style.css'

// 导入提醒服务
import { initReminderService } from './utils/reminderService'

// 在应用启动前就设置全局错误处理，拦截 Tauri callback 相关的警告
if (typeof window !== 'undefined') {
  // 初始化刷新标志
  window.__TAURI_RELOADING__ = false

  // 捕获控制台输出，过滤 callback 相关的警告
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log

  const shouldFilterMessage = (message) => {
    // 检查是否是 callback 相关的 TAURI 错误/警告
    return (message.includes('[TAURI]') && message.includes('callback')) ||
           message.includes('Couldn\'t find callback') ||
           (message.includes('callback id') && message.includes('TAURI'))
  }

  console.error = function(...args) {
    const message = args.join(' ')
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleError.apply(console, args)
  }

  console.warn = function(...args) {
    const message = args.join(' ')
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleWarn.apply(console, args)
  }

  console.log = function(...args) {
    const message = args.join(' ')
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleLog.apply(console, args)
  }

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const errorMessage = reason?.message || reason?.toString() || ''
    if (errorMessage.includes('callback') ||
        errorMessage.includes('Couldn\'t find callback') ||
        errorMessage.includes('callback id')) {
      event.preventDefault()
      return false
    }
  })

  // 监听页面卸载事件
  window.addEventListener('beforeunload', () => {
    window.__TAURI_RELOADING__ = true
  })
}

const app = createApp(App);

// 配置 Pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);

// 初始化插件系统
pluginManager.registerPlugin(examplePlugin)
// 可以在这里加载更多插件
// pluginManager.loadPlugin('example-plugin')

// 将插件管理器暴露到全局，方便调试
if (import.meta.env.DEV) {
  window.pluginManager = pluginManager
}

app.mount("#app");

// 初始化提醒服务
initReminderService().catch(error => {
});
