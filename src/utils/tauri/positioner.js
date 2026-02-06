/**
 * Positioner API 封装
 */

import { moveWindow, Position } from '@tauri-apps/plugin-positioner'

/**
 * 位置映射表：将字符串位置映射到 Position 枚举
 */
const positionMap = {
  'topLeft': Position.TopLeft,
  'topRight': Position.TopRight,
  'bottomLeft': Position.BottomLeft,
  'bottomRight': Position.BottomRight,
  'topCenter': Position.TopCenter,
  'bottomCenter': Position.BottomCenter,
  'leftCenter': Position.LeftCenter,
  'rightCenter': Position.RightCenter,
  'center': Position.Center,
  'trayLeft': Position.TrayLeft,
  'trayBottomLeft': Position.TrayBottomLeft,
  'trayRight': Position.TrayRight,
  'trayBottomRight': Position.TrayBottomRight,
  'trayCenter': Position.TrayCenter,
  'trayBottomCenter': Position.TrayBottomCenter
}

/**
 * 检查是否是托盘位置
 */
function isTrayPosition(position) {
  const trayPositions = [
    Position.TrayLeft,
    Position.TrayBottomLeft,
    Position.TrayRight,
    Position.TrayBottomRight,
    Position.TrayCenter,
    Position.TrayBottomCenter
  ]
  return trayPositions.includes(position)
}

/**
 * 检查是否是托盘位置
 */
function isTrayPositionString(positionStr) {
  return positionStr && positionStr.startsWith('tray')
}

/**
 * 将窗口移动到指定位置
 * @param {string|Position} position - 位置字符串或 Position 枚举值
 * @returns {Promise<void>}
 */
export async function moveWindowTo(position) {
  try {
    // 如果是字符串，转换为 Position 枚举
    const positionEnum = typeof position === 'string' 
      ? positionMap[position] 
      : position
    
    if (positionEnum === undefined) {
      throw new Error(`未知的位置: ${position}`)
    }
    
    // 检查是否是托盘位置字符串
    if (typeof position === 'string' && isTrayPositionString(position)) {
      // 托盘位置可能不被支持，先尝试调用
      try {
        await moveWindow(positionEnum)
      } catch (trayError) {
        // 检查是否是平台不支持的错误
        const errorMsg = trayError.message || String(trayError)
        if (errorMsg.includes('expected one of: 0, 1, 2, 3, 4, 5, 6, 7, 8')) {
          throw new Error('托盘位置功能在当前平台不可用。托盘位置需要系统托盘支持，且某些平台可能不支持此功能。')
        }
        throw trayError
      }
    } else {
      // 非托盘位置，直接调用
      await moveWindow(positionEnum)
    }
  } catch (error) {
    throw error
  }
}

// 导出 Position 枚举供外部使用
export { Position }

