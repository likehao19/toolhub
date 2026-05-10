<template>
  <div class="network-tool-page">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Network Tools</div>
          <div class="breadcrumb">
            <el-icon><Odometer /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('speedTest.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">{{ t('speedTest.testConfig') }}</div>
        <div class="hint">{{ t('speedTest.hint') }}</div>

        <el-form label-width="76px" size="small" class="bench-form">
          <el-form-item :label="t('speedTest.latencyCount')">
            <el-input-number v-model="latencyCount" :min="1" :max="20" style="width: 100%" />
          </el-form-item>
          <el-form-item :label="t('speedTest.uploadSize')">
            <el-input-number v-model="uploadSizeMb" :min="1" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="latencyLoading" :disabled="latencyLoading" @click="startLatency">
                <el-icon style="margin-right: 6px;"><Timer /></el-icon>{{ latencyLoading ? t('speedTest.testing') : t('speedTest.startLatency') }}
              </el-button>
              <el-button v-if="latencyLoading" type="danger" @click="cancelLatency">
                <el-icon style="margin-right: 6px;"><Close /></el-icon>{{ t('speedTest.cancel') }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="bandwidthLoading" :disabled="bandwidthLoading" @click="startBandwidth">
                <el-icon style="margin-right: 6px;"><Download /></el-icon>{{ bandwidthLoading ? t('speedTest.testing') : t('speedTest.startBandwidth') }}
              </el-button>
              <el-button v-if="bandwidthLoading" type="danger" @click="cancelBandwidth">
                <el-icon style="margin-right: 6px;"><Close /></el-icon>{{ t('speedTest.cancel') }}
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </aside>

      <section class="result-panel">
        <div class="result-toolbar">
          <div class="meta-row">
            <el-tag size="small" :type="latencyLoading ? 'warning' : 'info'">{{ latencyLoading ? t('speedTest.latencyBusy') : t('speedTest.latencyIdle') }}</el-tag>
            <el-tag size="small" :type="bandwidthLoading ? 'warning' : 'success'">{{ bandwidthLoading ? t('speedTest.bandwidthBusy') : t('speedTest.bandwidthIdle') }}</el-tag>
          </div>
          <span class="hint">{{ progressText || t('speedTest.waiting') }}</span>
        </div>

        <div class="result-block">
          <div class="result-title">{{ t('speedTest.latencyResult') }}</div>
          <template v-if="latencyResult">
            <div class="stat-grid">
              <div class="stat-card"><div class="stat-val">{{ latencyResult.min }} ms</div><div class="stat-label">{{ t('speedTest.min') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.avg }} ms</div><div class="stat-label">{{ t('speedTest.avg') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.max }} ms</div><div class="stat-label">{{ t('speedTest.max') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.samples.length }}</div><div class="stat-label">{{ t('speedTest.samples') }}</div></div>
            </div>
            <div class="sample-list">
              <el-tag v-for="(item, index) in latencyResult.samples" :key="index" class="sample-tag">#{{ index + 1 }} {{ item }}ms</el-tag>
            </div>
          </template>
          <div v-else class="empty-hint">{{ t('speedTest.emptyLatency') }}</div>
        </div>

        <div class="result-block">
          <div class="result-title">{{ t('speedTest.bandwidthResult') }}</div>
          <template v-if="bandwidthResult">
            <div class="stat-grid two-col">
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.downloadMbps ?? '-' }}</div><div class="stat-label">{{ t('speedTest.downloadMbps') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.uploadMbps ?? '-' }}</div><div class="stat-label">{{ t('speedTest.uploadMbps') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.downloadBytes) }}</div><div class="stat-label">{{ t('speedTest.downloadBytes') }}</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.uploadBytes) }}</div><div class="stat-label">{{ t('speedTest.uploadBytes') }}</div></div>
            </div>
          </template>
          <div v-else class="empty-hint">{{ t('speedTest.emptyBandwidth') }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer, Timer, Close, Download } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { runBandwidthTest, runLatencyTest } from '@/utils/networkTools'

const router = useRouter()
const latencyCount = ref(5)
const uploadSizeMb = ref(5)
const latencyLoading = ref(false)
const bandwidthLoading = ref(false)
const latencyResult = ref(null)
const bandwidthResult = ref(null)
const progressText = ref('')
let latencyAbort = null
let bandwidthAbort = null

async function startLatency() {
  if (latencyLoading.value) return

  latencyLoading.value = true
  latencyAbort = new AbortController()
  try {
    latencyResult.value = await runLatencyTest(undefined, latencyCount.value, latencyAbort.signal)
  } catch (error) {
    if (error?.name !== 'AbortError') {
      ElMessage.error(error?.message || String(error))
    }
  } finally {
    latencyLoading.value = false
    latencyAbort = null
  }
}

function cancelLatency() {
  if (latencyAbort) {
    latencyAbort.abort()
  }
  latencyLoading.value = false
}

async function startBandwidth() {
  if (bandwidthLoading.value) return

  bandwidthLoading.value = true
  progressText.value = t('speedTest.testingBandwidth')
  bandwidthAbort = new AbortController()
  try {
    bandwidthResult.value = await runBandwidthTest({
      uploadSizeMb: uploadSizeMb.value,
      signal: bandwidthAbort.signal,
      onProgress: ({ phase, bytes }) => {
        progressText.value = t('speedTest.bytesProcessed', {
          phase: phase === 'download' ? t('speedTest.download') : t('speedTest.upload'),
          bytes: formatBytes(bytes),
        })
      }
    })
    progressText.value = t('speedTest.done')
  } catch (error) {
    if (error?.name === 'AbortError') {
      progressText.value = ''
      return
    }
    ElMessage.error(error?.message || String(error))
    progressText.value = ''
  } finally {
    bandwidthLoading.value = false
    bandwidthAbort = null
  }
}

function cancelBandwidth() {
  if (bandwidthAbort) {
    bandwidthAbort.abort()
  }
  bandwidthLoading.value = false
  progressText.value = ''
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

onUnmounted(() => {
  if (latencyAbort) {
    latencyAbort.abort()
  }
  if (bandwidthAbort) {
    bandwidthAbort.abort()
  }
})
</script>

<style scoped>
.content-area {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: hidden;
  padding: 14px 18px;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.panel-title,
.result-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
}

.bench-form {
  margin-top: 14px;
}

.hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-panel {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 0;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-block {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
}

.stat-grid.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.stat-val {
  font-size: 18px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sample-list {
  margin-top: 10px;
}

.sample-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.empty-hint {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

@media (max-width: 1100px) {
  .content-area { grid-template-columns: 1fr; }
  .config-panel { border-right: 0; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
  .result-toolbar { flex-wrap: wrap; }
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
