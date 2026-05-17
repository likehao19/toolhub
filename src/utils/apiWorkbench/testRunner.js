/**
 * API Workbench — test suite runner
 */
import { load, save, STORAGE_KEYS, buildUrl, buildAuthHeader, getNestedValue } from './shared'
import { resolveVariables } from './environment'
import { sendRequest, buildMultipartBody } from './httpEngine'
import { findApiById } from './collections'

export function loadTestSuites() {
  return load(STORAGE_KEYS.testSuites, [])
}

export function saveTestSuites(suites) {
  save(STORAGE_KEYS.testSuites, suites)
}

/* 大小写不敏感的 header 读取，兼容 Content-Type / content-type 两种返回 */
function getHeaderCI(headers, name) {
  if (!headers) return undefined
  const lower = String(name).toLowerCase()
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return headers[k]
  }
  return undefined
}

/* 只替换 path / query 段的 :name，避开 scheme(:) 和 user:pass@ 段 */
function applyPathVarsInUrl(url, pathVars = []) {
  if (!pathVars.length) return url
  const schemeIdx = url.indexOf('://')
  let prefix = ''
  let rest = url
  if (schemeIdx > -1) {
    prefix = url.slice(0, schemeIdx + 3)
    rest = url.slice(schemeIdx + 3)
    const atIdx = rest.indexOf('@')
    const slashIdx = rest.indexOf('/')
    if (atIdx > -1 && (slashIdx === -1 || atIdx < slashIdx)) {
      prefix += rest.slice(0, atIdx + 1)
      rest = rest.slice(atIdx + 1)
    }
  }
  const replaced = rest.replace(/:([A-Za-z_][\w-]*)/g, (_, name) => {
    const v = pathVars.find(x => x.key === name)
    return v && v.value !== '' ? encodeURIComponent(v.value) : `:${name}`
  })
  return prefix + replaced
}

export function runAssertion(assertion, response) {
  const { target, operator, expected } = assertion
  let actual
  if (target === 'status') actual = response.status
  else if (target === 'responseTime') actual = response.time
  else if (target.startsWith('header.')) actual = getHeaderCI(response.headers, target.slice(7))
  else if (target.startsWith('body.')) {
    try {
      const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      actual = getNestedValue(body, target.slice(5))
    } catch { actual = undefined }
  } else if (target === 'body') {
    // 原文字符串；contains/regex/== 直接用
    actual = response.body
  } else if (target === 'bodyJson') {
    // 显式取 JSON 对象（用于结构断言 / 取整个对象与某 fixture 对比）
    try { actual = typeof response.body === 'string' ? JSON.parse(response.body) : response.body }
    catch { actual = undefined }
  }

  let pass = false
  switch (operator) {
    case '==': pass = String(actual) === String(expected); break
    case '!=': pass = String(actual) !== String(expected); break
    case '>':  pass = Number(actual) > Number(expected); break
    case '<':  pass = Number(actual) < Number(expected); break
    case '>=': pass = Number(actual) >= Number(expected); break
    case '<=': pass = Number(actual) <= Number(expected); break
    case 'contains': pass = String(actual).includes(expected); break
    case 'notEmpty': pass = actual !== null && actual !== undefined && actual !== ''; break
    case 'regex': try { pass = new RegExp(expected).test(String(actual)) } catch { pass = false }; break
  }
  return { ...assertion, actual, pass }
}

export function extractVariables(extractors, response) {
  const vars = {}
  for (const ext of extractors) {
    try {
      if (ext.source === 'body') {
        const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
        vars[ext.variable] = getNestedValue(body, ext.path)
      } else if (ext.source === 'header') {
        vars[ext.variable] = getHeaderCI(response.headers, ext.path)
      } else if (ext.source === 'status') {
        vars[ext.variable] = response.status
      }
    } catch { /* skip */ }
  }
  return vars
}

