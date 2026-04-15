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
      <div class="config-panel">
        <div class="panel-title">查询配置</div>
        <el-form label-width="88px" size="small">
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
            <div v-for="item in historyList" :key="item" class="history-item">
              <span class="history-text" @click="selectHistory(item)">{{ item }}</span>
            </div>
          </div>
          <div v-else class="hint">暂无查询历史</div>
        </div>
      </div>

      <div class="result-panel" v-loading="loading">
        <template v-if="result">
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
      </div>
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
.header-actions { display: flex; align-items: center; gap: 8px; }
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
.header-actions :deep(.el-button) { --el-border-radius-base: 10px; }
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  padding: 14px 18px 0;
  gap: 0;
}
.config-panel {
  width: 340px;
  min-width: 300px;
  padding: 16px;
  overflow-y: auto;
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
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.hint {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  padding: 10px 12px;
  background: rgba(255,255,255,0.64);
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}
.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-quaternary);
  font-size: 12px;
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.5);
}
.stat-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px; }
.stat-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 12px;
  text-align: center;
  background: rgba(255,255,255,0.68);
}
.stat-val { font-size:16px; font-weight:700; color:var(--text-primary); word-break:break-all; }
.stat-label { font-size:11px; color:var(--text-tertiary); margin-top:2px; }
.stat-label-row { display:flex; align-items:center; justify-content:center; gap:4px; margin-top:2px; }
.history-card { margin-top:20px; }
.sub-title { font-weight:600; font-size:13px; margin-bottom:8px; color: var(--text-primary); }
.history-list { display:flex; flex-direction:column; gap:8px; }
.history-item {
  padding: 8px 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: rgba(255,255,255,0.74);
}
.history-text { color:var(--text-primary); cursor:pointer; word-break:break-all; }
.history-text:hover { color:var(--accent-blue); }
.desc-cell { display:flex; align-items:center; justify-content:space-between; gap:8px; }
</style>
