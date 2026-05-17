import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

let currentAbortController = null
let currentAbortReason = null

function normalizeHeaders(headers = {}) {
  if (!headers) return {}
  if (typeof headers.entries === 'function') {
    return Object.fromEntries(Array.from(headers.entries()))
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return { ...headers }
}

function getHeader(headers, name) {
  if (!headers) return null
  const lower = name.toLowerCase()
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return headers[k]
  }
  return null
}

function escapeMultipartName(name) {
  return String(name).replace(/"/g, '%22').replace(/[\r\n]/g, '')
}

/**
 * 构造 multipart/form-data 字节流。
 * fields: [{ key, value }] —— value 以 "@" 前缀表示从该路径读文件作为二进制段。
 * 返回 { body: Uint8Array, contentType: 'multipart/form-data; boundary=...' }
 */
export async function buildMultipartBody(fields = []) {
  const enabled = fields.filter(f => f && f.key)
  const boundary = `----ApiDebug-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  const enc = new TextEncoder()
  const parts = []

  for (const f of enabled) {
    const key = escapeMultipartName(f.key)
    const val = f.value == null ? '' : String(f.value)
    if (val.startsWith('@')) {
      const filePath = val.slice(1)
      const { readFile } = await import('@tauri-apps/plugin-fs')
      let bytes
      try {
        bytes = await readFile(filePath)
      } catch (err) {
        throw new Error(`Failed to read file: ${filePath} (${err?.message || err})`)
      }
      const filename = escapeMultipartName(filePath.split(/[/\\]/).pop() || 'file')
      parts.push(enc.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
      ))
      parts.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
      parts.push(enc.encode('\r\n'))
    } else {
      parts.push(enc.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      ))
    }
  }
  parts.push(enc.encode(`--${boundary}--\r\n`))

  const total = parts.reduce((s, p) => s + p.byteLength, 0)
  const body = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    body.set(p, offset)
    offset += p.byteLength
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

export async function sendRequest(config) {
  const {
    method, url, headers = {}, body,
    timeout = 30000,
    /* 每请求可选项；undefined 走 Tauri 默认 */
    sslVerify,
    followRedirects = true,
    maxRedirects = 10,
  } = config

  currentAbortController = new AbortController()
  currentAbortReason = null
  const timer = setTimeout(() => {
    currentAbortReason = 'timeout'
    currentAbortController?.abort()
  }, timeout)
  const startTime = performance.now()

  /* Tauri http plugin v2 支持的非标准选项 */
  const tauriOpts = {
    method,
    headers: { ...headers },
    body: body && method !== 'GET' && method !== 'HEAD' ? body : undefined,
    signal: currentAbortController.signal,
    connectTimeout: timeout,
  }
  if (sslVerify === false) tauriOpts.danger = { acceptInvalidCerts: true, acceptInvalidHostnames: true }
  if (followRedirects === false) tauriOpts.redirect = 'manual'
  else if (typeof maxRedirects === 'number') tauriOpts.maxRedirections = maxRedirects

  try {
    const response = await tauriFetch(url, tauriOpts)

    const endTime = performance.now()
    const buf = await response.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let responseBody = ''
    try {
      responseBody = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    } catch { responseBody = '' }
    const responseHeaders = normalizeHeaders(response.headers)

    let setCookies = []
    if (typeof response.headers?.getSetCookie === 'function') {
      try { setCookies = response.headers.getSetCookie() } catch { setCookies = [] }
    }
    if (!setCookies.length) {
      const raw = getHeader(responseHeaders, 'set-cookie')
      if (raw) setCookies = String(raw).split(/,(?=\s*[\w!#$%&'*+.^`|~-]+=)/)
    }

    const contentLength = parseInt(getHeader(responseHeaders, 'content-length') || '', 10)
    const size = Number.isFinite(contentLength) ? contentLength : bytes.byteLength

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bytes,
      setCookies,
      time: Math.round(endTime - startTime),
      size,
      ok: response.ok,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(currentAbortReason === 'cancel' ? 'REQUEST_CANCELED' : 'REQUEST_TIMEOUT')
    }
    throw error
  } finally {
    clearTimeout(timer)
    currentAbortController = null
    currentAbortReason = null
  }
}

export function cancelRequest() {
  if (currentAbortController) {
    currentAbortReason = 'cancel'
    currentAbortController.abort()
    currentAbortController = null
  }
}