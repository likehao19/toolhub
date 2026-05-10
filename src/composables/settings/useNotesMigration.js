/**
 * 笔记目录迁移
 *
 * Module-level singleton。
 * - 选择新目录 → 询问"移动 / 复制 / 仅改路径" → 执行迁移
 * - 进度条用 showMigrationDialog + migrationProgress + migrationStatus
 *
 * 依赖 useSettingsCore.settings.notesStoragePath 与 handleSave（持久化新路径）。
 * 通过 lazy useSettingsCore() 解循环 import。
 */

import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { t } from '@/i18n'
import { useSettingsCore } from './useSettingsCore'

const showMigrationDialog = ref(false)
const migrationProgress = ref(0)
const migrationStatus = ref('')
const migrateMode = ref('move') // 'move' / 'copy'

/** 递归列出 dir 下所有文件（绝对路径） */
async function getAllFiles(dir) {
  const { readDir, stat } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  const files = []
  try {
    const entries = await readDir(dir)
    for (const entry of entries) {
      const fullPath = await join(dir, entry.name)
      const fileStat = await stat(fullPath)
      if (fileStat.isDirectory) {
        const subFiles = await getAllFiles(fullPath)
        files.push(...subFiles)
      } else if (fileStat.isFile) {
        files.push(fullPath)
      }
    }
  } catch { /* ignore */ }
  return files
}

/** 递归删除空目录 */
async function removeEmptyDirs(dir) {
  const { readDir, remove } = await import('@tauri-apps/plugin-fs')
  try {
    const entries = await readDir(dir)
    if (entries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }
    for (const entry of entries) {
      if (entry.isDirectory) {
        const { join } = await import('@tauri-apps/api/path')
        const subDir = await join(dir, entry.name)
        await removeEmptyDirs(subDir)
      }
    }
    const updatedEntries = await readDir(dir)
    if (updatedEntries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }
    return false
  } catch {
    return false
  }
}

/** 执行文件迁移（拷贝/移动）。move 模式下返回 cleanupSource 由调用方在 saveConfig 成功后再调 */
async function migrateNotes(oldPath, newPath) {
  const { exists, mkdir, copyFile, remove } = await import('@tauri-apps/plugin-fs')
  const { join, sep } = await import('@tauri-apps/api/path')

  migrationStatus.value = t('settings.migrateCheckSource')
  if (!(await exists(oldPath))) {
    throw new Error(t('settings.migrateSourceNotExist'))
  }
  if (!(await exists(newPath))) {
    await mkdir(newPath, { recursive: true })
  }

  migrationStatus.value = t('settings.migrateScanFiles')
  const allFiles = await getAllFiles(oldPath)
  if (allFiles.length === 0) {
    migrationProgress.value = 100
    migrationStatus.value = t('settings.migrateNoFiles')
    return { cleanupSource: null }
  }

  let processedFiles = 0
  const copiedFiles = []
  for (const file of allFiles) {
    const relativePath = file.replace(oldPath, '').replace(/^[/\\]/, '')
    const targetPath = await join(newPath, relativePath)
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf(sep()))
    if (!(await exists(targetDir))) {
      await mkdir(targetDir, { recursive: true })
    }

    migrationStatus.value = migrateMode.value === 'move'
      ? t('settings.migrateMoving', { file: relativePath })
      : t('settings.migrateCopying', { file: relativePath })
    await copyFile(file, targetPath)
    copiedFiles.push(file)

    processedFiles++
    migrationProgress.value = Math.round((processedFiles / allFiles.length) * 100)
  }

  if (migrateMode.value === 'move') {
    return {
      cleanupSource: async () => {
        migrationStatus.value = t('settings.migrateCleanSource')
        for (const file of copiedFiles) {
          try { await remove(file) } catch { /* ignore */ }
        }
        try { await removeEmptyDirs(oldPath) } catch { /* ignore */ }
        migrationStatus.value = t('settings.migrateMoveComplete', { count: processedFiles })
      },
    }
  }

  migrationStatus.value = t('settings.migrateCopyComplete', { count: processedFiles })
  return { cleanupSource: null }
}

