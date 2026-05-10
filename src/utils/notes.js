/**
 * 笔记管理工具
 */

import { readTextFile, writeTextFile, exists, mkdir, remove, readDir, stat } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { loadConfig } from './tauri/store'

// 获取笔记目录
let notesDir = null

async function getNotesDir() {
  if (!notesDir) {
    try {
      // 尝试从配置中读取自定义路径
      const config = await loadConfig()
      if (config && config.notesStoragePath) {
        notesDir = config.notesStoragePath
      } else {
        // 使用默认路径
        const appDir = await appDataDir()
        notesDir = await join(appDir, 'notes')
      }
    } catch (error) {
      const appDir = await appDataDir()
      notesDir = await join(appDir, 'notes')
    }
    
    // 确保目录存在
    if (!(await exists(notesDir))) {
      await mkdir(notesDir, { recursive: true })
    }
  }
  return notesDir
}

// 重置笔记目录缓存（当路径更改时调用）
export function resetNotesDir() {
  notesDir = null
}

// 导出 getNotesDir 供外部使用
export { getNotesDir }

/**
 * 获取笔记文件路径
 * 调整为支持文件夹内的笔记
 */
export async function getNotePath(noteName, folderName = null) {
  const baseDir = await getNotesDir()
  // 如果noteName已经包含扩展名，直接使用
  if (noteName.includes('.')) {
    if (folderName) {
      const folderPath = await join(baseDir, folderName)
      return await join(folderPath, noteName)
    }
    return await join(baseDir, noteName)
  }
  // 否则默认使用.md扩展名
  if (folderName) {
    const folderPath = await join(baseDir, folderName)
    return await join(folderPath, `${noteName}.md`)
  }
  return await join(baseDir, `${noteName}.md`)
}

/**
 * 获取笔记资源目录（图片、视频）
 */
async function getNoteAssetsDir(noteName) {
  const dir = await getNotesDir()
  const noteDir = await join(dir, noteName)
  if (!(await exists(noteDir))) {
    await mkdir(noteDir, { recursive: true })
  }
  return noteDir
}

// 导出 getNoteAssetsDir 供外部使用（导出/打包等）
export { getNoteAssetsDir }

/**
 * 获取图片目录
 */
async function getImagesDir(noteName) {
  const assetsDir = await getNoteAssetsDir(noteName)
  const imagesDir = await join(assetsDir, 'images')
  if (!(await exists(imagesDir))) {
    await mkdir(imagesDir, { recursive: true })
  }
  return imagesDir
}

/**
 * 获取视频目录
 */
async function getVideosDir(noteName) {
  const assetsDir = await getNoteAssetsDir(noteName)
  const videosDir = await join(assetsDir, 'videos')
  if (!(await exists(videosDir))) {
    await mkdir(videosDir, { recursive: true })
  }
  return videosDir
}

/**
 * 读取笔记内容
 * 调整为支持文件夹内的笔记和多种文件类型
 */
export async function readNote(noteName, folderName = null) {
  try {
    // 支持多种文件扩展名
    const baseDir = await getNotesDir()
    let path
    if (folderName) {
      const folderPath = await join(baseDir, folderName)
      // 尝试不同的扩展名
      const extensions = ['.md', '.txt', '.docx', '.xlsx']
      for (const ext of extensions) {
        const testPath = await join(folderPath, `${noteName}${ext}`)
        if (await exists(testPath)) {
          path = testPath
          break
        }
      }
      if (!path) {
        // 如果noteName已经包含扩展名，直接使用
        path = await join(folderPath, noteName)
      }
    } else {
      const extensions = ['.md', '.txt', '.docx', '.xlsx']
      for (const ext of extensions) {
        const testPath = await join(baseDir, `${noteName}${ext}`)
        if (await exists(testPath)) {
          path = testPath
          break
        }
      }
      if (!path) {
        // 如果noteName已经包含扩展名，直接使用
        path = await join(baseDir, noteName)
      }
    }
    
    if (path && await exists(path)) {
      // 只读取文本文件
      const ext = path.split('.').pop().toLowerCase()
      if (ext === 'md' || ext === 'txt') {
        return await readTextFile(path)
      } else {
        // 其他类型文件返回提示
        return `[暂不支持编辑 ${ext.toUpperCase()} 文件]`
      }
    }
    return ''
  } catch (error) {
    throw error
  }
}

