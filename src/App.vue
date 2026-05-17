<template>
  <div id="app" @contextmenu.prevent="handleContextMenu">
    <!-- 独立窗口模式 (桌面悬浮球、AI助手窗口) -->
    <router-view v-if="isStandaloneWindow" />

    <!-- 主应用模式 -->
    <template v-else>
      <!-- 启动画面 -->
      <div v-if="isLoading" class="splash-screen">
        <div class="splash-content splash-content-skeleton">
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
          <div class="splash-card">
            <div class="splash-status-title">正在准备工作台</div>
            <div class="splash-status-text">{{ loadingStatus }}</div>
            <div class="skeleton-stack" aria-hidden="true">
              <div class="skeleton-row wide"></div>
              <div class="skeleton-row mid"></div>
              <div class="skeleton-row short"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主应用界面 -->
      <div v-else class="app-container">
        <HeaderBar />
        <div class="app-body">
          <ProductivitySidebar />
          <div class="app-content" :class="{ 'toolbox-unified-shell': isToolboxToolRoute }">
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
          v-if="floatingBallConfig.enabled && floatingBallConfig.mode === 'inApp' && !isToolboxToolRoute"
          :visible="true"
          :mode="floatingBallConfig.mode"
          :style="floatingBallConfig.style"
          :size="floatingBallConfig.size"
          @click="openAIAssistantWindow"
        />

        <!-- 全局更新对话框（启动自动检查 + 设置页"检查更新"复用同一实例） -->
        <UpdateDialog v-model="updateDialogVisible" :info="updateDialogInfo" />
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
import { initEncryption } from '@/utils/encryption'
import CloseConfirmDialog from '@/components/CloseConfirmDialog.vue'
import HeaderBar from '@/components/HeaderBar.vue'
import ProductivitySidebar from '@/components/ProductivitySidebar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import AIAssistant from '@/components/AIAssistant.vue'
import AIFloatingBall from '@/components/AIFloatingBall.vue'
import UpdateDialog from '@/components/UpdateDialog.vue'
import { useFeedbackAndUpdate } from '@/composables/settings/useFeedbackAndUpdate'
import { loadConfig } from '@/utils/tauri/store'
import { applyAppearance, applyThemeMode, syncSystemThemePreference } from '@/utils/appearance'
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
const isToolboxToolRoute = computed(() => route.path === '/toolbox' || route.path.startsWith('/toolbox/'))
const closeDialogRef = ref(null)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const isLoading = ref(true)
const loadingStatus = ref(t('common.starting'))
const showAIAssistant = ref(false)

// 全局更新对话框（由 useFeedbackAndUpdate module-level singleton 控制；
// 设置页"检查更新"和启动自动检查共享同一实例，避免双实例 race。）
const { updateDialogVisible, updateDialogInfo, checkUpdate } = useFeedbackAndUpdate()
let cleanupAppearanceSync = null
const tauriUnlisteners = []
let removeUnhandledRejectionListener = null
let removeBeforeUnloadListener = null
let removeVisibilityChangeListener = null
let removeKeydownListener = null
let removeFloatingBallToggleListener = null

applyThemeMode('auto')

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
const shouldFilterMessage = (message) => {
  if (message.includes('[TAURI]') && message.includes('callback')) {
    return true
  }
  if (message.includes('Couldn\'t find callback')) {
    return true
  }
  if (message.includes('callback id') && message.includes('TAURI')) {
    return true
  }
  if (message.includes('LaTeX-incompatible input') && message.includes('unicodeTextInMathMode')) {
    return true
  }
  if (message.includes('Unicode text character') && message.includes('used in math mode')) {
    return true
  }
  return false
}

const safeJoin = (args) => args.filter(a => typeof a === 'string').join(' ')

if (typeof window !== 'undefined' && !window.__TOOLHUB_CONSOLE_FILTER_PATCHED__) {
  window.__TOOLHUB_CONSOLE_FILTER_PATCHED__ = true
  window.__TAURI_RELOADING__ = false

  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log

  console.error = function(...args) {
    const message = safeJoin(args)
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleError.apply(console, args)
  }

  console.warn = function(...args) {
    const message = safeJoin(args)
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleWarn.apply(console, args)
  }

  console.log = function(...args) {
    const message = safeJoin(args)
    if (shouldFilterMessage(message)) {
      return
    }
    originalConsoleLog.apply(console, args)
  }
}

