/**
 * AI Provider / Model 配置（aiSettings）
 *
 * Module-level singleton。
 * - aiSettings.providers[] 每条 { id, name, provider, baseUrl, apiKey, model }
 * - 支持新增 / 删除 / 切换激活 / 重置默认 / 在线拉取模型列表 / 测试连接
 *
 * 持久化：
 * - addProvider / setActiveProvider / removeProvider 等改 aiSettings 的方法 lazy 拿
 *   useSettingsCore.persistSettings 触发立即保存。
 * - useSettingsCore 内对 aiSettings 还有 watch + schedulePersistAiSettings 防抖。
 */

import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  PROVIDER_PRESETS,
  generateProviderId,
} from '@/utils/aiProviders'
import { t } from '@/i18n'
import { useSettingsCore } from './useSettingsCore'

const aiSettings = reactive({
  providers: [],
  activeProviderId: '',
})

/** 持久化快照（用于 dirty / 回滚） */
const savedAiSettings = ref(null)

// UI 状态
const testingAI = ref(false)
const testingProvId = ref('')
const loadingModelsProvId = ref('')
const editingProviderId = ref('')
const aiTestResult = ref(null)

// 动态拉到的模型列表（按 providerId 索引）
const providerModelsMap = reactive({})
const providerModelErrors = reactive({})

/** 创建新的 provider 条目（基于预设） */
function createProviderFromPreset(providerKey = 'custom') {
  const preset = PROVIDER_PRESETS[providerKey] || PROVIDER_PRESETS.custom
  return {
    id: generateProviderId(providerKey),
    name: preset.name || 'Custom',
    provider: providerKey,
    baseUrl: preset.baseUrl || '',
    apiKey: '',
    model: preset.models?.[0] || '',
  }
}

/** 取一个 provider 当前可用的模型列表（远端优先 → 预设兜底） */
function getProviderModelOptions(prov) {
  const remoteModels = providerModelsMap[prov.id] || []
  if (remoteModels.length) return remoteModels
  return PROVIDER_PRESETS[prov.provider]?.models || []
}

