<template>
  <div class="ai-conversation-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <i class="fas fa-comments"></i> AI 对话
        </div>
        <el-select
          v-model="selectedModel"
          placeholder="选择 AI 模型"
          size="small"
          style="width: 200px; margin-left: 16px;"
          @change="onModelChange"
        >
          <el-option
            v-for="model in aiModels"
            :key="model.id"
            :label="model.name"
            :value="model.id"
          >
            <span>{{ model.name }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">{{ model.provider }}</span>
          </el-option>
        </el-select>
      </div>
      <div class="header-actions">
        <el-button 
          :icon="Plus" 
          circle
          size="small"
          @click="newConversation"
          title="新建对话"
        />
        <el-button 
          :icon="Setting" 
          circle
          size="small"
          @click="showSettingsDialog = true"
          title="API 设置"
        />
        <el-button 
          :icon="Delete" 
          circle
          size="small"
          type="danger"
          @click="clearMessages"
          title="清空对话"
        />
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-container">
      <!-- 对话区域 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <i class="fas fa-robot"></i>
          <p>开始与 AI 对话</p>
          <p class="hint">{{ currentModelInfo?.name || '请选择 AI 模型' }}</p>
        </div>

        <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
          <div class="message-avatar">
            <i v-if="msg.role === 'user'" class="fas fa-user"></i>
            <i v-else class="fas fa-robot"></i>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div class="message-time">{{ msg.timestamp }}</div>
          </div>
        </div>

        <div v-if="isLoading" class="message-item assistant loading">
          <div class="message-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="message-content">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <el-input
          v-model="userInput"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.ctrl.enter="sendMessage"
          :disabled="isLoading || !selectedModel"
        />
        <div class="input-actions">
          <span class="input-hint">Ctrl + Enter 发送</span>
          <el-button
            type="primary"
            :icon="Promotion"
            @click="sendMessage"
            :loading="isLoading"
            :disabled="!userInput.trim() || !selectedModel"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- API 设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      title="AI API 设置"
      width="700px"
    >
      <el-tabs v-model="activeSettingsTab">
        <el-tab-pane label="OpenAI" name="openai">
          <el-form label-width="100px">
            <el-form-item label="API Key">
              <el-input
                v-model="apiSettings.openai.apiKey"
                placeholder="sk-..."
                type="password"
                show-password
              />
            </el-form-item>
            <el-form-item label="API 地址">
              <el-input
                v-model="apiSettings.openai.baseUrl"
                placeholder="https://api.openai.com/v1"
              />
              <span style="font-size: 12px; color: #909399;">默认: https://api.openai.com/v1</span>
            </el-form-item>
            <el-form-item label="模型">
              <el-select v-model="apiSettings.openai.model" style="width: 100%;">
                <el-option label="GPT-4" value="gpt-4" />
                <el-option label="GPT-4 Turbo" value="gpt-4-turbo-preview" />
                <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Claude" name="claude">
          <el-form label-width="100px">
            <el-form-item label="API Key">
              <el-input
                v-model="apiSettings.claude.apiKey"
                placeholder="sk-ant-..."
                type="password"
                show-password
              />
            </el-form-item>
            <el-form-item label="API 地址">
              <el-input
                v-model="apiSettings.claude.baseUrl"
                placeholder="https://api.anthropic.com"
              />
            </el-form-item>
            <el-form-item label="模型">
              <el-select v-model="apiSettings.claude.model" style="width: 100%;">
                <el-option label="Claude 3 Opus" value="claude-3-opus-20240229" />
                <el-option label="Claude 3 Sonnet" value="claude-3-sonnet-20240229" />
                <el-option label="Claude 3 Haiku" value="claude-3-haiku-20240307" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="自定义" name="custom">
          <el-form label-width="100px">
            <el-form-item label="API Key">
              <el-input
                v-model="apiSettings.custom.apiKey"
                placeholder="输入 API Key"
                type="password"
                show-password
              />
            </el-form-item>
            <el-form-item label="API 地址">
              <el-input
                v-model="apiSettings.custom.baseUrl"
                placeholder="https://api.example.com/v1"
              />
              <span style="font-size: 12px; color: #909399;">
                OpenAI 兼容接口地址（例如：https://your-api.com/v1）<br>
                注意：必须是包含 /v1 的完整路径，不是网站首页
              </span>
            </el-form-item>
            <el-form-item label="模型名称">
              <el-input
                v-model="apiSettings.custom.model"
                placeholder="gpt-3.5-turbo"
              />
              <span style="font-size: 12px; color: #909399;">API 支持的模型名称（如 gpt-3.5-turbo）</span>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                @click="testCustomAPI" 
                :loading="testingAPI"
                :disabled="!apiSettings.custom.apiKey || !apiSettings.custom.baseUrl"
              >
                测试连接
              </el-button>
              <span style="font-size: 12px; color: #909399; margin-left: 12px;">
                测试 API 是否配置正确
              </span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Plus, Setting, Delete, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import OpenAI from 'openai'

// 状态管理
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const selectedModel = ref('')
const showSettingsDialog = ref(false)
const activeSettingsTab = ref('openai')
const messagesContainer = ref(null)
const testingAPI = ref(false)

// AI 模型列表
const aiModels = computed(() => {
  const customModelName = apiSettings.value.custom.model || '自定义模型'
  return [
    { id: 'openai-gpt4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'openai-gpt35', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'claude-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'claude-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: 'custom', name: customModelName, provider: 'Custom' }
  ]
})

// API 设置
const apiSettings = ref({
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },
  claude: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229'
  },
  custom: {
    apiKey: '',
    baseUrl: '',
    model: ''
  }
})

