/**
 * 全文搜索工具
 */

import Fuse from 'fuse.js'
import * as notesAPI from '@/utils/notes'
import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 搜索笔记
 */
export async function searchNotes(query, options = {}) {
  try {
    const notes = await notesAPI.listNotes()
    
    if (!query || !query.trim()) {
      return notes.map(note => ({
        item: note,
        matches: [],
        score: 0
      }))
    }
    
    const fuse = new Fuse(notes, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'name', weight: 0.3 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true
    })
    
    const results = fuse.search(query)
    
    // 如果启用内容搜索，也搜索笔记内容
    if (options.searchContent !== false) {
      const contentResults = []
      for (const note of notes) {
        try {
          const content = await notesAPI.readNote(note.name)
          if (content.toLowerCase().includes(query.toLowerCase())) {
            const existing = results.find(r => r.item.name === note.name)
            if (!existing) {
              contentResults.push({
                item: note,
                matches: [{
                  key: 'content',
                  value: content,
                  indices: findIndices(content, query)
                }],
                score: 0.5
              })
            }
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
      results.push(...contentResults)
    }
    
    return results.sort((a, b) => a.score - b.score)
  } catch (error) {
    return []
  }
}

/**
 * 查找文本中的匹配索引
 */
function findIndices(text, query) {
  const indices = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let index = 0
  
  while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
    indices.push([index, index + query.length - 1])
    index += query.length
  }
  
  return indices
}

/**
 * 高亮搜索结果
 */
export function highlightSearchResult(text, query) {
  if (!query || !text) return text
  
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 保存搜索历史
 */
export async function saveSearchHistory(query, filters, module) {
  try {
    const db = await getDatabase()
    await db.execute(
      'INSERT INTO search_history (query, filters, module, created_at) VALUES (?, ?, ?, ?)',
      [query, JSON.stringify(filters || {}), module || 'notes', new Date().toISOString()]
    )
  } catch (e) { /* ignore */ }
}

/**
 * 获取搜索历史
 */
export async function getSearchHistory(module = 'notes', limit = 10) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM search_history WHERE module = ? ORDER BY created_at DESC LIMIT ?',
      [module, limit]
    )
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 保存搜索条件
 */
export async function saveSearch(name, query, filters, module) {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    await db.execute(
      'INSERT INTO saved_searches (name, query, filters, module, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, query, JSON.stringify(filters || {}), module || 'notes', now, now]
    )
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 获取保存的搜索
 */
export async function getSavedSearches(module = 'notes') {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM saved_searches WHERE module = ? ORDER BY updated_at DESC',
      [module]
    )
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 删除保存的搜索
 */
export async function deleteSavedSearch(searchId) {
  try {
    const db = await getDatabase()
    await db.execute('DELETE FROM saved_searches WHERE id = ?', [searchId])
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 跨模块搜索
 */
export async function globalSearch(query, options = {}) {
  const modules = options.modules || ['notes', 'todos', 'bookmarks', 'passwords', 'events']
  const results = {
    notes: [],
    todos: [],
    bookmarks: [],
    passwords: [],
    events: []
  }
  
  if (!query || !query.trim()) {
    return results
  }
  
  try {
    // 搜索笔记
    if (modules.includes('notes')) {
      try {
        const noteResults = await searchNotes(query, options)
        results.notes = noteResults.map(r => ({
          ...r,
          type: 'note',
          module: 'notes'
        }))
      } catch (e) { /* ignore */ }
    }
    
    // 搜索待办
    if (modules.includes('todos')) {
      try {
        const db = await getDatabase()
        const todos = await db.select('SELECT * FROM todos WHERE parent_id IS NULL')
        const fuse = new Fuse(todos, {
          keys: [
            { name: 'title', weight: 0.7 },
            { name: 'description', weight: 0.3 }
          ],
          threshold: 0.4,
          includeScore: true,
          includeMatches: true
        })
        const todoResults = fuse.search(query)
        results.todos = todoResults.map(r => ({
          ...r,
          type: 'todo',
          module: 'todos'
        }))
      } catch (e) { /* ignore */ }
    }
    
    // 搜索书签
    if (modules.includes('bookmarks')) {
      try {
        const db = await getDatabase()
        const bookmarks = await db.select('SELECT * FROM bookmarks')
        const fuse = new Fuse(bookmarks, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'url', weight: 0.3 },
            { name: 'description', weight: 0.2 }
          ],
          threshold: 0.4,
          includeScore: true,
          includeMatches: true
        })
        const bookmarkResults = fuse.search(query)
        results.bookmarks = bookmarkResults.map(r => ({
          ...r,
          type: 'bookmark',
          module: 'bookmarks'
        }))
      } catch (e) { /* ignore */ }
    }
    
    // 搜索密码
    if (modules.includes('passwords')) {
      try {
        const db = await getDatabase()
        const passwords = await db.select('SELECT id, title, username, website, notes, created_at, updated_at FROM passwords')
        const fuse = new Fuse(passwords, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'username', weight: 0.3 },
            { name: 'website', weight: 0.2 },
            { name: 'notes', weight: 0.1 }
          ],
          threshold: 0.4,
          includeScore: true,
          includeMatches: true
        })
        const passwordResults = fuse.search(query)
        results.passwords = passwordResults.map(r => ({
          ...r,
          type: 'password',
          module: 'passwords'
        }))
      } catch (e) { /* ignore */ }
    }
    
    // 搜索日程
    if (modules.includes('events')) {
      try {
        const db = await getDatabase()
        const events = await db.select('SELECT * FROM calendar_events')
        const fuse = new Fuse(events, {
          keys: [
            { name: 'title', weight: 0.6 },
            { name: 'description', weight: 0.3 },
            { name: 'location', weight: 0.1 }
          ],
          threshold: 0.4,
          includeScore: true,
          includeMatches: true
        })
        const eventResults = fuse.search(query)
        results.events = eventResults.map(r => ({
          ...r,
          type: 'event',
          module: 'events'
        }))
      } catch (e) { /* ignore */ }
    }
    
    // 保存搜索历史
    if (options.saveHistory !== false) {
      try {
        await saveSearchHistory(query, {}, 'global')
      } catch (error) {
        // 忽略保存历史失败
      }
    }
    
    return results
  } catch (error) {
    return results
  }
}

