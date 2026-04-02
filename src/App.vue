<template>
  <div id="app" @contextmenu.prevent="handleContextMenu">
    <!-- 独立窗口模式 (桌面悬浮球、AI助手窗口) -->
    <router-view v-if="isStandaloneWindow" />

    <!-- 主应用模式 -->
    <template v-else>
      <!-- 启动画面 -->
      <div v-if="isLoading" class="splash-screen">
        <div class="splash-content">9421
          <div class="splash-logo">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.9 7 2 7.9 2 9V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V9C22 7.9 21.1 7 20 7Z" fill="white" opacity="0.9"/>
              <path d="M20 4H4C3.45 4 3 4.45 3 5C3 5.55 3.45 6 4 6H20C20.55 6 21 5.55 21 5C21 4.45 20.55 4 20 4Z" fill="white" opacity="0.8"/>
              <circle cx="8" cy="13.5" r="1.5" fill="#667eea"/>
              <circle cx="12" cy="13.5" r="1.5" fill="#667eea"/>
              <circle cx="16" cy="13.5" r="1.5" fill="#667eea"/>
            </svg>
          </div>
          <div class="splash-title">ToolHub</div>
          <div class="splash-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ loadingStatus }}</div>
          </div>
        </div>
      </div>

      <!-- 主应用界面 -->
      <div v-else class="app-container">
        <HeaderBar />
        <div class="app-body">
          <ProductivitySidebar />
          <div class="app-content">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <keep-alive include="Chat">
                  <component :is="Component" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </div>
        <CloseConfirmDialog ref="closeDialogRef" @confirm="handleCloseConfirm" />
        <ContextMenu
          :visible="contextMenuVisible"
          :position="contextMenuPosition"
          @close="contextMenuVisible = false"
          @item-click="handleMenuItemClick"
        />

        <!-- 全局AI助手 (对话框模式) -->
        <AIAssistant v-model="showAIAssistant" />

        <!-- AI助手悬浮球 (应用内) -->
        <AIFloatingBall
          v-if="floatingBallConfig.enabled && floatingBallConfig.mode === 'inApp'"
          :visible="true"
          :mode="floatingBallConfig.mode"
          :style="floatingBallConfig.style"
          :size="floatingBallConfig.size"
          @click="openAIAssistantWindow"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/store'
import CloseConfirmDialog from '@/components/CloseConfirmDialog.vue'
import HeaderBar from '@/components/HeaderBar.vue'
import ProductivitySidebar from '@/components/ProductivitySidebar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import AIAssistant from '@/components/AIAssistant.vue'
import AIFloatingBall from '@/components/AIFloatingBall.vue'
import { loadConfig } from '@/utils/tauri/store'
import { setLocale, t } from '@/i18n'
import { initDatabase, checkDatabaseInitialized } from '@/utils/database'
import { initNotificationService } from '@/services/notificationService'
import { useRouter, useRoute } from 'vue-router'
import { handleError } from '@/utils/errorHandler'
import { recordLoadTime, createTimer } from '@/utils/performance'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

// 🔥 立即同步检查窗口类型 - 必须在 setup 最顶层
let windowLabel = 'main'
try {
  const currentWindow = getCurrentWebviewWindow()
  windowLabel = currentWindow.label
} catch (error) {
}

// 判断是否为独立窗口（包括便签、截图等动态创建的窗口）
const standaloneLabels = ['floating-ball', 'ai-assistant', 'sticky-notes']
const isStickyNotesWindow = windowLabel === 'sticky-notes' || /^sticky-notes-\d+$/.test(windowLabel)
const isScreenshotWindow = windowLabel.startsWith('screenshot-overlay-') || windowLabel.startsWith('pin-')
const isStandaloneWindow = ref(
  standaloneLabels.includes(windowLabel) || isStickyNotesWindow || isScreenshotWindow
)
const appStore = useAppStore()
const router = useRouter()
const route = useRoute()
const closeDialogRef = ref(null)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const isLoading = ref(true)
const loadingProgress = ref(0)
const loadingStatus = ref(t('common.starting'))
const showAIAssistant = ref(false)

// AI 助手悬浮球设置
const aiFloatingBallSettings = ref({
  enableFloatingBall: false,
  floatingBallMode: 'inApp',
  floatingBallStyle: 'circle',
  floatingBallSize: 60
})

// 计算属性：简化访问
const floatingBallConfig = computed(() => ({
  enabled: aiFloatingBallSettings.value.enableFloatingBall,
  mode: aiFloatingBallSettings.value.floatingBallMode,
  style: aiFloatingBallSettings.value.floatingBallStyle,
  size: aiFloatingBallSettings.value.floatingBallSize
}))

