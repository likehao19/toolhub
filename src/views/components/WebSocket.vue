<template>
  <DocPage
    icon="🔌"
    title="WebSocket"
    description="建立 WebSocket 连接进行实时通信。WebSocket API 提供了双向通信功能，允许应用与服务器建立持久连接，实现实时数据交换。支持文本和二进制消息，可以监听连接状态变化、接收消息、发送消息等操作。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="WebSocket 连接"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="wsForm" label-width="120px">
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
                <el-button @click="fillExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-alert
              v-if="ws"
              :title="`已连接到: ${wsForm.url}`"
              type="success"
              :closable="false"
              style="margin-top: 16px;"
            />
            <el-form v-if="ws" :model="messageForm" label-width="120px" style="margin-top: 16px;">
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
                <el-button @click="clearMessages">清空消息</el-button>
              </el-form-item>
            </el-form>
            <div v-if="messages.length > 0" style="margin-top: 16px; padding: 12px; background: var(--el-fill-color-light); border-radius: 4px; max-height: 300px; overflow-y: auto;">
              <div v-for="(msg, index) in messages" :key="index" style="margin-bottom: 8px; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                <el-tag :type="getMessageTagType(msg.type)" size="small" style="margin-right: 8px;">
                  {{ msg.type }}
                </el-tag>
                <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-right: 8px;">{{ msg.time }}</span>
                <span>{{ msg.content }}</span>
              </div>
            </div>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="WebSocket 事件处理"
        :code="eventsCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="连接状态">
                <el-tag :type="ws ? 'success' : 'info'">
                  {{ ws ? '已连接' : '未连接' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="消息总数">
                {{ messages.length }}
              </el-descriptions-item>
              <el-descriptions-item label="发送消息数">
                {{ messages.filter(m => m.type === '发送').length }}
              </el-descriptions-item>
              <el-descriptions-item label="接收消息数">
                {{ messages.filter(m => m.type === '接收').length }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Close, Promotion } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriWebSocket } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'connect',
    description: '创建 WebSocket 连接',
    params: [
      { name: 'url', type: 'string', description: 'WebSocket URL（ws:// 或 wss://）' },
      { name: 'config', type: 'Object', default: '{}', description: '连接配置选项' }
    ],
    returns: 'Promise<WebSocket>',
    example: "const ws = await TauriWebSocket.connect('ws://echo.websocket.org')"
  }
]

const methodsData = [
  {
    name: 'connect',
    description: '建立 WebSocket 连接',
    usage: "const ws = await TauriWebSocket.connect('ws://echo.websocket.org')"
  },
  {
    name: 'send',
    description: '发送消息（WebSocket 实例方法）',
    usage: "await ws.send('Hello WebSocket')"
  },
  {
    name: 'onMessage',
    description: '监听消息（WebSocket 实例方法）',
    usage: "ws.onMessage((message) => console.log(message))"
  },
  {
    name: 'disconnect',
    description: '断开连接（WebSocket 实例方法）',
    usage: "await ws.disconnect()"
  }
]

const connecting = ref(false)
const ws = ref(null)
const wsForm = ref({
  url: 'ws://echo.websocket.org'
})
const messageForm = ref({
  text: ''
})
const messages = ref([])

const basicCode = `import { TauriWebSocket } from '@/utils/tauri'

// 连接 WebSocket
const ws = await TauriWebSocket.connect('ws://echo.websocket.org')

// 监听消息
ws.onMessage((message) => {
})

// 发送消息
await ws.send('Hello WebSocket!')

// 断开连接
await ws.disconnect()`

const eventsCode = `import { TauriWebSocket } from '@/utils/tauri'

// 连接并处理各种事件
const ws = await TauriWebSocket.connect('ws://echo.websocket.org')

// 监听消息
ws.onMessage((message) => {
  // 处理消息
})

// 发送消息
await ws.send('Hello')

// 发送 JSON 数据
await ws.send(JSON.stringify({ type: 'message', data: 'Hello' }))

// 断开连接
await ws.disconnect()`

const getMessageTagType = (type) => {
  const typeMap = {
    '系统': 'info',
    '发送': 'primary',
    '接收': 'success',
    '错误': 'danger'
  }
  return typeMap[type] || 'info'
}

const connect = async () => {
  if (!wsForm.value.url) {
    ElMessage.warning('请输入 WebSocket URL')
    return
  }
  
  connecting.value = true
  try {
    ws.value = await TauriWebSocket.connect(wsForm.value.url)
    ws.value.onMessage((message) => {
      messages.value.push({
        type: '接收',
        content: message,
        time: new Date().toLocaleTimeString()
      })
    })
    messages.value.push({
      type: '系统',
      content: '已连接到 ' + wsForm.value.url,
      time: new Date().toLocaleTimeString()
    })
    ElMessage.success('连接成功')
  } catch (error) {
    ElMessage.error('连接失败: ' + (error.message || String(error)))
    messages.value.push({
      type: '错误',
      content: '连接失败: ' + (error.message || String(error)),
      time: new Date().toLocaleTimeString()
    })
  } finally {
    connecting.value = false
  }
}

const disconnect = async () => {
  try {
    if (ws.value) {
      await ws.value.disconnect()
      ws.value = null
      messages.value.push({
        type: '系统',
        content: '已断开连接',
        time: new Date().toLocaleTimeString()
      })
      ElMessage.success('已断开连接')
    }
  } catch (error) {
    ElMessage.error('断开失败: ' + (error.message || String(error)))
  }
}

const sendMessage = async () => {
  if (!messageForm.value.text) {
    ElMessage.warning('请输入消息内容')
    return
  }
  
  try {
    await ws.value.send(messageForm.value.text)
    messages.value.push({
      type: '发送',
      content: messageForm.value.text,
      time: new Date().toLocaleTimeString()
    })
    messageForm.value.text = ''
  } catch (error) {
    ElMessage.error('发送失败: ' + (error.message || String(error)))
    messages.value.push({
      type: '错误',
      content: '发送失败: ' + (error.message || String(error)),
      time: new Date().toLocaleTimeString()
    })
  }
}

const clearMessages = () => {
  messages.value = []
  ElMessage.success('消息已清空')
}

const fillExample = () => {
  wsForm.value.url = 'ws://echo.websocket.org'
}
</script>
