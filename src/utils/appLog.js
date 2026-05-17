/**
 * 应用运行日志（app.log）封装
 *
 * 后端：src-tauri/src/commands/app_log.rs
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * @typedef {Object} LogReadResult
 * @property {string}  path
 * @property {number}  total_lines
 * @property {number}  returned_lines
 * @property {boolean} truncated
 * @property {string}  content
 *
 * @typedef {Object} LogFileInfo
 * @property {string}  name
 * @property {string}  path
 * @property {number}  size
 * @property {number}  modified_ms
 * @property {boolean} is_active
 */

/** @returns {Promise<string>} */
export function getLogFilePath() {
  return invoke('get_log_file_path')
}

/** @returns {Promise<string>} */
export function getLogDir() {
  return invoke('get_log_dir')
}

/**
 * @param {number} [lines=1000]
 * @returns {Promise<LogReadResult>}
 */
export function readRecentLog(lines = 1000) {
  return invoke('read_recent_log', { lines })
}

/** @returns {Promise<void>} */
export function clearLogFile() {
  return invoke('clear_log_file')
}

/** @returns {Promise<LogFileInfo[]>} */
export function listLogFiles() {
  return invoke('list_log_files')
}

/** @returns {Promise<void>} */
export function openLogDir() {
  return invoke('open_log_dir')
}

/** 字节格式化 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

/**
 * 解析单行日志（tauri-plugin-log 格式: `[YYYY-MM-DD][HH:MM:SS][LEVEL][TARGET] msg`）
 * 不匹配的行（panic、外部库输出等）level 设为 'other'，message 设为原文。
 *
 * @param {string} line
 * @returns {{ raw: string, date: string, time: string, level: 'error'|'warn'|'info'|'debug'|'trace'|'other', target: string, shortTarget: string, message: string }}
 */
export function parseLogLine(line) {
  const empty = { raw: line || '', date: '', time: '', level: 'other', target: '', shortTarget: '', message: line || '' }
  if (!line) return empty
  // [date][time][LEVEL][target] message
  const m = line.match(/^\[([^\]]+)\]\[([^\]]+)\]\[(ERROR|WARN|INFO|DEBUG|TRACE)\]\[([^\]]+)\]\s?(.*)$/)
  if (!m) {
    // 兜底：尝试只匹配 level
    const lm = line.match(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/)
    return {
      raw: line,
      date: '',
      time: '',
      level: lm ? lm[1].toLowerCase() : 'other',
      target: '',
      shortTarget: '',
      message: line,
    }
  }
  const [, date, time, levelUpper, target, message] = m
  const parts = target.split('::')
  const shortTarget = parts.length > 2 ? parts.slice(-2).join('::') : target
  return {
    raw: line,
    date,
    time,
    level: levelUpper.toLowerCase(),
    target,
    shortTarget,
    message: message || '',
  }
}

/**
 * 旧接口兼容：只返回级别
 * @param {string} line
 */
export function detectLevel(line) {
  return parseLogLine(line).level
}
