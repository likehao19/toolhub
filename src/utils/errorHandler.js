/**
 * 全局错误处理
 */

import { ElMessage, ElNotification } from 'element-plus'

/**
 * 处理错误
 */
export function handleError(error, context = '') {
  const message = error.message || error.toString() || '未知错误'
  
  // 显示错误提示
  ElMessage.error({
    message: context ? `${context}: ${message}` : message,
    duration: 5000
  })
  
  // 在开发环境下显示详细错误
  if (import.meta.env.DEV) {
    ElNotification({
      title: '错误详情',
      message: error.stack || message,
      type: 'error',
      duration: 0,
      dangerouslyUseHTMLString: true
    })
  }
}

/**
 * 处理异步错误
 */
export function handleAsyncError(promise, context = '') {
  return promise.catch(error => {
    handleError(error, context)
    throw error
  })
}

/**
 * 创建错误边界
 */
export function createErrorBoundary(handler) {
  return async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      handleError(error, handler.name || '未知函数')
      throw error
    }
  }
}

export default {
  handleError,
  handleAsyncError,
  createErrorBoundary
}

