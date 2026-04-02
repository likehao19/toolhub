/**
 * API Workbench — HTTP request engine
 */

let currentAbortController = null

export async function sendRequest(config) {
  const { method, url, headers = {}, body, timeout = 30000 } = config

  currentAbortController = new AbortController()
  const timer = setTimeout(() => currentAbortController.abort(), timeout)
  const startTime = performance.now()

  try {
    const fetchOptions = {
      method,
      headers: { ...headers },
      signal: currentAbortController.signal,
    }

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body
    }

    const response = await fetch(url, fetchOptions)
    const endTime = performance.now()
    const responseBody = await response.text()

    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

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
    if (error.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT')
    }
    throw error
  } finally {
    clearTimeout(timer)
    currentAbortController = null
  }
}

export function cancelRequest() {
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
}
