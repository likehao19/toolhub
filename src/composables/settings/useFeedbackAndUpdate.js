/**
 * 反馈表单 + 更新检查
 *
 * Module-level singleton。
 * - feedback*: 用户反馈表单（写入 sqlite:app.db / feedback 表）
 * - update*: 检查更新结果显示
 */

import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'

// 反馈表单
const feedbackContent = ref('')
const feedbackContact = ref('')
const submittingFeedback = ref(false)

// 更新检查
const checkingUpdate = ref(false)
const updateInfo = ref('')

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

/** 检查更新（占位：模拟延时 + 显示当前已是最新版本） */
async function checkUpdate() {
  checkingUpdate.value = true
  updateInfo.value = ''
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    updateInfo.value = t('settings.latestVersion')
  } catch {
    updateInfo.value = t('settings.checkUpdateFailed')
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
    submitFeedback,
    clearFeedback,
    checkUpdate,
  }
}
