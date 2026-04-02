/**
 * AI API 调用模块
 * 封装与AI模型的通信
 */

import OpenAI from 'openai'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { loadConfig } from '@/utils/tauri/store'

let openaiClient = null
let cachedConfigKey = ''

async function getAIConfig() {
  const config = await loadConfig()
  const aiSettings = config?.aiSettings || {}
  return {
    apiKey: aiSettings.apiKey || '',
    baseURL: aiSettings.baseUrl || 'https://api.openai.com/v1',
    model: aiSettings.model || 'gpt-3.5-turbo'
  }
}

function invalidateClient() {
  openaiClient = null
  cachedConfigKey = ''
}

/**
 * 初始化OpenAI客户端
 */
const initClient = async () => {
  const aiConfig = await getAIConfig()
  const configKey = JSON.stringify(aiConfig)

  if (!aiConfig.apiKey) {
    throw new Error('请先在设置中配置AI API')
  }

  if (openaiClient && cachedConfigKey === configKey) {
    return { client: openaiClient, aiConfig }
  }

  openaiClient = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseURL,
    dangerouslyAllowBrowser: true,
    fetch: tauriFetch
  })
  cachedConfigKey = configKey

  return { client: openaiClient, aiConfig }
}

window.addEventListener('settings-config-saved', invalidateClient)
window.addEventListener('settings-reset', invalidateClient)
window.addEventListener('ai-config-changed', invalidateClient)

/**
 * 调用AI API
 * @param {Array} messages - 对话消息数组
 * @param {Object} options - 额外选项
 * @returns {Promise<string>} AI响应内容
 */
export const callAI = async (messages, options = {}) => {
  try {
    const { client, aiConfig } = await initClient()

    const response = await client.chat.completions.create({
      model: aiConfig.model || 'gpt-3.5-turbo',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      ...options
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    if (error.message?.includes('API')) {
      throw new Error('AI服务暂时不可用，请检查网络或API配置')
    }

    throw error
  }
}

/**
 * 流式调用AI API（用于打字机效果）
 * @param {Array} messages - 对话消息数组
 * @param {Function} onChunk - 接收到数据块的回调
 * @param {Object} options - 额外选项
 */
export const callAIStream = async (messages, onChunk, options = {}) => {
  try {
    const { client, aiConfig } = await initClient()

    const stream = await client.chat.completions.create({
      model: aiConfig.model || 'gpt-3.5-turbo',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: true,
      ...options
    })

    let fullContent = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        fullContent += content
        onChunk(content, fullContent)
      }
    }

    return fullContent
  } catch (error) {
    throw error
  }
}

/**
 * 重置客户端（当配置变更时）
 */
export const resetClient = () => {
  invalidateClient()
}

/**
 * 检查AI配置是否完整
 */
export const checkAIConfig = async () => {
  const aiConfig = await getAIConfig()
  return !!(aiConfig.apiKey && aiConfig.baseURL)
}
