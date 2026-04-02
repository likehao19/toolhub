/**
 * API Workbench — API docs + data models + schema inference
 */
import { load, save } from './shared'

export function loadApiDocs() {
  return load('api-wb-api-docs', [])
}

export function saveApiDocs(docs) {
  save('api-wb-api-docs', docs)
}

export function loadDataModels() {
  return load('api-wb-data-models', [])
}

export function saveDataModels(models) {
  save('api-wb-data-models', models)
}

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
