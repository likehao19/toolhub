/**
 * 文件树操作模块
 * 提供高性能的文件目录递归读取功能
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * 读取文件树（传统方式，适合小文件夹）
 *
 * @param {Object} options - 读取选项
 * @param {string} options.path - 目录路径
 * @param {string[]} [options.extensions] - 文件扩展名过滤，如 ['js', 'vue', 'rs']，为空则读取所有
 * @param {number} [options.maxDepth] - 最大递归深度，0 表示不递归，undefined 表示无限制
 * @param {boolean} [options.includeHidden=false] - 是否包含隐藏文件
 * @returns {Promise<{tree: FileNode, rust_duration_ms: number}>} 文件树根节点和 Rust 读取时间（毫秒）
 *
 * @example
 * const result = await readFileTree({
 *   path: 'C:\\Users',
 *   extensions: ['js', 'vue'],
 *   maxDepth: 3,
 *   includeHidden: false
 * })
 * console.log('树:', result.tree)
 * console.log('Rust 读取时间:', result.rust_duration_ms, 'ms')
 */
export async function readFileTree(options) {
  try {
    const result = await invoke('read_file_tree', {
      options: {
        path: options.path,
        extensions: options.extensions || null,
        max_depth: options.maxDepth !== undefined ? options.maxDepth : null,
        include_hidden: options.includeHidden || false,
      }
    })
    return result
  } catch (error) {
    throw new Error(`读取文件树失败: ${error}`)
  }
}

/**
 * 流式读取文件树（推荐用于大文件夹，100GB+）
 *
 * 通过事件实时接收节点数据，不会阻塞页面
 *
 * @param {Object} options - 读取选项
 * @param {string} options.path - 目录路径
 * @param {string[]} [options.extensions] - 文件扩展名过滤
 * @param {number} [options.maxDepth] - 最大递归深度
 * @param {boolean} [options.includeHidden=false] - 是否包含隐藏文件
 * @param {string} [options.taskId] - 任务ID（用于取消操作）
 * @param {number} [options.batchSize=100] - 批次大小
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.onProgress - 进度回调 (progress) => {}
 * @param {Function} callbacks.onBatch - 批次数据回调 (batch) => {}
 * @param {Function} callbacks.onComplete - 完成回调 (result) => {}
 * @param {Function} [callbacks.onError] - 错误回调 (error) => {}
 * @returns {Promise<{taskId: string, unlisteners: Function[]}>} 任务ID和取消监听函数数组
 *
 * @example
 * const { taskId, unlisteners } = await readFileTreeStream({
 *   path: 'C:\\',
 *   extensions: ['js', 'vue'],
 *   batchSize: 200
 * }, {
 *   onProgress: (progress) => {
 *     console.log(`已扫描: ${progress.scanned_files} 个文件`)
 *   },
 *   onBatch: (batch) => {
 *     console.log(`收到 ${batch.nodes.length} 个节点`)
 *   },
 *   onComplete: (result) => {
 *     console.log('扫描完成')
 *   }
 * })
 */
export async function readFileTreeStream(options, callbacks) {
  try {
    const taskId = await invoke('read_file_tree_stream', {
      options: {
        path: options.path,
        extensions: options.extensions || null,
        max_depth: options.maxDepth !== undefined ? options.maxDepth : null,
        include_hidden: options.includeHidden || false,
        task_id: options.taskId || null,
        batch_size: options.batchSize || 100,
      }
    })

    const unlisteners = []

    // 监听进度事件
    const progressUnlisten = await listen(`file-tree-progress-${taskId}`, (event) => {
      if (callbacks.onProgress) {
        callbacks.onProgress(event.payload)
      }
    })
    unlisteners.push(progressUnlisten)

    // 监听批次数据事件
    const batchUnlisten = await listen(`file-tree-batch-${taskId}`, (event) => {
      if (callbacks.onBatch) {
        callbacks.onBatch(event.payload)
      }
    })
    unlisteners.push(batchUnlisten)

    // 监听完成事件
    const completeUnlisten = await listen(`file-tree-complete-${taskId}`, (event) => {
      // 清理监听器
      unlisteners.forEach(unlisten => unlisten())

      const result = event.payload
      if (result.error) {
        if (callbacks.onError) {
          callbacks.onError(result.error)
        }
      } else {
        if (callbacks.onComplete) {
          callbacks.onComplete(result)
        }
      }
    })
    unlisteners.push(completeUnlisten)

    return { taskId, unlisteners }
  } catch (error) {
    if (callbacks.onError) {
      callbacks.onError(error)
    }
    throw new Error(`启动文件树扫描失败: ${error}`)
  }
}