// 当前模型信息
const currentModelInfo = computed(() => {
  return aiModels.value.find(m => m.id === selectedModel.value)
})

// 加载设置
const loadSettings = () => {
  const saved = localStorage.getItem('ai_api_settings')
  if (saved) {
    try {
      apiSettings.value = JSON.parse(saved)
    } catch (e) { /* ignore */ }
  }
  
  const savedModel = localStorage.getItem('ai_selected_model')
  if (savedModel) {
    selectedModel.value = savedModel
  }
}

// 保存设置
const saveSettings = () => {
  // 验证自定义模型配置
  if (activeSettingsTab.value === 'custom') {
    if (!apiSettings.value.custom.apiKey || !apiSettings.value.custom.baseUrl || !apiSettings.value.custom.model) {
      ElMessage.warning('请完整填写自定义模型的所有配置项')
      return
    }
    
    // 验证 API 地址格式
    const baseUrl = apiSettings.value.custom.baseUrl.trim()
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      ElMessage.warning('API 地址必须以 http:// 或 https:// 开头')
      return
    }
  }
  
  localStorage.setItem('ai_api_settings', JSON.stringify(apiSettings.value))
  ElMessage.success('设置已保存')
  showSettingsDialog.value = false
}

// 模型切换
const onModelChange = () => {
  localStorage.setItem('ai_selected_model', selectedModel.value)
  ElMessage.info(`已切换到 ${currentModelInfo.value.name}`)
}

