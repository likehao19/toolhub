/**
 * 电子书管理工具 — 导入、元数据、进度、书签、高亮、TXT分页
 */
import { getDatabase } from './database'
import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir } from '@tauri-apps/plugin-fs'

const BOOKS_DIR_KEY = 'ebook_storage_path'
const READING_CONFIG_KEY = 'ebook_reading_config'

// ---- 存储路径 ----
let _defaultBooksDir = null

async function getDefaultBooksDir() {
  if (!_defaultBooksDir) {
    const appDir = await appDataDir()
    _defaultBooksDir = await join(appDir, 'notes', 'ebooks')
  }
  return _defaultBooksDir
}

export function getBooksDir() {
  return localStorage.getItem(BOOKS_DIR_KEY) || ''
}

export async function getBooksDirAsync() {
  const saved = localStorage.getItem(BOOKS_DIR_KEY)
  if (saved) return saved
  const dir = await getDefaultBooksDir()
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  localStorage.setItem(BOOKS_DIR_KEY, dir)
  return dir
}

export function setBooksDir(dir) {
  localStorage.setItem(BOOKS_DIR_KEY, dir)
}

// ---- 阅读配置 ----
const DEFAULT_CONFIG = {
  pageMode: 'flip',
  fontFamily: 'system',
  fontSize: 18,
  lineHeight: 1.8,
  margin: 48,
  theme: 'default',
  autoFlip: false,
  autoFlipInterval: 30,
}

export function getReadingConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(READING_CONFIG_KEY) || '{}') }
  } catch { return { ...DEFAULT_CONFIG } }
}
export function saveReadingConfig(cfg) {
  localStorage.setItem(READING_CONFIG_KEY, JSON.stringify(cfg))
}

// ---- 阅读主题 ----
export const READING_THEMES = {
  default: { name: '默认白', bg: '#ffffff', text: '#1a1a2e', page: '#ffffff' },
  eyeCare: { name: '护眼绿', bg: '#c7e3be', text: '#2d4a22', page: '#d4edcc' },
  parchment: { name: '羊皮纸', bg: '#f4e8c1', text: '#5b4636', page: '#faf0d7' },
  dark: { name: '暗夜黑', bg: '#1a1a2e', text: '#c8c8d0', page: '#252540' },
}

// ---- 书籍 CRUD ----

export async function getAllBooks() {
  const db = await getDatabase()
  return await db.select(`
    SELECT b.*, rp.progress, rp.last_read, rp.current_page, rp.current_cfi, rp.total_time
    FROM books b
    LEFT JOIN reading_progress rp ON b.id = rp.book_id
    ORDER BY COALESCE(rp.last_read, b.created_at) DESC
  `)
}

export async function getBook(id) {
  const db = await getDatabase()
  const rows = await db.select(`
    SELECT b.*, rp.progress, rp.last_read, rp.current_page, rp.current_cfi, rp.total_time
    FROM books b
    LEFT JOIN reading_progress rp ON b.id = rp.book_id
    WHERE b.id = ?
  `, [id])
  return rows[0] || null
}

