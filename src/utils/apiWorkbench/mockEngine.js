/**
 * API Workbench — mock data engine
 * 支持可复现：传入 seed 后所有 Math.random 调用走确定性 PRNG。
 */
import { load, save, STORAGE_KEYS, getNestedValue } from './shared'

/* mulberry32：32-bit PRNG，同 seed 同序列；周期 2^32 对 mock 足够。 */
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* 当前激活的随机源；未指定 seed 时直接用 Math.random */
let _rand = Math.random

function rand() { return _rand() }
function randInt(maxExclusive) { return Math.floor(rand() * maxExclusive) }
function pick(arr) { return arr[randInt(arr.length)] }

const MOCK_RULES = [
  { pattern: /id$/i, gen: () => randInt(100000) },
  { pattern: /name$/i, gen: () => pick(['张三','李四','王五','赵六','陈七']) },
  { pattern: /email/i, gen: () => `user${randInt(999)}@example.com` },
  { pattern: /phone|mobile/i, gen: () => `138${String(randInt(100000000)).padStart(8,'0')}` },
  { pattern: /url|link|href/i, gen: () => `https://example.com/${rand().toString(36).slice(2,8)}` },
  { pattern: /avatar|image|img|icon/i, gen: () => `https://picsum.photos/200?r=${randInt(1000)}` },
  // At$ 不加 i 标志，避免 flat/meat/seat 命中 lowercase at
  { pattern: /(time|date|created|updated)/i, gen: () => new Date(Date.now() - rand()*86400000*30).toISOString() },
  { pattern: /At$/, gen: () => new Date(Date.now() - rand()*86400000*30).toISOString() },
  { pattern: /address|addr/i, gen: () => pick(['北京市朝阳区','上海市浦东新区','深圳市南山区','杭州市西湖区']) },
  { pattern: /desc|description|content|text|bio/i, gen: () => '这是一段模拟的描述文本内容。' },
  { pattern: /status/i, gen: () => pick([0, 1, 2]) },
  { pattern: /price|amount|money/i, gen: () => +(rand()*1000).toFixed(2) },
  { pattern: /count|num|total|quantity/i, gen: () => randInt(100) },
  // ^is/^has/^can/^should 需后接大写字母作为驼峰边界，避免 cancel/canvas/should
  { pattern: /^(is|has|can|should|need)[A-Z]|^boolean$/, gen: () => rand() > 0.5 },
  { pattern: /title/i, gen: () => pick(['项目A','任务B','报告C','文档D']) },
  { pattern: /code/i, gen: () => 0 },
  { pattern: /message|msg/i, gen: () => 'success' },
  { pattern: /token/i, gen: () => `tk_${rand().toString(36).slice(2)}${rand().toString(36).slice(2)}` },
]

export function smartMockValue(fieldName, fieldType = 'string') {
  for (const rule of MOCK_RULES) {
    if (rule.pattern.test(fieldName)) return rule.gen()
  }
  switch (fieldType) {
    case 'number': case 'integer': return randInt(100)
    case 'boolean': return rand() > 0.5
    case 'array': return []
    case 'object': return {}
    default: return `mock_${fieldName}`
  }
}

export function generateMockData(schema, fieldName = '', options = {}) {
  // 顶层入口处理 seed：本次生成内部 rand 全部走该 PRNG
  if (Object.prototype.hasOwnProperty.call(options, 'seed') && options.seed != null && options.seed !== '') {
    const seedNum = typeof options.seed === 'number' ? options.seed : hashString(String(options.seed))
    const prng = mulberry32(seedNum)
    const prev = _rand
    _rand = prng
    try {
      return _generateInternal(schema, fieldName)
    } finally {
      _rand = prev
    }
  }
  return _generateInternal(schema, fieldName)
}

function _generateInternal(schema, fieldName) {
  if (!schema) return null
  switch (schema.type) {
    case 'object': {
      const obj = {}
      if (schema.properties) {
        for (const [k, v] of Object.entries(schema.properties)) {
          obj[k] = _generateInternal(v, k)
        }
      }
      return obj
    }
    case 'array': {
      const count = 3 + randInt(5)
      return Array.from({ length: count }, () => _generateInternal(schema.items || { type: 'string' }, fieldName))
    }
    default: return smartMockValue(fieldName, schema.type)
  }
}

/* 字符串 → 32-bit hash（FNV-1a 变种），用于把"appkey"这种字面 seed 转 number */
function hashString(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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