// 监听悬浮球配置变化
watch(floatingBallConfig, (newConfig) => {
  console.log('[悬浮球] 应显示:', newConfig.enabled ? `是 (${newConfig.mode})` : '否')
}, { deep: true })

// 打开 AI 助手窗口
const openAIAssistantWindow = async () => {
  try {
    const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')

    // 检查窗口是否已存在
    const allWindows = await getAllWebviewWindows()
    const existingWindow = allWindows.find(w => w.label === 'ai-assistant')

    if (existingWindow) {
      try {
        await existingWindow.show()
        await existingWindow.setFocus()
      } catch (err) {
        // ignore
      }
      return
    }

    // 创建新窗口
    const assistantUrl = `${window.location.origin}/ai-assistant-window`
    new WebviewWindow('ai-assistant', {
      url: assistantUrl,
      title: 'AI Assistant',
      width: 450,
      height: 650,
      resizable: true,
      center: true,
      decorations: false,
      alwaysOnTop: aiFloatingBallSettings.value.floatingBallMode === 'desktop',
      skipTaskbar: aiFloatingBallSettings.value.floatingBallMode === 'desktop',
      focus: true
    })
  } catch (error) {
    ElMessage.error(t('common.openAIFailed'))
  }
}

// 监听悬浮球设置变化
const handleFloatingBallToggle = async (event) => {
  const { enabled, mode, style, size } = event.detail
  // 先关闭旧的桌面悬浮球窗口
  await closeDesktopFloatingBall()

  // 更新配置
  aiFloatingBallSettings.value = {
    enableFloatingBall: enabled,
    floatingBallMode: mode,
    floatingBallStyle: style,
    floatingBallSize: size
  }
  // 如果启用了桌面模式，延迟创建桌面悬浮球窗口
  if (enabled && mode === 'desktop') {
    setTimeout(async () => {
      await createDesktopFloatingBall()
    }, 300)
  } else if (enabled && mode === 'inApp') {
  } else {
  }
}

// 显示桌面悬浮球窗口
const createDesktopFloatingBall = async () => {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
    const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window')

    // 获取所有窗口，找到悬浮球窗口
    const allWindows = await getAllWebviewWindows()
    const ballWindow = allWindows.find(w => w.label === 'floating-ball')

    if (!ballWindow) {
      return
    }
    // 获取屏幕尺寸，设置窗口位置到右下角
    const { availWidth, availHeight } = window.screen
    await ballWindow.setPosition(new LogicalPosition(availWidth - 100, availHeight - 100))

    // 确保窗口大小正确
    await ballWindow.setSize(new LogicalSize(60, 60))

    // 显示窗口
    await ballWindow.show()
  } catch (error) {
    // ignore
  }
}

// 关闭桌面悬浮球窗口
const closeDesktopFloatingBall = async () => {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')

    // 获取所有窗口，找到悬浮球窗口
    const allWindows = await getAllWebviewWindows()
    const ballWindow = allWindows.find(w => w.label === 'floating-ball')

    if (ballWindow) {
      await ballWindow.hide()
    }
  } catch (error) {
    // ignore
  }
}

// 处理右键菜单
const handleContextMenu = (event) => {
  if (window.__TAURI_RELOADING__) return

  event.preventDefault()
  event.stopPropagation()

  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  contextMenuVisible.value = true
}

// 处理菜单项点击
const handleMenuItemClick = (item) => {
  // 菜单项点击逻辑在 ContextMenu 组件中处理
}

