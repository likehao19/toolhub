/**
 * AI 操作调度模块
 * 执行各模块的创建操作
 */

import { IntentTypes } from './intent'
import Database from '@tauri-apps/plugin-sql'

/**
 * 创建笔记
 */
const createNote = async (params) => {
  const { title, content, type } = params
  const now = new Date().toISOString()
  
  // 使用Tauri文件系统API创建笔记文件
  try {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const fileName = `${title.replace(/[\/\\:*?"<>|]/g, '_')}.md`
    await writeTextFile(`notes/${fileName}`, content || `# ${title}\n\n`, { 
      baseDir: BaseDirectory.AppData 
    })
    
    // 保存元数据到数据库
    const db = await Database.load('sqlite:productivity.db')
    await db.execute(
      `INSERT OR REPLACE INTO note_metadata (note_name, title, tags, category, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fileName, title, '', type || '其他', now, now]
    )
    
    return {
      success: true,
      message: `笔记"${title}"已创建`,
      data: { title, content, type }
    }
  } catch (error) {
    throw new Error(`创建笔记失败: ${error.message}`)
  }
}

/**
 * 创建日程
 */
const createEvent = async (params) => {
  const db = await Database.load('sqlite:productivity.db')
  
  const { title, startTime, reminder } = params
  const now = new Date().toISOString()
  
  // 计算提醒时间
  const startDate = new Date(startTime)
  const endDate = new Date(startDate.getTime() + 3600000) // 默认1小时
  const reminderMinutes = reminder || 5
  
  await db.execute(
    `INSERT INTO calendar_events (title, start_time, end_time, reminder_minutes, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, startTime, endDate.toISOString(), reminderMinutes, now, now]
  )
  
  return {
    success: true,
    message: `日程"${title}"已创建，将在${new Date(startTime).toLocaleString('zh-CN')}提醒`,
    data: { title, startTime, reminder }
  }
}

/**
 * 创建密码
 */
const createPassword = async (params) => {
  const db = await Database.load('sqlite:productivity.db')
  
  let { website, username, password } = params
  
  // 如果没有提供密码，生成强密码
  if (!password) {
    password = generateStrongPassword()
  }
  
  const now = new Date().toISOString()
  
  await db.execute(
    `INSERT INTO passwords (title, website, username, password, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [website, website, username, password, now, now]
  )
  
  return {
    success: true,
    message: `密码已保存${!params.password ? '（已自动生成强密码）' : ''}`,
    data: { website, username, password }
  }
}

/**
 * 创建书签
 */
const createBookmark = async (params) => {
  const db = await Database.load('sqlite:productivity.db')
  
  let { url, title, tags } = params
  
  // 确保URL格式正确
  if (!url.startsWith('http')) {
    url = 'https://' + url
  }
  
  // 如果没有标题，尝试从URL提取
  if (!title) {
    try {
      const urlObj = new URL(url)
      title = urlObj.hostname.replace('www.', '')
    } catch {
      title = url
    }
  }
  
  const now = new Date().toISOString()
  
  await db.execute(
    `INSERT INTO bookmarks (title, url, tags, access_count, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, url, Array.isArray(tags) ? tags.join(',') : '', 0, now, now]
  )
  
  return {
    success: true,
    message: `书签"${title}"已添加`,
    data: { url, title, tags }
  }
}

/**
 * 创建待办
 */
const createTodo = async (params) => {
  const db = await Database.load('sqlite:productivity.db')
  
  const { tasks, priority, dueDate } = params
  const now = new Date().toISOString()
  
  const priorityMap = {
    high: 3,
    medium: 2,
    low: 1
  }
  
  const createdTasks = []
  
  for (const task of tasks) {
    await db.execute(
      `INSERT INTO todos (title, status, priority, due_date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task, 0, priorityMap[priority] || 2, dueDate, now, now]
    )
    createdTasks.push(task)
  }
  
  return {
    success: true,
    message: `已创建${tasks.length}个待办事项`,
    data: { tasks: createdTasks, priority, dueDate }
  }
}

/**
 * 生成强密码
 */
const generateStrongPassword = (length = 16) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * 执行操作
 * @param {string} intent - 意图类型
 * @param {Object} params - 参数对象
 * @returns {Promise<Object>} 执行结果
 */
export const executeOperation = async (intent, params) => {
  const operations = {
    [IntentTypes.CREATE_NOTE]: createNote,
    [IntentTypes.CREATE_EVENT]: createEvent,
    [IntentTypes.CREATE_PASSWORD]: createPassword,
    [IntentTypes.CREATE_BOOKMARK]: createBookmark,
    [IntentTypes.CREATE_TODO]: createTodo
  }
  
  const operation = operations[intent]
  if (!operation) {
    throw new Error('不支持的操作类型')
  }
  
  try {
    return await operation(params)
  } catch (error) {
    throw new Error(`操作失败: ${error.message}`)
  }
}
