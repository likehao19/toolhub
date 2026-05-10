/**
 * Settings 页核心：通用 settings + 全局保存状态 + 持久化协调
 *
 * Module-level singleton。承担：
 * - settings reactive：closeAction / autoStart / language / theme / fontSize / fontFamily
 *   / enableAnimations / notesStoragePath / 4 个 Markdown 主题字段
 * - 全局保存状态：saving / autoSaving / initializing / autostartLoading
 *   / manualHasChanges / hasChanges / lastSaved / originalSettings
 * - persistSettings：唯一的统一持久化入口（统筹各分模块 reactive + dispatchEvent）
 * - handle*Change：v-model 改完即时持久化的薄包装
 * - loadSettings / handleSave / handleReset：组件生命周期与显式动作
 * - setupCoreWatches({ route, router })：由主壳 Settings.vue 在 onMounted 内挂 watcher
 *
 * 状态共享：通过模块顶层 reactive 单例保证多次 useSettingsCore() 拿到同一份；
 * 跨模块循环依赖通过 lazy useSettingsCore() 在需要 persistSettings 的子模块（如
 * useAiConfig / useNotesMigration）的方法内解开。
 */

import { reactive, ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appDataDir, join } from '@tauri-apps/api/path'

import { saveConfig, loadConfig, resetConfig } from '@/utils/tauri/store'
import {
  applyAppearance,
  applyThemeMode,
  applyFontFamily,
  applyFontSize,
  applyAnimations,
} from '@/utils/appearance'
import { migrateOldAiSettings, resolveActiveProvider } from '@/utils/aiProviders'
import { saveReminderConfig } from '@/utils/reminderService'
import { setEnvScope } from '@/utils/sdkManager'
import TauriAutostart from '@/utils/tauri/autostart'
import { setLocale, t } from '@/i18n'
import { useAppStore } from '@/store/app'

import { useReminderSettings } from './useReminderSettings'
import { usePasswordSettings } from './usePasswordSettings'
import { useStorageStats } from './useStorageStats'
import { useSystemPrivilege } from './useSystemPrivilege'
import { useAiConfig } from './useAiConfig'
import { useAiAssistant } from './useAiAssistant'

// ---- 拿其他模块的 singleton 引用（工厂只返回引用，无副作用） ----
const {
  reminderConfig,
  savedReminderConfig,
  loadReminderSettings,
} = useReminderSettings()
const {
  passwordSettings,
  savedPasswordSettings,
  savePasswordSettings,
  loadPasswordSettings,
  loadPasswordStats,
} = usePasswordSettings()
const { loadStorageStats } = useStorageStats()
const { systemPrivilege, loadSystemPrivilegeStatus } = useSystemPrivilege()
const {
  aiSettings,
  savedAiSettings,
  editingProviderId,
  initProviderModelState,
  createProviderFromPreset,
  setupAiConfigWatch,
} = useAiConfig()
const {
  aiAssistantSettings,
  savedAiAssistantSettings,
  handleFloatingBallChange: emitFloatingBallChange,
} = useAiAssistant()

// ---- 自有 settings reactive ----
const settings = reactive({
  closeAction: 'ask',
  autoStart: false,
  language: 'zh-CN',
  theme: 'auto',
  fontSize: 14,
  fontFamily: 'system',
  enableAnimations: true,
  notesStoragePath: '',
  // Markdown 主题
  previewTheme: 'default',
  previewCodeTheme: 'github',
  editorPreviewTheme: 'default',
  editorCodeTheme: 'github',
})

const originalSettings = ref(null)

// ---- 全局保存状态 ----
const saving = ref(false)
const autoSaving = ref(false)
const initializing = ref(true)
const autostartLoading = ref(false)
const manualHasChanges = ref(false)
const hasChanges = ref(false)
const lastSaved = ref('')