/**
 * 取消文件树扫描任务
 *
 * @param {string} taskId - 任务ID
 * @returns {Promise<void>}
 *
 * @example
 * await cancelFileTreeScan(taskId)
 */
export async function cancelFileTreeScan(taskId) {
  try {
    await invoke('cancel_file_tree_scan', { taskId })
  } catch (error) {
    throw new Error(`取消扫描失败: ${error}`)
  }
}

/**
 * 快速扫描目录统计信息
 *
 * 仅统计文件和文件夹数量，不返回树结构
 *
 * @param {string} path - 目录路径
 * @returns {Promise<DirectoryStats>} 统计信息
 *
 * @example
 * const stats = await scanDirectoryStats('C:\\Users')
 * console.log(`文件数: ${stats.file_count}, 文件夹数: ${stats.dir_count}`)
 */
export async function scanDirectoryStats(path) {
  try {
    const result = await invoke('scan_directory_stats', { path })
    return result
  } catch (error) {
    throw new Error(`扫描目录统计失败: ${error}`)
  }
}

/**
 * 格式化文件大小
 *
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 *
 * @example
 * formatFileSize(1024) // '1.00 KB'
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  if (!bytes) return '-'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 构建文件树（从扁平节点列表）
 *
 * 用于将流式读取的扁平节点列表重构为树形结构
 *
 * @param {FileNode[]} nodes - 节点列表
 * @param {string} rootPath - 根路径
 * @returns {FileNode} 树形结构根节点
 */
export function buildFileTree(nodes, rootPath) {
  if (!nodes || nodes.length === 0) return null

  // 创建路径到节点的映射
  const pathMap = new Map()

  // 先将所有节点放入映射，并初始化 children
  nodes.forEach(node => {
    const nodeWithChildren = {
      ...node,
      children: node.is_dir ? [] : null
    }
    pathMap.set(node.path, nodeWithChildren)
  })

  // 找出根节点
  let root = null

  // 构建父子关系
  nodes.forEach(node => {
    const currentNode = pathMap.get(node.path)

    if (node.parent_path && pathMap.has(node.parent_path)) {
      // 有父节点，添加到父节点的 children 中
      const parent = pathMap.get(node.parent_path)
      if (parent.children) {
        parent.children.push(currentNode)
      }
    } else if (!node.parent_path || node.path === rootPath) {
      // 根节点
      root = currentNode
    }
  })

  // 对所有节点的 children 排序
  pathMap.forEach(node => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        // 目录在前，文件在后
        if (a.is_dir !== b.is_dir) {
          return a.is_dir ? -1 : 1
        }
        // 同类型按名称排序
        return a.name.localeCompare(b.name, undefined, { numeric: true })
      })
    }
  })

  return root
}

/**
 * 过滤文件树
 *
 * @param {FileNode} node - 节点
 * @param {Function} predicate - 过滤函数 (node) => boolean
 * @returns {FileNode|null} 过滤后的节点
 *
 * @example
 * const filtered = filterFileTree(tree, (node) => {
 *   return node.is_dir || node.extension === 'js'
 * })
 */
export function filterFileTree(node, predicate) {
  if (!node) return null

  if (!predicate(node) && !node.is_dir) {
    return null
  }

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterFileTree(child, predicate))
      .filter(child => child !== null)

    if (filteredChildren.length === 0 && !predicate(node)) {
      return null
    }

    return {
      ...node,
      children: filteredChildren
    }
  }

  return predicate(node) ? node : null
}
