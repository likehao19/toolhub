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

export async function sendRequest(config) {
  const { method, url, headers = {}, body, timeout = 30000 } = config

  currentAbortController = new AbortController()
  currentAbortReason = null
  const timer = setTimeout(() => {
    currentAbortReason = 'timeout'
    currentAbortController?.abort()
  }, timeout)
  const startTime = performance.now()

  try {
    const response = await tauriFetch(url, {
      method,
      headers: { ...headers },
      body: body && method !== 'GET' && method !== 'HEAD' ? body : undefined,
      signal: currentAbortController.signal,
      connectTimeout: timeout,
    })

    const endTime = performance.now()
    const responseBody = await response.text()
    const responseHeaders = normalizeHeaders(response.headers)

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time: Math.round(endTime - startTime),
      size: new Blob([responseBody]).size,
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