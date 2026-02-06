/**
 * Log API 封装
 */

import { debug, info, warn, error as logError } from '@tauri-apps/plugin-log'

/**
 * 调试日志
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
export function debugLog(message, ...args) {
  debug(message, ...args)
}

/**
 * 信息日志
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
export function infoLog(message, ...args) {
  info(message, ...args)
}

/**
 * 警告日志
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
export function warnLog(message, ...args) {
  warn(message, ...args)
}

/**
 * 错误日志
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
export function errorLog(message, ...args) {
  logError(message, ...args)
}

