/**
 * HTTP 客户端 API 封装
 */

import { fetch } from '@tauri-apps/plugin-http'
import { ElMessage } from 'element-plus'

/**
 * 发送 HTTP GET 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Response>}
 */
export async function get(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      ...options
    })
    return response
  } catch (error) {
    ElMessage.error('请求失败')
    throw error
  }
}

/**
 * 发送 HTTP POST 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @param {Object} options - 请求选项
 * @returns {Promise<Response>}
 */
export async function post(url, body = {}, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(body),
      ...options
    })
    return response
  } catch (error) {
    ElMessage.error('请求失败')
    throw error
  }
}

/**
 * 发送 HTTP PUT 请求
 * @param {string} url - 请求 URL
 * @param {Object} body - 请求体
 * @param {Object} options - 请求选项
 * @returns {Promise<Response>}
 */
export async function put(url, body = {}, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(body),
      ...options
    })
    return response
  } catch (error) {
    ElMessage.error('请求失败')
    throw error
  }
}

/**
 * 发送 HTTP DELETE 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Response>}
 */
export async function del(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      ...options
    })
    return response
  } catch (error) {
    ElMessage.error('请求失败')
    throw error
  }
}

