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
          <template v-if="singleAgentMode">
            {{ getAgent(singleAgentMode)?.name }} 正在回答...
          </template>
          <template v-else>
            {{ t('agentTeam.speaking', { name: currentAgentName, current: currentAgentIndex + 1, total: enabledAgents.length }) }}
          </template>
        </div>
      </div>
      <div class="header-actions">
        <el-button
          size="small"
          @click="showRolesDialog = true"
          :icon="UserFilled"
        >
          管理角色
        </el-button>
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

    <!-- 主体：侧栏 + 主区 -->
    <div class="main-body">
      <!-- 历史会话侧边栏 -->
      <div class="conversation-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <template v-if="!sidebarCollapsed">
          <div class="sidebar-header">
            <div class="sidebar-new-btn" @click="newDiscussion" title="新建讨论">
              <i class="fas fa-plus"></i>
              <span>新讨论</span>
            </div>
            <div class="sidebar-collapse-btn" @click="sidebarCollapsed = true" title="收起历史">
              <i class="fas fa-angles-left"></i>
            </div>
          </div>
          <div class="sidebar-list">
            <div
              v-for="sess in sessionList"
              :key="sess.id"
              class="sidebar-item"
              :class="{ active: sess.id === currentSessionId }"
              @click="switchSession(sess.id)"
            >
              <i class="fas fa-comments sidebar-item-icon"></i>
              <div class="sidebar-item-content">
                <div class="sidebar-item-title">{{ sess.title }}</div>
              </div>
              <div class="sidebar-item-actions" @click.stop>
                <i class="fas fa-trash-can sidebar-action-btn" @click="onDeleteSession(sess.id)"></i>
              </div>
            </div>
            <div v-if="sessionList.length === 0" class="sidebar-empty">
              <i class="fas fa-inbox"></i>
              <span>暂无历史讨论</span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="sidebarCollapsed" class="sidebar-expand-btn" @click="sidebarCollapsed = false" title="展开历史">
        <i class="fas fa-bars"></i>
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
                  v-for="agent in allRoles"
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
          <div v-if="discussionTopic" class="topic-message">
            <div class="topic-message-icon">
              <i class="fas fa-bullhorn"></i>
            </div>
            <div class="topic-message-content">
              <div class="topic-message-label">{{ t('agentTeam.discussionTopic') }}</div>
              <div class="topic-message-text">{{ discussionTopic }}</div>
            </div>
          </div>

          <!-- 消息列表 -->
          <template v-for="(msg, index) in discussionMessages" :key="msg.dbId || index">
            <!-- 用户追问消息（白底气泡） -->
            <div v-if="msg.isFollowUp || msg.isUser" class="user-message">
              <div class="user-message-bubble">
                <div class="user-message-content" v-html="renderMentionHighlight(msg.content)"></div>
                <div v-if="msg.timestamp" class="user-message-timestamp">{{ msg.timestamp }}</div>
              </div>
              <div class="user-message-avatar">
                <i class="fas fa-user"></i>
              </div>
            </div>
            <!-- Agent 消息 -->
            <div
              v-else
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
          </template>
        </div>

        <!-- 底部追问区（讨论开始后常驻） -->
        <div v-if="hasDiscussion" class="followup-area">
          <div v-if="!isDiscussing" class="followup-divider">
            <span>{{ t('agentTeam.discussionEnd') }} · 可继续追问，输入 @ 选择角色</span>
          </div>
          <div class="followup-input-wrapper" :class="{ disabled: isDiscussing }">
            <!-- @ 候选浮窗 -->
            <div v-if="mentionMenuVisible" class="mention-menu">
              <div class="mention-menu-title">选择角色</div>
              <div
                v-for="(role, idx) in mentionCandidates"
                :key="role.id"
                class="mention-item"
                :class="{ active: idx === mentionActiveIndex }"
                @mousedown.prevent="pickMention(role)"
                @mouseenter="mentionActiveIndex = idx"
              >
                <span class="mention-emoji">{{ role.emoji }}</span>
                <span class="mention-name" :style="{ color: role.color }">{{ role.name }}</span>
              </div>
              <div v-if="mentionCandidates.length === 0" class="mention-empty">
                没有匹配的角色
              </div>
            </div>

            <textarea
              ref="followUpRef"
              v-model="followUpInput"
              :placeholder="isDiscussing ? '讨论进行中...' : t('agentTeam.followUpPlaceholder')"
              class="followup-input"
              rows="2"
              :disabled="isDiscussing"
              @keydown="handleFollowUpKeyDown"
              @input="onFollowUpInput"
              @blur="hideMentionMenu"
            ></textarea>
            <button
              class="followup-send-btn"
              @click="continueDiscussion"
              :disabled="!followUpInput.trim() || isDiscussing"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色管理对话框 -->
    <el-dialog
      v-model="showRolesDialog"
      width="1100px"
      class="roles-dialog"
    >
      <template #header>
        <div class="roles-dialog-header">
          <div class="roles-dialog-title">
            <span>角色管理</span>
            <span class="roles-tip">内置角色不可删除，但可作为模板"复制为自定义"</span>
          </div>
          <el-button type="primary" size="small" @click="openRoleEditor()" :icon="Plus">
            新建自定义角色
          </el-button>
        </div>
      </template>

      <div class="roles-table-wrapper">
        <el-table :data="allRoles" style="width: 100%;" border height="100%" size="small">
          <el-table-column label="角色" width="160">
            <template #default="{ row }">
              <div class="role-cell">
                <span class="role-cell-emoji" :style="{ background: row.bgColor, borderColor: row.color }">
                  {{ row.emoji }}
                </span>
                <span class="role-cell-name" :style="{ color: row.color }">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="72" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isBuiltin ? 'info' : 'success'" size="small">
                {{ row.isBuiltin ? '内置' : '自定义' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="温度" width="64" align="center">
            <template #default="{ row }">{{ row.temperature?.toFixed?.(2) ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="提示词" min-width="280">
            <template #default="{ row }">
              <div class="role-prompt-preview" :title="row.systemPrompt">{{ row.systemPrompt }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="cloneRole(row)" :icon="CopyDocument" circle title="复制为自定义" />
              <el-button
                v-if="!row.isBuiltin"
                size="small"
                type="primary"
                @click="openRoleEditor(row)"
                :icon="Edit"
                circle
                title="编辑"
              />
              <el-button
                v-if="!row.isBuiltin"
                size="small"
                type="danger"
                @click="onDeleteRole(row)"
                :icon="Delete"
                circle
                title="删除"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="showRolesDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 角色编辑对话框 -->
    <el-dialog
      v-model="showRoleEditor"
      :title="roleForm.id ? '编辑角色' : '新建角色'"
      width="640px"
      top="8vh"
      append-to-body
    >
      <el-form :model="roleForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="roleForm.name" placeholder="例如：小红书博主" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="表情符号" required>
          <el-input v-model="roleForm.emoji" placeholder="例如：✨" maxlength="4" />
          <div class="emoji-picker">
            <span
              v-for="e in suggestedEmojis"
              :key="e"
              class="emoji-suggest"
              @click="roleForm.emoji = e"
            >{{ e }}</span>
          </div>
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="roleForm.color" />
          <span style="margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary);">{{ roleForm.color }}</span>
        </el-form-item>
        <el-form-item label="温度">
          <el-slider
            v-model="roleForm.temperature"
            :min="0"
            :max="1"
            :step="0.05"
            show-input
            :show-input-controls="false"
            style="max-width: 360px;"
          />
          <span style="margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary);">越低越稳定，越高越创意</span>
        </el-form-item>
        <el-form-item label="提示词" required>
          <el-input
            v-model="roleForm.systemPrompt"
            type="textarea"
            :rows="8"
            placeholder="描述这个角色的身份、关注点、表达风格、输出长度..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoleEditor = false">取消</el-button>
        <el-button type="primary" @click="onSaveRole" :disabled="!canSaveRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { t } from '@/i18n'
import { callAIStream, checkAIConfig } from '@/utils/ai/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPause, RefreshRight, UserFilled, Plus, Edit, Delete, CopyDocument } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { useAgentTeam } from '@/composables/useAgentTeam'

// ==================== Composable 状态 ====================

const {
  topic,
  discussionTopic,
  discussionMessages,
  activeAgents,
  isDiscussing,
  currentAgentIndex,
  followUpInput,
  abortFlag,
  currentSessionId,
  allRoles,
  sessionList,
  enabledAgents,
  hasDiscussion,
  currentAgentName,
  getAgent,
  parseMention,
  ensureLoaded,
  saveCustomRole,
  deleteCustomRole,
  loadAllRoles,
  createSession,
  deleteSession,
  loadSession,
  startNewDiscussionView,
  saveMessage,
  updateMessageContent,
  newAbortController,
  abortCurrentStream
} = useAgentTeam()

// ==================== 本地 UI 状态 ====================

const messagesContainer = ref(null)
const followUpRef = ref(null)
const sidebarCollapsed = ref(false)

// 角色管理对话框
const showRolesDialog = ref(false)
const showRoleEditor = ref(false)
const roleForm = ref({
  id: '',
  name: '',
  emoji: '\u{1F31F}',
  color: 'var(--accent-blue)',
  bgColor: 'rgba(64,158,255,0.08)',
  temperature: 0.7,
  systemPrompt: ''
})
const suggestedEmojis = ['\u{1F31F}', '\u{1F680}', '\u{1F4A1}', '\u{1F381}', '\u{1F3AF}', '\u{1F517}', '\u{1F4A0}', '\u{1F389}', '\u{1F525}', '\u{1F308}', '\u{1F4DA}', '\u{1F50E}']

const canSaveRole = computed(() =>
  roleForm.value.name.trim() &&
  roleForm.value.emoji.trim() &&
  roleForm.value.systemPrompt.trim()
)

// @ 候选菜单
const mentionMenuVisible = ref(false)
const mentionCandidates = ref([])
const mentionActiveIndex = ref(0)
const mentionStartIndex = ref(-1)

// 单 agent 模式（被 @ 选中时使用）
const singleAgentMode = ref(null)

// ==================== Markdown 渲染 ====================

// 安全:html=false 让 markdown-it 转义嵌入的原生 HTML。
// AI 流式输出/用户输入若含 <script>... 会被当文本展示而非执行。
// 代码块的 HTML 由我们自己在 highlight 钩子里生成,不来自用户输入,所以仍然可以正常渲染。
const md = new MarkdownIt({
  html: false,
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

// 全局复制代码函数 —— v-html 渲染的 onclick="copyCode(this)" 要能找到它。
// 旧实现 `if (!window.copyCode)` 有顺序依赖问题:
//   - AIConversation 先挂载设置了英文 'Copied!' 的版本,这里 if 跳过,
//     AgentTeam 的代码块按钮被点时文案会是英文,不走 t()。
//   - 这里设置后若未清理,i18n 切语言后闭包里的 t() 引用过时。
// 修法和 AIConversation 对齐:保存前一个实现,卸载时还原/delete。
const __prevCopyCodeAT = window.copyCode
window.copyCode = function(button) {
  const codeBlock = button.closest('.hljs-code-block')
  const code = codeBlock.querySelector('code').textContent
  navigator.clipboard.writeText(code).then(() => {
    button.textContent = t('agentTeam.copiedBtn')
    setTimeout(() => { button.textContent = t('agentTeam.copyBtn') }, 2000)
  })
}
onBeforeUnmount(() => {
  if (__prevCopyCodeAT) {
    window.copyCode = __prevCopyCodeAT
  } else {
    try { delete window.copyCode } catch { window.copyCode = undefined }
  }
  // 卸载时中断当前流式请求,避免 onChunk 在组件销毁后仍写状态、
  // 也防止 isDiscussing 残留 true(模块级单例,影响下次进入此页)。
  abortCurrentStream('component-unmount')
})

const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

// 用户消息：将 @角色名 高亮包裹
const renderMentionHighlight = (content) => {
  if (!content) return ''
  let escaped = md.utils.escapeHtml(content)
  // 按角色名长度倒序，避免短名误匹配
  const sorted = [...allRoles.value].sort((a, b) => b.name.length - a.name.length)
  for (const role of sorted) {
    const escName = role.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`@${escName}`, 'gu')
    // role.name / role.color / role.bgColor 来自用户可编辑的角色表,
    // 拼到 HTML / style 时必须转义,否则可被注入。
    const safeName = md.utils.escapeHtml(role.name)
    const safeColor = md.utils.escapeHtml(role.color)
    const safeBg = md.utils.escapeHtml(role.bgColor)
    escaped = escaped.replace(
      re,
      `<span class="mention-tag" style="background:${safeBg};color:${safeColor};border-color:${safeColor}">@${safeName}</span>`
    )
  }
  return escaped
}

// ==================== 角色 / 会话 操作 ====================

const toggleAgent = (agentId) => {
  const newSet = new Set(activeAgents.value)
  if (newSet.has(agentId)) {
    if (newSet.size > 1) newSet.delete(agentId)
  } else {
    newSet.add(agentId)
  }
  activeAgents.value = newSet
}

const switchSession = async (id) => {
  if (id === currentSessionId.value || isDiscussing.value) return
  await loadSession(id)
  scrollToBottom()
}

const onDeleteSession = (id) => {
  ElMessageBox.confirm('确定删除该讨论记录？删除后不可恢复。', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteSession(id)
    if (id === currentSessionId.value) {
      startNewDiscussionView()
    }
    ElMessage.success('已删除')
  }).catch(() => {})
}

const newDiscussion = () => {
  if (isDiscussing.value) {
    ElMessage.warning('请先停止当前讨论')
    return
  }
  startNewDiscussionView()
}

// ==================== 角色编辑对话框 ====================

const openRoleEditor = (role = null) => {
  if (role) {
    roleForm.value = {
      id: role.id,
      name: role.name,
      emoji: role.emoji,
      color: role.color,
      bgColor: role.bgColor,
      temperature: role.temperature,
      systemPrompt: role.systemPrompt
    }
  } else {
    roleForm.value = {
      id: '',
      name: '',
      emoji: '\u{1F31F}',
      color: 'var(--accent-blue)',
      bgColor: 'rgba(64,158,255,0.08)',
      temperature: 0.7,
      systemPrompt: ''
    }
  }
  showRoleEditor.value = true
}

const cloneRole = (role) => {
  roleForm.value = {
    id: '', // 清空 ID 表示新建
    name: role.name + ' (副本)',
    emoji: role.emoji,
    color: role.color,
    bgColor: role.bgColor,
    temperature: role.temperature,
    systemPrompt: role.systemPrompt
  }
  showRoleEditor.value = true
}

// 颜色变化时同步 bgColor（淡化版本）
watch(() => roleForm.value.color, (newColor) => {
  if (!newColor) return
  // 简单地把 #RRGGBB 转 rgba(R,G,B,0.08)
  const hex = newColor.replace('#', '')
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    roleForm.value.bgColor = `rgba(${r},${g},${b},0.08)`
  }
})

// 讨论结束时自动 focus 追问框 —— 第一次讨论结束后,topic-section v-if 切成 false、
// followup-area 才被挂载,焦点会丢到 body,用户视觉上"看到了输入框但打不了字"
// (其实是没点击),体感就是"不能输入"。手动 focus 一次,符合直觉。
watch(isDiscussing, (curr, prev) => {
  if (prev && !curr && hasDiscussion.value) {
    nextTick(() => {
      followUpRef.value?.focus()
    })
  }
})

const onSaveRole = async () => {
  try {
    await saveCustomRole({
      id: roleForm.value.id || undefined,
      name: roleForm.value.name.trim(),
      emoji: roleForm.value.emoji.trim(),
      color: roleForm.value.color,
      bgColor: roleForm.value.bgColor,
      systemPrompt: roleForm.value.systemPrompt.trim(),
      temperature: roleForm.value.temperature
    })
    ElMessage.success(roleForm.value.id ? '已更新' : '已新增')
    showRoleEditor.value = false
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  }
}

const onDeleteRole = (role) => {
  ElMessageBox.confirm(`确定删除角色"${role.name}"？此操作不可恢复。`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteCustomRole(role.id)
      ElMessage.success('已删除')
    } catch (e) {
      ElMessage.error(e.message || '删除失败')
    }
  }).catch(() => {})
}

