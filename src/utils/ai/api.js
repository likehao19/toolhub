/**
 * AI API 调用模块
 * 封装与AI模型的通信
 */

import OpenAI from 'openai'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { loadConfig } from '@/utils/tauri/store'
import { resolveActiveProvider } from '@/utils/aiProviders'

const CLAUDE_API_VERSION = '2023-06-01'

let openaiClient = null
let cachedConfigKey = ''

async function getAIConfig() {
  const config = await loadConfig()
  const resolved = resolveActiveProvider(config?.aiSettings)
  return {
    apiKey: resolved.apiKey || '',
    baseURL: resolved.baseUrl || 'https://api.openai.com/v1',
    model: resolved.model || 'gpt-3.5-turbo',
    provider: resolved.provider || 'custom'
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
    const aiConfig = await getAIConfig()
    const isClaude = aiConfig.provider === 'claude' || /anthropic\.com/i.test(aiConfig.baseURL || '')

    if (isClaude) {
      const systemMessage = messages.find(item => item.role === 'system')?.content || ''
      const userMessages = messages.filter(item => item.role !== 'system')
      const response = await tauriFetch(`${aiConfig.baseURL.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiConfig.apiKey,
          'anthropic-version': CLAUDE_API_VERSION
        },
        body: JSON.stringify({
          model: aiConfig.model,
          system: systemMessage,
          messages: userMessages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.content?.map(item => item.text || '').join('') || ''
    }

    const { client, aiConfig: clientConfig } = await initClient()
    const response = await client.chat.completions.create({
      model: clientConfig.model || 'gpt-3.5-turbo',
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
    const aiConfig = await getAIConfig()
    const isClaude = aiConfig.provider === 'claude' || /anthropic\.com/i.test(aiConfig.baseURL || '')

    if (isClaude) {
      const systemMessage = messages.find(item => item.role === 'system')?.content || ''
      const userMessages = messages.filter(item => item.role !== 'system')
      const response = await tauriFetch(`${aiConfig.baseURL.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        responseType: 3,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiConfig.apiKey,
          'anthropic-version': CLAUDE_API_VERSION,
          'accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: aiConfig.model,
          system: systemMessage,
          messages: userMessages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = typeof response.data === 'string' ? response.data : ''
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
      }

      const rawText = typeof response.data === 'string'
        ? response.data
        : new TextDecoder().decode(response.data)
      const events = rawText.split('\n\n')
      let fullContent = ''

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]') continue
          let parsed
          try {
            parsed = JSON.parse(payload)
          } catch {
            continue
          }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            const chunk = parsed.delta.text
            fullContent += chunk
            onChunk(chunk, fullContent)
          }
        }
      }

      return fullContent
    }

    const { client, aiConfig: clientConfig } = await initClient()
    const stream = await client.chat.completions.create({
      model: clientConfig.model || 'gpt-3.5-turbo',
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
