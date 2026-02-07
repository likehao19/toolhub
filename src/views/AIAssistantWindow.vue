<template>
  <div class="ai-assistant-window">
    <!-- 头部 -->
    <div class="window-header" data-tauri-drag-region>
      <div class="header-title">
        <el-icon class="title-icon"><MagicStick /></el-icon>
        <span>AI 智能助手</span>
      </div>
      <div class="header-actions">
        <el-button text size="small" @click="minimizeWindow" title="最小化">
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button text size="small" @click="closeWindow" title="关闭">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- AI 助手内容 -->
    <div class="window-content">
      <div class="message-list" ref="messageListRef">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-message">
          <el-icon class="welcome-icon"><MagicStick /></el-icon>
          <h3>您好！我是 AI 智能助手</h3>
          <p>我可以帮您管理笔记、日程、待办、密码和书签</p>
          
          <div class="example-commands">
            <div class="command-item" @click="sendMessage('帮我写一篇关于Vue3的笔记')">
              <el-icon><Document /></el-icon>
              <span>创建笔记</span>
            </div>
            <div class="command-item" @click="sendMessage('明天下午2点开会')">
              <el-icon><Calendar /></el-icon>
              <span>添加日程</span>
            </div>
            <div class="command-item" @click="sendMessage('添加待办：完成项目报告')">
              <el-icon><CircleCheck /></el-icon>
              <span>添加待办</span>
            </div>
            <div class="command-item" @click="sendMessage('收藏网站 github.com')">
              <el-icon><Link /></el-icon>
              <span>收藏网站</span>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
          <div class="message-avatar">
            <el-icon v-if="msg.role === 'user'"><User /></el-icon>
            <el-icon v-else><MagicStick /></el-icon>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div v-if="msg.result" class="message-result" :class="msg.result.status">
              <el-icon v-if="msg.result.status === 'success'"><CircleCheck /></el-icon>
              <el-icon v-else><CircleClose /></el-icon>
              <span>{{ msg.result.message }}</span>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="message-item assistant">
          <div class="message-avatar">
            <el-icon><MagicStick /></el-icon>
          </div>
          <div class="message-content">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <el-input
          v-model="userInput"
          type="textarea"
          :rows="2"
          placeholder="输入您的需求，例如：帮我写一篇笔记、明天提醒我开会..."
          @keydown.enter.exact="handleEnterKey"
          :disabled="isLoading"
        />
        <div class="input-actions">
          <el-button size="small" @click="clearMessages" :disabled="messages.length === 0">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
          <el-button type="primary" size="small" @click="handleSend" :loading="isLoading" :disabled="!userInput.trim()">
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  MagicStick, Close, Minus, User, Document, Calendar, 
  CircleCheck, Link, CircleClose, Delete, Promotion 
} from '@element-plus/icons-vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { recognizeIntent } from '@/utils/ai/intent'
import { extractParams } from '@/utils/ai/parser'
import { executeOperation } from '@/utils/ai/operations'
import { chatWithAI } from '@/services/aiService'

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const messageListRef = ref(null)

// 格式化消息（支持换行）
const formatMessage = (content) => {
  return content.replace(/\n/g, '<br>')
}

// 发送消息
const sendMessage = async (content) => {
  if (!content || !content.trim()) return
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: content.trim()
  })
  
  userInput.value = ''
  isLoading.value = true
  
  await nextTick()
  scrollToBottom()
  
  try {
    // 1. 识别意图
    const intent = await recognizeIntent(content, messages.value)

    if (!intent || intent.type === 'unknown' || intent.type === 'query') {
      // 无法识别意图或为查询类型，使用通用 AI 对话
      try {
        const conversationMessages = messages.value
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content }))
        const response = await chatWithAI(conversationMessages)
        messages.value.push({
          role: 'assistant',
          content: response,
          result: null
        })
      } catch (aiError) {
        messages.value.push({
          role: 'assistant',
          content: '抱歉，AI 服务暂时不可用。请在设置中检查 AI 配置。',
          result: {
            status: 'error',
            message: aiError.message || 'AI 服务调用失败'
          }
        })
      }
    } else {
      // 2. 提取参数
      const params = await extractParams(content, intent.type)
      // 3. 构建回复消息
      const assistantMessage = {
        role: 'assistant',
        content: `我理解了，您想${intent.description}`,
        result: null
      }

      messages.value.push(assistantMessage)
      await nextTick()
      scrollToBottom()

      // 4. 执行操作
      try {
        const result = await executeOperation(intent.type, params)
        assistantMessage.result = {
          status: 'success',
          message: result.message
        }
        ElMessage.success(result.message)

        // 通知主窗口刷新数据
        window.dispatchEvent(new CustomEvent('ai-operation-complete', {
          detail: { intent: intent.type, result }
        }))
      } catch (error) {
        assistantMessage.result = {
          status: 'error',
          message: error.message || '操作失败'
        }
        ElMessage.error(error.message || '操作失败')
      }
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我无法理解您的请求。请尝试更明确的表达，例如"帮我写一篇笔记"、"明天提醒我开会"等。',
      result: {
        status: 'error',
        message: error.message || '处理失败'
      }
    })
    ElMessage.error('处理失败')
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

// 处理发送
const handleSend = () => {
  sendMessage(userInput.value)
}

// 处理回车键
const handleEnterKey = (e) => {
  if (!e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// 清空消息
const clearMessages = () => {
  messages.value = []
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 最小化窗口
const minimizeWindow = async () => {
  const window = getCurrentWebviewWindow()
  await window.minimize()
}

// 关闭窗口
const closeWindow = async () => {
  const window = getCurrentWebviewWindow()
  await window.close()
}

onMounted(() => {
})
</script>

<style scoped>
.ai-assistant-window {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

/* ignore */
.window-header {
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.title-icon {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button {
  color: white;
  padding: 4px;
}

.header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ignore */
.window-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ignore */
.welcome-message {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}

.welcome-message h3 {
  font-size: 20px;
  color: #303133;
  margin: 0 0 8px 0;
}

.welcome-message p {
  color: #909399;
  margin: 0 0 24px 0;
}

.example-commands {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 400px;
  margin: 0 auto;
}

.command-item {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.command-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.command-item .el-icon {
  font-size: 24px;
}

.command-item span {
  font-size: 12px;
}

/* ignore */
.message-item {
  display: flex;
  gap: 12px;
  animation: message-fade-in 0.3s ease;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  color: white;
}

.message-item.user .message-avatar {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.message-item.assistant .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-text {
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.message-item.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 4px 12px;
}

.message-item.assistant .message-text {
  border-radius: 12px 12px 12px 4px;
}

.message-result {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.message-result.success {
  background: #f0f9ff;
  color: #67c23a;
  border: 1px solid #d9ecff;
}

.message-result.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

/* ignore */
.loading-dots {
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  background: white;
  border-radius: 12px 12px 12px 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* ignore */
.input-area {
  padding: 12px;
  background: white;
  border-top: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ignore */
@keyframes message-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ignore */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>
