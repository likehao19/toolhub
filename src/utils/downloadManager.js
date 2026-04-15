/**
 * aria2 JSON-RPC 2.0 客户端
 * 通过 WebSocket 与 aria2c 进程通信，管理下载任务
 */

const DEFAULT_RPC_URL = 'ws://127.0.0.1:6800/jsonrpc'

let ws = null
let rpcId = 0
const pendingRequests = new Map()
let onNotification = null
let reconnectTimer = null
let isConnected = false

/**
 * 生成 RPC 请求 ID
 */
function nextId() {
  return `toolhub_${++rpcId}`
}

/**
 * 连接到 aria2 RPC WebSocket
 */
export function connect(options = {}) {
  const {
    url = DEFAULT_RPC_URL,
    secret = '',
    onOpen,
    onClose,
    onError,
    onNotify,
  } = options

  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      resolve()
      return
    }

    // 清除之前的重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    onNotification = onNotify || null
    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected = true
      onOpen?.()
      resolve()
    }

    ws.onclose = (event) => {
      isConnected = false
      // 拒绝所有pending请求
      for (const [id, { reject: rej }] of pendingRequests) {
        rej(new Error('WebSocket closed'))
      }
      pendingRequests.clear()
      onClose?.(event)
    }

    ws.onerror = (error) => {
      isConnected = false
      onError?.(error)
      reject(error)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // 处理 aria2 通知事件
        if (data.method) {
          onNotification?.(data.method, data.params)
          return
        }

        // 处理 RPC 响应
        const pending = pendingRequests.get(data.id)
        if (pending) {
          pendingRequests.delete(data.id)
          if (data.error) {
            pending.reject(new Error(data.error.message || JSON.stringify(data.error)))
          } else {
            pending.resolve(data.result)
          }
        }
      } catch (e) {
        console.error('[aria2] 解析消息失败:', e)
      }
    }

    // 存储配置以便重连
    ws._aria2Config = { url, secret, onOpen, onClose, onError, onNotify }
  })
}

/**
 * 断开连接
 */
export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  isConnected = false
  pendingRequests.clear()
}

/**
 * 获取连接状态
 */
export function getConnectionState() {
  return isConnected
}

/**
 * 发送 RPC 请求
 */
function call(method, params = []) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('aria2 RPC 未连接'))
      return
    }

    const id = nextId()
    const secret = ws._aria2Config?.secret

    // 如果有 secret，需要作为第一个参数传入
    const fullParams = secret ? [`token:${secret}`, ...params] : params

    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params: fullParams,
    }

    pendingRequests.set(id, { resolve, reject })

    // 超时处理
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`RPC 请求超时: ${method}`))
      }
    }, 30000)

    ws.send(JSON.stringify(request))
  })
}

// ========== aria2 RPC 方法 ==========

/**
 * 添加 URI 下载（HTTP/FTP/磁力等）
 * @param {string[]} uris - 下载链接数组
 * @param {object} options - 下载选项 { dir, out, split, ... }
 * @returns {string} GID
 */
export function addUri(uris, options = {}) {
  return call('aria2.addUri', [uris, options])
}

/**
 * 添加种子下载
 * @param {string} torrentBase64 - 种子文件 base64
 * @param {string[]} uris - 可选的 Web Seeds
 * @param {object} options - 下载选项
 * @returns {string} GID
 */
export function addTorrent(torrentBase64, uris = [], options = {}) {
  return call('aria2.addTorrent', [torrentBase64, uris, options])
}

/**
 * 添加 Metalink 下载
 * @param {string} metalinkBase64 - metalink 文件 base64
 * @param {object} options - 下载选项
 * @returns {string[]} GID 数组
 */
export function addMetalink(metalinkBase64, options = {}) {
  return call('aria2.addMetalink', [metalinkBase64, options])
}

/**
 * 暂停下载
 */
export function pause(gid) {
  return call('aria2.pause', [gid])
}

/**
 * 强制暂停下载
 */
export function forcePause(gid) {
  return call('aria2.forcePause', [gid])
}

/**
 * 暂停��有下载
 */
export function pauseAll() {
  return call('aria2.pauseAll')
}

/**
 * 恢复下载
 */
export function unpause(gid) {
  return call('aria2.unpause', [gid])
}

/**
 * 恢复所有暂停的下载
 */
export function unpauseAll() {
  return call('aria2.unpauseAll')
}

/**
 * 删除下载任务
 */
export function remove(gid) {
  return call('aria2.remove', [gid])
}

/**
 * 强制删除下载任务
 */
export function forceRemove(gid) {
  return call('aria2.forceRemove', [gid])
}

/**
 * 删除已完成/出错/已删除的下载记录
 */
export function removeDownloadResult(gid) {
  return call('aria2.removeDownloadResult', [gid])
}

/**
 * 清空已完成/出错的下载记录
 */
export function purgeDownloadResult() {
  return call('aria2.purgeDownloadResult')
}

