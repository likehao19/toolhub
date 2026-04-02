/**
 * SQLite Manager — invoke wrappers + connection history
 */
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

// ==================== File Picker ====================

export async function pickSqliteFile() {
  const path = await open({
    title: '选择 SQLite 数据库文件',
    filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3', 's3db'] }],
    multiple: false,
  })
  return path || null
}

// ==================== Invoke Wrappers ====================

export async function sqliteOpen(path) {
  return await invoke('sqlite_open', { path })
}

export async function sqliteClose(connId) {
  return await invoke('sqlite_close', { connId })
}

export async function sqliteTables(connId) {
  return await invoke('sqlite_tables', { connId })
}

export async function sqliteTableInfo(connId, table) {
  return await invoke('sqlite_table_info', { connId, table })
}

export async function sqliteTableIndexes(connId, table) {
  return await invoke('sqlite_table_indexes', { connId, table })
}

export async function sqliteQuery(connId, sql, params = []) {
  return await invoke('sqlite_query', { connId, sql, params })
}

export async function sqliteExecute(connId, sql, params = []) {
  return await invoke('sqlite_execute', { connId, sql, params })
}

export async function sqliteCount(connId, table) {
  return await invoke('sqlite_count', { connId, table })
}

export async function sqliteDbInfo(connId) {
  return await invoke('sqlite_db_info', { connId })
}

// ==================== Connection History (localStorage) ====================

const HISTORY_KEY = 'sqlite-manager-history'
const MAX_HISTORY = 20

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

export function saveToHistory(name, path) {
  const list = loadHistory().filter(h => h.path !== path)
  list.unshift({ name, path, lastUsed: Date.now(), pinned: false })
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

export function removeFromHistory(path) {
  const list = loadHistory().filter(h => h.path !== path)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

export function togglePin(path) {
  const list = loadHistory()
  const item = list.find(h => h.path === path)
  if (item) item.pinned = !item.pinned
  list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

// ==================== Helpers ====================

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function basename(path) {
  return path.replace(/\\/g, '/').split('/').pop() || path
}
