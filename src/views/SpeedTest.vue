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
            <span>网络测速</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">测试配置</div>
        <div class="hint">默认使用公共测速节点测试当前设备网络延迟、下载和上传速度。</div>

        <el-form label-width="76px" size="small" class="bench-form">
          <el-form-item label="延迟次数">
            <el-input-number v-model="latencyCount" :min="1" :max="20" style="width: 100%" />
          </el-form-item>
          <el-form-item label="上传大小">
            <el-input-number v-model="uploadSizeMb" :min="1" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="latencyLoading" :disabled="latencyLoading" @click="startLatency">
                {{ latencyLoading ? '测试中...' : '开始延迟测试' }}
              </el-button>
              <el-button v-if="latencyLoading" type="danger" @click="cancelLatency">取消</el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="bandwidthLoading" :disabled="bandwidthLoading" @click="startBandwidth">
                {{ bandwidthLoading ? '测试中...' : '开始下载/上传测试' }}
              </el-button>
              <el-button v-if="bandwidthLoading" type="danger" @click="cancelBandwidth">取消</el-button>
            </div>
          </el-form-item>
        </el-form>
      </aside>

      <section class="result-panel">
        <div class="result-toolbar">
          <div class="meta-row">
            <el-tag size="small" :type="latencyLoading ? 'warning' : 'info'">{{ latencyLoading ? '延迟测试中' : '延迟空闲' }}</el-tag>
            <el-tag size="small" :type="bandwidthLoading ? 'warning' : 'success'">{{ bandwidthLoading ? '带宽测试中' : '带宽空闲' }}</el-tag>
          </div>
          <span class="hint">{{ progressText || '等待测速任务' }}</span>
        </div>

        <div class="result-block">
          <div class="result-title">延迟测试结果</div>
          <template v-if="latencyResult">
            <div class="stat-grid">
              <div class="stat-card"><div class="stat-val">{{ latencyResult.min }} ms</div><div class="stat-label">最小</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.avg }} ms</div><div class="stat-label">平均</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.max }} ms</div><div class="stat-label">最大</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.samples.length }}</div><div class="stat-label">采样次数</div></div>
            </div>
            <div class="sample-list">
              <el-tag v-for="(item, index) in latencyResult.samples" :key="index" class="sample-tag">#{{ index + 1 }} {{ item }}ms</el-tag>
            </div>
          </template>
          <div v-else class="empty-hint">尚未执行延迟测试</div>
        </div>

        <div class="result-block">
          <div class="result-title">下载/上传测试结果</div>
          <template v-if="bandwidthResult">
            <div class="stat-grid two-col">
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.downloadMbps ?? '-' }}</div><div class="stat-label">下载 Mbps</div></div>
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.uploadMbps ?? '-' }}</div><div class="stat-label">上传 Mbps</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.downloadBytes) }}</div><div class="stat-label">下载大小</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.uploadBytes) }}</div><div class="stat-label">上传大小</div></div>
            </div>
          </template>
          <div v-else class="empty-hint">尚未执行下载/上传测试</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer } from '@element-plus/icons-vue'
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
  progressText.value = '测速中...'
  bandwidthAbort = new AbortController()
  try {
    bandwidthResult.value = await runBandwidthTest({
      uploadSizeMb: uploadSizeMb.value,
      signal: bandwidthAbort.signal,
      onProgress: ({ phase, bytes }) => {
        progressText.value = `${phase === 'download' ? '下载' : '上传'}已处理 ${formatBytes(bytes)}`
      }
    })
    progressText.value = '测速完成'
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
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: auto;
  padding: 16px 18px;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
}

.panel-title,
.result-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-block {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
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
  .config-panel { border-right: 0; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
  .result-toolbar { flex-wrap: wrap; }
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
