/**
 * 提醒（弹窗通知）设置
 *
 * Module-level singleton。`handleReminderSettingChange` 留在 useSettingsCore
 * 一并处理（统一持久化入口），这里只暴露 reactive state + load + 测试通知。
 */

import { reactive, ref } from 'vue'
import { t } from '@/i18n'

const reminderConfig = reactive({
  position: 'bottomRight',
  positionType: 'screen',
})

/** 持久化的快照，用于 syncSavedSnapshots / restoreSavedSnapshots */
const savedReminderConfig = ref(null)

/** 从 localStorage 读取并 Object.assign 到 reactive */
async function loadReminderSettings() {
  try {
    const raw = localStorage.getItem('reminder_config')
    if (raw) {
      const parsed = JSON.parse(raw)
      Object.assign(reminderConfig, parsed)
    }
  } catch { /* ignore parse / storage errors */ }
}

/** 触发一次自定义通知，按当前 position 设置展示，方便用户预览效果 */
async function testNotification() {
  try {
    const CustomNotification = await import('@/utils/tauri/customNotification')
    await CustomNotification.default.showCustomNotification({
      title: t('settings.testNotifTitle'),
      message: t('settings.testNotifMsg', { time: new Date().toLocaleString() }),
      type: 'info',
      duration: 10000,
      position: reminderConfig.position,
      positionType: reminderConfig.positionType,
    })
  } catch { /* notification subsystem may not be ready, ignore */ }
}

export function useReminderSettings() {
  return {
    reminderConfig,
    savedReminderConfig,
    loadReminderSettings,
    testNotification,
  }
}
