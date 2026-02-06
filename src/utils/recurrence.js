/**
 * 重复事件规则工具
 */

/**
 * 重复规则类型
 */
export const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom'
}

/**
 * 解析重复规则
 */
export function parseRecurrenceRule(ruleStr) {
  if (!ruleStr) return null
  
  try {
    return JSON.parse(ruleStr)
  } catch (error) {
    return null
  }
}

/**
 * 生成重复规则字符串
 */
export function generateRecurrenceRule(rule) {
  if (!rule || rule.type === RECURRENCE_TYPES.NONE) {
    return null
  }
  
  return JSON.stringify(rule)
}

/**
 * 计算重复事件的下一次发生时间
 */
export function getNextOccurrence(startTime, rule, currentOccurrence = null) {
  if (!rule || rule.type === RECURRENCE_TYPES.NONE) {
    return null
  }
  
  const start = new Date(startTime)
  const current = currentOccurrence ? new Date(currentOccurrence) : new Date()
  
  if (rule.type === RECURRENCE_TYPES.DAILY) {
    const interval = rule.interval || 1
    const next = new Date(current)
    next.setDate(next.getDate() + interval)
    return next.toISOString()
  }
  
  if (rule.type === RECURRENCE_TYPES.WEEKLY) {
    const interval = rule.interval || 1
    const daysOfWeek = rule.daysOfWeek || [start.getDay()]
    const next = new Date(current)
    
    // 找到下一个匹配的星期几
    let daysToAdd = 0
    let found = false
    
    for (let i = 0; i < 7 * interval; i++) {
      next.setDate(next.getDate() + 1)
      if (daysOfWeek.includes(next.getDay())) {
        found = true
        break
      }
      daysToAdd++
    }
    
    if (!found) {
      // 如果没找到，跳到下一个周期
      next.setDate(next.getDate() + (7 * interval - daysToAdd))
    }
    
    return next.toISOString()
  }
  
  if (rule.type === RECURRENCE_TYPES.MONTHLY) {
    const interval = rule.interval || 1
    const next = new Date(current)
    next.setMonth(next.getMonth() + interval)
    
    // 处理月末日期
    const dayOfMonth = start.getDate()
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(dayOfMonth, maxDay))
    
    return next.toISOString()
  }
  
  if (rule.type === RECURRENCE_TYPES.YEARLY) {
    const next = new Date(current)
    next.setFullYear(next.getFullYear() + 1)
    return next.toISOString()
  }
  
  return null
}

/**
 * 检查事件是否应该结束
 */
export function shouldEndRecurrence(rule, occurrenceTime) {
  if (!rule) return false
  
  // 检查结束条件
  if (rule.endType === 'count' && rule.count) {
    // 基于次数的结束（需要外部跟踪）
    return false
  }
  
  if (rule.endType === 'date' && rule.endDate) {
    const endDate = new Date(rule.endDate)
    const occurrence = new Date(occurrenceTime)
    return occurrence > endDate
  }
  
  return false
}

/**
 * 生成重复事件的所有实例（在指定日期范围内）
 */
export function generateRecurrenceInstances(startTime, rule, endDate) {
  if (!rule || rule.type === RECURRENCE_TYPES.NONE) {
    return []
  }
  
  const instances = []
  const start = new Date(startTime)
  const end = new Date(endDate)
  let current = new Date(start)
  
  let count = 0
  const maxCount = rule.count || 1000 // 防止无限循环
  
  while (current <= end && count < maxCount) {
    instances.push(new Date(current))
    
    const next = getNextOccurrence(startTime, rule, current.toISOString())
    if (!next) break
    
    current = new Date(next)
    count++
    
    // 检查结束条件
    if (shouldEndRecurrence(rule, current.toISOString())) {
      break
    }
  }
  
  return instances
}

/**
 * 获取重复规则的显示文本
 */
export function getRecurrenceText(rule) {
  if (!rule || rule.type === RECURRENCE_TYPES.NONE) {
    return '不重复'
  }
  
  const interval = rule.interval || 1
  
  switch (rule.type) {
    case RECURRENCE_TYPES.DAILY:
      return interval === 1 ? '每天' : `每${interval}天`
    case RECURRENCE_TYPES.WEEKLY:
      return interval === 1 ? '每周' : `每${interval}周`
    case RECURRENCE_TYPES.MONTHLY:
      return interval === 1 ? '每月' : `每${interval}月`
    case RECURRENCE_TYPES.YEARLY:
      return '每年'
    default:
      return '自定义重复'
  }
}

