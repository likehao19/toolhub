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
            <span>{{ t('ipLookup.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="lookupCurrent" :loading="loading">
          <el-icon style="margin-right: 6px;"><Position /></el-icon>{{ t('ipLookup.lookupMyIp') }}
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">{{ t('ipLookup.queryConfig') }}</div>
        <el-form label-width="72px" size="small">
          <el-form-item :label="t('ipLookup.ipOrDomain')">
            <el-input v-model="target" :placeholder="t('ipLookup.ipPlaceholder')" clearable @keyup.enter="submit" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="submit">
              <el-icon style="margin-right: 6px;"><Search /></el-icon>{{ t('ipLookup.startQuery') }}
            </el-button>
            <el-button @click="reset">
              <el-icon style="margin-right: 6px;"><RefreshLeft /></el-icon>{{ t('ipLookup.reset') }}
            </el-button>
          </el-form-item>
        </el-form>
        <div class="hint">{{ t('ipLookup.hint') }}</div>

        <div class="history-card">
          <div class="sub-title">{{ t('ipLookup.recentQueries') }}</div>
          <div v-if="historyList.length" class="history-list">
            <div v-for="item in historyList" :key="item" class="history-item" @click="selectHistory(item)">
              <span class="history-text">{{ item }}</span>
            </div>
          </div>
          <div v-else class="hint">{{ t('ipLookup.noHistory') }}</div>
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
              <div class="stat-label-row"><span class="stat-label">IP</span><el-button text size="small" @click="copyField(result.ip, 'IP')" :title="t('common.copy')"><el-icon><CopyDocument /></el-icon></el-button></div>
            </div>
            <div class="stat-card"><div class="stat-val">{{ result.country || '-' }}</div><div class="stat-label">{{ t('ipLookup.country') }}</div></div>
            <div class="stat-card">
              <div class="stat-val">{{ result.region || '-' }}</div>
              <div class="stat-label-row"><span class="stat-label">{{ t('ipLookup.region') }}</span><el-button text size="small" @click="copyField(result.region, t('ipLookup.region'))" :title="t('common.copy')"><el-icon><CopyDocument /></el-icon></el-button></div>
            </div>
            <div class="stat-card"><div class="stat-val">{{ result.city || '-' }}</div><div class="stat-label">{{ t('ipLookup.city') }}</div></div>
          </div>

          <el-descriptions :column="2" border size="small">
            <el-descriptions-item :label="t('ipLookup.target')">{{ result.query || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.domain')">{{ result.domain || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.ipType')">{{ result.type || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.continent')">{{ result.continent || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.isp')">
              <div class="desc-cell"><span>{{ result.isp || '-' }}</span><el-button text size="small" @click="copyField(result.isp, 'ISP')" :title="t('common.copy')"><el-icon><CopyDocument /></el-icon></el-button></div>
            </el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.asn')">{{ result.asn || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.timezone')">
              <div class="desc-cell"><span>{{ result.timezone || '-' }}</span><el-button text size="small" @click="copyField(result.timezone, t('ipLookup.timezone'))" :title="t('common.copy')"><el-icon><CopyDocument /></el-icon></el-button></div>
            </el-descriptions-item>
            <el-descriptions-item :label="t('ipLookup.coordinates')">{{ result.latitude && result.longitude ? `${result.latitude}, ${result.longitude}` : '-' }}</el-descriptions-item>
          </el-descriptions>
        </template>
        <div v-else class="empty-hint">{{ t('ipLookup.emptyHint') }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Location, CopyDocument, Position, Search, RefreshLeft } from '@element-plus/icons-vue'
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
    ElMessage.warning(t('ipLookup.noField', { label }))
    return
  }
  try {
    await writeText(String(value))
    ElMessage.success(t('ipLookup.fieldCopied', { label }))
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
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
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
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
  .config-panel { border-right: 0; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
