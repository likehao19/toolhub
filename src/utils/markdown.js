/**
 * Markdown 工具函数
 * 使用 marked 库进行 Markdown 解析
 */

import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false
})

/**
 * 渲染 LaTeX 数学公式
 */
function renderMath(content) {
  // 行内公式：$...$ 或 \(...\)
  content = content.replace(/\$([^$]+)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: false })
    } catch (e) {
      return match
    }
  })
  
  // 块级公式：$$...$$ 或 \[...\]
  content = content.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: true })
    } catch (e) {
      return match
    }
  })
  
  // 支持 \(...\) 和 \[...\]
  content = content.replace(/\\\(([^)]+)\\\)/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: false })
    } catch (e) {
      return match
    }
  })
  
  content = content.replace(/\\\[([^\]]+)\\\]/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: true })
    } catch (e) {
      return match
    }
  })
  
  return content
}

/**
 * 将 Markdown 转换为 HTML
 * @param {string} markdown - Markdown 内容
 * @param {string} noteName - 笔记名称（用于处理相对路径的图片）
 */
export function markdownToHtml(markdown, noteName = null) {
  if (!markdown) return ''
  try {
    let html = marked.parse(markdown)
    // 渲染数学公式
    html = renderMath(html)
    
    // 添加样式控制图片大小
    html = html.replace(/<img([^>]*?)>/gi, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<img${attrs} style="max-width: 100%; height: auto;">`
      }
      return match
    })
    
    return html
  } catch (error) {
    return markdown
  }
}

/**
 * 提取 Markdown 中的图片链接
 */
export function extractImages(markdown) {
  if (!markdown) return []
  const imageRegex = /!\[.*?\]\((.*?)\)/g
  const images = []
  let match
  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push(match[1])
  }
  return images
}

/**
 * 提取 Markdown 中的视频链接
 */
export function extractVideos(markdown) {
  if (!markdown) return []
  const videoRegex = /<video.*?src=["'](.*?)["'].*?>/gi
  const videos = []
  let match
  while ((match = videoRegex.exec(markdown)) !== null) {
    videos.push(match[1])
  }
  return videos
}

export default {
  markdownToHtml,
  extractImages,
  extractVideos
}

