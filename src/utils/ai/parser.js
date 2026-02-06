/**
 * AI 参数提取模块
 * 从用户输入中提取结构化参数
 */

import { callAI } from './api'
import { IntentTypes } from './intent'

/**
 * 使用AI提取参数
 */
const extractByAI = async (text, intentType) => {
  const promptTemplates = {
    [IntentTypes.CREATE_NOTE]: `从以下文本中提取笔记信息：
"${text}"

以JSON格式返回，包含以下字段：
{
  "title": "笔记标题",
  "content": "笔记内容（如果用户要求生成内容，请生成完整的markdown内容）",
  "type": "笔记类型（技术/生活/工作等）"
}

只返回JSON，不要其他内容。`,

    [IntentTypes.CREATE_EVENT]: `从以下文本中提取日程信息：
"${text}"

以JSON格式返回，包含以下字段：
{
  "title": "日程标题",
  "startTime": "开始时间（ISO 8601格式，如2026-02-02T10:00:00）",
  "reminder": "提前提醒时间（分钟数，如5表示提前5分钟）"
}

如果用户说"明天"、"下周"等，请转换为具体日期时间。
只返回JSON，不要其他内容。`,

    [IntentTypes.CREATE_PASSWORD]: `从以下文本中提取密码信息：
"${text}"

以JSON格式返回，包含以下字段：
{
  "website": "网站名称或URL",
  "username": "用户名",
  "password": "密码（如果用户未提供，返回空字符串）"
}

只返回JSON，不要其他内容。`,

    [IntentTypes.CREATE_BOOKMARK]: `从以下文本中提取书签信息：
"${text}"

以JSON格式返回，包含以下字段：
{
  "url": "网站URL",
  "title": "网站标题（如果未提供，从URL推测）",
  "tags": "标签（数组，如['工具', '学习']）"
}

只返回JSON，不要其他内容。`,

    [IntentTypes.CREATE_TODO]: `从以下文本中提取待办信息：
"${text}"

以JSON格式返回，包含以下字段：
{
  "tasks": ["任务1", "任务2", "任务3"],
  "priority": "优先级（high/medium/low）",
  "dueDate": "截止日期（ISO 8601格式，如果未提及返回null）"
}

如果用户列举了多个任务，请全部提取到tasks数组中。
只返回JSON，不要其他内容。`
  }

  const prompt = promptTemplates[intentType]
  if (!prompt) {
    throw new Error('不支持的意图类型')
  }

  try {
    const response = await callAI([{ role: 'user', content: prompt }])
    
    // 提取JSON（移除可能的markdown代码块标记）
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?/g, '')
    }
    
    return JSON.parse(jsonStr)
  } catch (error) {
    throw new Error('无法解析参数，请提供更清晰的指令')
  }
}

/**
 * 使用正则表达式提取参数（备用）
 */
const extractByRegex = (text, intentType) => {
  switch (intentType) {
    case IntentTypes.CREATE_NOTE:
      return {
        title: text.match(/(?:写|创建|新建).*?["']?(.+?)["']?(?:的)?(?:笔记|文档)/)?.[1] || '新笔记',
        content: '',
        type: '其他'
      }

    case IntentTypes.CREATE_EVENT:
      return {
        title: text.match(/(?:提醒|日程|会议)[:：]?\s*(.+)/)?.[1] || '新日程',
        startTime: new Date(Date.now() + 86400000).toISOString(), // 默认明天
        reminder: 5
      }

    case IntentTypes.CREATE_PASSWORD:
      return {
        website: text.match(/(?:网站|平台)[:：]?\s*(\S+)/)?.[1] || '',
        username: text.match(/(?:用户名|账号)[:：]?\s*(\S+)/)?.[1] || '',
        password: text.match(/(?:密码)[:：]?\s*(\S+)/)?.[1] || ''
      }

    case IntentTypes.CREATE_BOOKMARK:
      const urlMatch = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i)
      return {
        url: urlMatch ? urlMatch[1] : '',
        title: '',
        tags: []
      }

    case IntentTypes.CREATE_TODO:
      return {
        tasks: [text.replace(/(?:创建|添加|新建)(?:任务|待办)[:：]?\s*/, '')],
        priority: 'medium',
        dueDate: null
      }

    default:
      return {}
  }
}

/**
 * 提取参数
 * @param {string} text - 用户输入文本
 * @param {string} intentType - 意图类型
 * @returns {Object} 提取的参数对象
 */
export const extractParams = async (text, intentType) => {
  try {
    // 优先使用AI提取（更准确）
    return await extractByAI(text, intentType)
  } catch (error) {
    // 降级使用正则提取
    return extractByRegex(text, intentType)
  }
}

/**
 * 验证参数完整性
 */
export const validateParams = (params, intentType) => {
  const validators = {
    [IntentTypes.CREATE_NOTE]: (p) => p.title && p.title.trim(),
    [IntentTypes.CREATE_EVENT]: (p) => p.title && p.startTime,
    [IntentTypes.CREATE_PASSWORD]: (p) => p.website && p.username,
    [IntentTypes.CREATE_BOOKMARK]: (p) => p.url,
    [IntentTypes.CREATE_TODO]: (p) => p.tasks && p.tasks.length > 0
  }

  const validator = validators[intentType]
  return validator ? validator(params) : true
}
