import { ref, watch } from 'vue'
import { t } from '@/i18n'

const STORAGE_KEY = 'favorite-tools'

// id → i18n key 映射，需与 Toolbox.vue 中 allCategories 的工具定义保持一致。
// 收藏的 tool.name 字符串只在添加时被固化到 localStorage，切换语言时不会跟着变；
// 所以渲染时通过 id 查这个映射动态取 t(key)，让 sidebar 跟主语言走。
const toolI18nKeyMap = {
  'sticky-notes': 'toolbox.tools.stickyNotes',
  'ebook-shelf': 'toolbox.tools.ebookShelf',
  'screenshot': 'toolbox.tools.screenshot',
  'multi-print': 'toolbox.tools.multiPrint',
  'sdk-manager': 'toolbox.tools.sdkManager',
  'code-formatter': 'toolbox.tools.codeFormatter',
  'regex-tester': 'toolbox.tools.regexTester',
  'hex-converter': 'toolbox.tools.hexConverter',
  'crypto': 'toolbox.tools.crypto',
  'maven-repo': 'toolbox.tools.mavenRepo',
  'git-manager': 'toolbox.tools.gitManager',
  'git-daily-report': 'toolbox.tools.gitDailyReport',
  'file-compare': 'toolbox.tools.fileCompare',
  'port-manager': 'toolbox.tools.portManager',
  'ip-lookup': 'toolbox.tools.ipLookup',
  'dns-lookup': 'toolbox.tools.dnsLookup',
  'speed-test': 'toolbox.tools.speedTest',
  'websocket-test': 'toolbox.tools.websocketTest',
  'download-manager': 'toolbox.tools.downloadManager',
  'ssh-terminal': 'toolbox.tools.sshTerminal',
  'api-debug': 'toolbox.tools.apiDebug',
  'api-docs-page': 'toolbox.tools.apiDocsPage',
  'mock-service': 'toolbox.tools.mockService',
  'perf-test': 'toolbox.tools.perfTest',
  'auto-test': 'toolbox.tools.autoTest',
  'redis-client': 'toolbox.tools.redisClient',
  'sqlite-manager': 'toolbox.tools.sqliteManager',
  'log-analyzer': 'toolbox.tools.logAnalyzer',
  'image-format': 'toolbox.tools.imageFormat',
  'image-to-base64': 'toolbox.tools.imageToBase64',
  'wallpaper-manager': 'toolbox.tools.wallpaperManager',
  'hardware-info': 'toolbox.tools.hardwareInfo',
}

// 模块级单例，跨组件共享。
// 用 try/catch 兜底:这个文件在模块加载阶段就执行,如果 localStorage 里的数据
// 被外部脚本污染或上次写入被中断成非法 JSON,直接抛错会让整个模块加载失败,
// 所有引用 useFavoriteTools 的组件都崩。
function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
const favoriteTools = ref(loadFavorites())

watch(favoriteTools, (val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  } catch {
    // 配额超限/隐私模式禁用 localStorage 等场景下静默失败,
    // 内存里的 favoriteTools 仍然有效,只是这次重启会丢。
  }
}, { deep: true })

// 在 template 中调用是响应式的（t 依赖 locale ref）。fallback 给 localStorage 里
// 旧数据兜底（万一 toolI18nKeyMap 没覆盖）。
export function getToolName(tool) {
  const key = toolI18nKeyMap[tool.id]
  return key ? t(key) : (tool.name || tool.id)
}

export function useFavoriteTools() {
  const toggleFavorite = (tool) => {
    const idx = favoriteTools.value.findIndex(t => t.id === tool.id)
    if (idx === -1) {
      favoriteTools.value.push({ id: tool.id, name: tool.name, icon: tool.icon, enabled: tool.enabled })
    } else {
      favoriteTools.value.splice(idx, 1)
    }
  }

  const isFavorite = (toolId) => favoriteTools.value.some(t => t.id === toolId)

  return { favoriteTools, toggleFavorite, isFavorite }
}