// ---- 防抖：AI 设置批量改动时延后 300ms 再 persist ----
let persistAiSettingsTimer = null
function schedulePersistAiSettings() {
  if (persistAiSettingsTimer) clearTimeout(persistAiSettingsTimer)
  persistAiSettingsTimer = setTimeout(async () => {
    persistAiSettingsTimer = null
    await persistSettings()
  }, 300)
}

const formatSavedTime = () => new Date().toLocaleTimeString('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
})

// ---- saveStatus 文本 / 样式 ----
const saveStatusText = computed(() => {
  if (saving.value || autoSaving.value) return t('settings.statusSaving')
  if (manualHasChanges.value) return t('settings.statusUnsaved')
  if (lastSaved.value) return `${t('settings.statusSaved')} · ${lastSaved.value}`
  return t('settings.statusIdle')
})

const saveStatusClass = computed(() => {
  if (saving.value || autoSaving.value) return 'saving'
  if (manualHasChanges.value) return 'unsaved'
  if (lastSaved.value) return 'saved'
  return 'idle'
})

// ---- snapshots（dirty 比较与回滚） ----
function syncSavedSnapshots() {
  originalSettings.value = JSON.parse(JSON.stringify(settings))
  savedAiSettings.value = JSON.parse(JSON.stringify(aiSettings))
  savedAiAssistantSettings.value = JSON.parse(JSON.stringify(aiAssistantSettings))
  savedReminderConfig.value = JSON.parse(JSON.stringify(reminderConfig))
  savedPasswordSettings.value = JSON.parse(JSON.stringify(passwordSettings))
  hasChanges.value = false
  manualHasChanges.value = false
}

function restoreSavedSnapshots() {
  if (originalSettings.value) Object.assign(settings, JSON.parse(JSON.stringify(originalSettings.value)))
  if (savedAiSettings.value) Object.assign(aiSettings, JSON.parse(JSON.stringify(savedAiSettings.value)))
  if (savedAiAssistantSettings.value) Object.assign(aiAssistantSettings, JSON.parse(JSON.stringify(savedAiAssistantSettings.value)))
  if (savedReminderConfig.value) Object.assign(reminderConfig, JSON.parse(JSON.stringify(savedReminderConfig.value)))
  if (savedPasswordSettings.value) Object.assign(passwordSettings, JSON.parse(JSON.stringify(savedPasswordSettings.value)))
}

// ---- 唯一的统一持久化入口 ----
async function persistSettings({ silent = true } = {}) {
  // saving.value 由外层 handleSave 在调用前置 true 用于 UI spinner;不能并入守卫,
  // 否则 handleSave -> persistSettings 会被自身挡掉,导致点击保存按钮看似生效但实际未写盘。
  if (initializing.value || autoSaving.value) return false

  autoSaving.value = true
  try {
    // 主持久化：写 Tauri Store / config.json。失败 → 整个 persist 失败 + 回滚
    const config = {
      ...settings,
      aiSettings: { ...aiSettings },
      aiAssistantSettings: { ...aiAssistantSettings },
    }
    await saveConfig(config)

    // 以下都是副作用：单条失败不应连累整体（避免 sqlite/localStorage/pinia 任一抖动报"保存失败"）
    try {
      window.dispatchEvent(new CustomEvent('settings-config-saved', {
        detail: { aiSettings: { ...aiSettings } },
      }))
      window.dispatchEvent(new CustomEvent('ai-config-changed', {
        detail: { aiSettings: { ...aiSettings } },
      }))
    } catch (e) { console.warn('[Settings] dispatch settings-config-saved failed:', e) }

    try {
      localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))
      const activeProvider = resolveActiveProvider(aiSettings)
      localStorage.setItem('ai_config', JSON.stringify({
        apiKey: activeProvider?.apiKey || '',
        baseURL: activeProvider?.baseUrl || '',
        baseUrl: activeProvider?.baseUrl || '',
        model: activeProvider?.model || '',
        provider: activeProvider?.provider || 'custom',
      }))
      window.dispatchEvent(new CustomEvent('ai-floating-ball-settings-changed', {
        detail: aiAssistantSettings,
      }))
    } catch (e) { console.warn('[Settings] write ai_config / aiAssistant to localStorage failed:', e) }

    try {
      if (settings.closeAction) {
        const appStore = useAppStore()
        appStore.setCloseAction(settings.closeAction)
      }
    } catch (e) { console.warn('[Settings] sync closeAction to appStore failed:', e) }

    // 密码：sqlite 可能在某些场景未初始化（比如用户从未启动 password 页面，DB 还没建表），
    // 此处失败不应阻塞主 settings 保存
    try { await savePasswordSettings() }
    catch (e) { console.warn('[Settings] savePasswordSettings failed (non-fatal):', e) }

    try { await saveReminderConfig(reminderConfig) }
    catch (e) { console.warn('[Settings] saveReminderConfig failed (non-fatal):', e) }

    syncSavedSnapshots()
    lastSaved.value = formatSavedTime()

    if (!silent) ElMessage.success(t('settings.saveSuccess'))
    return true
  } catch (error) {
    // 只有核心 saveConfig 失败才走到这里
    restoreSavedSnapshots()
    applyAppearance(settings)
    setLocale(settings.language)
    ElMessage.error(`${t('settings.saveFailed')}: ${error?.message || error || 'unknown error'}`)
    return false
  } finally {
    autoSaving.value = false
  }
}

