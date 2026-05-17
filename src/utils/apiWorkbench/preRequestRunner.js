/**
 * Pre-request Script 沙箱执行器
 *
 * 设计：
 * - Function 构造器执行用户代码（async function 形式，便于用 await）
 * - 注入有限的 pm.* API + console
 * - 只通过 ctx 写出运行时变量，绝不污染调用方 reactive 对象
 *
 * 限制：
 * - 不做 V8 isolated heap，沙箱不防恶意；本地工具，用户写自己的脚本，威胁面有限
 * - 不暴露 fetch/Tauri API，避免脚本"偷偷发请求"，可后续按需放开
 */

/**
 * @param {string} script
 * @param {{
 *   request: object,
 *   variables: Record<string, string>,
 *   environment: Record<string, string>,
 * }} ctx
 * @returns {Promise<{ variables: Record<string,string>, logs: string[], error?: string }>}
 */
export async function runPreRequestScript(script, ctx) {
  const code = String(script || '').trim()
  const logs = []
  const vars = { ...(ctx.variables || {}) }
  const env = { ...(ctx.environment || {}) }

  if (!code) return { variables: vars, environment: env, logs }

  const pm = {
    request: ctx.request,
    variables: {
      get: (k) => vars[k],
      set: (k, v) => { vars[String(k)] = v == null ? '' : String(v) },
      unset: (k) => { delete vars[String(k)] },
      has: (k) => Object.prototype.hasOwnProperty.call(vars, k),
    },
    environment: {
      get: (k) => env[k] ?? vars[k],
      set: (k, v) => {
        // 写到运行时 vars（不修改持久化 env），避免脚本污染环境配置
        vars[String(k)] = v == null ? '' : String(v)
      },
      unset: (k) => { delete vars[String(k)] },
    },
  }
  const console_ = {
    log: (...a) => logs.push(a.map(stringify).join(' ')),
    warn: (...a) => logs.push('[warn] ' + a.map(stringify).join(' ')),
    error: (...a) => logs.push('[error] ' + a.map(stringify).join(' ')),
  }

  try {
    /* 用 AsyncFunction 包装，让 await 可用；用 'use strict' 防止意外 var 泄漏到 global */
    // eslint-disable-next-line no-new-func
    const fn = new (Object.getPrototypeOf(async function(){}).constructor)(
      'pm', 'console', 'crypto', 'btoa', 'atob', 'TextEncoder', 'TextDecoder',
      `"use strict";\n${code}`
    )
    await fn(pm, console_, globalThis.crypto, globalThis.btoa, globalThis.atob, globalThis.TextEncoder, globalThis.TextDecoder)
    return { variables: vars, environment: env, logs }
  } catch (err) {
    return { variables: vars, environment: env, logs, error: err?.message || String(err) }
  }
}

function stringify(v) {
  if (v == null) return String(v)
  if (typeof v === 'object') {
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}