/** 从 baseUrl/models 接口拉模型列表 */
async function fetchProviderModels(prov, { silent = true } = {}) {
  if (!prov?.id) return
  const baseUrl = (prov.baseUrl || '').trim().replace(/\/$/, '')
  if (!baseUrl) {
    providerModelsMap[prov.id] = []
    providerModelErrors[prov.id] = ''
    return
  }

  loadingModelsProvId.value = prov.id
  providerModelErrors[prov.id] = ''
  try {
    const headers = {}
    if (prov.apiKey) {
      const isClaude = prov.provider === 'claude' || /anthropic\.com/i.test(baseUrl)
      if (isClaude) {
        headers['x-api-key'] = prov.apiKey
        headers['anthropic-version'] = '2023-06-01'
      } else {
        headers.Authorization = `Bearer ${prov.apiKey}`
      }
    }
    const response = await fetch(`${baseUrl}/models`, { method: 'GET', headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    const rawModels = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data)
          ? data
          : []
    const models = rawModels
      .map((item) => typeof item === 'string' ? item : (item?.id || item?.name || item?.model || ''))
      .filter(Boolean)

    providerModelsMap[prov.id] = [...new Set(models)]
    if (!providerModelsMap[prov.id].length) {
      providerModelErrors[prov.id] = t('settings.modelListEmpty')
      if (!silent) ElMessage.warning(t('settings.modelListEmpty'))
    }
  } catch (error) {
    providerModelsMap[prov.id] = []
    providerModelErrors[prov.id] = t('settings.modelListFallback')
    if (!silent) ElMessage.warning(error?.message || t('settings.modelListFallback'))
  } finally {
    if (loadingModelsProvId.value === prov.id) loadingModelsProvId.value = ''
  }
}

/** 初始化所有 provider 的 modelsMap / errors（兜底用预设） */
function initProviderModelState() {
  aiSettings.providers.forEach((prov) => {
    if (!providerModelsMap[prov.id]) {
      providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
    }
    if (!(prov.id in providerModelErrors)) {
      providerModelErrors[prov.id] = ''
    }
  })
}

/** 删除已不存在的 provider 的 modelsMap / errors 残留 */
function trimProviderModelState() {
  const ids = new Set(aiSettings.providers.map((item) => item.id))
  Object.keys(providerModelsMap).forEach((id) => {
    if (!ids.has(id)) delete providerModelsMap[id]
  })
  Object.keys(providerModelErrors).forEach((id) => {
    if (!ids.has(id)) delete providerModelErrors[id]
  })
}

/** providers 数组结构变化时同步 modelState（由 useSettingsCore.setupWatches 调起） */
function setupAiConfigWatch() {
  watch(
    () => aiSettings.providers
      .map((item) => `${item.id}|${item.provider}|${item.baseUrl}|${item.apiKey}`)
      .join('||'),
    () => {
      initProviderModelState()
      trimProviderModelState()
    },
    { immediate: true },
  )
}

/** 新增 provider */
async function addProvider(providerKey) {
  const { persistSettings, manualHasChanges, hasChanges } = useSettingsCore()
  const provider = createProviderFromPreset(providerKey)
  aiSettings.providers.push(provider)
  providerModelsMap[provider.id] = PROVIDER_PRESETS[provider.provider]?.models || []
  providerModelErrors[provider.id] = ''
  if (!aiSettings.activeProviderId) {
    aiSettings.activeProviderId = provider.id
  }
  editingProviderId.value = provider.id
  aiTestResult.value = null
  testingProvId.value = ''
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

function handleProviderEdit(prov) {
  editingProviderId.value = prov.id
  if (!providerModelsMap[prov.id]) {
    providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
  }
}

async function refreshProviderModels(prov) {
  await fetchProviderModels(prov, { silent: false })
}

/** 切换当前激活的 provider */
async function setActiveProvider(providerId) {
  const { persistSettings, manualHasChanges, hasChanges } = useSettingsCore()
  aiSettings.activeProviderId = providerId
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

/** 删除一条 provider（保底至少留一条；若删除的是当前激活则切到第一条） */
async function removeProvider(index) {
  const { persistSettings, manualHasChanges, hasChanges } = useSettingsCore()
  const removed = aiSettings.providers[index]
  if (!removed) return
  if (aiSettings.providers.length <= 1) {
    ElMessage.warning(t('settings.atLeastOneProvider'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('settings.confirmDeleteProvider'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )
  } catch {
    return
  }

  aiSettings.providers.splice(index, 1)
  if (!aiSettings.providers.length) {
    const fallback = createProviderFromPreset('openai')
    aiSettings.providers.push(fallback)
  }
  if (!aiSettings.providers.some((item) => item.id === aiSettings.activeProviderId)) {
    aiSettings.activeProviderId = aiSettings.providers[0]?.id || ''
  }
  if (editingProviderId.value === removed.id) {
    editingProviderId.value = aiSettings.providers[0]?.id || ''
  }
  if (loadingModelsProvId.value === removed.id) loadingModelsProvId.value = ''
  if (testingProvId.value === removed.id) {
    testingProvId.value = ''
    aiTestResult.value = null
  }
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

/** 把 provider 的 baseUrl / model / name 重置回预设值（仅改 reactive，不持久化） */
function resetProviderDefaults(prov) {
  const { manualHasChanges, hasChanges } = useSettingsCore()
  const preset = PROVIDER_PRESETS[prov.provider] || PROVIDER_PRESETS.custom
  prov.baseUrl = preset.baseUrl || ''
  prov.model = preset.models?.[0] || ''
  if (!prov.name || Object.values(PROVIDER_PRESETS).some((item) => item.name === prov.name)) {
    prov.name = preset.name || prov.name
  }
  manualHasChanges.value = true
  hasChanges.value = true
}

async function onProviderTypeChange(prov) {
  resetProviderDefaults(prov)
  providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
  providerModelErrors[prov.id] = ''
  await fetchProviderModels(prov)
}

/** 测试 AI 连接（chat/completions 或 messages 单回合调用） */
async function testProviderConnection(provider) {
  if (!provider?.apiKey || !provider?.baseUrl || !provider?.model) {
    aiTestResult.value = { success: false, message: t('settings.fillApiFields') }
    testingProvId.value = provider?.id || ''
    return
  }

  testingAI.value = true
  testingProvId.value = provider.id
  aiTestResult.value = null

  try {
    let baseUrl = provider.baseUrl.trim()
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const isClaude = provider.provider === 'claude' || /anthropic\.com/i.test(baseUrl)
    const response = await fetch(
      isClaude ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: isClaude
          ? {
              'Content-Type': 'application/json',
              'x-api-key': provider.apiKey,
              'anthropic-version': '2023-06-01',
            }
          : {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${provider.apiKey}`,
            },
        body: JSON.stringify(
          isClaude
            ? {
                model: provider.model,
                max_tokens: 16,
                messages: [{ role: 'user', content: 'Hello' }],
              }
            : {
                model: provider.model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10,
              },
        ),
      },
    )

    if (response.ok) {
      const text = await response.text()
      const data = JSON.parse(text)
      const ok = isClaude
        ? Array.isArray(data?.content) && data.content.some((item) => item?.text)
        : data?.choices && Array.isArray(data.choices) && data.choices.length > 0
      if (ok) {
        aiTestResult.value = {
          success: true,
          message: t('settings.aiConnectSuccess', { model: provider.model }),
        }
      } else {
        throw new Error(t('settings.aiConnectFormatError', { content: text.substring(0, 200) }))
      }
    } else {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    aiTestResult.value = {
      success: false,
      message: error.message || t('settings.aiConnectFail'),
    }
  } finally {
    testingAI.value = false
  }
}

export {
  aiSettings,
  savedAiSettings,
  initProviderModelState,
  createProviderFromPreset,
  setupAiConfigWatch,
}

export function useAiConfig() {
  return {
    aiSettings,
    savedAiSettings,
    testingAI,
    testingProvId,
    loadingModelsProvId,
    editingProviderId,
    aiTestResult,
    providerModelsMap,
    providerModelErrors,
    createProviderFromPreset,
    getProviderModelOptions,
    fetchProviderModels,
    initProviderModelState,
    trimProviderModelState,
    addProvider,
    handleProviderEdit,
    refreshProviderModels,
    setActiveProvider,
    removeProvider,
    resetProviderDefaults,
    onProviderTypeChange,
    testProviderConnection,
    setupAiConfigWatch,
  }
}
