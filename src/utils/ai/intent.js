/**
 * AI 意图识别模块
 * 根据用户输入识别操作意图
 */

import { chatWithAI } from '@/services/aiService'

// 意图类型定义
export const IntentTypes = {
  CREATE_NOTE: 'create_note',
  CREATE_EVENT: 'create_event',
  CREATE_PASSWORD: 'create_password',
  CREATE_BOOKMARK: 'create_bookmark',
  CREATE_TODO: 'create_todo',
  QUERY: 'query',
  UNKNOWN: 'unknown'
}

// 意图描述
const intentDescriptions = {
  [IntentTypes.CREATE_NOTE]: '创建笔记',
  [IntentTypes.CREATE_EVENT]: '创建日程',
  [IntentTypes.CREATE_PASSWORD]: '保存密码',
  [IntentTypes.CREATE_BOOKMARK]: '添加书签',
  [IntentTypes.CREATE_TODO]: '创建待办',
  [IntentTypes.QUERY]: '查询信息',
  [IntentTypes.UNKNOWN]: '未知操作'
}

// 关键词匹配规则
const keywordRules = {
  [IntentTypes.CREATE_NOTE]: ['笔记', '文档', '写', '记录', '文章', 'md', 'markdown'],
  [IntentTypes.CREATE_EVENT]: ['日程', '日历', '提醒', '开会', '会议', '约会', '安排'],
  [IntentTypes.CREATE_PASSWORD]: ['密码', '账号', '登录', '保存', '存储', '用户名'],
  [IntentTypes.CREATE_BOOKMARK]: ['书签', '网站', '收藏', '网址', 'url', 'http'],
  [IntentTypes.CREATE_TODO]: ['任务', '待办', 'todo', '清单', '事项']
}

/**
 * 使用关键词规则识别意图
 */
const recognizeByKeywords = (text) => {
  const lowerText = text.toLowerCase()
  
  for (const [intent, keywords] of Object.entries(keywordRules)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return intent
      }
    }
  }
  
  return IntentTypes.UNKNOWN
}

/**
 * 使用AI识别意图（更精确）
 */
const recognizeByAI = async (text, context = []) => {
  try {
    const prompt = `你是一个意图识别助手。用户说："${text}"

请判断用户想要执行的操作类型，只返回以下之一：
- create_note: 创建笔记/文档
- create_event: 创建日程/提醒
- create_password: 保存密码/账号
- create_bookmark: 添加书签/网站
- create_todo: 创建任务/待办
- query: 查询信息
- unknown: 无法判断

只返回操作类型，不要其他内容。`

    const response = await chatWithAI([
      ...context.slice(-4), // 保留最近4轮对话上下文
      { role: 'user', content: prompt }
    ])

    const intent = response.trim().toLowerCase()
    return Object.values(IntentTypes).includes(intent) ? intent : IntentTypes.UNKNOWN
  } catch (error) {
    return recognizeByKeywords(text)
  }
}

/**
 * 识别用户意图
 * @param {string} text - 用户输入文本
 * @param {Array} context - 对话上下文
 * @returns {Object} 意图对象 { type, description }
 */
export const recognizeIntent = async (text, context = []) => {
  // 首先尝试关键词匹配（快速）
  const keywordIntent = recognizeByKeywords(text)
  
  // 如果关键词能识别，直接返回
  if (keywordIntent !== IntentTypes.UNKNOWN) {
    return {
      type: keywordIntent,
      description: intentDescriptions[keywordIntent]
    }
  }
  
  // 否则使用AI识别（更精确但较慢）
  const aiIntent = await recognizeByAI(text, context)
  
  return {
    type: aiIntent,
    description: intentDescriptions[aiIntent]
  }
}

/**
 * 验证意图是否需要确认
 */
export const needsConfirmation = (intent) => {
  // 所有创建操作都需要确认
  return intent !== IntentTypes.QUERY && intent !== IntentTypes.UNKNOWN
}