/** 改 reactive + 立即 persist，失败回滚 effect */
async function autoSaveWithSideEffect(effect, rollback) {
  if (typeof effect === 'function') effect()
  const ok = await persistSettings()
  if (!ok && typeof rollback === 'function') rollback()
}

// ---- handle*Change：UI 控件 @change 触发的薄包装 ----
const handleLanguageChange = (lang) => setLocale(lang)

async function handleThemeChange(theme) {
  await autoSaveWithSideEffect(() => applyThemeMode(theme))
}
async function handleFontFamilyChange(family) {
  await autoSaveWithSideEffect(() => applyFontFamily(family))
}
async function handleFontSizeChange(size) {
  await autoSaveWithSideEffect(() => applyFontSize(size))
}
async function handleAnimationsChange(enabled) {
  await autoSaveWithSideEffect(() => applyAnimations(enabled))
}
async function handleFloatingBallSettingChange() {
  // 先发 ai-floating-ball-toggle 事件让悬浮球即时更新外观/状态
  emitFloatingBallChange()
  await persistSettings()
}
async function handlePasswordSettingChange() { await persistSettings() }
async function handleReminderSettingChange() { await persistSettings() }
async function handleCloseActionChange() { await persistSettings() }
async function handleMarkdownThemeChange() { await persistSettings() }

async function handleEnvScopeSettingChange(value) {
  setEnvScope(value)
  systemPrivilege.envScope = value
  await persistSettings()
}

async function handleLanguageSettingChange(lang) {
  handleLanguageChange(lang)
  await persistSettings()
}

async function handleAutoStartToggle(enabled) {
  autostartLoading.value = true
  try {
    // 乐观模式:只信任 enable/disable 是否抛错。
    // 不再用 isEnabled() 二次校验 —— 它在 Tauri 2 dev 模式下经常因 .exe 路径不匹配而误报"未启用",
    // 触发"设置开机自启失败"红条,即便注册表实际已写入。
    try {
      await TauriAutostart.toggleAutostart(enabled)
      settings.autoStart = enabled
      await persistSettings()
      ElMessage.success(enabled ? t('settings.autoStartEnabled') : t('settings.autoStartDisabled'))
      // 调用方期望事后能查证 plugin 实际写入了什么:把 isEnabled() 结果打到 console
      // 仅作 debug 输出,不参与 UI 决策(它在 dev 模式经常不可靠)。
      TauriAutostart.checkAutostart().then((real) => {
        console.info(`[Autostart] post-toggle isEnabled() = ${real} (intent=${enabled})`)
      }).catch(() => { /* ignore probe failure */ })
    } catch (e) {
      const errStr = String(e?.message || e || '')
      // Windows: plugin 在 disable 一个本就不存在的注册表项时会抛 "os error 2 / 找不到"。
      // 这种情况 OFF 已经是目标状态,视为成功;不要弹红条吓用户。ON 失败仍如实报错。
      const isNotFound = /os error 2|cannot find|找不到/i.test(errStr)
      if (!enabled && isNotFound) {
        console.warn('[Settings] toggleAutostart(false) reported NotFound; treating as already-disabled:', errStr)
        settings.autoStart = false
        await persistSettings()
        ElMessage.success(t('settings.autoStartDisabled'))
        return
      }
      console.error('[Settings] toggleAutostart failed:', e)
      settings.autoStart = !enabled
      ElMessage.error(errStr || t('settings.autoStartFailed'))
    }
  } finally {
    autostartLoading.value = false
  }
}

