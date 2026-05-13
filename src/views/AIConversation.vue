<template>
  <div class="ai-conversation-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <i class="fas fa-comments"></i> {{ t('aiConv.title') }}
        </div>
        <el-select
          v-model="selectedModel"
          :placeholder="t('aiConv.selectModel')"
          size="small"
          style="width: 200px; margin-left: 16px;"
          :teleported="false"
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
          :title="t('aiConv.newConversation')"
        />
        <el-button
          :icon="Setting"
          circle
          size="small"
          @click="showSettingsDialog = true"
          :title="t('aiConv.apiSettings')"
        />
        <el-button
          :icon="Delete"
          circle
          size="small"
          type="danger"
          @click="clearMessages"
          :title="t('aiConv.clearMessages')"
        />
      </div>
    </div>

    <!-- 主体区域：侧边栏 + 聊天区 -->
    <div class="main-body">
      <!-- 对话历史侧边栏 -->
      <div class="conversation-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <template v-if="!sidebarCollapsed">
          <div class="sidebar-header">
            <div class="sidebar-new-btn" @click="newConversation" :title="t('aiConv.newConversation')">
              <i class="fas fa-plus"></i>
              <span>{{ t('aiConv.newConversation') }}</span>
            </div>
            <div class="sidebar-collapse-btn" @click="sidebarCollapsed = true" :title="t('aiConv.collapseHistory')">
              <i class="fas fa-angles-left"></i>
            </div>
          </div>
          <div class="sidebar-list">
            <div
              v-for="conv in conversationList"
              :key="conv.id"
              class="sidebar-item"
              :class="{ active: conv.id === currentConversationId }"
              @click="switchConversation(conv.id)"
            >
              <i class="fas fa-message sidebar-item-icon"></i>
              <div class="sidebar-item-content">
                <div class="sidebar-item-title">{{ conv.title }}</div>
              </div>
              <div class="sidebar-item-actions" @click.stop>
                <i class="fas fa-trash-can sidebar-action-btn" @click="deleteConversation(conv.id)"></i>
              </div>
            </div>
            <div v-if="conversationList.length === 0" class="sidebar-empty">
              <i class="fas fa-inbox"></i>
              <span>{{ t('aiConv.noConversations') }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 折叠态：展开按钮浮在聊天区左上角 -->
      <div v-if="sidebarCollapsed" class="sidebar-expand-btn" @click="sidebarCollapsed = false" :title="t('aiConv.expandHistory')">
        <i class="fas fa-bars"></i>
      </div>

      <!-- 主内容区 -->
      <div class="content-container">
        <!-- 对话区域 -->
        <div class="messages-container" ref="messagesContainer">
          <div v-if="messages.length === 0" class="empty-state">
            <i class="fas fa-robot"></i>
            <p>{{ t('aiConv.startChat') }}</p>
            <p class="hint">{{ currentModelInfo?.name || t('aiConv.selectModelHint') }}</p>
          </div>

          <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
            <div class="message-avatar">
              <i v-if="msg.role === 'user'" class="fas fa-user"></i>
              <i v-else class="fas fa-robot"></i>
            </div>
            <div class="message-bubble">
              <!-- 用户消息 -->
              <div v-if="msg.role === 'user'" class="message-text user-message">
                {{ msg.content }}
              </div>
              <!-- AI消息：Markdown渲染 -->
              <div v-else class="message-text assistant-message" v-html="renderMarkdown(msg.content)"></div>
              <div class="message-time">{{ msg.timestamp }}</div>
            </div>
          </div>

          <!-- 流式回复中的消息 -->
          <div v-if="isStreaming" class="message-item assistant streaming">
            <div class="message-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="message-bubble">
              <template v-if="streamingContent">
                <div class="message-text assistant-message streaming-text" v-html="renderMarkdown(streamingContent)"></div>
              </template>
              <template v-else>
                <div class="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </template>
            </div>
          </div>

          <!-- 加载动画（非流式） -->
          <div v-if="isLoading && !isStreaming" class="message-item assistant loading">
            <div class="message-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="message-bubble">
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              ref="inputRef"
              v-model="userInput"
              :placeholder="t('aiConv.inputPlaceholder')"
              @keydown="handleKeyDown"
              @input="adjustTextareaHeight"
              :disabled="isLoading || !selectedModel"
              class="message-input"
              rows="1"
            ></textarea>
            <button
              class="send-button"
              @click="sendMessage"
              :disabled="!userInput.trim() || !selectedModel || isLoading"
              :title="t('aiConv.send')"
            >
              <svg v-if="!isLoading" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span v-else class="loading-spinner"></span>
            </button>
          </div>
          <div class="input-hint">{{ t('aiConv.inputHint') }}</div>
        </div>
      </div>
    </div>

    <!-- API 设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      :title="t('aiConv.settingsTitle')"
      width="560px"
      top="5vh"
      class="settings-dialog"
      :close-on-click-modal="false"
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
            <el-form-item :label="t('aiConv.apiAddress')">
              <el-input
                v-model="apiSettings.openai.baseUrl"
                placeholder="https://api.openai.com/v1"
              />
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">{{ t('aiConv.defaultHint') }} https://api.openai.com/v1</span>
            </el-form-item>
            <el-form-item :label="t('aiConv.model')">
              <el-select v-model="apiSettings.openai.model" style="width: 100%;">
                <el-option label="GPT-4" value="gpt-4" />
                <el-option label="GPT-4 Turbo" value="gpt-4-turbo-preview" />
                <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('aiConv.streamOutput')">
              <el-switch v-model="apiSettings.openai.stream" />
              <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px;">{{ t('aiConv.streamHint') }}</span>
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
            <el-form-item :label="t('aiConv.apiAddress')">
              <el-input
                v-model="apiSettings.claude.baseUrl"
                placeholder="https://api.anthropic.com"
              />
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">{{ t('aiConv.defaultHint') }} https://api.anthropic.com{{ t('aiConv.claudeProxyHint') }}</span>
            </el-form-item>
            <el-form-item :label="t('aiConv.model')">
              <el-input
                v-model="apiSettings.claude.model"
                :placeholder="t('aiConv.exampleModel')"
              />
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">{{ t('aiConv.claudeModelHint') }}</span>
            </el-form-item>
            <el-form-item :label="t('aiConv.streamOutput')">
              <el-switch v-model="apiSettings.claude.stream" />
              <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px;">{{ t('aiConv.streamTypingHint') }}</span>
            </el-form-item>
            <el-form-item>
              <el-button
                @click="testClaudeApi"
                :loading="testingClaude"
                :disabled="!apiSettings.claude.apiKey || !apiSettings.claude.baseUrl"
              >
                <el-icon v-if="!testingClaude"><Connection /></el-icon>
                {{ t('aiConv.testConnection') }}
              </el-button>
              <el-tag v-if="claudeTestResult === 'success'" type="success" size="small" style="margin-left: 8px;">{{ t('aiConv.connected') }}</el-tag>
              <el-tag v-if="claudeTestResult === 'failed'" type="danger" size="small" style="margin-left: 8px;">{{ claudeTestError }}</el-tag>
            </el-form-item>
            <el-form-item label="流式输出">
              <el-switch v-model="apiSettings.claude.stream" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane :label="t('aiConv.custom')" name="custom">
          <el-form :model="customApiForm" label-width="100px">
            <el-form-item :label="t('aiConv.providerName')" required>
              <el-input
                v-model="customApiForm.name"
                :placeholder="t('aiConv.namePlaceholder')"
              />
            </el-form-item>
            <el-form-item label="API Key" required>
              <el-input
                v-model="customApiForm.apiKey"
                :placeholder="t('aiConv.apiKeyPlaceholder')"
                type="password"
                show-password
              />
            </el-form-item>
            <el-form-item :label="t('aiConv.apiAddress')" required>
              <el-input
                v-model="customApiForm.baseUrl"
                placeholder="https://api.example.com/v1"
              />
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('aiConv.openaiCompatHint') }}
              </span>
            </el-form-item>
            <el-form-item :label="t('aiConv.modelName')" required>
              <el-input
                v-model="customApiForm.model"
                placeholder="gpt-3.5-turbo"
              />
            </el-form-item>
            <el-form-item :label="t('aiConv.streamOutput')">
              <el-switch v-model="customApiForm.stream" />
              <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px;">
                {{ t('aiConv.streamHint') }}
              </span>
            </el-form-item>

            <!-- 测试按钮和结果 -->
            <el-form-item>
              <el-button
                @click="testCustomApiForm"
                :loading="testingApiForm"
                :disabled="!customApiForm.apiKey || !customApiForm.baseUrl || !customApiForm.model"
              >
                <el-icon v-if="!testingApiForm"><Connection /></el-icon>
                {{ t('aiConv.testConnection') }}
              </el-button>
              <span style="margin-left: 12px; font-size: 13px;">
                <el-tag v-if="customApiFormTestResult === 'success'" type="success" size="small">
                  ✓ {{ t('aiConv.connected') }}
                </el-tag>
                <el-tag v-else-if="customApiFormTestResult === 'failed'" type="danger" size="small">
                  ✗ 连接失败
                </el-tag>
                <span v-else style="color: var(--el-text-color-secondary);">{{ t('aiConv.testApiHint') }}</span>
              </span>
            </el-form-item>

            <!-- 测试错误信息 -->
            <el-alert
              v-if="customApiFormTestError"
              :title="customApiFormTestError"
              type="error"
              :closable="false"
              style="margin-bottom: 16px;"
            />

            <!-- 保存按钮 -->
            <el-form-item>
              <el-button
                type="primary"
                @click="saveCustomApiFromTab"
                :disabled="!customApiForm.name || !customApiForm.apiKey || !customApiForm.baseUrl || !customApiForm.model"
              >
                {{ isEditingCustomApi ? t('aiConv.updateConfig') : t('aiConv.addToList') }}
              </el-button>
              <el-button v-if="isEditingCustomApi" @click="cancelEditCustomApi">
                取消编辑
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane :label="t('aiConv.customList')" name="custom-list">
          <el-table :data="apiSettings.customApis" style="width: 100%" border class="custom-api-table">
            <el-table-column prop="name" :label="t('aiConv.nameCol')" width="120" show-overflow-tooltip />
            <el-table-column prop="baseUrl" label="API 地址" min-width="200" show-overflow-tooltip />
            <el-table-column prop="model" :label="t('aiConv.modelCol')" width="140" show-overflow-tooltip />
            <el-table-column :label="t('aiConv.streamCol')" width="60" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.stream ? 'success' : 'info'" size="small">
                  {{ scope.row.stream ? t('aiConv.yes') : t('aiConv.no') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('aiConv.statusCol')" width="80" align="center">
              <template #default="scope">
                <el-tooltip :content="scope.row.lastTestTime || t('aiConv.notTested')" placement="top">
                  <el-tag v-if="scope.row.testStatus === 'success'" type="success" size="small">
                    ✓ 正常
                  </el-tag>
                  <el-tag v-else-if="scope.row.testStatus === 'failed'" type="danger" size="small">
                    ✗ 失败
                  </el-tag>
                  <el-tag v-else type="info" size="small">
                    未测试
                  </el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column :label="t('aiConv.operationsCol')" width="140" align="center" fixed="right">
              <template #default="scope">
                <el-button 
                  circle
                  size="small" 
                  @click="testCustomApiById(scope.row.id)"
                  :loading="testingApiId === scope.row.id"
                  :title="t('aiConv.testConnection')"
                >
                  <el-icon><Connection /></el-icon>
                </el-button>
                <el-button 
                  circle
                  size="small" 
                  type="primary" 
                  @click="editCustomApiFromList(scope.row)"
                  :title="t('aiConv.editBtn')"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button 
                  circle
                  size="small" 
                  type="danger" 
                  @click="deleteCustomApi(scope.row.id)"
                  :title="t('aiConv.deleteBtn')"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-empty v-if="apiSettings.customApis.length === 0" :description="t('aiConv.noCustomApis')" style="margin-top: 40px;" />
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showSettingsDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 自定义API添加/编辑对话框 -->
    <el-dialog
      v-model="showCustomApiDialog"
      :title="isEditingCustomApi ? t('aiConv.editCustomApi') : t('aiConv.addCustomApi')"
      width="600px"
    >
      <el-form :model="customApiForm" label-width="100px">
        <el-form-item :label="t('aiConv.providerName')" required>
          <el-input
            v-model="customApiForm.name"
            :placeholder="t('aiConv.namePlaceholder')"
          />
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input
            v-model="customApiForm.apiKey"
            :placeholder="t('aiConv.apiKeyPlaceholder')"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('aiConv.apiAddress')" required>
          <el-input
            v-model="customApiForm.baseUrl"
            placeholder="https://api.example.com/v1"
          />
          <span style="font-size: 12px; color: var(--el-text-color-secondary);">
            {{ t('aiConv.openaiCompatHint') }}
          </span>
        </el-form-item>
        <el-form-item :label="t('aiConv.modelName')" required>
          <el-input
            v-model="customApiForm.model"
            placeholder="gpt-3.5-turbo"
          />
        </el-form-item>
        <el-form-item :label="t('aiConv.streamOutput')">
          <el-switch v-model="customApiForm.stream" />
          <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px;">
            {{ t('aiConv.streamHint') }}
          </span>
        </el-form-item>

        <!-- 测试按钮和结果 -->
        <el-form-item>
          <el-button
            @click="testCustomApiForm"
            :loading="testingApiForm"
            :disabled="!customApiForm.apiKey || !customApiForm.baseUrl || !customApiForm.model"
          >
            <el-icon v-if="!testingApiForm"><Connection /></el-icon>
            {{ t('aiConv.testConnection') }}
          </el-button>
          <span style="margin-left: 12px; font-size: 13px;">
            <el-tag v-if="customApiFormTestResult === 'success'" type="success" size="small">
              ✓ {{ t('aiConv.connected') }}
            </el-tag>
            <el-tag v-else-if="customApiFormTestResult === 'failed'" type="danger" size="small">
              ✗ 连接失败
            </el-tag>
            <span v-else style="color: var(--el-text-color-secondary);">{{ t('aiConv.testApiHint') }}</span>
          </span>
        </el-form-item>

        <!-- 测试错误信息 -->
        <el-alert
          v-if="customApiFormTestError"
          :title="customApiFormTestError"
          type="error"
          :closable="false"
          style="margin-bottom: 16px;"
        />
      </el-form>

      <template #footer>
        <el-button @click="showCustomApiDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCustomApi">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { fetch } from '@tauri-apps/plugin-http'
import { Plus, Setting, Delete, Connection, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import Database from '@tauri-apps/plugin-sql'
import { t } from '@/i18n'
import { loadConfig, saveConfig } from '@/utils/tauri/store'

// 数据库实例
let db = null
let tablesEnsured = false
async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:productivity.db')
  }
  if (!tablesEnsured) {
    await db.execute(`CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await db.execute(`CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )`)
    tablesEnsured = true
  }
  return db
}

// Markdown 渲染器配置
// 安全:html=false 让 markdown-it 转义嵌入的原生 HTML。
// AI 流式输出/用户输入若含 <script>... 会被当文本展示而非执行。
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs-code-block"><div class="code-header"><span class="code-lang">${lang}</span><button class="copy-code-btn" onclick="copyCode(this)">Copy</button></div><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (e) {}
    }
    return `<pre class="hljs-code-block"><div class="code-header"><button class="copy-code-btn" onclick="copyCode(this)">Copy</button></div><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 全局复制代码函数
// 注:挂到 window 是为了让通过 v-html 渲染出来的 onclick="copyCode(this)" 能找到它。
// 旧实现没有清理,组件多次挂卸/打开多个 AI 对话时:
//   1) 全局命名空间被污染
//   2) 后挂载的实例覆盖前一个,所有按钮都点到最后那个实例
// onBeforeUnmount 里 delete 掉,且只在没人占用时才设置(同时打开多窗口时第一个 mount 即 own)。
const __prevCopyCode = window.copyCode
window.copyCode = function(button) {
  const codeBlock = button.closest('.hljs-code-block')
  const code = codeBlock.querySelector('code').textContent
  navigator.clipboard.writeText(code).then(() => {
    button.textContent = 'Copied!'
    setTimeout(() => {
      button.textContent = 'Copy'
    }, 2000)
  })
}
onBeforeUnmount(() => {
  // 卸载时中断 in-flight 的 AI 请求,避免占用配额并防止响应继续写入已 dispose 的 ref。
  abortAIRequest()
  // 还原成上一个挂载者的实现(若有),否则 delete 掉
  if (__prevCopyCode) {
    window.copyCode = __prevCopyCode
  } else {
    try { delete window.copyCode } catch { window.copyCode = undefined }
  }
})

// 状态管理
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const streamingContent = ref('')

// AI 会话请求中止控制
// 旧实现:fetch 没有 signal,用户切到别的页面/换模型/重新提问后,旧的流式请求会继续读完整个响应,
// 浪费 token + 网络带宽,新旧响应交错写入 streamingContent 还会导致 UI 错乱。
// 同一时刻只允许一个进行中的对话请求 —— 发新请求 / 切对话 / 卸载组件前都先 abort 旧的。
let aiAbortController = null
const abortAIRequest = () => {
  if (aiAbortController) {
    try { aiAbortController.abort() } catch {}
    aiAbortController = null
  }
}
const selectedModel = ref('')
const showSettingsDialog = ref(false)
const showCustomApiDialog = ref(false)
const activeSettingsTab = ref('openai')
const messagesContainer = ref(null)
const inputRef = ref(null)

// 对话历史
const conversationList = ref([])
const currentConversationId = ref('')
const sidebarCollapsed = ref(true)

// AI 模型列表
const aiModels = computed(() => {
  const models = [
    { id: 'openai-gpt4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'openai-gpt35', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'claude-opus', name: `Claude (${apiSettings.value.claude.model})`, provider: 'Anthropic' }
  ]

  // 添加所有自定义API配置
  apiSettings.value.customApis.forEach(api => {
    models.push({
      id: `custom-${api.id}`,
      name: api.name,
      provider: 'Custom'
    })
  })

  return models
})

// API 设置
const apiSettings = ref({
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    stream: true
  },
  claude: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229',
    stream: true
  },
  customApis: [] // 自定义API列表
})

// 自定义API表单
const customApiForm = ref({
  id: '',
  name: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  stream: true
})

const isEditingCustomApi = ref(false)
const testingApiId = ref('')
const testingApiForm = ref(false)
const customApiFormTestResult = ref('') // success | failed | ''
const customApiFormTestError = ref('')

// Claude 测试连接
const testingClaude = ref(false)
const claudeTestResult = ref('') // success | failed | ''
const claudeTestError = ref('')

// 当前模型信息
const currentModelInfo = computed(() => {
  return aiModels.value.find(m => m.id === selectedModel.value)
})

// ==================== 数据库持久化 ====================

// 加载对话列表
const loadConversationList = async () => {
  try {
    const database = await getDb()
    const rows = await database.select(
      'SELECT id, title, model, created_at, updated_at FROM ai_conversations ORDER BY updated_at DESC'
    )
    conversationList.value = rows
  } catch (e) {
    console.error('加载对话列表失败:', e)
  }
}

// 加载指定对话的消息
const loadMessages = async (conversationId) => {
  try {
    const database = await getDb()
    const rows = await database.select(
      'SELECT role, content, timestamp FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC',
      [conversationId]
    )
    messages.value = rows
  } catch (e) {
    console.error('加载消息失败:', e)
  }
}

// 保存消息到数据库
const saveMessage = async (conversationId, role, content, timestamp) => {
  try {
    const database = await getDb()
    await database.execute(
      'INSERT INTO ai_messages (conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
      [conversationId, role, content, timestamp]
    )
    // 更新对话的 updated_at
    const now = new Date().toISOString()
    await database.execute(
      'UPDATE ai_conversations SET updated_at = ? WHERE id = ?',
      [now, conversationId]
    )
  } catch (e) {
    console.error('保存消息失败:', e)
  }
}

// 创建新对话记录
const createConversation = async (title, model) => {
  try {
    const database = await getDb()
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 8)
    const now = new Date().toISOString()
    await database.execute(
      'INSERT INTO ai_conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, title, model || '', now, now]
    )
    await loadConversationList()
    return id
  } catch (e) {
    console.error('创建对话失败:', e)
    return null
  }
}

// 更新对话标题
const updateConversationTitle = async (id, title) => {
  try {
    const database = await getDb()
    await database.execute(
      'UPDATE ai_conversations SET title = ? WHERE id = ?',
      [title, id]
    )
    await loadConversationList()
  } catch (e) {
    console.error('更新对话标题失败:', e)
  }
}

// 删除对话及其消息
const deleteConversationFromDb = async (id) => {
  try {
    const database = await getDb()
    await database.execute('DELETE FROM ai_messages WHERE conversation_id = ?', [id])
    await database.execute('DELETE FROM ai_conversations WHERE id = ?', [id])
  } catch (e) {
    console.error('删除对话失败:', e)
  }
}

// 格式化时间显示
const formatTime = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ==================== 对话操作 ====================

// 切换对话
const switchConversation = async (conversationId) => {
  if (conversationId === currentConversationId.value) return
  // 同 newConversation:切对话前中断上一个对话还在跑的流式请求
  abortAIRequest()
  currentConversationId.value = conversationId
  await loadMessages(conversationId)
  scrollToBottom()
}

// 删除对话（侧边栏）
const deleteConversation = (id) => {
  ElMessageBox.confirm(t('aiConv.confirmDeleteConv'), t('aiConv.hint'), {
    type: 'warning'
  }).then(async () => {
    await deleteConversationFromDb(id)
    await loadConversationList()

    if (id === currentConversationId.value) {
      // 删除的是当前对话，切换到最新的或清空
      if (conversationList.value.length > 0) {
        const next = conversationList.value[0]
        currentConversationId.value = next.id
        await loadMessages(next.id)
      } else {
        currentConversationId.value = ''
        messages.value = []
      }
    }
    ElMessage.success(t('aiConv.convDeleted'))
  }).catch(() => {})
}

// 渲染 Markdown
const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// 自动调整textarea高度
const adjustTextareaHeight = () => {
  const textarea = inputRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 200) // 最大高度200px
  textarea.style.height = newHeight + 'px'
}