// 全局错误处理：静默处理 Tauri callback 相关的错误
if (typeof window !== 'undefined') {
  // 初始化刷新标志
  window.__TAURI_RELOADING__ = false

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const errorMessage = typeof reason === 'string' ? reason : (reason?.message || '')

    // 如果是 callback 相关的错误，静默处理
    if (errorMessage.includes('callback') ||
        errorMessage.includes('Couldn\'t find callback') ||
        errorMessage.includes('callback id')) {
      event.preventDefault()
      // 不输出到控制台，完全静默
      return false
    }
  })

  // 捕获控制台错误和警告（Tauri 的错误会通过 console.error/warn 输出）
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log

  // 统一的过滤函数
  const shouldFilterMessage = (message) => {
    // 检查是否是 callback 相关的 TAURI 错误/警告
    if (message.includes('[TAURI]') && message.includes('callback')) {
      return true
    }
    if (message.includes('Couldn\'t find callback')) {
      return true
    }
    if (message.includes('callback id') && message.includes('TAURI')) {
      return true
    }
    // 过滤 KaTeX 相关的 Unicode 警告
    if (message.includes('LaTeX-incompatible input') && message.includes('unicodeTextInMathMode')) {
      return true
    }
    if (message.includes('Unicode text character') && message.includes('used in math mode')) {
      return true
    }
    return false
  }

  // 只取字符串参数拼接（Vue warn 会传不可转换的对象，全部跳过即可）
  const safeJoin = (args) => args.filter(a => typeof a === 'string').join(' ')

  console.error = function(...args) {
    const message = safeJoin(args)
    // 如果是 callback 相关的错误，不输出
    if (shouldFilterMessage(message)) {
      return
    }
    // 其他错误正常输出
    originalConsoleError.apply(console, args)
  }

  console.warn = function(...args) {
    const message = safeJoin(args)
    // 如果是 callback 相关的警告，不输出
    if (shouldFilterMessage(message)) {
      return
    }
    // 其他警告正常输出
    originalConsoleWarn.apply(console, args)
  }

  // 也拦截 console.log，因为某些情况下错误可能通过 log 输出
  console.log = function(...args) {
    const message = safeJoin(args)
    // 如果是 callback 相关的日志，不输出
    if (shouldFilterMessage(message)) {
      return
    }
    // 其他日志正常输出
    originalConsoleLog.apply(console, args)
  }

  // 监听页面卸载事件，标记正在刷新
  window.addEventListener('beforeunload', () => {
    window.__TAURI_RELOADING__ = true
  })

  // 监听页面隐藏事件
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 页面隐藏时，可能是刷新或关闭
      setTimeout(() => {
        window.__TAURI_RELOADING__ = true
      }, 500)
    }
  })

  // 全局键盘快捷键：Ctrl+K 唤起AI助手
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (aiFloatingBallSettings.value.enableFloatingBall) {
        openAIAssistantWindow()
      } else {
        showAIAssistant.value = true
      }
    }
  })

  // 监听悬浮球设置变化
  window.addEventListener('ai-floating-ball-toggle', handleFloatingBallToggle)
}

