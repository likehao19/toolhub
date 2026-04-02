/**
 * Redis 客户端管理工具 — 连接配置 CRUD、invoke 封装
 */
import { invoke } from '@tauri-apps/api/core'
import { getDatabase } from './database'

// ---- 连接配置 CRUD（SQLite） ----

export async function getConnections() {
  const db = await getDatabase()
  return await db.select('SELECT * FROM redis_connections ORDER BY sort_order, last_used_at DESC')
}

export async function getConnection(id) {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM redis_connections WHERE id = ?', [id])
  return rows[0] || null
}

export async function addConnection({ name, host, port, password, db_index, color }) {
  const db = await getDatabase()
  const result = await db.execute(
    'INSERT INTO redis_connections (name, host, port, password, db_index, color) VALUES (?,?,?,?,?,?)',
    [name, host || '127.0.0.1', port || 6379, password || '', db_index || 0, color || '']
  )
  return result.lastInsertId
}

export async function updateConnection(id, fields) {
  const db = await getDatabase()
  const keys = Object.keys(fields)
  const sets = keys.map(k => `${k} = ?`).join(', ')
  await db.execute(`UPDATE redis_connections SET ${sets} WHERE id = ?`, [...keys.map(k => fields[k]), id])
}

export async function deleteConnection(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM redis_connections WHERE id = ?', [id])
}

export async function touchConnection(id) {
  const db = await getDatabase()
  await db.execute("UPDATE redis_connections SET last_used_at = datetime('now') WHERE id = ?", [id])
}

// ---- Redis 操作（Tauri invoke） ----

export async function connect(host, port, password, db) {
  return await invoke('redis_connect', { host, port, password: password || '', db: db || 0 })
}

export async function disconnect(connId) {
  return await invoke('redis_disconnect', { connId })
}

export async function testConnection(host, port, password, db) {
  return await invoke('redis_test_connection', { host, port, password: password || '', db: db || 0 })
}

export async function execute(connId, command, args = []) {
  return await invoke('redis_execute', { connId, command, args })
}

export async function scanKeys(connId, pattern = '*', cursor = 0, count = 200) {
  return await invoke('redis_scan_keys', { connId, pattern, cursor, count })
}

export async function getKeyDetail(connId, key) {
  return await invoke('redis_get_key_detail', { connId, key })
}

export async function setKey(connId, key, value, keyType, ttl = null) {
  return await invoke('redis_set_key', { connId, key, value, keyType, ttl })
}

export async function deleteKeys(connId, keys) {
  return await invoke('redis_delete_keys', { connId, keys })
}

export async function renameKey(connId, oldKey, newKey) {
  return await invoke('redis_rename_key', { connId, oldKey, newKey })
}

export async function setTtl(connId, key, ttl) {
  return await invoke('redis_set_ttl', { connId, key, ttl })
}

export async function serverInfo(connId) {
  return await invoke('redis_server_info', { connId })
}

export async function dbSize(connId) {
  return await invoke('redis_db_size', { connId })
}

export async function selectDb(connId, db) {
  return await invoke('redis_select_db', { connId, db })
}

// ---- 键树形结构工具 ----

/**
 * 将扁平键列表按 separator 构建成树
 * @param {string[]} keys
 * @param {string} sep 分隔符，默认 ':'
 * @returns {Array} 树形节点 [{label, fullKey?, children?}]
 */
export function buildKeyTree(keys, sep = ':') {
  const root = {}
  let nodeCounter = 0
  for (const key of keys) {
    const parts = key.split(sep)
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!node[part]) node[part] = {}
      if (i === parts.length - 1) {
        node[part].__leaf = key
      }
      node = node[part]
    }
  }

  function toTree(obj, prefix = '') {
    const result = []
    const entries = Object.entries(obj).filter(([k]) => k !== '__leaf')
    // 如果当前节点本身也是一个键（既是叶子又是前缀）
    if (obj.__leaf) {
      result.push({ nodeId: 'n' + (nodeCounter++), label: prefix || obj.__leaf, fullKey: obj.__leaf, isLeaf: true })
    }
    for (const [label, child] of entries) {
      const fullPrefix = prefix ? prefix + sep + label : label
      const childNodes = toTree(child, fullPrefix)
      if (child.__leaf && entries.length === 0) {
        // 纯叶子节点，无子分支
        result.push({ nodeId: 'n' + (nodeCounter++), label, fullKey: child.__leaf, isLeaf: true })
      } else if (child.__leaf) {
        // 既是叶子又有子分支 — 子节点已在递归中处理了叶子
        if (childNodes.length === 0) {
          result.push({ nodeId: 'n' + (nodeCounter++), label, fullKey: child.__leaf, isLeaf: true })
        } else {
          result.push({ nodeId: 'n' + (nodeCounter++), label, children: childNodes, isLeaf: false })
        }
      } else if (childNodes.length === 1 && !childNodes[0].isLeaf) {
        // 合并只有一个子节点的中间节点
        result.push({ ...childNodes[0], nodeId: 'n' + (nodeCounter++), label: label + sep + childNodes[0].label })
      } else {
        result.push({ nodeId: 'n' + (nodeCounter++), label, children: childNodes, isLeaf: false })
      }
    }
    return result.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1
      return a.label.localeCompare(b.label)
    })
  }

  return toTree(root)
}

// ---- CLI 命令解析 ----

/**
 * 解析用户输入的 Redis 命令字符串为 [command, ...args]
 * 支持引号包裹的参数
 */
export function parseCommand(input) {
  const parts = []
  let current = ''
  let inQuote = null
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuote) {
      if (ch === inQuote) { inQuote = null; continue }
      current += ch
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ' ') {
      if (current) { parts.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

// ---- 格式化工具 ----

export function formatBytes(bytes) {
  if (bytes < 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function formatTtl(ttl) {
  if (ttl === -1) return '永不过期'
  if (ttl === -2) return '已过期'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`
  const h = Math.floor(ttl / 3600)
  const m = Math.floor((ttl % 3600) / 60)
  return `${h}h ${m}m`
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d > 0) return `${d}天 ${h}小时`
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}小时 ${m}分钟`
}

// Redis 常用命令列表（用于自动补全）
export const REDIS_COMMANDS = [
  'GET', 'SET', 'DEL', 'EXISTS', 'EXPIRE', 'TTL', 'PERSIST', 'TYPE', 'RENAME',
  'KEYS', 'SCAN', 'DBSIZE', 'FLUSHDB', 'FLUSHALL', 'INFO', 'PING', 'SELECT',
  'HGET', 'HSET', 'HDEL', 'HGETALL', 'HKEYS', 'HVALS', 'HLEN', 'HMSET', 'HEXISTS',
  'LPUSH', 'RPUSH', 'LPOP', 'RPOP', 'LRANGE', 'LLEN', 'LINDEX', 'LSET',
  'SADD', 'SREM', 'SMEMBERS', 'SCARD', 'SISMEMBER', 'SINTER', 'SUNION',
  'ZADD', 'ZREM', 'ZRANGE', 'ZRANGEBYSCORE', 'ZSCORE', 'ZCARD', 'ZRANK',
  'XADD', 'XLEN', 'XRANGE', 'XREAD',
  'CLIENT', 'CONFIG', 'MEMORY', 'SLOWLOG', 'MONITOR',
  'MULTI', 'EXEC', 'DISCARD', 'WATCH', 'UNWATCH',
  'PUBLISH', 'SUBSCRIBE', 'UNSUBSCRIBE',
]
