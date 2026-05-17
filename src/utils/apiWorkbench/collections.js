import { load, save, STORAGE_KEYS, uuid } from './shared'

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureApiNodeShape(node) {
  return {
    id: node.id || uuid(),
    type: 'api',
    name: node.name || `${node.method || 'GET'} ${node.url || ''}`,
    method: node.method || 'GET',
    url: node.url || '',
    params: Array.isArray(node.params) ? node.params : [],
    headers: Array.isArray(node.headers) ? node.headers : [],
    pathVars: Array.isArray(node.pathVars) ? node.pathVars : [],
    body: node.body || { type: 'none', content: '', formData: [] },
    auth: node.auth || { type: 'none' },
    settings: node.settings || { timeout: 30000, sslVerify: true, followRedirects: true, maxRedirects: 10 },
    preScript: typeof node.preScript === 'string' ? node.preScript : '',
  }
}

function ensureFolderNodeShape(node) {
  return {
    id: node.id || uuid(),
    type: 'folder',
    name: node.name || 'Folder',
    children: normalizeNodes(node.children || []),
  }
}

function normalizeNodes(nodes = []) {
  return (nodes || []).map(node => {
    if (node?.type === 'folder') return ensureFolderNodeShape(node)
    if (node?.type === 'api') return ensureApiNodeShape(node)
    if (Array.isArray(node?.children)) {
      return ensureFolderNodeShape({ ...node, type: 'folder' })
    }
    return ensureApiNodeShape(node || {})
  })
}

function normalizeCollection(collection = {}) {
  return {
    id: collection.id || uuid(),
    name: collection.name || 'Collection',
    items: normalizeNodes(collection.items || []),
  }
}

export function loadCollections() {
  return normalizeCollections(load(STORAGE_KEYS.collections, []))
}

export function normalizeCollections(collections = []) {
  return (collections || []).map(normalizeCollection)
}

export function saveCollections(collections) {
  save(STORAGE_KEYS.collections, normalizeCollections(collections))
}

export function createCollection(name) {
  const collections = loadCollections()
  const col = { id: uuid(), name, items: [] }
  collections.push(col)
  saveCollections(collections)
  return col
}

export function importCollection(payload) {
  const collections = loadCollections()
  const col = normalizeCollection({
    id: uuid(),
    name: payload?.name || 'Imported',
    items: payload?.items || [],
  })
  collections.push(col)
  saveCollections(collections)
  return col
}

export function deleteCollection(id) {
  saveCollections(loadCollections().filter(c => c.id !== id))
}

export function renameCollection(id, name) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === id)
  if (col) {
    col.name = name
    saveCollections(collections)
  }
}

function walkNodes(nodes = [], visitor, parent = null) {
  for (const node of nodes) {
    const result = visitor(node, parent)
    if (result) return result
    if (node.type === 'folder') {
      const nested = walkNodes(node.children || [], visitor, node)
      if (nested) return nested
    }
  }
  return null
}

function removeNodeRecursive(nodes = [], nodeId) {
  const next = []
  let removed = false
  for (const node of nodes) {
    if (node.id === nodeId) {
      removed = true
      continue
    }
    if (node.type === 'folder') {
      const { nodes: children, removed: childRemoved } = removeNodeRecursive(node.children || [], nodeId)
      next.push({ ...node, children })
      removed = removed || childRemoved
    } else {
      next.push(node)
    }
  }
  return { nodes: next, removed }
}

export function createFolder(collectionId, parentId, name) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (!col) return null
  const folder = ensureFolderNodeShape({ id: uuid(), name, children: [] })
  if (!parentId) {
    col.items.push(folder)
  } else {
    const parent = walkNodes(col.items, node => node.id === parentId && node.type === 'folder' ? node : null)
    if (!parent) return null
    parent.children.push(folder)
  }
  saveCollections(collections)
  return folder
}

