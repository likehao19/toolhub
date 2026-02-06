/**
 * 数据库初始化和管理工具
 */

import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'

let dbInstance = null

/**
 * 获取数据库实例
 */
async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 初始化数据库
 * 创建所有必要的表
 */
import { ensureIndexes } from './databaseOptimization'

export async function initDatabase() {
  try {
    // 获取数据库实例
    const db = await getDatabase()
    
    // 直接定义表创建语句，避免 SQL 文件解析问题
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS passwords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        username TEXT,
        password TEXT NOT NULL,
        website TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_accessed_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        favicon_url TEXT,
        category TEXT,
        tags TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        access_count INTEGER DEFAULT 0,
        last_accessed_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_date TEXT,
        due_date TEXT,
        priority INTEGER DEFAULT 0,
        category TEXT,
        status INTEGER DEFAULT 0,
        parent_id INTEGER,
        progress REAL DEFAULT 0.0,
        reminder_enabled INTEGER DEFAULT 0,
        reminder_type TEXT,
        reminder_time TEXT,
        reminder_sent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        location TEXT,
        reminder_minutes INTEGER,
        reminder_rules TEXT,
        reminder_sent INTEGER DEFAULT 0,
        repeat_rule TEXT,
        repeat_end_date TEXT,
        category TEXT,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ]
    
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title)',
      'CREATE INDEX IF NOT EXISTS idx_passwords_updated_at ON passwords(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_access_count ON bookmarks(access_count)',
      'CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_todos_start_date ON todos(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)',
      'CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_sent ON calendar_events(reminder_sent)',
      'CREATE INDEX IF NOT EXISTS idx_todos_reminder ON todos(reminder_enabled, start_date, due_date)',
      'CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)'
    ]
    
    // 先执行表创建
    for (let i = 0; i < tableStatements.length; i++) {
      const statement = tableStatements[i]
      try {
        await db.execute(statement)
        const tableName = statement.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i)?.[1] || 'unknown'
      } catch (error) {
        const errorMsg = error.message || String(error)
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          const tableName = statement.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i)?.[1] || 'unknown'
        } else {
          throw error
        }
      }
    }
    
    // 创建新表（标签、模板、搜索历史等）
    const newTables = [
      `CREATE TABLE IF NOT EXISTS note_metadata (
        note_name TEXT PRIMARY KEY,
        title TEXT,
        tags TEXT,
        category TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS note_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_name TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        content TEXT,
        content_hash TEXT,
        saved_at TEXT NOT NULL DEFAULT (datetime('now')),
        change_summary TEXT,
        FOREIGN KEY (note_name) REFERENCES note_metadata(note_name) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        category TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        filters TEXT,
        module TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        query TEXT,
        filters TEXT,
        module TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS bookmark_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        order_index INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES bookmark_groups(id) ON DELETE CASCADE
      )`
    ]
    
    for (const tableSql of newTables) {
      try {
        await db.execute(tableSql)
      } catch (error) {
        if (!error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
        }
      }
    }
    
    // 验证表是否创建成功
    const tablesCheck = await db.select(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('schema_version', 'passwords', 'bookmarks', 'todos', 'calendar_events', 'search_history', 'saved_searches')"
    )
    const tableNames = tablesCheck.map(t => t.name)
    if (tableNames.length < 5) {
      const missing = ['schema_version', 'passwords', 'bookmarks', 'todos', 'calendar_events'].filter(
        name => !tableNames.includes(name)
      )
      throw new Error(`表创建不完整，只创建了 ${tableNames.length}/5 个表。缺失的表: ${missing.join(', ')}`)
    }
    
    // 再执行索引创建
    for (const statement of indexStatements) {
      try {
        await db.execute(statement)
      } catch (error) {
        const errorMsg = error.message || String(error)
        if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate')) {
        }
      }
    }
    
    // 插入初始版本
    try {
      await db.execute("INSERT OR IGNORE INTO schema_version (version) VALUES (1)")
    } catch (error) {
      // 忽略已存在的记录错误
    }
    // 执行迁移
    await runMigrations()
    
    return { success: true, message: '数据库初始化成功' }
  } catch (error) {
    throw error
  }
}

/**
 * 检查数据库是否已初始化
 */
export async function checkDatabaseInitialized() {
  try {
    const db = await getDatabase()
    
    // 检查 schema_version 表是否存在
    const schemaResult = await db.select(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    if (!schemaResult || schemaResult.length === 0) {
      return false
    }
    
    // 检查所有必需的表是否存在
    const requiredTables = ['passwords', 'bookmarks', 'todos', 'calendar_events']
    const tablesResult = await db.select(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?, ?, ?, ?)",
      requiredTables
    )
    
    // 如果缺少任何必需的表，返回 false
    if (!tablesResult || tablesResult.length < requiredTables.length) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取数据库版本
 */
export async function getDatabaseVersion() {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    )
    return result && result.length > 0 ? result[0].version : 0
  } catch (error) {
    return 0
  }
}

/**
 * 执行数据库迁移
 * 从当前版本升级到最新版本
 */
