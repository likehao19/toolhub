/**
 * API Workbench — test suite runner
 */
import { load, save, STORAGE_KEYS, buildUrl, buildAuthHeader, getNestedValue } from './shared'
import { resolveVariables } from './environment'
import { sendRequest } from './httpEngine'
import { findApiById } from './collections'

export function loadTestSuites() {
  return load(STORAGE_KEYS.testSuites, [])
}

export function saveTestSuites(suites) {
  save(STORAGE_KEYS.testSuites, suites)
}

export function runAssertion(assertion, response) {
  const { target, operator, expected } = assertion
  let actual
  if (target === 'status') actual = response.status
  else if (target === 'responseTime') actual = response.time
  else if (target.startsWith('header.')) actual = response.headers?.[target.slice(7)]
  else if (target.startsWith('body.')) {
    try {
      const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      actual = getNestedValue(body, target.slice(5))
    } catch { actual = undefined }
  } else if (target === 'body') actual = response.body

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
        vars[ext.variable] = response.headers?.[ext.path]
      } else if (ext.source === 'status') {
        vars[ext.variable] = response.status
      }
    } catch { /* skip */ }
  }
  return vars
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
    }

    let url = resolveVariables(merged.url, runtimeVars)
    url = buildUrl(url, merged.params)

    const headerMap = {}
    ;(merged.headers || []).filter(h => h.enabled && h.key).forEach(h => {
      headerMap[resolveVariables(h.key, runtimeVars)] = resolveVariables(h.value, runtimeVars)
    })
    const authH = buildAuthHeader(merged.auth)
    if (authH) headerMap[authH.key] = resolveVariables(authH.value, runtimeVars)

    let bodyPayload = null
    if (merged.body?.type === 'json' && merged.body.content) {
      headerMap['Content-Type'] = 'application/json'
      bodyPayload = resolveVariables(merged.body.content, runtimeVars)
    }

    try {
      const res = await sendRequest({ method: merged.method, url, headers: headerMap, body: bodyPayload, timeout: 15000 })
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