async function buildRequestPayload(merged, runtimeVars) {
  // URL: env vars → path vars → query params
  let url = resolveVariables(merged.url, runtimeVars)
  url = applyPathVarsInUrl(url, merged.pathVars || [])
  url = buildUrl(url, merged.params)

  // Headers: 每个 key/value 都过 env vars
  const headerMap = {}
  ;(merged.headers || []).filter(h => h.enabled && h.key).forEach(h => {
    headerMap[resolveVariables(h.key, runtimeVars)] = resolveVariables(h.value, runtimeVars)
  })

  // Auth: 五个字段都要 resolveVariables，再交给 buildAuthHeader
  const authResolved = { ...(merged.auth || {}) }
  ;['token', 'username', 'password', 'key', 'value'].forEach(f => {
    if (authResolved[f]) authResolved[f] = resolveVariables(authResolved[f], runtimeVars)
  })
  const authH = buildAuthHeader(authResolved)
  if (authH) headerMap[authH.key] = authH.value
  if (authResolved.type === 'apikey' && authResolved.position === 'query' && authResolved.key) {
    url += (url.includes('?') ? '&' : '?') + `${encodeURIComponent(authResolved.key)}=${encodeURIComponent(authResolved.value || '')}`
  }

  // Body: 四种类型全支持
  let bodyPayload = null
  const bodyType = merged.body?.type
  if (bodyType === 'json' && merged.body.content) {
    headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/json'
    bodyPayload = resolveVariables(merged.body.content, runtimeVars)
  } else if (bodyType === 'raw' && merged.body.content) {
    bodyPayload = resolveVariables(merged.body.content, runtimeVars)
  } else if (bodyType === 'form') {
    const fields = (merged.body.formData || []).filter(f => f.enabled && f.key)
    if (fields.length) {
      const formPairs = fields.map(f => `${encodeURIComponent(resolveVariables(f.key, runtimeVars))}=${encodeURIComponent(resolveVariables(f.value, runtimeVars))}`)
      if (formPairs.length) {
        headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/x-www-form-urlencoded'
        bodyPayload = formPairs.join('&')
      }
    } else if (merged.body.content) {
      // step.overrides.body 走 textarea，没有 formData，直接当 urlencoded 字符串发送
      headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/x-www-form-urlencoded'
      bodyPayload = resolveVariables(merged.body.content, runtimeVars)
    }
  } else if (bodyType === 'multipart') {
    const fields = (merged.body.formData || []).filter(f => f.enabled && f.key)
      .map(f => ({
        key: resolveVariables(f.key, runtimeVars),
        value: resolveVariables(f.value, runtimeVars),
      }))
    if (fields.length) {
      const built = await buildMultipartBody(fields)
      headerMap['Content-Type'] = built.contentType
      bodyPayload = built.body
    }
  }

  return { url, headerMap, bodyPayload }
}

export async function runTestSuite(suite, collections, envVars = {}, onStepDone) {
  const runtimeVars = { ...envVars }
  const stepResults = []
  const suiteStartAt = Date.now()

  for (let i = 0; i < suite.steps.length; i++) {
    const step = suite.steps[i]
    let apiDef = findApiById(collections, step.apiRef)
    if (!apiDef) {
      stepResults.push({ step, status: 'skipped', reason: 'API not found' })
      if (onStepDone) onStepDone(stepResults[stepResults.length - 1], i)
      continue
    }

    const merged = JSON.parse(JSON.stringify(apiDef))
    if (step.overrides) {
      if (step.overrides.headers) merged.headers = [...(merged.headers || []), ...step.overrides.headers]
      if (step.overrides.body) merged.body = { ...merged.body, ...step.overrides.body }
      if (step.overrides.pathVars) {
        // 用 step 覆盖默认值
        const map = Object.fromEntries((merged.pathVars || []).map(v => [v.key, v.value]))
        for (const ov of step.overrides.pathVars) map[ov.key] = ov.value
        merged.pathVars = Object.entries(map).map(([key, value]) => ({ key, value }))
      }
    }

    let payload
    try {
      payload = await buildRequestPayload(merged, runtimeVars)
    } catch (err) {
      const result = { step, status: 'error', error: err?.message || String(err) }
      stepResults.push(result)
      if (onStepDone) onStepDone(result, i)
      if (!step.continueOnFailure) break
      continue
    }

    try {
      const res = await sendRequest({
        method: merged.method,
        url: payload.url,
        headers: payload.headerMap,
        body: payload.bodyPayload,
        timeout: step.timeout || 15000,
      })
      const assertionResults = (step.assertions || []).map(a => runAssertion(a, res))
      const allPassed = assertionResults.every(a => a.pass)
      const extracted = extractVariables(step.extractors || [], res)
      Object.assign(runtimeVars, extracted)

      const result = { step, status: allPassed ? 'passed' : 'failed', response: res, assertions: assertionResults, extracted }
      stepResults.push(result)
      if (onStepDone) onStepDone(result, i)

      if (!allPassed && !step.continueOnFailure) break
    } catch (err) {
      const result = { step, status: 'error', error: err.message }
      stepResults.push(result)
      if (onStepDone) onStepDone(result, i)
      if (!step.continueOnFailure) break
    }
  }

  return {
    total: suite.steps.length,
    passed: stepResults.filter(r => r.status === 'passed').length,
    failed: stepResults.filter(r => r.status === 'failed').length,
    errors: stepResults.filter(r => r.status === 'error').length,
    skipped: stepResults.filter(r => r.status === 'skipped').length,
    results: stepResults,
    duration: Date.now() - suiteStartAt,
  }
}
