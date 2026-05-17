<template>
  <div class="perf-test-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Odometer /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('perfTest.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <div class="bench-layout">
        <!-- Config -->
        <div class="bench-config">
          <div class="config-title">{{ t('perfTest.benchConfig') }}</div>
          <el-form size="small" label-position="top" class="config-form">
            <el-form-item v-if="collectionApis.length" :label="t('perfTest.importFromCollection')">
              <el-select v-model="importApiId" filterable clearable :placeholder="t('perfTest.selectApi')" @change="onImportApi">
                <el-option v-for="api in collectionApis" :key="api.id" :label="`[${api.method}] ${api.label}`" :value="api.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="URL">
              <el-input v-model="benchUrl" placeholder="https://api.example.com/users" />
            </el-form-item>
            <div class="form-row">
              <el-form-item :label="t('perfTest.method')" class="row-method">
                <el-select v-model="benchMethod">
                  <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('perfTest.benchMode')" class="row-mode">
                <el-radio-group v-model="benchMode" size="small" class="mode-group">
                  <el-radio-button value="fixed">{{ t('perfTest.fixedMode') }}</el-radio-button>
                  <el-radio-button value="ramp">{{ t('perfTest.rampMode') }}</el-radio-button>
                  <el-radio-button value="count">{{ t('perfTest.countMode') }}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </div>
            <el-form-item label="Headers">
              <el-input v-model="benchHeaders" type="textarea" :rows="5"
                placeholder="Content-Type: application/json&#10;Authorization: Bearer xxx"
                resize="none"
                class="mono-input" />
            </el-form-item>
            <el-form-item v-if="benchMethod !== 'GET' && benchMethod !== 'HEAD'" label="Body">
              <el-input v-model="benchBody" type="textarea" :rows="5"
                placeholder='{"key": "value"}'
                resize="none"
                class="mono-input" />
            </el-form-item>
            <div class="form-row">
              <el-form-item :label="t('perfTest.concurrency')">
                <el-input-number v-model="benchConcurrency" :min="1" :max="200" controls-position="right" class="num-input" />
              </el-form-item>
              <el-form-item v-if="benchMode !== 'count'" :label="t('perfTest.duration')">
                <el-input-number v-model="benchDuration" :min="1" :max="300" controls-position="right" class="num-input" />
              </el-form-item>
              <el-form-item v-else :label="t('perfTest.maxRequests')">
                <el-input-number v-model="benchMaxRequests" :min="1" :max="100000" controls-position="right" class="num-input" />
              </el-form-item>
            </div>
            <el-form-item v-if="benchMode === 'ramp'" :label="t('perfTest.rampEnd')">
              <el-input-number v-model="benchRampEnd" :min="benchConcurrency" :max="1000" controls-position="right" class="num-input full" />
            </el-form-item>
          </el-form>
          <div class="config-actions">
            <el-button type="primary" size="small" :loading="benchRunning" :disabled="!benchUrl.trim()" @click="doStartBench">
              <el-icon style="margin-right: 6px;"><VideoPlay /></el-icon>{{ benchRunning ? t('perfTest.benchRunning') : t('perfTest.startBench') }}
            </el-button>
            <el-button v-if="benchRunning" type="danger" size="small" @click="doStopBench">
              <el-icon style="margin-right: 6px;"><VideoPause /></el-icon>{{ t('perfTest.stopBench') }}
            </el-button>
          </div>
        </div>
        <!-- Results -->
        <div class="bench-results">
          <template v-if="benchStats">
            <div class="bench-progress-bar">
              <el-progress :percentage="benchStats.progress" :stroke-width="8" :show-text="true" />
            </div>
            <div class="bench-stat-grid">
              <div class="bench-stat-card"><div class="stat-val">{{ benchStats.total }}</div><div class="stat-label">{{ t('perfTest.totalReqs') }}</div></div>
              <div class="bench-stat-card ok"><div class="stat-val">{{ benchStats.success }}</div><div class="stat-label">{{ t('perfTest.successCount') }}</div></div>
              <div class="bench-stat-card err"><div class="stat-val">{{ benchStats.fail }}</div><div class="stat-label">{{ t('perfTest.failCount') }}</div></div>
              <div class="bench-stat-card"><div class="stat-val">{{ benchStats.qps }}</div><div class="stat-label">QPS</div></div>
              <div class="bench-stat-card"><div class="stat-val">{{ benchStats.avgTime }}ms</div><div class="stat-label">{{ t('perfTest.avgTime') }}</div></div>
              <div class="bench-stat-card"><div class="stat-val">{{ benchStats.p95 }}ms</div><div class="stat-label">P95</div></div>
              <div class="bench-stat-card"><div class="stat-val">{{ benchStats.p99 }}ms</div><div class="stat-label">P99</div></div>
              <div class="bench-stat-card" :class="benchStats.errorRate > 5 ? 'err' : ''"><div class="stat-val">{{ benchStats.errorRate }}%</div><div class="stat-label">{{ t('perfTest.errorRate') }}</div></div>
            </div>
            <div v-if="benchSnapshots.length > 1" class="bench-chart-area">
              <div class="chart-title">{{ t('perfTest.timeline') }}</div>
              <div class="bench-chart-row" v-for="(snap, si) in benchSnapshots.slice(-20)" :key="si">
                <span class="chart-time">{{ snap.elapsed.toFixed(0) }}s</span>
                <span class="chart-bar-wrap">
                  <span class="chart-bar qps-bar" :style="{ width: Math.min(100, snap.qps / Math.max(...benchSnapshots.map(s=>s.qps), 1) * 100) + '%' }"></span>
                </span>
                <span class="chart-val">{{ snap.qps }} qps</span>
                <span class="chart-val">{{ snap.avgTime }}ms</span>
              </div>
            </div>
          </template>
          <div v-else class="empty-hint">
            {{ t('perfTest.benchHint') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { METHOD_COLORS, buildUrl, buildAuthHeader } from '@/utils/apiWorkbench/shared'
import { runBenchmark } from '@/utils/apiWorkbench/benchEngine'
import { loadCollections, flattenCollectionApis } from '@/utils/apiWorkbench/collections'
import { getActiveVariables, resolveVariables } from '@/utils/apiWorkbench/environment'

const router = useRouter()
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const benchUrl = ref('')
const benchMethod = ref('GET')
const benchMode = ref('fixed')  // fixed | ramp | count
const benchConcurrency = ref(10)
const benchDuration = ref(10)
const benchMaxRequests = ref(1000)
const benchRampEnd = ref(50)
const benchHeaders = ref('')
const benchBody = ref('')
const benchRunning = ref(false)
const benchStats = ref(null)
const benchSnapshots = ref([])
let benchAbort = null

const importApiId = ref('')
const collectionApis = ref([])  // [{ id, label, method, url, headers, body, auth, params, pathVars }]

function parseBenchHeaders() {
  const map = {}
  if (!benchHeaders.value.trim()) return map
  benchHeaders.value.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf(':')
    if (idx > 0) map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  })
  return map
}