const registerGlobalDomListeners = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.__TAURI_RELOADING__ = false

  const handleUnhandledRejection = (event) => {
    const reason = event.reason
    const errorMessage = typeof reason === 'string' ? reason : (reason?.message || '')

    if (errorMessage.includes('callback') ||
        errorMessage.includes('Couldn\'t find callback') ||
        errorMessage.includes('callback id')) {
      event.preventDefault()
      return false
    }
  }

  const handleBeforeUnload = () => {
    window.__TAURI_RELOADING__ = true
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTimeout(() => {
        window.__TAURI_RELOADING__ = true
      }, 500)
    }
  }

  const handleGlobalKeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (aiFloatingBallSettings.value.enableFloatingBall) {
        openAIAssistantWindow()
      } else {
        showAIAssistant.value = true
      }
    }
  }

  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('ai-floating-ball-toggle', handleFloatingBallToggle)

  removeUnhandledRejectionListener = () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  removeBeforeUnloadListener = () => window.removeEventListener('beforeunload', handleBeforeUnload)
  removeVisibilityChangeListener = () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  removeKeydownListener = () => window.removeEventListener('keydown', handleGlobalKeydown)
  removeFloatingBallToggleListener = () => window.removeEventListener('ai-floating-ball-toggle', handleFloatingBallToggle)
}

const cleanupGlobalDomListeners = () => {
  removeUnhandledRejectionListener?.()
  removeBeforeUnloadListener?.()
  removeVisibilityChangeListener?.()
  removeKeydownListener?.()
  removeFloatingBallToggleListener?.()
  removeUnhandledRejectionListener = null
  removeBeforeUnloadListener = null
  removeVisibilityChangeListener = null
  removeKeydownListener = null
  removeFloatingBallToggleListener = null
}

const registerTauriListener = async (eventName, handler) => {
  const unlisten = await listen(eventName, handler)
  tauriUnlisteners.push(unlisten)
  return unlisten
}

const cleanupTauriListeners = async () => {
  while (tauriUnlisteners.length > 0) {
    const unlisten = tauriUnlisteners.pop()
    try {
      await unlisten?.()
    } catch {
      // ignore
    }
  }
}


const mainWindowShortcutCleanup = {
  stickyShortcut: null,
  stickyConfigListener: null,
  screenshotShortcutKeys: [],
  screenshotConfigListener: null,
}

const cleanupMainWindowShortcuts = async () => {
  try {
    const { unregister, isRegistered } = await import('@tauri-apps/plugin-global-shortcut')
    if (mainWindowShortcutCleanup.stickyShortcut && await isRegistered(mainWindowShortcutCleanup.stickyShortcut)) {
      await unregister(mainWindowShortcutCleanup.stickyShortcut)
    }
    for (const shortcut of mainWindowShortcutCleanup.screenshotShortcutKeys) {
      if (await isRegistered(shortcut)) {
        await unregister(shortcut)
      }
    }
  } catch {
    // ignore
  }

  mainWindowShortcutCleanup.stickyShortcut = null
  mainWindowShortcutCleanup.screenshotShortcutKeys = []

  try {
    await mainWindowShortcutCleanup.stickyConfigListener?.()
  } catch {
    // ignore
  }
  try {
    await mainWindowShortcutCleanup.screenshotConfigListener?.()
  } catch {
    // ignore
  }

  mainWindowShortcutCleanup.stickyConfigListener = null
  mainWindowShortcutCleanup.screenshotConfigListener = null
}

