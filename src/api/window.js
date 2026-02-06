/**
 * Tauri 窗口 API 封装
 */

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * 窗口 API
 */
export const windowApi = {
  /**
   * 创建子窗口
   * @param {string} url - 要打开的 URL
   * @returns {Promise<string>} 窗口标签
   */
  async createChildWindow(url) {
    if (!url || !url.trim()) {
      throw new Error('URL 不能为空')
    }

    // 确保 URL 以 http:// 或 https:// 开头
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    try {
      const windowLabel = await invoke('create_child_window', { url: normalizedUrl })
      return windowLabel
    } catch (error) {
      throw new Error(`创建窗口失败: ${error}`)
    }
  },

  /**
   * 处理窗口关闭行为
   * @param {'minimize' | 'exit'} action - 关闭动作
   * @returns {Promise<void>}
   */
  async handleCloseAction(action) {
    try {
      await invoke('handle_close_action', { action })
    } catch (error) {
      throw new Error(`处理关闭动作失败: ${error}`)
    }
  },

  /**
   * 关闭启动窗口
   * @returns {Promise<void>}
   */
  async closeSplashscreen() {
    try {
      await invoke('close_splashscreen')
    } catch (error) {
      throw new Error(`关闭启动窗口失败: ${error}`)
    }
  },

  /**
   * 隐藏当前窗口
   * @returns {Promise<void>}
   */
  async hide() {
    try {
      const window = getCurrentWebviewWindow()
      await window.hide()
    } catch (error) {
      throw new Error(`隐藏窗口失败: ${error}`)
    }
  },

  /**
   * 显示当前窗口
   * @returns {Promise<void>}
   */
  async show() {
    try {
      const window = getCurrentWebviewWindow()
      await window.show()
      await window.setFocus()
    } catch (error) {
      throw new Error(`显示窗口失败: ${error}`)
    }
  },
}
