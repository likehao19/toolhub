<template>
  <div class="network-tool-page">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Network Tools</div>
          <div class="breadcrumb">
            <el-icon><Connection /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('dnsLookup.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">{{ t('dnsLookup.queryConfig') }}</div>
        <el-form label-width="72px" size="small">
          <el-form-item :label="t('dnsLookup.domain')">
            <el-input v-model="domain" :placeholder="t('dnsLookup.domainPlaceholder')" clearable @keyup.enter="submit" />
          </el-form-item>
          <el-form-item :label="t('dnsLookup.recordType')">
            <el-select v-model="recordType" style="width: 100%">
              <el-option v-for="item in recordTypes" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="submit">
              <el-icon style="margin-right: 6px;"><Search /></el-icon>{{ t('dnsLookup.startQuery') }}
            </el-button>
            <el-button @click="clearResult">
              <el-icon style="margin-right: 6px;"><Delete /></el-icon>{{ t('dnsLookup.clear') }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="history-card">
          <div class="sub-title">{{ t('dnsLookup.recentQueries') }}</div>
          <div v-if="historyList.length" class="history-list">
            <div
              v-for="item in historyList"
              :key="`${item.domain}-${item.recordType}`"
              class="history-item"
              @click="selectHistory(item)"
            >
              <span class="history-text">{{ item.domain }}</span>
              <el-tag size="small">{{ item.recordType }}</el-tag>
            </div>
          </div>
          <div v-else class="hint">{{ t('dnsLookup.noHistory') }}</div>
        </div>
      </aside>

      <section class="result-panel" v-loading="loading">
        <template v-if="result">
          <div class="result-toolbar">
            <div class="meta-row">
              <el-tag size="small">{{ result.domain }}</el-tag>
              <el-tag size="small" type="success">{{ result.recordType }}</el-tag>
              <el-tag size="small" type="info">{{ t('dnsLookup.elapsed', { ms: result.elapsedMs }) }}</el-tag>
            </div>
            <el-button text size="small" @click="copyAll" :title="t('common.copy')">
              <el-icon style="margin-right: 4px;"><CopyDocument /></el-icon>{{ t('dnsLookup.copyAll') }}
            </el-button>
          </div>

          <el-table :data="result.answers || []" size="small" stripe :empty-text="t('dnsLookup.emptyResult')">
            <el-table-column prop="name" :label="t('dnsLookup.colName')" min-width="180" show-overflow-tooltip />
            <el-table-column prop="recordType" :label="t('dnsLookup.colType')" width="100" />
            <el-table-column prop="ttl" :label="t('dnsLookup.colTtl')" width="100" />
            <el-table-column prop="value" :label="t('dnsLookup.colValue')" min-width="260" show-overflow-tooltip />
            <el-table-column :label="t('dnsLookup.colActions')" width="100">
              <template #default="scope">
                <el-button text size="small" @click="copyValue(scope.row.value)" :title="t('common.copy')"><el-icon><CopyDocument /></el-icon></el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <div v-else class="empty-hint">{{ t('dnsLookup.emptyHint') }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, CopyDocument, Search, Delete } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { dnsLookup } from '@/utils/networkTools'
import { writeText } from '@/utils/tauri/clipboard'

const router = useRouter()
const domain = ref('')
const recordType = ref('A')
const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT']
const loading = ref(false)
const result = ref(null)
const HISTORY_KEY = 'network-dns-lookup-history'
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

function saveHistory(entry) {
  if (!entry.domain) return
  const next = [entry, ...historyList.value.filter(item => !(item.domain === entry.domain && item.recordType === entry.recordType))].slice(0, 10)
  historyList.value = next
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

async function copyValue(value) {
  if (!value) {
    ElMessage.warning(t('dnsLookup.noCopyContent'))
    return
  }
  try {
    await writeText(String(value))
    ElMessage.success(t('dnsLookup.copied'))
  } catch {}
}

async function copyAll() {
  if (!result.value?.answers?.length) {
    ElMessage.warning(t('dnsLookup.noCopyContent'))
    return
  }
  const text = result.value.answers
    .map(item => `${item.name}\t${item.recordType}\t${item.ttl ?? '-'}\t${item.value}`)
    .join('\n')
  try {
    await writeText(text)
    ElMessage.success(t('dnsLookup.resultCopied'))
  } catch {}
}

async function submit() {
  loading.value = true
  try {
    result.value = await dnsLookup(domain.value, recordType.value)
    saveHistory({ domain: result.value.domain, recordType: result.value.recordType })
  } catch (error) {
    ElMessage.error(error?.message || String(error))
  } finally {
    loading.value = false
  }
}

async function selectHistory(item) {
  domain.value = item.domain
  recordType.value = item.recordType
  await submit()
}

function clearResult() {
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

.history-card {
  margin-top: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.result-panel :deep(.el-table) {
  border: 0;
}

.result-panel :deep(.el-table th.el-table__cell) {
  background: var(--surface-panel-soft);
}

.hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
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
}
</style>
