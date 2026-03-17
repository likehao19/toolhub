<template>
  <div class="agent-team-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <i class="fas fa-users"></i> {{ t('agentTeam.breadcrumb') }}
        </div>
        <div v-if="isDiscussing" class="discussion-progress">
          <span class="progress-dot"></span>
          {{ t('agentTeam.speaking', { name: currentAgentName, current: currentAgentIndex + 1, total: enabledAgents.length }) }}
        </div>
      </div>
      <div class="header-actions">
        <el-button
          v-if="isDiscussing"
          size="small"
          type="danger"
          @click="stopDiscussion"
          :icon="VideoPause"
        >
          {{ t('agentTeam.stop') }}
        </el-button>
        <el-button
          v-if="hasDiscussion"
          size="small"
          @click="newDiscussion"
          :icon="RefreshRight"
        >
          {{ t('agentTeam.newDiscussion') }}
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-area">
      <!-- 空状态：主题输入 -->
      <div v-if="!hasDiscussion && !isDiscussing" class="topic-section">
        <div class="topic-card">
          <div class="topic-icon">
            <i class="fas fa-users-gear"></i>
          </div>
          <h2 class="topic-title">{{ t('agentTeam.title') }}</h2>
          <p class="topic-desc">{{ t('agentTeam.desc') }}</p>

          <div class="topic-input-area">
            <textarea
              v-model="topic"
              :placeholder="t('agentTeam.topicPlaceholder')"
              class="topic-input"
              rows="3"
              @keydown="handleTopicKeyDown"
            ></textarea>
          </div>

          <div class="agent-selector">
            <span class="selector-label">{{ t('agentTeam.participantLabel') }}</span>
            <div class="agent-chips">
              <div
                v-for="agent in AGENT_ROLES"
                :key="agent.id"
                class="agent-chip"
                :class="{ active: activeAgents.has(agent.id) }"
                :style="activeAgents.has(agent.id) ? { borderColor: agent.color, background: agent.bgColor } : {}"
                @click="toggleAgent(agent.id)"
              >
                <span class="chip-emoji">{{ agent.emoji }}</span>
                <span class="chip-name">{{ agent.name }}</span>
              </div>
            </div>
          </div>

          <el-button
            type="primary"
            size="large"
            @click="startDiscussion"
            :disabled="!topic.trim() || activeAgents.size === 0"
            class="start-btn"
          >
            <i class="fas fa-play" style="margin-right: 6px;"></i>
            {{ t('agentTeam.startDiscussion') }}
          </el-button>
        </div>
      </div>

      <!-- 讨论消息流 -->
      <div v-else class="messages-area" ref="messagesContainer">
        <!-- 主题消息 -->
        <div class="topic-message">
          <div class="topic-message-icon">
            <i class="fas fa-bullhorn"></i>
          </div>
          <div class="topic-message-content">
            <div class="topic-message-label">{{ t('agentTeam.discussionTopic') }}</div>
            <div class="topic-message-text">{{ discussionTopic }}</div>
          </div>
        </div>

        <!-- 角色消息 -->
        <div
          v-for="(msg, index) in discussionMessages"
          :key="index"
          class="agent-message"
          :style="{ '--agent-color': getAgent(msg.agentId)?.color }"
        >
          <div
            class="agent-avatar"
            :style="{ background: getAgent(msg.agentId)?.bgColor, borderColor: getAgent(msg.agentId)?.color }"
          >
            {{ getAgent(msg.agentId)?.emoji }}
          </div>
          <div class="agent-message-body">
            <div class="agent-message-header">
              <span class="agent-name" :style="{ color: getAgent(msg.agentId)?.color }">
                {{ getAgent(msg.agentId)?.name }}
              </span>
              <span v-if="!msg.streaming && msg.content" class="agent-timestamp">
                {{ msg.timestamp }}
              </span>
            </div>
            <div class="agent-message-content" :class="{ streaming: msg.streaming && msg.content }">
              <template v-if="msg.error">
                <div class="agent-error">
                  <i class="fas fa-exclamation-triangle"></i> {{ msg.content }}
                </div>
              </template>
              <template v-else-if="msg.content">
                <div v-html="renderMarkdown(msg.content)"></div>
              </template>
              <template v-else-if="msg.streaming">
                <div class="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 讨论结束后的追问区 -->
        <div v-if="hasDiscussion && !isDiscussing" class="followup-area">
          <div class="followup-divider">
            <span>{{ t('agentTeam.discussionEnd') }}</span>
          </div>
          <div class="followup-input-wrapper">
            <textarea
              v-model="followUpInput"
              :placeholder="t('agentTeam.followUpPlaceholder')"
              class="followup-input"
              rows="2"
              @keydown="handleFollowUpKeyDown"
            ></textarea>
            <button
              class="followup-send-btn"
              @click="continueDiscussion"
              :disabled="!followUpInput.trim()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { t } from '@/i18n'
