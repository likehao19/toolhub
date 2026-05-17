/**
 * 自定义自动更新封装（不依赖 tauri-plugin-updater）
 *
 * 后端：src-tauri/src/commands/updater.rs
 * 事件：update-download-progress
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * @typedef {Object} UpdateAsset
 * @property {string} name
 * @property {string} browser_download_url
 * @property {number} size
 *
 * @typedef {Object} UpdateInfo
 * @property {boolean} available
 * @property {string}  current_version
 * @property {string}  latest_version
 * @property {string}  release_notes
 * @property {string}  release_url
 * @property {string}  published_at
 * @property {UpdateAsset|null} asset
 * @property {'github'|'gitee'} source
 *
 * @typedef {Object} DownloadProgress
 * @property {number} downloaded
 * @property {number} total
 * @property {number} percent
 * @property {number} speed_bps
 */

/** @returns {Promise<UpdateInfo>} */
export function checkForUpdates() {
  return invoke('check_for_updates')
}

/**
 * 启动下载并订阅进度。
 * @param {UpdateAsset} asset
 * @param {(p: DownloadProgress) => void} onProgress
 * @returns {Promise<string>} 本地安装包完整路径
 */
export async function downloadUpdate(asset, onProgress) {
  const unlisten = await listen('update-download-progress', (e) => {
    if (typeof onProgress === 'function') onProgress(e.payload)
  })
  try {
    return await invoke('download_update', {
      url: asset.browser_download_url,
      filename: asset.name,
    })
  } finally {
    unlisten()
  }
}

/** 取消正在进行的下载 */
export function cancelDownload() {
  return invoke('cancel_update_download')
}

/**
 * 启动安装器并退出应用。调用后应用即关闭。
 * @param {string} installerPath
 */
export function installUpdate(installerPath) {
  return invoke('install_update', { installerPath })
}

/** 字节格式化：1234567 → "1.18 MB" */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

/** 速度格式化：bytes/sec → "1.2 MB/s" */
export function formatSpeed(bps) {
  return `${formatBytes(bps)}/s`
}

/**
 * 已下载安装包缓存（module-level，单会话内有效）。
 *
 * 用途：用户点击下载后关闭对话框，再次打开时若 asset 名一致就直接进入
 * "安装"阶段，省去重复下载。文件实际是否还在由后端 install_update 兜底
 * 校验——这里只记 path/name。
 */
const _installerCache = { assetName: null, path: null }

export function setCachedInstaller(assetName, path) {
  if (!assetName || !path) return
  _installerCache.assetName = assetName
  _installerCache.path = path
}

export function getCachedInstaller(assetName) {
  if (!assetName) return null
  if (_installerCache.assetName !== assetName) return null
  return _installerCache.path
}

export function clearCachedInstaller() {
  _installerCache.assetName = null
  _installerCache.path = null
}
