/**
 * 文件树 API 测试脚本
 *
 * 使用示例和测试用例
 */

import { TauriFileTree } from '@/utils/tauri'

// ===========================
// 示例 1: 普通扫描（小文件夹）
// ===========================
export async function example1_normalScan() {
  try {
    const tree = await TauriFileTree.readFileTree({
      path: 'D:\\Desktop',
      extensions: ['js', 'vue', 'ts'],  // 只扫描这些类型的文件
      maxDepth: 3,                       // 最多递归3层
      includeHidden: false               // 不包含隐藏文件
    })
    return tree
  } catch (error) {
  }
}

// ===========================
// 示例 2: 流式扫描（大文件夹）
// ===========================
export async function example2_streamScan() {
  try {
    const allNodes = []

    const { taskId, unlisteners } = await TauriFileTree.readFileTreeStream(
      {
        path: 'C:\\',
        extensions: null,      // 扫描所有文件
        maxDepth: 5,           // 最多5层
        includeHidden: false,
        batchSize: 200         // 每200个节点发送一次
      },
      {
        onProgress: (progress) => {
        },

        onBatch: (batch) => {
          allNodes.push(...batch.nodes)

          // 可以实时构建树
          const tree = TauriFileTree.buildFileTree(allNodes, 'C:\\')
        },

        onComplete: (result) => {
          const finalTree = TauriFileTree.buildFileTree(allNodes, 'C:\\')
        },

        onError: (error) => {
        }
      }
    )
    // 如果需要取消，可以调用：
    // unlisteners.forEach(unlisten => unlisten())

    return { taskId, unlisteners }
  } catch (error) {
  }
}

// ===========================
// 示例 3: 快速统计
// ===========================
export async function example3_quickStats() {
  try {
    const stats = await TauriFileTree.scanDirectoryStats('D:\\Desktop')
    console.log(`总大小: ${TauriFileTree.formatFileSize(stats.total_size)}`)

    return stats
  } catch (error) {
  }
}

// ===========================
// 示例 4: 过滤文件树
// ===========================
export async function example4_filterTree() {
  try {
    const tree = await TauriFileTree.readFileTree({
      path: 'D:\\Desktop',
      maxDepth: 3
    })

    // 只保留 .js 文件和目录
    const filtered = TauriFileTree.filterFileTree(tree, (node) => {
      return node.is_dir || node.extension === 'js'
    })
    return filtered
  } catch (error) {
  }
}

// ===========================
// 示例 5: 扫描整个磁盘的特定文件
// ===========================
export async function example5_scanDiskForFiles() {
  try {
    const logFiles = []

    const { taskId, unlisteners } = await TauriFileTree.readFileTreeStream(
      {
        path: 'C:\\',
        extensions: ['log'],   // 只要 .log 文件
        maxDepth: 10,          // 限制深度避免太深
        batchSize: 500
      },
      {
        onProgress: (progress) => {
        },

        onBatch: (batch) => {
          // 只保存文件节点
          const files = batch.nodes.filter(node => !node.is_dir)
          logFiles.push(...files)
        },

        onComplete: () => {
          // 按大小排序
          logFiles.sort((a, b) => (b.size || 0) - (a.size || 0))
          logFiles.slice(0, 10).forEach(file => {
            console.log(`${file.path} - ${TauriFileTree.formatFileSize(file.size)}`)
          })
        }
      }
    )

    return { taskId, unlisteners, logFiles }
  } catch (error) {
  }
}

// ===========================
// 示例 6: 工具函数演示
// ===========================
export function example6_utilityFunctions() {
  // 格式化文件大小
  console.log(TauriFileTree.formatFileSize(0))           // '0 B'
  console.log(TauriFileTree.formatFileSize(1024))        // '1.00 KB'
  console.log(TauriFileTree.formatFileSize(1048576))     // '1.00 MB'
  console.log(TauriFileTree.formatFileSize(1073741824))  // '1.00 GB'

  // 构建树（从扁平节点列表）
  const nodes = [
    { path: 'C:\\', name: 'C:', is_dir: true, parent_path: null },
    { path: 'C:\\Users', name: 'Users', is_dir: true, parent_path: 'C:\\' },
    { path: 'C:\\Users\\test.txt', name: 'test.txt', is_dir: false, parent_path: 'C:\\Users' }
  ]
  const tree = TauriFileTree.buildFileTree(nodes, 'C:\\')
}

// ===========================
// 测试所有示例
// ===========================
export async function runAllExamples() {
  await example1_normalScan()
  await example3_quickStats()
  await example4_filterTree()
  example6_utilityFunctions()

  // 注意: 流式扫描和磁盘扫描比较耗时，建议单独运行
  // await example2_streamScan()
  // await example5_scanDiskForFiles()
}

// 导出所有示例
export default {
  example1_normalScan,
  example2_streamScan,
  example3_quickStats,
  example4_filterTree,
  example5_scanDiskForFiles,
  example6_utilityFunctions,
  runAllExamples
}