import { callAIStream, checkAIConfig } from '@/utils/ai/api'
import { ElMessage } from 'element-plus'
import { VideoPause, RefreshRight } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

// ==================== 角色定义 ====================

const AGENT_ROLES = [
  {
    id: 'pm',
    name: t('agentTeam.rolePM'),
    emoji: '\u{1F4CB}',
    color: '#409eff',
    bgColor: 'rgba(64,158,255,0.08)',
    systemPrompt: `你是一位经验丰富的产品经理。在团队讨论中，你从用户需求、市场价值、产品定位和商业可行性的角度分析问题。你善于：
- 定义核心用户场景和需求优先级
- 评估功能的商业价值和投入产出比
- 提出清晰的产品路线图建议
- 关注用户体验和竞品对比
请用简洁专业的语言发表你的观点，必要时引用数据或案例。回复控制在300字以内。`,
    temperature: 0.7
  },
  {
    id: 'dev',
    name: t('agentTeam.roleDev'),
    emoji: '\u{1F4BB}',
    color: '#67c23a',
    bgColor: 'rgba(103,194,58,0.08)',
    systemPrompt: `你是一位资深全栈工程师。在团队讨论中，你从技术架构、实现方案、性能和可维护性的角度分析问题。你善于：
- 评估技术方案的可行性和复杂度
- 提出具体的架构设计和技术选型建议
- 识别潜在的技术风险和瓶颈
- 估算开发工作量和技术债务
请用简洁专业的语言发表你的观点，可以适当使用技术术语。回复控制在300字以内。`,
    temperature: 0.6
  },
  {
    id: 'designer',
    name: t('agentTeam.roleDesigner'),
    emoji: '\u{1F3A8}',
    color: '#e6a23c',
    bgColor: 'rgba(230,162,60,0.08)',
    systemPrompt: `你是一位专业的UI/UX设计师。在团队讨论中，你从用户体验、交互设计、视觉规范和可用性的角度分析问题。你善于：
- 分析用户交互流程和信息架构
- 提出符合设计规范的界面方案
- 关注无障碍性、响应式和一致性
- 引用设计原则和最佳实践
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.8
  },
  {
    id: 'tester',
    name: t('agentTeam.roleTester'),
    emoji: '\u{1F50D}',
    color: '#f56c6c',
    bgColor: 'rgba(245,108,108,0.08)',
    systemPrompt: `你是一位细致的QA测试工程师。在团队讨论中，你从质量保障、边界条件、异常处理和风险控制的角度分析问题。你善于：
- 识别潜在的缺陷和边界条件
- 设计测试策略和验收标准
- 提出自动化测试和持续集成建议
- 关注安全性、兼容性和性能测试
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.5
  },
  {
    id: 'ops',
    name: t('agentTeam.roleOps'),
    emoji: '\u{1F6E0}',
    color: '#af52de',
    bgColor: 'rgba(175,82,222,0.08)',
    systemPrompt: `你是一位经验丰富的DevOps/运维架构师。在团队讨论中，你从部署运维、可观测性、成本控制和系统可靠性的角度分析问题。你善于：
- 设计CI/CD流程和发布策略
- 评估基础设施需求和成本
- 提出监控、告警和灾备方案
- 关注系统稳定性、扩展性和安全合规
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.6
  }
]

// ==================== Markdown 渲染 ====================

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs-code-block"><div class="code-header"><span class="code-lang">${lang}</span><button class="copy-code-btn" onclick="copyCode(this)">${t('agentTeam.copyBtn')}</button></div><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (e) {}
    }
    return `<pre class="hljs-code-block"><div class="code-header"><button class="copy-code-btn" onclick="copyCode(this)">${t('agentTeam.copyBtn')}</button></div><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 复制代码（复用全局函数，如果不存在则注册）
if (!window.copyCode) {
  window.copyCode = function(button) {
    const codeBlock = button.closest('.hljs-code-block')
    const code = codeBlock.querySelector('code').textContent
    navigator.clipboard.writeText(code).then(() => {
      button.textContent = t('agentTeam.copiedBtn')
      setTimeout(() => { button.textContent = t('agentTeam.copyBtn') }, 2000)
    })
  }
}

const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

// ==================== 状态 ====================

const topic = ref('')
const discussionTopic = ref('')
const discussionMessages = ref([])
const activeAgents = ref(new Set(['pm', 'dev', 'designer', 'tester', 'ops']))
const isDiscussing = ref(false)
const currentAgentIndex = ref(0)
const followUpInput = ref('')
const abortFlag = ref(false)
const messagesContainer = ref(null)

const enabledAgents = computed(() =>
  AGENT_ROLES.filter(a => activeAgents.value.has(a.id))
)

const currentAgentName = computed(() => {
  const agent = enabledAgents.value[currentAgentIndex.value]
  return agent?.name || ''
})

const hasDiscussion = computed(() => discussionMessages.value.length > 0)

const getAgent = (agentId) => AGENT_ROLES.find(a => a.id === agentId)

// ==================== 角色切换 ====================

const toggleAgent = (agentId) => {
  const newSet = new Set(activeAgents.value)
  if (newSet.has(agentId)) {
    if (newSet.size > 1) newSet.delete(agentId)
  } else {
    newSet.add(agentId)
  }
  activeAgents.value = newSet
}

// ==================== 上下文构建 ====================

function buildContext(agent, previousMessages, topicText, followUp) {
  const messages = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: `【讨论主题】${topicText}` }
  ]

  for (const msg of previousMessages) {
    const sourceAgent = getAgent(msg.agentId)
    if (sourceAgent && msg.content && !msg.error) {
      messages.push({
        role: 'assistant',
        content: `【${sourceAgent.name}的观点】\n${msg.content}`
      })
      messages.push({ role: 'user', content: '请继续。' })
    }
  }

  if (followUp) {
    messages.push({ role: 'user', content: `【追加问题】${followUp}` })
  }

  // 替换最后一个 "请继续。"
  if (messages.length > 2 && messages[messages.length - 1].content === '请继续。') {
    messages.pop()
  }

  messages.push({
    role: 'user',
    content: previousMessages.length === 0
      ? '请从你的专业角度，对以上主题发表你的观点和建议。'
      : '请从你的专业角度发表观点。你可以补充、支持或质疑前面同事的看法，但请保持专业和建设性。'
  })

  return messages
}

