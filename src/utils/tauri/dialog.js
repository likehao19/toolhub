/**
 * 对话框 API 封装
 */

import { open, save, message, ask, confirm } from '@tauri-apps/plugin-dialog'
import { ElMessage } from 'element-plus'

/**
 * 打开文件选择对话框
 * @param {Object} options - 选项
 * @returns {Promise<string|null>} - 返回选择的文件路径或 null
 */
export async function openFile(options = {}) {
  try {
    return await open({
      multiple: false,
      ...options
    })
  } catch (error) {
    ElMessage.error('打开文件对话框失败')
    return null
  }
}

/**
 * 打开多文件选择对话框
 * @param {Object} options - 选项
 * @returns {Promise<string[]|null>} - 返回选择的文件路径数组或 null
 */
export async function openFiles(options = {}) {
  try {
    return await open({
      multiple: true,
      ...options
    })
  } catch (error) {
    ElMessage.error('打开多文件对话框失败')
    return null
  }
}

/**
 * 打开保存文件对话框
 * @param {Object} options - 选项
 * @returns {Promise<string|null>} - 返回保存路径或 null
 */
export async function saveFile(options = {}) {
  try {
    return await save(options)
  } catch (error) {
    ElMessage.error('打开保存对话框失败')
    return null
  }
}

/**
 * 打开目录选择对话框
 * @param {Object} options - 选项
 * @returns {Promise<string|null>} - 返回目录路径或 null
 */
export async function selectFolder(options = {}) {
  try {
    return await open({
      directory: true,
      multiple: false,
      ...options
    })
  } catch (error) {
    ElMessage.error('打开目录选择对话框失败')
    return null
  }
}

/**
 * 显示消息对话框
 * @param {string} msg - 消息内容
 * @param {Object} options - 选项
 */
export async function messageDialog(msg, options = {}) {
  try {
    await message(msg, options)
  } catch (error) {
    ElMessage.error('显示消息对话框失败')
  }
}

/**
 * 显示确认对话框
 * @param {string} msg - 确认消息
 * @param {Object} options - 选项
 * @returns {Promise<boolean>} - 返回是否确认
 */
export async function confirmDialog(msg, options = {}) {
  try {
    return await confirm(msg, options)
  } catch (error) {
    return false
  }
}

/**
 * 显示询问对话框
 * @param {string} msg - 询问消息
 * @param {Object} options - 选项
 * @returns {Promise<boolean>} - 返回用户选择
 */
export async function askDialog(msg, options = {}) {
  try {
    return await ask(msg, options)
  } catch (error) {
    return false
  }
}

export default {
  openFile,
  openFiles,
  saveFile,
  selectFolder,
  messageDialog,
  confirmDialog,
  askDialog
}