function onImportApi(apiId) {
  if (!apiId) return
  const api = collectionApis.value.find(a => a.id === apiId)
  if (!api) return
  const vars = getActiveVariables()
  // URL + 现有 params 全部拼到 URL 里（压测时是死的）
  let url = resolveVariables(api.url || '', vars)
  url = buildUrl(url, api.params || [])
  benchUrl.value = url
  benchMethod.value = api.method || 'GET'

  // headers + auth → 转 textarea 文本
  const map = {}
  ;(api.headers || []).filter(h => h.enabled && h.key).forEach(h => {
    map[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
  })
  const authResolved = { ...(api.auth || {}) }
  ;['token', 'username', 'password', 'key', 'value'].forEach(f => {
    if (authResolved[f]) authResolved[f] = resolveVariables(authResolved[f], vars)
  })
  const authH = buildAuthHeader(authResolved)
  if (authH) map[authH.key] = authH.value
  benchHeaders.value = Object.entries(map).map(([k, v]) => `${k}: ${v}`).join('\n')

  // body：只接 raw / json（压测对 multipart 不友好，跳过）
  if (api.body?.type === 'json' || api.body?.type === 'raw') {
    benchBody.value = resolveVariables(api.body.content || '', vars)
  } else if (api.body?.type === 'form') {
    const pairs = (api.body.formData || []).filter(f => f.enabled && f.key)
      .map(f => `${encodeURIComponent(resolveVariables(f.key, vars))}=${encodeURIComponent(resolveVariables(f.value, vars))}`)
    benchBody.value = pairs.join('&')
    if (pairs.length && !map['Content-Type']) {
      benchHeaders.value = benchHeaders.value
        + (benchHeaders.value ? '\n' : '')
        + 'Content-Type: application/x-www-form-urlencoded'
    }
  } else {
    benchBody.value = ''
  }
  ElMessage.success(t('perfTest.importedFromCollection'))
}

async function doStartBench() {
  if (!benchUrl.value.trim()) return
  benchRunning.value = true
  benchStats.value = null
  benchSnapshots.value = []
  benchAbort = new AbortController()

  const headers = parseBenchHeaders()
  const body = benchBody.value.trim() || null

  try {
    if (benchMode.value === 'ramp') {
      const steps = 5
      const stepDuration = benchDuration.value / steps
      for (let i = 0; i < steps && !benchAbort.signal.aborted; i++) {
        const cc = Math.round(benchConcurrency.value + (benchRampEnd.value - benchConcurrency.value) * i / (steps - 1))
        await runBenchmark({
          url: benchUrl.value, method: benchMethod.value, headers, body,
          concurrency: cc, duration: stepDuration,
        }, (snap, snaps) => {
          benchStats.value = snap
          benchSnapshots.value = snaps
        }, benchAbort.signal)
      }
    } else if (benchMode.value === 'count') {
      const result = await runBenchmark({
        url: benchUrl.value, method: benchMethod.value, headers, body,
        concurrency: benchConcurrency.value,
        duration: 0,                            // 不按时长截止
        maxRequests: benchMaxRequests.value,    // 按数量截止
      }, (snap, snaps) => {
        benchStats.value = snap
        benchSnapshots.value = snaps
      }, benchAbort.signal)
      benchStats.value = result
    } else {
      const result = await runBenchmark({
        url: benchUrl.value, method: benchMethod.value, headers, body,
        concurrency: benchConcurrency.value, duration: benchDuration.value,
      }, (snap, snaps) => {
        benchStats.value = snap
        benchSnapshots.value = snaps
      }, benchAbort.signal)
      benchStats.value = result
    }
  } catch (err) {
    if (err.message !== 'Aborted') ElMessage.error(err.message)
  } finally {
    benchRunning.value = false
  }
}

function doStopBench() {
  if (benchAbort) benchAbort.abort()
  benchRunning.value = false
}

onMounted(() => {
  const cols = loadCollections()
  const flat = flattenCollectionApis(cols)
  const list = []
  for (const col of flat) {
    for (const api of (col.apis || [])) {
      list.push({
        id: api.id,
        label: api.folderPath ? `${col.name} / ${api.folderPath} / ${api.name}` : `${col.name} / ${api.name}`,
        method: api.method,
        url: api.url,
        headers: api.headers,
        body: api.body,
        auth: api.auth,
        params: api.params,
        pathVars: api.pathVars,
      })
    }
  }
  collectionApis.value = list
})
</script>

<style scoped>
.perf-test-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: var(--surface-panel);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  min-height: 52px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600;
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); }

