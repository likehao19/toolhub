/**
 * 自定义通知窗口 API 封装
 */

import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'
import { loadConfig } from './store'

/**
 * 显示自定义通知窗口
 * @param {Object} options - 通知选项
 * @param {string} options.title - 通知标题
 * @param {string} options.message - 通知内容
 * @param {string} options.type - 通知类型：success, error, warning, info
 * @param {number} options.duration - 显示时长（毫秒），默认 10000
 * @param {string} options.position - 显示位置：topLeft, topRight, topCenter, bottomLeft, bottomRight, bottomCenter, leftCenter, rightCenter, center
 * @param {string} options.positionType - 位置类型：'window'（软件内位置）或 'screen'（桌面窗口位置）
 * @param {number} options.taskbarMargin - 任务栏边距（像素），默认从配置读取
 * @param {number} options.notifWidth - 通知窗口宽度（像素），默认从配置读取
 * @param {number} options.notifHeight - 通知窗口高度（像素），默认从配置读取
 * @returns {Promise<string>} 窗口标签
 */
export async function showCustomNotification(options = {}) {
  try {
    // 从配置中读取默认值
    const config = await loadConfig()
    
    const {
      title = '通知',
      message = '这是一条通知消息',
      type = 'info',
      duration = 10000,
      position = 'topRight',
      positionType = 'screen',
      taskbarMargin = config.taskbarMargin || 50,
      notifWidth = config.notificationWidth || 400,
      notifHeight = config.notificationHeight || 150
    } = options

    const windowLabel = await invoke('create_custom_notification_window', {
      title,
      message,
      notificationType: type,
      duration,
      position,
      positionType,
      taskbarMargin,
      notifWidth,
      notifHeight
    })

    return windowLabel
  } catch (error) {
    ElMessage.error('显示自定义通知失败: ' + (error.message || String(error)))
    throw error
  }
}

/**
 * 显示成功通知
 */
export async function showSuccessNotification(title, message, duration = 10000, position = 'topRight', positionType = 'screen') {
  return await showCustomNotification({ title, message, type: 'success', duration, position, positionType })
}

/**
 * 显示错误通知
 */
export async function showErrorNotification(title, message, duration = 10000, position = 'topRight', positionType = 'screen') {
  return await showCustomNotification({ title, message, type: 'error', duration, position, positionType })
}

/**
 * 显示警告通知
 */
export async function showWarningNotification(title, message, duration = 10000, position = 'topRight', positionType = 'screen') {
  return await showCustomNotification({ title, message, type: 'warning', duration, position, positionType })
}

/**
 * 显示信息通知
 */
export async function showInfoNotification(title, message, duration = 10000, position = 'topRight', positionType = 'screen') {
  return await showCustomNotification({ title, message, type: 'info', duration, position, positionType })
}

export default {
  showCustomNotification,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
}

