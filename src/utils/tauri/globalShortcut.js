/**
 * 全局快捷方式 API 封装
 */

import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { ElMessage } from 'element-plus'

/**
 * 注册全局快捷键
 * @param {string} shortcut - 快捷键（例如: 'CommandOrControl+Shift+C'）
 * @param {Function} handler - 处理函数
 * @returns {Promise<void>}
 */
export async function registerShortcut(shortcut, handler) {
  try {
    await register(shortcut, handler)
    ElMessage.success(`快捷键 ${shortcut} 注册成功`)
  } catch (error) {
    ElMessage.error('注册失败')
    throw error
  }
}

/**
 * 取消注册全局快捷键
 * @param {string} shortcut - 快捷键
 * @returns {Promise<void>}
 */
export async function unregisterShortcut(shortcut) {
  try {
    await unregister(shortcut)
    ElMessage.success(`快捷键 ${shortcut} 取消注册成功`)
  } catch (error) {
    ElMessage.error('取消注册失败')
    throw error
  }
}

/**
 * 取消注册所有全局快捷键
 * @returns {Promise<void>}
 */
export async function unregisterAllShortcuts() {
  try {
    await unregisterAll()
    ElMessage.success('所有快捷键已取消注册')
  } catch (error) {
    ElMessage.error('取消注册失败')
    throw error
  }
}

