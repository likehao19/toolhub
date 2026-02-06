/**
 * 提醒服务 - 管理待办和日程提醒
 */

import Database from '@tauri-apps/plugin-sql'
import CustomNotification from './tauri/customNotification'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null
let checkInterval = null
let notifiedItems = new Set() // 记录已提醒的项目 (类型:ID)

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 初始化提醒服务
 */
export async function initReminderService() {
  // 确保数据库表有必要的字段
  await ensureReminderColumns()
  
  // 每30秒检查一次提醒（更及时）
  if (checkInterval) {
    clearInterval(checkInterval)
  }
  
  checkInterval = setInterval(async () => {
    try {
      await checkTodoReminders()
      await checkEventReminders()
    } catch (error) {
      // ignore
    }
  }, 30000) // 30秒检查一次
  
  // 立即执行一次检查
  try {
    await checkTodoReminders()
    await checkEventReminders()
  } catch (error) {
    // ignore
  }
}

/**
 * 停止提醒服务
 */
export function stopReminderService() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

/**
 * 手动触发检查（用于调试或即时检查）
 */
export async function manualCheckReminders() {
  try {
    await checkTodoReminders()
    await checkEventReminders()
  } catch (error) {
    throw error
  }
}

/**
 * 确保待办和日程表有必要的提醒字段
 */
async function ensureReminderColumns() {
  const db = await getDatabase()
  
  try {
    // 检查并添加 todos 表的提醒字段
    const todosColumns = await db.select("PRAGMA table_info(todos)")
    const todosColumnNames = todosColumns.map(col => col.name)
    
    if (!todosColumnNames.includes('reminder_enabled')) {
      await db.execute('ALTER TABLE todos ADD COLUMN reminder_enabled INTEGER DEFAULT 0')
    }
    if (!todosColumnNames.includes('reminder_type')) {
      await db.execute('ALTER TABLE todos ADD COLUMN reminder_type TEXT')
    }
    if (!todosColumnNames.includes('reminder_time')) {
      await db.execute('ALTER TABLE todos ADD COLUMN reminder_time TEXT')
    }
    if (!todosColumnNames.includes('reminder_sent')) {
      await db.execute('ALTER TABLE todos ADD COLUMN reminder_sent INTEGER DEFAULT 0')
    }
  } catch (error) {
  }
}

/**
 * 检查待办提醒
 * 提醒类型：
 * - on_start: 在开始日期当天提醒
 * - on_due: 在截止日期当天提醒
 * - before_due: 在截止日期前N天提醒
 * - overdue: 过期提醒（每天一次）
 */
async function checkTodoReminders() {
  const db = await getDatabase()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  try {
    // 查询启用提醒且未完成的待办
    const todos = await db.select(
      `SELECT * FROM todos 
       WHERE reminder_enabled = 1 
       AND status != 2 
       AND parent_id IS NULL
       ORDER BY priority DESC, due_date ASC`
    )
    
    for (const todo of todos) {
      // 检查是否已经提醒过（非过期类型只提醒一次）
      const reminderType = todo.reminder_type || 'on_due'
      
      if (reminderType !== 'overdue' && todo.reminder_sent === 1) {
        continue // 已提醒过，跳过
      }
      
      let shouldNotify = false
      let notifyMessage = ''
      
      // 解析提醒配置
      const reminderTime = todo.reminder_time || '09:00' // 默认早上9点
      
      // 检查是否到了提醒时间
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // 只在设定的时间点提醒（允许±5分钟误差）
      const isReminderTime = 
        currentHour === reminderHour && 
        Math.abs(currentMinute - reminderMinute) <= 5
      
      if (!isReminderTime) {
        continue
      }
      
      // 根据提醒类型判断
      if (reminderType === 'on_start' && todo.start_date === today) {
        shouldNotify = true
        notifyMessage = `今天开始`
      } else if (reminderType === 'on_due' && todo.due_date === today) {
        shouldNotify = true
        notifyMessage = `今天截止`
      } else if (reminderType === 'before_due' && todo.due_date) {
        const daysBeforeStr = todo.reminder_time?.split('|')[1] || '1'
        const daysBefore = parseInt(daysBeforeStr) || 1
        
        const dueDate = new Date(todo.due_date)
        const reminderDate = new Date(dueDate)
        reminderDate.setDate(reminderDate.getDate() - daysBefore)
        const reminderDateStr = reminderDate.toISOString().split('T')[0]
        
        if (reminderDateStr === today) {
          shouldNotify = true
          notifyMessage = `${daysBefore}天后截止`
        }
      } else if (reminderType === 'overdue' && todo.due_date && todo.due_date < today) {
        // 过期提醒：检查今天是否已经提醒过
        const itemKey = `todo:${todo.id}:${today}`
        if (notifiedItems.has(itemKey)) {
          continue
        }
        
        shouldNotify = true
        const dueDate = new Date(todo.due_date)
        const diff = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
        notifyMessage = `已过期 ${diff} 天`
        
        // 过期提醒记录在内存中（每天一次）
        if (shouldNotify) {
          notifiedItems.add(itemKey)
        }
      }
      
      if (shouldNotify) {
        await triggerTodoReminder(todo, notifyMessage)
        
        // 非过期类型的提醒，标记为已提醒（持久化到数据库）
        if (reminderType !== 'overdue') {
          await db.execute(
            'UPDATE todos SET reminder_sent = 1 WHERE id = ?',
            [todo.id]
          )
        }
      }
    }
    
    // 清理过期的内存记录（只保留今天的）
    for (const key of notifiedItems) {
      if (key.startsWith('todo:')) {
        const parts = key.split(':')
        const dateStr = parts[2]
        if (dateStr && dateStr < today) {
          notifiedItems.delete(key)
        }
      }
    }
  } catch (error) {
    // ignore
  }
}

