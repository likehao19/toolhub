/**
 * 存储统计：笔记、数据库、媒体文件大小
 *
 * Module-level singleton — 多次 useStorageStats() 共享同一份 reactive state。
 */

import { reactive, ref } from 'vue'

const storageStats = reactive({
  notesSize: 0,
  databaseSize: 0,
  mediaSize: 0,
  totalSize: 0,
})

const loadingStats = ref(false)

/** 递归计算目录总大小（字节） */
async function calculateDirectorySize(dirPath) {
  const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  let totalSize = 0
  try {
    if (!(await exists(dirPath))) return 0
    const entries = await readDir(dirPath)
    for (const entry of entries) {
      const entryPath = await join(dirPath, entry.name)
      try {
        const entryStat = await stat(entryPath)
        if (entryStat.isDirectory) {
          totalSize += await calculateDirectorySize(entryPath)
        } else if (entryStat.isFile) {
          totalSize += entryStat.size || 0
        }
      } catch { /* ignore single entry */ }
    }
  } catch { /* ignore dir */ }
  return totalSize
}

/** 字节数 → 易读字符串（B / KB / MB / GB） */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/** 重新计算所有存储统计 */
async function loadStorageStats() {
  loadingStats.value = true
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
    const { join, appDataDir } = await import('@tauri-apps/api/path')

    // 先清零，避免部分失败时残留旧值
    storageStats.notesSize = 0
    storageStats.databaseSize = 0
    storageStats.mediaSize = 0
    storageStats.totalSize = 0

    // 笔记目录大小
    const notesDir = await getNotesDir()
    storageStats.notesSize = await calculateDirectorySize(notesDir)

    // 数据库文件大小
    const appDir = await appDataDir()
    const dbPath = await join(appDir, 'productivity.db')
    if (await exists(dbPath)) {
      const dbStat = await stat(dbPath)
      storageStats.databaseSize = dbStat.size || 0
    }

    // 媒体：顶层 images + 各笔记子目录下的 images/videos
    let mediaSize = 0
    const imagesPath = await join(notesDir, 'images')
    if (await exists(imagesPath)) {
      mediaSize += await calculateDirectorySize(imagesPath)
    }
    try {
      const entries = await readDir(notesDir)
      for (const entry of entries) {
        if (!entry.isDirectory) continue
        const entryPath = await join(notesDir, entry.name)
        const imagesSubPath = await join(entryPath, 'images')
        const videosSubPath = await join(entryPath, 'videos')
        if (await exists(imagesSubPath)) {
          mediaSize += await calculateDirectorySize(imagesSubPath)
        }
        if (await exists(videosSubPath)) {
          mediaSize += await calculateDirectorySize(videosSubPath)
        }
      }
    } catch { /* ignore traversal failures */ }

    storageStats.mediaSize = mediaSize
    storageStats.totalSize = storageStats.notesSize + storageStats.databaseSize + storageStats.mediaSize
  } catch {
    // 自定义路径 / 权限 / 目录瞬态异常下保持静默归零，避免反复弹错误
    storageStats.notesSize = 0
    storageStats.databaseSize = 0
    storageStats.mediaSize = 0
    storageStats.totalSize = 0
  } finally {
    loadingStats.value = false
  }
}

export function useStorageStats() {
  return {
    storageStats,
    loadingStats,
    loadStorageStats,
    formatFileSize,
  }
}
