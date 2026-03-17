import { ref } from 'vue'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

const messages = { 'zh-CN': zhCN, 'en-US': enUS }

export const locale = ref(localStorage.getItem('app_locale') || 'zh-CN')

export function setLocale(lang) {
  locale.value = lang
  localStorage.setItem('app_locale', lang)
}

/**
 * 翻译函数 — 在模板中直接使用，响应式（依赖 locale ref）
 * 支持点分 key：t('sidebar.dashboard')
 * 支持插值：t('todos.overdueDays', { days: 3 }) → '过期3天'
 */
export function t(key, params) {
  const lang = locale.value
  const keys = key.split('.')
  let value = messages[lang]
  for (const k of keys) {
    if (value == null) return key
    value = value[k]
  }
  if (value == null) return key
  if (params && typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`)
  }
  return value
}
