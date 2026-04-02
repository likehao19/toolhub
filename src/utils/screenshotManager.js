/**
 * 截图工具 - 工具函数 + 历史/设置管理
 */

const STORAGE_KEYS = {
  history: 'screenshot-history',
  settings: 'screenshot-settings',
  colors: 'screenshot-colors',
}

function load(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

// ===== 设置 =====
const DEFAULT_SETTINGS = {
  hotkey: 'F1',
  fullscreenHotkey: 'Ctrl+F1',
  colorPickerHotkey: 'Alt+C',
  saveFormat: 'png',
  saveQuality: 100,
  savePath: '',
  autoCopy: true,
  showMagnifier: true,
}

export function loadSettings() { return { ...DEFAULT_SETTINGS, ...load(STORAGE_KEYS.settings, {}) } }
export function saveSettings(s) { save(STORAGE_KEYS.settings, s) }

// ===== 历史 =====
export function loadHistory() { return load(STORAGE_KEYS.history, []) }
export function saveHistory(h) { save(STORAGE_KEYS.history, h) }
export function addToHistory(record) {
  const h = loadHistory()
  h.unshift(record)
  // 含 fullImage 时限制条数更少以避免 localStorage 溢出
  if (h.length > 20) h.length = 20
  try {
    saveHistory(h)
  } catch {
    // localStorage 满了，删除最旧的 fullImage
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].fullImage) { delete h[i].fullImage; break }
    }
    try { saveHistory(h) } catch { /* 还是满就放弃 */ }
  }
  return h
}
export function clearHistory() { save(STORAGE_KEYS.history, []) }
export function deleteHistoryItem(id) {
  const h = loadHistory().filter(r => r.id !== id)
  saveHistory(h)
  return h
}

// ===== 取色历史 =====
export function loadColors() { return load(STORAGE_KEYS.colors, []) }
export function addColor(hex) {
  const colors = loadColors().filter(c => c.hex !== hex)
  colors.unshift({ hex, timestamp: Date.now() })
  if (colors.length > 30) colors.length = 30
  save(STORAGE_KEYS.colors, colors)
  return colors
}

// ===== 颜色转换 =====
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

// ===== 格式化 =====
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