// ==================== @ 提及菜单 ====================

const onFollowUpInput = (e) => {
  const text = e.target.value
  const cursor = e.target.selectionStart || 0
  // 从光标向前找 @ 符号
  const before = text.slice(0, cursor)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) {
    hideMentionMenu()
    return
  }
  // @ 之前必须是空白或开头
  const charBefore = atIdx > 0 ? before[atIdx - 1] : ' '
  if (charBefore !== ' ' && charBefore !== '\n' && atIdx !== 0) {
    hideMentionMenu()
    return
  }
  // 取 @ 之后到光标的片段作为筛选关键词
  const keyword = before.slice(atIdx + 1)
  // 关键词内不允许有空格/换行
  if (/\s/.test(keyword)) {
    hideMentionMenu()
    return
  }

  mentionStartIndex.value = atIdx
  mentionCandidates.value = keyword
    ? allRoles.value.filter(r =>
        r.name.toLowerCase().includes(keyword.toLowerCase()) ||
        r.id.toLowerCase().includes(keyword.toLowerCase())
      )
    : [...allRoles.value]
  mentionActiveIndex.value = 0
  mentionMenuVisible.value = true
}

const hideMentionMenu = () => {
  // 用 setTimeout 留出一点时间让 click 触发
  setTimeout(() => {
    mentionMenuVisible.value = false
  }, 150)
}

