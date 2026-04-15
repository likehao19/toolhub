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
            <span>DNS 查询</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <div class="config-panel">
        <div class="panel-title">查询配置</div>
        <el-form label-width="88px" size="small">
          <el-form-item label="域名">
            <el-input v-model="domain" placeholder="例如：example.com" clearable @keyup.enter="submit" />
          </el-form-item>
          <el-form-item label="记录类型">
            <el-select v-model="recordType" style="width:100%">
              <el-option v-for="item in recordTypes" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="submit">开始查询</el-button>
            <el-button @click="clearResult">清空</el-button>
          </el-form-item>
        </el-form>

        <div class="history-card">
          <div class="sub-title">最近查询</div>
          <div v-if="historyList.length" class="history-list">
            <div v-for="item in historyList" :key="`${item.domain}-${item.recordType}`" class="history-item" @click="selectHistory(item)">
              <span class="history-text">{{ item.domain }}</span>
              <el-tag size="small">{{ item.recordType }}</el-tag>
            </div>
          </div>
          <div v-else class="hint">暂无查询历史</div>
        </div>
      </div>

      <div class="result-panel" v-loading="loading">
        <template v-if="result">
          <div class="meta-row">
            <el-tag size="small">{{ result.domain }}</el-tag>
            <el-tag size="small" type="success">{{ result.recordType }}</el-tag>
            <el-tag size="small" type="info">耗时 {{ result.elapsedMs }} ms</el-tag>
            <el-button text size="small" @click="copyAll">复制全部</el-button>
          </div>

          <el-table :data="result.answers || []" size="small" stripe empty-text="暂无记录">
            <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="recordType" label="类型" width="100" />
            <el-table-column prop="ttl" label="TTL" width="100" />
            <el-table-column prop="value" label="值" min-width="260" show-overflow-tooltip />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button text size="small" @click="copyValue(scope.row.value)">复制</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <div v-else class="empty-hint">输入域名并选择记录类型后开始查询</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
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
    ElMessage.warning('暂无可复制内容')
    return
  }
  try {
    await writeText(String(value))
    ElMessage.success('已复制')
  } catch {}
}

async function copyAll() {
  if (!result.value?.answers?.length) {
    ElMessage.warning('暂无可复制内容')
    return
  }
  const text = result.value.answers
    .map(item => `${item.name}\t${item.recordType}\t${item.ttl ?? '-'}\t${item.value}`)
    .join('\n')
  try {
    await writeText(text)
    ElMessage.success('结果已复制')
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
.panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
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
.meta-row { display:flex; gap:8px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
.history-card { margin-top:20px; }
.sub-title { font-weight:600; font-size:13px; margin-bottom:8px; color: var(--text-primary); }
.history-list { display:flex; flex-direction:column; gap:8px; }
.history-item {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:8px 10px;
  border:1px solid rgba(15, 23, 42, 0.08);
  border-radius:10px;
  cursor:pointer;
  background: rgba(255,255,255,0.74);
}
.history-item:hover .history-text { color:var(--accent-blue); }
.history-text { color:var(--text-primary); word-break:break-all; }
.hint {
  font-size:12px;
  color:var(--text-tertiary);
  padding: 10px 12px;
  background: rgba(255,255,255,0.64);
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}
</style>
