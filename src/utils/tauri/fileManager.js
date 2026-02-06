/**
 * 文件管理器 API 封装
 * 企业级文件资源管理器专用
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 读取单层目录内容（不递归，高性能）
 *
 * @param {string} path - 目录路径
 * @param {string[]} [extensions] - 文件扩展名过滤
 * @param {boolean} [includeHidden=false] - 是否包含隐藏文件
 * @returns {Promise<DirectoryContent>} 目录内容
 *
 * @example
 * const content = await readDirectoryContent('C:\\Users')
 * console.log(`文件: ${content.file_count}, 文件夹: ${content.dir_count}`)
 * console.log('读取时间:', content.rust_duration_ms, 'ms')
 */
export async function readDirectoryContent(path, extensions = null, includeHidden = false) {
  try {
    const result = await invoke('read_directory_content', {
      path,
      extensions,
      includeHidden
    })
    return result
  } catch (error) {
    throw new Error(`读取目录失败: ${error}`)
  }
}

/**
 * 格式化文件大小
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
 * 获取文件图标
 */
export function getFileIcon(file) {
  if (file.is_dir) {
    return '📁'
  }

  const ext = file.extension?.toLowerCase()
  const iconMap = {
    // 文档
    'txt': '📄',
    'md': '📝',
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘',
    'xls': '📗',
    'xlsx': '📗',
    'ppt': '📙',
    'pptx': '📙',

    // 代码
    'js': '📜',
    'ts': '📜',
    'jsx': '⚛️',
    'tsx': '⚛️',
    'vue': '💚',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '{}',
    'xml': '📰',
    'yaml': '⚙️',
    'yml': '⚙️',

    // 编程语言
    'py': '🐍',
    'java': '☕',
    'c': '©️',
    'cpp': '©️',
    'h': '©️',
    'rs': '🦀',
    'go': '🐹',
    'php': '🐘',
    'rb': '💎',
    'swift': '🕊️',

    // 图片
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🎞️',
    'svg': '🎨',
    'ico': '🖼️',
    'webp': '🖼️',

    // 视频
    'mp4': '🎬',
    'avi': '🎬',
    'mkv': '🎬',
    'mov': '🎬',
    'wmv': '🎬',

    // 音频
    'mp3': '🎵',
    'wav': '🎵',
    'flac': '🎵',
    'aac': '🎵',

    // 压缩包
    'zip': '📦',
    'rar': '📦',
    '7z': '📦',
    'tar': '📦',
    'gz': '📦',

    // 可执行文件
    'exe': '⚙️',
    'msi': '⚙️',
    'app': '⚙️',
    'dmg': '💿',

    // 数据库
    'db': '💾',
    'sqlite': '💾',
    'sql': '💾',
  }

  return iconMap[ext] || '📄'
}

/**
 * 获取父目录路径
 */
export function getParentPath(path) {
  if (!path) return null
  
  // 标准化路径分隔符
  const normalizedPath = path.replace(/\\/g, '/')
  
  // Unix 根目录
  if (normalizedPath === '/') return null
  
  // Windows 根目录 (C:\, D:\ 等)
  if (normalizedPath.match(/^[A-Z]:\/?$/i)) return null
  
  // 移除末尾的斜杠
  const cleanPath = normalizedPath.replace(/\/+$/, '')
  
  // 分割路径
  const parts = cleanPath.split('/').filter(p => p)
  
  if (parts.length <= 1) {
    // 如果只有一个部分，返回根路径
    if (path.includes('\\')) {
      return parts[0] ? parts[0] + '\\' : null
    }
    return '/'
  }
  
  // 移除最后一部分
  parts.pop()
  
  // 重建路径
  if (path.includes('\\')) {
    // Windows 路径
    const result = parts.join('\\')
    // 如果是盘符，添加反斜杠
    if (result.match(/^[A-Z]:$/i)) {
      return result + '\\'
    }
    return result
  } else {
    // Unix 路径
    return '/' + parts.join('/')
  }
}

/**
 * 路径分割为面包屑
 */
export function pathToBreadcrumbs(path) {
  if (!path) return []

  const isWindows = path.includes('\\')
  const separator = isWindows ? '\\' : '/'
  
  // 标准化路径，移除末尾的斜杠
  const normalizedPath = path.replace(/[\/\\]+$/, '')
  const parts = normalizedPath.split(separator).filter(p => p)

  return parts.map((name, index) => {
    const pathParts = parts.slice(0, index + 1)
    let fullPath
    
    if (isWindows) {
      fullPath = pathParts.join('\\')
      // 如果是盘符，确保有反斜杠
      if (fullPath.match(/^[A-Z]:$/i)) {
        fullPath += '\\'
      }
    } else {
      fullPath = '/' + pathParts.join('/')
    }

    return {
      name,
      path: fullPath
    }
  })
}

export default {
  readDirectoryContent,
  formatFileSize,
  getFileIcon,
  getParentPath,
  pathToBreadcrumbs
}