// 加载设置
const loadSettings = () => {
  const saved = localStorage.getItem('ai_api_settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // 确保新字段存在
      apiSettings.value = {
        ...apiSettings.value,
        ...parsed,
        openai: { ...apiSettings.value.openai, ...(parsed.openai || {}) },
        claude: { ...apiSettings.value.claude, ...(parsed.claude || {}) },
        customApis: (parsed.customApis || []).map(api => ({
          ...api,
          testStatus: api.testStatus || '',
          lastTestTime: api.lastTestTime || ''
        }))
      }
    } catch (e) {}
  }

  const savedModel = localStorage.getItem('ai_selected_model')
  if (savedModel) {
    selectedModel.value = savedModel
  }
}

// 保存设置
const saveSettings = () => {
  localStorage.setItem('ai_api_settings', JSON.stringify(apiSettings.value))
  ElMessage.success(t('aiConv.settingsSaved'))
  showSettingsDialog.value = false
}

// 从"自定义"标签页保存配置
const saveCustomApiFromTab = () => {
  // 验证表单
  if (!customApiForm.value.name || !customApiForm.value.apiKey ||
      !customApiForm.value.baseUrl || !customApiForm.value.model) {
    ElMessage.warning(t('aiConv.fillAllRequired'))
    return
  }

  // 验证URL格式
  const baseUrl = customApiForm.value.baseUrl.trim()
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    ElMessage.warning('API 地址必须以 http:// 或 https:// 开头')
    return
  }

  const apiToSave = {
    id: customApiForm.value.id,
    name: customApiForm.value.name,
    apiKey: customApiForm.value.apiKey,
    baseUrl: customApiForm.value.baseUrl,
    model: customApiForm.value.model,
    stream: customApiForm.value.stream
  }

  if (isEditingCustomApi.value) {
    // 编辑模式：更新现有配置
    const index = apiSettings.value.customApis.findIndex(api => api.id === customApiForm.value.id)
    if (index !== -1) {
      // 保留原有的测试状态
      apiToSave.testStatus = apiSettings.value.customApis[index].testStatus
      apiToSave.lastTestTime = apiSettings.value.customApis[index].lastTestTime
      apiSettings.value.customApis[index] = apiToSave
      ElMessage.success(t('aiConv.configUpdated'))
      // 清空表单，退出编辑模式
      resetCustomApiForm()
    }
  } else {
    // 添加模式：添加新配置
    apiSettings.value.customApis.push(apiToSave)
    ElMessage.success(t('aiConv.configAdded'))
    // 清空表单
    resetCustomApiForm()
  }

  saveSettings()
}

