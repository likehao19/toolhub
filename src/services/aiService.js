/**
 * AI 服务
 * 封装 AI API 调用，使用 OpenAI 兼容接口
 */

import { loadConfig } from '@/utils/tauri/store'
import { fetch } from '@tauri-apps/plugin-http'
import { locale } from '@/i18n'
import { resolveActiveProvider } from '@/utils/aiProviders'

let aiConfig = null

function invalidateAIConfig() {
  aiConfig = null
}

/**
 * 加载 AI 配置（支持新多 provider 格式和旧单配置格式）
 */
async function loadAIConfig() {
  if (!aiConfig) {
    const config = await loadConfig()
    aiConfig = resolveActiveProvider(config?.aiSettings)
  }
  return aiConfig
}

window.addEventListener('settings-config-saved', invalidateAIConfig)
window.addEventListener('settings-reset', invalidateAIConfig)
window.addEventListener('ai-config-changed', invalidateAIConfig)

/**
 * 调用 AI API（OpenAI 兼容接口）
 */
async function callAIAPI(messages, options = {}) {
  const config = await loadAIConfig()

  if (!config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  let baseUrl = (config.baseUrl || 'https://api.openai.com/v1').trim()
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  const isClaude = config.provider === 'claude' || /anthropic\.com/i.test(baseUrl)

  try {
    if (isClaude) {
      const systemMessage = messages.find(item => item.role === 'system')?.content || ''
      const userMessages = messages.filter(item => item.role !== 'system')
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-sonnet-4-20250514',
          system: systemMessage,
          messages: userMessages,
          max_tokens: options.max_tokens || 2000,
          temperature: options.temperature ?? 0.7
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.content?.map(item => item.text || '').join('') || ''
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
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
 * 通用 AI 对话
 */
export async function chatWithAI(messages, options = {}) {
  return await callAIAPI(messages, {
    temperature: 0.7,
    max_tokens: 2000,
    ...options
  })
}

/**
 * 分析 Java 日志与源码上下文
 */
export async function analyzeJavaLogWithSources(payload) {
  const isZh = locale.value?.startsWith('zh')
  const systemPrompt = isZh
    ? '你是一个专业的 Java 日志分析与故障排查助手。请结合日志摘要、异常堆栈、根因链以及相关 Java 源码片段，判断最可能的问题根因，并给出涉及类/方法、排查步骤、修复建议和置信度。请使用清晰的中文分点输出。'
    : 'You are a professional Java log analysis and troubleshooting assistant. Based on the log summary, exception stack traces, root cause chains, and related Java source code snippets, determine the most likely root cause and provide the involved classes/methods, troubleshooting steps, fix recommendations, and confidence level. Use clear bullet points.'
  const userPrompt = isZh
    ? `请分析以下 Java 日志与源码上下文：\n\n${JSON.stringify(payload)}`
    : `Please analyze the following Java log and source context:\n\n${JSON.stringify(payload)}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  try {
    const result = await callAIAPI(messages, {
      max_tokens: 1800,
      temperature: 0.3
    })
    return result
  } catch (error) {
    const msg = isZh ? '日志分析失败' : 'Log analysis failed'
    throw new Error(`${msg}: ${error.message}`)
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
  chatWithAI,
  analyzeNote,
  generateNoteSummary,
  improveNote,
  answerQuestion,
  analyzeJavaLogWithSources,
  refreshConfig
}
