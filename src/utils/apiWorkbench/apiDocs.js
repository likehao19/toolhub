/**
 * API Workbench — API docs + data models + schema inference
 *
 * Tree data model:
 *   - folder: { id, type: 'folder', name, children: [...] }
 *   - doc:    { id, type: 'doc', name, method, path, group, description, fields, responseExample }
 *
 * 向后兼容旧扁平数组（无 type 字段的 doc 列表）。
 */
import { load, save, uuid } from './shared'

const STORAGE_KEY = 'api-wb-api-docs'

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureDocShape(node) {
  return {
    id: node.id || uuid(),
    type: 'doc',
    name: node.name || '新接口',
    method: node.method || 'GET',
    path: node.path || '/api/',
    group: node.group || '',
    description: node.description || '',
    fields: Array.isArray(node.fields) ? node.fields : [],
    responseExample: node.responseExample || '{ "code": 0, "data": {}, "message": "success" }',
  }
}

function ensureFolderShape(node) {
  return {
    id: node.id || uuid(),
    type: 'folder',
    name: node.name || '文件夹',
    children: normalizeNodes(node.children || []),
  }
}

function normalizeNodes(nodes = []) {
  return (nodes || []).map(node => {
    if (node?.type === 'folder') return ensureFolderShape(node)
    if (node?.type === 'doc') return ensureDocShape(node)
    // 旧数据（无 type）一律按 doc 处理
    return ensureDocShape(node || {})
  })
}

export function loadApiDocs() {
  return normalizeNodes(load(STORAGE_KEY, []))
}

export function saveApiDocs(nodes) {
  save(STORAGE_KEY, normalizeNodes(nodes))
}

export function loadDataModels() {
  return load('api-wb-data-models', [])
}

export function saveDataModels(models) {
  save('api-wb-data-models', models)
}

/* ============================================================
   树操作 helpers
   ============================================================ */

/**
 * 深度遍历，找到第一个满足 predicate 的节点
 */
export function walkNodes(nodes = [], visitor, parent = null) {
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

/**
 * 找指定 id 的节点（不可变副本）
 */
export function findNodeById(nodes, id) {
  return walkNodes(nodes, n => n.id === id ? n : null)
}

/**
 * 找指定 id 节点的父节点（folder 或 null=root）
 */
export function findParentOf(nodes, id) {
  return walkNodes(nodes, (n, parent) => n.id === id ? parent : null)
}

/**
 * 删除指定 id 的节点（递归）
 * 返回新的 nodes 数组（不修改原数组）
 */
export function removeNodeById(nodes = [], id) {
  const next = []
  for (const node of nodes) {
    if (node.id === id) continue
    if (node.type === 'folder') {
      next.push({ ...node, children: removeNodeById(node.children || [], id) })
    } else {
      next.push(node)
    }
  }
  return next
}

/**
 * 在指定 parentId（null=root）下追加节点；
 * 直接修改 nodes，并返回是否成功
 */
export function appendNode(nodes, parentId, child) {
  if (!parentId) {
    nodes.push(child)
    return true
  }
  const parent = walkNodes(nodes, n => n.id === parentId && n.type === 'folder' ? n : null)
  if (!parent) return false
  parent.children = parent.children || []
  parent.children.push(child)
  return true
}

/**
 * 创建文件夹（追加到 parentId 下，null=root），返回新文件夹
 */
export function createFolder(nodes, parentId, name) {
  const folder = ensureFolderShape({ id: uuid(), name, children: [] })
  return appendNode(nodes, parentId, folder) ? folder : null
}

/**
 * 创建接口文档（追加到 parentId 下，null=root），返回新文档
 */
export function createDoc(nodes, parentId, partial = {}) {
  const doc = ensureDocShape({ id: uuid(), ...partial })
  return appendNode(nodes, parentId, doc) ? doc : null
}

/**
 * 收集所有 doc 节点（扁平），保留 folderPath 用于分组显示
 */
export function flattenDocs(nodes = [], prefix = '') {
  const result = []
  for (const node of nodes) {
    if (node.type === 'doc') {
      result.push({ ...deepClone(node), folderPath: prefix })
    } else if (node.type === 'folder') {
      const next = prefix ? `${prefix} / ${node.name}` : node.name
      result.push(...flattenDocs(node.children || [], next))
    }
  }
  return result
}

/**
 * 是否是 folder 节点的后代（用于禁止把祖先拖到子孙下，避免循环）
 */
export function isDescendant(folder, candidateId) {
  if (!folder || folder.type !== 'folder') return false
  return !!walkNodes(folder.children || [], n => n.id === candidateId ? n : null)
}

/* ============================================================
   Schema 推断（不变）
   ============================================================ */

export function inferSchema(value) {
  if (value === null) return { type: 'string' }
  if (Array.isArray(value)) {
    return { type: 'array', items: value.length ? inferSchema(value[0]) : { type: 'string' } }
  }
  if (typeof value === 'object') {
    const properties = {}
    const required = []
    for (const [k, v] of Object.entries(value)) {
      properties[k] = inferSchema(v)
      if (v !== null && v !== undefined) required.push(k)
    }
    return { type: 'object', properties, required }
  }
  return { type: typeof value }
}

export function schemaToExample(schema) {
  if (!schema) return null
  if (schema.example !== undefined) return schema.example
  switch (schema.type) {
    case 'string': return schema.format === 'date-time' ? '2024-01-01T00:00:00Z' : 'string'
    case 'number': return 0
    case 'integer': return 0
    case 'boolean': return true
    case 'array': return schema.items ? [schemaToExample(schema.items)] : []
    case 'object': {
      const obj = {}
      if (schema.properties) {
        for (const [k, v] of Object.entries(schema.properties)) obj[k] = schemaToExample(v)
      }
      return obj
    }
    default: return null
  }
}
