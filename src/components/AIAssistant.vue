<template>
  <el-dialog
    v-model="visible"
    :title="t('aiAssistant.dialogTitle')"
    width="700px"
    :close-on-click-modal="false"
    class="ai-assistant-dialog"
  >
    <div class="assistant-container">
      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="welcome-message">
          <el-icon class="welcome-icon"><MagicStick /></el-icon>
          <h3>{{ t('aiAssistant.welcomeTitle') }}</h3>
          <p>{{ t('aiAssistant.welcomeDesc') }}</p>
          <div class="example-commands">
            <div class="example-title">{{ t('aiAssistant.tryCommands') }}</div>
            <el-tag v-for="cmd in exampleCommands" :key="cmd" size="small" @click="sendExample(cmd)">
              {{ cmd }}
            </el-tag>
          </div>
        </div>

        <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.role">
          <div class="message-avatar">
            <el-icon v-if="msg.role === 'user'"><User /></el-icon>
            <el-icon v-else><MagicStick /></el-icon>
          </div>
          <div class="message-content">
            <div class="message-text">{{ msg.content }}</div>
            <div v-if="msg.confirmation" class="confirmation-box">
              <div class="confirmation-info">
                <el-icon><Warning /></el-icon>
                <span>{{ t('aiAssistant.confirmOperation') }}</span>
              </div>
              <div class="confirmation-details">
                <div v-for="(value, key) in msg.confirmation.params" :key="key">
                  <strong>{{ key }}:</strong> {{ value }}
                </div>
              </div>
              <div class="confirmation-actions">
                <el-button type="primary" size="small" @click="confirmOperation(index)">{{ t('aiAssistant.confirm') }}</el-button>
                <el-button size="small" @click="cancelOperation(index)">{{ t('aiAssistant.cancel') }}</el-button>
              </div>
            </div>
            <div v-if="msg.result" class="result-box" :class="msg.result.status">
              <el-icon v-if="msg.result.status === 'success'"><CircleCheck /></el-icon>
              <el-icon v-else><CircleClose /></el-icon>
              <span>{{ msg.result.message }}</span>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="message assistant">
          <div class="message-avatar">
            <el-icon><MagicStick /></el-icon>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-container">
        <el-input
          v-model="userInput"
          :placeholder="t('aiAssistant.inputPlaceholder')"
          @keyup.enter="sendMessage"
          :disabled="isLoading"
          clearable
        >
          <template #append>
            <el-button :icon="Promotion" @click="sendMessage" :loading="isLoading" type="primary">
              {{ t('aiAssistant.send') }}
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 操作历史 -->
      <div class="history-toggle">
        <el-button text size="small" @click="showHistory = !showHistory">
          <el-icon><Clock /></el-icon>
          {{ t('aiAssistant.operationHistory') }}
        </el-button>
      </div>
    </div>

    <!-- 操作历史侧边栏 -->
    <el-drawer v-model="showHistory" :title="t('aiAssistant.historyTitle')" size="30%">
      <div class="history-list">
        <div v-for="(op, index) in operationHistory" :key="index" class="history-item">
          <div class="history-header">
            <el-tag :type="op.status === 'success' ? 'success' : 'danger'" size="small">
              {{ op.intent }}
            </el-tag>
            <span class="history-time">{{ formatTime(op.timestamp) }}</span>
          </div>
          <div class="history-content">{{ op.command }}</div>
        </div>
        <el-empty v-if="operationHistory.length === 0" :description="t('aiAssistant.noHistory')" />
      </div>
    </el-drawer>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { MagicStick, User, Warning, CircleCheck, CircleClose, Promotion, Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { recognizeIntent } from '@/utils/ai/intent'
import { extractParams } from '@/utils/ai/parser'
import { chatWithAI } from '@/services/aiService'
import { executeOperation } from '@/utils/ai/operations'
import { t } from '@/i18n'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'operation-complete'])

const visible = ref(false)
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const showHistory = ref(false)
const operationHistory = ref([])
const messagesContainer = ref(null)
const conversationContext = ref([])