// ==================== 滚动 ====================

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ==================== 讨论控制 ====================

const startDiscussion = async () => {
  if (!topic.value.trim()) return

  if (!checkAIConfig()) {
    ElMessage.warning(t('agentTeam.configWarning'))
    return
  }

  discussionTopic.value = topic.value.trim()
  discussionMessages.value = []
  isDiscussing.value = true
  abortFlag.value = false

  await runAgentDiscussion(discussionTopic.value)
}

const continueDiscussion = async () => {
  const followUp = followUpInput.value.trim()
  if (!followUp) return

  if (!checkAIConfig()) {
    ElMessage.warning(t('agentTeam.configWarningShort'))
    return
  }

  followUpInput.value = ''
  isDiscussing.value = true
  abortFlag.value = false

  // 添加追问分隔
  discussionMessages.value.push({
    agentId: '_followup',
    content: followUp,
    streaming: false,
    isFollowUp: true
  })

  await runAgentDiscussion(discussionTopic.value, followUp)
}

const runAgentDiscussion = async (topicText, followUp = null) => {
  const agents = enabledAgents.value

  // 收集本轮之前已完成的消息（不含追问分隔）
  const previousRoundMessages = discussionMessages.value.filter(
    m => !m.isFollowUp && !m.streaming && m.content && !m.error
  )

  for (let i = 0; i < agents.length; i++) {
    if (abortFlag.value) break

    const agent = agents[i]
    currentAgentIndex.value = i

    // 添加占位消息
    const msgIndex = discussionMessages.value.length
    discussionMessages.value.push({
      agentId: agent.id,
      content: '',
      streaming: true,
      error: false,
      timestamp: ''
    })
    scrollToBottom()

    // 收集本轮前面角色的已完成消息
    const contextMessages = [
      ...previousRoundMessages,
      ...discussionMessages.value.slice(
        previousRoundMessages.length,
        msgIndex
      ).filter(m => !m.isFollowUp && m.content && !m.error && !m.streaming)
    ]

    const apiMessages = buildContext(agent, contextMessages, topicText, followUp)

    try {
      await callAIStream(apiMessages, (chunk, fullContent) => {
        discussionMessages.value[msgIndex].content = fullContent
        scrollToBottom()
      }, {
        temperature: agent.temperature,
        maxTokens: 1000
      })

      discussionMessages.value[msgIndex].streaming = false
      discussionMessages.value[msgIndex].timestamp = new Date().toLocaleTimeString()
    } catch (error) {
      discussionMessages.value[msgIndex].streaming = false
      discussionMessages.value[msgIndex].error = true
      discussionMessages.value[msgIndex].content = t('agentTeam.apiCallFailed', { msg: error.message })
      discussionMessages.value[msgIndex].timestamp = new Date().toLocaleTimeString()
    }

    scrollToBottom()
  }

  isDiscussing.value = false
}