onMounted(async () => {
  // 🔥 如果是独立窗口，导航到对应路由
  if (isStandaloneWindow.value) {
    isLoading.value = false

    // 根据窗口标签导航到对应路由
    const currentWindow = getCurrentWebviewWindow()
    const label = currentWindow.label
    if (label === 'floating-ball') {
      if (route.path !== '/desktop-floating-ball') {
        try {
          await router.push('/desktop-floating-ball')
        } catch (err) {
        }
      } else {
      }
    } else if (label === 'ai-assistant') {
      if (route.path !== '/ai-assistant-window') {
        try {
          await router.push('/ai-assistant-window')
        } catch (err) {
        }
      } else {
      }
    } else if (label === 'sticky-notes' || /^sticky-notes-\d+$/.test(label)) {
      if (route.path !== '/sticky-notes') {
        try {
          await router.push('/sticky-notes')
        } catch (err) {
        }
      } else {
      }
    }

    return
  }
  const isDev = import.meta.env.DEV
  const appStartTimer = createTimer('应用启动')

  // —— 全局外观辅助函数 ——
  const applyAppTheme = (theme) => {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  const applyFontSize = (size) => {
    const base = Number(size) || 14
    const root = document.documentElement
    root.style.setProperty('--font-size-caption2', `${base - 3}px`)
    root.style.setProperty('--font-size-caption',  `${base - 2}px`)
    root.style.setProperty('--font-size-footnote', `${base - 1}px`)
    root.style.setProperty('--font-size-body',     `${base}px`)
    root.style.setProperty('--font-size-callout',  `${base + 1}px`)
    root.style.setProperty('--font-size-headline', `${base + 2}px`)
    root.style.setProperty('--font-size-title3',   `${base + 4}px`)
    root.style.setProperty('--font-size-title2',   `${base + 8}px`)
    root.style.setProperty('--font-size-title1',   `${base + 12}px`)
    root.style.setProperty('--font-size-large',    `${base + 18}px`)
  }

  const applyFontFamily = (family) => {
    const root = document.documentElement
    if (!family || family === 'system') {
      root.style.removeProperty('--font-family')
    } else {
      root.style.setProperty('--font-family', `"${family}", "PingFang SC", sans-serif`)
    }
  }

  // 启动加载流程
  try {
    // 步骤 1: 加载配置
    loadingStatus.value = t('common.loadingConfig')
    loadingProgress.value = 20
    const configTimer = createTimer('加载配置')

    try {
      const config = await loadConfig()
      configTimer.end()

      // 应用主题
      applyAppTheme(config.theme || 'light')

      // 监听系统主题变化（auto 模式下实时响应）
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const savedTheme = document.documentElement.getAttribute('data-theme-setting') || 'light'
        if (savedTheme === 'auto') {
          applyAppTheme('auto')
        }
      })
      // 记录用户选择的主题模式（用于 auto 监听判断）
      document.documentElement.setAttribute('data-theme-setting', config.theme || 'light')

      // 应用字体大小
      if (config.fontSize) {
        applyFontSize(config.fontSize)
      }

      // 应用字体家族
      if (config.fontFamily && config.fontFamily !== 'system') {
        applyFontFamily(config.fontFamily)
      }

      // 应用动画设置
      if (config.enableAnimations === false) {
        document.documentElement.classList.add('no-animations')
      } else {
        document.documentElement.classList.remove('no-animations')
      }

      // 应用语言设置
      if (config.language) {
        setLocale(config.language)
      }

      // 加载 AI 助手悬浮球设置
      if (config.aiAssistantSettings) {
        aiFloatingBallSettings.value = config.aiAssistantSettings
      } else {
      }

      // 同步窗口关闭行为到 store
      if (config.closeAction) {
        appStore.setCloseAction(config.closeAction)
      } else {
      }
    } catch (error) {
      configTimer.end()
      handleError(error, '加载配置')
    }

    // 步骤 2: 初始化数据库
    loadingStatus.value = t('common.initDatabase')
    loadingProgress.value = 40
    const dbTimer = createTimer('初始化数据库')

    const dbInitialized = await checkDatabaseInitialized()
    if (!dbInitialized) {
      await initDatabase()
    } else {
      // 即使数据库已存在，也要运行迁移以确保所有表和列都存在
      try {
        const { runMigrations } = await import('@/utils/database')
        await runMigrations()
      } catch (error) {
      }
    }
    dbTimer.end()

    // 步骤 3: 加载数据
    loadingStatus.value = t('common.loadingData')
    loadingProgress.value = 70
    const dataTimer = createTimer('加载数据')

    // 这里可以预加载一些数据
    // 例如：待办、日程等
    dataTimer.end()

    // 步骤 4: 初始化通知服务
    loadingStatus.value = t('common.initNotification')
    loadingProgress.value = 85
    const notificationTimer = createTimer('初始化通知服务')
    try {
      await initNotificationService()
      notificationTimer.end()
    } catch (error) {
      notificationTimer.end()
      handleError(error, '初始化通知服务')
    }

    // 步骤 5: 完成加载
    loadingStatus.value = t('common.startComplete')
    loadingProgress.value = 100

    // 确保最小加载时间（至少 500ms，提供良好的视觉体验）
    const totalTime = appStartTimer.end()
    const minLoadTime = 500
    if (totalTime < minLoadTime) {
      await new Promise(resolve => setTimeout(resolve, minLoadTime - totalTime))
    }

    recordLoadTime('应用启动总时间', totalTime)

    // 关闭启动画面
    isLoading.value = false

    // 关闭启动窗口
    if (!window.__TAURI_RELOADING__) {
      try {
        await invoke('close_splashscreen')
      } catch (error) {
        // 静默处理错误
      }
    }

    // 启动桌面悬浮球（如果配置已启用）
    if (aiFloatingBallSettings.value.enableFloatingBall && aiFloatingBallSettings.value.floatingBallMode === 'desktop') {
      setTimeout(() => {
        createDesktopFloatingBall()
      }, 500)
    }

    // 开发模式下默认打开控制台
    if (isDev) {
      try {
        await invoke('toggle_devtools')
      } catch (error) {
        // 静默处理错误
      }
    }
  } catch (error) {
    handleError(error, '应用启动')
    // 即使出错也显示主界面
    isLoading.value = false
  }

  // 注册通知点击事件监听器
  await listen('notification-clicked', async (event) => {
    const payload = event.payload
    if (payload.type === 'todo') {
      router.push(`/todos?id=${payload.id}`)
    } else if (payload.type === 'event') {
      router.push(`/calendar?id=${payload.id}`)
    }
  })

  // 注册窗口关闭事件监听器
  await listen('window-close-requested', async () => {
    if (appStore.closeAction === 'ask') {
      closeDialogRef.value?.show()
    } else {
      await invoke('handle_close_action', {
        action: appStore.closeAction
      })
    }
  })

  // 注册便签保存事件监听器
  await listen('sticky-notes-save', async (event) => {
    const { noteName, content } = event.payload
    // 内容为空时不保存，避免生成空文件
    if (!content || !content.trim()) return
    try {
      const notesAPI = await import('@/utils/notes')
      const versionAPI = await import('@/utils/noteVersion')
      const Database = (await import('@tauri-apps/plugin-sql')).default
      const { exists, mkdir } = await import('@tauri-apps/plugin-fs')
      const { join } = await import('@tauri-apps/api/path')

      // 默认文件夹名称（从配置读取）
      const stickyConfig = JSON.parse(localStorage.getItem('sticky_notes_config') || '{}')
      const DEFAULT_FOLDER = stickyConfig.noteFolder || t('common.stickyNoteFolder')

      // 确保默认文件夹存在
      const notesDir = await notesAPI.getNotesDir()
      const folderPath = await join(notesDir, DEFAULT_FOLDER)
      if (!(await exists(folderPath))) {
        await mkdir(folderPath, { recursive: true })
      }

      // 保存到默认文件夹
      await notesAPI.saveNote(noteName, content, DEFAULT_FOLDER)
      await versionAPI.saveNoteVersion(noteName, content, t('common.stickyNoteSave'))

      // 更新数据库
      const db = await Database.load('sqlite:productivity.db')
      const now = new Date().toISOString()
      const existing = await db.select('SELECT note_name FROM note_metadata WHERE note_name = ?', [noteName])
      if (existing && existing.length > 0) {
        await db.execute('UPDATE note_metadata SET updated_at = ? WHERE note_name = ?', [now, noteName])
      } else {
        await db.execute(
          'INSERT INTO note_metadata (note_name, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [noteName, t('common.stickyNote'), now, now]
        )
      }
    } catch (error) {
      // 忽略数据库错误，不影响便签保存功能
    }
  })

  // 注册全局快捷键：创建新的便签窗口
  let stickyShortcutProcessing = false
  let currentStickyShortcut = null

  // 预加载模块，避免快捷键触发时的动态 import 延迟
  const webviewMod = await import('@tauri-apps/api/webviewWindow')
  const windowMod = await import('@tauri-apps/api/window')

  // 快捷键处理函数：每次触发时实时读取最新配置
  const handleStickyShortcut = async () => {
    if (stickyShortcutProcessing) return
    stickyShortcutProcessing = true

    try {
      const cfg = JSON.parse(localStorage.getItem('sticky_notes_config') || '{}')
      const maxWindows = cfg.maxWindows || 10
      const cfgWidth = cfg.defaultWidth || 350
      const cfgHeight = cfg.defaultHeight || 400
      const cfgAlwaysOnTop = cfg.alwaysOnTop !== false

      const { WebviewWindow, getAllWebviewWindows } = webviewMod
      const allWindows = await getAllWebviewWindows()

      // 优先检查预配置的 sticky-notes 窗口（tauri.conf.json 中定义，启动时隐藏）
      const preConfigured = allWindows.find(w => w.label === 'sticky-notes')
      if (preConfigured) {
        const visible = await preConfigured.isVisible()
        if (!visible) {
          await preConfigured.show()
          preConfigured.setFocus()
          return
        }
      }

      // 预配置窗口已显示或不存在，创建新的动态窗口
      const existingLabels = allWindows.map(w => w.label)
      let label = null
      if (!existingLabels.includes('sticky-notes')) {
        label = 'sticky-notes'
      } else {
        for (let i = 1; i < maxWindows; i++) {
          const testLabel = `sticky-notes-${i}`
          if (!existingLabels.includes(testLabel)) {
            label = testLabel
            break
          }
        }
      }

      if (!label) {
        console.warn('[便签] 已达到最大窗口数')
        return
      }

      const existingStickyCount = allWindows.filter(w =>
        w.label === 'sticky-notes' || /^sticky-notes-\d+$/.test(w.label)
      ).length
      const offset = existingStickyCount * 30

      // 预计算窗口位置
      const screenWidth = window.screen.availWidth
      const screenHeight = window.screen.availHeight
      const x = Math.floor((screenWidth - cfgWidth) / 2) + offset
      const y = Math.floor((screenHeight - cfgHeight) / 2) + offset

      const timestamp = Date.now()
      const stickyUrl = `${window.location.origin}/sticky-notes?id=${timestamp}`
      const stickyWindow = new WebviewWindow(label, {
        url: stickyUrl,
        title: t('common.stickyNote'),
        x, y,
        width: cfgWidth,
        height: cfgHeight,
        minWidth: 300,
        minHeight: 350,
        resizable: true,
        decorations: false,
        transparent: true,
        shadow: false,
        center: false,
        alwaysOnTop: cfgAlwaysOnTop,
        skipTaskbar: false,
        visible: true,
        focus: true
      })

      stickyWindow.once('tauri://error', (e) => {
        console.error('[便签] 窗口创建失败:', e)
      })
    } catch (error) {
      console.error('[便签] 快捷键处理失败:', error)
    } finally {
      setTimeout(() => {
        stickyShortcutProcessing = false
      }, 500)
    }
  }

  // 注册/重新注册快捷键
  const registerStickyShortcut = async () => {
    try {
      const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut')
      const cfg = JSON.parse(localStorage.getItem('sticky_notes_config') || '{}')
      const newShortcut = (cfg.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')

      // 反注册旧快捷键
      if (currentStickyShortcut && currentStickyShortcut !== newShortcut) {
        try {
          if (await isRegistered(currentStickyShortcut)) {
            await unregister(currentStickyShortcut)
          }
        } catch {
          // 旧快捷键可能已失效
        }
      }

      // 反注册新快捷键（防止热重载重复注册）
      if (await isRegistered(newShortcut)) {
        await unregister(newShortcut)
      }

      await register(newShortcut, handleStickyShortcut)
      currentStickyShortcut = newShortcut
    } catch (error) {
      console.error('[便签] 快捷键注册失败:', error)
    }
  }

  // 初始注册
  await registerStickyShortcut()

  // 监听配置变更事件，保存后立即重新注册快捷键
  try {
    const { listen } = await import('@tauri-apps/api/event')
    await listen('sticky-notes-config-changed', () => {
      registerStickyShortcut()
    })
  } catch {
    // ignore
  }
})