export function createApiNode(collectionId, parentId, request) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (!col) return null
  const item = ensureApiNodeShape({
    id: uuid(),
    name: request.name || `${request.method} ${request.url}`,
    method: request.method,
    url: request.url,
    params: request.params || [],
    headers: request.headers || [],
    pathVars: request.pathVars || [],
    body: request.body || { type: 'none', content: '' },
    auth: request.auth || { type: 'none' },
    settings: request.settings,
    preScript: request.preScript,
  })
  if (!parentId) {
    col.items.push(item)
  } else {
    const parent = walkNodes(col.items, node => node.id === parentId && node.type === 'folder' ? node : null)
    if (!parent) return null
    parent.children.push(item)
  }
  saveCollections(collections)
  return item
}

export function saveRequestToCollection(collectionId, request, parentId = null) {
  return createApiNode(collectionId, parentId, request)
}

export function deleteCollectionItem(collectionId, itemId) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (!col) return
  const result = removeNodeRecursive(col.items, itemId)
  col.items = result.nodes
  saveCollections(collections)
}

export function updateCollectionItem(collectionId, itemId, updates) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (!col) return
  walkNodes(col.items, node => {
    if (node.id !== itemId) return null
    Object.assign(node, updates)
    return node
  })
  saveCollections(collections)
}

export function renameCollectionNode(collectionId, nodeId, name) {
  updateCollectionItem(collectionId, nodeId, { name })
}

export function flattenCollectionApis(collections = []) {
  return normalizeCollections(collections).map(col => ({
    ...col,
    apis: flattenNodesToApis(col.items, col.name),
  }))
}

function flattenNodesToApis(nodes = [], prefix = '') {
  const result = []
  for (const node of nodes) {
    if (node.type === 'api') {
      result.push({
        ...deepClone(node),
        folderPath: prefix,
      })
    } else if (node.type === 'folder') {
      const nextPrefix = prefix ? `${prefix} / ${node.name}` : node.name
      result.push(...flattenNodesToApis(node.children || [], nextPrefix))
    }
  }
  return result
}

export function findApiById(collections = [], apiId) {
  for (const col of normalizeCollections(collections)) {
    const found = walkNodes(col.items, node => node.type === 'api' && node.id === apiId ? node : null)
    if (found) return deepClone(found)
  }
  return null
}

export function buildCollectionTree(collections = []) {
  return normalizeCollections(collections).map(col => ({
    id: `collection:${col.id}`,
    rawId: col.id,
    type: 'collection',
    name: col.name,
    children: buildTreeChildren(col.items, col.id),
  }))
}

function buildTreeChildren(nodes = [], collectionId) {
  return nodes.map(node => {
    if (node.type === 'folder') {
      return {
        id: `folder:${node.id}`,
        rawId: node.id,
        type: 'folder',
        collectionId,
        name: node.name,
        children: buildTreeChildren(node.children || [], collectionId),
      }
    }
    return {
      id: `api:${node.id}`,
      rawId: node.id,
      type: 'api',
      collectionId,
      name: node.name,
      method: node.method,
      url: node.url,
      item: deepClone(node),
      children: [],
    }
  })
}

export function getCollectionNodeById(collections = [], collectionId, nodeId) {
  const col = normalizeCollections(collections).find(item => item.id === collectionId)
  if (!col) return null
  if (!nodeId) return null
  return walkNodes(col.items, node => node.id === nodeId ? deepClone(node) : null)
}

const MAX_HISTORY = 500

export function loadHistory() {
  return load(STORAGE_KEYS.history, [])
}

export function saveToHistory(record) {
  const history = loadHistory()
  const item = {
    id: uuid(),
    method: record.method,
    url: record.url,
    status: record.status,
    time: record.time,
    timestamp: Date.now(),
    params: record.params || [],
    headers: record.headers || [],
    pathVars: record.pathVars || [],
    body: record.body || { type: 'none', content: '' },
    auth: record.auth || { type: 'none' },
  }
  history.unshift(item)
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
  save(STORAGE_KEYS.history, history)
  return item
}

export function clearHistory() {
  save(STORAGE_KEYS.history, [])
}

export function deleteHistoryItem(id) {
  save(STORAGE_KEYS.history, loadHistory().filter(h => h.id !== id))
}
