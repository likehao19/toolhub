/**
 * 窗口管理 API 封装
 * 提供简化的窗口控制接口
 */

import { getCurrentWindow } from '@tauri-apps/api/window'
import { ElMessage } from 'element-plus'

const appWindow = getCurrentWindow()

/**
 * 最小化窗口
 */
export async function minimize() {
  try {
    await appWindow.minimize()
  } catch (error) {
    ElMessage.error('最小化窗口失败')
  }
}

/**
 * 最大化窗口
 */
export async function maximize() {
  try {
    await appWindow.maximize()
  } catch (error) {
    ElMessage.error('最大化窗口失败')
  }
}

/**
 * 还原窗口
 */
export async function unmaximize() {
  try {
    await appWindow.unmaximize()
  } catch (error) {
    ElMessage.error('还原窗口失败')
  }
}

/**
 * 切换最大化状态
 */
export async function toggleMaximize() {
  try {
    await appWindow.toggleMaximize()
  } catch (error) {
    ElMessage.error('切换最大化状态失败')
  }
}

/**
 * 关闭窗口
 */
export async function close() {
  try {
    await appWindow.close()
  } catch (error) {
    ElMessage.error('关闭窗口失败')
  }
}

/**
 * 检查窗口是否最大化
 * @returns {Promise<boolean>}
 */
export async function isMaximized() {
  try {
    return await appWindow.isMaximized()
  } catch (error) {
    return false
  }
}

/**
 * 检查窗口是否全屏
 * @returns {Promise<boolean>}
 */
export async function isFullscreen() {
  try {
    return await appWindow.isFullscreen()
  } catch (error) {
    return false
  }
}

/**
 * 设置窗口是否置顶
 * @param {boolean} alwaysOnTop - 是否置顶
 */
export async function setAlwaysOnTop(alwaysOnTop) {
  try {
    await appWindow.setAlwaysOnTop(alwaysOnTop)
  } catch (error) {
    ElMessage.error('设置置顶失败')
  }
}

/**
 * 设置全屏
 * @param {boolean} fullscreen - 是否全屏
 */
export async function setFullscreen(fullscreen) {
  try {
    await appWindow.setFullscreen(fullscreen)
  } catch (error) {
    ElMessage.error('设置全屏失败')
  }
}

/**
 * 设置窗口大小
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
export async function setSize(width, height) {
  try {
    await appWindow.setSize({ width, height })
  } catch (error) {
    ElMessage.error('设置窗口大小失败')
  }
}

/**
 * 获取窗口大小
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getSize() {
  try {
    const size = await appWindow.innerSize()
    return { width: size.width, height: size.height }
  } catch (error) {
    return { width: 0, height: 0 }
  }
}

/**
 * 设置窗口位置
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 */
export async function setPosition(x, y) {
  try {
    await appWindow.setPosition({ x, y })
  } catch (error) {
    ElMessage.error('设置窗口位置失败')
  }
}

/**
 * 窗口居中
 */
export async function center() {
  try {
    await appWindow.center()
  } catch (error) {
    ElMessage.error('窗口居中失败')
  }
}

/**
 * 设置窗口标题
 * @param {string} title - 标题
 */
export async function setTitle(title) {
  try {
    await appWindow.setTitle(title)
  } catch (error) {
    ElMessage.error('设置窗口标题失败')
  }
}

/**
 * 设置窗口是否可调整大小
 * @param {boolean} resizable - 是否可调整大小
 */
export async function setResizable(resizable) {
  try {
    await appWindow.setResizable(resizable)
  } catch (error) {
    ElMessage.error('设置窗口可调整大小失败')
  }
}

/**
 * 监听窗口事件
 * @param {string} event - 事件名称
 * @param {Function} callback - 回调函数
 * @returns {Promise<Function>} - 返回取消监听的函数
 */
export async function onWindowEvent(event, callback) {
  try {
    return await appWindow.listen(event, callback)
  } catch (error) {
    return () => {}
  }
}

export default {
  minimize,
  maximize,
  unmaximize,
  toggleMaximize,
  close,
  isMaximized,
  isFullscreen,
  setAlwaysOnTop,
  setFullscreen,
  setSize,
  getSize,
  setPosition,
  center,
  setTitle,
  setResizable,
  onWindowEvent
}