.content-area { flex: 1; overflow: hidden; min-height: 0; }
.bench-layout { flex: 1; display: flex; height: 100%; overflow: hidden; min-height: 0; }

/* 左侧配置：去除卡片，分割线由统一 CSS 提供 */
.bench-config {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.config-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.config-form {
  padding: 12px 16px 4px;
}
.config-form :deep(.el-form-item) {
  margin-bottom: 12px;
}
/* label-position=top 时，标签在输入框上方 */
.config-form :deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0 0 4px;
  line-height: 1.2;
  height: auto;
}
/* 输入框和下拉默认占满当前栏位 */
.config-form :deep(.el-input),
.config-form :deep(.el-textarea),
.config-form :deep(.el-select),
.config-form :deep(.el-input-number) {
  width: 100%;
}
.config-form :deep(.el-textarea__inner) {
  width: 100%;
  box-sizing: border-box;
}

/* 双栏行：method + mode / concurrency + duration */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.form-row :deep(.el-form-item) {
  margin-bottom: 12px;
}
.row-method { min-width: 0; }
.row-mode { min-width: 0; }
.mode-group { display: flex; width: 100%; }
.mode-group :deep(.el-radio-button) { flex: 1; }
.mode-group :deep(.el-radio-button__inner) { width: 100%; padding-left: 0; padding-right: 0; }

