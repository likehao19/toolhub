/**
 * 数据统计工具
 */

import Database from '@tauri-apps/plugin-sql'
import * as notesAPI from '@/utils/notes'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 获取笔记统计
 */
export async function getNotesStatistics() {
  try {
    const notes = await notesAPI.listNotes()
    const totalNotes = notes.length
    
    // 计算总字数
    let totalWords = 0
    for (const note of notes) {
      try {
        const content = await notesAPI.readNote(note.name)
        // 简单计算：去除空格和换行后的字符数
        totalWords += content.replace(/\s/g, '').length
      } catch (error) {
        // 忽略读取错误
      }
    }
    
    const avgWords = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0
    
    // 计算创建趋势（最近30天）
    const trend = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = notes.filter(note => {
        const noteDate = new Date(note.modified).toISOString().split('T')[0]
        return noteDate === dateStr
      }).length
      
      trend.push({
        date: dateStr,
        count
      })
    }
    
    return {
      totalNotes,
      totalWords,
      avgWords,
      trend
    }
  } catch (error) {
    return {
      totalNotes: 0,
      totalWords: 0,
      avgWords: 0,
      trend: []
    }
  }
}

/**
 * 获取待办统计
 */
export async function getTodosStatistics() {
  try {
    const db = await getDatabase()
    const todos = await db.select('SELECT * FROM todos')
    
    const totalTodos = todos.length
    const completedTodos = todos.filter(t => t.status === 2).length
    const completionRate = totalTodos > 0 ? (completedTodos / totalTodos * 100).toFixed(1) : 0
    
    // 计算平均完成时间（已完成的任务）
    let totalCompletionTime = 0
    let completedWithTime = 0
    for (const todo of todos) {
      if (todo.status === 2 && todo.created_at && todo.completed_at) {
        const created = new Date(todo.created_at)
        const completed = new Date(todo.completed_at)
        const hours = (completed - created) / (1000 * 60 * 60)
        totalCompletionTime += hours
        completedWithTime++
      }
    }
    const avgCompletionHours = completedWithTime > 0 ? (totalCompletionTime / completedWithTime).toFixed(1) : 0
    
    // 计算趋势（最近30天）
    const trend = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const created = todos.filter(t => {
        const todoDate = new Date(t.created_at).toISOString().split('T')[0]
        return todoDate === dateStr
      }).length
      
      const completed = todos.filter(t => {
        if (!t.completed_at) return false
        const todoDate = new Date(t.completed_at).toISOString().split('T')[0]
        return todoDate === dateStr
      }).length
      
      trend.push({
        date: dateStr,
        created,
        completed
      })
    }
    
    // 优先级分布
    const priorityDistribution = {
      high: todos.filter(t => t.priority === 2).length,
      medium: todos.filter(t => t.priority === 1).length,
      low: todos.filter(t => t.priority === 0 || !t.priority).length
    }
    
    return {
      totalTodos,
      completedTodos,
      completionRate: parseFloat(completionRate),
      avgCompletionHours: parseFloat(avgCompletionHours),
      trend,
      priorityDistribution
    }
  } catch (error) {
    return {
      totalTodos: 0,
      completedTodos: 0,
      completionRate: 0,
      avgCompletionHours: 0,
      trend: [],
      priorityDistribution: { high: 0, medium: 0, low: 0 }
    }
  }
}

/**
 * 获取日程统计
 */
export async function getEventsStatistics() {
  try {
    const db = await getDatabase()
    const events = await db.select('SELECT * FROM calendar_events')
    
    const totalEvents = events.length
    
    // 事件类型分布（按分类）
    const categoryDistribution = {}
    for (const event of events) {
      const category = event.category || '未分类'
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
    }
    
    // 日程密度（最近30天）
    const density = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = events.filter(e => {
        const eventDate = new Date(e.start_time).toISOString().split('T')[0]
        return eventDate === dateStr
      }).length
      
      density.push({
        date: dateStr,
        count
      })
    }
    
    // 最忙碌的日期
    const busiestDate = density.reduce((max, item) => 
      item.count > max.count ? item : max, 
      { date: '', count: 0 }
    )
    
    return {
      totalEvents,
      categoryDistribution,
      density,
      busiestDate
    }
  } catch (error) {
    return {
      totalEvents: 0,
      categoryDistribution: {},
      density: [],
      busiestDate: { date: '', count: 0 }
    }
  }
}

/**
 * 获取密码统计
 */
export async function getPasswordsStatistics() {
  try {
    const db = await getDatabase()
    const passwords = await db.select('SELECT * FROM passwords')
    
    const totalPasswords = passwords.length
    
    // 密码强度分布
    const strengthDistribution = {
      strong: passwords.filter(p => p.password_strength === 2).length,
      medium: passwords.filter(p => p.password_strength === 1).length,
      weak: passwords.filter(p => p.password_strength === 0 || !p.password_strength).length
    }
    
    // 过期密码数量
    const now = new Date()
    const expiredPasswords = passwords.filter(p => {
      if (!p.expires_at) return false
      return new Date(p.expires_at) < now
    }).length
    
    return {
      totalPasswords,
      strengthDistribution,
      expiredPasswords
    }
  } catch (error) {
    return {
      totalPasswords: 0,
      strengthDistribution: { strong: 0, medium: 0, weak: 0 },
      expiredPasswords: 0
    }
  }
}

/**
 * 获取所有统计
 */
export async function getAllStatistics() {
  const [notesStats, todosStats, eventsStats, passwordsStats] = await Promise.all([
    getNotesStatistics(),
    getTodosStatistics(),
    getEventsStatistics(),
    getPasswordsStatistics()
  ])
  
  return {
    notes: notesStats,
    todos: todosStats,
    events: eventsStats,
    passwords: passwordsStats
  }
}

