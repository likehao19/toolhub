/**
 * 窗口管理 Composable
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { windowApi } from '@/api'
import { WINDOW_CONFIG } from '@/constants'

/**
 * 使用窗口管理功能
 * @returns {Object} 窗口管理相关的状态和方法
 */
export function useWindow() {
  const childWindowUrl = ref(WINDOW_CONFIG.DEFAULT_CHILD_URL)
  const creatingWindow = ref(false)

  /**
   * 创建子窗口
   */
  const createChildWindow = async () => {
    if (!childWindowUrl.value || childWindowUrl.value.trim() === '') {
      ElMessage.warning('请输入有效的URL')
      return
    }

    creatingWindow.value = true
    try {
      const windowLabel = await windowApi.createChildWindow(childWindowUrl.value)
      ElMessage.success(`已打开新窗口: ${windowLabel}`)
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      creatingWindow.value = false
    }
  }

  /**
   * 隐藏窗口到托盘
   */
  const hideToTray = async () => {
    try {
      await windowApi.hide()
      ElMessage.success('窗口已最小化到托盘')
    } catch (error) {
      ElMessage.error(error.message)
    }
  }

  /**
   * 显示窗口
   */
  const showWindow = async () => {
    try {
      await windowApi.show()
      ElMessage.success('窗口已显示')
    } catch (error) {
      ElMessage.error(error.message)
    }
  }

  return {
    // 状态
    childWindowUrl,
    creatingWindow,

    // 方法
    createChildWindow,
    hideToTray,
    showWindow,
  }
}