/**
 * 检查日程提醒
 */
async function checkEventReminders() {
  const db = await getDatabase()
  const now = new Date()
  
  try {
    // 使用本地时间格式（不带Z），与数据库存储格式一致
    const pastTime = new Date(now.getTime() - 60 * 60 * 1000)
    const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    // 格式化为本地时间字符串（YYYY-MM-DDTHH:mm:ss，不带时区标记）
    const formatLocalTime = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }
    
    const pastTimeStr = formatLocalTime(pastTime)
    const currentTimeStr = formatLocalTime(now)
    const futureTimeStr = formatLocalTime(futureTime)
    
    const events = await db.select(
      `SELECT * FROM calendar_events 
       WHERE start_time >= ? 
       AND start_time <= ?
       ORDER BY start_time ASC`,
      [pastTimeStr, futureTimeStr]
    )
    for (const event of events) {
      const eventStart = new Date(event.start_time)
      
      // 解析提醒规则 (JSON数组，例如 [5, 15, 30] 表示提前5分钟、15分钟、30分钟)
      let reminderMinutes = []
      if (event.reminder_rules) {
        try {
          reminderMinutes = JSON.parse(event.reminder_rules)
        } catch (e) {
          // 兼容旧格式：单个数字
          if (event.reminder_minutes) {
            reminderMinutes = [event.reminder_minutes]
          }
        }
      } else if (event.reminder_minutes) {
        reminderMinutes = [event.reminder_minutes]
      }
      // 检查是否是重复日程
      const isRepeating = !!event.repeat_rule
      
      // 对于非重复日程，检查是否已提醒过
      if (!isRepeating && event.reminder_sent === 1) {
        continue
      }
      
      // 检查每个提醒时间点
      for (const minutes of reminderMinutes) {
        const reminderTime = new Date(eventStart.getTime() - minutes * 60 * 1000)
        const timeDiff = reminderTime - now
        // 如果提醒时间在当前时间的±5分钟内，且未提醒过
        if (Math.abs(timeDiff) <= 5 * 60 * 1000) {
          // 对于重复日程，使用日期作为 key（每天只提醒一次）
          if (isRepeating) {
            const todayStr = now.toISOString().split('T')[0]
            const itemKey = `event:repeat:${event.id}:${minutes}:${todayStr}`
            
            if (!notifiedItems.has(itemKey)) {
              await triggerEventReminder(event, minutes)
              notifiedItems.add(itemKey)
            }
          } else {
            // 非重复日程，触发提醒并标记到数据库
            await triggerEventReminder(event, minutes)
            
            // 标记为已提醒（持久化到数据库）
            await db.execute(
              'UPDATE calendar_events SET reminder_sent = 1 WHERE id = ?',
              [event.id]
            )
            break // 一旦提醒过，不再检查其他提醒时间点
          }
        }
      }
    }
    
    // 清理过期的内存记录（重复日程的记录，只保留今天的）
    const todayStr = now.toISOString().split('T')[0]
    for (const key of notifiedItems) {
      if (key.startsWith('event:repeat:')) {
        const parts = key.split(':')
        const dateStr = parts[parts.length - 1]
        if (dateStr && dateStr < todayStr) {
          notifiedItems.delete(key)
        }
      }
    }
  } catch (error) {
    // ignore
  }
}

/**
 * 触发待办提醒
 */
async function triggerTodoReminder(todo, message) {
  const config = await getReminderConfig()
  
  let fullMessage = message
  if (todo.description) {
    fullMessage = fullMessage + '\n' + todo.description
  }
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date)
    const dateStr = dueDate.toLocaleDateString('zh-CN')
    fullMessage = fullMessage + '\n' + '截止: ' + dateStr
  }
  
  await CustomNotification.showCustomNotification({
    title: '[待办] ' + todo.title,
    message: fullMessage,
    type: todo.priority === 2 ? 'error' : todo.priority === 1 ? 'warning' : 'info',
    duration: 15000,
    position: config.position || 'bottomRight',
    positionType: config.positionType || 'screen',
    taskbarMargin: 80
  })
}

/**
 * 触发日程提醒
 */
async function triggerEventReminder(event, reminderMinutes) {
  const config = await getReminderConfig()
  
  const startTime = new Date(event.start_time)
  const hours = startTime.getHours().toString().padStart(2, '0')
  const minutes = startTime.getMinutes().toString().padStart(2, '0')
  const timeStr = hours + ':' + minutes
  
  let message = ''
  if (reminderMinutes > 0) {
    message = '提前 ' + reminderMinutes + ' 分钟提醒\n'
  }
  message = message + '时间: ' + timeStr + '\n'
  
  if (event.location) {
    message = message + '地点: ' + event.location + '\n'
  }
  if (event.description) {
    message = message + event.description
  }
  
  await CustomNotification.showCustomNotification({
    title: '[日程] ' + event.title,
    message: message,
    type: 'info',
    duration: 20000,
    position: config.position || 'bottomRight',
    positionType: config.positionType || 'screen',
    taskbarMargin: 80
  })
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  if (days < 0) return `${Math.abs(days)}天前`
  if (days < 7) return `${days}天后`
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取提醒配置
 */
async function getReminderConfig() {
  try {
    const config = localStorage.getItem('reminder_config')
    if (config) {
      return JSON.parse(config)
    }
  } catch (error) {
  }
  
  return {
    position: 'bottomRight',
    positionType: 'screen'
  }
}

/**
 * 保存提醒配置
 */
export async function saveReminderConfig(config) {
  try {
    localStorage.setItem('reminder_config', JSON.stringify(config))
  } catch (error) {
    throw error
  }
}
