/**
 * API Workbench — cURL parser + code generator
 */

export function parseCurl(curlStr) {
  if (!curlStr || typeof curlStr !== 'string') return null
  const str = curlStr.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ').trim()

  let method = 'GET'
  let url = ''
  const headers = []
  let bodyContent = ''

  const urlMatch = str.match(/curl\s+(?:.*?\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/) ||
                   str.match(/--url\s+['"]?([^\s'"]+)['"]?/)
  if (urlMatch) url = urlMatch[1]

  const methodMatch = str.match(/-X\s+(\w+)/)
  if (methodMatch) method = methodMatch[1].toUpperCase()

  const headerRegex = /-H\s+['"]([^'"]+)['"]/g
  let hm
  while ((hm = headerRegex.exec(str)) !== null) {
    const [key, ...valueParts] = hm[1].split(':')
    if (key) {
      headers.push({ key: key.trim(), value: valueParts.join(':').trim(), enabled: true })
    }
  }

  const bodyMatch = str.match(/(?:-d|--data|--data-raw|--data-binary)\s+['"](.+?)['"]/s) ||
                    str.match(/(?:-d|--data|--data-raw|--data-binary)\s+(\S+)/)
  if (bodyMatch) {
    bodyContent = bodyMatch[1]
    if (method === 'GET') method = 'POST'
  }

  const authMatch = str.match(/-u\s+['"]?([^'":\s]+):([^'":\s]+)['"]?/)
  const auth = authMatch
    ? { type: 'basic', username: authMatch[1], password: authMatch[2] }
    : { type: 'none' }

  let bodyType = 'none'
  if (bodyContent) {
    try { JSON.parse(bodyContent); bodyType = 'json' } catch { bodyType = 'raw' }
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
