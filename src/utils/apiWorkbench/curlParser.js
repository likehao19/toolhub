/**
 * API Workbench - cURL parser + code generator
 */

function tokenizeCommand(input) {
  const tokens = []
  let current = ''
  let quote = null
  let escaping = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (escaping) {
      current += ch
      escaping = false
      continue
    }

    if (ch === '\\') {
      escaping = true
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
      bodyContent = next
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
  if (bodyContent) {
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
    body: { type: bodyType, content: bodyContent },
    auth,
  }
}

export function generateCode(config, language = 'curl') {
  const { method, url, headers = [], body } = config

  if (language === 'curl') {
    let cmd = `curl -X ${method} '${url}'`
    headers.filter(h => h.enabled).forEach(h => {
      cmd += ` \\\n  -H '${h.key}: ${h.value}'`
    })
    if (body?.content && method !== 'GET') {
      cmd += ` \\\n  -d '${body.content}'`
    }
    return cmd
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