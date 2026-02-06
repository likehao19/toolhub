/**
 * 键盘快捷键管理
 */
import { onMounted, onUnmounted } from 'vue'

const shortcuts = new Map()

/**
 * 注册键盘快捷键
 * @param {string} key - 快捷键（例如: 'ctrl+s', 'ctrl+k', 'escape'）
 * @param {Function} handler - 处理函数
 * @param {Object} options - 选项
 */
export function registerShortcut(key, handler, options = {}) {
  const normalizedKey = normalizeKey(key)
  
  if (shortcuts.has(normalizedKey)) {
  }
  
  shortcuts.set(normalizedKey, {
    handler,
    preventDefault: options.preventDefault !== false,
    stopPropagation: options.stopPropagation === true
  })
}

/**
 * 取消注册键盘快捷键
 * @param {string} key - 快捷键
 */
export function unregisterShortcut(key) {
  const normalizedKey = normalizeKey(key)
  shortcuts.delete(normalizedKey)
}

/**
 * 规范化快捷键字符串
 */
function normalizeKey(key) {
  return key.toLowerCase().replace(/\s+/g, '')
}

/**
 * 解析键盘事件
 */
function parseKeyEvent(event) {
  const parts = []
  
  if (event.ctrlKey || event.metaKey) {
    parts.push('ctrl')
  }
  if (event.altKey) {
    parts.push('alt')
  }
  if (event.shiftKey) {
    parts.push('shift')
  }
  
  // 获取按键
  let key = event.key.toLowerCase()
  
  // 特殊键映射
  const keyMap = {
    ' ': 'space',
    'escape': 'escape',
    'enter': 'enter',
    'tab': 'tab',
    'backspace': 'backspace',
    'delete': 'delete',
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right'
  }
  
  if (keyMap[key]) {
    key = keyMap[key]
  } else if (key.length === 1) {
    // 单个字符
    key = key.toLowerCase()
  } else if (key.startsWith('f') && key.length <= 3) {
    // F1-F12
    key = key.toLowerCase()
  }
  
  if (key && !parts.includes(key)) {
    parts.push(key)
  }
  
  return parts.join('+')
}

/**
 * 处理键盘事件
 */
function handleKeyDown(event) {
  // 如果用户在输入框中，且不是 Escape 键，则忽略
  const target = event.target
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable
  
  const key = parseKeyEvent(event)
  
  // Escape 键总是可以触发
  if (key === 'escape' || !isInput) {
    const shortcut = shortcuts.get(key)
    
    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault()
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation()
      }
      shortcut.handler(event)
    }
  }
}

// 全局事件监听器
let isListening = false

function startListening() {
  if (!isListening) {
    window.addEventListener('keydown', handleKeyDown)
    isListening = true
  }
}

function stopListening() {
  if (isListening) {
    window.removeEventListener('keydown', handleKeyDown)
    isListening = false
  }
}

// 自动启动监听
startListening()

/**
 * Vue Composable: 使用键盘快捷键
 */
export function useKeyboardShortcuts() {
  const registeredKeys = new Set()
  
  const register = (key, handler, options) => {
    registerShortcut(key, handler, options)
    registeredKeys.add(key)
  }
  
  const unregister = (key) => {
    unregisterShortcut(key)
    registeredKeys.delete(key)
  }
  
  onUnmounted(() => {
    // 清理注册的快捷键
    registeredKeys.forEach(key => {
      unregisterShortcut(key)
    })
    registeredKeys.clear()
  })
  
  return {
    register,
    unregister
  }
}

// 导出清理函数（用于测试）
export function clearAllShortcuts() {
  shortcuts.clear()
}