// ==================== 截图工具全局快捷键 ====================
const initScreenshotShortcuts = (async () => {
  let screenshotProcessing = false

  const handleScreenshot = async () => {
    if (screenshotProcessing) return
    screenshotProcessing = true
    try {
      const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')

      // 防止重复打开覆盖层
      const allWins = await getAllWebviewWindows()
      const existing = allWins.find(w => w.label.startsWith('screenshot-overlay'))
      if (existing) { await existing.setFocus(); return }

      // 快速截图：写入临时 BMP 文件，只传元数据（不走 base64）
      const screens = await invoke('capture_screen_fast')
      if (!screens.length) return
      localStorage.setItem('__screenshot_pre_capture', JSON.stringify(screens))

      // 创建全屏透明覆盖窗口（先隐藏，图片加载完再显示，避免白屏闪烁）
      const label = `screenshot-overlay-${Date.now()}`
      new WebviewWindow(label, {
        url: `${window.location.origin}/screenshot-overlay`,
        title: '',
        fullscreen: true,
        transparent: true,
        decorations: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        visible: false,
      })
    } catch (e) {
      console.error('[截图] 快捷键处理失败:', e)
    } finally {
      setTimeout(() => { screenshotProcessing = false }, 600)
    }
  }

  // 仅 main 窗口注册全局快捷键（pin/overlay 窗口跳过）
  const { getCurrentWindow: getCurWin } = await import('@tauri-apps/api/window')
  const curWinLabel = getCurWin().label
  if (curWinLabel !== 'main') return

  try {
    const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut')
    const cfg = JSON.parse(localStorage.getItem('screenshot-settings') || '{}')

    // F1 截图
    const ssKey = cfg.hotkey || 'F1'
    if (await isRegistered(ssKey)) await unregister(ssKey)
    await register(ssKey, handleScreenshot)

    // F3 贴图
    const pinKey = 'F3'
    if (await isRegistered(pinKey)) await unregister(pinKey)
    let pinProcessing = false
    await register(pinKey, async () => {
      if (pinProcessing) return
      pinProcessing = true
      try {
        const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
        const allWins = await getAllWebviewWindows()
        const overlayWin = allWins.find(w => w.label.startsWith('screenshot-overlay'))

        if (overlayWin) {
          // 截图覆盖层正在打开 → 通知它执行贴图
          const { emitTo } = await import('@tauri-apps/api/event')
          await emitTo(overlayWin.label, 'screenshot-do-pin')
          return
        }

        // 无覆盖层 → 从剪贴板读取图片贴图
        const { readImage } = await import('@tauri-apps/plugin-clipboard-manager')
        const img = await readImage()
        const rgba = await img.rgba()
        if (!rgba.length) return

        const w = typeof img.width === 'function' ? img.width() : img.width
        const h = typeof img.height === 'function' ? img.height() : img.height
        if (!w || !h) {
          console.error('[贴图] 剪贴板图片尺寸无效:', w, h)
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        const base64 = dataUrl.split(',')[1]

        const pinId = `pin-${Date.now()}`
        const { invoke: inv } = await import('@tauri-apps/api/core')
        const tmpDir = await inv('get_temp_dir')
        const tmpPath = `${tmpDir}/toolhub-pin-${pinId}.png`
        await inv('save_screenshot_file', { path: tmpPath, data: base64 })

        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
        new WebviewWindow(pinId, {
          url: `${window.location.origin}/screenshot-pin?w=${w}&h=${h}&file=${encodeURIComponent(tmpPath)}`,
          title: '', width: w, height: h,
          decorations: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
        })
      } catch (e) {
        console.error('[贴图] F3处理失败:', e)
      } finally {
        setTimeout(() => { pinProcessing = false }, 500)
      }
    })

    console.log(`[截图] 全局快捷键已注册: ${ssKey}(截图) / F3(贴图)`)
  } catch (e) {
    console.error('[截图] 快捷键注册失败:', e)
  }

  // 监听设置变更
  try {
    const { listen } = await import('@tauri-apps/api/event')
    await listen('screenshot-config-changed', async () => {
      // 重新注册可在此扩展
    })
  } catch {}
})()

// 全局错误处理：静默处理 Tauri callback 相关的错误
// 注意：这个处理已经在 onMounted 之前添加了

// 处理用户确认
const handleCloseConfirm = async ({ action, remember }) => {
  // 检查是否正在刷新
  if (window.__TAURI_RELOADING__) {
    return
  }

  // 如果用户选择记住，保存偏好
  if (remember) {
    appStore.setCloseAction(action)
    appStore.setRememberCloseChoice(true)
  }

  // 执行关闭操作
  try {
    await invoke('handle_close_action', {
      action
    })
  } catch (error) {
    // 如果是刷新导致的错误，静默处理
    if (window.__TAURI_RELOADING__ || error.message?.includes('callback')) {
      return
    }
  }
}
</script>

<style>
/* ===== 全局设计令牌 (Design Tokens) ===== */
:root {
  /* —— 背景层级 —— */
  --bg-primary:        #ffffff;
  --bg-secondary:      #f5f5f7;
  --bg-tertiary:       #e8e8ed;
  --bg-grouped:        #f2f2f7;

  /* —— 文字层级 —— */
  --text-primary:      #1d1d1f;
  --text-secondary:    #6e6e73;
  --text-tertiary:     #aeaeb2;
  --text-quaternary:   #c7c7cc;

  /* —— 系统强调色 —— */
  --accent-blue:       #007aff;
  --accent-blue-hover: #0066d6;
  --accent-blue-active:#0055b3;
  --accent-blue-bg:    rgba(0,122,255,0.08);

  /* —— 语义色（低饱和） —— */
  --color-red:         #ff3b30;
  --color-orange:      #ff9500;
  --color-yellow:      #ffcc00;
  --color-green:       #34c759;
  --color-teal:        #5ac8fa;
  --color-purple:      #af52de;

  /* —— 分割与边框 —— */
  --border-color:      rgba(0,0,0,0.06);
  --border-color-strong:rgba(0,0,0,0.10);
  --divider:           rgba(0,0,0,0.04);

  /* —— 阴影层级 —— */
  --shadow-sm:         0 0.5px 1px rgba(0,0,0,0.04);
  --shadow-md:         0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg:         0 8px 24px rgba(0,0,0,0.12);
  --shadow-popover:    0 4px 16px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.06);
  --shadow-card:       0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05);
  --shadow-card-hover: 0 0 0 0.5px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.08);

  /* —— 圆角 —— */
  --radius-xs:         4px;
  --radius-sm:         6px;
  --radius-md:         10px;
  --radius-lg:         12px;
  --radius-xl:         16px;

  /* —— 间距 —— */
  --space-xs:          4px;
  --space-sm:          8px;
  --space-md:          12px;
  --space-lg:          16px;
  --space-xl:          20px;
  --space-2xl:         24px;
  --space-3xl:         32px;

  /* —— 字体 —— */
  --font-family:       "PingFang SC";
  --font-family-mono:  "PingFang SC";

  /* —— 字号层级 —— */
  --font-size-caption2: 11px;
  --font-size-caption:  12px;
  --font-size-footnote: 13px;
  --font-size-body:     14px;
  --font-size-callout:  15px;
  --font-size-headline: 16px;
  --font-size-title3:   18px;
  --font-size-title2:   22px;
  --font-size-title1:   26px;
  --font-size-large:    32px;

  /* —— 字重 —— */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  /* —— 动效 —— */
  --transition-fast:   120ms ease;
  --transition-normal: 200ms ease;
  --transition-smooth: 300ms cubic-bezier(0.25, 0.1, 0.25, 1);

  /* —— 布局尺寸 —— */
  --header-height:     38px;
  --sidebar-width:     220px;
  --sidebar-collapsed: 56px;

  /* —— Element Plus 覆盖 —— */
  --el-color-primary: var(--accent-blue);
  --el-color-success: var(--color-green);
  --el-color-warning: var(--color-orange);
  --el-color-danger: var(--color-red);
  --el-color-info: var(--text-tertiary);

  --el-bg-color: var(--bg-primary);
  --el-bg-color-page: var(--bg-secondary);
  --el-bg-color-overlay: var(--bg-primary);

  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-secondary);
  --el-text-color-secondary: var(--text-tertiary);
  --el-text-color-placeholder: var(--text-tertiary);

  --el-border-color: var(--border-color-strong);
  --el-border-color-light: var(--border-color);
  --el-border-color-lighter: var(--divider);

  --el-border-radius-base: var(--radius-sm);
  --el-border-radius-small: var(--radius-xs);
  --el-border-radius-round: 20px;

  --el-font-family: var(--font-family);
  --el-font-size-base: var(--font-size-body);
  --el-font-size-small: var(--font-size-footnote);
  --el-font-size-extra-small: var(--font-size-caption);

  --el-transition-duration: 200ms;

  --el-card-border-radius: var(--radius-md);
  --el-card-border-color: var(--border-color);
  --el-card-padding: var(--space-xl);

  --el-dialog-border-radius: var(--radius-xl);

  --el-switch-on-color: var(--accent-blue);

  --el-input-bg-color: var(--bg-primary);
  --el-input-border-color: var(--border-color-strong);
  --el-input-hover-border-color: var(--text-quaternary);
  --el-input-focus-border-color: var(--accent-blue);
  --el-input-border-radius: var(--radius-sm);
  --el-input-text-color: var(--text-primary);
  --el-input-placeholder-color: var(--text-tertiary);
}