// 从列表点击编辑
const editCustomApiFromList = (api) => {
  customApiForm.value = { ...api }
  isEditingCustomApi.value = true
  customApiFormTestResult.value = ''
  customApiFormTestError.value = ''
  // 切换到自定义标签页
  activeSettingsTab.value = 'custom'
  ElMessage.info(t('aiConv.switchedToEdit'))
}

// 取消编辑
const cancelEditCustomApi = () => {
  resetCustomApiForm()
  ElMessage.info(t('aiConv.editCancelled'))
}

// 重置表单
const resetCustomApiForm = () => {
  customApiForm.value = {
    id: Date.now().toString(),
    name: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    stream: true
  }
  isEditingCustomApi.value = false
  customApiFormTestResult.value = ''
  customApiFormTestError.value = ''
}

// 删除自定义API
const deleteCustomApi = (id) => {
  ElMessageBox.confirm(t('aiConv.confirmDeleteApi'), t('aiConv.hint'), {
    type: 'warning'
  }).then(() => {
    const index = apiSettings.value.customApis.findIndex(api => api.id === id)
    if (index !== -1) {
      apiSettings.value.customApis.splice(index, 1)
      ElMessage.success(t('aiConv.deleteSuccess'))
      saveSettings()

      // 如果删除的是当前选中的模型，清空选择
      if (selectedModel.value === `custom-${id}`) {
        selectedModel.value = ''
      }
    }
  }).catch(() => {})
}