const pickMention = (role) => {
  const text = followUpInput.value
  const start = mentionStartIndex.value
  if (start < 0) return
  const cursor = followUpRef.value?.selectionStart ?? text.length
  const before = text.slice(0, start)
  const after = text.slice(cursor)
  // 替换 @keyword 为 @角色名 + 空格
  followUpInput.value = before + '@' + role.name + ' ' + after
  mentionMenuVisible.value = false
  mentionStartIndex.value = -1
  // 把光标移到 @角色名 后面
  nextTick(() => {
    const newPos = (before + '@' + role.name + ' ').length
    if (followUpRef.value) {
      followUpRef.value.focus()
      followUpRef.value.setSelectionRange(newPos, newPos)
    }
  })
}

// ==================== 上下文构建 ====================

function buildContext(agent, previousMessages, topicText, followUp) {
  const messages = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: `【讨论主题】${topicText}` }
  ]

  for (const msg of previousMessages) {
    if (msg.isFollowUp || msg.isUser) {
      messages.push({ role: 'user', content: `【用户追问】${msg.content}` })
      continue
    }
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
  if (!(await checkAIConfig())) {
    ElMessage.warning(t('agentTeam.configWarning'))
    return
  }

  const topicText = topic.value.trim()
  const activeIds = Array.from(activeAgents.value)

  // 创建新 session
  const sessionId = await createSession(topicText, activeIds)
  currentSessionId.value = sessionId

  discussionTopic.value = topicText
  discussionMessages.value = []
  isDiscussing.value = true
  abortFlag.value = false
  singleAgentMode.value = null

  await runAgentDiscussion(topicText, null, null)
}

