/**
 * 中国节假日数据
 * 优先从 china-holiday-calender API 获取，缓存到 localStorage，回退到静态数据
 * API: https://github.com/lanceliao/china-holiday-calender
 */

import { fetch } from '@tauri-apps/plugin-http'

// 静态回退数据（2024-2025）
const staticHolidays = {
  '2024-01-01': '元旦',
  '2024-02-10': '春节', '2024-02-11': '春节', '2024-02-12': '春节',
  '2024-02-13': '春节', '2024-02-14': '春节', '2024-02-15': '春节',
  '2024-02-16': '春节', '2024-02-17': '春节',
  '2024-04-04': '清明节', '2024-04-05': '清明节', '2024-04-06': '清明节',
  '2024-05-01': '劳动节', '2024-05-02': '劳动节', '2024-05-03': '劳动节',
  '2024-05-04': '劳动节', '2024-05-05': '劳动节',
  '2024-06-10': '端午节',
  '2024-09-15': '中秋节', '2024-09-16': '中秋节', '2024-09-17': '中秋节',
  '2024-10-01': '国庆节', '2024-10-02': '国庆节', '2024-10-03': '国庆节',
  '2024-10-04': '国庆节', '2024-10-05': '国庆节', '2024-10-06': '国庆节',
  '2024-10-07': '国庆节',
  '2025-01-01': '元旦',
  '2025-01-28': '春节', '2025-01-29': '春节', '2025-01-30': '春节',
  '2025-01-31': '春节', '2025-02-01': '春节', '2025-02-02': '春节',
  '2025-02-03': '春节', '2025-02-04': '春节',
  '2025-04-04': '清明节', '2025-04-05': '清明节', '2025-04-06': '清明节',
  '2025-05-01': '劳动节', '2025-05-02': '劳动节', '2025-05-03': '劳动节',
  '2025-05-04': '劳动节', '2025-05-05': '劳动节',
  '2025-05-31': '端午节', '2025-06-01': '端午节', '2025-06-02': '端午节',
  '2025-10-01': '国庆节', '2025-10-02': '国庆节', '2025-10-03': '国庆节',
  '2025-10-04': '国庆节', '2025-10-05': '国庆节', '2025-10-06': '国庆节',
  '2025-10-07': '国庆节', '2025-10-08': '国庆节'
}

const staticCompDays = {}

const CACHE_KEY = 'china_holidays_cache'
const CACHE_EXPIRY_KEY = 'china_holidays_cache_expiry'
const API_URL = 'https://cdn.jsdelivr.net/gh/lanceliao/china-holiday-calender/holidayAPI.json'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 天

let holidayData = null
let compDayData = null

/**
 * 解析 API 数据为 { holidays: { 'YYYY-MM-DD': '名称' }, compDays: { 'YYYY-MM-DD': '名称' } }
 */
function parseApiData(apiData) {
  const holidays = {}
  const compDays = {}
  const years = apiData.Years
  if (!years) return { holidays, compDays }

  for (const [, yearData] of Object.entries(years)) {
    if (typeof yearData !== 'object') continue

    for (const [, holiday] of Object.entries(yearData)) {
      if (!holiday || !holiday.StartDate || !holiday.EndDate || !holiday.Name) continue

      // 展开假日范围：StartDate ~ EndDate
      const start = new Date(holiday.StartDate)
      const end = new Date(holiday.EndDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        holidays[dateStr] = holiday.Name
      }

      // 收集补班日
      if (Array.isArray(holiday.CompDays)) {
        for (const compDay of holiday.CompDays) {
          compDays[compDay] = holiday.Name
        }
      }
    }
  }

  return { holidays, compDays }
}

/**
 * 加载节假日数据（缓存 → API → 静态回退）
 */
async function loadHolidayData() {
  if (holidayData) return

  // 尝试从缓存读取
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY)
    if (cached && expiry && Date.now() < parseInt(expiry)) {
      const parsed = JSON.parse(cached)
      holidayData = parsed.holidays
      compDayData = parsed.compDays
      return
    }
  } catch (e) {
    console.warn('[Holidays] 缓存读取失败:', e)
  }

  // 尝试从 API 获取
  try {
    const response = await fetch(API_URL)
    if (response.ok) {
      const apiData = await response.json()
      const { holidays, compDays } = parseApiData(apiData)
      holidayData = holidays
      compDayData = compDays

      // 写入缓存
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ holidays, compDays }))
        localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION))
      } catch (e) { /* localStorage 满了，忽略 */ }
      return
    }
  } catch (e) {
    console.warn('[Holidays] API 请求失败，使用静态数据:', e)
  }

  // 回退到静态数据
  holidayData = staticHolidays
  compDayData = staticCompDays
}

// 模块加载时异步预取（不阻塞）
loadHolidayData()

/**
 * 检查日期是否为节假日（同步）
 */
export function isHoliday(dateStr) {
  const data = holidayData || staticHolidays
  return data[dateStr] || null
}

/**
 * 获取节假日名称
 */
export function getHolidayName(dateStr) {
  return isHoliday(dateStr)
}

/**
 * 检查日期是否为补班日（同步）
 */
export function isCompDay(dateStr) {
  const data = compDayData || staticCompDays
  return data[dateStr] || null
}

/**
 * 获取所有节假日
 */
export function getAllHolidays() {
  return holidayData || staticHolidays
}

/**
 * 强制刷新节假日数据
 */
export async function refreshHolidays() {
  holidayData = null
  compDayData = null
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_EXPIRY_KEY)
  await loadHolidayData()
}

export default { getAllHolidays, isHoliday, getHolidayName, isCompDay, refreshHolidays }
