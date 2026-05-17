/**
 * API Workbench - cURL parser + code generator
 */
import { buildAuthHeader, buildUrl } from './shared'

function escapeShellSingle(s) {
  return String(s == null ? '' : s).replace(/'/g, `'\\''`)
}

function tokenizeCommand(input) {
  const tokens = []
  let current = ''
  let quote = null

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]

    // 反斜杠处理：
    // - 在双引号内：仅 \" \\ \$ \` 解释为字面字符，其他 \X 保持字面 \X
    // - 在单引号内：完全字面（bash 单引号语义）
    // - 在引号外：仅 \<whitespace> 和 \\ 解释，其他 \X 保持字面 \X
    //   （这样 Windows 路径 C:\Users\file 不会被吃掉）
    if (ch === '\\' && next != null) {
      if (quote === "'") {
        // 单引号内反斜杠字面
        current += ch
        continue
      }
      if (quote === '"') {
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next
          i += 1
          continue
        }
        current += ch
        continue
      }
      // unquoted
      if (next === '\\' || /\s/.test(next) || next === '"' || next === "'") {
        current += next
        i += 1
        continue
      }
      // 不识别的 \X 字面保留（Windows 路径友好）
      current += ch
      continue
    }

    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += ch
  }

  if (current) tokens.push(current)
  return tokens
}

function normalizeCurlUrl(rawUrl = '') {
  if (!rawUrl) return ''
  if (/^[a-zA-Z][\w+.-]*:\/\//.test(rawUrl)) return rawUrl
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?([/?#]|$)/.test(rawUrl)) {
    return `http://${rawUrl}`
  }
  if (/^[\w.-]+\.[a-zA-Z]{2,}(:\d+)?([/?#]|$)/.test(rawUrl)) {
    return `https://${rawUrl}`
  }
  return rawUrl
}

export function parseCurl(curlStr) {
  if (!curlStr || typeof curlStr !== 'string') return null
  const tokens = tokenizeCommand(curlStr.replace(/\\\r?\n/g, ' ').trim())
  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') return null

  let method = 'GET'
  let url = ''
  const headers = []
  let bodyContent = ''
  const multipartFields = []
  let auth = { type: 'none' }

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    const next = tokens[i + 1]

    if ((token === '-X' || token === '--request') && next) {
      method = next.toUpperCase()
      i += 1
      continue
    }

    if ((token === '-H' || token === '--header') && next) {
      const idx = next.indexOf(':')
      if (idx > -1) {
        headers.push({
          key: next.slice(0, idx).trim(),
          value: next.slice(idx + 1).trim(),
          enabled: true,
        })
      }
      i += 1
      continue
    }

    if ((token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-ascii') && next) {
      bodyContent = bodyContent ? `${bodyContent}&${next}` : next
      if (method === 'GET') method = 'POST'
      i += 1
      continue
    }

    if ((token === '-F' || token === '--form') && next) {
      const idx = next.indexOf('=')
      if (idx > -1) {
        multipartFields.push({
          key: next.slice(0, idx).trim(),
          value: next.slice(idx + 1),
          enabled: true,
        })
      }
      if (method === 'GET') method = 'POST'
      i += 1
      continue
    }

    if ((token === '--url' || token === '--location-url') && next) {
      url = next
      i += 1
      continue
    }

    if ((token === '-u' || token === '--user') && next) {
      const idx = next.indexOf(':')
      if (idx > -1) {
        auth = {
          type: 'basic',
          username: next.slice(0, idx),
          password: next.slice(idx + 1),
        }
      }
      i += 1
      continue
    }

    if (!token.startsWith('-') && !url) {
      url = token
    }
  }

  url = normalizeCurlUrl(url)

  let bodyType = 'none'
  let formData = []
  if (multipartFields.length) {
    bodyType = 'multipart'
    formData = multipartFields
  } else if (bodyContent) {
    const contentTypeHeader = headers.find(h => h.key.toLowerCase() === 'content-type')?.value?.toLowerCase() || ''
    if (contentTypeHeader.includes('application/x-www-form-urlencoded')) {
      bodyType = 'form'
    } else {
      try {
        JSON.parse(bodyContent)
        bodyType = 'json'
      } catch {
        bodyType = 'raw'
      }
    }
  }

  return {
    method,
    url,
    headers,
    params: [],
    body: { type: bodyType, content: bodyContent, formData },
    auth,
  }
}

export function generateCode(config, language = 'curl') {
  const { method, url, headers = [], body, params = [], auth } = config

  if (language === 'curl') {
    let fullUrl = buildUrl(url, params)
    if (auth?.type === 'apikey' && auth.position === 'query' && auth.key) {
      const extra = `${encodeURIComponent(auth.key)}=${encodeURIComponent(auth.value || '')}`
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + extra
    }
    const lines = [`curl -X ${method} '${escapeShellSingle(fullUrl)}'`]

    const headerMap = {}
    headers.filter(h => h.enabled && h.key).forEach(h => {
      headerMap[h.key] = h.value
    })

    const authHeader = buildAuthHeader(auth)
    if (authHeader) headerMap[authHeader.key] = authHeader.value

    const hasBody = body && body.type && body.type !== 'none' && method !== 'GET' && method !== 'HEAD'
    if (hasBody && body.type === 'multipart') {
      // multipart 由 -F 给出，让 curl 自己生成 Content-Type/boundary
      delete headerMap['Content-Type']
      delete headerMap['content-type']
    } else if (hasBody && body.type === 'form') {
      headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/x-www-form-urlencoded'
    } else if (hasBody && body.type === 'json') {
      headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/json'
    }

    Object.entries(headerMap).forEach(([k, v]) => {
      lines.push(`-H '${escapeShellSingle(k)}: ${escapeShellSingle(v)}'`)
    })

    if (hasBody) {
      if (body.type === 'json' || body.type === 'raw') {
        if (body.content) lines.push(`-d '${escapeShellSingle(body.content)}'`)
      } else if (body.type === 'form') {
        const formStr = (body.formData || []).filter(f => f.enabled && f.key)
          .map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value || '')}`)
          .join('&')
        if (formStr) lines.push(`-d '${formStr}'`)
      } else if (body.type === 'multipart') {
        ;(body.formData || []).filter(f => f.enabled && f.key).forEach(f => {
          lines.push(`-F '${escapeShellSingle(f.key)}=${escapeShellSingle(f.value || '')}'`)
        })
      }
    }

    return lines.join(' \\\n  ')
  }

  if (language === 'javascript') {
    const opts = { method }
    const activeHeaders = {}
    headers.filter(h => h.enabled).forEach(h => { activeHeaders[h.key] = h.value })
    if (Object.keys(activeHeaders).length) opts.headers = activeHeaders
    if (body?.content && method !== 'GET') opts.body = body.content

    return `fetch('${url}', ${JSON.stringify(opts, null, 2)})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))`
  }

  if (language === 'python') {
    let code = `import requests\n\n`
    const activeHeaders = {}
    headers.filter(h => h.enabled).forEach(h => { activeHeaders[h.key] = h.value })
    const hasHeaders = Object.keys(activeHeaders).length > 0
    const hasBody = body?.content && method !== 'GET'

    code += `response = requests.${method.toLowerCase()}(\n    '${url}'`
    if (hasHeaders) code += `,\n    headers=${JSON.stringify(activeHeaders)}`
    if (hasBody) {
      if (body.type === 'json') {
        code += `,\n    json=${body.content}`
      } else {
        code += `,\n    data='${body.content}'`
      }
    }
    code += `\n)\nprint(response.json())`
    return code
  }

  return ''
}