const continueDiscussion = async () => {
  const followUp = followUpInput.value.trim()
  if (!followUp) return
  if (!(await checkAIConfig())) {
    ElMessage.warning(t('agentTeam.configWarningShort'))
    return
  }

  // 如果当前没有 session（罕见，比如纯本地态），先建一个
  if (!currentSessionId.value) {
    const id = await createSession(discussionTopic.value || followUp, Array.from(activeAgents.value))
    currentSessionId.value = id
  }

  // 解析 @ 提及
  const { mentionedAgentId } = parseMention(followUp)

  followUpInput.value = ''
  isDiscussing.value = true
  abortFlag.value = false
  singleAgentMode.value = mentionedAgentId

  // 先持久化用户追问消息
  const userMsg = {
    agentId: '_user',
    content: followUp,
    isFollowUp: true,
    isUser: true,
    streaming: false,
    mentionedAgent: mentionedAgentId,
    timestamp: new Date().toLocaleTimeString()
  }
  const dbId = await saveMessage(currentSessionId.value, userMsg)
  discussionMessages.value.push({ ...userMsg, dbId })
  scrollToBottom()

  await runAgentDiscussion(discussionTopic.value, followUp, mentionedAgentId)
}

const runAgentDiscussion = async (topicText, followUp, mentionedAgentId) => {
  // 决定本轮要发言的角色集合
  let agents
  if (mentionedAgentId) {
    const target = getAgent(mentionedAgentId)
    agents = target ? [target] : []
  } else {
    agents = enabledAgents.value
  }

  if (agents.length === 0) {
    ElMessage.warning('没有可用的角色')
    isDiscussing.value = false
    return
  }

  // 本轮所有 agent 共用一个 AbortController:stop / 切换会话 / 卸载组件
  // 都通过 abort 来真实中断 fetch,而不是只设标志位等当前 agent 跑完。
  const streamController = newAbortController()

  // try/finally 兜底:即使中途 buildContext / saveMessage / 数组访问抛出意外异常,
  // 也保证 isDiscussing/singleAgentMode 复位,否则输入框会永久 disabled,
  // 用户必须刷新页面才能继续追问。
  try {
    for (let i = 0; i < agents.length; i++) {
      if (abortFlag.value) break

      const agent = agents[i]
      currentAgentIndex.value = i

      // 占位消息（仅前端，先不入库）
      const msgIndex = discussionMessages.value.length
      discussionMessages.value.push({
        agentId: agent.id,
        content: '',
        streaming: true,
        error: false,
        timestamp: ''
      })
      scrollToBottom()

      // 上下文 = 当前占位之前的所有有效消息(不区分轮次,统一过滤)。
      // 旧实现先取 previousRoundMessages,再 slice(prev.length, msgIndex) 拼"本轮新消息",
      // 但 prev.length 是 filter 后的长度,用作原数组索引会与 streaming/error/empty
      // 消息的位置错位,导致历史消息被重复或漏掉。这里直接对原数组 slice + filter,
      // 保持索引一致。
      const contextMessages = discussionMessages.value
        .slice(0, msgIndex)
        .filter(m => m.content && !m.error && !m.streaming)

      const apiMessages = buildContext(agent, contextMessages, topicText, followUp)

      let finalContent = ''
      let isError = false
      try {
        await callAIStream(apiMessages, (chunk, fullContent) => {
          // 中途被 abort:onChunk 仍可能因为缓冲被调用一两次,
          // 但 callAIStream 内部循环会下次迭代检查 signal 并 throw,这里幂等无害。
          discussionMessages.value[msgIndex].content = fullContent
          finalContent = fullContent
          scrollToBottom()
        }, {
          temperature: agent.temperature,
          maxTokens: 1000,
          signal: streamController.signal
        })
      } catch (error) {
        isError = true
        // AbortError / TimeoutError 不当作"AI 出错",改成"已停止"提示
        if (error?.name === 'AbortError' || error?.name === 'TimeoutError'
            || streamController.signal.aborted) {
          finalContent = error?.name === 'TimeoutError'
            ? '响应超时,已自动停止'
            : '已停止'
          discussionMessages.value[msgIndex].content = finalContent
          discussionMessages.value[msgIndex].error = false
          // abort 后立刻退出循环,不再发起后续 agent 请求
          discussionMessages.value[msgIndex].streaming = false
          discussionMessages.value[msgIndex].timestamp = new Date().toLocaleTimeString()
          break
        }
        finalContent = t('agentTeam.apiCallFailed', { msg: error.message })
        discussionMessages.value[msgIndex].error = true
        discussionMessages.value[msgIndex].content = finalContent
      }

      discussionMessages.value[msgIndex].streaming = false
      discussionMessages.value[msgIndex].timestamp = new Date().toLocaleTimeString()

      // 持久化最终内容
      try {
        const dbId = await saveMessage(currentSessionId.value, {
          agentId: agent.id,
          content: finalContent,
          isFollowUp: false,
          isUser: false,
          error: isError,
          timestamp: discussionMessages.value[msgIndex].timestamp
        })
        discussionMessages.value[msgIndex].dbId = dbId
      } catch (e) {
        console.error('保存消息失败:', e)
      }

      scrollToBottom()
    }
  } finally {
    // 防御性兜底:无论循环正常退出、abort、还是抛异常,
    // 残留的 streaming 占位都要清掉(否则 hasDiscussion=true 但消息一直转圈,
    // 加上 isDiscussing 误读,体感就是"输入框灰了")。
    for (const m of discussionMessages.value) {
      if (m.streaming) m.streaming = false
    }
    isDiscussing.value = false
    singleAgentMode.value = null
    currentAgentIndex.value = 0
    abortFlag.value = false
  }
}