const stopDiscussion = () => {
  abortFlag.value = true
  ElMessage.info(t('agentTeam.stoppingAfterCurrent'))
}

const newDiscussion = () => {
  discussionMessages.value = []
  discussionTopic.value = ''
  topic.value = ''
  followUpInput.value = ''
  isDiscussing.value = false
  abortFlag.value = false
}

// ==================== 键盘事件 ====================

const handleTopicKeyDown = (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    startDiscussion()
  }
}

const handleFollowUpKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    continueDiscussion()
  }
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.agent-team-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-secondary, #f9fafb);
}

/* ==================== Header ==================== */

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e4e7ed);
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
  color: var(--text-secondary, #606f7b);
  background: var(--bg-tertiary, #f0f2f5);
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb i {
  color: #409eff;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.discussion-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ==================== 主题输入区 ==================== */

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topic-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.topic-card {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.topic-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #409eff;
}

.topic-icon i {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.topic-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin: 0 0 8px;
}

.topic-desc {
  font-size: 14px;
  color: var(--text-tertiary, #9ca3af);
  margin: 0 0 28px;
}

.topic-input-area {
  margin-bottom: 20px;
}

.topic-input {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--border-color, #d1d5db);
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #1f2937);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.topic-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.topic-input::placeholder {
  color: var(--text-quaternary, #c0c4cc);
}

.agent-selector {
  margin-bottom: 24px;
}

.selector-label {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  display: block;
  margin-bottom: 10px;
}

.agent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.agent-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1.5px solid var(--border-color, #e5e7eb);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  background: var(--bg-primary, #ffffff);
}

.agent-chip:hover {
  border-color: #c0c4cc;
}

.agent-chip.active {
  font-weight: 500;
}

.chip-emoji {
  font-size: 16px;
}

.chip-name {
  font-size: 13px;
  color: var(--text-primary, #374151);
}

.start-btn {
  min-width: 160px;
  border-radius: 10px;
  font-size: 15px;
}

/* ==================== 消息区域 ==================== */

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 0;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

/* 主题消息 */
.topic-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto 28px;
  padding: 16px 20px;
  background: var(--bg-primary, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.topic-message-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.topic-message-content {
  flex: 1;
  min-width: 0;
}

.topic-message-label {
  font-size: 12px;
  color: var(--text-tertiary, #9ca3af);
  margin-bottom: 4px;
  font-weight: 500;
}

.topic-message-text {
  font-size: 15px;
  color: var(--text-primary, #1f2937);
  line-height: 1.6;
  word-break: break-word;
}

/* 角色消息 */
.agent-message {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto 24px;
  animation: fadeSlideIn 0.4s ease;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.agent-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  border: 1.5px solid;
}

.agent-message-body {
  flex: 1;
  min-width: 0;
}

.agent-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.agent-name {
  font-size: 13px;
  font-weight: 600;
}

.agent-timestamp {
  font-size: 11px;
  color: var(--text-quaternary, #c0c4cc);
}

.agent-message-content {
  padding: 14px 18px;
  background: var(--bg-primary, #ffffff);
  border-radius: 4px 16px 16px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-left: 3px solid var(--agent-color, #409eff);
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary, #1f2937);
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.agent-error {
  color: #f56c6c;
  font-size: 13px;
}

.agent-error i {
  margin-right: 4px;
}

/* 流式光标 */
.agent-message-content.streaming :deep(> *:last-child)::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 1.1em;
  background: var(--agent-color, #409eff);
  margin-left: 3px;
  border-radius: 1px;
  animation: blink 1s steps(1) infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Loading dots */
.loading-dots {
  display: flex;
  gap: 6px;
  padding: 4px 0;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--agent-color, #409eff);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* ==================== 追问区 ==================== */

.followup-area {
  max-width: 800px;
  margin: 8px auto 24px;
}

.followup-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: var(--text-quaternary, #c0c4cc);
  font-size: 12px;
}

.followup-divider::before,
.followup-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color, #e5e7eb);
}

.followup-input-wrapper {
  position: relative;
  background: var(--bg-primary, #ffffff);
  border: 1.5px solid var(--border-color, #d1d5db);
  border-radius: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.followup-input-wrapper:focus-within {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.followup-input {
  width: 100%;
  padding: 12px 50px 12px 16px;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  background: transparent;
  color: var(--text-primary, #1f2937);
  box-sizing: border-box;
}

.followup-input::placeholder {
  color: var(--text-quaternary, #c0c4cc);
}

.followup-send-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.followup-send-btn:hover:not(:disabled) {
  background: #337ecc;
  transform: scale(1.05);
}

.followup-send-btn:disabled {
  background: #e4e7ed;
  cursor: not-allowed;
  opacity: 0.6;
}

/* ==================== Markdown 样式 ==================== */

.agent-message-content :deep(p) {
  margin: 8px 0;
}

.agent-message-content :deep(p:first-child) {
  margin-top: 0;
}

.agent-message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.agent-message-content :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.agent-message-content :deep(.hljs-code-block) {
  margin: 12px 0;
  border-radius: 10px;
  overflow: hidden;
  background: #0d1117;
  border: 1px solid #30363d;
}

.agent-message-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
}

.agent-message-content :deep(.code-lang) {
  color: #8b949e;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.agent-message-content :deep(.copy-code-btn) {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.agent-message-content :deep(.copy-code-btn:hover) {
  background: #30363d;
}

.agent-message-content :deep(pre code) {
  display: block;
  padding: 14px;
  overflow-x: auto;
  background: transparent !important;
  color: #c9d1d9;
  line-height: 1.6;
  font-size: 13px;
}

.agent-message-content :deep(ul),
.agent-message-content :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.agent-message-content :deep(li) {
  margin: 4px 0;
  line-height: 1.6;
}

.agent-message-content :deep(blockquote) {
  border-left: 3px solid var(--agent-color, #409eff);
  padding: 8px 14px;
  margin: 12px 0;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-tertiary, #f9fafb);
  border-radius: 4px;
}

.agent-message-content :deep(strong) {
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.agent-message-content :deep(h1),
.agent-message-content :deep(h2),
.agent-message-content :deep(h3),
.agent-message-content :deep(h4) {
  margin: 14px 0 8px;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.agent-message-content :deep(h3) { font-size: 1.1em; }
.agent-message-content :deep(h4) { font-size: 1em; }

.agent-message-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}

.agent-message-content :deep(th),
.agent-message-content :deep(td) {
  border: 1px solid var(--border-color, #e5e7eb);
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
}

.agent-message-content :deep(th) {
  background: var(--bg-tertiary, #f9fafb);
  font-weight: 600;
}

.agent-message-content :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.agent-message-content :deep(a:hover) {
  text-decoration: underline;
}
</style>