/* ===== 暗色模式 ===== */
[data-theme="dark"] {
    --bg-primary:        #1c1c1e;
    --bg-secondary:      #000000;
    --bg-tertiary:       #2c2c2e;
    --bg-grouped:        #1c1c1e;

    --text-primary:      #f5f5f7;
    --text-secondary:    #98989d;
    --text-tertiary:     #636366;
    --text-quaternary:   #48484a;

    --accent-blue:       #0a84ff;
    --accent-blue-hover: #409cff;
    --accent-blue-bg:    rgba(10,132,255,0.12);

    --color-red:         #ff453a;
    --color-orange:      #ff9f0a;
    --color-yellow:      #ffd60a;
    --color-green:       #30d158;
    --color-teal:        #64d2ff;
    --color-purple:      #bf5af2;

    --border-color:      rgba(255,255,255,0.08);
    --border-color-strong:rgba(255,255,255,0.12);
    --divider:           rgba(255,255,255,0.06);

    --shadow-sm:         0 0.5px 1px rgba(0,0,0,0.3);
    --shadow-md:         0 2px 8px rgba(0,0,0,0.4);
    --shadow-lg:         0 8px 24px rgba(0,0,0,0.5);
    --shadow-popover:    0 4px 16px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3);
}

/* ===== 全局重置 ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ===== 禁用动画（仅作用于应用自定义过渡，不再粗暴影响第三方组件） ===== */
.no-animations .fade-enter-active,
.no-animations .fade-leave-active,
.no-animations .slide-left-enter-active,
.no-animations .slide-left-leave-active,
.no-animations .slide-right-enter-active,
.no-animations .slide-right-leave-active,
.no-animations .slide-panel-enter-active,
.no-animations .slide-panel-leave-active,
.no-animations .tool-card,
.no-animations .menu-item,
.no-animations .content-card,
.no-animations .image-card,
.no-animations .card-overlay,
.no-animations .favorite-btn,
.no-animations .send-btn-round,
.no-animations .action-card {
  transition-duration: 0s !important;
  animation-duration: 0s !important;
}