const stopDiscussion = () => {
  abortFlag.value = true
  // 真实中断当前 fetch:旧版只设标志位,要等当前 agent 把流读完才生效。
  // 现在 abort 让 fetch 立刻 throw AbortError,流式内容就停。
  abortCurrentStream('user-stop')
  ElMessage.info(t('agentTeam.stoppingAfterCurrent'))
}

// ==================== 键盘事件 ====================

const handleTopicKeyDown = (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    startDiscussion()
  }
}

const handleFollowUpKeyDown = (e) => {
  // @ 候选菜单的键盘导航
  if (mentionMenuVisible.value && mentionCandidates.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionActiveIndex.value = (mentionActiveIndex.value + 1) % mentionCandidates.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionActiveIndex.value =
        (mentionActiveIndex.value - 1 + mentionCandidates.value.length) % mentionCandidates.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pickMention(mentionCandidates.value[mentionActiveIndex.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      mentionMenuVisible.value = false
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    continueDiscussion()
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  await ensureLoaded()
  // 默认勾选前 5 个开发系角色（如果当前 activeAgents 还是默认值）
  // 注：activeAgents 已在 composable 里初始化，这里不再重复
})
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.agent-team-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-secondary, var(--el-fill-color-lighter));
}

/* ==================== Header ==================== */

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, var(--el-border-color-light));
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
  color: var(--accent-blue);
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
  color: var(--text-secondary, var(--el-text-color-regular));
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-success);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ==================== 主体两栏 ==================== */

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 历史侧栏 */
.conversation-sidebar {
  width: 240px;
  min-width: 240px;
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
  border: 1px solid var(--border-color, var(--el-border-color-light));
  color: var(--text-primary, var(--el-text-color-primary));
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
  white-space: nowrap;
  background: var(--bg-primary, #fff);
}

.sidebar-new-btn:hover {
  background: var(--bg-tertiary, var(--el-fill-color-light));
  border-color: var(--el-border-color);
}

.sidebar-new-btn i {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.sidebar-collapse-btn,
.sidebar-expand-btn {
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

.sidebar-collapse-btn:hover,
.sidebar-expand-btn:hover {
  color: var(--el-text-color-primary);
  background: var(--el-border-color-light);
}

.sidebar-expand-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  font-size: 15px;
  color: var(--el-text-color-regular);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.sidebar-list::-webkit-scrollbar { width: 4px; }
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

.sidebar-item:hover { background: #eeeff1; }
.sidebar-item.active { background: var(--el-border-color-light); }

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
  color: var(--text-primary, var(--el-text-color-primary));
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

.sidebar-item:hover .sidebar-item-actions { opacity: 1; }

.sidebar-action-btn {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}

.sidebar-action-btn:hover {
  color: var(--color-red);
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

/* ==================== 主内容区 ==================== */

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
  overflow-y: auto;
}

.topic-card {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.topic-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--accent-blue);
}

.topic-icon i {
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--el-color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.topic-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary, var(--el-text-color-primary));
  margin: 0 0 8px;
}

.topic-desc {
  font-size: 14px;
  color: var(--text-tertiary, var(--el-text-color-secondary));
  margin: 0 0 28px;
}

.topic-input-area { margin-bottom: 20px; }

.topic-input {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--border-color, var(--el-border-color));
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, var(--el-text-color-primary));
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.topic-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.agent-selector { margin-bottom: 24px; }

.selector-label {
  font-size: 13px;
  color: var(--text-secondary, var(--el-text-color-regular));
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
  border: 1.5px solid var(--border-color, var(--el-border-color-light));
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  background: var(--bg-primary, #ffffff);
}

.agent-chip:hover { border-color: var(--el-text-color-placeholder); }
.agent-chip.active { font-weight: 500; }

.chip-emoji { font-size: 16px; }
.chip-name { font-size: 13px; color: var(--text-primary, var(--el-text-color-primary)); }

.start-btn {
  min-width: 160px;
  border-radius: 10px;
  font-size: 15px;
}

/* ==================== 消息区 ==================== */

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.messages-area::-webkit-scrollbar { width: 6px; }
.messages-area::-webkit-scrollbar-thumb { background: var(--el-border-color); border-radius: 3px; }

.topic-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto 28px;
  padding: 16px 20px;
  background: var(--bg-primary, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.topic-message-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-blue), var(--el-color-success));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.topic-message-content { flex: 1; min-width: 0; }
.topic-message-label {
  font-size: 12px;
  color: var(--text-tertiary, var(--el-text-color-secondary));
  margin-bottom: 4px;
  font-weight: 500;
}
.topic-message-text {
  font-size: 15px;
  color: var(--text-primary, var(--el-text-color-primary));
  line-height: 1.6;
  word-break: break-word;
}

/* 用户追问消息（右侧） */
.user-message {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto 24px;
  animation: fadeSlideIn 0.4s ease;
}

.user-message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, var(--color-purple));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.user-message-bubble {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-message-content {
  padding: 10px 14px;
  background: #e0f3ff;
  color: var(--el-text-color-primary);
  border-radius: 16px 4px 16px 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.user-message-timestamp {
  font-size: 11px;
  color: var(--text-quaternary, var(--el-text-color-placeholder));
  margin-top: 4px;
}

/* @角色名 高亮 */
.user-message-content :deep(.mention-tag) {
  display: inline-block;
  padding: 1px 8px;
  margin: 0 2px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

/* Agent 消息 */
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

.agent-message-body { flex: 1; min-width: 0; }

.agent-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.agent-name { font-size: 13px; font-weight: 600; }
.agent-timestamp { font-size: 11px; color: var(--text-quaternary, var(--el-text-color-placeholder)); }

.agent-message-content {
  padding: 14px 18px;
  background: var(--bg-primary, #ffffff);
  border-radius: 4px 16px 16px 16px;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  border-left: 3px solid var(--agent-color, var(--accent-blue));
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary, var(--el-text-color-primary));
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.agent-error { color: var(--el-color-danger); font-size: 13px; }
.agent-error i { margin-right: 4px; }

.agent-message-content.streaming :deep(> *:last-child)::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 1.1em;
  background: var(--agent-color, var(--accent-blue));
  margin-left: 3px;
  border-radius: 1px;
  animation: blink 1s steps(1) infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.loading-dots { display: flex; gap: 6px; padding: 4px 0; }

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--agent-color, var(--accent-blue));
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
  width: 100%;
  margin: 8px auto 16px;
  padding: 0 20px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.followup-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--text-quaternary, var(--el-text-color-placeholder));
  font-size: 12px;
}

.followup-divider::before,
.followup-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color, var(--el-border-color-light));
}