// 示例命令
const exampleCommands = [
  t('aiAssistant.exampleNote'),
  t('aiAssistant.exampleEvent'),
  t('aiAssistant.examplePassword'),
  t('aiAssistant.exampleBookmark'),
  t('aiAssistant.exampleTodo'),
]

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    // 关闭时清空输入
    userInput.value = ''
  }
})

// 发送示例命令
const sendExample = (cmd) => {
  userInput.value = cmd
  sendMessage()
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const userMessage = userInput.value.trim()
  userInput.value = ''

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userMessage
  })

  // 添加到对话上下文
  conversationContext.value.push({
    role: 'user',
    content: userMessage
  })

  scrollToBottom()
  isLoading.value = true

  try {
    // 1. 意图识别
    const intent = await recognizeIntent(userMessage, conversationContext.value)

    if (!intent || intent.type === 'unknown') {
      // 无法识别意图，使用通用对话
      const response = await chatWithAI(conversationContext.value)
      messages.value.push({
        role: 'assistant',
        content: response
      })
      conversationContext.value.push({
        role: 'assistant',
        content: response
      })
    } else {
      // 2. 提取参数
      const params = await extractParams(userMessage, intent.type)

      // 3. 显示确认
      const assistantMsg = {
        role: 'assistant',
        content: t('aiAssistant.willDoPrefix', { action: intent.description }),
        confirmation: {
          intent: intent.type,
          params: params,
          originalMessage: userMessage
        }
      }
      messages.value.push(assistantMsg)
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: t('aiAssistant.requestError')
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 确认操作
const confirmOperation = async (messageIndex) => {
  const message = messages.value[messageIndex]
  if (!message.confirmation) return

  const { intent, params, originalMessage } = message.confirmation

  // 移除确认框
  message.confirmation = null
  isLoading.value = true

  try {
    // 执行操作
    const result = await executeOperation(intent, params)

    // 显示结果
    message.result = {
      status: 'success',
      message: result.message
    }

    // 记录操作历史
    operationHistory.value.unshift({
      intent,
      command: originalMessage,
      status: 'success',
      timestamp: new Date(),
      result: result.data
    })

    ElMessage.success(result.message)

    // 触发操作完成事件
    emit('operation-complete', { intent, result })
  } catch (error) {
    message.result = {
      status: 'error',
      message: error.message || t('aiAssistant.operationFailed')
    }

    operationHistory.value.unshift({
      intent,
      command: originalMessage,
      status: 'error',
      timestamp: new Date(),
      error: error.message
    })

    ElMessage.error(error.message || t('aiAssistant.operationFailed'))
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 取消操作
const cancelOperation = (messageIndex) => {
  const message = messages.value[messageIndex]
  message.confirmation = null
  message.content += `\n\n${t('aiAssistant.cancelled')}`
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化时间
const formatTime = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.ai-assistant-dialog {
  --el-dialog-padding-primary: 0;
}

.assistant-container {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.welcome-message h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 8px;
}

.welcome-message p {
  color: #909399;
  margin-bottom: 24px;
}

.example-commands {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.example-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.example-commands .el-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.example-commands .el-tag:hover {
  transform: scale(1.05);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.message.user .message-avatar {
  background: #409eff;
  color: white;
}

.message.assistant .message-avatar {
  background: #67c23a;
  color: white;
}

.message-content {
  flex: 1;
  max-width: calc(100% - 48px);
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  line-height: 1.6;
  word-wrap: break-word;
}

.message.user .message-text {
  background: #409eff;
  color: white;
}

.confirmation-box {
  background: #fff9e6;
  border: 1px solid #e6a23c;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.confirmation-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6a23c;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirmation-details {
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;
}

.confirmation-details div {
  margin-bottom: 4px;
}

.confirmation-actions {
  display: flex;
  gap: 8px;
}

.result-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 14px;
}

.result-box.success {
  background: #f0f9ff;
  color: #67c23a;
}

.result-box.error {
  background: #fef0f0;
  color: #f56c6c;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.input-container {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #dcdfe6;
}

.history-toggle {
  padding: 0 20px 16px;
  background: white;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-content {
  font-size: 14px;
  color: #606266;
}
</style>
