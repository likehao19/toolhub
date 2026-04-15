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
            <span>测速</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <div class="config-panel">
        <div class="panel-title">本地网络测速</div>
        <div class="hint">默认使用公共测速节点测试当前设备网络延迟、下载和上传速度，不需要手动输入别人地址。</div>

        <el-form label-width="88px" size="small" style="margin-top: 16px;">
          <el-form-item label="延迟次数">
            <el-input-number v-model="latencyCount" :min="1" :max="20" style="width:100%" />
          </el-form-item>
          <el-form-item label="上传大小">
            <el-input-number v-model="uploadSizeMb" :min="1" :max="100" style="width:100%" />
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="latencyLoading" :disabled="latencyLoading" @click="startLatency">
                {{ latencyLoading ? '测速中...' : '开始延迟测速' }}
              </el-button>
              <el-button v-if="latencyLoading" type="danger" @click="cancelLatency">取消</el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button type="primary" :loading="bandwidthLoading" :disabled="bandwidthLoading" @click="startBandwidth">
                {{ bandwidthLoading ? '测速中...' : '开始下载/上传测速' }}
              </el-button>
              <el-button v-if="bandwidthLoading" type="danger" @click="cancelBandwidth">取消</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <div class="result-panel">
        <div class="result-block">
          <div class="result-title">延迟测速结果</div>
          <template v-if="latencyResult">
            <div class="stat-grid">
              <div class="stat-card"><div class="stat-val">{{ latencyResult.min }} ms</div><div class="stat-label">最小</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.avg }} ms</div><div class="stat-label">平均</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.max }} ms</div><div class="stat-label">最大</div></div>
              <div class="stat-card"><div class="stat-val">{{ latencyResult.samples.length }}</div><div class="stat-label">采样次数</div></div>
            </div>
            <el-tag v-for="(item, index) in latencyResult.samples" :key="index" class="sample-tag">#{{ index + 1 }} {{ item }}ms</el-tag>
          </template>
          <div v-else class="empty-hint">尚未执行延迟测速</div>
        </div>

        <div class="result-block">
          <div class="result-title">下载/上传测速结果</div>
          <template v-if="bandwidthResult">
            <div class="stat-grid two-col">
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.downloadMbps ?? '-' }}</div><div class="stat-label">下载 Mbps</div></div>
              <div class="stat-card"><div class="stat-val">{{ bandwidthResult.uploadMbps ?? '-' }}</div><div class="stat-label">上传 Mbps</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.downloadBytes) }}</div><div class="stat-label">下载大小</div></div>
              <div class="stat-card"><div class="stat-val">{{ formatBytes(bandwidthResult.uploadBytes) }}</div><div class="stat-label">上传大小</div></div>
            </div>
            <div class="hint">{{ progressText || '测速完成' }}</div>
          </template>
          <div v-else class="empty-hint">尚未执行下载/上传测速</div>
        </div>
      </div>
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
.network-tool-page {
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
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; }
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); }
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  padding: 14px 18px 0;
  gap: 0;
}
.config-panel {
  width: 360px;
  min-width: 320px;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
}
.result-panel {
  flex: 1;
  min-width: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 18px 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
}
.panel-title,.result-title { font-size: 13px; font-weight:600; color: var(--text-primary); margin-bottom:12px; }
.result-block + .result-block { margin-top:20px; }
.stat-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:12px; }
.stat-grid.two-col { grid-template-columns:repeat(2, 1fr); }
.stat-card {
  border:1px solid rgba(15, 23, 42, 0.08);
  border-radius:14px;
  padding:12px;
  text-align:center;
  background: rgba(255,255,255,0.68);
}
.stat-val { font-size:18px; font-weight:700; color:var(--text-primary); }
.stat-label { font-size:11px; color:var(--text-tertiary); margin-top:2px; }
.empty-hint,.hint { font-size:12px; color:var(--text-tertiary); }
.empty-hint {
  padding: 16px;
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.5);
}
.hint {
  line-height: 1.5;
  padding: 10px 12px;
  background: rgba(255,255,255,0.64);
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}
.sample-tag { margin-right:8px; margin-bottom:8px; }
.action-row { display:flex; gap:8px; flex-wrap: wrap; }
</style>
