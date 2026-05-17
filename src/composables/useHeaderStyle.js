import { ref, computed } from 'vue'

// 头部样式: 'windows' | 'mac'
// 真实平台由 navigator.userAgent 检测;开发模式下允许用户在设置里手动覆盖以预览另一种样式。
// 生产构建中 import.meta.env.DEV 为 false,覆盖值会被忽略,始终走真实平台检测。

const STORAGE_KEY = 'header-style-override'

const detectPlatform = () => {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (/mac|iphone|ipad|ipod/.test(ua)) return 'mac'
  return 'windows'
}

const realPlatform = detectPlatform()

const readOverride = () => {
  if (!import.meta.env.DEV) return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'mac' || v === 'windows' ? v : null
  } catch {
    return null
  }
}

const overrideValue = ref(readOverride())

export const isDev = import.meta.env.DEV

export const headerStyle = computed(() => {
  if (isDev && overrideValue.value) {
    return overrideValue.value
  }
  return realPlatform
})

// 设置页绑定: 'auto' | 'windows' | 'mac'
// auto 清除 localStorage,回到真实平台检测
export const headerStyleOverride = computed({
  get: () => overrideValue.value || 'auto',
  set: (val) => {
    if (val === 'auto') {
      overrideValue.value = null
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    } else if (val === 'mac' || val === 'windows') {
      overrideValue.value = val
      try { localStorage.setItem(STORAGE_KEY, val) } catch {}
    }
  }
})
