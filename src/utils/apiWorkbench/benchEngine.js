/**
 * API Workbench — benchmark / load testing engine
 * 用 Tauri http plugin 绕过浏览器 CORS。
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const MAX_RESULTS = 100000  // 防止长时间高 QPS 把内存撑爆

function computeStats(results, elapsed, totalDuration) {
  if (!results.length) {
    return { total: 0, success: 0, fail: 0, avgTime: 0, minTime: 0, maxTime: 0, p50: 0, p90: 0, p95: 0, p99: 0, qps: 0, errorRate: 0, progress: 0 }
  }
  const times = results.map(r => r.time).sort((a, b) => a - b)
  const success = results.filter(r => r.ok).length
  const fail = results.length - success
  const sum = times.reduce((a, b) => a + b, 0)
  const progress = totalDuration > 0
    ? Math.min(100, Math.round((elapsed / totalDuration) * 100))
    : 0

  return {
    total: results.length,
    success,
    fail,
    avgTime: Math.round(sum / times.length),
    minTime: times[0],
    maxTime: times[times.length - 1],
    p50: times[Math.floor(times.length * 0.5)] || 0,
    p90: times[Math.floor(times.length * 0.9)] || 0,
    p95: times[Math.floor(times.length * 0.95)] || 0,
    p99: times[Math.floor(times.length * 0.99)] || 0,
    qps: +(results.length / Math.max(elapsed, 0.1)).toFixed(1),
    errorRate: results.length ? +((fail / results.length) * 100).toFixed(1) : 0,
    progress,
  }
}

function abortableSleep(ms, signal) {
  if (ms <= 0) return Promise.resolve()
  if (signal?.aborted) return Promise.resolve()
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms)
    if (signal) {
      const onAbort = () => { clearTimeout(timer); resolve() }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

export async function runBenchmark(config, onProgress, abortSignal) {
  const { url, method = 'GET', headers = {}, body = null,
    concurrency = 10, duration = 10, requestDelay = 0, maxRequests = 0 } = config

  const startTime = Date.now()
  const endTime = duration > 0 ? startTime + duration * 1000 : Infinity
  const targetCount = maxRequests > 0 ? maxRequests : Infinity
  const results = []
  let stopped = false
  let sent = 0  // 已发出（含失败/取消）总数，用于 maxRequests 控流

  const snapshots = []

  if (abortSignal) {
    if (abortSignal.aborted) stopped = true
    else abortSignal.addEventListener('abort', () => { stopped = true }, { once: true })
  }

  const hasBody = body != null && method !== 'GET' && method !== 'HEAD'

  const doRequest = async () => {
    const t0 = performance.now()
    try {
      const res = await tauriFetch(url, {
        method,
        headers: { ...headers },
        body: hasBody ? body : undefined,
        signal: abortSignal,
        connectTimeout: 15000,
      })
      const t1 = performance.now()
      pushResult({ time: Math.round(t1 - t0), status: res.status, ok: res.ok, ts: Date.now() })
    } catch (err) {
      if (err?.name === 'AbortError' || /abort/i.test(err?.message || '')) return
      const t1 = performance.now()
      pushResult({ time: Math.round(t1 - t0), status: 0, ok: false, error: err.message, ts: Date.now() })
    }
  }

  const pushResult = (entry) => {
    if (results.length >= MAX_RESULTS) {
      // 丢掉最旧一半，保留近期样本驱动 percentile（监控用足够）
      results.splice(0, Math.floor(MAX_RESULTS / 2))
    }
    results.push(entry)
  }

  /* 每个 worker 在条件未满足前持续发请求：
     - duration > 0：到 endTime 截止
     - maxRequests > 0：到 sent >= targetCount 截止
     - 两者同时设置：先到先停
     - 取消 / 用户 stop：立刻停 */
  const shouldContinue = () => {
    if (stopped) return false
    if (Date.now() >= endTime) return false
    if (sent >= targetCount) return false
    return true
  }

  const workers = Array.from({ length: concurrency }, async () => {
    while (shouldContinue()) {
      // 抢号：先占住 sent 槽位，避免多 worker 超发
      if (sent >= targetCount) break
      sent += 1
      await doRequest()
      if (!shouldContinue()) break
      if (requestDelay > 0) await abortableSleep(requestDelay, abortSignal)
    }
  })

  const progressTimer = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    const denomDuration = duration > 0 ? duration : Math.max(elapsed, 0.1)
    const baseSnap = computeStats(results, elapsed, denomDuration)
    // maxRequests 模式下进度按已完成 / 目标算
    if (targetCount !== Infinity) {
      baseSnap.progress = Math.min(100, Math.round((results.length / targetCount) * 100))
    }
    snapshots.push({ ...baseSnap, elapsed })
    if (onProgress) onProgress(baseSnap, snapshots)
  }, 500)

  await Promise.all(workers)
  clearInterval(progressTimer)

  const totalElapsed = (Date.now() - startTime) / 1000
  const denomDuration = duration > 0 ? duration : Math.max(totalElapsed, 0.1)
  const finalStats = computeStats(results, totalElapsed, denomDuration)
  finalStats.progress = 100
  finalStats.aborted = stopped
  finalStats.snapshots = snapshots
  return finalStats
}
