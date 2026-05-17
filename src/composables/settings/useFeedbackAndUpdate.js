/**
 * 反馈表单 + 更新检查
 *
 * Module-level singleton。
 * - feedback*: 用户反馈表单（写入 sqlite:app.db / feedback 表）
 * - update*: 检查更新（GitHub/Gitee API，自定义实现，见 src/utils/updater.js）
 */

import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { checkForUpdates } from '@/utils/updater'

// 反馈表单
const feedbackContent = ref('')
const feedbackContact = ref('')
const submittingFeedback = ref(false)

// 更新检查
const checkingUpdate = ref(false)
const updateInfo = ref('')
const updateDialogVisible = ref(false)
const updateDialogInfo = ref(null)

/** 提交反馈：写 feedback 表 */
async function submitFeedback() {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning(t('settings.fillFeedback'))
    return
  }

  submittingFeedback.value = true
  try {
    const db = await Database.load('sqlite:app.db')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        contact TEXT,
        created_at TEXT NOT NULL
      )
    `)

    const now = new Date().toISOString()
    await db.execute(
      'INSERT INTO feedback (content, contact, created_at) VALUES (?, ?, ?)',
      [feedbackContent.value.trim(), feedbackContact.value.trim(), now],
    )

    ElMessage.success(t('settings.feedbackSuccess'))
    feedbackContent.value = ''
    feedbackContact.value = ''
  } catch (error) {
    ElMessage.error(t('settings.feedbackFailed', { msg: error.message }))
  } finally {
    submittingFeedback.value = false
  }
}

/** 清空反馈表单 */
function clearFeedback() {
  feedbackContent.value = ''
  feedbackContact.value = ''
}

/** 检查更新：调后端 → 有新版弹 dialog，无新版 toast */
async function checkUpdate() {
  checkingUpdate.value = true
  updateInfo.value = ''
  try {
    const info = await checkForUpdates()
    if (info.available && info.asset) {
      updateDialogInfo.value = info
      updateDialogVisible.value = true
      updateInfo.value = t('update.newVersionAvailable', { v: info.latest_version })
    } else if (info.available && !info.asset) {
      // 有新版本但当前平台没有对应安装包
      updateDialogInfo.value = info
      updateDialogVisible.value = true
      updateInfo.value = t('update.noAssetForPlatform')
    } else {
      updateInfo.value = t('settings.alreadyLatest', { v: info.current_version })
      ElMessage.success(updateInfo.value)
    }
  } catch (e) {
    const msg = String(e?.message ?? e)
    updateInfo.value = t('settings.checkUpdateFailed')
    ElMessage.error(`${updateInfo.value}: ${msg}`)
  } finally {
    checkingUpdate.value = false
  }
}

export function useFeedbackAndUpdate() {
  return {
    feedbackContent,
    feedbackContact,
    submittingFeedback,
    checkingUpdate,
    updateInfo,
    updateDialogVisible,
    updateDialogInfo,
    submitFeedback,
    clearFeedback,
    checkUpdate,
  }
}