.followup-input-wrapper {
  position: relative;
  background: var(--bg-primary, #ffffff);
  border: 1.5px solid var(--border-color, var(--el-border-color));
  border-radius: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.followup-input-wrapper.disabled { opacity: 0.6; }

.followup-input-wrapper:focus-within {
  border-color: var(--accent-blue);
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
  color: var(--text-primary, var(--el-text-color-primary));
  box-sizing: border-box;
}

.followup-input:disabled { cursor: not-allowed; }

.followup-send-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 32px;
  height: 32px;
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

.followup-send-btn:hover:not(:disabled) {
  background: #337ecc;
  transform: scale(1.05);
}

.followup-send-btn:disabled {
  background: var(--el-border-color-light);
  cursor: not-allowed;
  opacity: 0.6;
}

/* ==================== @ 候选菜单 ==================== */

.mention-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 12px;
  right: 12px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, var(--el-border-color-light));
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 50;
  padding: 4px;
}

.mention-menu-title {
  padding: 6px 10px 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.mention-item.active,
.mention-item:hover {
  background: var(--el-fill-color-light);
}

.mention-emoji { font-size: 16px; }

.mention-name {
  font-size: 13px;
  font-weight: 500;
}

.mention-empty {
  padding: 12px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* ==================== 角色管理对话框 ==================== */

/* 高度严格不超出窗口:top 占 4vh,底部留 4vh,所以 dialog 自身 ≤ 92vh。
   再用一个 560px 的"理想默认",窗口够大时不会撑得过高。
   表格内部纵向滚动。
   注:Element Plus 的 el-dialog 通过 teleport 移到 body,scoped + :deep 在某些
   场景命不中。下面同样的规则在文件末尾再写一份 unscoped 兜底。 */
.roles-dialog :deep(.el-dialog) {
  height: min(560px, 92vh) !important;
  max-height: 92vh !important;
  max-width: 95vw !important;
  display: flex;
  flex-direction: column;
  margin: 0 auto !important;
  overflow: hidden;
}

.roles-dialog :deep(.el-dialog__header) {
  flex-shrink: 0;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color, var(--el-border-color-light));
  margin-right: 0;
}

.roles-dialog :deep(.el-dialog__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  overflow: hidden;
}

.roles-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--border-color, var(--el-border-color-light));
}

