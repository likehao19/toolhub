/**
 * 剪贴板 API 封装
 */

import { writeText as tauriWriteText, readText as tauriReadText } from '@tauri-apps/plugin-clipboard-manager'
import { ElMessage } from 'element-plus'

/**
 * 写入文本到剪贴板
 * @param {string} text - 要写入的文本
 */
export async function write(text) {
  try {
    await tauriWriteText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('写入剪贴板失败')
    throw error
  }
}

/**
 * 从剪贴板读取文本
 * @returns {Promise<string>} - 剪贴板文本
 */
export async function read() {
  try {
    return await tauriReadText() || ''
  } catch (error) {
    ElMessage.error('读取剪贴板失败')
    return ''
  }
}

/**
 * 写入文本到剪贴板（不显示成功消息）
 * @param {string} text - 要写入的文本
 */
export async function writeText(text) {
  try {
    await tauriWriteText(text)
  } catch (error) {
    ElMessage.error('写入剪贴板失败')
    throw error
  }
}

/**
 * 从剪贴板读取文本
 * @returns {Promise<string>} - 剪贴板文本
 */
export async function readText() {
  try {
    return await tauriReadText() || ''
  } catch (error) {
    ElMessage.error('读取剪贴板失败')
    return ''
  }
}

export default {
  write,
  read,
  writeText,
  readText
}
