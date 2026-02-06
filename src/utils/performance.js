/**
 * 性能监控工具
 */

const performanceMetrics = {
  loadTimes: {},
  operationTimes: {}
}

/**
 * 记录加载时间
 */
export function recordLoadTime(name, duration) {
  performanceMetrics.loadTimes[name] = duration
  if (import.meta.env.DEV) {
  }
}

/**
 * 记录操作时间
 */
export function recordOperationTime(name, duration) {
  performanceMetrics.operationTimes[name] = duration
  if (import.meta.env.DEV) {
  }
}

/**
 * 创建性能计时器
 */
export function createTimer(name) {
  const start = performance.now()
  return {
    end: () => {
      const duration = performance.now() - start
      recordOperationTime(name, duration)
      return duration
    }
  }
}

/**
 * 获取性能报告
 */
export function getPerformanceReport() {
  return {
    loadTimes: { ...performanceMetrics.loadTimes },
    operationTimes: { ...performanceMetrics.operationTimes }
  }
}

export default {
  recordLoadTime,
  recordOperationTime,
  createTimer,
  getPerformanceReport
}

