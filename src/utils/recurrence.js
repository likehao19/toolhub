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
    // 用户没勾选周几时回退到 start 当天的星期几。
    // 旧实现 `rule.daysOfWeek || [start.getDay()]` 在空数组时不走 fallback(空数组是 truthy),
    // 导致 includes() 永远 false,后续 generateRecurrenceInstances 死循环到 maxCount=1000 卡 UI。
    const daysOfWeek = (rule.daysOfWeek && rule.daysOfWeek.length > 0)
      ? rule.daysOfWeek
      : [start.getDay()]

    // WEEKLY 语义:在 daysOfWeek 标记的星期里发生,每 interval 周一组。
    // 旧实现把 interval 当成"扩大搜索窗口",找到本周内下一个匹配日就返回 ——
    // 设 interval=2 + 周一/三/五,从周一返回周三是错的(应该是两周后的周一)。
    // 正确做法:同周内还有匹配 → 下一个匹配日;否则跳到 +interval 周后该周的第一个匹配日。
    const sortedDows = [...daysOfWeek].map(Number).sort((a, b) => a - b)
    const curDow = current.getDay()
    const next = new Date(current)
    const sameWeekNext = sortedDows.find(d => d > curDow)
    if (sameWeekNext !== undefined) {
      next.setDate(next.getDate() + (sameWeekNext - curDow))
    } else {
      // 跳到 interval 周后该周的"周日基准"再加上第一个 dow
      // (本地按 0=周日,getDay 一致)
      const daysToNextSunday = 7 - curDow
      next.setDate(next.getDate() + daysToNextSunday + 7 * (interval - 1) + sortedDows[0])
    }
    return next.toISOString()
  }

  if (rule.type === RECURRENCE_TYPES.MONTHLY) {
    const interval = rule.interval || 1
    // 旧实现先 setMonth 再 setDate 会触发 JS 自动进位:
    //   start=1/30, current=1/30, setMonth(1) → 2/30 自动滚到 3/2(非闰),再 setDate(30) → 3/30
    //   结果 2 月直接被跳过。
    // 修法:不用 setMonth 渐进,直接构造目标年月日,Math.min 处理月末。
    const targetMonth = current.getMonth() + interval
    const targetYear = current.getFullYear() + Math.floor(targetMonth / 12)
    const normalizedMonth = ((targetMonth % 12) + 12) % 12
    const dayOfMonth = start.getDate()
    const maxDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
    const next = new Date(targetYear, normalizedMonth, Math.min(dayOfMonth, maxDay),
                          start.getHours(), start.getMinutes(), start.getSeconds())
    return next.toISOString()
  }

  if (rule.type === RECURRENCE_TYPES.YEARLY) {
    // 旧实现写死 +1 年,interval 完全失效(用户选"每 5 年"也变成每 1 年)。
    const interval = rule.interval || 1
    const next = new Date(current)
    next.setFullYear(next.getFullYear() + interval)
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

