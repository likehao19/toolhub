/**
 * 通知服务
 * 负责检查待办和日程，发送桌面通知
 */

import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { emit } from '@tauri-apps/api/event'
import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 通知检查间隔（毫秒）
const CHECK_INTERVAL = 60000 // 1分钟检查一次

let checkInterval = null
let notifiedTodos = new Set() // 已通知的待办ID
let notifiedEvents = new Set() // 已通知的日程ID

/**
 * 初始化通知服务
 */
export async function initNotificationService() {
  // 检查并请求通知权限
  let permissionGranted = await isPermissionGranted()
  if (!permissionGranted) {
    permissionGranted = await requestPermission()
  }

  if (!permissionGranted) {
    return false
  }

  // 启动定时检查
  startChecking()
  return true
}

/**
 * 启动定时检查
 */
function startChecking() {
  if (checkInterval) {
    clearInterval(checkInterval)
  }

  // 立即检查一次
  checkTodosAndEvents()
  checkPasswordExpiration()

  // 定时检查
  checkInterval = setInterval(() => {
    checkTodosAndEvents()
    checkPasswordExpiration()
  }, CHECK_INTERVAL)
}

/**
 * 停止定时检查
 */
export function stopNotificationService() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

/**
 * 检查待办和日程
 */
/**
 * 检查密码过期
 */
async function checkPasswordExpiration() {
  try {
    const db = await getDatabase()
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // 查询即将过期（7天内）或已过期的密码
    const passwords = await db.select(
      `SELECT id, title, username, website, expires_at 
       FROM passwords 
       WHERE expires_at IS NOT NULL 
       AND expires_at <= ?`,
      [sevenDaysLater.toISOString()]
    )
    
    for (const pwd of passwords) {
      const expiresAt = new Date(pwd.expires_at)
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
      
      // 如果已过期或7天内过期
      if (daysUntilExpiry <= 7) {
        const title = pwd.title || pwd.website || '密码'
        const message = daysUntilExpiry <= 0 
          ? `${title} 的密码已过期 ${Math.abs(daysUntilExpiry)} 天，请及时更新`
          : `${title} 的密码将在 ${daysUntilExpiry} 天后过期，请及时更新`
        
        await sendNotification({
          title: '密码过期提醒',
          body: message,
          icon: 'lock'
        })
      }
    }
  } catch (e) { /* ignore */ }
}

async function checkTodosAndEvents() {
  try {
    await Promise.all([
      checkTodos(),
      checkCalendarEvents()
    ])
  } catch (e) { /* ignore */ }
}

/**
 * 检查待办
 */
async function checkTodos() {
  try {
    const db = await getDatabase()
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // 查询今日到期的待办
    let query = `SELECT id, title, description, due_date, status 
                 FROM todos 
                 WHERE due_date = ? 
                 AND status != 2`
    const params = [today]
    
    if (notifiedTodos.size > 0) {
      query += ` AND id NOT IN (${Array.from(notifiedTodos).map(() => '?').join(',')})`
      params.push(...Array.from(notifiedTodos))
    }
    
    const todos = await db.select(query, params)

    for (const todo of todos) {
      // 检查是否到了提醒时间（默认提前15分钟）
      const dueDate = new Date(todo.due_date)
      const timeDiff = dueDate - now

      // 如果已经到期或即将到期（15分钟内）
      if (timeDiff <= 15 * 60 * 1000 && timeDiff >= -60 * 60 * 1000) {
        await sendTodoNotification(todo)
        notifiedTodos.add(todo.id)
      }
    }
  } catch (e) { /* ignore */ }
}

/**
 * 检查日程事件
 */
async function checkCalendarEvents() {
  try {
    const db = await getDatabase()
    const now = new Date()

    // 查询即将开始或正在进行的日程
    let query = `SELECT id, title, description, start_time, end_time, location, reminder_minutes
                 FROM calendar_events 
                 WHERE start_time <= datetime('now', '+1 hour')
                 AND (end_time IS NULL OR end_time >= datetime('now'))`
    const params = []
    
    if (notifiedEvents.size > 0) {
      query += ` AND id NOT IN (${Array.from(notifiedEvents).map(() => '?').join(',')})`
      params.push(...Array.from(notifiedEvents))
    }
    
    const events = await db.select(query, params)

    for (const event of events) {
      const startTime = new Date(event.start_time)
      const timeDiff = startTime - now

      // 解析提醒规则（支持多级提醒）
      let reminderRules = []
      if (event.reminder_rules) {
        try {
          reminderRules = JSON.parse(event.reminder_rules)
        } catch (e) {
          // 如果解析失败，使用旧的 reminder_minutes
          if (event.reminder_minutes) {
            reminderRules = [event.reminder_minutes]
          }
        }
      } else if (event.reminder_minutes) {
        reminderRules = [event.reminder_minutes]
      }
      
      // 如果没有设置提醒，使用默认15分钟
      if (reminderRules.length === 0) {
        reminderRules = [15]
      }

      // 检查每个提醒规则
      for (const reminderMinutes of reminderRules) {
        const reminderTime = reminderMinutes * 60 * 1000
        const notificationKey = `${event.id}-${reminderMinutes}`
        
        // 如果到了提醒时间（提前提醒或刚好开始）
        if (timeDiff <= reminderTime && timeDiff >= -60 * 60 * 1000) {
          if (!notifiedEvents.has(notificationKey)) {
            await sendEventNotification(event, reminderMinutes)
            notifiedEvents.add(notificationKey)
          }
        }
      }
    }
  } catch (e) { /* ignore */ }
}

/**
 * 发送待办通知
 */
async function sendTodoNotification(todo) {
  try {
    const title = '待办提醒'
    const body = `${todo.title}${todo.description ? `\n${todo.description}` : ''}`

    await sendNotification({
      title,
      body,
      icon: 'icon.png', // 应用图标
      tag: `todo-${todo.id}` // 使用 tag 标识通知
    })

    // 发送事件，用于通知点击跳转
    try {
      await emit('notification-clicked', {
        type: 'todo',
        id: todo.id,
        title: todo.title
      })
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

/**
 * 发送日程通知
 */
async function sendEventNotification(event, reminderMinutes = null) {
  try {
    const startTime = new Date(event.start_time)
    const timeStr = startTime.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    let title = '日程提醒'
    if (reminderMinutes) {
      if (reminderMinutes < 60) {
        title = `日程提醒（${reminderMinutes}分钟后）`
      } else if (reminderMinutes < 1440) {
        title = `日程提醒（${Math.floor(reminderMinutes / 60)}小时后）`
      } else {
        title = `日程提醒（${Math.floor(reminderMinutes / 1440)}天后）`
      }
    }
    
    let body = `${event.title}\n时间: ${timeStr}`
    
    if (event.location) {
      body += `\n地点: ${event.location}`
    }
    
    if (event.description) {
      body += `\n${event.description}`
    }

    await sendNotification({
      title,
      body,
      icon: 'icon.png',
      tag: `event-${event.id}` // 使用 tag 标识通知
    })

    // 发送事件，用于通知点击跳转
    try {
      await emit('notification-clicked', {
        type: 'event',
        id: event.id,
        title: event.title
      })
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

/**
 * 清除已通知记录（用于重置通知状态）
 */
export function clearNotificationHistory() {
  notifiedTodos.clear()
  notifiedEvents.clear()
}

/**
 * 手动触发检查（用于测试）
 */
export async function triggerCheck() {
  await checkTodosAndEvents()
}

export default {
  initNotificationService,
  stopNotificationService,
  clearNotificationHistory,
  triggerCheck
}

