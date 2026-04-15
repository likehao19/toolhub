<template>
  <div class="ssh-terminal-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Network Tools</div>
          <div class="breadcrumb">
            <el-icon><Monitor /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('sshTerminal.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="showConnDialog">
          <el-icon><Plus /></el-icon>
          {{ t('sshTerminal.newConnection') }}
        </el-button>
      </div>
    </div>

    <!-- Main body -->
    <div class="main-body">
      <!-- Left panel: Connection manager -->
      <div class="left-panel">
        <div class="panel-title">{{ t('sshTerminal.connections') }}</div>
        <div class="conn-list">
          <div
            v-for="conn in savedConnections"
            :key="conn.id"
            class="conn-item"
            :class="{ active: isConnected(conn.id) }"
            @dblclick="connectTo(conn)"
            @contextmenu.prevent="showContextMenu($event, conn)"
          >
            <span class="conn-dot" :class="{ connected: isConnected(conn.id) }"></span>
            <div class="conn-info">
              <span class="conn-name">{{ conn.name }}</span>
              <span class="conn-host">{{ conn.username }}@{{ conn.host }}:{{ conn.port }}</span>
            </div>
          </div>
          <div v-if="!savedConnections.length" class="conn-empty">
            {{ t('sshTerminal.noConnections') }}
          </div>
        </div>
      </div>

      <!-- Right: Tabs + Terminal -->
      <div class="right-area">
        <!-- Tab bar -->
        <div class="tab-bar" v-if="tabs.length > 0">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTabId === tab.id }"
            @click="switchTab(tab.id)"
          >
            <el-icon v-if="tab.type === 'terminal'"><Monitor /></el-icon>
            <el-icon v-else><FolderOpened /></el-icon>
            <span class="tab-title">{{ tab.title }}</span>
            <span class="tab-close" @click.stop="closeTab(tab.id)">&times;</span>
          </div>
        </div>

        <!-- Terminal containers (每个终端 tab 独立容器) -->
        <div
          v-for="tab in tabs.filter(tb => tb.type === 'terminal')"
          :key="tab.id"
          class="terminal-area"
          v-show="activeTabId === tab.id"
        >
          <div :ref="el => setTermRef(tab.id, el)" class="xterm-container"></div>
        </div>

        <!-- SFTP content -->
        <div class="sftp-area" v-if="activeTab?.type === 'sftp'">
          <div class="sftp-toolbar">
            <el-input v-model="currentSftpPath" size="small" @keyup.enter="loadSftpDir" style="flex:1">
              <template #prefix><el-icon><FolderOpened /></el-icon></template>
            </el-input>
            <el-button size="small" @click="loadSftpDir"><el-icon><Refresh /></el-icon></el-button>
            <el-button size="small" @click="sftpUpload"><el-icon><Upload /></el-icon> {{ t('sshTerminal.upload') }}</el-button>
          </div>
          <div class="sftp-file-list">
            <div class="sftp-item sftp-parent" @dblclick="sftpGoUp" v-if="currentSftpPath !== '/'">
              <el-icon><Back /></el-icon>
              <span>..</span>
            </div>
            <div
              v-for="item in currentSftpEntries"
              :key="item.path"
              class="sftp-item"
              :class="{ 'is-dir': item.isDir }"
              @dblclick="sftpOpen(item)"
              @contextmenu.prevent="sftpContextMenu($event, item)"
            >
              <el-icon v-if="item.isDir"><Folder /></el-icon>
              <el-icon v-else><Document /></el-icon>
              <span class="sftp-name">{{ item.name }}</span>
              <span class="sftp-size">{{ item.isDir ? '' : formatFileSize(item.size) }}</span>
              <span class="sftp-perm">{{ item.permissions || '' }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="tabs.length === 0">
          <el-icon :size="48"><Monitor /></el-icon>
          <div class="empty-text">{{ t('sshTerminal.emptyHint') }}</div>
          <el-button type="primary" size="small" @click="showConnDialog" style="margin-top:12px">
            <el-icon><Plus /></el-icon> {{ t('sshTerminal.newConnection') }}
          </el-button>
        </div>

        <!-- Status bar -->
        <div class="status-bar" v-if="activeTab">
          <span>{{ activeTab.title }}</span>
          <span v-if="activeTab.type === 'terminal'">{{ termSize }}</span>
          <div class="status-actions">
            <el-button v-if="activeTab.connId" size="small" text @click="openSftp(activeTab.connId)">
              <el-icon><FolderOpened /></el-icon> SFTP
            </el-button>
            <el-button v-if="activeTab.type === 'terminal'" size="small" text @click="historyPanelOpen = !historyPanelOpen; if (historyPanelOpen) aiPanelOpen = false">
              <el-icon><Clock /></el-icon> 历史
            </el-button>
            <el-button v-if="activeTab.type === 'terminal'" size="small" text @click="aiPanelOpen = !aiPanelOpen; if (aiPanelOpen) historyPanelOpen = false">
              <el-icon><ChatDotRound /></el-icon> AI
            </el-button>
          </div>
        </div>

        <!-- 命令历史面板 -->
        <div class="bottom-panel" v-if="historyPanelOpen">
          <div class="panel-header">
            <span>命令历史</span>
            <el-input v-model="historyFilter" placeholder="搜索..." size="small" clearable style="width:180px" :prefix-icon="Search" />
            <span class="panel-close" @click="historyPanelOpen = false">&times;</span>
          </div>
          <div class="panel-body">
            <div v-for="(h, i) in filteredHistory" :key="i" class="history-item" @click="insertToTerminal(h.cmd)">
              <span class="history-cmd">{{ h.cmd }}</span>
              <span class="history-time">{{ new Date(h.time).toLocaleTimeString() }}</span>
            </div>
            <div v-if="!filteredHistory.length" class="panel-empty">暂无历史记录</div>
          </div>
        </div>

        <!-- AI 命令助手面板 -->
        <div class="bottom-panel" v-if="aiPanelOpen">
          <div class="panel-header">
            <span>AI 命令助手</span>
            <span class="panel-close" @click="aiPanelOpen = false">&times;</span>
          </div>
          <div class="panel-body ai-panel">
            <div class="ai-input-row">
              <el-input v-model="aiQuery" placeholder="描述你想执行的操作，如：查看磁盘使用情况" size="small" @keyup.enter="askAI" clearable />
              <el-button type="primary" size="small" @click="askAI" :loading="aiLoading">查询</el-button>
            </div>
            <div v-if="aiAnswer" class="ai-result">
              <div class="ai-md" v-html="marked(aiAnswer)"></div>
              <el-button size="small" type="success" @click="insertAICommand" style="margin-top:8px">插入到终端</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 连接右键菜单 -->
    <div v-if="contextMenu.visible" class="ctx-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
      <div class="ctx-item" @click="ctxConnect"><el-icon><Connection /></el-icon>连接</div>
      <div class="ctx-item" @click="ctxEdit"><el-icon><EditIcon /></el-icon>{{ t('sshTerminal.editConnection') }}</div>
      <div class="ctx-item ctx-danger" @click="ctxDelete"><el-icon><Delete /></el-icon>删除</div>
    </div>

    <!-- SFTP 右键菜单 -->
    <div v-if="sftpCtxMenu.visible" class="ctx-menu" :style="{ left: sftpCtxMenu.x + 'px', top: sftpCtxMenu.y + 'px' }">
      <div class="ctx-item" @click="sftpDownload" v-if="!sftpCtxMenu.item?.isDir"><el-icon><Download /></el-icon>下载</div>
      <div class="ctx-item" @click="sftpRename"><el-icon><EditIcon /></el-icon>重命名</div>
      <div class="ctx-item ctx-danger" @click="sftpDelete"><el-icon><Delete /></el-icon>删除</div>
    </div>

    <!-- Connection dialog -->
    <el-dialog v-model="connDialogVisible" :title="editingConn ? t('sshTerminal.editConnection') : t('sshTerminal.newConnection')" width="480px" destroy-on-close>
      <el-form :model="connForm" label-width="90px" size="small">
        <el-form-item :label="t('sshTerminal.connName')">
          <el-input v-model="connForm.name" placeholder="My Server" />
        </el-form-item>
        <el-form-item :label="t('sshTerminal.host')">
          <el-input v-model="connForm.host" placeholder="192.168.1.100" />
        </el-form-item>
        <el-form-item :label="t('sshTerminal.port')">
          <el-input-number v-model="connForm.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item :label="t('sshTerminal.username')">
          <el-input v-model="connForm.username" placeholder="root" />
        </el-form-item>
        <el-form-item :label="t('sshTerminal.authType')">
          <el-radio-group v-model="connForm.authType">
            <el-radio value="password">{{ t('sshTerminal.password') }}</el-radio>
            <el-radio value="key">{{ t('sshTerminal.privateKey') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="connForm.authType === 'password'" :label="t('sshTerminal.password')">
          <el-input v-model="connForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item v-if="connForm.authType === 'key'" :label="t('sshTerminal.keyFile')">
          <div class="dir-input-row">
            <el-input v-model="connForm.keyPath" placeholder="~/.ssh/id_rsa" />
            <el-button @click="selectKeyFile">{{ t('sshTerminal.browse') }}</el-button>
          </div>
        </el-form-item>
        <el-form-item v-if="connForm.authType === 'key'" :label="t('sshTerminal.passphrase')">
          <el-input v-model="connForm.passphrase" type="password" show-password :placeholder="t('sshTerminal.optional')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="connDialogVisible = false">{{ t('sshTerminal.cancel') }}</el-button>
        <el-button type="primary" @click="saveConnection">{{ t('sshTerminal.save') }}</el-button>
        <el-button type="success" @click="saveAndConnect">{{ t('sshTerminal.saveAndConnect') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor, Plus, FolderOpened, Refresh, Upload, Back, Folder, Document, Edit as EditIcon, Delete, Connection, Download, Search, Clock, ChatDotRound } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { chatWithAI } from '@/services/aiService'
import { marked } from 'marked'

const router = useRouter()

// === State ===
const savedConnections = ref([])
const tabs = ref([])
const activeTabId = ref('')
const connDialogVisible = ref(false)
const editingConn = ref(null)
const connForm = ref({ name: '', host: '', port: 22, username: 'root', authType: 'password', password: '', keyPath: '', passphrase: '' })
const termSize = ref('120x36')

// 右键菜单
const contextMenu = ref({ visible: false, x: 0, y: 0, conn: null })

// SFTP 状态按 tab 隔离（不再用全局 ref）
const currentSftpPath = computed({
  get: () => activeTab.value?.sftpPath || '/',
  set: (v) => { if (activeTab.value) activeTab.value.sftpPath = v },
})
const currentSftpEntries = computed(() => activeTab.value?.sftpEntries || [])

// Terminal instances: { [tabId]: { terminal, fitAddon, unlisten, resizeHandler } }
const terminals = {}
const termRefs = {}
let storeLoaded = false

// 命令历史
const commandHistory = ref([])
const historyPanelOpen = ref(false)
const historyFilter = ref('')
const filteredHistory = computed(() => {
  const kw = historyFilter.value.toLowerCase()
  const list = kw ? commandHistory.value.filter(h => h.cmd.toLowerCase().includes(kw)) : commandHistory.value
  return list.slice(-200).reverse()
})

// AI 命令助手
const aiPanelOpen = ref(false)
const aiQuery = ref('')
const aiAnswer = ref('')
const aiLoading = ref(false)

// 命令行缓冲（用于收集用户输入直到回车）
const cmdBuffers = {}

function setTermRef(tabId, el) {
  if (el) termRefs[tabId] = el
}

const activeTab = computed(() => tabs.value.find(tb => tb.id === activeTabId.value))

// === Connection management ===
async function loadConnections() {
  try {
    const { load } = await import('@tauri-apps/plugin-store')
    const store = await load('ssh-connections.json', { autoSave: true })
    const data = await store.get('connections')
    if (Array.isArray(data)) {
      // 解密密码字段
      for (const c of data) {
        if (c._encrypted) {
          try {
            if (c.password) c.password = await invoke('decrypt_credential', { ciphertext: c.password })
            if (c.passphrase) c.passphrase = await invoke('decrypt_credential', { ciphertext: c.passphrase })
          } catch { /* 解密失败保留原值 */ }
        }
      }
      savedConnections.value = data
    }
    // 加载命令历史
    const hist = await store.get('commandHistory')
    if (Array.isArray(hist)) commandHistory.value = hist
    storeLoaded = true
  } catch { /* ignore */ }
}

async function persistConnections() {
  try {
    const { load } = await import('@tauri-apps/plugin-store')
    const store = await load('ssh-connections.json', { autoSave: true })
    // 加密密码字段后存储
    const encrypted = []
    for (const c of savedConnections.value) {
      const copy = { ...c, _encrypted: true }
      if (copy.password) copy.password = await invoke('encrypt_credential', { plaintext: copy.password })
      if (copy.passphrase) copy.passphrase = await invoke('encrypt_credential', { plaintext: copy.passphrase })
      encrypted.push(copy)
    }
    await store.set('connections', encrypted)
    await store.save()
  } catch { /* ignore */ }
}

function showConnDialog() {
  editingConn.value = null
  connForm.value = { name: '', host: '', port: 22, username: 'root', authType: 'password', password: '', keyPath: '', passphrase: '' }
  connDialogVisible.value = true
}

async function selectKeyFile() {
  const path = await openDialog({
    filters: [{ name: 'Key Files', extensions: ['pem', 'key', 'ppk', '*'] }],
    title: t('sshTerminal.selectKeyFile'),
  })
  if (path) connForm.value.keyPath = path
}

function saveConnection() {
  if (!connForm.value.name || !connForm.value.host) {
    ElMessage.warning(t('sshTerminal.fillRequired'))
    return false
  }
  if (editingConn.value) {
    const idx = savedConnections.value.findIndex(c => c.id === editingConn.value.id)
    if (idx >= 0) savedConnections.value[idx] = { ...connForm.value, id: editingConn.value.id }
  } else {
    savedConnections.value.push({ ...connForm.value, id: crypto.randomUUID() })
  }
  persistConnections()
  connDialogVisible.value = false
  ElMessage.success(t('sshTerminal.saved'))
  return true
}

async function saveAndConnect() {
  if (!saveConnection()) return
  const conn = editingConn.value
    ? savedConnections.value.find(c => c.id === editingConn.value.id)
    : savedConnections.value[savedConnections.value.length - 1]
  if (conn) await connectTo(conn)
}

function isConnected(connId) {
  return tabs.value.some(tb => tb.connId === connId && tb.type === 'terminal')
}

function showContextMenu(event, conn) {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, conn }
}

function ctxConnect() {
  if (contextMenu.value.conn) connectTo(contextMenu.value.conn)
  contextMenu.value.visible = false
}

function ctxEdit() {
  if (contextMenu.value.conn) {
    editingConn.value = contextMenu.value.conn
    connForm.value = { ...contextMenu.value.conn }
    connDialogVisible.value = true
  }
  contextMenu.value.visible = false
}

function ctxDelete() {
  const conn = contextMenu.value.conn
  contextMenu.value.visible = false
  if (!conn) return
  ElMessageBox.confirm(t('sshTerminal.deleteConfirm'), t('sshTerminal.deleteTitle'), { type: 'warning' })
    .then(() => {
      savedConnections.value = savedConnections.value.filter(c => c.id !== conn.id)
      persistConnections()
    })
    .catch(() => {})
}

// === Terminal ===
async function connectTo(conn) {
  const tabId = `term-${conn.id}-${Date.now()}`

  tabs.value.push({
    id: tabId,
    connId: conn.id,
    type: 'terminal',
    title: conn.name || `${conn.host}:${conn.port}`,
  })
  activeTabId.value = tabId

  await nextTick()
  await initTerminal(tabId, conn)
}

async function initTerminal(tabId, conn) {
  const container = termRefs[tabId]
  if (!container) return

  const terminal = new Terminal({
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    theme: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selectionBackground: '#585b7066',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#f5c2e7',
      cyan: '#94e2d5',
      white: '#bac2de',
    },
    cursorBlink: true,
    scrollback: 10000,
    allowProposedApi: true,
  })

  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(webLinksAddon)
  terminal.open(container)
  fitAddon.fit()

  const cols = terminal.cols
  const rows = terminal.rows
  termSize.value = `${cols}x${rows}`

  // 连接 SSH
  terminal.writeln(`\x1b[33m连接 ${conn.username}@${conn.host}:${conn.port} ...\x1b[0m`)

  // 监听主机密钥确认
  const unlistenHostKey = await listen(`ssh-hostkey-verify-${tabId}`, async (event) => {
    const { fingerprint, hostPort, isNew, oldFingerprint } = event.payload
    const title = isNew ? '新主机密钥确认' : '⚠ 主机密钥变更警告'
    const msg = isNew
      ? `首次连接 <b>${hostPort}</b><br><br>指纹: <code>${fingerprint}</code><br><br>是否信任此主机？`
      : `<b>${hostPort}</b> 的主机密钥已变更！<br><br>旧指纹: <code>${oldFingerprint}</code><br>新指纹: <code>${fingerprint}</code><br><br><span style="color:#f38ba8">这可能意味着中间人攻击，是否继续？</span>`
    const type = isNew ? 'info' : 'error'
    try {
      await ElMessageBox.confirm(msg, title, { type, confirmButtonText: '信任', cancelButtonText: '拒绝', dangerouslyUseHTMLString: true })
      await invoke('ssh_host_key_response', { id: tabId, accepted: true, fingerprint, hostPort })
    } catch {
      await invoke('ssh_host_key_response', { id: tabId, accepted: false, fingerprint, hostPort })
    }
  })

  try {
    const result = await invoke('ssh_connect', {
      id: tabId,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authType: conn.authType,
      password: conn.password || null,
      keyPath: conn.keyPath || null,
      passphrase: conn.passphrase || null,
      cols,
      rows,
    })

    if (!result.success) {
      terminal.writeln(`\x1b[31m${result.message}\x1b[0m`)
      unlistenHostKey()
      return
    }

    terminal.writeln(`\x1b[32m${result.message}\x1b[0m\r\n`)
  } catch (e) {
    terminal.writeln(`\x1b[31m连接失败: ${e}\x1b[0m`)
    unlistenHostKey()
    return
  }

  // 监听 SSH 输出 (base64 编码, 保留二进制完整性)
  const unlisten = await listen(`ssh-data-${tabId}`, (event) => {
    const binary = atob(event.payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    terminal.write(bytes)
  })

  // 监听终端输入 → 写入 SSH + 收集命令历史
  cmdBuffers[tabId] = ''
  terminal.onData((data) => {
    invoke('ssh_write', { id: tabId, data }).catch(() => {})
    // 收集命令历史：回车时记录
    if (data === '\r' || data === '\n') {
      const cmd = cmdBuffers[tabId].trim()
      if (cmd && cmd.length > 1) {
        commandHistory.value.push({ cmd, time: Date.now(), tab: tabId })
        persistHistory()
      }
      cmdBuffers[tabId] = ''
    } else if (data === '\x7f' || data === '\b') {
      cmdBuffers[tabId] = cmdBuffers[tabId].slice(0, -1)
    } else if (data.charCodeAt(0) >= 32 && !data.startsWith('\x1b')) {
      // 单字符或粘贴的多字符文本（排除 ESC 控制序列）
      cmdBuffers[tabId] += data
    }
  })

  // 监听终端大小变化
  terminal.onResize(({ cols, rows }) => {
    termSize.value = `${cols}x${rows}`
    invoke('ssh_resize', { id: tabId, cols, rows }).catch(() => {})
  })

  // 窗口 resize
  const resizeHandler = () => fitAddon.fit()
  window.addEventListener('resize', resizeHandler)

  // 容器大小变化（侧栏收起/面板拖动等场景）
  const resizeObserver = new ResizeObserver(() => fitAddon.fit())
  resizeObserver.observe(container)

  // 监听远端断开
  const unlistenClose = await listen(`ssh-closed-${tabId}`, () => {
    terminal.writeln('\r\n\x1b[31m[连接已断开]\x1b[0m')
  })

  terminals[tabId] = { terminal, fitAddon, unlisten, unlistenClose, unlistenHostKey, resizeHandler, resizeObserver }

  // 连接成功后自动 focus
  terminal.focus()
}

function switchTab(tabId) {
  activeTabId.value = tabId
  nextTick(() => {
    if (terminals[tabId]) {
      terminals[tabId].fitAddon.fit()
    }
  })
}

async function closeTab(tabId) {
  try { await invoke('ssh_disconnect', { id: tabId }) } catch { /* ignore */ }
  if (terminals[tabId]) {
    terminals[tabId].terminal.dispose()
    terminals[tabId].unlisten()
    terminals[tabId].unlistenHostKey()
    terminals[tabId].unlistenClose()
    terminals[tabId].resizeObserver.disconnect()
    window.removeEventListener('resize', terminals[tabId].resizeHandler)
    delete terminals[tabId]
  }
  delete termRefs[tabId]
  tabs.value = tabs.value.filter(tb => tb.id !== tabId)
  if (activeTabId.value === tabId) {
    activeTabId.value = tabs.value.length > 0 ? tabs.value[tabs.value.length - 1].id : ''
  }
}

// === SFTP ===
async function openSftp(connId) {
  const conn = savedConnections.value.find(c => c.id === connId)
  if (!conn) return

  const tabId = `sftp-${connId}-${Date.now()}`
  tabs.value.push({
    id: tabId,
    connId: connId,
    type: 'sftp',
    title: `SFTP: ${conn.name}`,
    sshTabId: tabs.value.find(t => t.connId === connId && t.type === 'terminal')?.id,
    sftpPath: '/',
    sftpEntries: [],
  })
  activeTabId.value = tabId
  await nextTick()
  await loadSftpDir()
}

async function loadSftpDir() {
  const tab = activeTab.value
  if (!tab?.sshTabId) return
  try {
    const entries = await invoke('sftp_list', { id: tab.sshTabId, path: tab.sftpPath })
    tab.sftpEntries = entries
  } catch (e) {
    ElMessage.error(String(e))
  }
}

function sftpOpen(item) {
  if (item.isDir) {
    const tab = activeTab.value
    if (tab) tab.sftpPath = item.path
    loadSftpDir()
  }
}

function sftpGoUp() {
  const tab = activeTab.value
  if (!tab) return
  const parts = tab.sftpPath.split('/').filter(Boolean)
  parts.pop()
  tab.sftpPath = '/' + parts.join('/')
  loadSftpDir()
}

async function sftpUpload() {
  const tab = activeTab.value
  if (!tab?.sshTabId) return
  const localPath = await openDialog({ title: t('sshTerminal.selectUploadFile') })
  if (!localPath) return
  const fileName = localPath.split(/[/\\]/).pop()
  const remotePath = tab.sftpPath.endsWith('/') ? tab.sftpPath + fileName : tab.sftpPath + '/' + fileName
  try {
    await invoke('sftp_upload', { id: tab.sshTabId, localPath, remotePath })
    ElMessage.success(t('sshTerminal.uploadDone'))
    loadSftpDir()
  } catch (e) {
    ElMessage.error(String(e))
  }
}

// SFTP 右键菜单
const sftpCtxMenu = ref({ visible: false, x: 0, y: 0, item: null })

function sftpContextMenu(event, item) {
  sftpCtxMenu.value = { visible: true, x: event.clientX, y: event.clientY, item }
}

async function sftpDownload() {
  const item = sftpCtxMenu.value.item
  sftpCtxMenu.value.visible = false
  if (!item) return
  const tab = activeTab.value
  if (!tab?.sshTabId) return
  const localPath = await saveDialog({ defaultPath: item.name })
  if (!localPath) return
  try {
    await invoke('sftp_download', { id: tab.sshTabId, remotePath: item.path, localPath })
    ElMessage.success('下载完成')
  } catch (e) {
    ElMessage.error(String(e))
  }
}

async function sftpDelete() {
  const item = sftpCtxMenu.value.item
  sftpCtxMenu.value.visible = false
  if (!item) return
  const tab = activeTab.value
  if (!tab?.sshTabId) return
  try {
    await ElMessageBox.confirm(`确定删除 ${item.name}？`, '删除确认', { type: 'warning' })
    await invoke('sftp_remove', { id: tab.sshTabId, path: item.path, isDir: item.isDir })
    ElMessage.success('已删除')
    loadSftpDir()
  } catch { /* cancelled or error */ }
}

async function sftpRename() {
  const item = sftpCtxMenu.value.item
  sftpCtxMenu.value.visible = false
  if (!item) return
  const tab = activeTab.value
  if (!tab?.sshTabId) return
  try {
    const { value: newName } = await ElMessageBox.prompt('输入新名称', '重命名', { inputValue: item.name })
    if (!newName || newName === item.name) return
    const parentDir = item.path.substring(0, item.path.lastIndexOf('/') + 1)
    await invoke('sftp_rename', { id: tab.sshTabId, oldPath: item.path, newPath: parentDir + newName })
    ElMessage.success('重命名完成')
    loadSftpDir()
  } catch { /* cancelled or error */ }
}

// === 命令历史持久化 ===
async function persistHistory() {
  try {
    const { load } = await import('@tauri-apps/plugin-store')
    const store = await load('ssh-connections.json', { autoSave: true })
    await store.set('commandHistory', commandHistory.value.slice(-500))
    await store.save()
  } catch { /* ignore */ }
}

function insertToTerminal(cmd) {
  const tab = activeTab.value
  if (!tab || tab.type !== 'terminal') return
  const t = terminals[tab.id]
  if (t) {
    invoke('ssh_write', { id: tab.id, data: cmd }).catch(() => {})
    t.terminal.focus()
  }
  historyPanelOpen.value = false
}

// === AI 命令助手 ===
async function askAI() {
  if (!aiQuery.value.trim() || aiLoading.value) return
  aiLoading.value = true
  aiAnswer.value = ''
  try {
    const messages = [
      { role: 'system', content: '你是一个 Linux/SSH 命令助手。用户描述想做的操作，你返回对应的命令。格式要求：先给出命令（用 ```bash 代码块包裹），再用一句话简要说明。只回答命令相关内容，不要多余废话。' },
      { role: 'user', content: aiQuery.value }
    ]
    const result = await chatWithAI(messages, { max_tokens: 500, temperature: 0.3 })
    aiAnswer.value = result
  } catch (e) {
    aiAnswer.value = `查询失败: ${e.message || e}`
  } finally {
    aiLoading.value = false
  }
}

function insertAICommand() {
  // 从 AI 回答中提取代码块里的命令
  const match = aiAnswer.value.match(/```(?:bash|shell|sh)?\s*\n([\s\S]*?)```/)
  if (match) {
    insertToTerminal(match[1].trim())
    aiPanelOpen.value = false
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

// === Lifecycle ===
const closeMenus = () => {
  contextMenu.value.visible = false
  sftpCtxMenu.value.visible = false
}

onMounted(() => {
  loadConnections()
  document.addEventListener('click', closeMenus)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  // 清理所有终端并断开 SSH
  for (const tabId of Object.keys(terminals)) {
    invoke('ssh_disconnect', { id: tabId }).catch(() => {})
    terminals[tabId].terminal.dispose()
    terminals[tabId].unlisten()
    terminals[tabId].unlistenHostKey()
    terminals[tabId].unlistenClose()
    terminals[tabId].resizeObserver.disconnect()
    window.removeEventListener('resize', terminals[tabId].resizeHandler)
    delete cmdBuffers[tabId]
  }
})
</script>

<style scoped>
.ssh-terminal-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #1a1b26;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(30,30,46,0.95), rgba(24,24,37,0.9));
  border-bottom: 1px solid rgba(255,255,255,0.06);
  min-height: 52px;
  backdrop-filter: blur(12px);
}
.header-left { display: flex; align-items: center; flex: 1; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; }
.page-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(205,214,244,0.4); }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #cdd6f4; }
.breadcrumb .el-icon { font-size: 15px; color: #89b4fa; }
.breadcrumb-link { cursor: pointer; color: rgba(205,214,244,0.6); transition: color .2s; }
.breadcrumb-link:hover { color: #89b4fa; }
.breadcrumb-sep { color: rgba(205,214,244,0.3); }
.header-actions { display: flex; gap: 8px; }

/* Main body */
.main-body { flex: 1; display: flex; min-height: 0; }

/* Left panel */
.left-panel {
  width: 220px;
  background: rgba(30,30,46,0.7);
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-title {
  padding: 12px 14px 8px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(205,214,244,0.5);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.conn-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
.conn-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;
  margin-bottom: 2px;
}
.conn-item:hover { background: rgba(137,180,250,0.08); }
.conn-item.active { background: rgba(137,180,250,0.12); }
.conn-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #585b70;
  flex-shrink: 0;
  transition: background .2s;
}
.conn-dot.connected { background: #a6e3a1; box-shadow: 0 0 6px rgba(166,227,161,0.4); }
.conn-info { min-width: 0; }
.conn-name { display: block; font-size: 12px; font-weight: 500; color: #cdd6f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conn-host { display: block; font-size: 10px; color: rgba(205,214,244,0.4); }
.conn-empty { padding: 20px 10px; font-size: 12px; color: rgba(205,214,244,0.3); text-align: center; }

/* Right area */
.right-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }

/* Tab bar */
.tab-bar {
  display: flex;
  background: rgba(24,24,37,0.8);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  color: rgba(205,214,244,0.5);
  cursor: pointer;
  border-right: 1px solid rgba(255,255,255,0.04);
  white-space: nowrap;
  transition: background .15s, color .15s;
  user-select: none;
}
.tab:hover { background: rgba(137,180,250,0.06); color: #cdd6f4; }
.tab.active { background: rgba(30,30,46,0.6); color: #cdd6f4; border-bottom: 2px solid #89b4fa; }
.tab-close {
  font-size: 14px;
  width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  opacity: 0;
  transition: opacity .15s, background .15s;
}
.tab:hover .tab-close { opacity: 1; }
.tab-close:hover { background: rgba(243,139,168,0.2); color: #f38ba8; }

/* Terminal */
.terminal-area { flex: 1; min-height: 0; padding: 4px; background: #1e1e2e; }
.xterm-container { height: 100%; width: 100%; }

/* SFTP */
.sftp-area { flex: 1; display: flex; flex-direction: column; min-height: 0; background: #1e1e2e; padding: 12px; }
.sftp-toolbar { display: flex; gap: 8px; margin-bottom: 10px; }
.sftp-file-list { flex: 1; overflow-y: auto; }
.sftp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #cdd6f4;
  transition: background .12s;
}
.sftp-item:hover { background: rgba(137,180,250,0.08); }
.sftp-item.is-dir .sftp-name { color: #89b4fa; }
.sftp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sftp-size { color: rgba(205,214,244,0.4); font-size: 11px; font-variant-numeric: tabular-nums; }
.sftp-perm { color: rgba(205,214,244,0.3); font-size: 10px; font-family: monospace; }
.sftp-parent { color: rgba(205,214,244,0.5); }

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(205,214,244,0.2);
}
.empty-text { font-size: 13px; }

/* Status bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 14px;
  background: rgba(24,24,37,0.9);
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 11px;
  color: rgba(205,214,244,0.4);
}
.status-actions { margin-left: auto; }

/* Dialog */
.dir-input-row { display: flex; gap: 8px; width: 100%; }
.dir-input-row .el-input { flex: 1; }

/* Context menu */
.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(30,30,46,0.96);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  font-size: 12px;
  color: #cdd6f4;
  cursor: pointer;
  transition: background .12s;
}
.ctx-item:hover { background: rgba(137,180,250,0.12); }
.ctx-item.ctx-danger { color: #f38ba8; }
.ctx-item.ctx-danger:hover { background: rgba(243,139,168,0.12); }

/* Bottom panels (history / AI) */
.bottom-panel {
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(24,24,37,0.95);
  max-height: 220px;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(205,214,244,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.panel-close {
  margin-left: auto;
  cursor: pointer;
  font-size: 16px;
  color: rgba(205,214,244,0.4);
  padding: 0 4px;
  border-radius: 4px;
}
.panel-close:hover { color: #f38ba8; background: rgba(243,139,168,0.15); }
.panel-body { flex: 1; overflow-y: auto; padding: 8px 10px; }
.panel-empty { text-align: center; color: rgba(205,214,244,0.25); font-size: 12px; padding: 16px; }

/* History */
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #cdd6f4;
  transition: background .12s;
}
.history-item:hover { background: rgba(137,180,250,0.1); }
.history-cmd { font-family: 'JetBrains Mono', Consolas, monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-time { color: rgba(205,214,244,0.3); font-size: 10px; margin-left: 12px; flex-shrink: 0; }

/* AI panel */
.ai-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
.ai-input-row .el-input { flex: 1; }
.ai-result { background: rgba(30,30,46,0.6); border-radius: 8px; padding: 10px 14px; }
.ai-md { font-size: 12px; color: #cdd6f4; line-height: 1.6; }
.ai-md :deep(code) { background: rgba(137,180,250,0.12); padding: 1px 5px; border-radius: 4px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; }
.ai-md :deep(pre) { background: rgba(30,30,46,0.8); border-radius: 6px; padding: 10px 14px; overflow-x: auto; margin: 6px 0; }
.ai-md :deep(pre code) { background: none; padding: 0; }
</style>
