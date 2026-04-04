/**
 * AI Provider 预设与配置解析
 * 所有消费 AI 配置的模块共用此文件
 */

export const PROVIDER_PRESETS = {
  openai:   { name: 'OpenAI',    baseUrl: 'https://api.openai.com/v1',                          models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  deepseek: { name: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/v1',                        models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  claude:   { name: 'Claude',    baseUrl: 'https://api.anthropic.com/v1',                        models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'] },
  qwen:     { name: '通义千问',   baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
  zhipu:    { name: '智谱AI',    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',               models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'] },
  moonshot: { name: 'Moonshot',  baseUrl: 'https://api.moonshot.cn/v1',                          models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  custom:   { name: 'Custom',    baseUrl: '',                                                    models: [] },
}

/**
 * 从 aiSettings（可能是新格式或旧格式）中解析出当前激活的 provider 配置
 * @returns {{ apiKey: string, baseUrl: string, model: string, provider?: string }}
 */
export function resolveActiveProvider(aiSettings) {
  if (!aiSettings) return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' }

  // 新格式: { providers: [...], activeProviderId: 'xxx' }
  if (Array.isArray(aiSettings.providers)) {
    const active = aiSettings.providers.find(p => p.id === aiSettings.activeProviderId) || aiSettings.providers[0]
    if (active) {
      return {
        apiKey: active.apiKey || '',
        baseUrl: active.baseUrl || 'https://api.openai.com/v1',
        model: active.model || 'gpt-3.5-turbo',
        provider: active.provider || 'custom',
      }
    }
    return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' }
  }

  // 旧格式: { apiKey, baseUrl, model }
  return {
    apiKey: aiSettings.apiKey || '',
    baseUrl: aiSettings.baseUrl || aiSettings.baseURL || 'https://api.openai.com/v1',
    model: aiSettings.model || 'gpt-3.5-turbo',
    provider: 'custom',
  }
}

/**
 * 将旧格式 aiSettings 迁移为新格式
 */
export function migrateOldAiSettings(aiSettings) {
  if (!aiSettings) return { providers: [], activeProviderId: '' }
  if (Array.isArray(aiSettings.providers)) return aiSettings

  // Detect provider from baseUrl
  let provider = 'custom'
  const url = (aiSettings.baseUrl || aiSettings.baseURL || '').toLowerCase()
  if (url.includes('openai.com')) provider = 'openai'
  else if (url.includes('deepseek.com')) provider = 'deepseek'
  else if (url.includes('anthropic.com')) provider = 'claude'
  else if (url.includes('dashscope.aliyuncs.com')) provider = 'qwen'
  else if (url.includes('bigmodel.cn')) provider = 'zhipu'
  else if (url.includes('moonshot.cn')) provider = 'moonshot'

  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom
  const id = `${provider}-${Date.now()}`

  return {
    providers: [{
      id,
      name: preset.name || 'Default',
      provider,
      baseUrl: aiSettings.baseUrl || aiSettings.baseURL || 'https://api.openai.com/v1',
      apiKey: aiSettings.apiKey || '',
      model: aiSettings.model || 'gpt-3.5-turbo',
    }],
    activeProviderId: id,
  }
}

export function generateProviderId(provider = 'custom') {
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
