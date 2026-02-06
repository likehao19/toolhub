/**
 * 通知 API 封装
 */

import { sendNotification, isPermissionGranted, requestPermission as requestPermissionFromPlugin } from '@tauri-apps/plugin-notification'
import { ElMessage } from 'element-plus'

/**
 * 发送系统通知
 * @param {Object} options - 通知选项
 * @param {string} options.title - 通知标题
 * @param {string} options.body - 通知内容
 * @param {string} [options.icon] - 通知图标
 */
export async function send(options) {
  try {
    // 检查权限
    let permissionGranted = await isPermissionGranted()

    if (!permissionGranted) {
      const permission = await requestPermissionFromPlugin()
      permissionGranted = permission === 'granted'
    }

    if (permissionGranted) {
      await sendNotification(options)
    } else {
      ElMessage.warning('通知权限未授予')
    }
  } catch (error) {
    ElMessage.error('发送通知失败')
  }
}

/**
 * 检查通知权限
 * @returns {Promise<boolean>}
 */
export async function checkPermission() {
  try {
    return await isPermissionGranted()
  } catch (error) {
    return false
  }
}

/**
 * 请求通知权限
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  try {
    const permission = await requestPermissionFromPlugin()
    return permission === 'granted'
  } catch (error) {
    return false
  }
}

/**
 * 请求通知权限（别名方法，保持兼容性）
 * @returns {Promise<boolean>}
 */
export async function requestPermission() {
  return await requestNotificationPermission()
}

export default {
  send,
  checkPermission,
  requestPermission,
  requestNotificationPermission
}