// 测试 Claude API 连接
const testClaudeApi = async () => {
  testingClaude.value = true
  claudeTestResult.value = ''
  claudeTestError.value = ''

  try {
    const settings = apiSettings.value.claude
    let baseUrl = settings.baseUrl.trim()

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error('API 地址必须以 http:// 或 https:// 开头')
    }

    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Please reply with "ok" only.' }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()
    if (!data?.content || !Array.isArray(data.content)) {
      throw new Error('API 返回格式不正确')
    }

    claudeTestResult.value = 'success'
    ElMessage.success('Claude 连接测试成功！')
  } catch (error) {
    claudeTestResult.value = 'failed'
    claudeTestError.value = error.message.substring(0, 60)
    ElMessage.error(`测试失败：${error.message}`)
  } finally {
    testingClaude.value = false
  }
}

// 测试表单中的自定义API
const testCustomApiForm = async () => {
  const form = customApiForm.value

  if (!form.apiKey || !form.baseUrl || !form.model) {
    ElMessage.warning(t('aiConv.fillCompleteConfig'))
    return
  }

  testingApiForm.value = true
  customApiFormTestResult.value = ''
  customApiFormTestError.value = ''

  try {
    let baseUrl = form.baseUrl.trim()

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error('API 地址必须以 http:// 或 https:// 开头')
    }

    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${form.apiKey}`
      },
      body: JSON.stringify({
        model: form.model,
        messages: [{ role: 'user', content: 'Please reply with "ok" only.' }],
        max_tokens: 10
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const text = await response.text()
    const data = JSON.parse(text)

    if (!data?.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('API 返回格式不正确，请确认是否为OpenAI兼容接口')
    }

    customApiFormTestResult.value = 'success'
    ElMessage.success(t('aiConv.connectionSuccess'))
  } catch (error) {
    customApiFormTestResult.value = 'failed'
    customApiFormTestError.value = error.message
    ElMessage.error(`测试失败：${error.message}`)
  } finally {
    testingApiForm.value = false
  }
}

// 测试列表中的自定义API
const testCustomApiById = async (id) => {
  const api = apiSettings.value.customApis.find(a => a.id === id)
  if (!api) return

  testingApiId.value = id

  try {
    let baseUrl = api.baseUrl.trim()

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error('API 地址必须以 http:// 或 https:// 开头')
    }

    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.apiKey}`
      },
      body: JSON.stringify({
        model: api.model,
        messages: [{ role: 'user', content: 'Please reply with "ok" only.' }],
        max_tokens: 10
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
    }

    const text = await response.text()
    const data = JSON.parse(text)

    if (!data?.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('API 返回格式不正确')
    }

    // 更新测试状态
    api.testStatus = 'success'
    api.lastTestTime = new Date().toLocaleString()
    saveSettings()

    ElMessage.success({
      message: `${api.name} 连接测试成功！`,
      duration: 3000
    })
  } catch (error) {
    // 更新测试状态
    api.testStatus = 'failed'
    api.lastTestTime = new Date().toLocaleString()
    saveSettings()

    ElMessage.error({
      message: `${api.name} 测试失败：${error.message}`,
      duration: 5000
    })
  } finally {
    testingApiId.value = ''
  }
}

