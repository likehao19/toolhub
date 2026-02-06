/**
 * AI API 调用模块
 * 封装与AI模型的通信
 */

import OpenAI from 'openai'

let openaiClient = null

/**
 * 初始化OpenAI客户端
 */
const initClient = () => {
  if (openaiClient) return openaiClient

  // 从localStorage读取AI配置
  const aiConfig = JSON.parse(localStorage.getItem('ai_config') || '{}')
  
  if (!aiConfig.apiKey) {
    throw new Error('请先在设置中配置AI API')
  }

  openaiClient = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseURL || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true
  })

  return openaiClient
}

/**
 * 调用AI API
 * @param {Array} messages - 对话消息数组
 * @param {Object} options - 额外选项
 * @returns {Promise<string>} AI响应内容
 */
export const callAI = async (messages, options = {}) => {
  try {
    const client = initClient()
    const aiConfig = JSON.parse(localStorage.getItem('ai_config') || '{}')

    const response = await client.chat.completions.create({
      model: aiConfig.model || 'gpt-3.5-turbo',
      messages: messages,
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
    const client = initClient()
    const aiConfig = JSON.parse(localStorage.getItem('ai_config') || '{}')

    const stream = await client.chat.completions.create({
      model: aiConfig.model || 'gpt-3.5-turbo',
      messages: messages,
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
  openaiClient = null
}

/**
 * 检查AI配置是否完整
 */
export const checkAIConfig = () => {
  const aiConfig = JSON.parse(localStorage.getItem('ai_config') || '{}')
  return !!(aiConfig.apiKey && aiConfig.baseURL)
}
