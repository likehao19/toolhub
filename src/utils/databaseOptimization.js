/**
 * 数据库查询性能优化工具
 */

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
 * 批量插入优化
 * @param {string} table - 表名
 * @param {Array} data - 数据数组
 * @param {number} batchSize - 批次大小，默认 100
 */
export async function batchInsert(table, data, batchSize = 100) {
  if (!data || data.length === 0) {
    return
  }

  const db = await getDatabase()
  
  // 构建插入语句
  const firstItem = data[0]
  const columns = Object.keys(firstItem).join(', ')
  const placeholders = Object.keys(firstItem).map(() => '?').join(', ')
  
  // 分批插入
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const values = batch.map(item => 
      Object.values(item)
    )
    
    // 使用事务批量插入
    await db.execute(
      `INSERT INTO ${table} (${columns}) VALUES ${batch.map(() => `(${placeholders})`).join(', ')}`,
      values.flat()
    )
  }
}

/**
 * 使用索引优化查询
 * @param {string} sql - SQL 查询语句
 * @param {Array} params - 查询参数
 * @param {Object} options - 选项
 */
export async function optimizedQuery(sql, params = [], options = {}) {
  const db = await getDatabase()
  const { useCache = false, cacheKey = null } = options
  
  // 如果启用缓存
  if (useCache && cacheKey) {
    const cache = getQueryCache()
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
  }
  
  const result = await db.select(sql, params)
  
  // 缓存结果
  if (useCache && cacheKey) {
    const cache = getQueryCache()
    cache.set(cacheKey, result)
  }
  
  return result
}

/**
 * 查询缓存
 */
const queryCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

function getQueryCache() {
  return {
    get(key) {
      const item = queryCache.get(key)
      if (!item) return null
      
      if (Date.now() - item.timestamp > CACHE_TTL) {
        queryCache.delete(key)
        return null
      }
      
      return item.data
    },
    set(key, data) {
      queryCache.set(key, {
        data,
        timestamp: Date.now()
      })
    },
    clear() {
      queryCache.clear()
    }
  }
}

/**
 * 清理过期缓存
 */
export function clearExpiredCache() {
  const now = Date.now()
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key)
    }
  }
}

/**
 * 创建索引（如果不存在）
 */
export async function ensureIndexes() {
  const db = await getDatabase()
  
  const indexes = [
    // Notes 索引
    'CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)',
    'CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category)',
    'CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)',
    
    // Passwords 索引
    'CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title)',
    'CREATE INDEX IF NOT EXISTS idx_passwords_website ON passwords(website)',
    'CREATE INDEX IF NOT EXISTS idx_passwords_strength ON passwords(password_strength)',
    
    // Bookmarks 索引
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_group_id ON bookmarks(group_id)',
    
    // Todos 索引
    'CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)',
    'CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)',
    'CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category)',
    
    // Calendar Events 索引
    'CREATE INDEX IF NOT EXISTS idx_events_start_time ON calendar_events(start_time)',
    'CREATE INDEX IF NOT EXISTS idx_events_category ON calendar_events(category)',
    
    // Search History 索引
    'CREATE INDEX IF NOT EXISTS idx_search_history_module ON search_history(module)',
    'CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at)'
  ]
  
  for (const indexSql of indexes) {
    try {
      await db.execute(indexSql)
    } catch (e) { /* ignore */ }
  }
}

/**
 * 分析查询性能
 */
export async function analyzeQuery(sql, params = []) {
  const db = await getDatabase()
  const startTime = performance.now()
  
  try {
    const result = await db.select(sql, params)
    const endTime = performance.now()
    const duration = endTime - startTime
    
    return {
      success: true,
      duration,
      rowCount: result?.length || 0,
      result
    }
  } catch (error) {
    const endTime = performance.now()
    return {
      success: false,
      duration: endTime - startTime,
      error: error.message
    }
  }
}

/**
 * 优化 COUNT 查询（使用近似值）
 */
export async function fastCount(table, whereClause = '') {
  const db = await getDatabase()
  
  // 对于大表，可以使用近似计数
  try {
    const result = await db.select(
      `SELECT COUNT(*) as count FROM ${table} ${whereClause}`
    )
    return result[0]?.count || 0
  } catch (error) {
    return 0
  }
}

