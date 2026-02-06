/**
 * 进程 API 封装
 */

import { exit, relaunch } from '@tauri-apps/plugin-process'
import { platform, arch, version } from '@tauri-apps/plugin-os'
import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 退出应用
 * @param {number} exitCode - 退出代码
 */
export async function exitApp(exitCode = 0) {
  try {
    await exit(exitCode)
  } catch (e) { /* ignore */ }
}

/**
 * 重启应用
 */
export async function relaunchApp() {
  try {
    const isDev = import.meta.env.DEV
    
    if (isDev) {
      // 在开发模式下，relaunch 会导致 ERR_CONNECTION_REFUSED
      // 因为新进程启动时 Vite 服务器可能还没准备好，或者 Vite 服务器被关闭了
      // 所以在开发模式下完全禁用自动重启，只提示用户手动重启
      await ElMessageBox.alert(
        '在开发模式下，自动重启可能会导致 Vite 服务器连接问题。\n\n请手动重启应用：\n1. 关闭当前应用窗口\n2. 在终端中重新运行 `npm run tauri dev`\n\n这样可以确保 Vite 开发服务器正常运行。',
        '开发模式重启提示',
        {
          confirmButtonText: '我知道了',
          type: 'warning'
        }
      )
      // 不执行重启，直接返回
      return
    } else {
      // 生产模式下，短暂延迟后重启
      await new Promise(resolve => setTimeout(resolve, 500))
      await relaunch()
    }
  } catch (error) {
    // 用户关闭对话框，不显示错误
    if (error === 'cancel' || error.message === 'cancel') {
      return
    }
    ElMessage.error('重启应用失败: ' + (error.message || String(error)))
    throw error
  }
}

/**
 * 获取操作系统平台
 * @returns {Promise<string>}
 */
export async function getPlatform() {
  try {
    return await platform()
  } catch (error) {
    return 'unknown'
  }
}

/**
 * 获取 CPU 架构
 * @returns {Promise<string>}
 */
export async function getArch() {
  try {
    return await arch()
  } catch (error) {
    return 'unknown'
  }
}

/**
 * 获取操作系统版本
 * @returns {Promise<string>}
 */
export async function getOSVersion() {
  try {
    return await version()
  } catch (error) {
    return 'unknown'
  }
}

/**
 * 获取系统信息
 * @returns {Promise<Object>}
 */
export async function getSystemInfo() {
  try {
    const [platformInfo, archInfo, versionInfo] = await Promise.all([
      getPlatform(),
      getArch(),
      getOSVersion()
    ])

    return {
      platform: platformInfo,
      arch: archInfo,
      version: versionInfo
    }
  } catch (error) {
    return {
      platform: 'unknown',
      arch: 'unknown',
      version: 'unknown'
    }
  }
}

export default {
  exitApp,
  relaunchApp,
  getPlatform,
  getArch,
  getOSVersion,
  getSystemInfo
}
