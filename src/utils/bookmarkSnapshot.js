/**
 * 书签快照工具
 * 支持保存网页截图和简化内容
 */

import { fetch } from '@tauri-apps/plugin-http'

/**
 * 获取网页简化内容
 * @param {string} url - 网页 URL
 * @returns {Promise<string>} 简化后的文本内容
 */
export async function fetchWebpageContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // 创建临时 DOM 解析器（在浏览器环境中）
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // 移除脚本和样式
      const scripts = doc.querySelectorAll('script, style, noscript')
      scripts.forEach(el => el.remove())
      
      // 提取主要内容
      const mainContent = doc.querySelector('main, article, .content, #content, .main, #main') || doc.body
      
      if (mainContent) {
        // 提取文本内容
        let text = mainContent.innerText || mainContent.textContent || ''
        
        // 清理文本
        text = text
          .replace(/\s+/g, ' ') // 合并多个空格
          .replace(/\n\s*\n/g, '\n') // 合并多个换行
          .trim()
        
        // 限制长度（前 5000 字符）
        if (text.length > 5000) {
          text = text.substring(0, 5000) + '...'
        }
        
        return text
      }
    }
    
    // 如果无法解析，返回简单的文本提取
    return extractTextFromHTML(html)
  } catch (error) {
    throw new Error(`无法获取网页内容: ${error.message}`)
  }
}

/**
 * 从 HTML 中提取文本（简单版本）
 */
function extractTextFromHTML(html) {
  // 移除脚本和样式标签
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
  
  // 提取文本内容
  let text = html
    .replace(/<[^>]+>/g, ' ') // 移除所有 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim()
  
  // 限制长度
  if (text.length > 5000) {
    text = text.substring(0, 5000) + '...'
  }
  
  return text
}

/**
 * 保存网页快照
 * @param {number} bookmarkId - 书签 ID
 * @param {string} url - 网页 URL
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 快照信息
 */
export async function saveBookmarkSnapshot(bookmarkId, url, options = {}) {
  const { saveContent = true, saveScreenshot = false } = options
  
  const snapshot = {
    bookmarkId,
    url,
    savedAt: new Date().toISOString(),
    content: null,
    screenshotPath: null
  }
  
  try {
    // 保存网页内容
    if (saveContent) {
      const content = await fetchWebpageContent(url)
      snapshot.content = content
    }
    
    // 保存截图（需要浏览器环境，暂时不支持）
    if (saveScreenshot) {
      // TODO: 实现截图功能（需要 Tauri 窗口截图或使用 headless browser）
    }
    
    return snapshot
  } catch (error) {
    throw error
  }
}

/**
 * 保存快照到数据库
 * @param {Object} snapshot - 快照数据
 * @param {Function} db - 数据库实例
 */
export async function saveSnapshotToDatabase(snapshot, db) {
  try {
    await db.execute(
      `UPDATE bookmarks 
       SET snapshot_content = ?, 
           snapshot_saved_at = ? 
       WHERE id = ?`,
      [
        snapshot.content || null,
        snapshot.savedAt,
        snapshot.bookmarkId
      ]
    )
  } catch (error) {
    throw error
  }
}

