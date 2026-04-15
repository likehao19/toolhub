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
          <div style="font-weight:600;font-size:13px;margin-bottom:12px">{{ t('perfTest.benchConfig') }}</div>
          <el-form size="small" label-width="80px">
            <el-form-item label="URL">
              <el-input v-model="benchUrl" placeholder="https://api.example.com/users" />
            </el-form-item>
            <el-form-item :label="t('perfTest.method')">
              <el-select v-model="benchMethod" style="width:110px">
                <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
            <el-form-item label="Headers">
              <el-input v-model="benchHeaders" type="textarea" :rows="3"
                placeholder="Content-Type: application/json&#10;Authorization: Bearer xxx"
                style="font-family:monospace;font-size:12px" />
            </el-form-item>
            <el-form-item v-if="benchMethod !== 'GET' && benchMethod !== 'HEAD'" label="Body">
              <el-input v-model="benchBody" type="textarea" :rows="3"
                placeholder='{"key": "value"}'
                style="font-family:monospace;font-size:12px" />
            </el-form-item>
            <el-form-item :label="t('perfTest.benchMode')">
              <el-radio-group v-model="benchMode" size="small">
                <el-radio-button value="fixed">{{ t('perfTest.fixedMode') }}</el-radio-button>
                <el-radio-button value="ramp">{{ t('perfTest.rampMode') }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item :label="t('perfTest.concurrency')">
              <el-input-number v-model="benchConcurrency" :min="1" :max="200" style="width:120px" />
            </el-form-item>
            <el-form-item :label="t('perfTest.duration')">
              <el-input-number v-model="benchDuration" :min="1" :max="300" style="width:120px" />
              <span style="margin-left:4px;font-size:11px;color:var(--text-tertiary)">s</span>
            </el-form-item>
            <template v-if="benchMode === 'ramp'">
              <el-form-item :label="t('perfTest.rampEnd')">
                <el-input-number v-model="benchRampEnd" :min="benchConcurrency" :max="1000" style="width:120px" />
              </el-form-item>
            </template>
          </el-form>
          <div style="display:flex;gap:8px;margin-top:8px">
            <el-button type="primary" size="small" :loading="benchRunning" :disabled="!benchUrl.trim()" @click="doStartBench">
              {{ benchRunning ? t('perfTest.benchRunning') : t('perfTest.startBench') }}
            </el-button>
            <el-button v-if="benchRunning" type="danger" size="small" @click="doStopBench">{{ t('perfTest.stopBench') }}</el-button>
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
              <div style="font-size:12px;font-weight:600;margin-bottom:8px">{{ t('perfTest.timeline') }}</div>
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
          <div v-else class="empty-hint" style="display:flex;align-items:center;justify-content:center;height:100%">
            {{ t('perfTest.benchHint') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { METHOD_COLORS } from '@/utils/apiWorkbench/shared'
import { runBenchmark } from '@/utils/apiWorkbench/benchEngine'

const router = useRouter()
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const benchUrl = ref('')
const benchMethod = ref('GET')
const benchMode = ref('fixed')
const benchConcurrency = ref(10)
const benchDuration = ref(10)
const benchRampEnd = ref(50)
const benchHeaders = ref('')
const benchBody = ref('')
const benchRunning = ref(false)
const benchStats = ref(null)
const benchSnapshots = ref([])
let benchAbort = null

function parseBenchHeaders() {
  const map = {}
  if (!benchHeaders.value.trim()) return map
  benchHeaders.value.split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return map
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
</script>

<style scoped>
.perf-test-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
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
  font-size: 15px; font-weight: 600;
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); }

.content-area { flex: 1; overflow: hidden; padding: 14px 18px 0; min-height: 0; }
.bench-layout { flex: 1; display: flex; height: 100%; overflow: hidden; min-height: 0; }
.bench-config {
  width: 360px;
  min-width: 320px;
  padding: 16px;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}
.bench-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 18px 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.bench-progress-bar { margin-bottom: 16px; padding: 12px; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 14px; background: rgba(255,255,255,0.72); }
.bench-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.bench-stat-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 10px;
  text-align: center;
  background: rgba(255,255,255,0.72);
}
.bench-stat-card.ok { border-color: rgba(103,194,58,0.3); }
.bench-stat-card.err { border-color: rgba(245,108,108,0.3); }
.stat-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.bench-stat-card.ok .stat-val { color: #67C23A; }
.bench-stat-card.err .stat-val { color: #F56C6C; }
.stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.bench-chart-area { border-top: 1px solid rgba(15, 23, 42, 0.08); padding-top: 12px; }
.bench-chart-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
.chart-time { width: 30px; color: var(--text-tertiary); text-align: right; flex-shrink: 0; }
.chart-bar-wrap { flex: 1; height: 12px; background: rgba(226,232,240,0.9); border-radius: 999px; overflow: hidden; }
.chart-bar { height: 100%; border-radius: 999px; transition: width 0.3s; }
.qps-bar { background: linear-gradient(90deg, #409EFF, #67C23A); }
.chart-val { width: 70px; color: var(--text-secondary); flex-shrink: 0; text-align: right; }
.empty-hint {
  text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px;
  border: 1px dashed rgba(15, 23, 42, 0.08); border-radius: 14px; background: rgba(255,255,255,0.5);
}

@media (max-width: 960px) {
  .content-area { padding: 14px 14px 0; }
  .bench-layout { flex-direction: column; }
  .bench-config {
    width: 100%;
    min-width: 0;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px 18px 0 0;
  }
  .bench-results { border-radius: 0 0 18px 18px; }
  .bench-stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