const registerMainWindowShortcuts = async () => {
  if (windowLabel !== 'main') {
    return
  }

  let stickyShortcutProcessing = false
  let currentStickyShortcut = null

  const webviewMod = await import('@tauri-apps/api/webviewWindow')

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

      const preConfigured = allWindows.find(w => w.label === 'sticky-notes')
      if (preConfigured) {
        const visible = await preConfigured.isVisible()
        if (!visible) {
          await preConfigured.show()
          preConfigured.setFocus()
          return
        }
      }

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

  const registerStickyShortcut = async () => {
    try {
      const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut')
      const cfg = JSON.parse(localStorage.getItem('sticky_notes_config') || '{}')
      const newShortcut = (cfg.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')

      if (currentStickyShortcut && currentStickyShortcut !== newShortcut) {
        try {
          if (await isRegistered(currentStickyShortcut)) {
            await unregister(currentStickyShortcut)
          }
        } catch {
          // ignore
        }
      }

      if (await isRegistered(newShortcut)) {
        await unregister(newShortcut)
      }

      await register(newShortcut, handleStickyShortcut)
      currentStickyShortcut = newShortcut
      mainWindowShortcutCleanup.stickyShortcut = newShortcut
    } catch (error) {
      console.error('[便签] 快捷键注册失败:', error)
    }
  }

  await registerStickyShortcut()

  try {
    mainWindowShortcutCleanup.stickyConfigListener = await listen('sticky-notes-config-changed', () => {
      registerStickyShortcut()
    })
  } catch {
    // ignore
  }

  let screenshotProcessing = false

  const handleScreenshot = async () => {
    if (screenshotProcessing) return
    screenshotProcessing = true
    try {
      const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
      const allWins = await getAllWebviewWindows()
      const existing = allWins.find(w => w.label.startsWith('screenshot-overlay'))
      if (existing) { await existing.setFocus(); return }

      const screens = await invoke('capture_screen_fast')
      if (!screens.length) return
      localStorage.setItem('__screenshot_pre_capture', JSON.stringify(screens))

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

  try {
    const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut')
    const cfg = JSON.parse(localStorage.getItem('screenshot-settings') || '{}')

    const ssKey = cfg.hotkey || 'F1'
    if (await isRegistered(ssKey)) await unregister(ssKey)
    await register(ssKey, handleScreenshot)

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
          const { emitTo } = await import('@tauri-apps/api/event')
          await emitTo(overlayWin.label, 'screenshot-do-pin')
          return
        }

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

    mainWindowShortcutCleanup.screenshotShortcutKeys = [ssKey, pinKey]
    console.log(`[截图] 全局快捷键已注册: ${ssKey}(截图) / F3(贴图)`)
  } catch (e) {
    console.error('[截图] 快捷键注册失败:', e)
  }

  try {
    mainWindowShortcutCleanup.screenshotConfigListener = await listen('screenshot-config-changed', async () => {
      // 预留后续重注册逻辑
    })
  } catch {
    // ignore
  }
}

onMounted(async () => {
  registerGlobalDomListeners()
  cleanupAppearanceSync = syncSystemThemePreference()
  // 在所有用到密码 / 凭据解密的页面挂载之前先把主密钥拉到内存,
  // 避免 Passwords / Dashboard 加载时因为密钥未就绪而看到空密码。
  // initEncryption 内部已 try/catch,失败也不会阻塞启动。
  await initEncryption()
  try {
    await registerMainWindowShortcuts()
  } catch (error) {
    console.error('[启动] 注册快捷键失败:', error)
  }

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

  // 安全超时：如果启动超过 10 秒仍未完成，强制关闭 splash 显示主界面
  const startupSafetyTimeout = setTimeout(async () => {
    if (isLoading.value) {
      console.warn('[启动] 超时(10s)，强制显示主界面')
      isLoading.value = false
      try { await invoke('close_splashscreen') } catch (_) {}
    }
  }, 10000)

  // 关闭 splash 并显示主窗口的统一函数
  const finishStartup = async () => {
    clearTimeout(startupSafetyTimeout)
    isLoading.value = false
    if (!window.__TAURI_RELOADING__) {
      try { await invoke('close_splashscreen') } catch (_) {}
    }
  }

  // 启动加载流程
  try {
    // 步骤 1: 加载配置
    console.log('[启动] 步骤1: 加载配置...')
    loadingStatus.value = t('common.loadingConfig')
    const configTimer = createTimer('加载配置')

    try {
      const config = await loadConfig()
      configTimer.end()
      console.log('[启动] 步骤1: 配置加载完成')

      applyAppearance(config)
      cleanupAppearanceSync?.()
      cleanupAppearanceSync = syncSystemThemePreference()

      if (config.language) {
        setLocale(config.language)
      }

      if (config.aiAssistantSettings) {
        aiFloatingBallSettings.value = config.aiAssistantSettings
      }

      if (config.closeAction) {
        appStore.setCloseAction(config.closeAction)
      }
    } catch (error) {
      configTimer.end()
      handleError(error, '加载配置')
    }

    // 步骤 2: 初始化数据库
    console.log('[启动] 步骤2: 初始化数据库...')
    loadingStatus.value = t('common.initDatabase')
    const dbTimer = createTimer('初始化数据库')

    try {
      const dbInitialized = await checkDatabaseInitialized()
      if (!dbInitialized) {
        await initDatabase()
      } else {
        try {
          const { runMigrations } = await import('@/utils/database')
          await runMigrations()
        } catch (error) {
          console.error('[启动] 数据库迁移失败:', error)
        }
      }
    } catch (error) {
      console.error('[启动] 数据库初始化失败:', error)
    }
    dbTimer.end()
    console.log('[启动] 步骤2: 数据库初始化完成')

    // 步骤 3: 加载数据
    console.log('[启动] 步骤3: 加载数据...')
    loadingStatus.value = t('common.loadingData')
    const dataTimer = createTimer('加载数据')
    dataTimer.end()

    // 步骤 4: 初始化通知服务
    console.log('[启动] 步骤4: 初始化通知服务...')
    loadingStatus.value = t('common.initNotification')
    const notificationTimer = createTimer('初始化通知服务')
    try {
      await initNotificationService()
      notificationTimer.end()
    } catch (error) {
      notificationTimer.end()
      handleError(error, '初始化通知服务')
    }
    console.log('[启动] 步骤4: 通知服务完成')

    // 步骤 5: 完成加载
    loadingStatus.value = t('common.startComplete')

    const totalTime = appStartTimer.end()
    const minLoadTime = 500
    if (totalTime < minLoadTime) {
      await new Promise(resolve => setTimeout(resolve, minLoadTime - totalTime))
    }

    recordLoadTime('应用启动总时间', totalTime)
    console.log('[启动] 全部完成，关闭 splash')

    // 关闭启动画面，显示主窗口
    await finishStartup()

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

    // 启动 2 秒后静默检查更新（非 dev）：有新版本就弹 UpdateDialog；
    // 无新版/网络失败完全静默，不打扰用户。
    if (!isDev) {
      setTimeout(() => {
        checkUpdate({ silent: true }).catch(() => {})
      }, 2000)
    }
  } catch (error) {
    handleError(error, '应用启动')
    console.error('[启动] 启动失败，强制显示主界面:', error)
    await finishStartup()
  }

  // 注册通知点击事件监听器
  await registerTauriListener('notification-clicked', async (event) => {
    const payload = event.payload
    if (payload.type === 'todo') {
      router.push(`/todos?id=${payload.id}`)
    } else if (payload.type === 'event') {
      router.push(`/calendar?id=${payload.id}`)
    }
  })

  // 注册窗口关闭事件监听器
  await registerTauriListener('window-close-requested', async () => {
    if (appStore.closeAction === 'ask') {
      closeDialogRef.value?.show()
    } else {
      await invoke('handle_close_action', {
        action: appStore.closeAction
      })
    }
  })

  // 注册便签保存事件监听器
  await registerTauriListener('sticky-notes-save', async (event) => {
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

})

onUnmounted(async () => {
  cleanupAppearanceSync?.()
  cleanupGlobalDomListeners()
  await cleanupTauriListeners()
  await cleanupMainWindowShortcuts()
})

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
  /* —— 背景层级（暖奶油基调，与官网一致） —— */
  --bg-primary:        #fdfbf6;
  --bg-secondary:      #f5f1e8;
  --bg-tertiary:       #ebe7dc;
  --bg-grouped:        #f0ede4;
  --surface-page:      #fbfaf6;
  --surface-panel:     rgba(255,255,255,0.92);
  --surface-panel-soft:rgba(255,255,255,0.72);
  --surface-hover:     rgba(255,255,255,0.96);
  --surface-muted:     rgba(255,255,255,0.62);
  --surface-accent:    rgba(194,65,12,0.08);
  --surface-divider:   rgba(60,40,20,0.10);

  /* —— 文字层级 —— */
  --text-primary:      #1a1a1a;
  --text-secondary:    #3f3f46;
  --text-tertiary:     #71717a;
  --text-quaternary:   #a1a1aa;

  /* —— 系统强调色（暖橙；变量名保留以兼容 100+ 处引用） —— */
  --accent-blue:       #c2410c;
  --accent-blue-hover: #9a3412;
  --accent-blue-active:#7c2d12;
  --accent-blue-bg:    rgba(194,65,12,0.10);

  /* —— 暖色语义别名（推荐新代码使用） —— */
  --accent-warm:       #c2410c;
  --accent-warm-hover: #9a3412;
  --accent-warm-soft:  #fff1e6;

  /* —— 语义色（低饱和） —— */
  --color-red:         #ff3b30;
  --color-orange:      #ff9500;
  --color-yellow:      #ffcc00;
  --color-green:       #34c759;
  --color-teal:        #5ac8fa;
  --color-purple:      #af52de;

  /* —— 分割与边框（暖调） —— */
  --border-color:      rgba(60,40,20,0.14);
  --border-color-strong:rgba(60,40,20,0.20);
  --divider:           rgba(60,40,20,0.10);

  /* —— 阴影层级 —— */
  --shadow-sm:         0 1px 2px rgba(60, 40, 20,0.05);
  --shadow-md:         0 6px 18px rgba(60, 40, 20,0.08);
  --shadow-lg:         0 16px 40px rgba(60, 40, 20,0.12);
  --shadow-popover:    0 14px 38px rgba(60, 40, 20,0.14), 0 1px 2px rgba(60, 40, 20,0.08);
  --shadow-card:       0 1px 2px rgba(60, 40, 20,0.06), 0 8px 24px rgba(60, 40, 20,0.05);
  --shadow-card-hover: 0 2px 6px rgba(60, 40, 20,0.08), 0 16px 28px rgba(60, 40, 20,0.10);

  /* —— 圆角 —— */
  --radius-xs:         6px;
  --radius-sm:         10px;
  --radius-md:         14px;
  --radius-lg:         18px;
  --radius-xl:         24px;

  /* —— 间距 —— */
  --space-xs:          4px;
  --space-sm:          8px;
  --space-md:          12px;
  --space-lg:          16px;
  --space-xl:          20px;
  --space-2xl:         24px;
  --space-3xl:         32px;

  /* —— 字体 —— */
  --font-family:       "Segoe UI Variable Display", "PingFang SC", "Microsoft YaHei UI", "Noto Sans SC", sans-serif;
  --font-family-mono:  "Cascadia Mono", "JetBrains Mono", "Consolas", monospace;
  --font-serif:        "Iowan Old Style", "Source Serif Pro", "Noto Serif SC", "Songti SC", Georgia, serif;

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
  --transition-fast:   120ms cubic-bezier(0.2, 0, 0, 1);
  --transition-normal: 200ms cubic-bezier(0.2, 0, 0, 1);
  --transition-smooth: 280ms cubic-bezier(0.2, 0.8, 0.2, 1);

  /* —— 布局尺寸 —— */
  --header-height:     44px;
  --sidebar-width:     236px;
  --sidebar-collapsed: 56px;
  --focus-ring:        0 0 0 3px rgba(194,65,12,0.22);
  --interactive-lift:  translateY(-1px);

  /* —— 工具分类色 (light) —— */
  --tool-color-note:         #f59e0b;
  --tool-color-dev:          #3b82f6;
  --tool-color-git:          #f97316;
  --tool-color-network:      #14b8a6;
  --tool-color-test:         #10b981;
  --tool-color-database:     #6366f1;
  --tool-color-dataAnalysis: #8b5cf6;
  --tool-color-image:        #ec4899;
  --tool-color-system:       #64748b;

  --tool-bg-note:         rgba(245, 158, 11, 0.12);
  --tool-bg-dev:          rgba(59, 130, 246, 0.12);
  --tool-bg-git:          rgba(249, 115, 22, 0.12);
  --tool-bg-network:      rgba(20, 184, 166, 0.12);
  --tool-bg-test:         rgba(16, 185, 129, 0.12);
  --tool-bg-database:     rgba(99, 102, 241, 0.12);
  --tool-bg-dataAnalysis: rgba(139, 92, 246, 0.12);
  --tool-bg-image:        rgba(236, 72, 153, 0.12);
  --tool-bg-system:       rgba(100, 116, 139, 0.14);

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

  --el-transition-duration: 180ms;

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
    --surface-page:      linear-gradient(180deg, #14110d 0%, #1a1612 100%);
    --surface-panel:     rgba(34,30,26,0.9);
    --surface-panel-soft:rgba(42,38,33,0.72);
    --surface-hover:     rgba(60,52,44,0.82);
    --surface-muted:     rgba(54,48,42,0.58);
    --surface-accent:    rgba(251,146,60,0.14);
    --surface-divider:   rgba(255,235,210,0.08);

    --text-primary:      #f5f1ea;
    --text-secondary:    #b8aea0;
    --text-tertiary:     #8a8175;
    --text-quaternary:   #5a534a;

    --accent-blue:       #fb923c;
    --accent-blue-hover: #fdba74;
    --accent-blue-bg:    rgba(251,146,60,0.14);

    --color-red:         #ff453a;
    --color-orange:      #ff9f0a;
    --color-yellow:      #ffd60a;
    --color-green:       #30d158;
    --color-teal:        #64d2ff;
    --color-purple:      #bf5af2;

    --border-color:      rgba(255,235,210,0.10);
    --border-color-strong:rgba(255,235,210,0.16);
    --divider:           rgba(255,235,210,0.07);

    --shadow-sm:         0 0.5px 1px rgba(0,0,0,0.3);
    --shadow-md:         0 2px 8px rgba(0,0,0,0.4);
    --shadow-lg:         0 8px 24px rgba(0,0,0,0.5);
    --shadow-popover:    0 4px 16px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3);

    /* —— 工具分类色 (dark) —— */
    --tool-color-note:         #fbbf24;
    --tool-color-dev:          #60a5fa;
    --tool-color-git:          #fb923c;
    --tool-color-network:      #2dd4bf;
    --tool-color-test:         #34d399;
    --tool-color-database:     #818cf8;
    --tool-color-dataAnalysis: #a78bfa;
    --tool-color-image:        #f472b6;
    --tool-color-system:       #94a3b8;

    --tool-bg-note:         rgba(251, 191, 36, 0.16);
    --tool-bg-dev:          rgba(96, 165, 250, 0.16);
    --tool-bg-git:          rgba(251, 146, 60, 0.16);
    --tool-bg-network:      rgba(45, 212, 191, 0.16);
    --tool-bg-test:         rgba(52, 211, 153, 0.16);
    --tool-bg-database:     rgba(129, 140, 248, 0.16);
    --tool-bg-dataAnalysis: rgba(167, 139, 250, 0.16);
    --tool-bg-image:        rgba(244, 114, 182, 0.16);
    --tool-bg-system:       rgba(148, 163, 184, 0.18);
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
  background: var(--surface-page);
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

/* ===== 启动画面 ===== */
.splash-screen {
  position: fixed;
  inset: 0;
  background: var(--surface-page);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-content {
  text-align: center;
  animation: splash-fade-up 0.55s ease-out;
}

.splash-content-skeleton {
  width: min(360px, calc(100vw - 48px));
}

.splash-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto var(--space-lg);
  border-radius: 22px;
  background: var(--surface-panel);
  box-shadow: 0 14px 34px rgba(194, 65, 12, 0.12);
  animation: splash-pulse 1.8s ease-in-out infinite;
}

.splash-logo svg {
  width: 42px;
  height: 42px;
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
  margin-bottom: var(--space-xl);
}

.splash-card {
  padding: 18px;
  border-radius: 22px;
  background: var(--surface-panel-soft);
  border: 1px solid var(--surface-divider);
  box-shadow: var(--shadow-card);
  text-align: left;
  backdrop-filter: blur(18px);
}

.splash-status-title {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 6px;
}

.splash-status-text {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  min-height: 18px;
  margin-bottom: 16px;
}

.skeleton-stack {
  display: grid;
  gap: 10px;
}

.skeleton-row {
  position: relative;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-muted);
}

.skeleton-row::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.38) 50%,
    rgba(255, 255, 255, 0.08) 80%,
    transparent 100%
  );
  animation: skeleton-flow 1.5s ease-in-out infinite;
}

