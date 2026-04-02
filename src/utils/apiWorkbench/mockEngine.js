/**
 * API Workbench — mock data engine
 */
import { load, save, STORAGE_KEYS, getNestedValue } from './shared'

const MOCK_RULES = [
  { pattern: /id$/i, gen: () => Math.floor(Math.random() * 100000) },
  { pattern: /name$/i, gen: () => ['张三','李四','王五','赵六','陈七'][Math.floor(Math.random()*5)] },
  { pattern: /email/i, gen: () => `user${Math.floor(Math.random()*999)}@example.com` },
  { pattern: /phone|mobile/i, gen: () => `138${String(Math.floor(Math.random()*100000000)).padStart(8,'0')}` },
  { pattern: /url|link|href/i, gen: () => `https://example.com/${Math.random().toString(36).slice(2,8)}` },
  { pattern: /avatar|image|img|icon/i, gen: () => `https://picsum.photos/200?r=${Math.floor(Math.random()*1000)}` },
  { pattern: /time|date|created|updated|At$/i, gen: () => new Date(Date.now() - Math.random()*86400000*30).toISOString() },
  { pattern: /address|addr/i, gen: () => ['北京市朝阳区','上海市浦东新区','深圳市南山区','杭州市西湖区'][Math.floor(Math.random()*4)] },
  { pattern: /desc|description|content|text|bio/i, gen: () => '这是一段模拟的描述文本内容。' },
  { pattern: /status/i, gen: () => [0, 1, 2][Math.floor(Math.random()*3)] },
  { pattern: /price|amount|money/i, gen: () => +(Math.random()*1000).toFixed(2) },
  { pattern: /count|num|total|quantity/i, gen: () => Math.floor(Math.random()*100) },
  { pattern: /^is|^has|^can|boolean/i, gen: () => Math.random() > 0.5 },
  { pattern: /title/i, gen: () => ['项目A','任务B','报告C','文档D'][Math.floor(Math.random()*4)] },
  { pattern: /code/i, gen: () => 0 },
  { pattern: /message|msg/i, gen: () => 'success' },
  { pattern: /token/i, gen: () => `tk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}` },
]

export function smartMockValue(fieldName, fieldType = 'string') {
  for (const rule of MOCK_RULES) {
    if (rule.pattern.test(fieldName)) return rule.gen()
  }
  switch (fieldType) {
    case 'number': case 'integer': return Math.floor(Math.random() * 100)
    case 'boolean': return Math.random() > 0.5
    case 'array': return []
    case 'object': return {}
    default: return `mock_${fieldName}`
  }
}

export function generateMockData(schema, fieldName = '') {
  if (!schema) return null
  switch (schema.type) {
    case 'object': {
      const obj = {}
      if (schema.properties) {
        for (const [k, v] of Object.entries(schema.properties)) {
          obj[k] = generateMockData(v, k)
        }
      }
      return obj
    }
    case 'array': {
      const count = 3 + Math.floor(Math.random() * 5)
      return Array.from({ length: count }, () => generateMockData(schema.items || { type: 'string' }, fieldName))
    }
    default: return smartMockValue(fieldName, schema.type)
  }
}

export function loadMockRules() {
  return load(STORAGE_KEYS.mockRules, [])
}

export function saveMockRules(rules) {
  save(STORAGE_KEYS.mockRules, rules)
}

export function matchExpectation(expectations, request) {
  for (const exp of expectations) {
    if (!exp.enabled) continue
    if (!exp.conditions?.length) return exp
    const allMatch = exp.conditions.every(cond => {
      const actual = getNestedValue(request, cond.path)
      switch (cond.operator) {
        case '==': return String(actual) === String(cond.value)
        case '!=': return String(actual) !== String(cond.value)
        case 'contains': return String(actual).includes(cond.value)
        case 'exists': return actual !== undefined
        default: return false
      }
    })
    if (allMatch) return exp
  }
  return null
}
