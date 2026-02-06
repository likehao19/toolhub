/**
 * 文件操作 API 封装
 * 提供文件读取、写入功能
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 读取文本文件
 *
 * @param {string} path - 文件路径
 * @returns {Promise<Object>} 文件内容和元数据
 *
 * @example
 * const file = await readTextFile('C:\\test.txt')
 * console.log(file.content)
 */
export async function readTextFile(path) {
  try {
    const result = await invoke('read_text_file', { path })
    return result
  } catch (error) {
    throw new Error(`读取文件失败: ${error}`)
  }
}

/**
 * 写入文本文件
 *
 * @param {string} path - 文件路径
 * @param {string} content - 文件内容
 * @returns {Promise<void>}
 *
 * @example
 * await writeTextFile('C:\\test.txt', 'Hello World')
 */
export async function writeTextFile(path, content) {
  try {
    await invoke('write_text_file', { path, content })
  } catch (error) {
    throw new Error(`写入文件失败: ${error}`)
  }
}

/**
 * 读取文件为Base64（用于图片等二进制文件）
 *
 * @param {string} path - 文件路径
 * @returns {Promise<string>} Base64编码的文件内容
 *
 * @example
 * const base64 = await readFileAsBase64('C:\\image.png')
 * // <img src="data:image/png;base64,{base64}" />
 */
export async function readFileAsBase64(path) {
  try {
    const result = await invoke('read_file_as_base64', { path })
    return result
  } catch (error) {
    throw new Error(`读取文件失败: ${error}`)
  }
}

/**
 * 检测文件是否为文本文件
 */
export function isTextFile(extension) {
  const textExtensions = [
    'txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx',
    'vue', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'php', 'rb', 'swift',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'bat', 'ps1', 'sql',
    'log', 'csv', 'gitignore', 'env'
  ]
  return textExtensions.includes(extension?.toLowerCase())
}

/**
 * 检测文件是否为图片
 */
export function isImageFile(extension) {
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']
  return imageExtensions.includes(extension?.toLowerCase())
}

/**
 * 获取MIME类型
 */
export function getMimeType(extension) {
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
  }
  return mimeTypes[extension?.toLowerCase()] || 'application/octet-stream'
}

export default {
  readTextFile,
  writeTextFile,
  readFileAsBase64,
  isTextFile,
  isImageFile,
  getMimeType
}
