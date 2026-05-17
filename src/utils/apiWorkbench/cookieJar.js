/**
 * API Workbench — 简易 Cookie Jar
 * 跨请求自动带 Cookie；按 host + path 匹配；持久化到 localStorage。
 *
 * 不实现完整 RFC 6265：忽略 Secure 仅 https 校验、忽略公开后缀、Domain 不做"父域名"匹配
 * （只匹配等值 host），只满足"调试登录态"场景。
 */
import { load, save } from './shared'

const KEY = 'api-wb-cookie-jar'
const ENABLED_KEY = 'api-wb-cookie-jar-enabled'

function nowSec() { return Math.floor(Date.now() / 1000) }

/* 内部存储格式：
   [{ host, name, value, path, expires, httpOnly, secure, samesite }]
   expires: epoch seconds，0 表示 session cookie（页面关时清空） */
function loadJar() {
  return load(KEY, [])
}
function saveJar(list) {
  save(KEY, list)
}

export function isCookieJarEnabled() {
  return load(ENABLED_KEY, false)
}
export function setCookieJarEnabled(v) {
  save(ENABLED_KEY, !!v)
}

export function listCookies() {
  // 清掉已过期的
  const all = loadJar()
  const now = nowSec()
  const live = all.filter(c => !c.expires || c.expires > now)
  if (live.length !== all.length) saveJar(live)
  return live
}

export function clearJar() {
  saveJar([])
}

export function clearByHost(host) {
  saveJar(loadJar().filter(c => c.host !== host))
}

export function deleteCookie(host, name, path) {
  saveJar(loadJar().filter(c => !(c.host === host && c.name === name && c.path === (path || '/'))))
}

/**
 * 解析 Set-Cookie 单条字符串到 cookie 对象。
 * 未指定 path 默认 '/'；未指定 expires/max-age 为 session cookie (expires=0)。
 */
export function parseSetCookieRaw(raw, requestHost) {
  if (!raw) return null
  const parts = String(raw).split(';').map(s => s.trim()).filter(Boolean)
  const head = parts[0] || ''
  const eq = head.indexOf('=')
  if (eq < 0) return null
  const name = head.slice(0, eq).trim()
  const value = head.slice(eq + 1).trim()
  const cookie = {
    host: requestHost,
    name,
    value,
    path: '/',
    expires: 0,
    httpOnly: false,
    secure: false,
    samesite: '',
  }
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i]
    const k = seg.indexOf('=')
    const attr = (k > -1 ? seg.slice(0, k) : seg).toLowerCase()
    const val = k > -1 ? seg.slice(k + 1).trim() : ''
    if (attr === 'path') cookie.path = val || '/'
    else if (attr === 'domain') {
      // 简化：去掉前导点，使用 domain 作为 host（覆盖请求 host）
      cookie.host = val.replace(/^\./, '')
    }
    else if (attr === 'expires') {
      const t = Date.parse(val)
      if (!isNaN(t)) cookie.expires = Math.floor(t / 1000)
    }
    else if (attr === 'max-age') {
      const sec = parseInt(val, 10)
      if (!isNaN(sec)) cookie.expires = sec > 0 ? nowSec() + sec : 1  // <=0 表示立即过期
    }
    else if (attr === 'httponly') cookie.httpOnly = true
    else if (attr === 'secure') cookie.secure = true
    else if (attr === 'samesite') cookie.samesite = val
  }
  return cookie
}

/**
 * 把响应 Set-Cookie 列表注入 jar，替换同 (host,name,path) 三元组。
 */
export function ingestSetCookies(rawList, requestUrl) {
  if (!rawList?.length) return
  let host = ''
  try { host = new URL(requestUrl).hostname } catch { /* */ }
  const jar = loadJar()
  for (const raw of rawList) {
    const parsed = parseSetCookieRaw(raw, host)
    if (!parsed) continue
    const expired = parsed.expires > 0 && parsed.expires <= nowSec()
    // 删旧
    for (let i = jar.length - 1; i >= 0; i--) {
      const c = jar[i]
      if (c.host === parsed.host && c.name === parsed.name && c.path === parsed.path) {
        jar.splice(i, 1)
      }
    }
    if (!expired) jar.push(parsed)
  }
  saveJar(jar)
}

/**
 * 给定一个 URL，返回应当附带的 Cookie header 字符串（"a=1; b=2"），或空串。
 */
export function buildCookieHeader(targetUrl) {
  let host = ''
  let path = '/'
  try {
    const u = new URL(targetUrl)
    host = u.hostname
    path = u.pathname || '/'
  } catch { return '' }

  const now = nowSec()
  const matched = listCookies().filter(c => {
    if (c.host !== host) return false
    if (c.expires && c.expires <= now) return false
    if (c.path && !path.startsWith(c.path)) return false
    return true
  })
  if (!matched.length) return ''
  // 同名 cookie：path 更深的优先
  matched.sort((a, b) => (b.path || '').length - (a.path || '').length)
  const seen = new Set()
  const parts = []
  for (const c of matched) {
    if (seen.has(c.name)) continue
    seen.add(c.name)
    parts.push(`${c.name}=${c.value}`)
  }
  return parts.join('; ')
}