// 测试自定义 API 连接
const testCustomAPI = async () => {
  const settings = apiSettings.value.custom
  
  if (!settings.apiKey || !settings.baseUrl) {
    ElMessage.warning('请先填写 API Key 和 API 地址')
    return
  }

  testingAPI.value = true
  
  try {
    let baseUrl = settings.baseUrl.trim()
    
    // 验证地址格式
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error('API 地址必须以 http:// 或 https:// 开头')
    }
    
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    if (!baseUrl.includes('/v1')) {
      ElMessage.warning('注意：API 地址通常需要包含 /v1 路径')
    }

    // 发送测试请求
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    })

    const testModel = settings.model || 'gpt-3.5-turbo'
    
    const completion = await client.chat.completions.create({
      model: testModel,
      messages: [{ role: 'user', content: '1+1' }],
      max_tokens: 10
    })

    // 检查是否返回 HTML
    const completionStr = JSON.stringify(completion)
    if (completionStr.includes('<!doctype html>') || completionStr.includes('<html')) {
      throw new Error('返回的是网页而不是 API 接口')
    }

    // 验证返回格式
    if (!completion?.choices?.[0]?.message) {
      throw new Error('API 返回格式不正确，可能不兼容 OpenAI 格式')
    }

    ElMessage.success('✅ API 连接测试成功！配置正确')
  } catch (error) {
    const errorStr = String(error)
    const errorMessage = error.message || ''
    
    if (errorStr.includes('<html>') || errorStr.includes('<!doctype')) {
      ElMessage.error({
        message: '❌ API 地址错误：返回的是网页而不是 API 接口\n\n请确认地址格式：https://your-api.com/v1',
        duration: 5000
      })
    } else if (error.status === 500 || errorStr.includes('500')) {
      if (errorMessage.includes('sensitive_words_detected') || errorStr.includes('sensitive_words_detected')) {
        ElMessage.success({
          message: '✅ API 配置正确！\n\n注意：测试消息触发了内容审核，但这说明 API 连接正常\n实际使用时请注意消息内容',
          duration: 6000
        })
      } else {
        ElMessage.error(`❌ 服务器错误(500)：${errorMessage}`)
      }
    } else if (error.status === 404) {
      ElMessage.error('❌ 端点未找到(404)：请检查 API 地址是否包含 /v1 路径')
    } else if (error.status === 401) {
      ElMessage.error('❌ 认证失败(401)：API Key 无效')
    } else if (error.status === 403) {
      ElMessage.error('❌ 访问被拒绝(403)：请检查 API Key 权限')
    } else if (error.status === 429) {
      ElMessage.error('❌ 请求过于频繁(429)：API 配额不足或频率限制')
    } else {
      ElMessage.error(`❌ 测试失败：${errorMessage || '未知错误'}`)
    }
  } finally {
    testingAPI.value = false
  }
}

// 新建对话
const newConversation = () => {
  if (messages.value.length > 0) {
    ElMessageBox.confirm('确定要开始新对话吗？当前对话将被清空', '提示', {
      type: 'warning'
    }).then(() => {
      messages.value = []
      ElMessage.success('已开始新对话')
    }).catch(() => {})
  }
}

// 清空对话
const clearMessages = () => {
  if (messages.value.length === 0) {
    ElMessage.warning('当前没有对话记录')
    return
  }
  
  ElMessageBox.confirm('确定要清空所有对话吗？', '提示', {
    type: 'warning'
  }).then(() => {
    messages.value = []
    ElMessage.success('对话已清空')
  }).catch(() => {})
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) {
    ElMessage.warning('请输入消息')
    return
  }

  if (!selectedModel.value) {
    ElMessage.warning('请先选择 AI 模型')
    return
  }

  const content = userInput.value.trim()
  userInput.value = ''

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content,
    timestamp: new Date().toLocaleTimeString()
  })

  scrollToBottom()
  isLoading.value = true

  try {
    const response = await callAIAPI(content)
    
    // 添加 AI 回复
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toLocaleTimeString()
    })
    
    scrollToBottom()
  } catch (error) {
    ElMessage.error('AI 回复失败: ' + error.message)
    
    // 添加错误提示
    messages.value.push({
      role: 'assistant',
      content: `抱歉，我遇到了一些问题：${error.message}`,
      timestamp: new Date().toLocaleTimeString()
    })
  } finally {
    isLoading.value = false
  }
}

// 调用 AI API
const callAIAPI = async (content) => {
  const modelId = selectedModel.value

  if (modelId.startsWith('openai-')) {
    return await callOpenAI(content)
  } else if (modelId.startsWith('claude-')) {
    return await callClaude(content)
  } else if (modelId === 'custom') {
    return await callCustomAPI(content)
  } else {
    throw new Error('未知的模型类型')
  }
}