.skeleton-row.wide { width: 100%; }
.skeleton-row.mid { width: 78%; }
.skeleton-row.short { width: 54%; }

@keyframes splash-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splash-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 14px 34px rgba(194, 65, 12, 0.12);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 18px 40px rgba(99, 102, 241, 0.16);
  }
}

@keyframes skeleton-flow {
  100% {
    transform: translateX(100%);
  }
}

.no-animations .splash-content,
.no-animations .splash-logo,
.no-animations .skeleton-row::after {
  animation-duration: 0s !important;
}

/* ===== 主应用容器 ===== */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-page);
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
  background: var(--surface-page);
}

.app-content.toolbox-unified-shell {
  background:
    radial-gradient(circle at 12% 0%, var(--accent-warm-soft) 0%, transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(254, 215, 170, 0.32) 0%, transparent 30%),
    linear-gradient(135deg, var(--bg-primary) 0%, var(--surface-page) 48%, var(--bg-secondary) 100%) !important;
}

/* 暗色覆盖: 切换页面瞬间也走深色,避免白闪。
   --accent-warm-soft (#fff1e6 浅奶油) 和 rgba(254,215,170,0.32) 浅橙在暗色下显白。
   双选择器命中: 项目 [data-theme=dark] + Element Plus html.dark */
