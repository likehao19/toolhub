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
            <span>{{ t('websocketTest.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-section">
          <div class="panel-title">{{ t('websocketTest.connectionConfig') }}</div>
          <div class="url-row">
            <el-input v-model="url" :placeholder="t('websocketTest.urlPlaceholder')" size="small" class="url-input" />
            <el-button v-if="!ws" type="primary" :loading="connecting" size="small" @click="connect">
              <el-icon style="margin-right: 6px;"><Connection /></el-icon>{{ t('websocketTest.connect') }}
            </el-button>
            <el-button v-else type="danger" size="small" @click="disconnect">
              <el-icon style="margin-right: 6px;"><Close /></el-icon>{{ t('websocketTest.disconnect') }}
            </el-button>
          </div>
        </div>

        <div class="panel-section composer-section">
          <div class="panel-title">{{ t('websocketTest.sendMessage') }}</div>
          <el-input
            v-model="message"
            type="textarea"
            class="composer-input"
            :placeholder="t('websocketTest.contentPlaceholder')"
            resize="none"
          />
          <div class="quick-actions">
            <el-button type="primary" size="small" :disabled="!ws" @click="sendMessage">
              <el-icon style="margin-right: 6px;"><Promotion /></el-icon>{{ t('websocketTest.send') }}
            </el-button>
            <el-button size="small" :disabled="!ws" @click="sendJsonMessage">
              <el-icon style="margin-right: 6px;"><Document /></el-icon>{{ t('websocketTest.sendJson') }}
            </el-button>
            <el-button size="small" :disabled="!ws" @click="sendHeartbeat">
              <el-icon style="margin-right: 6px;"><Bell /></el-icon>{{ t('websocketTest.heartbeat') }}
            </el-button>
          </div>
        </div>
      </aside>

      <section class="result-panel">
        <div class="result-toolbar">
          <div class="status-row">
            <el-tag :type="ws ? 'success' : 'info'">{{ ws ? t('websocketTest.connected') : t('websocketTest.disconnected') }}</el-tag>
            <span class="hint">{{ url || t('websocketTest.enterUrlHint') }}</span>
          </div>
          <div class="log-meta">
            <span class="log-count">{{ messages.length }}</span>
            <span class="log-label">{{ t('websocketTest.logCount') }}</span>
            <el-button text size="small" @click="clearMessages" :title="t('websocketTest.clearLog')">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>

        <div class="log-list">
          <div v-for="(item, index) in messages" :key="index" class="log-item" :class="item.type">
            <span class="time">{{ item.time }}</span>
            <span class="content">{{ item.content }}</span>
          </div>
          <div v-if="messages.length === 0" class="empty-hint">{{ t('websocketTest.emptyLog') }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Delete, Close, Promotion, Document, Bell } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { TauriWebSocket } from '@/utils/tauri'

const router = useRouter()
const url = ref('')
const message = ref('')
const connecting = ref(false)
const ws = ref(null)
const messages = ref([])
let removeListener = null

function addMessage(type, content) {
  messages.value.push({ type, content, time: new Date().toLocaleTimeString() })
}

async function connect() {
  if (!url.value.trim()) {
    ElMessage.warning(t('websocketTest.enterUrl'))
    return
  }

  connecting.value = true
  try {
    const socket = await TauriWebSocket.connect(url.value.trim())
    ws.value = socket

    removeListener = socket.addListener((msg) => {
      if (msg.type === 'Text') addMessage('received', t('websocketTest.received', { data: msg.data }))
      else if (msg.type === 'Binary') addMessage('received', t('websocketTest.receivedBinary', { bytes: msg.data.length }))
      else if (msg.type === 'Close') {
        addMessage('system', t('websocketTest.closed'))
        ws.value = null
      } else if (msg.type === 'Ping') {
        addMessage('system', t('websocketTest.receivedPing'))
      } else if (msg.type === 'Pong') {
        addMessage('system', t('websocketTest.receivedPong'))
      } else {
        addMessage('system', t('websocketTest.event', { type: msg.type }))
      }
    })

    addMessage('system', t('websocketTest.connectSuccess'))
  } catch (error) {
    ElMessage.error(error?.message || String(error))
    addMessage('error', t('websocketTest.connectFailed', { error: error?.message || String(error) }))
  } finally {
    connecting.value = false
  }
}

async function disconnect() {
  if (!ws.value) return

  try {
    await ws.value.disconnect()
    addMessage('system', t('websocketTest.disconnectedNotice'))
  } catch (error) {
    ElMessage.error(error?.message || String(error))
  } finally {
    if (removeListener) {
      removeListener()
      removeListener = null
    }
    ws.value = null
  }
}

async function sendPayload(payload, label = payload) {
  if (!ws.value) {
    ElMessage.warning(t('websocketTest.enterWs'))
    return false
  }

  if (!payload.trim()) {
    ElMessage.warning(t('websocketTest.enterContent'))
    return false
  }

  try {
    await ws.value.send(payload)
    addMessage('sent', t('websocketTest.sent', { data: label }))
    return true
  } catch (error) {
    ElMessage.error(error?.message || String(error))
    addMessage('error', t('websocketTest.sendFailed', { error: error?.message || String(error) }))
    return false
  }
}

async function sendMessage() {
  const payload = message.value.trim()
  const sent = await sendPayload(payload)
  if (sent) message.value = ''
}

async function sendJsonMessage() {
  if (!message.value.trim()) {
    ElMessage.warning(t('websocketTest.enterJson'))
    return
  }

  try {
    const formatted = JSON.stringify(JSON.parse(message.value), null, 2)
    const sent = await sendPayload(formatted, formatted)
    if (sent) message.value = formatted
  } catch {
    ElMessage.error(t('websocketTest.invalidJson'))
  }
}

async function sendHeartbeat() {
  const payload = JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })
  await sendPayload(payload, payload)
}

function clearMessages() {
  messages.value = []
}

onUnmounted(() => {
  if (ws.value) disconnect()
})
</script>

<style scoped>
.network-tool-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  min-height: 52px;
  box-sizing: border-box;
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
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); }