// 模型切换
const onModelChange = () => {
  localStorage.setItem('ai_selected_model', selectedModel.value)
  ElMessage.info(`已切换到 ${currentModelInfo.value.name}`)
}

// 新建对话
const newConversation = async () => {
  // 切对话前 abort 旧的 in-flight 请求,避免上一对话的流式响应继续写入 streamingContent
  abortAIRequest()
  // 直接创建新对话
  const id = await createConversation(t('aiConv.newConversation'), selectedModel.value)
  if (id) {
    currentConversationId.value = id
    messages.value = []
  }
}

// 清空对话（删除当前对话的所有消息+记录）
const clearMessages = () => {
  if (messages.value.length === 0 && !currentConversationId.value) {
    ElMessage.warning(t('aiConv.noConversationRecords'))
    return
  }

  ElMessageBox.confirm(t('aiConv.confirmClearConv'), t('aiConv.hint'), {
    type: 'warning'
  }).then(async () => {
    if (currentConversationId.value) {
      await deleteConversationFromDb(currentConversationId.value)
      await loadConversationList()
    }
    // 创建新空对话
    const id = await createConversation(t('aiConv.newConversation'), selectedModel.value)
    if (id) {
      currentConversationId.value = id
      messages.value = []
    }
    ElMessage.success(t('aiConv.convCleared'))
  }).catch(() => {})
}

