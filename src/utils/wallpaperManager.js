/**
 * 壁纸管理工具函数
 */
import { invoke } from '@tauri-apps/api/core'

/** 获取当前桌面壁纸路径 */
export const getCurrentWallpaper = () => invoke('get_current_wallpaper')

/** 设置桌面壁纸 */
export const setWallpaper = (path) => invoke('set_wallpaper', { path })

/** 扫描目录中的图片 */
export const scanImages = (dirPath) => invoke('scan_images', { dirPath })

/** 扫描已下载壁纸目录 */
export const scanDownloadedWallpapers = (dirPath) => invoke('scan_downloaded_wallpapers', { dirPath })

/** 获取 Bing 每日壁纸（多 market 合并去重） */
export const fetchBingWallpapers = (count = 8) => invoke('fetch_bing_wallpapers', { count })

/** 获取 Wallhaven 壁纸 */
export const fetchWallhavenWallpapers = (query = '', page = 1) =>
  invoke('fetch_wallhaven_wallpapers', { query: query || null, page })

/** 下载在线壁纸并设为桌面（旧接口，保留兼容） */
export const downloadAndSetWallpaper = (url, saveDir) =>
  invoke('download_and_set_wallpaper', { url, saveDir })

/**
 * 下载壁纸到指定路径
 * 安装包环境下统一走 Rust 后端，避免 plugin-upload 在部分客户机上失败。
 * @param {string} url - 壁纸下载地址
 * @param {string} savePath - 完整保存路径（含文件名）
 * @param {(progress: number, total: number) => void} onProgress - 进度回调
 * @returns {Promise<string>}
 */
export async function downloadWallpaper(url, savePath, onProgress) {
  if (onProgress) onProgress(0, 0)
  const savedPath = await invoke('download_wallpaper', { url, savePath })
  if (onProgress) onProgress(1, 1)
  return savedPath
}

/**
 * 从 URL 提取文件名
 * Bing URL 格式: https://www.bing.com/th?id=OHR.Name_EN-US123_1920x1080.jpg&rf=...
 * Wallhaven URL 格式: https://w.wallhaven.cc/full/xx/wallhaven-xxxx.jpg
 */
export function fileNameFromUrl(url) {
  const str = url || ''

  // Bing: 从 id= 参数提取文件名
  const idMatch = str.match(/[?&]id=([^&]+)/)
  if (idMatch) {
    const idVal = decodeURIComponent(idMatch[1])
    if (/\.\w{2,5}$/.test(idVal)) return idVal
    return idVal + '.jpg'
  }

  // 通用: 取路径最后一段
  const clean = str.split('?')[0].split('#')[0]
  const name = clean.split('/').pop() || 'wallpaper.jpg'
  if (!/\.\w{2,5}$/.test(name)) return name + '.jpg'
  return name
}
