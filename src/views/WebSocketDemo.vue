<template>
  <div class="websocket-demo-page">
    <TitleBar title="WebSocket - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🔌 WebSocket</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">连接 WebSocket</div>
          </template>
          <el-form :model="wsForm" label-width="100px">
            <el-form-item label="WebSocket URL">
              <el-input v-model="wsForm.url" placeholder="ws://echo.websocket.org" />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                @click="connect"
                :loading="connecting"
                v-if="!ws"
              >
                <el-icon><Connection /></el-icon>
                连接
              </el-button>
              <el-button
                type="danger"
                @click="disconnect"
                v-else
              >
                <el-icon><Close /></el-icon>
                断开连接
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="ws">
          <template #header>
            <div class="card-header">发送消息</div>
          </template>
          <el-form :model="messageForm" label-width="100px">
            <el-form-item label="消息内容">
              <el-input
                v-model="messageForm.text"
                type="textarea"
                :rows="3"
                placeholder="输入要发送的消息..."
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="sendMessage" :disabled="!ws">
                <el-icon><Promotion /></el-icon>
                发送消息
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">消息日志</div>
          </template>
          <div class="message-log">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message-item', msg.type]"
            >
              <span class="message-time">{{ msg.time }}</span>
              <span class="message-content">{{ msg.content }}</span>
            </div>
            <div v-if="messages.length === 0" class="empty-log">
              暂无消息
            </div>
          </div>
          <el-button @click="clearMessages" style="margin-top: 12px" size="small">
            清空日志
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速测试</div>
          </template>
          <el-space wrap>
            <el-button @click="quickConnect('ws://echo.websocket.org')">
              测试 Echo 服务器
            </el-button>
            <el-button @click="quickConnect('wss://echo.websocket.org')">
              测试 Echo (WSS)
            </el-button>
          </el-space>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Close, Promotion } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriWebSocket } from '@/utils/tauri'

const router = useRouter()
const connecting = ref(false)
const wsForm = ref({
  url: 'ws://echo.websocket.org'
})
const messageForm = ref({
  text: ''
})
const ws = ref(null)
const messages = ref([])
let removeListener = null

const addMessage = (type, content) => {
  messages.value.push({
    type,
    content,
    time: new Date().toLocaleTimeString()
  })
}

const connect = async () => {
  if (!wsForm.value.url.trim()) {
    ElMessage.warning('请输入 WebSocket URL')
    return
  }

  connecting.value = true
  try {
    const websocket = await TauriWebSocket.connect(wsForm.value.url)
    ws.value = websocket
    
    removeListener = websocket.addListener((msg) => {
      if (msg.type === 'Text') {
        addMessage('received', `收到: ${msg.data}`)
      } else if (msg.type === 'Binary') {
        addMessage('received', `收到二进制数据: ${msg.data.length} 字节`)
      } else if (msg.type === 'Close') {
        addMessage('system', '连接已关闭')
        ws.value = null
      } else if (msg.type === 'Ping') {
        addMessage('system', '收到 Ping')
      } else if (msg.type === 'Pong') {
        addMessage('system', '收到 Pong')
      }
    })
    
    addMessage('system', '连接成功')
  } catch (error) {
    ElMessage.error('连接失败: ' + error.message)
    addMessage('error', `连接失败: ${error.message}`)
  } finally {
    connecting.value = false
  }
}

const disconnect = async () => {
  if (ws.value) {
    try {
      await ws.value.disconnect()
      addMessage('system', '已断开连接')
      ws.value = null
      if (removeListener) {
        removeListener()
        removeListener = null
      }
    } catch (error) {
      ElMessage.error('断开连接失败: ' + error.message)
    }
  }
}

const sendMessage = async () => {
  if (!messageForm.value.text.trim()) {
    ElMessage.warning('请输入要发送的消息')
    return
  }

  if (!ws.value) {
    ElMessage.warning('请先连接 WebSocket')
    return
  }

  try {
    await ws.value.send(messageForm.value.text)
    addMessage('sent', `发送: ${messageForm.value.text}`)
    messageForm.value.text = ''
  } catch (error) {
    ElMessage.error('发送失败: ' + error.message)
    addMessage('error', `发送失败: ${error.message}`)
  }
}

const quickConnect = async (url) => {
  wsForm.value.url = url
  await connect()
}

const clearMessages = () => {
  messages.value = []
}

onUnmounted(() => {
  if (ws.value) {
    disconnect()
  }
})

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.websocket-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: var(--el-fill-color-light);
}

.demo-view {
  padding: 24px;
  padding-top: 56px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-card {
  width: 100%;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}

.message-log {
  max-height: 400px;
  overflow-y: auto;
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
}

.message-item {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
  background: var(--bg-primary);
}

.message-item.sent {
  background: #e1f3ff;
}

.message-item.received {
  background: #f0f9ff;
}

.message-item.system {
  background: var(--el-fill-color-light);
  color: var(--text-secondary);
}

.message-item.error {
  background: #fee;
  color: #c33;
}

.message-time {
  color: var(--text-tertiary);
  font-size: 11px;
  margin-right: 8px;
}

.message-content {
  word-break: break-all;
}

.empty-log {
  text-align: center;
  color: var(--text-tertiary);
  padding: 20px;
}
</style>