// 发送消息
const sendMessage = async () => {
  const content = userInput.value.trim()

  if (!content) {
    return
  }

  if (!selectedModel.value) {
    ElMessage.warning(t('aiConv.selectModelFirst'))
    return
  }

  // 如果没有当前对话，先创建一个
  if (!currentConversationId.value) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    const id = await createConversation(title, selectedModel.value)
    if (!id) {
      ElMessage.error(t('aiConv.createConvFailed'))
      return
    }
    currentConversationId.value = id
  }

  const timestamp = new Date().toLocaleTimeString()

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content,
    timestamp
  })

  // 持久化用户消息
  await saveMessage(currentConversationId.value, 'user', content, timestamp)

  // 如果是第一条消息，更新对话标题
  if (messages.value.length === 1) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    await updateConversationTitle(currentConversationId.value, title)
  }

  userInput.value = ''
  // 重置textarea高度
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
    }
  })
  scrollToBottom()

  // 发起新请求前先 abort 上一个 in-flight 请求(用户连点发送 / 用上一个还没回完就再发),
  // 避免新旧响应交错写入 streamingContent。
  abortAIRequest()
  aiAbortController = new AbortController()

  // 获取当前模型的流式设置
  const modelId = selectedModel.value
  let useStream = false

  if (modelId.startsWith('openai-')) {
    useStream = apiSettings.value.openai.stream
  } else if (modelId.startsWith('claude-')) {
    useStream = apiSettings.value.claude.stream
  } else if (modelId.startsWith('custom-')) {
    const apiId = modelId.replace('custom-', '')
    const customApi = apiSettings.value.customApis.find(api => api.id === apiId)
    useStream = customApi?.stream || false
  }

  if (useStream) {
    // 流式回复
    await sendMessageStream(content)
  } else {
    // 普通回复
    isLoading.value = true
    try {
      const response = await callAIAPI(content)
      const assistantTimestamp = new Date().toLocaleTimeString()
      messages.value.push({
        role: 'assistant',
        content: response,
        timestamp: assistantTimestamp
      })
      await saveMessage(currentConversationId.value, 'assistant', response, assistantTimestamp)
      await loadConversationList()
      scrollToBottom()
    } catch (error) {
      // AbortError 用户主动取消,不视为失败,也不入库
      if (error?.name === 'AbortError') {
        return
      }
      const errTimestamp = new Date().toLocaleTimeString()
      const errContent = `抱歉，我遇到了一些问题：${error.message}`
      ElMessage.error('AI 回复失败: ' + error.message)
      messages.value.push({
        role: 'assistant',
        content: errContent,
        timestamp: errTimestamp
      })
      await saveMessage(currentConversationId.value, 'assistant', errContent, errTimestamp)
    } finally {
      isLoading.value = false
    }
  }
}

// 流式发送消息
const sendMessageStream = async (content) => {
  isLoading.value = true
  isStreaming.value = true
  streamingContent.value = ''

  try {
    const response = await callAIAPIStream(content)

    // 将流式内容添加到消息列表
    const assistantTimestamp = new Date().toLocaleTimeString()
    messages.value.push({
      role: 'assistant',
      content: streamingContent.value,
      timestamp: assistantTimestamp
    })
    await saveMessage(currentConversationId.value, 'assistant', streamingContent.value, assistantTimestamp)
    await loadConversationList()
  } catch (error) {
    // AbortError 是用户主动取消(切换对话/卸载/重发),不应当作"AI 回复失败"
    // 也不写入数据库 —— 否则每次切对话都会留下一条假错误消息。
    if (error?.name === 'AbortError') {
      return
    }
    const errTimestamp = new Date().toLocaleTimeString()
    const errContent = `抱歉，我遇到了一些问题：${error.message}`
    ElMessage.error('AI 回复失败: ' + error.message)
    messages.value.push({
      role: 'assistant',
      content: errContent,
      timestamp: errTimestamp
    })
    await saveMessage(currentConversationId.value, 'assistant', errContent, errTimestamp)
  } finally {
    isStreaming.value = false
    isLoading.value = false
    streamingContent.value = ''
    scrollToBottom()
  }
}

// 调用 AI API (非流式)
const callAIAPI = async (content) => {
  const modelId = selectedModel.value

  if (modelId.startsWith('openai-')) {
    return await callOpenAI(content, false)
  } else if (modelId.startsWith('claude-')) {
    return await callClaude(content, false)
  } else if (modelId.startsWith('custom-')) {
    const apiId = modelId.replace('custom-', '')
    return await callCustomAPI(apiId, content, false)
  } else {
    throw new Error(t('aiConv.unknownModelType'))
  }
}

// 调用 AI API (流式)
const callAIAPIStream = async (content) => {
  const modelId = selectedModel.value

  if (modelId.startsWith('openai-')) {
    return await callOpenAI(content, true)
  } else if (modelId.startsWith('claude-')) {
    return await callClaude(content, true)
  } else if (modelId.startsWith('custom-')) {
    const apiId = modelId.replace('custom-', '')
    return await callCustomAPI(apiId, content, true)
  } else {
    throw new Error(t('aiConv.unknownModelType'))
  }
}