export async function addBook({ title, author, cover, format, file_path, file_size, total_pages, description }) {
  const db = await getDatabase()
  const result = await db.execute(
    `INSERT INTO books (title, author, cover, format, file_path, file_size, total_pages, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, author || '', cover || '', format, file_path, file_size || 0, total_pages || 0, description || '']
  )
  return result.lastInsertId
}

export async function updateBook(id, fields) {
  const db = await getDatabase()
  // 列名白名单:防止 fields 里混入未知 key 拼到 SQL,既保护代码也避免误改字段。
  const ALLOWED = new Set([
    'title', 'author', 'cover', 'format', 'file_path', 'file_size',
    'total_pages', 'description'
  ])
  const keys = Object.keys(fields).filter(k => ALLOWED.has(k))
  if (keys.length === 0) return
  const sets = keys.map(k => `${k} = ?`).join(', ')
  await db.execute(
    `UPDATE books SET ${sets}, updated_at = datetime('now') WHERE id = ?`,
    [...keys.map(k => fields[k]), id]
  )
}

export async function deleteBook(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM book_highlights WHERE book_id = ?', [id])
  await db.execute('DELETE FROM book_bookmarks WHERE book_id = ?', [id])
  await db.execute('DELETE FROM reading_progress WHERE book_id = ?', [id])
  await db.execute('DELETE FROM books WHERE id = ?', [id])
}

// ---- 阅读进度 ----

export async function getProgress(bookId) {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM reading_progress WHERE book_id = ?', [bookId])
  return rows[0] || null
}

export async function saveProgress(bookId, { currentPage, currentCfi, progress, totalTime }) {
  const db = await getDatabase()
  const existing = await getProgress(bookId)
  if (existing) {
    await db.execute(
      `UPDATE reading_progress SET current_page=?, current_cfi=?, progress=?, total_time=?, last_read=datetime('now') WHERE book_id=?`,
      [currentPage ?? existing.current_page, currentCfi ?? existing.current_cfi, progress ?? existing.progress, totalTime ?? existing.total_time, bookId]
    )
  } else {
    await db.execute(
      `INSERT INTO reading_progress (book_id, current_page, current_cfi, progress, total_time, last_read) VALUES (?,?,?,?,?,datetime('now'))`,
      [bookId, currentPage || 0, currentCfi || '', progress || 0, totalTime || 0]
    )
  }
}

// ---- 书签 ----

export async function getBookmarks(bookId) {
  const db = await getDatabase()
  return await db.select('SELECT * FROM book_bookmarks WHERE book_id = ? ORDER BY created_at DESC', [bookId])
}

export async function addBookmark(bookId, { page, cfi, title, color }) {
  const db = await getDatabase()
  const result = await db.execute(
    'INSERT INTO book_bookmarks (book_id, page, cfi, title, color) VALUES (?,?,?,?,?)',
    [bookId, page || 0, cfi || '', title || '', color || '#409eff']
  )
  return result.lastInsertId
}

export async function removeBookmark(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM book_bookmarks WHERE id = ?', [id])
}

// ---- 高亮标注 ----

export async function getHighlights(bookId) {
  const db = await getDatabase()
  return await db.select('SELECT * FROM book_highlights WHERE book_id = ? ORDER BY created_at DESC', [bookId])
}

export async function addHighlight(bookId, { page, cfiRange, text, note, color }) {
  const db = await getDatabase()
  const result = await db.execute(
    'INSERT INTO book_highlights (book_id, page, cfi_range, text, note, color) VALUES (?,?,?,?,?,?)',
    [bookId, page || 0, cfiRange || '', text, note || '', color || '#ffeb3b']
  )
  return result.lastInsertId
}

export async function updateHighlight(id, { note, color }) {
  const db = await getDatabase()
  const sets = []
  const vals = []
  // 这里只允许 note / color 两个字段,直接写死,无需白名单
  if (note !== undefined) { sets.push('note = ?'); vals.push(note) }
  if (color !== undefined) { sets.push('color = ?'); vals.push(color) }
  if (sets.length) {
    vals.push(id)
    await db.execute(`UPDATE book_highlights SET ${sets.join(', ')} WHERE id = ?`, vals)
  }
}

export async function removeHighlight(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM book_highlights WHERE id = ?', [id])
}

// ---- TXT 分页引擎 ----

export function paginateText(text, config) {
  const { fontSize = 18, lineHeight = 1.8, margin = 48, pageWidth = 600, pageHeight = 800 } = config
  const contentW = pageWidth - margin * 2
  const contentH = pageHeight - margin * 2
  const charsPerLine = Math.floor(contentW / fontSize)
  const linesPerPage = Math.floor(contentH / (fontSize * lineHeight))

  if (charsPerLine <= 0 || linesPerPage <= 0) return [text]

  const paragraphs = text.split(/\r?\n/)
  const pages = []
  let curLines = []
  let lineCount = 0

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) {
      // 空行
      if (lineCount > 0) {
        lineCount++
        if (lineCount >= linesPerPage) {
          pages.push(curLines.join('\n'))
          curLines = []
          lineCount = 0
        } else {
          curLines.push('')
        }
      }
      continue
    }
    const indented = '\u3000\u3000' + trimmed
    const wrapped = wrapText(indented, charsPerLine)
    for (const line of wrapped) {
      if (lineCount >= linesPerPage) {
        pages.push(curLines.join('\n'))
        curLines = []
        lineCount = 0
      }
      curLines.push(line)
      lineCount++
    }
  }
  if (curLines.length) pages.push(curLines.join('\n'))
  return pages.length ? pages : ['']
}

function isFullWidth(code) {
  return (code >= 0x3000 && code <= 0x303F) ||
    (code >= 0x3040 && code <= 0x30FF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0xFF01 && code <= 0xFF60) ||
    (code >= 0xFFE0 && code <= 0xFFE6)
}

function wrapText(text, maxChars) {
  const lines = []
  let lineStart = 0
  let width = 0
  for (let i = 0; i < text.length; i++) {
    const cw = isFullWidth(text.charCodeAt(i)) ? 1 : 0.5
    if (width + cw > maxChars && i > lineStart) {
      lines.push(text.slice(lineStart, i))
      lineStart = i
      width = cw
    } else {
      width += cw
    }
  }
  if (lineStart < text.length) lines.push(text.slice(lineStart))
  return lines.length ? lines : [text]
}

// ---- 阅读统计 ----

export async function getReadingStats() {
  const db = await getDatabase()
  const total = await db.select('SELECT COUNT(*) as count FROM books')
  const reading = await db.select('SELECT COUNT(*) as count FROM reading_progress WHERE progress > 0 AND progress < 100')
  const finished = await db.select('SELECT COUNT(*) as count FROM reading_progress WHERE progress >= 100')
  const totalTime = await db.select('SELECT SUM(total_time) as sum FROM reading_progress')
  return {
    total: total[0]?.count || 0,
    reading: reading[0]?.count || 0,
    finished: finished[0]?.count || 0,
    totalTime: totalTime[0]?.sum || 0,
  }
}

// ---- 工具函数 ----

export function getFileName(path) {
  if (!path) return ''
  return path.replace(/\\/g, '/').split('/').pop()
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

export function formatTime(seconds) {
  if (!seconds) return '0min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`
  if (m > 0) return `${m}min`
  return `${s}s`
}

// ---- HTML 安全工具 ----

export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function highlightSearchText(text, query) {
  const escaped = escapeHtml(text)
  const queryEscaped = escapeHtml(query)
  const re = new RegExp(queryEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  return escaped.replace(re, m => `<mark>${m}</mark>`)
}
