/**
 * Autostart API 封装
 *
 * 注意：以前各方法用 try-catch 把 plugin 抛的错吞成布尔值，导致调用方看不到
 * 具体错误（permission denied / executable path 不可用 / OS 拒绝注册等），
 * 现在改为直接传出，由调用方统一 console.error + UI 提示。
 */

import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'

/** 启用开机自启（失败时抛错由调用方处理） */
export async function enableAutostart() {
  await enable()
  return true
}

/** 禁用开机自启（失败时抛错由调用方处理） */
export async function disableAutostart() {
  await disable()
  return true
}

/** 检查是否已启用开机自启（失败时返回 false 而非抛错；用于无副作用的状态查询） */
export async function checkAutostart() {
  try {
    return await isEnabled()
  } catch (error) {
    console.warn('[Autostart] checkAutostart failed:', error)
    return false
  }
}

/** 切换开机自启状态 */
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

