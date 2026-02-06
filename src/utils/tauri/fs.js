/**
 * 文件系统 API 封装
 */

import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  remove,
  readDir,
  BaseDirectory
} from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'

/**
 * 读取文本文件
 * @param {string} path - 文件路径
 * @param {Object} options - 选项
 * @returns {Promise<string>} - 文件内容
 */
export async function readText(path, options = {}) {
  try {
    return await readTextFile(path, options)
  } catch (error) {
    ElMessage.error(`读取文件失败: ${path}`)
    throw error
  }
}

/**
 * 写入文本文件
 * @param {string} path - 文件路径
 * @param {string} content - 文件内容
 * @param {Object} options - 选项
 */
export async function writeText(path, content, options = {}) {
  try {
    await writeTextFile(path, content, options)
    ElMessage.success('文件保存成功')
  } catch (error) {
    ElMessage.error(`写入文件失败: ${path}`)
    throw error
  }
}

/**
 * 检查文件或目录是否存在
 * @param {string} path - 路径
 * @param {Object} options - 选项
 * @returns {Promise<boolean>}
 */
export async function checkExists(path, options = {}) {
  try {
    return await exists(path, options)
  } catch (error) {
    return false
  }
}

/**
 * 创建目录
 * @param {string} path - 目录路径
 * @param {Object} options - 选项
 */
export async function createDir(path, options = {}) {
  try {
    await mkdir(path, { recursive: true, ...options })
    ElMessage.success('目录创建成功')
  } catch (error) {
    ElMessage.error(`创建目录失败: ${path}`)
    throw error
  }
}

/**
 * 删除文件或目录
 * @param {string} path - 路径
 * @param {Object} options - 选项
 */
export async function removeFile(path, options = {}) {
  try {
    await remove(path, options)
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error(`删除失败: ${path}`)
    throw error
  }
}

/**
 * 读取目录内容
 * @param {string} path - 目录路径
 * @param {Object} options - 选项
 * @returns {Promise<Array>} - 目录条目数组
 */
export async function listDir(path, options = {}) {
  try {
    return await readDir(path, options)
  } catch (error) {
    ElMessage.error(`读取目录失败: ${path}`)
    throw error
  }
}

/**
 * 复制文件或目录
 * @param {string} source - 源路径
 * @param {string} destination - 目标路径
 * @returns {Promise<void>}
 */
export async function copyFile(source, destination) {
  try {
    await invoke('copy_file', { source, destination })
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error(`复制失败: ${error.message || String(error)}`)
    throw error
  }
}

/**
 * 移动文件或目录（重命名）
 * @param {string} source - 源路径
 * @param {string} destination - 目标路径
 * @returns {Promise<void>}
 */
export async function moveFile(source, destination) {
  try {
    await invoke('move_file', { source, destination })
    ElMessage.success('移动成功')
  } catch (error) {
    ElMessage.error(`移动失败: ${error.message || String(error)}`)
    throw error
  }
}

/**
 * 重命名文件或目录
 * @param {string} path - 文件或目录路径
 * @param {string} newName - 新名称
 * @returns {Promise<void>}
 */
export async function renameFile(path, newName) {
  try {
    await invoke('rename_file', { path, newName })
    ElMessage.success('重命名成功')
  } catch (error) {
    ElMessage.error(`重命名失败: ${error.message || String(error)}`)
    throw error
  }
}

// 导出基础目录常量
export { BaseDirectory }

export default {
  readText,
  writeText,
  checkExists,
  createDir,
  removeFile,
  listDir,
  copyFile,
  moveFile,
  renameFile,
  BaseDirectory
}