body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
}

#app {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  color: var(--text-primary);
}

/* ===== 启动画面 — 纯白底色，简洁居中 ===== */
.splash-screen {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-content {
  text-align: center;
}

.splash-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-lg);
}

.splash-logo svg {
  width: 56px;
  height: 56px;
}

.splash-logo svg path {
  fill: var(--text-primary);
}

.splash-logo svg circle {
  fill: var(--accent-blue);
}

.splash-title {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 1px;
  margin-bottom: var(--space-2xl);
}

.splash-progress {
  width: 180px;
  margin: 0 auto;
}

.progress-bar {
  width: 100%;
  height: 2px;
  background: var(--bg-tertiary);
  border-radius: 1px;
  overflow: hidden;
  margin-bottom: var(--space-sm);
}

.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 1px;
  transition: width var(--transition-smooth);
}

.progress-text {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

/* ===== 主应用容器 ===== */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-secondary);
  font-family: var(--font-family);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  padding-top: var(--header-height);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow: hidden;
  background: var(--bg-secondary);
}

/* ===== 页面切换动画 ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Element Plus 全局覆盖 ===== */
.el-tag {
  border: none;
  font-weight: var(--font-weight-medium);
}
.el-tag--danger {
  background: rgba(255,59,48,0.10);
  color: var(--color-red);
}
.el-tag--warning {
  background: rgba(255,149,0,0.10);
  color: var(--color-orange);
}
.el-tag--success {
  background: rgba(52,199,89,0.10);
  color: var(--color-green);
}
.el-tag--info {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.el-button--primary {
  border: none;
}
.el-button--default {
  border: 0.5px solid var(--border-color-strong);
}

.el-scrollbar__thumb {
  background: var(--text-quaternary);
  border-radius: 2px;
}
.el-scrollbar__bar {
  opacity: 0;
  transition: opacity var(--transition-normal);
}
.el-scrollbar:hover .el-scrollbar__bar {
  opacity: 1;
}

</style>
