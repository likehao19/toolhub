/**
 * API Workbench — shared constants and helpers
 */

// ==================== Storage Keys ====================
export const STORAGE_KEYS = {
  collections: 'api-wb-collections',
  history: 'api-wb-history',
  environments: 'api-wb-environments',
  currentEnv: 'api-wb-current-env',
  mockRules: 'api-wb-mock-rules',
  mockConfig: 'api-wb-mock-config',
  testSuites: 'api-wb-test-suites',
}

// ==================== Storage Helpers ====================
export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ==================== UUID ====================
export function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ==================== Helpers ====================
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const METHOD_COLORS = {
  GET: '#67C23A',
  POST: '#E6A23C',
  PUT: '#409EFF',
  DELETE: '#F56C6C',
  PATCH: '#a855f7',
  HEAD: '#909399',
  OPTIONS: '#909399',
}

export const COMMON_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Content-Type', 'Content-Length',
  'Cookie', 'Host', 'Origin', 'Referer', 'User-Agent',
  'X-Requested-With', 'X-Api-Key', 'X-Auth-Token',
]

export const CONTENT_TYPES = {
  json: 'application/json',
  form: 'application/x-www-form-urlencoded',
  formData: 'multipart/form-data',
  xml: 'application/xml',
  text: 'text/plain',
  html: 'text/html',
}

export function tryFormatJson(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

export function isJson(str) {
  try { JSON.parse(str); return true } catch { return false }
}

/* 轻量 XML/HTML pretty：基于 tag 流的缩进；不解析也不验证，畸形输入原样返回。
   适合调试用，不替代真正的解析器。 */
export function tryFormatXml(str) {
  if (typeof str !== 'string' || !str.includes('<')) return str
  try {
    const indent = '  '
    let depth = 0
    const out = []
    // 把标签和文本拆开
    const tokens = str.match(/<[^>]+>|[^<]+/g) || []
    for (let raw of tokens) {
      const piece = raw
      if (piece.startsWith('<')) {
        const isComment = piece.startsWith('<!--')
        const isCData = piece.startsWith('<![CDATA[')
        const isProcessing = piece.startsWith('<?')
        const isDoctype = piece.startsWith('<!') && !isComment && !isCData
        const isClose = /^<\/[^>]+>$/.test(piece)
        const isSelfClose = /\/\s*>$/.test(piece)
        if (isClose) depth = Math.max(0, depth - 1)
        out.push(indent.repeat(depth) + piece.trim())
        if (!isClose && !isSelfClose && !isComment && !isCData && !isProcessing && !isDoctype) {
          depth += 1
        }
      } else {
        const text = piece.replace(/^\s+|\s+$/g, '')
        if (text) out.push(indent.repeat(depth) + text)
      }
    }
    return out.join('\n')
  } catch {
    return str
  }
}

export function detectBodyFormat(contentType, body) {
  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('json')) return 'json'
  if (ct.includes('xml') || ct.includes('html')) return 'xml'
  if (ct.includes('text')) return 'text'
  // 内容嗅探
  const head = String(body || '').trim().slice(0, 64)
  if (head.startsWith('{') || head.startsWith('[')) return 'json'
  if (head.startsWith('<')) return 'xml'
  return 'text'
}

export function buildUrl(baseUrl, params = []) {
  const activeParams = params.filter(p => p.enabled && p.key)
  if (!activeParams.length) return baseUrl
  const separator = baseUrl.includes('?') ? '&' : '?'
  const qs = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
  return baseUrl + separator + qs
}

export function parseUrlParams(url) {
  try {
    const u = new URL(url)
    const params = []
    u.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true })
    })
    return { baseUrl: u.origin + u.pathname, params }
  } catch {
    return { baseUrl: url, params: [] }
  }
}

export function buildAuthHeader(auth) {
  if (!auth || auth.type === 'none') return null
  if (auth.type === 'bearer' && auth.token) {
    return { key: 'Authorization', value: `Bearer ${auth.token}` }
  }
  if (auth.type === 'basic' && auth.username) {
    // btoa 不支持非 latin-1,用户名/密码含中文/emoji 会抛 InvalidCharacterError,
    // 整个请求直接失败。先 utf-8 编码再 base64。
    const raw = `${auth.username}:${auth.password || ''}`
    const encoded = btoa(unescape(encodeURIComponent(raw)))
    return { key: 'Authorization', value: `Basic ${encoded}` }
  }
  if (auth.type === 'apikey' && auth.key && auth.value) {
    if (auth.position === 'header') return { key: auth.key, value: auth.value }
  }
  return null
}

export function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}
