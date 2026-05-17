/**
 * Postman Collection v2.1 → 内部 collection 结构
 * 参考：https://schema.getpostman.com/json/collection/v2.1.0/collection.json
 */
import { uuid } from './shared'

function getUrlString(urlField) {
  if (!urlField) return ''
  if (typeof urlField === 'string') return urlField
  if (urlField.raw) return urlField.raw
  // 由 host/path/query 拼接（退化情况）
  const proto = urlField.protocol ? `${urlField.protocol}://` : ''
  const host = Array.isArray(urlField.host) ? urlField.host.join('.') : (urlField.host || '')
  const port = urlField.port ? `:${urlField.port}` : ''
  const path = Array.isArray(urlField.path) ? '/' + urlField.path.join('/') : (urlField.path || '')
  let qs = ''
  if (Array.isArray(urlField.query) && urlField.query.length) {
    qs = '?' + urlField.query.filter(q => !q.disabled).map(q => `${q.key}=${q.value ?? ''}`).join('&')
  }
  return `${proto}${host}${port}${path}${qs}`
}

function convertHeaders(headers) {
  if (!Array.isArray(headers)) return []
  return headers.filter(h => h && h.key).map(h => ({
    key: h.key,
    value: h.value ?? '',
    enabled: !h.disabled,
  }))
}

function convertParams(urlField) {
  if (!urlField || typeof urlField === 'string' || !Array.isArray(urlField.query)) return []
  return urlField.query.filter(q => q && q.key).map(q => ({
    key: q.key,
    value: q.value ?? '',
    enabled: !q.disabled,
  }))
}

function convertAuth(authField) {
  if (!authField || !authField.type) return { type: 'none' }
  const type = authField.type
  // Postman v2.1: { type: 'bearer', bearer: [{ key: 'token', value: 'xxx', type: 'string' }] }
  const list = Array.isArray(authField[type]) ? authField[type] : []
  const pick = name => list.find(x => x.key === name)?.value || ''

  if (type === 'bearer') return { type: 'bearer', token: pick('token') }
  if (type === 'basic') {
    return { type: 'basic', username: pick('username'), password: pick('password') }
  }
  if (type === 'apikey') {
    return {
      type: 'apikey',
      key: pick('key'),
      value: pick('value'),
      position: pick('in') === 'query' ? 'query' : 'header',
    }
  }
  return { type: 'none' }
}

function convertBody(bodyField) {
  if (!bodyField || !bodyField.mode) return { type: 'none', content: '', formData: [] }
  if (bodyField.mode === 'raw') {
    const lang = bodyField.options?.raw?.language
    return {
      type: lang === 'json' ? 'json' : 'raw',
      content: bodyField.raw || '',
      formData: [],
    }
  }
  if (bodyField.mode === 'urlencoded') {
    return {
      type: 'form',
      content: '',
      formData: (bodyField.urlencoded || []).filter(x => x && x.key).map(x => ({
        key: x.key, value: x.value ?? '', enabled: !x.disabled,
      })),
    }
  }
  if (bodyField.mode === 'formdata') {
    return {
      type: 'multipart',
      content: '',
      formData: (bodyField.formdata || []).filter(x => x && x.key).map(x => ({
        key: x.key,
        // type === 'file' 时 src 是文件路径，转成 @path 语法
        value: x.type === 'file' && x.src
          ? '@' + (Array.isArray(x.src) ? x.src[0] : x.src)
          : (x.value ?? ''),
        enabled: !x.disabled,
      })),
    }
  }
  return { type: 'none', content: '', formData: [] }
}

function convertItem(item, parentAuth) {
  if (Array.isArray(item.item)) {
    // 文件夹
    const folderAuth = item.auth || parentAuth
    return {
      id: uuid(),
      type: 'folder',
      name: item.name || 'Folder',
      children: item.item.map(child => convertItem(child, folderAuth)).filter(Boolean),
    }
  }
  if (item.request) {
    const req = item.request
    const method = (typeof req === 'string' ? 'GET' : (req.method || 'GET')).toUpperCase()
    const urlField = typeof req === 'string' ? req : req.url
    return {
      id: uuid(),
      type: 'api',
      name: item.name || `${method} ${getUrlString(urlField)}`,
      method,
      url: getUrlString(urlField),
      params: convertParams(urlField),
      headers: convertHeaders(req.header),
      body: convertBody(req.body),
      auth: convertAuth(req.auth || parentAuth),
    }
  }
  return null
}

export function parsePostmanCollection(jsonText) {
  let data
  try {
    data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
  } catch (err) {
    throw new Error('JSON parse failed: ' + err.message)
  }
  const schema = data?.info?.schema || ''
  // 兼容 v2.0 / v2.1
  if (!schema.includes('/v2.')) {
    throw new Error('unsupported schema (only v2.x)')
  }
  if (!Array.isArray(data.item)) {
    throw new Error('missing `item` array')
  }
  const rootAuth = data.auth || null
  const items = data.item.map(it => convertItem(it, rootAuth)).filter(Boolean)
  return {
    name: data.info?.name || 'Imported Collection',
    items,
  }
}

function countApis(items = []) {
  let n = 0
  for (const it of items) {
    if (it.type === 'api') n += 1
    else if (it.type === 'folder') n += countApis(it.children)
  }
  return n
}

export function countCollectionApis(collection) {
  return countApis(collection?.items || [])
}
