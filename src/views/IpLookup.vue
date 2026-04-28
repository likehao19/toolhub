<template>
  <div class="network-tool-page">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Network Tools</div>
          <div class="breadcrumb">
            <el-icon><Location /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>IP 查询</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="lookupCurrent" :loading="loading">查询我的公网 IP</el-button>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">查询配置</div>
        <el-form label-width="72px" size="small">
          <el-form-item label="IP/域名">
            <el-input v-model="target" placeholder="例如：8.8.8.8 / example.com" clearable @keyup.enter="submit" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="submit">开始查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
        <div class="hint">支持直接查询 IP，或输入域名后先解析 A 记录再查询。</div>

        <div class="history-card">
          <div class="sub-title">最近查询</div>
          <div v-if="historyList.length" class="history-list">
            <div v-for="item in historyList" :key="item" class="history-item" @click="selectHistory(item)">
              <span class="history-text">{{ item }}</span>
            </div>
          </div>
          <div v-else class="hint">暂无查询历史</div>
        </div>
      </aside>

      <section class="result-panel" v-loading="loading">
        <template v-if="result">
          <div class="result-toolbar">
            <div class="meta-row">
              <el-tag size="small">{{ result.query || '-' }}</el-tag>
              <el-tag size="small" type="success">{{ result.ip || '-' }}</el-tag>
              <el-tag size="small" type="info">{{ result.country || '-' }}</el-tag>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-val">{{ result.ip || '-' }}</div>
              <div class="stat-label-row"><span class="stat-label">IP</span><el-button text size="small" @click="copyField(result.ip, 'IP')">复制</el-button></div>
            </div>
            <div class="stat-card"><div class="stat-val">{{ result.country || '-' }}</div><div class="stat-label">国家</div></div>
            <div class="stat-card">
              <div class="stat-val">{{ result.region || '-' }}</div>
              <div class="stat-label-row"><span class="stat-label">地区</span><el-button text size="small" @click="copyField(result.region, '地区')">复制</el-button></div>
            </div>
            <div class="stat-card"><div class="stat-val">{{ result.city || '-' }}</div><div class="stat-label">城市</div></div>
          </div>

          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="查询目标">{{ result.query || '-' }}</el-descriptions-item>
            <el-descriptions-item label="域名">{{ result.domain || '-' }}</el-descriptions-item>
            <el-descriptions-item label="IP 类型">{{ result.type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="洲">{{ result.continent || '-' }}</el-descriptions-item>
            <el-descriptions-item label="ISP">
              <div class="desc-cell"><span>{{ result.isp || '-' }}</span><el-button text size="small" @click="copyField(result.isp, 'ISP')">复制</el-button></div>
            </el-descriptions-item>
            <el-descriptions-item label="ASN">{{ result.asn || '-' }}</el-descriptions-item>
            <el-descriptions-item label="时区">
              <div class="desc-cell"><span>{{ result.timezone || '-' }}</span><el-button text size="small" @click="copyField(result.timezone, '时区')">复制</el-button></div>
            </el-descriptions-item>
            <el-descriptions-item label="坐标">{{ result.latitude && result.longitude ? `${result.latitude}, ${result.longitude}` : '-' }}</el-descriptions-item>
          </el-descriptions>
        </template>
        <div v-else class="empty-hint">输入 IP 或域名后开始查询</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { lookupIp } from '@/utils/networkTools'
import { writeText } from '@/utils/tauri/clipboard'

const router = useRouter()
const target = ref('')
const loading = ref(false)
const result = ref(null)
const HISTORY_KEY = 'network-ip-lookup-history'
const historyList = ref(loadHistory())

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveHistory(value) {
  const text = value.trim()
  if (!text) return
  const next = [text, ...historyList.value.filter(item => item !== text)].slice(0, 10)
  historyList.value = next
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

async function copyField(value, label) {
  if (!value) {
    ElMessage.warning(`暂无${label}`)
    return
  }
  try {
    await writeText(String(value))
    ElMessage.success(`${label}已复制`)
  } catch {}
}

async function submit() {
  loading.value = true
  try {
    result.value = await lookupIp(target.value)
    saveHistory(target.value || result.value?.ip || '')
  } catch (error) {
    ElMessage.error(error?.message || String(error))
  } finally {
    loading.value = false
  }
}

async function lookupCurrent() {
  target.value = ''
  await submit()
}

async function selectHistory(value) {
  target.value = value
  await submit()
}

function reset() {
  target.value = ''
  result.value = null
}
</script>

<style scoped>
.content-area {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  overflow: hidden;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-panel {
  min-height: 0;
  overflow: auto;
  padding: 16px 18px;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
}

.panel-title,
.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
}

.history-card {
  margin-top: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.history-text {
  word-break: break-all;
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
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
}

.stat-card {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.stat-val {
  font-size: 15px;
  font-weight: 700;
  word-break: break-all;
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.result-panel :deep(.el-descriptions) {
  margin: 12px 16px 16px;
}

.desc-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.empty-hint {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

@media (max-width: 1100px) {
  .content-area { grid-template-columns: 1fr; }
  .config-panel { border-right: 0; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