// ---- 初始加载 ----
async function loadSettings() {
  try {
    const config = await loadConfig()
    if (config) {
      Object.assign(settings, config)
      if (config.aiSettings) {
        const migratedAiSettings = migrateOldAiSettings(config.aiSettings)
        Object.assign(aiSettings, migratedAiSettings)
        if (!aiSettings.providers.length) {
          const fallback = createProviderFromPreset('openai')
          aiSettings.providers = [fallback]
          aiSettings.activeProviderId = fallback.id
        }
        editingProviderId.value = aiSettings.activeProviderId || aiSettings.providers[0]?.id || ''
      }
      if (config.aiAssistantSettings) {
        Object.assign(aiAssistantSettings, config.aiAssistantSettings)
      }

      applyAppearance(config)

      if (config.closeAction) {
        const appStore = useAppStore()
        appStore.setCloseAction(config.closeAction)
      }
    }

    try {
      const autostartEnabled = await TauriAutostart.checkAutostart()
      settings.autoStart = autostartEnabled
    } catch { /* ignore */ }

    if (!settings.notesStoragePath) {
      const dataDir = await appDataDir()
      settings.notesStoragePath = await join(dataDir, 'notes')
    }

    if (!aiSettings.providers.length) {
      const fallback = createProviderFromPreset('openai')
      aiSettings.providers = [fallback]
      aiSettings.activeProviderId = fallback.id
    }
    if (!editingProviderId.value) {
      editingProviderId.value = aiSettings.activeProviderId || aiSettings.providers[0]?.id || ''
    }
    initProviderModelState()

    await loadStorageStats()
    syncSavedSnapshots()
  } catch { /* ignore */ }
}

