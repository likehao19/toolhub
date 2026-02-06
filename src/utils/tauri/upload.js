/**
 * 上传 API 封装
 */

import { upload } from '@tauri-apps/plugin-upload'
import { ElMessage } from 'element-plus'

/**
 * 上传文件
 * @param {string} url - 上传 URL
 * @param {string|string[]} filePath - 文件路径
 * @param {Object} options - 上传选项
 * @returns {Promise<Response>}
 */
export async function uploadFile(url, filePath, options = {}) {
  try {
    const response = await upload(url, filePath, options)
    ElMessage.success('文件上传成功')
    return response
  } catch (error) {
    ElMessage.error('上传失败')
    throw error
  }
}