// 调用 OpenAI API
const callOpenAI = async (content, stream = false) => {
  const settings = apiSettings.value.openai

  if (!settings.apiKey) {
    throw new Error(t('aiConv.configOpenaiKey'))
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
      ],
      stream
    }),
    signal: aiAbortController?.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API 错误: ${error}`)
  }

  if (stream) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta?.content || ''
            if (delta) {
              streamingContent.value += delta
              scrollToBottom()
            }
          } catch (e) {}
        }
      }
    }

    return streamingContent.value
  } else {
    const data = await response.json()
    return data.choices[0].message.content
  }
}

// 调用 Claude API
const callClaude = async (content, stream = false) => {
  const settings = apiSettings.value.claude

  if (!settings.apiKey) {
    throw new Error(t('aiConv.configClaudeKey'))
  }

  // 清理 baseUrl（与测试函数一致）
  let baseUrl = settings.baseUrl.trim()
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      messages: conversationHistory,
      ...(stream ? { stream: true } : {})
    }),
    signal: aiAbortController?.signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    // 代理反测活拦截 → 友好提示
    if (errorText.includes('反测活') || errorText.includes('content_security_policy_blocking')) {
      throw new Error(`代理拦截了该消息（短问候/测试类内容会被过滤），请发送正常对话内容\n\n原始错误 (${response.status}): ${errorText.substring(0, 300)}`)
    }
    throw new Error(`Claude API 错误 (${response.status}): ${errorText.substring(0, 200)}`)
  }

  // 检查响应是否为 JSON（防止代理返回 HTML 错误页面）
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const isSSE = contentType.includes('text/event-stream')

  // 解析非流式 JSON 响应（兼容 Anthropic / OpenAI 格式）
  const parseJsonResponse = (data) => {
    return data.content?.[0]?.text || data.choices?.[0]?.message?.content || ''
  }

  if (stream) {
    // 如果响应不是 SSE 流（代理可能忽略 stream 参数，直接返回 JSON）
    if (isJson || !response.body) {
      const data = await response.json()
      return parseJsonResponse(data)
    }

    // 非 JSON / 非 SSE（HTML 错误页面等）
    if (!isSSE && !isJson) {
      const text = await response.text()
      throw new Error(`API 返回了非预期格式 (${contentType}): ${text.substring(0, 100)}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk

      // 解析 SSE 行
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            let delta = ''
            // Anthropic 原生格式
            if (parsed.type === 'content_block_delta') {
              delta = parsed.delta?.text || ''
            }
            // OpenAI 兼容格式（第三方代理常用）
            else if (parsed.choices?.[0]?.delta?.content) {
              delta = parsed.choices[0].delta.content
            }
            if (delta) {
              streamingContent.value += delta
              scrollToBottom()
            }
          } catch (e) {}
        }
      }
    }

    // 流式解析成功
    if (streamingContent.value) {
      return streamingContent.value
    }

    // 流式未解析到内容 → 尝试把完整响应当作 JSON 解析
    if (fullText.trim()) {
      try {
        const jsonData = JSON.parse(fullText)
        const text = parseJsonResponse(jsonData)
        if (text) return text
      } catch (e) {}
      throw new Error(t('aiConv.streamParseFailed'))
    }

    throw new Error('API 返回了空响应')
  } else {
    if (!isJson) {
      const text = await response.text()
      throw new Error(`API 返回了非 JSON 格式 (${contentType}): ${text.substring(0, 100)}`)
    }
    const data = await response.json()
    return parseJsonResponse(data)
  }
}

