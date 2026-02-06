/**
 * 笔记元数据管理工具
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
 * 获取笔记元数据
 */
export async function getNoteMetadata(noteName) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM note_metadata WHERE note_name = ?',
      [noteName]
    )
    return result && result.length > 0 ? result[0] : null
  } catch (error) {
    return null
  }
}

/**
 * 保存笔记元数据
 */
export async function saveNoteMetadata(noteName, metadata) {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    const existing = await getNoteMetadata(noteName)
    
    if (existing) {
      // 更新
      await db.execute(
        'UPDATE note_metadata SET tags = ?, category = ?, category_color = ?, updated_at = ? WHERE note_name = ?',
        [
          JSON.stringify(metadata.tags || []),
          metadata.category || null,
          metadata.categoryColor || null,
          now,
          noteName
        ]
      )
    } else {
      // 创建
      await db.execute(
        'INSERT INTO note_metadata (note_name, tags, category, category_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          noteName,
          JSON.stringify(metadata.tags || []),
          metadata.category || null,
          metadata.categoryColor || null,
          now,
          now
        ]
      )
    }
    
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 获取所有标签
 */
export async function getAllTags(category = null) {
  try {
    const db = await getDatabase()
    let query = 'SELECT * FROM tags WHERE category = ? OR category IS NULL ORDER BY usage_count DESC, name ASC'
    let params = [category || 'notes']
    
    if (!category) {
      query = 'SELECT * FROM tags ORDER BY usage_count DESC, name ASC'
      params = []
    }
    
    const result = await db.select(query, params)
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 创建或更新标签
 */
export async function saveTag(tag) {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 检查标签是否存在
    const existing = await db.select(
      'SELECT * FROM tags WHERE name = ? AND category = ?',
      [tag.name, tag.category || 'notes']
    )
    
    if (existing && existing.length > 0) {
      // 更新使用次数
      await db.execute(
        'UPDATE tags SET usage_count = usage_count + 1, color = ? WHERE name = ? AND category = ?',
        [tag.color || null, tag.name, tag.category || 'notes']
      )
    } else {
      // 创建新标签
      await db.execute(
        'INSERT INTO tags (name, color, category, usage_count, created_at) VALUES (?, ?, ?, 1, ?)',
        [tag.name, tag.color || null, tag.category || 'notes', now]
      )
    }
    
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 删除标签
 */
export async function deleteTag(tagName, category = 'notes') {
  try {
    const db = await getDatabase()
    await db.execute(
      'DELETE FROM tags WHERE name = ? AND category = ?',
      [tagName, category]
    )
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 获取所有分类
 */
export async function getAllCategories() {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT DISTINCT category, category_color FROM note_metadata WHERE category IS NOT NULL'
    )
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 按标签筛选笔记
 */
export async function getNotesByTag(tagName) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM note_metadata WHERE tags LIKE ?',
      [`%"${tagName}"%`]
    )
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 按分类筛选笔记
 */
export async function getNotesByCategory(category) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM note_metadata WHERE category = ?',
      [category]
    )
    return result || []
  } catch (error) {
    return []
  }
}

