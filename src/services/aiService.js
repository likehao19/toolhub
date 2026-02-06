/**
 * AI 服务
 * 封装 AI API 调用，支持 OpenAI、Claude 等
 */

import { loadConfig } from '@/utils/tauri/store'

let aiConfig = null

/**
 * 加载 AI 配置
 */
async function loadAIConfig() {
  if (!aiConfig) {
    const config = await loadConfig()
    aiConfig = config?.aiSettings || {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      customEndpoint: ''
    }
  }
  return aiConfig
}

/**
 * 调用 AI API
 */
async function callAIAPI(messages, options = {}) {
  const config = await loadAIConfig()
  
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  let url = ''
  let headers = {}
  let body = {}

  if (config.provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions'
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
    body = {
      model: config.model || 'gpt-3.5-turbo',
      messages: messages,
      ...options
    }
  } else if (config.provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages'
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    }
    body = {
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: options.max_tokens || 1024,
      messages: messages
    }
  } else if (config.provider === 'custom') {
    url = config.customEndpoint
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
    body = {
      messages: messages,
      ...options
    }
  } else {
    throw new Error(`不支持的 AI 提供商: ${config.provider}`)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (config.provider === 'openai' || config.provider === 'custom') {
      return data.choices[0]?.message?.content || ''
    } else if (config.provider === 'claude') {
      return data.content[0]?.text || ''
    }

    return ''
  } catch (error) {
    throw error
  }
}

/**
 * 分析笔记内容
 */
export async function analyzeNote(noteContent) {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的笔记分析助手。请分析用户提供的笔记内容，提取关键信息、总结要点，并提供改进建议。'
    },
    {
      role: 'user',
      content: `请分析以下笔记内容：\n\n${noteContent}\n\n请提供：\n1. 内容摘要\n2. 关键要点\n3. 改进建议`
    }
  ]

  try {
    const result = await callAIAPI(messages, {
      max_tokens: 1000,
      temperature: 0.7
    })
    return result
  } catch (error) {
    throw new Error(`笔记分析失败: ${error.message}`)
  }
}

/**
 * 生成笔记摘要
 */
export async function generateNoteSummary(noteContent) {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的笔记助手。请为用户提供的笔记生成简洁的摘要。'
    },
    {
      role: 'user',
      content: `请为以下笔记生成摘要（不超过100字）：\n\n${noteContent}`
    }
  ]

  try {
    const result = await callAIAPI(messages, {
      max_tokens: 200,
      temperature: 0.5
    })
    return result
  } catch (error) {
    throw new Error(`生成摘要失败: ${error.message}`)
  }
}

/**
 * 改进笔记内容
 */
export async function improveNote(noteContent) {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的写作助手。请帮助用户改进笔记内容，使其更加清晰、有条理。'
    },
    {
      role: 'user',
      content: `请改进以下笔记内容，使其更加清晰、有条理：\n\n${noteContent}`
    }
  ]

  try {
    const result = await callAIAPI(messages, {
      max_tokens: 2000,
      temperature: 0.7
    })
    return result
  } catch (error) {
    throw new Error(`改进笔记失败: ${error.message}`)
  }
}

/**
 * 回答关于笔记的问题
 */
export async function answerQuestion(noteContent, question) {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的笔记助手。请基于用户提供的笔记内容回答问题。'
    },
    {
      role: 'user',
      content: `笔记内容：\n\n${noteContent}\n\n问题：${question}`
    }
  ]

  try {
    const result = await callAIAPI(messages, {
      max_tokens: 500,
      temperature: 0.7
    })
    return result
  } catch (error) {
    throw new Error(`回答问题失败: ${error.message}`)
  }
}

/**
 * 刷新 AI 配置
 */
export async function refreshConfig() {
  aiConfig = null
  await loadAIConfig()
}

export default {
  analyzeNote,
  generateNoteSummary,
  improveNote,
  answerQuestion,
  refreshConfig
}