.roles-toolbar {
  display: none; /* 已合并到 dialog header,保留旧 class 以防其他引用 */
}

.roles-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.roles-dialog-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.roles-dialog-title > span:first-child {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, var(--el-text-color-primary));
}

.roles-table-wrapper {
  flex: 1;
  min-height: 0;       /* 关键：让 flex 子元素允许收缩，table height:100% 才生效 */
  overflow: hidden;
}

.roles-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.role-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-cell-emoji {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border: 1.5px solid;
  flex-shrink: 0;
}

.role-cell-name {
  font-size: 13px;
  font-weight: 600;
}

.role-prompt-preview {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.emoji-suggest {
  cursor: pointer;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 16px;
  transition: background 0.12s;
}

.emoji-suggest:hover {
  background: var(--el-border-color-light);
}

/* ==================== Markdown 样式 ==================== */

.agent-message-content :deep(p) { margin: 8px 0; }
.agent-message-content :deep(p:first-child) { margin-top: 0; }
.agent-message-content :deep(p:last-child) { margin-bottom: 0; }

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
  border-left: 3px solid var(--agent-color, var(--accent-blue));
  padding: 8px 14px;
  margin: 12px 0;
  color: var(--text-secondary, var(--el-text-color-regular));
  background: var(--bg-tertiary, var(--el-fill-color-lighter));
  border-radius: 4px;
}

