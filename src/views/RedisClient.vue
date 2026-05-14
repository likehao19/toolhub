<template>
  <div class="redis-client">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Connection /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('redisClient.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="showConnDialog = true">
          <el-icon style="margin-right: 6px;"><Plus /></el-icon>{{ t('redisClient.newConnection') }}
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="main-body">
      <!-- 左侧: 连接面板 -->
      <div class="left-panel">
        <div class="panel-title">{{ t('redisClient.connections') }}</div>
        <div class="conn-list">
          <div
            v-for="conn in savedConnections"
            :key="conn.id"
            class="conn-item"
            :class="{ active: activeConnId === conn.id }"
            @click="connectTo(conn)"
            @contextmenu.prevent="showConnCtxMenu($event, conn)"
          >
            <span class="conn-dot" :class="{ connected: activeConnId === conn.id }" :style="conn.color ? { background: conn.color } : {}"></span>
            <span class="conn-name">{{ conn.name }}</span>
            <span class="conn-host">{{ conn.host }}:{{ conn.port }}</span>
          </div>
          <div v-if="!savedConnections.length" class="conn-empty">{{ t('redisClient.noConnections') }}</div>
        </div>

        <!-- DB 选择 -->
        <template v-if="connId">
          <div class="panel-title db-title">DB</div>
          <div class="db-list">
            <div
              v-for="i in 16"
              :key="i - 1"
              class="db-item"
              :class="{ active: currentDb === i - 1 }"
              @click="switchDb(i - 1)"
            >
              db{{ i - 1 }}
            </div>
          </div>
        </template>
      </div>

      <!-- 中间+右侧 -->
      <div class="right-area" v-if="connId">
        <!-- 标签页 -->
        <div class="tab-bar">
          <div class="tab" :class="{ active: activeTab === 'keys' }" @click="activeTab = 'keys'">
            <el-icon><List /></el-icon> {{ t('redisClient.keyBrowser') }}
          </div>
          <div class="tab" :class="{ active: activeTab === 'cli' }" @click="activeTab = 'cli'">
            <el-icon><Monitor /></el-icon> {{ t('redisClient.cli') }}
          </div>
          <div class="tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'; loadServerInfo()">
            <el-icon><DataAnalysis /></el-icon> {{ t('redisClient.serverInfo') }}
          </div>
        </div>

        <!-- 键浏览 -->
        <div class="tab-content" v-show="activeTab === 'keys'">
          <div class="key-browser">
            <!-- 键列表 -->
            <div class="key-list-panel">
              <div class="key-search">
                <el-input
                  v-model="keyPattern"
                  :placeholder="t('redisClient.searchPattern')"
                  size="small"
                  clearable
                  @keyup.enter="scanAllKeys"
                >
                  <template #prefix><el-icon><Search /></el-icon></template>
                </el-input>
                <el-button size="small" @click="scanAllKeys" :loading="scanning">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
              <div class="key-tree-wrapper">
                <el-tree
                  v-if="keyTreeData.length"
                  :data="keyTreeData"
                  :props="{ children: 'children', label: 'label', isLeaf: (data) => data.isLeaf }"
                  node-key="nodeId"
                  highlight-current
                  @node-click="onKeyNodeClick"
                  :default-expand-all="keyTreeData.length < 50"
                >
                  <template #default="{ data }">
                    <span class="key-tree-node">
                      <span v-if="data.isLeaf" class="key-type-icon">{{ keyTypeIcon(data.keyType) }}</span>
                      <span v-else class="key-folder-icon">📁</span>
                      <span>{{ data.label }}</span>
                      <span v-if="!data.isLeaf && data.children" class="key-count">({{ countLeaves(data) }})</span>
                    </span>
                  </template>
                </el-tree>
                <div v-else-if="!scanning" class="key-empty">
                  {{ allKeys.length === 0 ? t('redisClient.noKeys') : t('redisClient.scanFirst') }}
                </div>
                <div v-if="scanning" class="key-loading">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  {{ t('redisClient.scanning') }} ({{ allKeys.length }})
                </div>
              </div>
              <div class="key-list-footer">
                {{ t('redisClient.totalKeys') }}: {{ allKeys.length }}
                <el-button v-if="selectedKeys.length" size="small" type="danger" text @click="batchDelete">
                  <el-icon style="margin-right: 4px;"><Delete /></el-icon>{{ t('redisClient.deleteKey') }} ({{ selectedKeys.length }})
                </el-button>
              </div>
            </div>

            <!-- 键详情 -->
            <div class="key-detail-panel" v-if="currentKeyDetail">
              <div class="detail-header">
                <div class="detail-key-name">
                  <span class="key-type-badge" :class="'type-' + currentKeyDetail.key_type">
                    {{ currentKeyDetail.key_type }}
                  </span>
                  {{ currentKeyDetail.key }}
                </div>
                <div class="detail-meta">
                  <span>TTL: {{ formatTtl(currentKeyDetail.ttl) }}</span>
                  <span>{{ t('redisClient.keyMemory') }}: {{ formatBytes(currentKeyDetail.size) }}</span>
                  <el-button size="small" text type="primary" @click="showTtlDialog = true">
                    <el-icon><Timer /></el-icon>
                  </el-button>
                  <el-button size="small" text type="primary" @click="showRenameDialog = true">
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                  <el-button size="small" text type="danger" @click="deleteCurrentKey">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                  <el-button size="small" text @click="refreshCurrentKey">
                    <el-icon><Refresh /></el-icon>
                  </el-button>
                </div>
              </div>

              <!-- String 类型 -->
              <div v-if="currentKeyDetail.key_type === 'string'" class="detail-body">
                <div class="detail-toolbar">
                  <el-radio-group v-model="stringViewMode" size="small">
                    <el-radio-button value="text">Text</el-radio-button>
                    <el-radio-button value="json">JSON</el-radio-button>
                  </el-radio-group>
                  <el-button size="small" type="primary" @click="saveStringValue">
                    <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('redisClient.save') }}
                  </el-button>
                </div>
                <el-input
                  v-model="editStringValue"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 20 }"
                  class="value-editor"
                />
              </div>

              <!-- Hash 类型 -->
              <div v-else-if="currentKeyDetail.key_type === 'hash'" class="detail-body">
                <div class="detail-toolbar">
                  <el-button size="small" type="primary" @click="addHashField">
                    <el-icon style="margin-right: 6px;"><Plus /></el-icon>{{ t('redisClient.addField') }}
                  </el-button>
                </div>
                <el-table :data="hashTableData" size="small" max-height="500">
                  <el-table-column prop="field" label="Field" min-width="150">
                    <template #default="{ row }">
                      <el-input v-if="row.editing" v-model="row.field" size="small" />
                      <span v-else>{{ row.field }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="value" label="Value" min-width="250">
                    <template #default="{ row }">
                      <el-input v-if="row.editing" v-model="row.value" size="small" />
                      <span v-else class="hash-value">{{ row.value }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column width="100" align="right">
                    <template #default="{ row, $index }">
                      <el-button v-if="row.editing" size="small" type="primary" text @click="saveHashRow(row)" :title="t('common.save')"><el-icon><Check /></el-icon></el-button>
                      <el-button v-else size="small" text @click="row.editing = true" :title="t('common.edit')"><el-icon><EditPen /></el-icon></el-button>
                      <el-button size="small" text type="danger" @click="deleteHashField($index)" :title="t('common.delete')"><el-icon><Delete /></el-icon></el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- List 类型 -->
              <div v-else-if="currentKeyDetail.key_type === 'list'" class="detail-body">
                <div class="detail-toolbar">
                  <el-input v-model="newListItem" size="small" :placeholder="t('redisClient.newValue')" style="width: 300px" @keyup.enter="pushListItem" />
                  <el-button size="small" @click="pushListItem">
                    <el-icon style="margin-right: 4px;"><DArrowRight /></el-icon>RPUSH
                  </el-button>
                  <el-button size="small" @click="lpushListItem">
                    <el-icon style="margin-right: 4px;"><DArrowLeft /></el-icon>LPUSH
                  </el-button>
                </div>
                <el-table :data="listTableData" size="small" max-height="500">
                  <el-table-column label="Index" width="70" type="index" />
                  <el-table-column prop="value" label="Value" />
                  <el-table-column width="60" align="right">
                    <template #default="{ $index }">
                      <el-button size="small" text type="danger" @click="deleteListItem($index)"><el-icon><Delete /></el-icon></el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- Set 类型 -->
              <div v-else-if="currentKeyDetail.key_type === 'set'" class="detail-body">
                <div class="detail-toolbar">
                  <el-input v-model="newSetMember" size="small" :placeholder="t('redisClient.newValue')" style="width: 300px" @keyup.enter="addSetMember" />
                  <el-button size="small" type="primary" @click="addSetMember">
                    <el-icon style="margin-right: 4px;"><Plus /></el-icon>SADD
                  </el-button>
                </div>
                <el-table :data="setTableData" size="small" max-height="500">
                  <el-table-column prop="value" label="Member" />
                  <el-table-column width="60" align="right">
                    <template #default="{ row }">
                      <el-button size="small" text type="danger" @click="removeSetMember(row.value)"><el-icon><Delete /></el-icon></el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- ZSet 类型 -->
              <div v-else-if="currentKeyDetail.key_type === 'zset'" class="detail-body">
                <div class="detail-toolbar">
                  <el-input v-model="newZsetMember" size="small" placeholder="Member" style="width: 200px" />
                  <el-input v-model="newZsetScore" size="small" placeholder="Score" style="width: 100px" />
                  <el-button size="small" type="primary" @click="addZsetMember">
                    <el-icon style="margin-right: 4px;"><Plus /></el-icon>ZADD
                  </el-button>
                </div>
                <el-table :data="zsetTableData" size="small" max-height="500">
                  <el-table-column prop="member" label="Member" min-width="200" />
                  <el-table-column prop="score" label="Score" width="120" />
                  <el-table-column width="60" align="right">
                    <template #default="{ row }">
                      <el-button size="small" text type="danger" @click="removeZsetMember(row.member)"><el-icon><Delete /></el-icon></el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- Stream / 其他类型 -->
              <div v-else class="detail-body">
                <pre class="raw-value">{{ JSON.stringify(currentKeyDetail.value, null, 2) }}</pre>
              </div>
            </div>

            <!-- 未选择键 -->
            <div class="key-detail-panel key-detail-empty" v-else>
              <el-icon :size="48" color="var(--text-quaternary)"><Key /></el-icon>
              <p>{{ t('redisClient.selectKey') }}</p>
            </div>
          </div>
        </div>

        <!-- CLI 终端 -->
        <div class="tab-content cli-tab" v-show="activeTab === 'cli'">
          <div class="cli-output" ref="cliOutputEl">
            <div v-for="(entry, i) in cliHistory" :key="i" class="cli-entry">
              <div class="cli-cmd"><span class="cli-prompt">{{ activeConnName }}(db{{ currentDb }})&gt;</span> {{ entry.cmd }}</div>
              <div class="cli-result" :class="'cli-' + entry.type">
                <pre>{{ entry.result }}</pre>
              </div>
            </div>
          </div>
          <div class="cli-input-area">
            <span class="cli-prompt-input">{{ activeConnName }}(db{{ currentDb }})&gt;</span>
            <el-input
              v-model="cliInput"
              size="small"
              class="cli-input"
              :placeholder="t('redisClient.commandHint')"
              @keyup.enter="executeCli"
              @keydown.up.prevent="cliHistoryUp"
              @keydown.down.prevent="cliHistoryDown"
              @keydown.tab.prevent="cliTabComplete"
            />
          </div>
        </div>

        <!-- 服务器信息 -->
        <div class="tab-content info-tab" v-show="activeTab === 'info'">
          <div v-if="serverInfoData" class="info-cards">
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.serverVersion') }}</div>
              <div class="info-card-value">{{ serverInfoData.server?.redis_version || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.uptime') }}</div>
              <div class="info-card-value">{{ formatUptime(Number(serverInfoData.server?.uptime_in_seconds || 0)) }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.usedMemory') }}</div>
              <div class="info-card-value">{{ serverInfoData.memory?.used_memory_human || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.peakMemory') }}</div>
              <div class="info-card-value">{{ serverInfoData.memory?.used_memory_peak_human || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.connectedClients') }}</div>
              <div class="info-card-value">{{ serverInfoData.clients?.connected_clients || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.opsPerSec') }}</div>
              <div class="info-card-value">{{ serverInfoData.stats?.instantaneous_ops_per_sec || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.hitRate') }}</div>
              <div class="info-card-value">{{ computeHitRate }}</div>
            </div>
            <div class="info-card">
              <div class="info-card-title">{{ t('redisClient.totalKeys') }}</div>
              <div class="info-card-value">{{ currentDbSize }}</div>
            </div>
          </div>

          <!-- INFO 原始数据 -->
          <div v-if="serverInfoData" class="info-raw">
            <el-collapse>
              <el-collapse-item v-for="(section, name) in serverInfoData" :key="name" :title="name">
                <div class="info-section">
                  <div v-for="(val, key) in section" :key="key" class="info-row">
                    <span class="info-key">{{ key }}</span>
                    <span class="info-val">{{ val }}</span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="!serverInfoData" class="info-empty">
            <el-icon class="is-loading" v-if="infoLoading"><Loading /></el-icon>
            <span v-else>{{ t('redisClient.connectFirst') }}</span>
          </div>
        </div>
      </div>

      <!-- 未连接状态 -->
      <div class="right-area empty-right" v-else>
        <el-icon :size="64" color="var(--text-quaternary)"><Connection /></el-icon>
        <p>{{ t('redisClient.connectFirst') }}</p>
        <el-button type="primary" @click="showConnDialog = true">
          <el-icon style="margin-right: 6px;"><Plus /></el-icon>{{ t('redisClient.newConnection') }}
        </el-button>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span v-if="connId">
        <span class="status-dot connected"></span>
        {{ activeConnName }} — db{{ currentDb }}
      </span>
      <span v-else>
        <span class="status-dot"></span>
        {{ t('redisClient.disconnected') }}
      </span>
      <span v-if="connId" class="status-right">{{ t('redisClient.totalKeys') }}: {{ currentDbSize }}</span>
    </div>

    <!-- 新建/编辑连接对话框 -->
    <el-dialog v-model="showConnDialog" :title="editingConn ? t('redisClient.editConnection') : t('redisClient.newConnection')" width="460px" append-to-body @close="resetConnForm">
      <el-form :model="connForm" label-position="top" size="small">
        <el-form-item :label="t('redisClient.connectionName')" required>
          <el-input v-model="connForm.name" placeholder="My Redis" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item :label="t('redisClient.host')" style="flex:1" required>
            <el-input v-model="connForm.host" placeholder="127.0.0.1" />
          </el-form-item>
          <el-form-item :label="t('redisClient.port')" style="width:100px" required>
            <el-input v-model.number="connForm.port" placeholder="6379" />
          </el-form-item>
        </div>
        <el-form-item :label="t('redisClient.password')">
          <el-input v-model="connForm.password" type="password" show-password :placeholder="t('redisClient.passwordOptional')" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item :label="t('redisClient.database')" style="width:100px">
            <el-input v-model.number="connForm.db_index" placeholder="0" />
          </el-form-item>
          <el-form-item :label="t('redisClient.color')" style="width:100px">
            <el-color-picker v-model="connForm.color" size="small" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button size="small" @click="testConn" :loading="testingConn">
          <el-icon style="margin-right: 6px;"><Connection /></el-icon>{{ t('redisClient.testConnection') }}
        </el-button>
        <el-button size="small" @click="showConnDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="saveConn">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- TTL 对话框 -->
    <el-dialog v-model="showTtlDialog" :title="t('redisClient.setTtl')" width="360px" append-to-body>
      <el-form label-position="top" size="small">
        <el-form-item :label="t('redisClient.ttlSecondsLabel')">
          <el-input v-model.number="ttlInput" :placeholder="t('redisClient.ttlNeverExpire')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showTtlDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="saveTtl">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog v-model="showRenameDialog" :title="t('redisClient.renameKey')" width="360px" append-to-body>
      <el-form label-position="top" size="small">
        <el-form-item :label="t('redisClient.newKeyName')">
          <el-input v-model="renameInput" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showRenameDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doRename">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <div v-if="connCtxMenu.visible" class="context-menu" :style="{ top: connCtxMenu.y + 'px', left: connCtxMenu.x + 'px' }" @click="connCtxMenu.visible = false">
      <div class="ctx-item" @click="editConn(connCtxMenu.conn)">{{ t('redisClient.editConnection') }}</div>
      <div class="ctx-item ctx-danger" @click="deleteConn(connCtxMenu.conn)">{{ t('redisClient.deleteConnection') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Connection, Plus, Search, Refresh, List, Monitor, DataAnalysis,
  Timer, EditPen, Delete, Loading, Key, Check, DArrowLeft, DArrowRight
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import * as redis from '@/utils/redisManager'

const router = useRouter()

// ---- 连接管理 ----
const savedConnections = ref([])
const showConnDialog = ref(false)
const editingConn = ref(null)
const testingConn = ref(false)
const connForm = ref({ name: '', host: '127.0.0.1', port: 6379, password: '', db_index: 0, color: '' })
const connCtxMenu = ref({ visible: false, x: 0, y: 0, conn: null })

const connId = ref(null)          // 当前 Rust 侧连接 ID
const activeConnId = ref(null)    // 当前选中的 saved connection id
const activeConnName = ref('')
const currentDb = ref(0)

// ---- 键浏览 ----
const activeTab = ref('keys')
const keyPattern = ref('*')
const scanning = ref(false)
const allKeys = ref([])
const keyTreeData = ref([])
const selectedKeys = ref([])
const currentKeyDetail = ref(null)

// 编辑状态
const stringViewMode = ref('text')
const editStringValue = ref('')
const hashTableData = ref([])
const newListItem = ref('')
const listTableData = ref([])
const newSetMember = ref('')
const setTableData = ref([])
const newZsetMember = ref('')
const newZsetScore = ref('0')
const zsetTableData = ref([])

// TTL / Rename
const showTtlDialog = ref(false)
const ttlInput = ref(-1)
const showRenameDialog = ref(false)
const renameInput = ref('')

// ---- CLI ----
const cliInput = ref('')
const cliHistory = ref([])
const cliCmdHistory = ref([])
const cliHistoryIdx = ref(-1)
const cliOutputEl = ref(null)

// ---- 服务器信息 ----
const serverInfoData = ref(null)
const infoLoading = ref(false)
const currentDbSize = ref(0)

const { formatTtl, formatBytes, formatUptime } = redis

const computeHitRate = computed(() => {
  if (!serverInfoData.value?.stats) return '—'
  const hits = Number(serverInfoData.value.stats.keyspace_hits || 0)
  const misses = Number(serverInfoData.value.stats.keyspace_misses || 0)
  const total = hits + misses
  if (total === 0) return '—'
  return Math.round(hits / total * 100) + '%'
})

// ---- 生命周期 ----

onMounted(async () => {
  await loadConnections()
  document.addEventListener('click', closeCtxMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeCtxMenu)
  if (connId.value) redis.disconnect(connId.value).catch(() => {})
})

function closeCtxMenu() { connCtxMenu.value.visible = false }

// ---- 连接操作 ----

async function loadConnections() {
  try {
    savedConnections.value = await redis.getConnections()
  } catch (e) {
    console.warn('Load connections:', e)
  }
}

async function connectTo(conn) {
  if (activeConnId.value === conn.id && connId.value) return
  try {
    // 断开旧连接
    if (connId.value) {
      await redis.disconnect(connId.value).catch(() => {})
    }
    const id = await redis.connect(conn.host, conn.port, conn.password, conn.db_index || 0)
    connId.value = id
    activeConnId.value = conn.id
    activeConnName.value = conn.name
    currentDb.value = conn.db_index || 0
    await redis.touchConnection(conn.id)

    // 加载键
    await scanAllKeys()
    currentDbSize.value = await redis.dbSize(id)

    ElMessage.success(t('redisClient.connected'))
  } catch (e) {
    ElMessage.error(t('redisClient.connectFailed') + ': ' + e)
  }
}

async function switchDb(db) {
  if (!connId.value) return
  try {
    await redis.selectDb(connId.value, db)
    currentDb.value = db
    currentKeyDetail.value = null
    await scanAllKeys()
    currentDbSize.value = await redis.dbSize(connId.value)
  } catch (e) {
    ElMessage.error(e.toString())
  }
}

async function testConn() {
  testingConn.value = true
  try {
    await redis.testConnection(connForm.value.host, connForm.value.port, connForm.value.password, connForm.value.db_index || 0)
    ElMessage.success(t('redisClient.testSuccess'))
  } catch (e) {
    ElMessage.error(t('redisClient.connectFailed') + ': ' + e)
  } finally {
    testingConn.value = false
  }
}

async function saveConn() {
  const f = connForm.value
  if (!f.name?.trim()) { ElMessage.warning(t('redisClient.connectionName')); return }
  try {
    if (editingConn.value) {
      await redis.updateConnection(editingConn.value.id, {
        name: f.name, host: f.host, port: f.port, password: f.password, db_index: f.db_index, color: f.color
      })
    } else {
      await redis.addConnection(f)
    }
    showConnDialog.value = false
    await loadConnections()
    ElMessage.success(t('common.saveSuccess'))
  } catch (e) {
    ElMessage.error(e.toString())
  }
}

function resetConnForm() {
  editingConn.value = null
  connForm.value = { name: '', host: '127.0.0.1', port: 6379, password: '', db_index: 0, color: '' }
}

function editConn(conn) {
  editingConn.value = conn
  connForm.value = { ...conn }
  showConnDialog.value = true
}

async function deleteConn(conn) {
  try {
    await ElMessageBox.confirm(t('redisClient.deleteConfirmConn', { name: conn.name }), { type: 'warning' })
    if (activeConnId.value === conn.id) {
      if (connId.value) await redis.disconnect(connId.value).catch(() => {})
      connId.value = null
      activeConnId.value = null
      activeConnName.value = ''
      currentKeyDetail.value = null
      allKeys.value = []
      keyTreeData.value = []
    }
    await redis.deleteConnection(conn.id)
    await loadConnections()
    ElMessage.success(t('common.deleteSuccess'))
  } catch {}
}

function showConnCtxMenu(e, conn) {
  connCtxMenu.value = { visible: true, x: Math.min(e.clientX, innerWidth - 170), y: Math.min(e.clientY, innerHeight - 100), conn }
}

// ---- 键浏览 ----

async function scanAllKeys() {
  if (!connId.value) return
  scanning.value = true
  allKeys.value = []
  try {
    let cursor = 0
    do {
      const result = await redis.scanKeys(connId.value, keyPattern.value || '*', cursor, 500)
      cursor = result.cursor
      allKeys.value.push(...result.keys)
    } while (cursor !== 0 && allKeys.value.length < 50000)

    // 去重
    allKeys.value = [...new Set(allKeys.value)].sort()
    keyTreeData.value = redis.buildKeyTree(allKeys.value)
  } catch (e) {
    ElMessage.error('SCAN: ' + e)
  } finally {
    scanning.value = false
  }
}

function onKeyNodeClick(data) {
  if (data.isLeaf && data.fullKey) {
    loadKeyDetail(data.fullKey)
  }
}

async function loadKeyDetail(key) {
  if (!connId.value) return
  try {
    currentKeyDetail.value = await redis.getKeyDetail(connId.value, key)
    populateEditors()
  } catch (e) {
    ElMessage.error(e.toString())
  }
}

function populateEditors() {
  const d = currentKeyDetail.value
  if (!d) return
  switch (d.key_type) {
    case 'string':
      editStringValue.value = typeof d.value === 'string' ? d.value : JSON.stringify(d.value, null, 2)
      tryJsonView()
      break
    case 'hash':
      hashTableData.value = Object.entries(d.value || {}).map(([field, value]) => ({ field, value: String(value), editing: false }))
      break
    case 'list':
      listTableData.value = (d.value || []).map(v => ({ value: v }))
      break
    case 'set':
      setTableData.value = (d.value || []).map(v => ({ value: v }))
      break
    case 'zset':
      zsetTableData.value = (d.value || []).map(item => ({ member: item.member, score: item.score }))
      break
  }
}

function tryJsonView() {
  try {
    JSON.parse(editStringValue.value)
    stringViewMode.value = 'json'
    editStringValue.value = JSON.stringify(JSON.parse(editStringValue.value), null, 2)
  } catch {
    stringViewMode.value = 'text'
  }
}

async function refreshCurrentKey() {
  if (currentKeyDetail.value) await loadKeyDetail(currentKeyDetail.value.key)
}

// ---- 键编辑操作 ----

async function saveStringValue() {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await redis.setKey(connId.value, currentKeyDetail.value.key, editStringValue.value, 'string')
    ElMessage.success(t('common.saveSuccess'))
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

function addHashField() {
  hashTableData.value.push({ field: '', value: '', editing: true })
}

async function saveHashRow(row) {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'HSET', [currentKeyDetail.value.key, row.field, row.value])
    row.editing = false
    ElMessage.success('OK')
  } catch (e) { ElMessage.error(e.toString()) }
}

async function deleteHashField(index) {
  const row = hashTableData.value[index]
  if (!row || !connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'HDEL', [currentKeyDetail.value.key, row.field])
    hashTableData.value.splice(index, 1)
  } catch (e) { ElMessage.error(e.toString()) }
}

async function pushListItem() {
  if (!newListItem.value || !connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'RPUSH', [currentKeyDetail.value.key, newListItem.value])
    newListItem.value = ''
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function lpushListItem() {
  if (!newListItem.value || !connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'LPUSH', [currentKeyDetail.value.key, newListItem.value])
    newListItem.value = ''
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function deleteListItem(index) {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    // Redis 没有按 index 删除，使用 placeholder 技巧
    const placeholder = '__DELETED__' + Date.now()
    await redis.execute(connId.value, 'LSET', [currentKeyDetail.value.key, String(index), placeholder])
    await redis.execute(connId.value, 'LREM', [currentKeyDetail.value.key, '1', placeholder])
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function addSetMember() {
  if (!newSetMember.value || !connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'SADD', [currentKeyDetail.value.key, newSetMember.value])
    newSetMember.value = ''
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function removeSetMember(member) {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'SREM', [currentKeyDetail.value.key, member])
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function addZsetMember() {
  if (!newZsetMember.value || !connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'ZADD', [currentKeyDetail.value.key, newZsetScore.value || '0', newZsetMember.value])
    newZsetMember.value = ''
    newZsetScore.value = '0'
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function removeZsetMember(member) {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await redis.execute(connId.value, 'ZREM', [currentKeyDetail.value.key, member])
    await refreshCurrentKey()
  } catch (e) { ElMessage.error(e.toString()) }
}

async function deleteCurrentKey() {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await ElMessageBox.confirm(t('redisClient.deleteConfirm', { count: 1 }), { type: 'warning' })
    await redis.deleteKeys(connId.value, [currentKeyDetail.value.key])
    currentKeyDetail.value = null
    await scanAllKeys()
  } catch {}
}

async function batchDelete() {
  if (!connId.value || !selectedKeys.value.length) return
  try {
    await ElMessageBox.confirm(t('redisClient.deleteConfirm', { count: selectedKeys.value.length }), { type: 'warning' })
    await redis.deleteKeys(connId.value, selectedKeys.value)
    selectedKeys.value = []
    currentKeyDetail.value = null
    await scanAllKeys()
  } catch {}
}

async function saveTtl() {
  if (!connId.value || !currentKeyDetail.value) return
  try {
    await redis.setTtl(connId.value, currentKeyDetail.value.key, ttlInput.value)
    showTtlDialog.value = false
    await refreshCurrentKey()
    ElMessage.success('OK')
  } catch (e) { ElMessage.error(e.toString()) }
}

async function doRename() {
  if (!connId.value || !currentKeyDetail.value || !renameInput.value.trim()) return
  try {
    await redis.renameKey(connId.value, currentKeyDetail.value.key, renameInput.value.trim())
    showRenameDialog.value = false
    await scanAllKeys()
    await loadKeyDetail(renameInput.value.trim())
    ElMessage.success('OK')
  } catch (e) { ElMessage.error(e.toString()) }
}

// ---- CLI ----

async function executeCli() {
  const input = cliInput.value.trim()
  if (!input) return
  cliCmdHistory.value.push(input)
  cliHistoryIdx.value = cliCmdHistory.value.length
  cliInput.value = ''

  if (input.toLowerCase() === 'clear') {
    cliHistory.value = []
    return
  }

  const parts = redis.parseCommand(input)
  if (!parts.length) return

  try {
    const result = await redis.execute(connId.value, parts[0], parts.slice(1))
    cliHistory.value.push({
      cmd: input,
      result: formatCliResult(result),
      type: result.result_type,
    })
  } catch (e) {
    cliHistory.value.push({ cmd: input, result: String(e), type: 'error' })
  }

  await nextTick()
  if (cliOutputEl.value) cliOutputEl.value.scrollTop = cliOutputEl.value.scrollHeight
}

function formatCliResult(result) {
  if (result.value === null) return '(nil)'
  if (Array.isArray(result.value)) {
    if (result.value.length === 0) return '(empty list)'
    return result.value.map((v, i) => `${i + 1}) ${JSON.stringify(v)}`).join('\n')
  }
  if (typeof result.value === 'object') return JSON.stringify(result.value, null, 2)
  return String(result.value)
}

function cliHistoryUp() {
  if (cliHistoryIdx.value > 0) {
    cliHistoryIdx.value--
    cliInput.value = cliCmdHistory.value[cliHistoryIdx.value] || ''
  }
}

function cliHistoryDown() {
  if (cliHistoryIdx.value < cliCmdHistory.value.length - 1) {
    cliHistoryIdx.value++
    cliInput.value = cliCmdHistory.value[cliHistoryIdx.value] || ''
  } else {
    cliHistoryIdx.value = cliCmdHistory.value.length
    cliInput.value = ''
  }
}

function cliSuggest(query, cb) {
  const q = query.toUpperCase()
  const matches = redis.REDIS_COMMANDS.filter(c => c.startsWith(q)).map(c => ({ value: c }))
  cb(matches.slice(0, 10))
}

function cliTabComplete() {
  const input = cliInput.value.trim().toUpperCase()
  if (!input) return
  const match = redis.REDIS_COMMANDS.find(c => c.startsWith(input))
  if (match) cliInput.value = match + ' '
}

// ---- 服务器信息 ----

async function loadServerInfo() {
  if (!connId.value) return
  infoLoading.value = true
  try {
    serverInfoData.value = await redis.serverInfo(connId.value)
    currentDbSize.value = await redis.dbSize(connId.value)
  } catch (e) {
    ElMessage.error(e.toString())
  } finally {
    infoLoading.value = false
  }
}

// ---- 工具函数 ----

function keyTypeIcon(type) {
  const icons = { string: '🔤', hash: '📦', list: '📋', set: '🎯', zset: '📊', stream: '🌊' }
  return icons[type] || '🔑'
}

function countLeaves(node) {
  if (node.isLeaf) return 1
  if (!node.children) return 0
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

// 监听 TTL 对话框打开时填入当前值
watch(showTtlDialog, (v) => {
  if (v && currentKeyDetail.value) ttlInput.value = currentKeyDetail.value.ttl
})
watch(showRenameDialog, (v) => {
  if (v && currentKeyDetail.value) renameInput.value = currentKeyDetail.value.key
})
</script>

<style scoped>
.redis-client {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  height: 52px;
  flex-shrink: 0;
  box-sizing: border-box;
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
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
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--text-primary); min-width: 0; }
.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 1px; }
.header-actions :deep(.el-button) { --el-button-border-radius: 8px; }

/* Main body */
.main-body { flex: 1; display: flex; overflow: hidden; gap: 0; min-height: 0; }

/* Left panel：统一 260px 宽度，仅用右侧分割线 */
.left-panel {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
}
.panel-title {
  padding: 12px 14px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.db-title { border-top: 1px solid rgba(60, 40, 20, 0.08); margin-top: 6px; padding-top: 10px; }
.conn-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
.conn-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}
.conn-item:hover { background: rgba(60, 40, 20, 0.04); }
.conn-item.active {
  background: rgba(47, 111, 228, 0.08);
  border-color: rgba(47, 111, 228, 0.18);
}
.conn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-quaternary); grid-row: span 2; align-self: start; margin-top: 4px; }
.conn-dot.connected { background: var(--color-green, var(--el-color-success)); box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.14); }
.conn-name { font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conn-host { font-size: 10px; color: var(--text-quaternary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conn-empty {
  text-align: center;
  padding: 24px 12px;
  font-size: 12px;
  color: var(--text-quaternary);
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.52);
}

.db-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 12px 12px; }
.db-item {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  background: rgba(60, 40, 20, 0.04);
}
.db-item:hover { background: rgba(60, 40, 20, 0.08); color: var(--text-primary); }
.db-item.active { background: var(--accent-blue); color: var(--el-color-white); box-shadow: 0 6px 16px rgba(194, 65, 12,0.2); }

/* Right area */
.right-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.empty-right {
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-quaternary);
  font-size: 14px;
  margin-bottom: 0;
}
.empty-right p {
  margin: 0;
}
.empty-right :deep(.el-button) { --el-button-border-radius: 10px; }

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
  padding: 0 14px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); font-weight: 600; }

.tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

/* Key browser */
.key-browser { flex: 1; display: flex; overflow: hidden; min-height: 0; }

.key-list-panel {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid rgba(60, 40, 20, 0.1);
  display: flex;
  flex-direction: column;
  background: transparent;
}
.key-search { display: flex; gap: 8px; padding: 12px; }
.key-search :deep(.el-button) { --el-button-border-radius: 10px; }
.key-tree-wrapper { flex: 1; overflow-y: auto; padding: 0 6px 8px; }
.key-tree-wrapper :deep(.el-tree) { background: transparent; }
.key-tree-wrapper :deep(.el-tree-node__content) { height: 32px; border-radius: 10px; margin: 1px 4px; }
.key-tree-wrapper :deep(.el-tree-node__content:hover) { background: rgba(255,255,255,0.7); }
.key-tree-node { display: flex; align-items: center; gap: 4px; font-size: 12px; min-width: 0; }
.key-type-icon { font-size: 12px; }
.key-folder-icon { font-size: 12px; }
.key-count { font-size: 10px; color: var(--text-quaternary); margin-left: 4px; }
.key-empty, .key-loading {
  text-align: center;
  margin: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.56);
}

.key-list-footer {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.62);
}

/* Key detail */
.key-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  min-height: 0;
}
.key-detail-empty { align-items: center; justify-content: center; gap: 12px; color: var(--text-quaternary); margin: 18px; border: 1px dashed rgba(60, 40, 20, 0.08); border-radius: 18px; background: rgba(255,255,255,0.48); }
.key-detail-empty p { margin: 0; }

.detail-header {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
  background: rgba(255,255,255,0.62);
}
.detail-key-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  word-break: break-all;
}
.key-type-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
}
.type-string { background: rgba(103, 194, 58, 0.12); color: var(--color-green, var(--el-color-success)); }
.type-hash { background: rgba(64, 158, 255, 0.12); color: var(--accent-blue, var(--accent-blue)); }
.type-list { background: rgba(230, 162, 60, 0.12); color: var(--color-orange, var(--el-color-warning)); }
.type-set { background: rgba(245, 108, 108, 0.12); color: var(--color-red, var(--el-color-danger)); }
.type-zset { background: rgba(191, 90, 242, 0.12); color: var(--color-purple, #bf5af2); }
.type-stream { background: rgba(100, 210, 255, 0.12); color: var(--color-teal, #64d2ff); }
.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}
.detail-meta :deep(.el-button) { --el-button-border-radius: 10px; }

.detail-body { flex: 1; overflow-y: auto; padding: 16px 18px 18px; }
.detail-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.detail-toolbar :deep(.el-button) { --el-button-border-radius: 10px; }

.value-editor :deep(.el-textarea__inner) {
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  border-radius: 14px;
}
.hash-value { font-family: 'Cascadia Code', Consolas, monospace; font-size: 12px; word-break: break-all; }
.raw-value {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  background: rgba(60, 40, 20, 0.04);
  border: 1px solid rgba(60, 40, 20, 0.06);
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-secondary);
}

/* CLI */
.cli-tab { background: #1e1e2e; color: var(--el-text-color-regular); }
.cli-output { flex: 1; overflow-y: auto; padding: 12px 16px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 13px; }
.cli-entry { margin-bottom: 8px; }
.cli-cmd { color: #89b4fa; }
.cli-prompt { color: #a6e3a1; margin-right: 8px; }
.cli-result pre { margin: 4px 0 0; white-space: pre-wrap; word-break: break-all; }
.cli-string { color: #a6e3a1; }
.cli-integer { color: #89b4fa; }
.cli-nil { color: #6c7086; }
.cli-error { color: #f38ba8; }
.cli-status { color: #a6e3a1; }
.cli-array { color: var(--el-text-color-regular); }

.cli-input-area {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #313244;
  background: #181825;
}
.cli-prompt-input { color: #a6e3a1; font-family: 'Cascadia Code', Consolas, monospace; font-size: 13px; margin-right: 8px; white-space: nowrap; }
.cli-input { flex: 1; }
.cli-input :deep(.el-input__wrapper) { background: transparent; box-shadow: none; }
.cli-input :deep(.el-input__inner) { color: var(--el-text-color-regular); font-family: 'Cascadia Code', Consolas, monospace; font-size: 13px; }

/* Server info */
.info-tab { overflow-y: auto; padding: 16px; background: transparent; }
.info-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
.info-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(60, 40, 20, 0.08);
  box-shadow: 0 8px 24px rgba(60, 40, 20,0.04);
}
.info-card-title { font-size: 11px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; }
.info-card-value { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-top: 6px; font-variant-numeric: tabular-nums; }

.info-raw { margin-top: 12px; }
.info-section { display: flex; flex-direction: column; gap: 4px; }
.info-row { display: flex; gap: 12px; font-size: 12px; padding: 3px 0; }
.info-key { color: var(--text-tertiary); min-width: 200px; font-family: 'Cascadia Code', Consolas, monospace; }
.info-val { color: var(--text-primary); font-family: 'Cascadia Code', Consolas, monospace; word-break: break-all; }
.info-empty {
  text-align: center;
  padding: 48px;
  color: var(--text-quaternary);
  font-size: 14px;
  margin: 12px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.56);
}

/* Status bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  margin: 0 18px 18px 254px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: none;
  font-size: 11px;
  color: var(--text-tertiary);
  height: 30px;
  flex-shrink: 0;
  border-radius: 0 0 18px 18px;
}
.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-quaternary); margin-right: 6px; }
.status-dot.connected { background: var(--color-green, var(--el-color-success)); box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.14); }
.status-right { margin-left: auto; }

/* Context menu */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(60, 40, 20,0.14);
  padding: 4px 0;
  min-width: 150px;
  backdrop-filter: blur(16px);
}
.ctx-item { padding: 7px 16px; font-size: 13px; color: var(--text-primary); cursor: pointer; }
.ctx-item:hover { background: rgba(60, 40, 20, 0.05); }
.ctx-danger { color: var(--color-red, var(--el-color-danger)); }

.conn-list::-webkit-scrollbar,
.key-tree-wrapper::-webkit-scrollbar,
.detail-body::-webkit-scrollbar,
.info-tab::-webkit-scrollbar,
.cli-output::-webkit-scrollbar { width: 5px; }
.conn-list::-webkit-scrollbar-thumb,
.key-tree-wrapper::-webkit-scrollbar-thumb,
.detail-body::-webkit-scrollbar-thumb,
.info-tab::-webkit-scrollbar-thumb,
.cli-output::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 3px; }

@media (max-width: 1180px) {
  .main-body { padding: 0; }
  .left-panel { width: 220px; }
  .key-list-panel { width: 260px; }
  .status-bar { margin: 0 14px 14px 234px; }
}

@media (max-width: 980px) {
  .main-body { flex-direction: column; gap: 14px; padding-bottom: 14px; }
  .left-panel {
    width: 100%;
    border-right: 1px solid rgba(60, 40, 20, 0.08);
    border-radius: 18px;
    max-height: 240px;
  }
  .right-area {
    border-radius: 18px;
  }
  .key-browser { flex-direction: column; }
  .key-list-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(60, 40, 20, 0.08);
    max-height: 280px;
  }
  .status-bar { margin: 0 14px 14px; border-top: 1px solid rgba(60, 40, 20, 0.08); border-radius: 18px; }
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
  .detail-meta { gap: 8px; }
}</style>
