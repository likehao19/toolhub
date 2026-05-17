<template>
  <div class="sqlite-mgr">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Coin /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('sqliteManager.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="doOpenFile">
          <el-icon style="margin-right: 6px;"><FolderOpened /></el-icon>{{ t('sqliteManager.openFile') }}
        </el-button>
      </div>
    </div>

    <!-- Main Body -->
    <div class="main-body">
      <!-- Left Sidebar -->
      <div class="left-panel">
        <!-- Recent DBs -->
        <div class="panel-section">
          <div class="panel-title">{{ t('sqliteManager.recentDbs') }}</div>
          <div v-for="h in historyList" :key="h.path" class="history-item"
            :class="{ active: currentPath === h.path }" @click="openDb(h.path)">
            <span class="db-icon">🗄️</span>
            <div class="history-info">
              <div class="history-name">{{ basename(h.path) }}</div>
              <div class="history-path" :title="h.path">{{ h.path }}</div>
            </div>
            <el-icon class="history-close" @click.stop="doRemoveHistory(h.path)"><Close /></el-icon>
          </div>
          <div v-if="!historyList.length" class="empty-hint">{{ t('sqliteManager.noRecent') }}</div>
        </div>

        <!-- Table Tree (when connected) -->
        <template v-if="connId">
          <div class="panel-divider"></div>
          <div class="panel-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
            <div class="panel-title">
              {{ t('sqliteManager.tables') }} ({{ tableList.length }})
            </div>
            <el-input v-model="tableFilter" size="small" :placeholder="t('sqliteManager.filterTables')"
              clearable style="margin:0 8px 6px" />
            <div class="table-list">
              <div v-for="tbl in filteredTables" :key="tbl.name" class="table-item"
                :class="{ active: currentTable === tbl.name }" @click="selectTable(tbl.name)">
                <span class="table-icon">{{ tbl.table_type === 'view' ? '👁' : '📋' }}</span>
                <span class="table-name">{{ tbl.name }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Right Content -->
      <div class="right-area">
        <!-- Not connected -->
        <div v-if="!connId" class="empty-state">
          <div style="font-size:56px">🗄️</div>
          <div>{{ t('sqliteManager.selectTable') }}</div>
          <el-button type="primary" size="small" @click="doOpenFile" style="margin-top:12px">
            {{ t('sqliteManager.openFile') }}
          </el-button>
        </div>

        <!-- Connected -->
        <template v-else>
          <!-- Tabs -->
          <div class="tab-bar">
            <div class="tab" :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">
              {{ t('sqliteManager.tabData') }}
            </div>
            <div class="tab" :class="{ active: activeTab === 'structure' }" @click="activeTab = 'structure'">
              {{ t('sqliteManager.tabStructure') }}
            </div>
            <div class="tab" :class="{ active: activeTab === 'sql' }" @click="activeTab = 'sql'">
              {{ t('sqliteManager.tabSql') }}
            </div>
            <!-- Data tab toolbar -->
            <div v-if="activeTab === 'data' && currentTable" class="tab-toolbar">
              <el-button size="small" text @click="loadTableData" :title="t('common.refresh')">
                <el-icon><Refresh /></el-icon>
              </el-button>
              <span class="tab-toolbar-info">{{ totalRows }} {{ t('sqliteManager.rowCount') }}</span>
            </div>
          </div>

          <!-- Data Tab -->
          <div v-show="activeTab === 'data'" class="tab-content">
            <div v-if="!currentTable" class="empty-state small">
              <span>{{ t('sqliteManager.selectTable') }}</span>
            </div>
            <template v-else>
              <el-table :data="tableData" border stripe size="small" class="data-table"
                style="width:100%" max-height="100%" highlight-current-row>
                <el-table-column v-for="col in tableColumns" :key="col.name"
                  :prop="col.name" :label="col.name" :min-width="colWidth(col)" show-overflow-tooltip>
                  <template #header>
                    <span>{{ col.name }}</span>
                    <span class="col-type-badge">{{ col.col_type || 'ANY' }}</span>
                    <span v-if="col.pk" class="pk-badge">PK</span>
                  </template>
                  <template #default="{ row }">
                    <span v-if="row[col.name] === null" class="null-val">NULL</span>
                    <span v-else>{{ row[col.name] }}</span>
                  </template>
                </el-table-column>
              </el-table>
              <!-- Pagination -->
              <div class="pagination-bar">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper"
                  :total="totalRows" :page-size="pageSize" :current-page="currentPage"
                  :page-sizes="[50, 100, 200, 500]"
                  @update:current-page="p => { currentPage = p; loadTableData() }"
                  @update:page-size="s => { pageSize = s; currentPage = 1; loadTableData() }" />
              </div>
            </template>
          </div>

          <!-- Structure Tab -->
          <div v-show="activeTab === 'structure'" class="tab-content" style="overflow-y:auto;padding:16px">
            <div v-if="!currentTable" class="empty-state small">
              <span>{{ t('sqliteManager.selectTable') }}</span>
            </div>
            <template v-else>
              <!-- Columns -->
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">{{ t('sqliteManager.tabStructure') }}</div>
              <el-table :data="tableColumns" border size="small" style="margin-bottom:20px">
                <el-table-column prop="name" :label="t('sqliteManager.columnName')" />
                <el-table-column prop="col_type" :label="t('sqliteManager.columnType')" width="120" />
                <el-table-column :label="t('sqliteManager.notNull')" width="80">
                  <template #default="{ row }">{{ row.notnull ? '✓' : '' }}</template>
                </el-table-column>
                <el-table-column prop="default_value" :label="t('sqliteManager.defaultValue')" width="140" />
                <el-table-column :label="t('sqliteManager.primaryKey')" width="80">
                  <template #default="{ row }">{{ row.pk ? '🔑' : '' }}</template>
                </el-table-column>
              </el-table>

              <!-- Indexes -->
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">{{ t('sqliteManager.indexes') }}</div>
              <el-table :data="tableIndexes" border size="small" style="margin-bottom:20px">
                <el-table-column prop="name" :label="t('sqliteManager.indexName')" />
                <el-table-column :label="t('sqliteManager.unique')" width="80">
                  <template #default="{ row }">{{ row.unique ? '✓' : '' }}</template>
                </el-table-column>
                <el-table-column :label="t('sqliteManager.indexColumns')">
                  <template #default="{ row }">{{ row.columns.join(', ') }}</template>
                </el-table-column>
              </el-table>

              <!-- CREATE SQL -->
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">{{ t('sqliteManager.createSql') }}</div>
              <pre class="create-sql">{{ currentTableSql }}</pre>
            </template>
          </div>

          <!-- SQL Tab -->
          <div v-show="activeTab === 'sql'" class="tab-content sql-tab">
            <div class="sql-editor-area">
              <div class="sql-toolbar">
                <el-button type="primary" size="small" @click="doExecuteSql" :loading="sqlRunning">
                  <el-icon style="margin-right: 6px;"><CaretRight /></el-icon>{{ t('sqliteManager.execute') }}
                </el-button>
                <el-button size="small" text @click="sqlText = ''" :title="t('sqliteManager.clearSql')">
                  <el-icon><Delete /></el-icon>
                </el-button>
                <span class="sql-hint">Ctrl+Enter</span>
              </div>
              <textarea v-model="sqlText" class="sql-textarea" spellcheck="false"
                :placeholder="t('sqliteManager.sqlPlaceholder')"
                @keydown.ctrl.enter="doExecuteSql" />
            </div>
            <!-- SQL Result -->
            <div class="sql-result-area">
              <div v-if="sqlError" class="sql-error">{{ sqlError }}</div>
              <div v-else-if="sqlResult" class="sql-result-info">
                <template v-if="sqlResult.columns">
                  {{ sqlResult.row_count }} {{ t('sqliteManager.rowCount') }} · {{ sqlResult.elapsed_ms }}ms
                </template>
                <template v-else>
                  {{ sqlResult.affected_rows }} {{ t('sqliteManager.affectedRows') }} · {{ sqlResult.elapsed_ms }}ms
                </template>
              </div>
              <el-table v-if="sqlResult?.columns" :data="sqlResultRows" border stripe size="small"
                style="width:100%" max-height="300">
                <el-table-column v-for="col in sqlResult.columns" :key="col"
                  :prop="col" :label="col" min-width="120" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span v-if="row[col] === null" class="null-val">NULL</span>
                    <span v-else>{{ row[col] }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <template v-if="connId">
        <span class="status-dot connected"></span>
        <span>{{ t('sqliteManager.connected') }}</span>
        <span class="status-sep">|</span>
        <span v-if="currentTable">{{ currentTable }}</span>
        <span class="status-sep">|</span>
        <span v-if="dbInfo">{{ formatFileSize(dbInfo.file_size) }}</span>
        <span class="status-sep">|</span>
        <span v-if="dbInfo">SQLite {{ dbInfo.sqlite_version }}</span>
      </template>
      <template v-else>
        <span class="status-dot"></span>
        <span>{{ t('sqliteManager.disconnected') }}</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Coin, FolderOpened, Close, Refresh, CaretRight, Delete } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import {
  pickSqliteFile, sqliteOpen, sqliteClose, sqliteTables,
  sqliteTableInfo, sqliteTableIndexes, sqliteQuery, sqliteExecute,
  sqliteCount, sqliteDbInfo,
  loadHistory, saveToHistory, removeFromHistory, formatFileSize, basename,
} from '@/utils/sqliteManager'

const router = useRouter()

// ==================== Connection State ====================
const connId = ref(null)
const currentPath = ref('')
const dbInfo = ref(null)
const historyList = ref(loadHistory())

// ==================== Table Browser ====================
const tableList = ref([])
const tableFilter = ref('')
const currentTable = ref('')
const currentTableSql = ref('')
const tableColumns = ref([])
const tableIndexes = ref([])
const tableData = ref([])
const totalRows = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)

const filteredTables = computed(() => {
  if (!tableFilter.value) return tableList.value
  const q = tableFilter.value.toLowerCase()
  return tableList.value.filter(t => t.name.toLowerCase().includes(q))
})

// ==================== SQL Tab ====================
const activeTab = ref('data')
const sqlText = ref('')
const sqlRunning = ref(false)
const sqlResult = ref(null)
const sqlError = ref(null)

const sqlResultRows = computed(() => {
  if (!sqlResult.value?.columns || !sqlResult.value?.rows) return []
  return sqlResult.value.rows.map(row => {
    const obj = {}
    sqlResult.value.columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
})

// ==================== Open / Close ====================
async function doOpenFile() {
  const path = await pickSqliteFile()
  if (path) await openDb(path)
}

async function openDb(path) {
  // Close existing
  if (connId.value) {
    try { await sqliteClose(connId.value) } catch { /* ignore */ }
  }

  try {
    const id = await sqliteOpen(path)
    connId.value = id
    currentPath.value = path
    currentTable.value = ''
    tableData.value = []
    sqlResult.value = null
    sqlError.value = null

    // Save history
    saveToHistory(basename(path), path)
    historyList.value = loadHistory()

    // Load table list + db info
    const [tables, info] = await Promise.all([
      sqliteTables(id),
      sqliteDbInfo(id),
    ])
    tableList.value = tables
    dbInfo.value = info

    // Auto-select first table
    if (tables.length) {
      await selectTable(tables[0].name)
    }
  } catch (e) {
    ElMessage.error(String(e))
  }
}

function doRemoveHistory(path) {
  removeFromHistory(path)
  historyList.value = loadHistory()
}

// ==================== Table Selection ====================
async function selectTable(name) {
  if (!connId.value) return
  currentTable.value = name
  currentPage.value = 1
  activeTab.value = 'data'

  const tbl = tableList.value.find(t => t.name === name)
  currentTableSql.value = tbl?.sql || ''

  try {
    const [cols, indexes, count] = await Promise.all([
      sqliteTableInfo(connId.value, name),
      sqliteTableIndexes(connId.value, name),
      sqliteCount(connId.value, name),
    ])
    tableColumns.value = cols
    tableIndexes.value = indexes
    totalRows.value = count
    await loadTableData()
  } catch (e) {
    ElMessage.error(String(e))
  }
}

async function loadTableData() {
  if (!connId.value || !currentTable.value) return
  const offset = (currentPage.value - 1) * pageSize.value
  const tbl = currentTable.value.replace(/"/g, '""')
  try {
    const result = await sqliteQuery(
      connId.value,
      `SELECT * FROM "${tbl}" LIMIT ? OFFSET ?`,
      [pageSize.value, offset]
    )
    // Convert rows array to objects
    tableData.value = result.rows.map(row => {
      const obj = {}
      result.columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })
  } catch (e) {
    ElMessage.error(String(e))
  }
}

// ==================== SQL Execution ====================
async function doExecuteSql() {
  if (!connId.value || !sqlText.value.trim()) return
  sqlRunning.value = true
  sqlResult.value = null
  sqlError.value = null

  const sql = sqlText.value.trim()
  const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(sql)

  try {
    if (isSelect) {
      sqlResult.value = await sqliteQuery(connId.value, sql, [])
    } else {
      sqlResult.value = await sqliteExecute(connId.value, sql, [])
      // Refresh table data if we modified data
      if (currentTable.value) {
        totalRows.value = await sqliteCount(connId.value, currentTable.value)
        await loadTableData()
      }
      // Refresh table list if DDL
      if (/^\s*(CREATE|DROP|ALTER)/i.test(sql)) {
        tableList.value = await sqliteTables(connId.value)
      }
    }
  } catch (e) {
    sqlError.value = String(e)
  } finally {
    sqlRunning.value = false
  }
}

// ==================== Helpers ====================
function colWidth(col) {
  const t = (col.col_type || '').toUpperCase()
  if (t.includes('INT')) return 100
  if (t.includes('REAL') || t.includes('FLOAT')) return 120
  if (t.includes('BLOB')) return 140
  return 160
}

// ==================== Cleanup ====================
onBeforeUnmount(async () => {
  if (connId.value) {
    try { await sqliteClose(connId.value) } catch { /* ignore */ }
  }
})
</script>

<style scoped>
.sqlite-mgr {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  height: 58px;
  flex-shrink: 0;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600;
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-actions :deep(.el-button) { --el-button-border-radius: 10px; }

/* Main Body */
.main-body { flex: 1; display: flex; overflow: hidden; padding: 0; min-height: 0; }

/* Left Panel */
.left-panel {
  width: 260px;
  min-width: 260px;
  background: transparent;
  border: 0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
}
.panel-section { padding: 6px 0; }
.panel-title {
  padding: 10px 14px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.panel-divider { height: 1px; background: rgba(60, 40, 20, 0.08); margin: 6px 0; }

.history-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  cursor: pointer; font-size: 12px; border-radius: 12px; margin: 0 8px 4px;
  transition: all var(--transition-fast); border: 1px solid transparent;
}
.history-item:hover { background: var(--surface-muted); }
.history-item.active {
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-color: rgba(194, 65, 12,0.14);
  color: var(--accent-blue);
  box-shadow: 0 1px 0 var(--surface-panel-soft), 0 6px 14px rgba(60, 40, 20,0.05);
}
.history-item.active .history-name { color: var(--accent-blue); }
.history-item.active .history-path { color: var(--text-tertiary); }
.history-item.active .history-close { color: var(--text-tertiary); }
.db-icon { font-size: 14px; flex-shrink: 0; }
.history-info { flex: 1; min-width: 0; }
.history-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.history-path {
  font-size: 10px; color: var(--text-quaternary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-close { font-size: 12px; color: var(--text-quaternary); display: none; flex-shrink: 0; }
.history-item:hover .history-close { display: block; }
.history-close:hover { color: var(--el-color-danger); }

.table-list { flex: 1; overflow-y: auto; padding: 0 8px 6px; }
.table-item {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  cursor: pointer; font-size: 12px; border-radius: 12px; margin-bottom: 4px;
  transition: all var(--transition-fast); border: 1px solid transparent;
}
.table-item:hover { background: var(--surface-muted); }
.table-item.active {
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-color: rgba(194, 65, 12,0.14);
  color: var(--accent-blue);
  box-shadow: 0 1px 0 var(--surface-panel-soft), 0 6px 14px rgba(60, 40, 20,0.05);
}
.table-icon { font-size: 12px; flex-shrink: 0; }
.table-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Right Area */
.right-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  box-shadow: inset 0 1px 0 var(--surface-panel);
}
.empty-state {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: var(--text-quaternary); gap: 8px; font-size: 14px;
  margin: 18px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: var(--surface-muted);
}
.empty-state.small { font-size: 12px; margin: 14px; }
.empty-state :deep(.el-button) { --el-button-border-radius: 10px; }
.empty-hint {
  text-align: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
  margin: 8px 10px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: var(--surface-muted);
}

/* Tab Bar */
.tab-bar {
  display: flex; align-items: center; border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  background: var(--surface-panel-soft); flex-shrink: 0; padding: 0 14px;
}
.tab {
  padding: 11px 14px 9px; font-size: 12px; color: var(--text-secondary);
  cursor: pointer; border-bottom: 2px solid transparent; user-select: none;
}
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); font-weight: 600; }
.tab-toolbar { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tab-toolbar-info { font-size: 11px; color: var(--text-tertiary); }
.tab-toolbar :deep(.el-button) { --el-button-border-radius: 10px; }

/* Data Tab */
.tab-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: transparent; min-height: 0; }
.data-table { flex: 1; }
.col-type-badge {
  font-size: 9px; color: var(--text-quaternary); margin-left: 4px;
  padding: 1px 6px; background: rgba(60, 40, 20, 0.05); border-radius: 999px;
}
.pk-badge {
  font-size: 9px; color: var(--el-color-warning); margin-left: 2px;
  padding: 1px 6px; background: rgba(230,162,60,0.12); border-radius: 999px; font-weight: 700;
}
.null-val { color: var(--text-quaternary); font-style: italic; }
.pagination-bar {
  display: flex; justify-content: center; padding: 10px;
  border-top: 1px solid rgba(60, 40, 20, 0.08); flex-shrink: 0; background: var(--surface-panel-soft);
}

/* Structure Tab */
.create-sql {
  margin: 0; padding: 14px; background: rgba(60, 40, 20, 0.04); border-radius: 14px;
  font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.6;
  color: var(--text-primary); white-space: pre-wrap; word-break: break-all;
  border: 1px solid rgba(60, 40, 20, 0.08);
}

/* SQL Tab */
.sql-tab { display: flex; flex-direction: column; }
.sql-editor-area { flex: 0 0 auto; display: flex; flex-direction: column; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.sql-toolbar {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08); background: var(--surface-panel-soft);
}
.sql-toolbar :deep(.el-button) { --el-button-border-radius: 10px; }
.sql-hint { font-size: 10px; color: var(--text-quaternary); margin-left: auto; }
.sql-textarea {
  width: 100%; min-height: 120px; max-height: 200px; padding: 12px 14px;
  border: none; outline: none; resize: vertical; box-sizing: border-box;
  background: var(--surface-muted); color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6;
}
.sql-result-area { flex: 1; overflow: auto; }
.sql-result-info { padding: 10px 12px; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.sql-error { padding: 12px; color: var(--el-color-danger); font-size: 12px; font-family: monospace; white-space: pre-wrap; }

/* Status Bar */
.status-bar {
  height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 16px;
  margin: 0 18px 18px 268px;
  background: var(--surface-panel-soft); border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: none;
  font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
  border-radius: 0 0 18px 18px;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--el-text-color-secondary); flex-shrink: 0;
}
.status-dot.connected { background: var(--el-color-success); box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.14); }
.status-sep { color: var(--border-color); }

/* Scrollbar */
.table-list::-webkit-scrollbar, .sql-result-area::-webkit-scrollbar { width: 5px; }
.table-list::-webkit-scrollbar-thumb, .sql-result-area::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}

@media (max-width: 1120px) {
  .main-body { padding: 0; }
  .left-panel { width: 220px; min-width: 220px; }
  .status-bar { margin: 0 14px 14px 234px; }
}

@media (max-width: 900px) {
  .main-body { flex-direction: column; padding: 0; }
  .left-panel {
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    max-height: 260px;
  }
  .status-bar { margin: 0 14px 14px; border-top: 1px solid rgba(60, 40, 20, 0.08); }
}

@media (max-width: 720px) {
  .header {
    height: auto;
    min-height: 58px;
    padding: 10px 14px;
    align-items: flex-start;
    flex-direction: column;
  }
  .header-left,
  .header-actions { width: 100%; }
}</style>
