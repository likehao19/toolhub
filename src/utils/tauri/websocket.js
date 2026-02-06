/**
 * WebSocket API 封装
 */

import WebSocket from '@tauri-apps/plugin-websocket'
import { ElMessage } from 'element-plus'

/**
 * 创建 WebSocket 连接
 * @param {string} url - WebSocket URL
 * @param {import('@tauri-apps/plugin-websocket').ConnectionConfig} config - 连接配置
 * @returns {Promise<import('@tauri-apps/plugin-websocket').default>}
 */
export async function connect(url, config) {
  try {
    const ws = await WebSocket.connect(url, config)
    ElMessage.success('WebSocket 连接成功')
    return ws
  } catch (error) {
    ElMessage.error('连接失败')
    throw error
  }
}

