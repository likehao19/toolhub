/**
 * 农历和节气工具
 * 提供农历日期转换和节气计算功能
 */

import { Solar, Lunar } from 'lunar-javascript'

// 节气数据
const solarTerms = {
  // 2024年节气
  '2024-02-04': '立春',
  '2024-02-19': '雨水',
  '2024-03-05': '惊蛰',
  '2024-03-20': '春分',
  '2024-04-04': '清明',
  '2024-04-19': '谷雨',
  '2024-05-05': '立夏',
  '2024-05-20': '小满',
  '2024-06-05': '芒种',
  '2024-06-21': '夏至',
  '2024-07-06': '小暑',
  '2024-07-22': '大暑',
  '2024-08-07': '立秋',
  '2024-08-23': '处暑',
  '2024-09-07': '白露',
  '2024-09-22': '秋分',
  '2024-10-08': '寒露',
  '2024-10-23': '霜降',
  '2024-11-07': '立冬',
  '2024-11-22': '小雪',
  '2024-12-07': '大雪',
  '2024-12-21': '冬至',
  // 2025年节气
  '2025-01-05': '小寒',
  '2025-01-20': '大寒',
  '2025-02-03': '立春',
  '2025-02-18': '雨水',
  '2025-03-05': '惊蛰',
  '2025-03-20': '春分',
  '2025-04-04': '清明',
  '2025-04-20': '谷雨',
  '2025-05-05': '立夏',
  '2025-05-21': '小满',
  '2025-06-05': '芒种',
  '2025-06-21': '夏至',
  '2025-07-07': '小暑',
  '2025-07-22': '大暑',
  '2025-08-07': '立秋',
  '2025-08-23': '处暑',
  '2025-09-07': '白露',
  '2025-09-23': '秋分',
  '2025-10-08': '寒露',
  '2025-10-23': '霜降',
  '2025-11-07': '立冬',
  '2025-11-22': '小雪',
  '2025-12-07': '大雪',
  '2025-12-21': '冬至',
  // 2026年节气
  '2026-01-05': '小寒',
  '2026-01-20': '大寒',
  '2026-02-04': '立春',
  '2026-02-18': '雨水',
  '2026-03-05': '惊蛰',
  '2026-03-20': '春分',
  '2026-04-04': '清明',
  '2026-04-20': '谷雨',
  '2026-05-05': '立夏',
  '2026-05-21': '小满',
  '2026-06-05': '芒种',
  '2026-06-21': '夏至',
  '2026-07-07': '小暑',
  '2026-07-22': '大暑',
  '2026-08-07': '立秋',
  '2026-08-23': '处暑',
  '2026-09-07': '白露',
  '2026-09-23': '秋分',
  '2026-10-08': '寒露',
  '2026-10-23': '霜降',
  '2026-11-07': '立冬',
  '2026-11-22': '小雪',
  '2026-12-07': '大雪',
  '2026-12-21': '冬至'
}

/**
 * 获取节气
 */
export function getSolarTerm(dateStr) {
  return solarTerms[dateStr] || null
}

/**
 * 获取农历日期
 * 使用 lunar-javascript 库进行精确转换
 */
export function getLunarDate(dateStr) {
  try {
    const date = new Date(dateStr)
    const solar = Solar.fromDate(date)
    const lunar = solar.getLunar()
    
    // 获取农历月份（处理闰月）
    const monthInChinese = lunar.getMonthInChinese()
    // 获取农历日期
    const dayInChinese = lunar.getDayInChinese()
    
    return {
      month: monthInChinese,
      day: dayInChinese,
      full: dayInChinese // 只显示日期，不显示月份
    }
  } catch (error) {
    return {
      month: '',
      day: '',
      full: ''
    }
  }
}

/**
 * 获取日期的完整信息（公历、农历、节气、节假日）
 */
export function getDateInfo(dateStr) {
  const lunar = getLunarDate(dateStr)
  const solarTerm = getSolarTerm(dateStr)
  
  return {
    date: dateStr,
    lunar: lunar.full,
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    solarTerm,
    isSolarTerm: !!solarTerm
  }
}

/**
 * 检查日期是否有特殊信息（节气或节假日）
 */
export function hasSpecialInfo(dateStr) {
  const solarTerm = getSolarTerm(dateStr)
  return !!solarTerm
}

export default {
  getLunarDate,
  getSolarTerm,
  getDateInfo,
  hasSpecialInfo
}

