<template>
  <div class="port-manager-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Monitor /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('portManager.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" text @click="refreshPorts" :loading="loading" :title="t('common.refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-bar">
      <el-input
        v-model="searchText"
        :placeholder="t('portManager.searchPlaceholder')"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="protocolFilter"
        size="small"
        class="filter-select"
        :placeholder="t('portManager.filterByProtocol')"
      >
        <el-option :label="t('portManager.all')" value="all" />
        <el-option label="TCP" value="TCP" />
        <el-option label="UDP" value="UDP" />
      </el-select>

      <el-select
        v-model="stateFilter"
        size="small"
        class="filter-select"
        :placeholder="t('portManager.filterByState')"
      >
        <el-option :label="t('portManager.all')" value="all" />
        <el-option label="LISTENING" value="LISTENING" />
        <el-option label="ESTABLISHED" value="ESTABLISHED" />
        <el-option label="TIME_WAIT" value="TIME_WAIT" />
        <el-option label="CLOSE_WAIT" value="CLOSE_WAIT" />
      </el-select>

      <el-checkbox v-model="onlyKillable" class="killable-check">
        {{ t('portManager.onlyKillable') }}
      </el-checkbox>
    </div>

    <!-- 表格 -->
    <div class="table-area">
      <el-table
        :data="pagedPorts"
        v-loading="loading"
        size="small"
        stripe
        highlight-current-row
        :empty-text="t('portManager.noData')"
        height="100%"
        :default-sort="{ prop: 'localPort', order: 'ascending' }"
        @sort-change="onSortChange"
      >
        <el-table-column prop="protocol" :label="t('portManager.protocol')" width="72" sortable="custom" />
        <el-table-column prop="localPort" :label="t('portManager.localPort')" width="80" sortable="custom" />
        <el-table-column prop="localAddress" :label="t('portManager.localAddress')" min-width="130" show-overflow-tooltip />
        <el-table-column :label="t('portManager.remoteAddress')" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remoteAddress }}{{ row.remotePort != null ? ':' + row.remotePort : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="state" :label="t('portManager.state')" width="110" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.state" class="state-badge" :class="stateClass(row.state)">{{ row.state }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pid" label="PID" width="72" sortable="custom" />
        <el-table-column prop="processName" :label="t('portManager.processName')" min-width="120" sortable="custom" show-overflow-tooltip />
        <el-table-column :label="t('portManager.action')" width="72" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.killable"
              type="danger"
              size="small"
              link
              @click="confirmKill(row)"
            >{{ t('portManager.kill') }}</el-button>
            <span v-else class="system-tag">{{ t('portManager.system') }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <span class="stat-total">{{ t('portManager.total', { count: filteredPorts.length }) }}</span>
      <span v-if="portStats.listening" class="stat-chip listening">LISTENING {{ portStats.listening }}</span>
      <span v-if="portStats.established" class="stat-chip established">ESTABLISHED {{ portStats.established }}</span>
      <span class="page-info" v-if="totalPages > 1">
        <el-button size="small" text :disabled="currentPage <= 1" @click="currentPage--" :title="t('common.prev')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        {{ currentPage }} / {{ totalPages }}
        <el-button size="small" text :disabled="currentPage >= totalPages" @click="currentPage++" :title="t('common.next')">
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Search, Monitor, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { getAllPorts, killProcess } from '@/utils/portManager.js'
import { getPrivilegeStatus } from '@/utils/systemPrivilegeManager'

const router = useRouter()

const loading = ref(false)
const ports = shallowRef([])
const searchText = ref('')
const protocolFilter = ref('all')
const stateFilter = ref('all')
const onlyKillable = ref(true)
const currentPage = ref(1)
const pageSize = 200
const sortState = ref({ prop: 'localPort', order: 'ascending' })

// 筛选变化时重置页码
watch([searchText, protocolFilter, stateFilter, onlyKillable], () => {
  currentPage.value = 1
})

// 筛选后的端口列表
const filteredPorts = computed(() => {
  let list = ports.value

  // 仅可终止
  if (onlyKillable.value) {
    list = list.filter(p => p.killable)
  }

  // 协议筛选
  if (protocolFilter.value && protocolFilter.value !== 'all') {
    list = list.filter(p => p.protocol.startsWith(protocolFilter.value))
  }

  // 状态筛选
  if (stateFilter.value && stateFilter.value !== 'all') {
    list = list.filter(p => p.state === stateFilter.value)
  }

  // 搜索：端口号或 PID 或进程名
  const q = searchText.value.trim()
  if (q) {
    const num = parseInt(q)
    if (!isNaN(num)) {
      list = list.filter(p => p.localPort === num || p.pid === num || String(p.localPort).includes(q) || String(p.pid).includes(q))
    } else {
      const lower = q.toLowerCase()
      list = list.filter(p => p.processName.toLowerCase().includes(lower))
    }
  }

  // 排序
  const { prop, order } = sortState.value
  if (prop && order) {
    const dir = order === 'ascending' ? 1 : -1
    list = [...list].sort((a, b) => {
      const va = a[prop] ?? ''
      const vb = b[prop] ?? ''
      if (typeof va === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }

  return list
})

// 分页数据
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPorts.value.length / pageSize)))
const pagedPorts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPorts.value.slice(start, start + pageSize)
})

// 统计信息
const portStats = computed(() => {
  const stats = { listening: 0, established: 0 }
  for (const p of filteredPorts.value) {
    if (p.state === 'LISTENING' || p.state === 'LISTEN') stats.listening++
    if (p.state === 'ESTABLISHED') stats.established++
  }
  return stats
})

function onSortChange({ prop, order }) {
  sortState.value = { prop, order }
}

function stateClass(state) {
  switch (state) {
    case 'LISTENING': case 'LISTEN': return 'listening'
    case 'ESTABLISHED': return 'established'
    case 'TIME_WAIT': return 'time-wait'
    case 'CLOSE_WAIT': return 'close-wait'
    default: return 'other'
  }
}

async function refreshPorts() {
  loading.value = true
  try {
    ports.value = await getAllPorts()
  } catch (e) {
    ElMessage.error(t('portManager.loadFail'))
  } finally {
    loading.value = false
  }
}

async function confirmKill(row) {
  try {
    await ElMessageBox.confirm(
      t('portManager.confirmKill', { name: row.processName || 'PID ' + row.pid, pid: row.pid }),
      t('portManager.confirmTitle'),
      { type: 'warning', confirmButtonText: t('portManager.kill'), cancelButtonText: t('portManager.cancel') }
    )

    const result = await killProcess(row.pid)
    if (result.success) {
      ElMessage.success(t('portManager.killSuccess', { pid: row.pid }))
      await refreshPorts()
    } else if (result.requiresPrivilege) {
      const status = await getPrivilegeStatus()
      if (!status.authorized) {
        ElMessage.warning(t('portManager.needAuth'))
        router.push('/settings?tab=security')
      } else {
        ElMessage.error(result.message || t('portManager.killFail'))
      }
    } else {
      ElMessage.error(result.message || t('portManager.killFail'))
    }
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  refreshPorts()
})
</script>

<style scoped>
.port-manager-wrapper {
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
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }
.header-actions :deep(.el-button) { --el-border-radius-base: 10px; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px 0;
  flex-wrap: wrap;
}
.search-input { width: 240px; }
.filter-select { width: 130px; }
.killable-check { margin-left: 4px; }
.killable-check :deep(.el-checkbox__label) { font-size: 12px; color: var(--text-secondary); }
.filter-bar :deep(.el-input__wrapper),
.filter-bar :deep(.el-select__wrapper) { border-radius: 10px; }

.table-area {
  flex: 1;
  overflow: hidden;
  padding: 14px 18px 0;
}
.table-area :deep(.el-table) {
  --el-table-border-color: rgba(60, 40, 20, 0.08);
  --el-table-header-bg-color: rgba(248, 244, 232,0.94);
  --el-table-bg-color: rgba(253, 251, 246,0.99);
  --el-table-tr-bg-color: rgba(253, 251, 246,0.99);
  --el-table-row-hover-bg-color: rgba(64, 158, 255, 0.06);
  --el-table-header-text-color: var(--text-secondary);
  --el-table-text-color: var(--text-primary);
  --el-fill-color-lighter: rgba(248, 244, 232,0.9);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  font-size: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
}
.table-area :deep(.el-table th) {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.table-area :deep(.el-table td) { padding: 6px 0; }

.state-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  line-height: 18px;
}
.state-badge.listening { background: rgba(103, 194, 58, 0.12); color: #67c23a; }
.state-badge.established { background: rgba(64, 158, 255, 0.12); color: var(--accent-blue); }
.state-badge.time-wait { background: rgba(230, 162, 60, 0.12); color: #e6a23c; }
.state-badge.close-wait { background: rgba(245, 108, 108, 0.12); color: #f56c6c; }
.state-badge.other { background: rgba(248, 244, 232,0.9); color: var(--text-tertiary); }
.system-tag { font-size: 11px; color: var(--text-quaternary); }

.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  margin: 0 18px 18px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: none;
  font-size: 11px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
  border-radius: 0 0 18px 18px;
}
.stat-total { font-weight: 500; }
.stat-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
}
.stat-chip.listening { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
.stat-chip.established { background: rgba(64, 158, 255, 0.1); color: var(--accent-blue); }
.page-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--text-secondary);
}
</style>