/**
 * 创建笔记文件
 * 支持多种文件类型
 */
export async function createNote(noteName, folderName = null) {
  try {
    const baseDir = await getNotesDir()
    let path
    if (folderName) {
      const folderPath = await join(baseDir, folderName)
      if (!(await exists(folderPath))) {
        await mkdir(folderPath, { recursive: true })
      }
      // 如果noteName已经包含扩展名，直接使用
      if (noteName.includes('.')) {
        path = await join(folderPath, noteName)
      } else {
        // 默认使用.md扩展名
        path = await join(folderPath, `${noteName}.md`)
      }
    } else {
      if (noteName.includes('.')) {
        path = await join(baseDir, noteName)
      } else {
        path = await join(baseDir, `${noteName}.md`)
      }
    }
    
    // 如果文件不存在，创建空文件
    if (!(await exists(path))) {
      await writeTextFile(path, '')
    }
    
    return path
  } catch (error) {
    throw error
  }
}

/**
 * 写入笔记内容
 * 支持多种文件类型
 */
export async function writeNote(noteName, content, folderName = null) {
  try {
    const baseDir = await getNotesDir()
    let path
    if (folderName) {
      const folderPath = await join(baseDir, folderName)
      if (noteName.includes('.')) {
        path = await join(folderPath, noteName)
      } else {
        path = await join(folderPath, `${noteName}.md`)
      }
    } else {
      if (noteName.includes('.')) {
        path = await join(baseDir, noteName)
      } else {
        path = await join(baseDir, `${noteName}.md`)
      }
    }
    
    await writeTextFile(path, content)
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 保存笔记
 * 调整为支持文件夹内的笔记
 */
export async function saveNote(noteName, content, folderName = null) {
  try {
    const path = await getNotePath(noteName, folderName)
    // 如果指定了文件夹，确保文件夹存在
    if (folderName) {
      const baseDir = await getNotesDir()
      const folderPath = await join(baseDir, folderName)
      if (!(await exists(folderPath))) {
        await mkdir(folderPath, { recursive: true })
      }
    }
    await writeTextFile(path, content)
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 删除笔记
 * 支持文件夹内的笔记
 */
export async function deleteNote(noteName, folderName = null) {
  try {
    const path = await getNotePath(noteName, folderName)
    if (await exists(path)) {
      await remove(path)
    }
    
    // 删除资源目录
    const assetsDir = await getNoteAssetsDir(noteName)
    if (await exists(assetsDir)) {
      await remove(assetsDir, { recursive: true })
    }
    
    return true
  } catch (error) {
    throw error
  }
}

/**
 * 根据完整路径删除文件
 */
export async function deleteNoteByPath(filePath) {
  try {
    if (await exists(filePath)) {
      await remove(filePath)
      return true
    }
    return false
  } catch (error) {
    throw error
  }
}

/**
 * 列出所有笔记。
 * 递归扫描笔记根目录,跳过 images / ebooks / 下划线开头的系统目录,
 * 这样"文档中心"里放在子文件夹下的 .md 也能被全局搜索到。
 * 旧实现只读顶层,导致绝大多数用户的笔记搜不到。
 */
export async function listNotes() {
  try {
    const root = await getNotesDir()
    const notes = []

    const walk = async (dir, relPrefix = '') => {
      let entries
      try {
        entries = await readDir(dir)
      } catch {
        return
      }
      for (const entry of entries) {
        // 跳过隐藏 / 系统目录,避免扫到 images / ebooks / .git 等
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
        if (entry.isDirectory) {
          if (entry.name === 'images' || entry.name === 'ebooks') continue
          const sub = await join(dir, entry.name)
          const nextPrefix = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
          await walk(sub, nextPrefix)
          continue
        }
        if (!entry.name.endsWith('.md')) continue

        const noteName = entry.name.replace(/\.md$/, '')
        const path = await join(dir, entry.name)
        // name 字段保留含子目录的相对路径(不带 .md),作为唯一标识,
        // 避免不同子文件夹下的同名文件互相覆盖。
        const relName = relPrefix ? `${relPrefix}/${noteName}` : noteName

        let content = ''
        try { content = await readTextFile(path) } catch {}

        // 提取标题(第一行或第一个 # 标题)
        let title = noteName
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (trimmed.startsWith('# ')) { title = trimmed.substring(2); break }
          if (trimmed) { title = trimmed; break }
        }

        notes.push({
          name: relName,
          title,
          path,
          modified: entry.mtime || new Date()
        })
      }
    }

    await walk(root)
    return notes.sort((a, b) => new Date(b.modified) - new Date(a.modified))
  } catch {
    return []
  }
}

/**
 * 创建文件夹
 */
export async function createFolder(folderName) {
  try {
    const dir = await getNotesDir()
    const folderPath = await join(dir, folderName)
    if (!(await exists(folderPath))) {
      await mkdir(folderPath, { recursive: true })
    }
    return folderPath
  } catch (error) {
    throw error
  }
}

/**
 * 获取笔记目录结构（只读取根目录）
 */
export async function getNotesTree() {
  try {
    const dir = await getNotesDir()
    const entries = await readDir(dir)

    const tree = {
      folders: [],
      files: []
    }

    // 支持的文件扩展名
    const supportedExtensions = ['.md', '.txt', '.docx', '.xlsx']

    // 只读取根目录的文件夹和文件
    for (const entry of entries) {
      if (entry.isDirectory) {
        const folderPath = await join(dir, entry.name)
        tree.folders.push({
          name: entry.name,
          path: folderPath
        })
      } else {
        // 检查是否是支持的文件类型
        const hasSupportedExt = supportedExtensions.some(ext => entry.name.endsWith(ext))
        if (hasSupportedExt) {
          // 提取文件名（不含扩展名）和扩展名
          const ext = supportedExtensions.find(e => entry.name.endsWith(e))
          const noteName = entry.name.replace(ext, '')
          const path = await join(dir, entry.name)
          let title = noteName

          // 获取文件大小和修改时间 - 使用stat获取准确信息
          let fileSize = 0
          let fileModified = new Date()

          try {
            const fileStat = await stat(path)
            fileSize = fileStat.size || 0
            fileModified = fileStat.mtime || new Date()
          } catch (error) {
            // 如果stat失败，尝试从entry获取
            if (entry.size !== undefined && entry.size !== null) {
              fileSize = entry.size
            }
            if (entry.mtime) {
              fileModified = entry.mtime
            } else if (entry.modified) {
              fileModified = entry.modified
            }
            // 如果都失败，尝试读取文件获取大小（仅用于文本文件）
            if (fileSize === 0 && (ext === '.md' || ext === '.txt')) {
              try {
                const content = await readTextFile(path)
                fileSize = new Blob([content]).size
              } catch (e) { /* ignore */ }
            }
          }

          // 只对文本文件（.md, .txt）尝试读取标题
          if (ext === '.md' || ext === '.txt') {
            try {
              const content = await readTextFile(path)
              const lines = content.split('\n')
              for (const line of lines) {
                if (line.trim().startsWith('# ')) {
                  title = line.trim().substring(2)
                  break
                } else if (line.trim()) {
                  title = line.trim()
                  break
                }
              }
            } catch (error) {
              // 忽略读取错误
            }
          }

          tree.files.push({
            name: noteName,
            title,
            path,
            type: 'file',
            extension: ext.replace('.', ''),
            modified: fileModified,
            size: fileSize
          })
        }
      }
    }

    // 按修改时间排序文件
    tree.files.sort((a, b) => new Date(b.modified) - new Date(a.modified))

    // 按名称排序文件夹
    tree.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    return tree
  } catch (error) {
    return { folders: [], files: [] }
  }
}

/**
 * 获取笔记资源路径（用于显示图片/视频）
 */
export async function getAssetPath(noteName, assetType, assetName) {
  if (assetType === 'image') {
    const imagesDir = await getImagesDir(noteName)
    return await join(imagesDir, assetName)
  } else if (assetType === 'video') {
    const videosDir = await getVideosDir(noteName)
    return await join(videosDir, assetName)
  }
  return null
}

// 导出这些函数供外部使用
export { getImagesDir, getVideosDir }

