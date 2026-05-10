/**
 * Tauri Store API 封装
 * 用于存储和读取应用配置
 */

import { Store } from '@tauri-apps/plugin-store'

// Store 文件名
const STORE_FILE = 'settings.json'

/**
 * 默认配置
 */
const defaultConfig = {
  // 应用设置
  theme: 'light',
  language: 'zh-CN',
  autoStart: false,
  
  // 窗口设置
  windowWidth: 1200,
  windowHeight: 800,
  windowMaximized: false,
  
  // 通知设置
  enableNotifications: true,
  notificationSound: true,
  
  // 自定义通知窗口设置
  notificationWidth: 400,
  notificationHeight: 150,
  taskbarMargin: 50,
  
  // 启动动画设置
  splashAnimation: 'default', // 默认动画
  
  // Markdown 主题设置
  previewTheme: 'default',
  previewCodeTheme: 'github',
  editorPreviewTheme: 'default',
  editorCodeTheme: 'github',
  
  // 其他设置
  fontSize: 14,
  enableAnimations: true,
  darkMode: false
}

/**
 * 获取 Store 实例
 * @returns {Promise<Store>} Store 实例
 */
async function getStore() {
  return await Store.load(STORE_FILE)
}

/**
 * 加载配置
 * @returns {Promise<Object>} 配置对象
 */
export async function loadConfig() {
  try {
    const store = await getStore()
    
    // 获取所有存储的配置
    const entries = await store.entries()
    const config = { ...defaultConfig }
    
    // 用存储的值覆盖默认值
    for (const [key, value] of entries) {
      if (value !== null && value !== undefined) {
        config[key] = value
      }
    }
    
    return config
  } catch (error) {
    return defaultConfig
  }
}

/**
 * 保存配置
 * @param {Object} config - 配置对象
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  try {
    const store = await getStore()
    
    // 保存所有配置项
    for (const key in config) {
      // 跳过函数和 undefined 值
      if (typeof config[key] !== 'function' && config[key] !== undefined) {
        await store.set(key, config[key])
      }
    }
    
    // 持久化到磁盘
    await store.save()
    
  } catch (error) {
    throw error
  }
}

/**
 * 获取单个配置项
 * @param {string} key - 配置键
 * @returns {Promise<any>} 配置值
 */
export async function getConfig(key) {
  try {
    const store = await getStore()
    const value = await store.get(key)
    return value !== null && value !== undefined ? value : defaultConfig[key]
  } catch (error) {
    return defaultConfig[key]
  }
}

/**
 * 设置单个配置项
 * @param {string} key - 配置键
 * @param {any} value - 配置值
 * @returns {Promise<void>}
 */
export async function setConfig(key, value) {
  try {
    const store = await getStore()
    await store.set(key, value)
    await store.save()
  } catch (error) {
    throw error
  }
}

/**
 * 重置配置为默认值
 * @returns {Promise<void>}
 */
export async function resetConfig() {
  try {
    const store = await getStore()
    await store.clear()
    await store.save()
  } catch (error) {
    throw error
  }
}

/**
 * 获取所有配置
 * @returns {Promise<Object>} 所有配置项
 */
export async function getAllConfig() {
  try {
    const store = await getStore()
    const entries = await store.entries()
    const config = {}
    
    for (const [key, value] of entries) {
      config[key] = value
    }
    
    return config
  } catch (error) {
    return defaultConfig
  }
}

export default {
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  resetConfig,
  getAllConfig
}

