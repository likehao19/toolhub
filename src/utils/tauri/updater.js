/**
 * Updater API 封装
 */

import { check } from '@tauri-apps/plugin-updater'
import { ElMessage } from 'element-plus'

/**
 * 检查更新
 * @returns {Promise<import('@tauri-apps/plugin-updater').Update>|null>}
 */
export async function checkUpdate() {
  try {
    const update = await check()
    if (update?.available) {
      ElMessage.info(`发现新版本: ${update.version}`)
    } else {
      ElMessage.success('已是最新版本')
    }
    return update
  } catch (error) {
    ElMessage.error('检查更新失败')
    throw error
  }
}

/**
 * 安装更新
 * @param {import('@tauri-apps/plugin-updater').Update} update - 更新对象
 * @returns {Promise<void>}
 */
export async function installUpdate(update) {
  try {
    await update.downloadAndInstall()
    ElMessage.success('更新安装成功，请重启应用')
  } catch (error) {
    ElMessage.error('安装更新失败')
    throw error
  }
}

