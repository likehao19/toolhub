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
            <span>WebSocket 测试</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <aside class="config-panel">
        <div class="panel-title">连接配置</div>
        <el-form label-width="72px" size="small">
          <el-form-item label="地址">
            <el-input v-model="url" placeholder="ws:// 或 wss://" />
          </el-form-item>
          <el-form-item>
            <el-button v-if="!ws" type="primary" :loading="connecting" @click="connect">连接</el-button>
            <el-button v-else type="danger" @click="disconnect">断开</el-button>
          </el-form-item>
        </el-form>

        <div class="panel-title composer-title">发送消息</div>
        <el-input
          v-model="message"
          type="textarea"
          :rows="8"
          class="composer-input"
          placeholder="输入要发送的内容"
        />
        <div class="quick-actions">
          <el-button type="primary" :disabled="!ws" @click="sendMessage">发送</el-button>
          <el-button :disabled="!ws" @click="sendJsonMessage">发送 JSON</el-button>
          <el-button :disabled="!ws" @click="sendHeartbeat">发送心跳</el-button>
        </div>
      </aside>

      <section class="result-panel">
        <div class="result-toolbar">
          <div class="status-row">
            <el-tag :type="ws ? 'success' : 'info'">{{ ws ? '已连接' : '未连接' }}</el-tag>
            <span class="hint">{{ url || '请先输入 WebSocket 地址' }}</span>
          </div>
          <div class="log-meta">
            <span class="log-count">{{ messages.length }}</span>
            <span class="log-label">条日志</span>
            <el-button text size="small" @click="clearMessages">清空日志</el-button>
          </div>
        </div>

        <div class="log-list">
          <div v-for="(item, index) in messages" :key="index" class="log-item" :class="item.type">
            <span class="time">{{ item.time }}</span>
            <span class="content">{{ item.content }}</span>
          </div>
          <div v-if="messages.length === 0" class="empty-hint">暂无消息日志</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
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
    ElMessage.warning('请输入 WebSocket 地址')
    return
  }

  connecting.value = true
  try {
    const socket = await TauriWebSocket.connect(url.value.trim())
    ws.value = socket

    removeListener = socket.addListener((msg) => {
      if (msg.type === 'Text') addMessage('received', `收到: ${msg.data}`)
      else if (msg.type === 'Binary') addMessage('received', `收到二进制数据: ${msg.data.length} 字节`)
      else if (msg.type === 'Close') {
        addMessage('system', '连接已关闭')
        ws.value = null
      } else if (msg.type === 'Ping') {
        addMessage('system', '收到 Ping')
      } else if (msg.type === 'Pong') {
        addMessage('system', '收到 Pong')
      } else {
        addMessage('system', `事件: ${msg.type}`)
      }
    })

    addMessage('system', '连接成功')
  } catch (error) {
    ElMessage.error(error?.message || String(error))
    addMessage('error', `连接失败: ${error?.message || String(error)}`)
  } finally {
    connecting.value = false
  }
}

async function disconnect() {
  if (!ws.value) return

  try {
    await ws.value.disconnect()
    addMessage('system', '已断开连接')
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
    ElMessage.warning('请先连接 WebSocket')
    return false
  }

  if (!payload.trim()) {
    ElMessage.warning('请输入消息内容')
    return false
  }

  try {
    await ws.value.send(payload)
    addMessage('sent', `发送: ${label}`)
    return true
  } catch (error) {
    ElMessage.error(error?.message || String(error))
    addMessage('error', `发送失败: ${error?.message || String(error)}`)
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
    ElMessage.warning('请输入 JSON 内容')
    return
  }

  try {
    const formatted = JSON.stringify(JSON.parse(message.value), null, 2)
    const sent = await sendPayload(formatted, formatted)
    if (sent) message.value = formatted
  } catch {
    ElMessage.error('JSON 格式不正确')
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
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(360px, 440px) minmax(0, 1fr);
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: auto;
  padding: 16px 18px;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.composer-title { margin-top: 8px; }
.composer-input { flex: 0 0 auto; }

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

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
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 18px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hint {
  font-size: 13px;
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
  min-width: 30px;
  padding: 1px 8px;
  text-align: center;
  border-radius: 999px;
  font-size: 12px;
  color: #334155;
  background: rgba(148, 163, 184, 0.18);
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
  padding: 10px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  font-size: 13px;
}

.log-item.sent { background: rgba(64, 158, 255, 0.06); }
.log-item.received { background: rgba(103, 194, 58, 0.08); }
.log-item.error { background: rgba(245, 108, 108, 0.08); }
.log-item.system { background: rgba(148, 163, 184, 0.08); }

.time {
  color: var(--text-tertiary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.content {
  color: var(--text-primary);
  word-break: break-word;
  line-height: 1.5;
}

.empty-hint {
  height: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

@media (max-width: 1100px) {
  .content-area { grid-template-columns: 1fr; }
  .config-panel { border-right: 0; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
  .result-toolbar { padding: 10px 14px; }
  .log-item { padding: 10px 14px; }
}
</style>
