/**
 * API Workbench — collections + history CRUD
 */
import { load, save, STORAGE_KEYS, uuid } from './shared'

// ==================== Collections ====================
export function loadCollections() {
  return load(STORAGE_KEYS.collections, [])
}

export function saveCollections(collections) {
  save(STORAGE_KEYS.collections, collections)
}

export function createCollection(name) {
  const collections = loadCollections()
  const col = { id: uuid(), name, items: [] }
  collections.push(col)
  saveCollections(collections)
  return col
}

export function deleteCollection(id) {
  const collections = loadCollections().filter(c => c.id !== id)
  saveCollections(collections)
}

export function renameCollection(id, name) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === id)
  if (col) { col.name = name; saveCollections(collections) }
}

export function saveRequestToCollection(collectionId, request) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (!col) return null
  const item = {
    id: uuid(),
    name: request.name || `${request.method} ${request.url}`,
    method: request.method,
    url: request.url,
    params: request.params || [],
    headers: request.headers || [],
    body: request.body || { type: 'none', content: '' },
    auth: request.auth || { type: 'none' },
  }
  col.items.push(item)
  saveCollections(collections)
  return item
}

export function deleteCollectionItem(collectionId, itemId) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (col) {
    col.items = col.items.filter(i => i.id !== itemId)
    saveCollections(collections)
  }
}

export function updateCollectionItem(collectionId, itemId, updates) {
  const collections = loadCollections()
  const col = collections.find(c => c.id === collectionId)
  if (col) {
    const idx = col.items.findIndex(i => i.id === itemId)
    if (idx !== -1) {
      col.items[idx] = { ...col.items[idx], ...updates }
      saveCollections(collections)
    }
  }
}

// ==================== History ====================
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
  const history = loadHistory().filter(h => h.id !== id)
  save(STORAGE_KEYS.history, history)
}
