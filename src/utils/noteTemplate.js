/**
 * 笔记模板管理工具
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
 * 获取所有模板
 * 支持按文件类型过滤
 */
export async function getAllTemplates(type = 'note', fileType = null) {
  try {
    const db = await getDatabase()
    let query = 'SELECT * FROM templates WHERE type = ?'
    let params = [type]
    
    // 如果指定了文件类型，添加过滤条件
    if (fileType) {
      query += ' AND (file_type = ? OR file_type IS NULL)'
      params.push(fileType)
    }
    
    query += ' ORDER BY updated_at DESC'
    const result = await db.select(query, params)
    return (result || []).map(t => {
      // 尝试解析内容：如果是 JSON 字符串则解析，否则直接使用
      let content = t.content
      if (content) {
        try {
          // 尝试解析为 JSON
          const parsed = JSON.parse(content)
          // 如果是对象，说明是旧格式，保持解析后的对象
          if (typeof parsed === 'object' && parsed !== null) {
            content = parsed
          } else {
            // 如果解析后不是对象，说明原始内容就是字符串，直接使用原始内容
            content = t.content
          }
        } catch (e) {
          // 解析失败，说明是普通字符串，直接使用
          content = t.content
        }
      }
      return {
        ...t,
        content: content || null
      }
    })
  } catch (error) {
    return []
  }
}

/**
 * 获取模板
 */
export async function getTemplate(templateId) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM templates WHERE id = ?',
      [templateId]
    )
    if (result && result.length > 0) {
      const template = result[0]
      // 尝试解析内容：如果是 JSON 字符串则解析，否则直接使用
      let content = template.content
      if (content) {
        try {
          const parsed = JSON.parse(content)
          if (typeof parsed === 'object' && parsed !== null) {
            content = parsed
          } else {
            content = template.content
          }
        } catch (e) {
          content = template.content
        }
      }
      return {
        ...template,
        content: content || null
      }
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * 保存模板
 * 支持文件类型字段
 */
export async function saveTemplate(template) {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 处理内容：如果是字符串直接保存，如果是对象则序列化
    let contentToSave
    if (typeof template.content === 'string') {
      // 字符串内容直接保存
      contentToSave = template.content
    } else {
      // 对象内容序列化为 JSON
      contentToSave = JSON.stringify(template.content || {})
    }
    
    if (template.id) {
      // 更新
      await db.execute(
        'UPDATE templates SET name = ?, content = ?, description = ?, file_type = ?, updated_at = ? WHERE id = ?',
        [
          template.name,
          contentToSave,
          template.description || null,
          template.file_type || null,
          now,
          template.id
        ]
      )
      return template.id
    } else {
      // 创建
      const result = await db.execute(
        'INSERT INTO templates (name, type, content, description, file_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          template.name,
          template.type || 'note',
          contentToSave,
          template.description || null,
          template.file_type || null,
          now,
          now
        ]
      )
      return result.lastInsertId
    }
  } catch (error) {
    throw error
  }
}

/**
 * 删除模板
 */
export async function deleteTemplate(templateId) {
  try {
    const db = await getDatabase()
    await db.execute('DELETE FROM templates WHERE id = ?', [templateId])
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 从模板创建笔记内容
 */
export function createNoteFromTemplate(template) {
  if (!template || !template.content) {
    return ''
  }
  
  const content = template.content
  
  // 如果模板内容是字符串，直接返回
  if (typeof content === 'string') {
    return content
  }
  
  // 如果模板内容是对象，构建 Markdown
  if (typeof content === 'object') {
    let markdown = ''
    
    if (content.title) {
      markdown += `# ${content.title}\n\n`
    }
    
    if (content.sections) {
      for (const section of content.sections) {
        if (section.type === 'heading') {
          markdown += `## ${section.title}\n\n`
        } else if (section.type === 'text') {
          markdown += `${section.content}\n\n`
        } else if (section.type === 'list') {
          for (const item of section.items || []) {
            markdown += `- ${item}\n`
          }
          markdown += '\n'
        }
      }
    }
    
    return markdown
  }
  
  return ''
}