.num-input { width: 100%; }
.num-input.full { width: 100%; }

.mono-input :deep(.el-textarea__inner) {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.55;
}

.config-actions {
  display: flex;
  gap: 8px;
  padding: 8px 16px 14px;
  border-top: 1px solid rgba(60, 40, 20, 0.06);
  margin-top: 4px;
}
.config-actions :deep(.el-button) { flex: 1; }

/* 右侧结果：去除卡片 */
.bench-results {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

/* 进度条：去除卡片 */
.bench-progress-bar {
  margin-bottom: 14px;
  padding: 0 0 12px;
  border: 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0;
  background: transparent;
}

/* 统计网格：去除单卡片，仅用底部细线分隔 */
.bench-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-muted);
}
.bench-stat-card {
  border: 0;
  border-right: 1px solid rgba(60, 40, 20, 0.08);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0;
  padding: 12px 10px;
  text-align: center;
  background: transparent;
}
/* 4 列：每行第 4 个无右边框 */
.bench-stat-card:nth-child(4n) { border-right: 0; }
/* 最后一行无下边框（8 项时第 5-8 个） */
.bench-stat-card:nth-last-child(-n+4) { border-bottom: 0; }
.bench-stat-card.ok .stat-val { color: var(--el-color-success); }
.bench-stat-card.err .stat-val { color: var(--el-color-danger); }
.stat-val {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* 时间序列：去除外层装饰 */
.bench-chart-area {
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  padding-top: 12px;
}
.chart-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.bench-chart-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
}
.chart-time {
  width: 30px;
  color: var(--text-tertiary);
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.chart-bar-wrap {
  flex: 1;
  height: 10px;
  background: rgba(60, 40, 20, 0.06);
  border-radius: 3px;
  overflow: hidden;
}
.chart-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.qps-bar { background: linear-gradient(90deg, var(--accent-blue), var(--el-color-success)); }
.chart-val {
  width: 70px;
  color: var(--text-secondary);
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 220px;
  text-align: center;
  color: var(--text-quaternary);
  font-size: 13px;
  padding: 24px;
  background: transparent;
  border: 0;
  border-radius: 0;
}

@media (max-width: 960px) {
  .bench-layout { flex-direction: column; }
  .bench-config {
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    max-height: 320px;
  }
  .bench-stat-grid { grid-template-columns: repeat(2, 1fr); }
  .bench-stat-card:nth-child(2n) { border-right: 0; }
  .bench-stat-card:nth-child(4n) { border-right: 1px solid rgba(60, 40, 20, 0.08); }
  .bench-stat-card:nth-last-child(-n+4) { border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
  .bench-stat-card:nth-last-child(-n+2) { border-bottom: 0; }
}
</style>
