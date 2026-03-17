/**
 * Autostart API 封装
 */

import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'

/**
 * 启用开机自启
 */
export async function enableAutostart() {
  try {
    await enable()
    return true
  } catch (error) {
    return false
  }
}

/**
 * 禁用开机自启
 */
export async function disableAutostart() {
  try {
    await disable()
    return true
  } catch (error) {
    return false
  }
}

/**
 * 检查是否已启用开机自启
 */
export async function checkAutostart() {
  try {
    return await isEnabled()
  } catch (error) {
    return false
  }
}

/**
 * 切换开机自启状态
 */
export async function toggleAutostart(enabled) {
  if (enabled) {
    return await enableAutostart()
  } else {
    return await disableAutostart()
  }
}

export default {
  enableAutostart,
  disableAutostart,
  checkAutostart,
  toggleAutostart,
}