// ---- 用户显式操作 ----
async function handleSave() {
  saving.value = true
  try {
    await persistSettings({ silent: false })
    manualHasChanges.value = false
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      t('settings.confirmResetMsg'),
      t('settings.confirmResetTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )

    if (persistAiSettingsTimer) {
      clearTimeout(persistAiSettingsTimer)
      persistAiSettingsTimer = null
    }

    initializing.value = true
    await resetConfig()
    localStorage.removeItem('ai_config')
    localStorage.removeItem('aiAssistantSettings')
    localStorage.removeItem('reminder_config')
    window.dispatchEvent(new CustomEvent('settings-reset'))
    await loadSettings()
  } catch { /* 用户取消 */ } finally {
    syncSavedSnapshots()
    initializing.value = false
  }
}

// ---- 由主壳 Settings.vue 在 onMounted 内调用，集中挂 watcher ----
function setupCoreWatches({ activeTab, normalizeTab, route, router } = {}) {
  // 任意可能影响 saved 状态的字段 → 标 dirty
  watch(
    () => [
      settings.closeAction,
      settings.theme,
      settings.fontFamily,
      settings.enableAnimations,
      settings.language,
      reminderConfig.positionType,
      reminderConfig.position,
      aiAssistantSettings.enableFloatingBall,
      aiAssistantSettings.floatingBallMode,
      aiAssistantSettings.floatingBallStyle,
      passwordSettings.requirePasswordOnStart,
      passwordSettings.autoLockTime,
      systemPrivilege.envScope,
    ],
    () => {
      if (initializing.value) return
      if (!autoSaving.value) hasChanges.value = true
    },
    { deep: true },
  )

  // AI 配置变动：dirty + manualDirty + 防抖 persist
  // settings.fontSize 已由 handleFontSizeChange 即时持久化,不要再放进这里防抖,否则一次改字号会触发两次 saveConfig。
  watch(
    () => [
      JSON.stringify(aiSettings.providers),
      aiSettings.activeProviderId,
    ],
    async (_, oldValue) => {
      if (initializing.value) return
      hasChanges.value = true
      manualHasChanges.value = true
      if (oldValue) schedulePersistAiSettings()
    },
    { deep: true },
  )

  // 笔记目录改动：dirty
  watch(
    () => [settings.notesStoragePath],
    () => {
      if (initializing.value) return
      hasChanges.value = true
      manualHasChanges.value = true
    },
  )

  // 悬浮球大小：dirty
  watch(
    () => aiAssistantSettings.floatingBallSize,
    () => {
      if (initializing.value) return
      hasChanges.value = true
      manualHasChanges.value = true
    },
  )

  // route.query.tab ↔ activeTab 双向同步（路由可分享、刷新保留 tab）
  if (route && router && activeTab && normalizeTab) {
    watch(
      () => route.query.tab,
      (tab) => {
        const normalizedTab = normalizeTab(tab)
        if (activeTab.value !== normalizedTab) {
          activeTab.value = normalizedTab
          return
        }
        if (tab !== normalizedTab && !(normalizedTab === 'general' && (tab == null || tab === ''))) {
          const nextQuery = { ...route.query }
          if (normalizedTab === 'general') delete nextQuery.tab
          else nextQuery.tab = normalizedTab
          router.replace({ query: nextQuery })
        }
      },
      { immediate: true },
    )

    watch(activeTab, (tab) => {
      const normalizedTab = normalizeTab(tab)
      if (tab !== normalizedTab) {
        activeTab.value = normalizedTab
        return
      }
      const nextQuery = { ...route.query }
      if (normalizedTab === 'general') delete nextQuery.tab
      else nextQuery.tab = normalizedTab
      router.replace({ query: nextQuery })
    })
  }

  // useAiConfig 内部 providers 结构变动 → 同步 modelsMap / errors
  setupAiConfigWatch()
}

// ---- 默认 onMounted 加载链：可由主壳直接调 ----
async function bootstrap() {
  initializing.value = true
  try {
    await loadSettings()
    await loadPasswordSettings()
    await loadPasswordStats()
    await loadReminderSettings()
    await loadSystemPrivilegeStatus()
  } finally {
    syncSavedSnapshots()
    initializing.value = false
  }
}

// 顶层 named exports（其他 composable 用 lazy useSettingsCore() 拿；不用顶层 import 避免循环）
export {
  settings,
  saving,
  autoSaving,
  initializing,
  manualHasChanges,
  hasChanges,
  lastSaved,
  persistSettings,
}

export function useSettingsCore() {
  return {
    settings,
    saving,
    autoSaving,
    initializing,
    autostartLoading,
    manualHasChanges,
    hasChanges,
    lastSaved,
    saveStatusText,
    saveStatusClass,
    persistSettings,
    autoSaveWithSideEffect,
    syncSavedSnapshots,
    restoreSavedSnapshots,
    schedulePersistAiSettings,
    handleLanguageChange,
    handleThemeChange,
    handleFontFamilyChange,
    handleFontSizeChange,
    handleAnimationsChange,
    handleFloatingBallSettingChange,
    handlePasswordSettingChange,
    handleReminderSettingChange,
    handleCloseActionChange,
    handleMarkdownThemeChange,
    handleEnvScopeSettingChange,
    handleLanguageSettingChange,
    handleAutoStartToggle,
    loadSettings,
    handleSave,
    handleReset,
    setupCoreWatches,
    bootstrap,
  }
}