// 调用自定义 API
const callCustomAPI = async (apiId, content, stream = false) => {
  const api = apiSettings.value.customApis.find(a => a.id === apiId)

  if (!api) {
    throw new Error(t('aiConv.customApiNotFound'))
  }

  let baseUrl = api.baseUrl.trim()
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  const conversationHistory = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api.apiKey}`
    },
    body: JSON.stringify({
      model: api.model,
      messages: [
        ...conversationHistory,
        { role: 'user', content }
      ],
      stream
    }),
    signal: aiAbortController?.signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`${api.name} API 错误: ${error}`)
  }

  if (stream) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta?.content || ''
            if (delta) {
              streamingContent.value += delta
              scrollToBottom()
            }
          } catch (e) {}
        }
      }
    }

    return streamingContent.value
  } else {
    const data = await response.json()
    return data.choices[0].message.content
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 监听流式内容变化，自动滚动
watch(streamingContent, () => {
  scrollToBottom()
})

// 监听标签页切换
watch(activeSettingsTab, (newTab) => {
  if (newTab === 'custom' && !isEditingCustomApi.value) {
    // 切换到自定义标签页且不是编辑模式时，重置表单
    resetCustomApiForm()
  }
})

onMounted(async () => {
  loadSettings()
  resetCustomApiForm()
  // 加载对话列表并恢复最近对话
  await loadConversationList()
  if (conversationList.value.length > 0) {
    const latest = conversationList.value[0]
    currentConversationId.value = latest.id
    await loadMessages(latest.id)
    scrollToBottom()
  }
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
  background: var(--bg-secondary, var(--el-fill-color-lighter));
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, var(--el-border-color-light));
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
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

/* 主体两栏布局 */
.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 侧边栏 — 与团队讨论一致 */
.conversation-sidebar {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--bg-tertiary, var(--el-fill-color-lighter));
  border-right: 1px solid var(--border-color, var(--el-border-color-light));
  transition: width 0.25s ease, min-width 0.25s ease;
  overflow: hidden;
}

.conversation-sidebar.collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
}

/* 展开态：header 里放新建 + 折叠按钮，一行排列 */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 6px;
}

.sidebar-new-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
  white-space: nowrap;
  background: var(--bg-primary);
}

.sidebar-new-btn:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color);
}

.sidebar-new-btn i {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.sidebar-collapse-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;
  font-size: 13px;
  flex-shrink: 0;
}

.sidebar-collapse-btn:hover {
  color: var(--el-text-color-primary);
  background: var(--el-border-color-light);
}

/* 折叠态：展开按钮浮在聊天区左上角 */
.sidebar-expand-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-regular);
  border-radius: 8px;
  z-index: 20;
  transition: color 0.15s, background 0.15s;
  font-size: 15px;
}

.sidebar-expand-btn:hover {
  color: #111827;
  background: var(--el-fill-color-light);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.sidebar-list::-webkit-scrollbar {
  width: 4px;
}

.sidebar-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin-bottom: 1px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}

.sidebar-item:hover {
  background: #eeeff1;
}

.sidebar-item.active {
  background: var(--el-border-color-light);
}

.sidebar-item-icon {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.sidebar-item-content {
  flex: 1;
  min-width: 0;
}

.sidebar-item-title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.sidebar-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;
  flex-shrink: 0;
}

.sidebar-item:hover .sidebar-item-actions {
  opacity: 1;
}

.sidebar-action-btn {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}

.sidebar-action-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sidebar-empty i {
  font-size: 24px;
  color: var(--el-border-color);
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary, var(--el-fill-color-lighter));
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
  background: var(--bg-secondary, var(--el-fill-color-lighter));
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-regular);
}

.empty-state i {
  font-size: 72px;
  margin-bottom: 20px;
  color: var(--el-border-color);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-state p {
  margin: 6px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.empty-state .hint {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.message-item {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  animation: fadeIn 0.4s ease;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
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
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-item.user .message-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.message-item.assistant .message-avatar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.message-bubble {
  flex: 1;
  position: relative;
}

.message-item.user .message-bubble {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-text {
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.6;
  font-size: 15px;
  word-wrap: break-word;
  max-width: 100%;
}

.user-message {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.assistant-message {
  background: var(--bg-primary, #ffffff);
  color: var(--el-text-color-primary);
  border-radius: 18px 18px 18px 4px;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.message-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  text-align: right;
}

.message-item.user .message-time {
  text-align: right;
}

.message-item.assistant .message-time {
  text-align: left;
}

/* 流式输出光标 — 通过 ::after 伪元素附加到最后一个块级元素末尾 */
.streaming-text :deep(> *:last-child)::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 1.1em;
  background: #10b981;
  margin-left: 3px;
  border-radius: 1px;
  animation: blink 1s steps(1) infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.loading-dots {
  display: flex;
  gap: 6px;
  padding: 16px 20px;
  background: var(--bg-primary);
  border-radius: 18px 18px 18px 4px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
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
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-area {
  padding: 20px;
  background: var(--bg-primary, #ffffff);
  border-top: 1px solid var(--border-color, var(--el-border-color-light));
}

.input-wrapper {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-primary, #ffffff);
  border: 1.5px solid var(--border-color, var(--el-border-color));
  border-radius: 24px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.input-wrapper:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.message-input {
  width: 100%;
  min-height: 52px;
  max-height: 200px;
  padding: 14px 60px 14px 20px;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 24px;
  font-family: "PingFang SC";
  background: transparent;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.message-input::-webkit-scrollbar {
  width: 4px;
}

.message-input::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.message-input::placeholder {
  color: var(--el-text-color-secondary);
}

.message-input:disabled {
  background: var(--el-fill-color-light);
  cursor: not-allowed;
}

.send-button {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--accent-blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.send-button:hover:not(:disabled) {
  background: #337ecc;
  transform: scale(1.05);
}

.send-button:active:not(:disabled) {
  transform: scale(0.95);
}

.send-button:disabled {
  background: var(--el-border-color-light);
  cursor: not-allowed;
  opacity: 0.6;
}

.send-button svg {
  width: 20px;
  height: 20px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-hint {
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 12px;
}

/* Markdown 样式 */
.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(p:first-child) {
  margin-top: 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "PingFang SC";
  font-size: 0.9em;
}

.user-message :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.message-text :deep(.hljs-code-block) {
  margin: 16px 0;
  border-radius: 10px;
  overflow: hidden;
  background: #0d1117;
  border: 1px solid #30363d;
}

.message-text :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
}

.message-text :deep(.code-lang) {
  color: #8b949e;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-text :deep(.copy-code-btn) {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  font-weight: 500;
}

.message-text :deep(.copy-code-btn:hover) {
  background: #30363d;
  border-color: #484f58;
}

.message-text :deep(pre code) {
  display: block;
  padding: 16px;
  overflow-x: auto;
  background: transparent !important;
  color: #c9d1d9;
  line-height: 1.6;
  font-size: 14px;
  font-family: "PingFang SC";
}

.message-text :deep(pre code)::-webkit-scrollbar {
  height: 8px;
}

.message-text :deep(pre code)::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.message-text :deep(pre code)::-webkit-scrollbar-track {
  background: #0d1117;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 12px 0;
  padding-left: 28px;
}

.message-text :deep(li) {
  margin: 6px 0;
  line-height: 1.6;
}

.message-text :deep(blockquote) {
  border-left: 3px solid #10b981;
  padding-left: 16px;
  margin: 16px 0;
  color: var(--el-text-color-regular);
  font-style: italic;
  background: var(--el-fill-color-lighter);
  padding: 12px 16px;
  border-radius: 4px;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid var(--el-border-color-light);
  padding: 10px 14px;
  text-align: left;
}

.message-text :deep(th) {
  background: var(--el-fill-color-lighter);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.message-text :deep(td) {
  background: var(--bg-primary);
}

.message-text :deep(a) {
  color: #10b981;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.message-text :deep(a:hover) {
  border-bottom-color: #10b981;
}

.message-text :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color-light);
  margin: 20px 0;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 16px 0 12px 0;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}

.message-text :deep(h1) { font-size: 1.8em; }
.message-text :deep(h2) { font-size: 1.5em; }
.message-text :deep(h3) { font-size: 1.3em; }
.message-text :deep(h4) { font-size: 1.1em; }

.message-text :deep(strong) {
  font-weight: 600;
  color: #111827;
}

.message-text :deep(em) {
  font-style: italic;
  color: #4b5563;
}

/* 设置对话框样式 */
.settings-dialog :deep(.el-dialog) {
  height: 85vh;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  margin: 0 auto !important;
  overflow: hidden;
}

.settings-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.settings-dialog :deep(.el-dialog__body) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.settings-dialog :deep(.el-dialog__body)::-webkit-scrollbar {
  width: 6px;
}

.settings-dialog :deep(.el-dialog__body)::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.settings-dialog :deep(.el-dialog__body)::-webkit-scrollbar-track {
  background: transparent;
}

.settings-dialog :deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-dialog :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 24px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-light);
}

.settings-dialog :deep(.el-tabs__content) {
  height: 52vh;
  min-height: 380px;
  overflow-y: auto;
  padding: 24px;
  flex-shrink: 0;
}

.settings-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid var(--el-border-color-light);
  padding: 16px 24px;
  background: var(--el-fill-color-lighter);
}

/* 自定义API表格样式 */
.custom-api-table :deep(.el-table__cell) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.custom-api-table :deep(.cell) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.5 !important;
}

.custom-api-table :deep(.el-table__body-wrapper) {
  max-height: 100%;
}
</style>
