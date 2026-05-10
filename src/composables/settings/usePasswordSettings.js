/**
 * 主密码与密码库统计设置
 *
 * Module-level singleton。
 * - passwordSettings: 启动时是否要求输入主密码 / 自动锁定时间
 * - passwordStats: 密码条目数 / 历史记录 / 回收站 / 是否已设主密码
 * - 修改密码 dialog 状态
 */

import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { hashPassword, verifyPassword, generateSalt } from '@/utils/masterPassword'
import { t } from '@/i18n'
import { getDatabase } from './_db'

const passwordSettings = reactive({
  requirePasswordOnStart: false,
  autoLockTime: 15,
})

/** 持久化快照（用于 dirty / 回滚） */
const savedPasswordSettings = ref(null)

const passwordStats = reactive({
  totalPasswords: 0,
  historyCount: 0,
  recycleBinCount: 0,
  hasMasterPassword: false,
})

// 修改密码 dialog
const showChangePasswordDialog = ref(false)
const oldPasswordInput = ref('')
const newPasswordInput = ref('')
const newPasswordConfirm = ref('')

// dialog 关闭时清空密码输入(ESC / 点遮罩 / 取消按钮 / 成功后均触发);
// 否则旧/新密码字符串会一直驻留在 reactive ref 里,下次打开 dialog 还能看到上次的输入。
watch(showChangePasswordDialog, (visible) => {
  if (!visible) {
    oldPasswordInput.value = ''
    newPasswordInput.value = ''
    newPasswordConfirm.value = ''
  }
})

/** 从 DB 读取 require_password_on_start 字段 */
async function loadPasswordSettings() {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT require_password_on_start FROM master_password LIMIT 1')
    if (result && result.length > 0) {
      passwordSettings.requirePasswordOnStart = result[0].require_password_on_start === 1
    }
  } catch { /* table may not exist yet */ }
}

/** 持久化 passwordSettings 到 master_password 表（不存在则建表/插入空记录） */
async function savePasswordSettings() {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS master_password (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      require_password_on_start INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  // 老库可能没这一列，尝试 ALTER 失败忽略
  try {
    await db.execute(`ALTER TABLE master_password ADD COLUMN require_password_on_start INTEGER DEFAULT 1`)
  } catch { /* column already exists */ }

  const result = await db.select('SELECT id FROM master_password ORDER BY id ASC LIMIT 1')
  if (result && result.length > 0) {
    await db.execute(
      'UPDATE master_password SET require_password_on_start = ?, updated_at = ? WHERE id = ?',
      [passwordSettings.requirePasswordOnStart ? 1 : 0, now, result[0].id],
    )
  } else {
    // 即使尚未设置主密码也允许保存"启动时是否提示"标志
    await db.execute(
      'INSERT INTO master_password (password_hash, salt, require_password_on_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['', '', passwordSettings.requirePasswordOnStart ? 1 : 0, now, now],
    )
  }
}

/** 加载密码库统计（条目数 / 历史 / 回收站 / 是否已设主密码） */
async function loadPasswordStats() {
  try {
    const db = await getDatabase()

    const passwords = await db.select(
      'SELECT COUNT(*) as count FROM passwords WHERE is_deleted = 0 OR is_deleted IS NULL',
    )
    passwordStats.totalPasswords = passwords[0]?.count || 0

    const history = await db.select('SELECT COUNT(*) as count FROM password_history')
    passwordStats.historyCount = history[0]?.count || 0

    const recycleBin = await db.select('SELECT COUNT(*) as count FROM password_recycle_bin')
    passwordStats.recycleBinCount = recycleBin[0]?.count || 0

    const masterPassword = await db.select('SELECT COUNT(*) as count FROM master_password')
    passwordStats.hasMasterPassword = (masterPassword[0]?.count || 0) > 0
  } catch { /* tables may not exist on first run */ }
}

/** 修改主密码：验证旧密码 → 生成新 hash → UPDATE */
async function changePassword() {
  if (!oldPasswordInput.value) {
    ElMessage.warning(t('settings.enterOldPwd'))
    return
  }
  if (!newPasswordInput.value || newPasswordInput.value.length < 6) {
    ElMessage.warning(t('settings.newPwdMinLength'))
    return
  }
  if (newPasswordInput.value !== newPasswordConfirm.value) {
    ElMessage.warning(t('settings.newPwdMismatch'))
    return
  }

  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')
    if (!result || result.length === 0) {
      ElMessage.error(t('settings.masterPwdNotFound'))
      return
    }

    const { password_hash, salt } = result[0]
    if (!verifyPassword(oldPasswordInput.value, password_hash, salt)) {
      ElMessage.error(t('settings.oldPwdWrong'))
      return
    }

    const newSalt = generateSalt()
    const newHash = hashPassword(newPasswordInput.value, newSalt)
    const now = new Date().toISOString()
    // 用 result[0].id 而非硬编码 1:autoincrement id 在表被删/重插后可能不为 1,
    // 否则 UPDATE 影响 0 行,UI 弹"修改成功"但密码没变。
    await db.execute(
      'UPDATE master_password SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
      [newHash, newSalt, now, result[0].id],
    )

    ElMessage.success(t('settings.pwdChangeSuccess'))
    showChangePasswordDialog.value = false
    oldPasswordInput.value = ''
    newPasswordInput.value = ''
    newPasswordConfirm.value = ''
  } catch {
    ElMessage.error(t('settings.pwdChangeFailed'))
  }
}

export function usePasswordSettings() {
  return {
    passwordSettings,
    savedPasswordSettings,
    passwordStats,
    showChangePasswordDialog,
    oldPasswordInput,
    newPasswordInput,
    newPasswordConfirm,
    loadPasswordSettings,
    savePasswordSettings,
    loadPasswordStats,
    changePassword,
  }
}