.agent-message-content :deep(strong) {
  font-weight: 600;
  color: var(--text-primary, var(--el-text-color-primary));
}

.agent-message-content :deep(h1),
.agent-message-content :deep(h2),
.agent-message-content :deep(h3),
.agent-message-content :deep(h4) {
  margin: 14px 0 8px;
  font-weight: 600;
  color: var(--text-primary, var(--el-text-color-primary));
}

.agent-message-content :deep(h3) { font-size: 1.1em; }
.agent-message-content :deep(h4) { font-size: 1em; }

.agent-message-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  border-radius: 6px;
  overflow: hidden;
}

.agent-message-content :deep(th),
.agent-message-content :deep(td) {
  border: 1px solid var(--border-color, var(--el-border-color-light));
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
}

.agent-message-content :deep(th) {
  background: var(--bg-tertiary, var(--el-fill-color-lighter));
  font-weight: 600;
}

.agent-message-content :deep(a) { color: var(--accent-blue); text-decoration: none; }
.agent-message-content :deep(a:hover) { text-decoration: underline; }
</style>

<!-- Unscoped 兜底:el-dialog 用 teleport 移到 body,scoped 的 :deep 在
     teleported 节点上有时命不中(Vue 3 + 某些 element-plus 版本),
     这里直接用全局选择器命中 .roles-dialog 类(由 class 透传到 .el-dialog)。
     垂直居中:用 :has() 找到包含 .roles-dialog 的 .el-overlay-dialog,
     把它变成 flex 容器,内部 .el-dialog margin: auto 自动居中。 -->
<style>
.el-overlay-dialog:has(.roles-dialog) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 16px 0;
}

.roles-dialog,
.roles-dialog.el-dialog,
.el-overlay .el-dialog.roles-dialog,
.el-overlay-dialog.roles-dialog .el-dialog,
.roles-dialog .el-dialog {
  height: min(560px, 92vh) !important;
  max-height: 92vh !important;
  max-width: 95vw !important;
  width: 1100px !important;
  display: flex !important;
  flex-direction: column !important;
  /* margin auto 在父级 flex 居中下负责水平居中,垂直靠 .el-overlay-dialog 的 align-items */
  margin: 0 auto !important;
  top: auto !important;
  overflow: hidden !important;
}
.roles-dialog .el-dialog__header,
.roles-dialog.el-dialog .el-dialog__header {
  flex-shrink: 0;
  padding: 14px 20px !important;
}
.roles-dialog .el-dialog__body,
.roles-dialog.el-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 !important; /* 表格自带 border,不需要 body padding,让表格直接撑满 */
}
.roles-dialog .el-dialog__footer,
.roles-dialog.el-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding: 10px 20px !important;
}
.roles-dialog .roles-table-wrapper,
.roles-dialog.el-dialog .roles-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
/* 紧凑表格:更小的行高,一屏多展示几条 */
.roles-dialog .el-table--small .el-table__cell {
  padding: 4px 0 !important;
}
.roles-dialog .el-table--small .cell {
  line-height: 1.4 !important;
}
</style>