/**
 * 获取下载任务状态
 * @param {string} gid
 * @param {string[]} keys - 需要的字段，空数组返回全部
 */
export function tellStatus(gid, keys = []) {
  return call('aria2.tellStatus', keys.length ? [gid, keys] : [gid])
}

/**
 * 获取活动任务列表
 */
export function tellActive(keys = []) {
  return call('aria2.tellActive', keys.length ? [keys] : [])
}

/**
 * 获取等待中的任务列表
 * @param {number} offset - 偏移
 * @param {number} num - 数量
 */
export function tellWaiting(offset = 0, num = 100, keys = []) {
  return call('aria2.tellWaiting', keys.length ? [offset, num, keys] : [offset, num])
}

/**
 * 获取已停止的任务列表
 * @param {number} offset - 偏移
 * @param {number} num - 数量
 */
export function tellStopped(offset = 0, num = 100, keys = []) {
  return call('aria2.tellStopped', keys.length ? [offset, num, keys] : [offset, num])
}

/**
 * 获取全局统计信息
 * @returns {{ downloadSpeed, uploadSpeed, numActive, numWaiting, numStopped, numStoppedTotal }}
 */
export function getGlobalStat() {
  return call('aria2.getGlobalStat')
}

/**
 * 获取 aria2 版本信息
 */
export function getVersion() {
  return call('aria2.getVersion')
}

/**
 * 获取全局选项
 */
export function getGlobalOption() {
  return call('aria2.getGlobalOption')
}

/**
 * 修改全局选项（限速等）
 * @param {object} options - { 'max-overall-download-limit': '1M', ... }
 */
export function changeGlobalOption(options) {
  return call('aria2.changeGlobalOption', [options])
}

/**
 * 获取单个任务的选项
 */
export function getOption(gid) {
  return call('aria2.getOption', [gid])
}

/**
 * 修改单个任务的选项
 */
export function changeOption(gid, options) {
  return call('aria2.changeOption', [gid, options])
}

/**
 * 关闭 aria2 服务（优雅）
 */
export function shutdown() {
  return call('aria2.shutdown')
}

/**
 * 批量调用多个 RPC 方法
 * @param {Array<{method: string, params: any[]}>} calls
 */
export function multicall(calls) {
  const formatted = calls.map(c => ({
    methodName: c.method,
    params: ws._aria2Config?.secret
      ? [`token:${ws._aria2Config.secret}`, ...(c.params || [])]
      : (c.params || []),
  }))
  // multicall 不需要再加 token
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('aria2 RPC 未连接'))
      return
    }
    const id = nextId()
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'system.multicall',
      params: [formatted],
    }
    pendingRequests.set(id, { resolve, reject })
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error('RPC 请求超时: system.multicall'))
      }
    }, 30000)
    ws.send(JSON.stringify(request))
  })
}

// ========== 辅助方法 ==========

/**
 * 解析文件名（从 aria2 任务状态中提取）
 */
export function getFileName(task) {
  if (task.bittorrent?.info?.name) {
    return task.bittorrent.info.name
  }
  if (task.files?.length > 0) {
    const path = task.files[0].path
    if (path) {
      return path.split(/[/\\]/).pop() || '未知文件'
    }
    // 从 URI 提取文件名
    const uris = task.files[0].uris
    if (uris?.length > 0) {
      try {
        const url = new URL(uris[0].uri)
        const name = url.pathname.split('/').pop()
        if (name) return decodeURIComponent(name)
      } catch {
        // ignore
      }
    }
  }
  return task.gid || '未知文件'
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes) {
  const b = Number(bytes) || 0
  if (b === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + ' ' + units[i]
}

/**
 * 格式化速度
 */
export function formatSpeed(bytesPerSec) {
  const b = Number(bytesPerSec) || 0
  if (b === 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + ' ' + units[i]
}

/**
 * 格式化剩余时间
 */
export function formatEta(totalLength, completedLength, downloadSpeed) {
  const remaining = Number(totalLength) - Number(completedLength)
  const speed = Number(downloadSpeed)
  if (speed <= 0 || remaining <= 0) return '--'
  const seconds = Math.ceil(remaining / speed)
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}时${m}分`
}

/**
 * 计算进度百分比
 */
export function getProgress(completedLength, totalLength) {
  const total = Number(totalLength)
  const completed = Number(completedLength)
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * 获取任务状态文本
 */
export function getStatusText(status) {
  const map = {
    active: '下载中',
    waiting: '等待中',
    paused: '已暂停',
    error: '出错',
    complete: '已完成',
    removed: '已删除',
  }
  return map[status] || status
}

/**
 * 获取任务状态类型（用于 el-tag）
 */
export function getStatusType(status) {
  const map = {
    active: '',
    waiting: 'warning',
    paused: 'info',
    error: 'danger',
    complete: 'success',
    removed: 'info',
  }
  return map[status] || 'info'
}