/** 包装：进度对话框 + 迁移 + 同步 settings.notesStoragePath + handleSave + cleanup */
async function performMigration(oldPath, newPath) {
  const { settings, handleSave } = useSettingsCore()
  showMigrationDialog.value = true
  migrationProgress.value = 0
  migrationStatus.value = t('settings.migratePreparing')

  const previousPath = settings.notesStoragePath
  try {
    const migrationResult = await migrateNotes(oldPath, newPath)
    settings.notesStoragePath = newPath

    const { resetNotesDir } = await import('@/utils/notes')
    resetNotesDir()

    try {
      await handleSave()
    } catch (error) {
      settings.notesStoragePath = previousPath
      resetNotesDir()
      throw error
    }

    if (migrationResult?.cleanupSource) {
      await migrationResult.cleanupSource()
    }

    window.dispatchEvent(new CustomEvent('notes-path-changed', { detail: { newPath } }))
    migrationStatus.value = migrateMode.value === 'move'
      ? t('settings.migrateDoneMove')
      : t('settings.migrateDoneCopy')

    ElMessage.success({
      message: migrateMode.value === 'move'
        ? t('settings.migrateSuccessMove')
        : t('settings.migrateSuccessCopy'),
      duration: 3000,
    })

    setTimeout(() => { showMigrationDialog.value = false }, 2000)
  } catch (error) {
    migrationStatus.value = t('settings.migrateFailed', { msg: error.message })
    ElMessage.error(t('settings.migrateFailed', { msg: error.message }))
    // dialog 配置了 :show-close="false" + close-on-press-escape="false";失败时必须自动关,
    // 否则用户被卡死,只能刷新页面。给 2.5s 让用户读到错误文案再关。
    setTimeout(() => { showMigrationDialog.value = false }, 2500)
  }
}

/** 入口：openDialog → 询问移动/复制/仅改路径 → 执行 */
async function selectNotesStoragePath() {
  const { settings, handleSave } = useSettingsCore()
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: settings.notesStoragePath,
    })

    if (selected && selected !== settings.notesStoragePath) {
      const oldPath = settings.notesStoragePath
      try {
        await ElMessageBox.confirm(
          t('settings.migrateModeMsg', { oldPath, newPath: selected }),
          t('settings.migrateModeTitle'),
          {
            confirmButtonText: t('settings.migrateMoveBtn'),
            cancelButtonText: t('settings.migrateCopyBtn'),
            distinguishCancelAndClose: true,
            showClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: false,
            type: 'warning',
            buttonSize: 'default',
          },
        )
        // 用户选"移动"
        migrateMode.value = 'move'
        await performMigration(oldPath, selected)
      } catch (action) {
        if (action === 'cancel') {
          // 用户选"复制"
          migrateMode.value = 'copy'
          await performMigration(oldPath, selected)
        } else if (action === 'close') {
          // 用户关闭弹窗：仅更改路径
          try {
            await ElMessageBox.confirm(
              t('settings.migrateOnlyPathConfirm'),
              t('settings.migrateOnlyPathTitle'),
              {
                confirmButtonText: t('settings.migrateOnlyPathBtn'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
              },
            )
            settings.notesStoragePath = selected
            const { resetNotesDir } = await import('@/utils/notes')
            resetNotesDir()
            await handleSave()
            ElMessage.warning(t('settings.migrateOnlyPathDone'))
          } catch { /* 用户取消 */ }
        }
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('settings.selectPathFailed'))
    }
  }
}

export function useNotesMigration() {
  return {
    showMigrationDialog,
    migrationProgress,
    migrationStatus,
    migrateMode,
    selectNotesStoragePath,
    performMigration,
  }
}