export async function runMigrations() {
  try {
    const db = await getDatabase()
    const currentVersion = await getDatabaseVersion()
    const targetVersion = 3 // 目标版本
    
    if (currentVersion >= targetVersion) {
      return
    }
    // 迁移到版本 2
    if (currentVersion < 2) {
      await migrateToVersion2(db)
    }
    
    // 迁移到版本 3
    if (currentVersion < 3) {
      await migrateToVersion3(db)
    }
  } catch (error) {
    throw error
  }
}

/**
 * 迁移到版本 2
 */
async function migrateToVersion2(db) {
  // 扩展密码表
  try {
    await db.execute('ALTER TABLE passwords ADD COLUMN password_strength INTEGER DEFAULT 0')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  try {
    await db.execute('ALTER TABLE passwords ADD COLUMN expires_at TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  try {
    await db.execute('ALTER TABLE passwords ADD COLUMN last_audit_at TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  // 扩展书签表
  try {
    await db.execute('ALTER TABLE bookmarks ADD COLUMN snapshot_path TEXT')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN snapshot_content TEXT')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN snapshot_saved_at TEXT')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN read_later INTEGER DEFAULT 0')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN read_progress REAL DEFAULT 0.0')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN group_id INTEGER')
    await db.execute('ALTER TABLE bookmarks ADD COLUMN group_path TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  // 创建书签分组表
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmark_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES bookmark_groups(id) ON DELETE CASCADE
      )
    `)
  } catch (error) {
    if (!error.message?.includes('already exists')) {
    }
  }
  
  // 扩展待办表
  try {
    await db.execute('ALTER TABLE todos ADD COLUMN dependency_ids TEXT')
    await db.execute('ALTER TABLE todos ADD COLUMN estimated_hours REAL')
    await db.execute('ALTER TABLE todos ADD COLUMN tracked_hours REAL DEFAULT 0.0')
    await db.execute('ALTER TABLE todos ADD COLUMN template_id INTEGER')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  // 扩展日程表
  try {
    await db.execute('ALTER TABLE calendar_events ADD COLUMN repeat_rule TEXT')
    await db.execute('ALTER TABLE calendar_events ADD COLUMN repeat_end_date TEXT')
    await db.execute('ALTER TABLE calendar_events ADD COLUMN category TEXT')
    await db.execute('ALTER TABLE calendar_events ADD COLUMN color TEXT')
    await db.execute('ALTER TABLE calendar_events ADD COLUMN reminder_rules TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  // 扩展版本表，添加内容字段（用于版本对比）
  try {
    await db.execute('ALTER TABLE note_versions ADD COLUMN content TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  // 创建新表
  const newTables = [
    `CREATE TABLE IF NOT EXISTS note_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_name TEXT NOT NULL UNIQUE,
      tags TEXT,
      category TEXT,
      category_color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS note_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_name TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content_hash TEXT,
      content TEXT,
      saved_at TEXT NOT NULL DEFAULT (datetime('now')),
      change_summary TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      category TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      filters TEXT,
      module TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      query TEXT,
      filters TEXT,
      module TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ]
  
  for (const tableSql of newTables) {
    try {
      await db.execute(tableSql)
    } catch (e) { /* ignore */ }
  }
  
  // 创建索引
  const newIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_passwords_strength ON passwords(password_strength)',
    'CREATE INDEX IF NOT EXISTS idx_passwords_expires_at ON passwords(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_read_later ON bookmarks(read_later)',
    'CREATE INDEX IF NOT EXISTS idx_todos_template_id ON todos(template_id)',
    'CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category)',
    'CREATE INDEX IF NOT EXISTS idx_note_metadata_note_name ON note_metadata(note_name)',
    'CREATE INDEX IF NOT EXISTS idx_note_versions_note_name ON note_versions(note_name)',
    'CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)',
    'CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type)',
    'CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)',
    'CREATE INDEX IF NOT EXISTS idx_saved_searches_module ON saved_searches(module)'
  ]
  
  for (const indexSql of newIndexes) {
    try {
      await db.execute(indexSql)
    } catch (e) { /* ignore */ }
  }
  
  // 更新版本号
  try {
    await db.execute('INSERT OR IGNORE INTO schema_version (version) VALUES (2)')
  } catch (error) {
    // 如果版本 2 已存在，更新它
    try {
      await db.execute('UPDATE schema_version SET version = 2 WHERE version < 2')
    } catch (e) { /* ignore */ }
  }
}

/**
 * 迁移到版本 3
 */
async function migrateToVersion3(db) {
  // 为待办表添加 start_date 字段
  try {
    await db.execute('ALTER TABLE todos ADD COLUMN start_date TEXT')
  } catch (error) {
    if (!error.message?.includes('duplicate column')) {
    }
  }
  
  // 创建索引以优化查询性能
  try {
    await db.execute('CREATE INDEX IF NOT EXISTS idx_todos_start_date ON todos(start_date)')
  } catch (e) { /* ignore */ }
  
  // 更新版本号
  try {
    await db.execute('INSERT OR IGNORE INTO schema_version (version) VALUES (3)')
  } catch (error) {
    // 如果版本 3 已存在，更新它
    try {
      await db.execute('UPDATE schema_version SET version = 3 WHERE version < 3')
    } catch (e) { /* ignore */ }
  }
}