.content-area {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
}

/* 左侧配置：分段布局，区段之间用分割线 */
.config-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-section {
  display: flex;
  flex-direction: column;
  padding: 14px 18px;
  gap: 10px;
  flex-shrink: 0;
}

.panel-section + .panel-section {
  border-top: 1px solid rgba(60, 40, 20, 0.08);
}

.composer-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* URL 行：输入与按钮同行 */
.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.url-input { flex: 1; min-width: 0; }
.url-row :deep(.el-button) { flex-shrink: 0; min-width: 64px; }

/* Composer：textarea 撑满剩余高度 */
.composer-input {
  flex: 1;
  min-height: 0;
  display: flex;
}
.composer-input :deep(.el-textarea) {
  flex: 1;
  display: flex;
  height: 100%;
}
.composer-input :deep(.el-textarea__inner) {
  flex: 1;
  height: 100% !important;
  min-height: 120px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  line-height: 1.55;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

/* 右侧结果区 */
.result-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  padding: 8px 18px;
  flex-shrink: 0;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hint {
  font-size: 12.5px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.log-count {
  min-width: 24px;
  padding: 1px 6px;
  text-align: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(60, 40, 20, 0.06);
  font-variant-numeric: tabular-nums;
}

.log-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.log-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.log-item {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  font-size: 12.5px;
}

.log-item.sent { background: rgba(64, 158, 255, 0.05); }
.log-item.received { background: rgba(103, 194, 58, 0.06); }
.log-item.error { background: rgba(245, 108, 108, 0.06); }
.log-item.system { background: rgba(148, 163, 184, 0.05); }

.time {
  color: var(--text-tertiary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11.5px;
}

.content {
  color: var(--text-primary);
  word-break: break-word;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', monospace;
}

.empty-hint {
  height: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  font-size: 13px;
}

@media (max-width: 1100px) {
  .content-area { grid-template-columns: 1fr; }
  .config-panel {
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    max-height: 320px;
  }
  .composer-input :deep(.el-textarea__inner) { min-height: 80px; }
}
</style>
