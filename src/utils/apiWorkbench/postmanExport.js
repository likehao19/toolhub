/**
 * 内部 collection → Postman Collection v2.1 JSON
 */

function buildPostmanUrl(rawUrl, params = []) {
  const url = String(rawUrl || '')
  let parsed
  try { parsed = new URL(url) } catch { /* 非标准 URL，退化处理 */ }

  const queryFromParams = (params || [])
    .filter(p => p && p.key)
    .map(p => ({ key: p.key, value: p.value ?? '', disabled: p.enabled === false || undefined }))
  if (!parsed) {
    return { raw: url, query: queryFromParams }
  }

  // 把已有 URL query 也合并进 query 数组
  const queryFromUrl = []
  parsed.searchParams.forEach((value, key) => {
    queryFromUrl.push({ key, value })
  })
  return {
    raw: url,
    protocol: parsed.protocol.replace(/:$/, ''),
    host: parsed.hostname.split('.'),
    port: parsed.port || undefined,
    path: parsed.pathname.split('/').filter(Boolean),
    query: [...queryFromUrl, ...queryFromParams],
  }
}

function convertHeaders(headers = []) {
  return headers.filter(h => h && h.key).map(h => ({
    key: h.key,
    value: h.value ?? '',
    disabled: h.enabled === false || undefined,
    type: 'text',
  }))
}

function convertAuth(auth) {
  if (!auth || auth.type === 'none') return undefined
  if (auth.type === 'bearer') {
    return { type: 'bearer', bearer: [{ key: 'token', value: auth.token || '', type: 'string' }] }
  }
  if (auth.type === 'basic') {
    return { type: 'basic', basic: [
      { key: 'username', value: auth.username || '', type: 'string' },
      { key: 'password', value: auth.password || '', type: 'string' },
    ] }
  }
  if (auth.type === 'apikey') {
    return { type: 'apikey', apikey: [
      { key: 'key', value: auth.key || '', type: 'string' },
      { key: 'value', value: auth.value || '', type: 'string' },
      { key: 'in', value: auth.position === 'query' ? 'query' : 'header', type: 'string' },
    ] }
  }
  return undefined
}

function convertBody(body) {
  if (!body || !body.type || body.type === 'none') return undefined
  if (body.type === 'json') {
    return { mode: 'raw', raw: body.content || '', options: { raw: { language: 'json' } } }
  }
  if (body.type === 'raw') {
    return { mode: 'raw', raw: body.content || '' }
  }
  if (body.type === 'form') {
    return {
      mode: 'urlencoded',
      urlencoded: (body.formData || []).filter(f => f && f.key).map(f => ({
        key: f.key, value: f.value ?? '', disabled: f.enabled === false || undefined, type: 'text',
      })),
    }
  }
  if (body.type === 'multipart') {
    return {
      mode: 'formdata',
      formdata: (body.formData || []).filter(f => f && f.key).map(f => {
        const val = String(f.value ?? '')
        if (val.startsWith('@')) {
          return { key: f.key, type: 'file', src: val.slice(1), disabled: f.enabled === false || undefined }
        }
        return { key: f.key, type: 'text', value: val, disabled: f.enabled === false || undefined }
      }),
    }
  }
  if (body.type === 'binary') {
    return {
      mode: 'file',
      file: { src: body.binaryPath || '' },
    }
  }
  return undefined
}

function convertItem(node) {
  if (node.type === 'folder') {
    return {
      name: node.name,
      item: (node.children || []).map(convertItem).filter(Boolean),
    }
  }
  if (node.type === 'api') {
    return {
      name: node.name || `${node.method} ${node.url}`,
      request: {
        method: node.method || 'GET',
        header: convertHeaders(node.headers),
        url: buildPostmanUrl(node.url, node.params),
        auth: convertAuth(node.auth),
        body: convertBody(node.body),
      },
      response: [],
    }
  }
  return null
}

export function buildPostmanCollection(collection) {
  const items = (collection?.items || []).map(convertItem).filter(Boolean)
  return {
    info: {
      _postman_id: collection?.id || crypto.randomUUID?.() || String(Date.now()),
      name: collection?.name || 'Exported Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  }
}
