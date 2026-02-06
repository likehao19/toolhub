/**
 * 系统托盘工具类
 * 封装 Tauri 系统托盘相关 API
 */

import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * 系统托盘类
 */
export class TauriTray {
  /**
   * 显示主窗口
   */
  static async showWindow() {
    try {
      const window = getCurrentWindow()
      await window.show()
      await window.setFocus()
    } catch (error) {
      throw error
    }
  }

  /**
   * 隐藏主窗口（最小化到托盘）
   */
  static async hideWindow() {
    try {
      const window = getCurrentWindow()
      await window.hide()
    } catch (error) {
      throw error
    }
  }

  /**
   * 切换窗口显示/隐藏状态
   */
  static async toggleWindow() {
    try {
      const window = getCurrentWindow()
      const isVisible = await window.isVisible()

      if (isVisible) {
        await window.hide()
      } else {
        await window.show()
        await window.setFocus()
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 检查窗口是否可见
   * @returns {Promise<boolean>}
   */
  static async isWindowVisible() {
    try {
      const window = getCurrentWindow()
      return await window.isVisible()
    } catch (error) {
      return false
    }
  }
}

// 导出默认实例
export default TauriTray
