/**
 * 农历和节气工具
 * 提供农历日期转换和节气计算功能
 * 使用 lunar-javascript 库进行精确计算，无年份限制
 */

import { Solar } from 'lunar-javascript'

/**
 * 获取节气（使用 lunar-javascript 算法计算，无年份限制）
 */
export function getSolarTerm(dateStr) {
  try {
    const date = new Date(dateStr)
    const solar = Solar.fromDate(date)
    const jieQi = solar.getLunar().getCurrentJieQi()
    return jieQi ? jieQi.getName() : null
  } catch (error) {
    return null
  }
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
