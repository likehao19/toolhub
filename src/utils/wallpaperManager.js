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

/** 获取 Bing 每日壁纸 */
export const fetchBingWallpapers = (count = 8) => invoke('fetch_bing_wallpapers', { count })

/** 下载在线壁纸并设为桌面 */
export const downloadAndSetWallpaper = (url, saveDir) =>
  invoke('download_and_set_wallpaper', { url, saveDir })
