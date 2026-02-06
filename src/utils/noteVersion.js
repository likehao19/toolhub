/**
 * 笔记版本历史管理工具
 */

import Database from '@tauri-apps/plugin-sql'
import * as notesAPI from '@/utils/notes'
import CryptoJS from 'crypto-js'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 计算内容哈希
 */
function calculateContentHash(content) {
  return CryptoJS.SHA256(content).toString()
}

/**
 * 保存笔记版本
 */
export async function saveNoteVersion(noteName, content, changeSummary = null) {
  try {
    const db = await getDatabase()
    const contentHash = calculateContentHash(content)
    
    // 检查是否与最新版本相同
    const latestVersion = await getLatestVersion(noteName)
    if (latestVersion && latestVersion.content_hash === contentHash) {
      return false // 内容未变化，不需要保存新版本
    }
    
    // 获取下一个版本号
    const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1
    
    // 只保存最近 20 个版本的完整内容，旧版本只保留哈希
    const allVersions = await getNoteVersions(noteName)
    const keepContentCount = 20
    
    // 如果版本数超过限制，清理旧版本的完整内容
    if (allVersions.length >= keepContentCount) {
      const versionsToClean = allVersions.slice(keepContentCount - 1)
      for (const version of versionsToClean) {
        if (version.content) {
          await db.execute(
            'UPDATE note_versions SET content = NULL WHERE id = ?',
            [version.id]
          )
        }
      }
    }
    
    await db.execute(
      'INSERT INTO note_versions (note_name, version_number, content_hash, content, saved_at, change_summary) VALUES (?, ?, ?, ?, ?, ?)',
      [noteName, versionNumber, contentHash, content, new Date().toISOString(), changeSummary]
    )
    
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 获取笔记的所有版本
 */
export async function getNoteVersions(noteName) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM note_versions WHERE note_name = ? ORDER BY version_number DESC',
      [noteName]
    )
    return result || []
  } catch (error) {
    return []
  }
}

/**
 * 获取最新版本
 */
export async function getLatestVersion(noteName) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM note_versions WHERE note_name = ? ORDER BY version_number DESC LIMIT 1',
      [noteName]
    )
    return result && result.length > 0 ? result[0] : null
  } catch (error) {
    return null
  }
}

/**
 * 获取指定版本的内容
 */
export async function getVersionContent(noteName, versionNumber) {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT content, content_hash FROM note_versions WHERE note_name = ? AND version_number = ?',
      [noteName, versionNumber]
    )
    
    if (result && result.length > 0) {
      const version = result[0]
      // 如果存储了完整内容，直接返回
      if (version.content) {
        return version.content
      }
      // 如果没有存储内容，返回当前笔记内容（因为旧版本只保留哈希）
      return await notesAPI.readNote(noteName)
    }
    
    // 如果版本不存在，返回当前内容
    return await notesAPI.readNote(noteName)
  } catch (error) {
    throw error
  }
}

/**
 * 恢复笔记到指定版本
 */
export async function restoreNoteVersion(noteName, versionNumber) {
  try {
    const versions = await getNoteVersions(noteName)
    const targetVersion = versions.find(v => v.version_number === versionNumber)
    
    if (!targetVersion) {
      throw new Error('版本不存在')
    }
    
    // 获取版本内容
    const content = await getVersionContent(noteName, versionNumber)
    
    // 保存为当前笔记内容
    await notesAPI.saveNote(noteName, content)
    
    // 保存为新版本（作为恢复记录）
    await saveNoteVersion(noteName, content, `恢复到版本 ${versionNumber}`)
    
    return {
      versionNumber: targetVersion.version_number,
      savedAt: targetVersion.saved_at,
      changeSummary: targetVersion.change_summary,
      content
    }
  } catch (error) {
    throw error
  }
}

/**
 * 删除笔记版本
 */
export async function deleteNoteVersion(noteName, versionNumber) {
  try {
    const db = await getDatabase()
    await db.execute(
      'DELETE FROM note_versions WHERE note_name = ? AND version_number = ?',
      [noteName, versionNumber]
    )
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 清理旧版本（保留最近的 N 个版本）
 */
export async function cleanupOldVersions(noteName, keepCount = 10) {
  try {
    const db = await getDatabase()
    const versions = await getNoteVersions(noteName)
    
    if (versions.length <= keepCount) {
      return 0
    }
    
    const versionsToDelete = versions.slice(keepCount)
    let deletedCount = 0
    
    for (const version of versionsToDelete) {
      await deleteNoteVersion(noteName, version.version_number)
      deletedCount++
    }
    
    return deletedCount
  } catch (error) {
    throw error
  }
}