[data-theme="dark"] .app-content.toolbox-unified-shell,
html.dark .app-content.toolbox-unified-shell {
  background:
    radial-gradient(circle at 12% 0%, rgba(251, 146, 60, 0.10) 0%, transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(194, 65, 12, 0.08) 0%, transparent 30%),
    linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%) !important;
}

/* ===== 页面切换动画 ===== */
/* 苹果式平滑切换: 旧页面短淡出, 新页面稍慢淡入 + 轻微上滑.
   原 150ms opacity + mode=out-in 中间会留 50ms 空白看到底层背景 = 闪烁,
   现在让淡入时间略长, 淡出快, 配 cubic-bezier 缓动. */
.fade-enter-active {
  transition: opacity 260ms cubic-bezier(0.2, 0, 0, 1),
              transform 260ms cubic-bezier(0.2, 0, 0, 1);
  will-change: opacity, transform;
}
.fade-leave-active {
  transition: opacity 140ms cubic-bezier(0.4, 0, 1, 1);
  will-change: opacity;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
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

/* ===== Design Refresh Overrides ===== */
:root {
  --bg-secondary: #f5f1e8;
  --bg-tertiary: #ebe7dc;
  --bg-grouped: #f0ede4;
  --surface-page: #fbfaf6;
  --surface-panel-soft: rgba(255,255,255,0.76);
  --surface-hover: rgba(255,255,255,0.96);
  --surface-accent: rgba(194,65,12,0.08);
  --surface-divider: rgba(60,40,20,0.10);
  --text-primary: #1a1a1a;
  --text-secondary: #3f3f46;
  --text-tertiary: #71717a;
  --text-quaternary: #a1a1aa;
  --accent-blue: #c2410c;
  --accent-blue-hover: #9a3412;
  --accent-blue-active: #7c2d12;
  --accent-blue-bg: rgba(194,65,12,0.10);
  --border-color: rgba(60,40,20,0.14);
  --border-color-strong: rgba(60,40,20,0.20);
  --divider: rgba(60,40,20,0.10);
  --shadow-sm: 0 1px 2px rgba(60,40,20,0.05);
  --shadow-md: 0 6px 18px rgba(60,40,20,0.08);
  --shadow-lg: 0 16px 40px rgba(60,40,20,0.12);
  --shadow-popover: 0 14px 38px rgba(60,40,20,0.14), 0 1px 2px rgba(60,40,20,0.08);
  --shadow-card: 0 1px 2px rgba(60,40,20,0.06), 0 8px 24px rgba(60,40,20,0.05);
  --shadow-card-hover: 0 2px 6px rgba(60,40,20,0.08), 0 16px 28px rgba(60,40,20,0.10);
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --font-family: "Segoe UI Variable Display", "PingFang SC", "Microsoft YaHei UI", "Noto Sans SC", sans-serif;
  --font-family-mono: "Cascadia Mono", "JetBrains Mono", "Consolas", monospace;
  --font-serif: "Iowan Old Style", "Source Serif Pro", "Noto Serif SC", "Songti SC", Georgia, serif;
  --transition-fast: 120ms cubic-bezier(0.2, 0, 0, 1);
  --transition-normal: 200ms cubic-bezier(0.2, 0, 0, 1);
  --transition-smooth: 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
  --header-height: 44px;
  --sidebar-width: 236px;
  --focus-ring: 0 0 0 3px rgba(194,65,12,0.22);
  --interactive-lift: translateY(-1px);
  --accent-warm: #c2410c;
  --accent-warm-hover: #9a3412;
  --accent-warm-soft: #fff1e6;
}

[data-theme="dark"] {
  --bg-primary: #1a1714;
  --bg-secondary: #0e0c0a;
  --bg-tertiary: #2a2520;
  --bg-grouped: #1a1714;
  --surface-page: linear-gradient(180deg, #14110d 0%, #1a1612 100%);
  --surface-panel: rgba(36,32,28,0.92);
  --surface-panel-soft: rgba(36,32,28,0.76);
  --surface-hover: rgba(54,46,38,0.92);
  --surface-muted: rgba(80,68,56,0.62);
  --surface-accent: rgba(251,146,60,0.18);
  --surface-divider: rgba(255,235,210,0.18);
  --text-primary: #f5f1ea;
  --text-secondary: #b8aea0;
  --text-tertiary: #8a8175;
  --text-quaternary: #5a534a;
  --accent-blue: #fb923c;
  --accent-blue-hover: #fdba74;
  --accent-blue-bg: rgba(251,146,60,0.18);
  --accent-warm: #fb923c;
  --accent-warm-hover: #fdba74;
  --accent-warm-soft: rgba(251, 146, 60, 0.14);
  --border-color: rgba(255,235,210,0.18);
  --border-color-strong: rgba(255,235,210,0.26);
  --divider: rgba(255,235,210,0.12);

  /* 工具分类色 (dark) */
  --tool-color-note:         #fbbf24;
  --tool-color-dev:          #60a5fa;
  --tool-color-git:          #fb923c;
  --tool-color-network:      #2dd4bf;
  --tool-color-test:         #34d399;
  --tool-color-database:     #818cf8;
  --tool-color-dataAnalysis: #a78bfa;
  --tool-color-image:        #f472b6;
  --tool-color-system:       #94a3b8;
  --tool-bg-note:         rgba(251, 191, 36, 0.16);
  --tool-bg-dev:          rgba(96, 165, 250, 0.16);
  --tool-bg-git:          rgba(251, 146, 60, 0.16);
  --tool-bg-network:      rgba(45, 212, 191, 0.16);
  --tool-bg-test:         rgba(52, 211, 153, 0.16);
  --tool-bg-database:     rgba(129, 140, 248, 0.16);
  --tool-bg-dataAnalysis: rgba(167, 139, 250, 0.16);
  --tool-bg-image:        rgba(244, 114, 182, 0.16);
  --tool-bg-system:       rgba(148, 163, 184, 0.18);
}

body {
  line-height: 1.5;
}

button,
input,
textarea,
select {
  font-family: inherit;
}

.el-button {
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.el-button:focus-visible,
.el-input__wrapper.is-focus,
.el-select__wrapper.is-focused,
.el-input-number.is-focus,
.el-textarea__inner:focus {
  box-shadow: var(--focus-ring) !important;
}

.el-button--primary {
  box-shadow: 0 10px 16px rgba(194, 65, 12, 0.22);
}

.el-button--primary:hover {
  box-shadow: 0 12px 20px rgba(194, 65, 12, 0.30);
}

.el-button--default {
  background: var(--surface-panel-soft);
}

.el-input__wrapper,
.el-select__wrapper,
.el-textarea__inner,
.el-input-number,
.el-date-editor.el-input__wrapper {
  border-radius: var(--radius-sm) !important;
  border: 1px solid var(--border-color);
  box-shadow: none !important;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

.el-input__wrapper:hover,
.el-select__wrapper:hover,
.el-textarea__inner:hover,
.el-input-number:hover {
  border-color: var(--border-color-strong);
}

.el-card,
.content-card {
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--border-color) !important;
  background: var(--surface-panel);
  box-shadow: var(--shadow-card);
}

.el-card:hover,
.content-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.el-dialog {
  border-radius: var(--radius-xl) !important;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-popover);
}

.el-dialog__header {
  border-bottom: 1px solid var(--divider);
  padding-bottom: var(--space-md);
}

.el-dialog__footer {
  border-top: 1px solid var(--divider);
  padding-top: var(--space-md);
}

.el-table {
  --el-table-border-color: var(--divider);
  --el-table-header-bg-color: color-mix(in srgb, var(--bg-secondary) 82%, white 18%);
  --el-table-row-hover-bg-color: color-mix(in srgb, var(--accent-blue-bg) 55%, transparent 45%);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.el-popover,
.el-dropdown__popper,
.el-select__popper,
.el-picker__popper {
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: var(--shadow-popover) !important;
  backdrop-filter: blur(16px);
}

/* 弹窗内表单项统一撑满父容器,避免 select/input/textarea 宽度不一致。
   用 `>` 限定直接子元素,这样 Bookmarks 那种 <div><el-input/><el-button/></div> 的 flex 组合不受影响。 */
.el-dialog__body .el-form-item__content > .el-select,
.el-dialog__body .el-form-item__content > .el-input,
.el-dialog__body .el-form-item__content > .el-textarea,
.el-dialog__body .el-form-item__content > .el-input-number,
.el-dialog__body .el-form-item__content > .el-cascader,
.el-dialog__body .el-form-item__content > .el-date-editor {
  width: 100%;
}
</style>
