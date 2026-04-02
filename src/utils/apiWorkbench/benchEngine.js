/**
 * API Workbench — benchmark / load testing engine
 */

function computeStats(results, elapsed, totalDuration) {
  if (!results.length) {
    return { total: 0, success: 0, fail: 0, avgTime: 0, minTime: 0, maxTime: 0, p50: 0, p90: 0, p95: 0, p99: 0, qps: 0, errorRate: 0, progress: 0 }
  }
  const times = results.map(r => r.time).sort((a, b) => a - b)
  const success = results.filter(r => r.ok).length
  const fail = results.length - success
  const sum = times.reduce((a, b) => a + b, 0)

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
    progress: Math.min(100, Math.round((elapsed / totalDuration) * 100)),
  }
}

export async function runBenchmark(config, onProgress, abortSignal) {
  const { url, method = 'GET', headers = {}, body = null,
    concurrency = 10, duration = 10, requestDelay = 0 } = config

  const startTime = Date.now()
  const endTime = startTime + duration * 1000
  const results = []
  let activeCount = 0
  let totalSent = 0
  let stopped = false

  const snapshots = []

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => { stopped = true })
  }

  const doRequest = async () => {
    const t0 = performance.now()
    try {
      const fetchOpts = {
        method,
        headers: { ...headers },
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      }
      if (abortSignal) fetchOpts.signal = abortSignal
      const res = await fetch(url, fetchOpts)
      const t1 = performance.now()
      results.push({ time: Math.round(t1 - t0), status: res.status, ok: res.ok, ts: Date.now() })
    } catch (err) {
      if (err.name === 'AbortError') return // graceful stop
      const t1 = performance.now()
      results.push({ time: Math.round(t1 - t0), status: 0, ok: false, error: err.message, ts: Date.now() })
    }
    totalSent++
  }

  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() < endTime && !stopped) {
      activeCount++
      await doRequest()
      activeCount--
      if (requestDelay > 0) await new Promise(r => setTimeout(r, requestDelay))
    }
  })

  const progressTimer = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    const snapshot = computeStats(results, elapsed, duration)
    snapshots.push({ ...snapshot, elapsed })
    if (onProgress) onProgress(snapshot, snapshots)
  }, 500)

  await Promise.all(workers)
  clearInterval(progressTimer)

  const totalElapsed = (Date.now() - startTime) / 1000
  const finalStats = computeStats(results, totalElapsed, duration)
  finalStats.progress = 100
  finalStats.aborted = stopped
  finalStats.snapshots = snapshots
  return finalStats
}