// 调用 OpenAI API
const callOpenAI = async (content) => {
  const settings = apiSettings.value.openai
  
  if (!settings.apiKey) {
    throw new Error('请先配置 OpenAI API Key')
  }

  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        ...conversationHistory,
        { role: 'user', content }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API 错误: ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 调用 Claude API
const callClaude = async (content) => {
  const settings = apiSettings.value.claude
  
  if (!settings.apiKey) {
    throw new Error('请先配置 Claude API Key')
  }

  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const response = await fetch(`${settings.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      messages: [
        ...conversationHistory,
        { role: 'user', content }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API 错误: ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// 调用自定义 API
const callCustomAPI = async (content) => {
  const settings = apiSettings.value.custom
  
  if (!settings.apiKey || !settings.baseUrl || !settings.model) {
    throw new Error('请先完整配置自定义 API (API Key、API 地址、模型名称)')
  }

  // 确保 baseUrl 格式正确
  let baseUrl = settings.baseUrl.trim()
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('API 地址必须以 http:// 或 https:// 开头')
  }
  
  // 移除末尾的斜杠
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  // 验证是否包含 /v1 路径
  if (!baseUrl.includes('/v1')) {
    ElMessage.warning('API 地址似乎不完整，OpenAI 兼容接口通常需要 /v1 路径')
  }

  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  try {
    // 使用 OpenAI SDK
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    })

    const completion = await client.chat.completions.create({
      model: settings.model,
      messages: [
        ...conversationHistory,
        { role: 'user', content }
      ]
    })

    // 检查返回数据是否是 HTML（常见错误）
    const completionStr = typeof completion === 'string' ? completion : JSON.stringify(completion)
    if (completionStr.includes('<!doctype html>') || completionStr.includes('<html')) {
      throw new Error('API 地址配置错误：返回的是网页(HTML)而不是 API 接口\n\n' +
        '请确认：\n' +
        '1. API 地址必须包含 /v1 路径（如：https://your-api.com/v1）\n' +
        '2. 不要填写网站首页地址\n' +
        '3. 参考 OpenAI API 格式：baseURL + /chat/completions')
    }

    // 验证返回格式
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('API 返回格式错误：未找到有效的消息内容\n\n可能原因：API 地址不正确或不兼容 OpenAI 格式')
    }

    return completion.choices[0].message.content
  } catch (error) {
    // 检查错误消息中是否包含 HTML
    const errorStr = String(error)
    const errorMessage = error.message || ''
    
    if (errorStr.includes('<!doctype') || errorStr.includes('<html>') || errorStr.includes('<title>')) {
      throw new Error('⚠️ API 地址配置错误\n\n' +
        '返回的是网页而不是 API 接口！\n\n' +
        '正确格式示例：\n' +
        '✅ https://api.openai.com/v1\n' +
        '✅ https://your-api-host.com/v1\n' +
        '❌ https://your-website.com （网站首页）\n\n' +
        '提示：OpenAI 兼容 API 通常需要 /v1 路径')
    }
    
    // 处理特定错误
    if (error.status === 500 || errorStr.includes('500')) {
      // 敏感词检测
      if (errorMessage.includes('sensitive_words_detected') || errorStr.includes('sensitive_words_detected')) {
        throw new Error('内容审核失败：消息包含敏感词或违规内容\n\n请修改消息内容后重试')
      }
      throw new Error(`服务器错误(500)：${errorMessage || 'API 服务器内部错误，请稍后重试'}`)
    }
    
    if (error.status === 403) {
      throw new Error('访问被拒绝(403)：请检查 API Key 权限')
    }
    
    if (error.status === 401) {
      throw new Error('认证失败(401)：API Key 无效或已过期')
    }

    if (error.status === 404) {
      throw new Error('端点未找到(404)：API 地址可能缺少 /v1 路径\n' +
        '完整地址应该是：https://your-api.com/v1')
    }

    if (error.status === 429) {
      throw new Error('请求过于频繁(429)：请稍后再试或升级 API 配额')
    }

    throw new Error(errorMessage || '请求失败，请检查 API 配置')
  }
}

// 格式化消息内容（简单的 Markdown 支持）
const formatMessage = (content) => {
  return content
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
/* ignore */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.ai-conversation-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #f7f9fb;
}

/* ignore */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 0.9rem;
  color: #606f7b;
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb i {
  color: #3498db;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ignore */
.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* ignore */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 16px;
  color: #dcdfe6;
}

.empty-state p {
  margin: 4px 0;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  color: #c0c4cc;
}

/* ignore */
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-item.assistant .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message-item.user .message-content {
  text-align: right;
}

.message-text {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  color: #2c3e50;
  word-wrap: break-word;
}

.message-item.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 12px;
}

.message-item.assistant .message-text {
  border-radius: 12px 12px 12px 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* ignore */
.loading-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* ignore */
.input-area {
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
  background: #fafbfc;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.input-hint {
  font-size: 12px;
  color: #909399;
}
</style>
