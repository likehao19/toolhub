/**
 * AgentTeam composable — 模块级单例
 *
 * 功能：
 * 1. 跨组件 / 跨路由切换共享 state（discussionMessages 等不会因为组件 unmount 丢失）
 * 2. SQLite 持久化：会话列表、每条消息、角色定义
 * 3. 角色种子：首次启动自动注入 13 个内置角色（dev/pm/designer/tester/ops + 营销/法务/财务/文案/翻译/编辑/健身/心理/美食）
 * 4. 自定义角色 CRUD
 *
 * 使用方式：
 *   const { discussionMessages, loadAllRoles, ... } = useAgentTeam()
 *
 * 由于 ref 在模块顶层声明，所有调用方都拿到的是同一个引用，因此组件卸载/重建不会丢失数据。
 */

import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'

// ==================== 数据库初始化 ====================

let db = null
let tablesEnsured = false

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:productivity.db')
  }
  if (!tablesEnsured) {
    await db.execute(`CREATE TABLE IF NOT EXISTS agent_team_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      active_agents TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await db.execute(`CREATE TABLE IF NOT EXISTS agent_team_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_followup INTEGER DEFAULT 0,
      is_user INTEGER DEFAULT 0,
      is_error INTEGER DEFAULT 0,
      mentioned_agent TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    await db.execute(`CREATE TABLE IF NOT EXISTS agent_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      bg_color TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      temperature REAL DEFAULT 0.7,
      is_builtin INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
    tablesEnsured = true
  }
  return db
}

// ==================== 内置角色（13 个） ====================

const BUILTIN_ROLES = [
  // —— 软件开发系（5）——
  {
    id: 'pm',
    name: '产品经理',
    emoji: '\u{1F4CB}',
    color: '#409eff',
    bgColor: 'rgba(64,158,255,0.08)',
    systemPrompt: `你是一位经验丰富的产品经理。在团队讨论中，你从用户需求、市场价值、产品定位和商业可行性的角度分析问题。你善于：
- 定义核心用户场景和需求优先级
- 评估功能的商业价值和投入产出比
- 提出清晰的产品路线图建议
- 关注用户体验和竞品对比
请用简洁专业的语言发表你的观点，必要时引用数据或案例。回复控制在300字以内。`,
    temperature: 0.7,
    sortOrder: 1
  },
  {
    id: 'dev',
    name: '高级工程师',
    emoji: '\u{1F4BB}',
    color: '#67c23a',
    bgColor: 'rgba(103,194,58,0.08)',
    systemPrompt: `你是一位资深全栈工程师。在团队讨论中，你从技术架构、实现方案、性能和可维护性的角度分析问题。你善于：
- 评估技术方案的可行性和复杂度
- 提出具体的架构设计和技术选型建议
- 识别潜在的技术风险和瓶颈
- 估算开发工作量和技术债务
请用简洁专业的语言发表你的观点，可以适当使用技术术语。回复控制在300字以内。`,
    temperature: 0.6,
    sortOrder: 2
  },
  {
    id: 'designer',
    name: 'UI 设计师',
    emoji: '\u{1F3A8}',
    color: '#e6a23c',
    bgColor: 'rgba(230,162,60,0.08)',
    systemPrompt: `你是一位专业的UI/UX设计师。在团队讨论中，你从用户体验、交互设计、视觉规范和可用性的角度分析问题。你善于：
- 分析用户交互流程和信息架构
- 提出符合设计规范的界面方案
- 关注无障碍性、响应式和一致性
- 引用设计原则和最佳实践
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.8,
    sortOrder: 3
  },
  {
    id: 'tester',
    name: '测试工程师',
    emoji: '\u{1F50D}',
    color: '#f56c6c',
    bgColor: 'rgba(245,108,108,0.08)',
    systemPrompt: `你是一位细致的QA测试工程师。在团队讨论中，你从质量保障、边界条件、异常处理和风险控制的角度分析问题。你善于：
- 识别潜在的缺陷和边界条件
- 设计测试策略和验收标准
- 提出自动化测试和持续集成建议
- 关注安全性、兼容性和性能测试
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.5,
    sortOrder: 4
  },
  {
    id: 'ops',
    name: '运维架构师',
    emoji: '\u{1F6E0}',
    color: '#af52de',
    bgColor: 'rgba(175,82,222,0.08)',
    systemPrompt: `你是一位经验丰富的DevOps/运维架构师。在团队讨论中，你从部署运维、可观测性、成本控制和系统可靠性的角度分析问题。你善于：
- 设计CI/CD流程和发布策略
- 评估基础设施需求和成本
- 提出监控、告警和灾备方案
- 关注系统稳定性、扩展性和安全合规
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.6,
    sortOrder: 5
  },

  // —— 商业系（3）——
  {
    id: 'marketing',
    name: '营销专家',
    emoji: '\u{1F4E2}',
    color: '#ff6b9d',
    bgColor: 'rgba(255,107,157,0.08)',
    systemPrompt: `你是一位资深营销专家。在团队讨论中，你从品牌定位、用户增长、传播渠道和转化漏斗的角度分析问题。你善于：
- 拆解目标受众画像和触达路径
- 设计传播主张、内容矩阵和投放策略
- 评估 ROI、CAC、LTV 等关键指标
- 提出私域、社媒、KOL 合作思路
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.75,
    sortOrder: 6
  },
  {
    id: 'lawyer',
    name: '法务顾问',
    emoji: '\u{2696}\u{FE0F}',
    color: '#7c5295',
    bgColor: 'rgba(124,82,149,0.08)',
    systemPrompt: `你是一位专业的法务顾问。在团队讨论中，你从合同审查、合规风险、知识产权和数据隐私的角度分析问题。你善于：
- 识别条款风险和潜在纠纷
- 解读相关法规（合同法、个人信息保护法、GDPR 等）
- 提出合规整改建议和风险预案
- 关注资质、备案、披露义务
请用简洁专业的语言发表你的观点，重要结论需注明"建议进一步核实"。回复控制在300字以内。`,
    temperature: 0.4,
    sortOrder: 7
  },
  {
    id: 'finance',
    name: '财务分析师',
    emoji: '\u{1F4B0}',
    color: '#16a085',
    bgColor: 'rgba(22,160,133,0.08)',
    systemPrompt: `你是一位专业的财务分析师。在团队讨论中，你从成本结构、收益模型、现金流和投资回报的角度分析问题。你善于：
- 拆解收入与成本构成
- 测算盈亏平衡点和敏感性分析
- 评估融资方案、估值方法和股权结构
- 关注税务、合规和财务风控
请用简洁专业的语言发表你的观点，必要时给出量化测算。回复控制在300字以内。`,
    temperature: 0.5,
    sortOrder: 8
  },

  // —— 内容系（3）——
  {
    id: 'writer',
    name: '文案策划',
    emoji: '\u{270D}\u{FE0F}',
    color: '#e67e22',
    bgColor: 'rgba(230,126,34,0.08)',
    systemPrompt: `你是一位资深文案策划。在团队讨论中，你从主题立意、叙事结构、修辞表达和情感共鸣的角度分析问题。你善于：
- 提炼一句话核心主张（slogan / hook）
- 设计长短文案、脚本和故事线
- 把握不同平台的语感与节奏
- 用类比、金句和场景化表达打动读者
请用简洁有感染力的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.85,
    sortOrder: 9
  },
  {
    id: 'translator',
    name: '翻译专家',
    emoji: '\u{1F310}',
    color: '#3498db',
    bgColor: 'rgba(52,152,219,0.08)',
    systemPrompt: `你是一位资深双语翻译专家（中/英为主，兼通日韩法德）。在团队讨论中，你从原文语义、目标语言习惯、文化适配和术语一致性的角度分析问题。你善于：
- 在直译与意译间找到平衡
- 处理专业术语、双关语和文化负载词
- 给出多版本译法并说明取舍
- 检查语法、风格和受众适配
请用简洁专业的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.5,
    sortOrder: 10
  },
  {
    id: 'editor',
    name: '资深编辑',
    emoji: '\u{1F4DD}',
    color: '#34495e',
    bgColor: 'rgba(52,73,94,0.08)',
    systemPrompt: `你是一位资深编辑。在团队讨论中，你从结构逻辑、行文流畅度、事实准确性和读者体验的角度分析问题。你善于：
- 梳理文本骨架（金字塔结构、起承转合）
- 删冗修辞、统一语态和称谓
- 校对事实、数据和引用规范
- 给出标题、导语、配图建议
请用简洁专业的语言发表你的观点，必要时直接示范修改前后对比。回复控制在300字以内。`,
    temperature: 0.55,
    sortOrder: 11
  },

  // —— 生活系（3）——
  {
    id: 'fitness',
    name: '健身教练',
    emoji: '\u{1F4AA}',
    color: '#27ae60',
    bgColor: 'rgba(39,174,96,0.08)',
    systemPrompt: `你是一位专业健身教练（NSCA-CPT），擅长力量训练、有氧搭配和运动康复。在团队讨论中，你从训练目标、动作规范、负荷控制和恢复管理的角度分析问题。你善于：
- 制定分阶段训练计划（增肌/减脂/塑形）
- 拆解动作要点，规避代偿与受伤风险
- 给出饮食与睡眠的配合建议
- 用数据评估进步（围度、力量、心率）
回答时如涉及伤病请提示"建议咨询医生"。请用简洁专业的语言发表你的观点，回复控制在300字以内。`,
    temperature: 0.65,
    sortOrder: 12
  },
  {
    id: 'psychologist',
    name: '心理咨询师',
    emoji: '\u{1F9E0}',
    color: '#9b59b6',
    bgColor: 'rgba(155,89,182,0.08)',
    systemPrompt: `你是一位有同理心的心理咨询师（CBT 流派）。在团队讨论中，你从认知模式、情绪调节、人际关系和压力应对的角度分析问题。你善于：
- 倾听、共情，避免评判
- 帮助识别自动化思维和认知偏差
- 提供放松、正念、行为激活等实用练习
- 在严重情境下提示"必要时寻求专业帮助"
请用温和、专业、不说教的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.7,
    sortOrder: 13
  },
  {
    id: 'chef',
    name: '美食顾问',
    emoji: '\u{1F373}',
    color: '#e74c3c',
    bgColor: 'rgba(231,76,60,0.08)',
    systemPrompt: `你是一位资深美食顾问，擅长中西餐烹饪、营养搭配与餐饮策划。在团队讨论中，你从食材风味、营养结构、烹饪工艺和场景搭配的角度分析问题。你善于：
- 给出可操作的菜谱（步骤、火候、克数）
- 替换食材以适配过敏 / 素食 / 控糖等需求
- 设计宴客菜单或一周餐饮计划
- 解读食材文化和地域差异
请用简洁生动的语言发表你的观点。回复控制在300字以内。`,
    temperature: 0.75,
    sortOrder: 14
  }
]

// ==================== 模块级状态（单例） ====================

const topic = ref('')
const discussionTopic = ref('')
const discussionMessages = ref([])
// 默认勾选前 5 个（开发系）
const activeAgents = ref(new Set(['pm', 'dev', 'designer', 'tester', 'ops']))
const isDiscussing = ref(false)
const currentAgentIndex = ref(0)
const followUpInput = ref('')
const abortFlag = ref(false)
const currentSessionId = ref(null)

const allRoles = ref([])
const sessionList = ref([])
const rolesLoaded = ref(false)
const sessionsLoaded = ref(false)

// 当前正在跑的 callAIStream 的 AbortController(单例,每次发起新讨论前替换)。
// 切换会话/删除会话/启动新讨论时,先 abort 旧的,避免:
// 1) 旧 stream 仍在 await 时 isDiscussing=true 卡死(配合 callAIStream 的 idle timeout 兜底)
// 2) 旧 stream 的 onChunk 还在写已被清空的 discussionMessages,污染新会话
let currentAbortController = null

function abortCurrentStream(reason) {
  if (currentAbortController) {
    try { currentAbortController.abort(reason) } catch { /* ignore */ }
    currentAbortController = null
  }
}

function newAbortController() {
  abortCurrentStream('superseded')
  currentAbortController = new AbortController()
  return currentAbortController
}

// ==================== 角色管理 ====================

async function ensureBuiltinRoles() {
  const database = await getDb()
  const existing = await database.select('SELECT id FROM agent_roles WHERE is_builtin = 1')
  const existingIds = new Set(existing.map(r => r.id))

  for (const role of BUILTIN_ROLES) {
    if (!existingIds.has(role.id)) {
      await database.execute(
        `INSERT INTO agent_roles (id, name, emoji, color, bg_color, system_prompt, temperature, is_builtin, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [role.id, role.name, role.emoji, role.color, role.bgColor, role.systemPrompt, role.temperature, role.sortOrder]
      )
    } else {
      // 同步内置角色的最新 system_prompt（首次升级用）
      await database.execute(
        `UPDATE agent_roles
         SET name = ?, emoji = ?, color = ?, bg_color = ?, system_prompt = ?, temperature = ?, sort_order = ?
         WHERE id = ? AND is_builtin = 1`,
        [role.name, role.emoji, role.color, role.bgColor, role.systemPrompt, role.temperature, role.sortOrder, role.id]
      )
    }
  }
}

async function loadAllRoles() {
  await ensureBuiltinRoles()
  const database = await getDb()
  const rows = await database.select(
    'SELECT * FROM agent_roles ORDER BY sort_order ASC, created_at ASC'
  )
  allRoles.value = rows.map(r => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    bgColor: r.bg_color,
    systemPrompt: r.system_prompt,
    temperature: r.temperature,
    isBuiltin: !!r.is_builtin,
    sortOrder: r.sort_order
  }))
  rolesLoaded.value = true
}

function getAgent(agentId) {
  return allRoles.value.find(r => r.id === agentId)
}

async function saveCustomRole(role) {
  const database = await getDb()
  const id = role.id || ('custom_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6))
  const sortOrder = role.sortOrder ?? (100 + allRoles.value.length)

  // 已存在则更新（仅自定义角色），否则插入
  const existing = await database.select('SELECT id, is_builtin FROM agent_roles WHERE id = ?', [id])
  if (existing.length > 0) {
    if (existing[0].is_builtin) {
      throw new Error('内置角色不可修改')
    }
    await database.execute(
      `UPDATE agent_roles
       SET name = ?, emoji = ?, color = ?, bg_color = ?, system_prompt = ?, temperature = ?, sort_order = ?
       WHERE id = ?`,
      [role.name, role.emoji, role.color, role.bgColor, role.systemPrompt, role.temperature ?? 0.7, sortOrder, id]
    )
  } else {
    await database.execute(
      `INSERT INTO agent_roles (id, name, emoji, color, bg_color, system_prompt, temperature, is_builtin, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, role.name, role.emoji, role.color, role.bgColor, role.systemPrompt, role.temperature ?? 0.7, sortOrder]
    )
  }
  await loadAllRoles()
  return id
}

async function deleteCustomRole(id) {
  const database = await getDb()
  const rows = await database.select('SELECT is_builtin FROM agent_roles WHERE id = ?', [id])
  if (rows.length === 0) return
  if (rows[0].is_builtin) {
    throw new Error('内置角色不可删除')
  }
  await database.execute('DELETE FROM agent_roles WHERE id = ?', [id])
  // 如果删除的角色在 active 集合里，移除
  if (activeAgents.value.has(id)) {
    const newSet = new Set(activeAgents.value)
    newSet.delete(id)
    activeAgents.value = newSet
  }
  await loadAllRoles()
}

// ==================== 会话管理 ====================

// 安全 JSON 解析:数据库里 active_agents 字段理论上是我们自己写的合法 JSON,
// 但旧版本/外部 SQL 操作可能写入坏数据,parse 抛错会让 loadSessionList /
// loadSession 整个失败 → 用户看到"会话列表空"或切会话直接崩。
function safeParseArray(raw) {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

async function loadSessionList() {
  const database = await getDb()
  const rows = await database.select(
    'SELECT id, title, topic, active_agents, created_at, updated_at FROM agent_team_sessions ORDER BY updated_at DESC'
  )
  sessionList.value = rows.map(r => ({
    id: r.id,
    title: r.title,
    topic: r.topic,
    activeAgents: safeParseArray(r.active_agents),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))
  sessionsLoaded.value = true
}

async function createSession(topicText, activeAgentIds) {
  const database = await getDb()
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 8)
  const now = new Date().toISOString()
  const title = topicText.length > 30 ? topicText.substring(0, 30) + '...' : topicText
  await database.execute(
    `INSERT INTO agent_team_sessions (id, title, topic, active_agents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, topicText, JSON.stringify(activeAgentIds), now, now]
  )
  await loadSessionList()
  return id
}

async function touchSession(sessionId) {
  if (!sessionId) return
  const database = await getDb()
  await database.execute(
    'UPDATE agent_team_sessions SET updated_at = ? WHERE id = ?',
    [new Date().toISOString(), sessionId]
  )
}

async function deleteSession(id) {
  const database = await getDb()
  await database.execute('DELETE FROM agent_team_messages WHERE session_id = ?', [id])
  await database.execute('DELETE FROM agent_team_sessions WHERE id = ?', [id])
  await loadSessionList()
}

// ==================== 消息持久化 ====================

async function saveMessage(sessionId, msg) {
  if (!sessionId) return null
  const database = await getDb()
  const result = await database.execute(
    `INSERT INTO agent_team_messages
     (session_id, agent_id, content, is_followup, is_user, is_error, mentioned_agent, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      msg.agentId || '',
      msg.content || '',
      msg.isFollowUp ? 1 : 0,
      msg.isUser ? 1 : 0,
      msg.error ? 1 : 0,
      msg.mentionedAgent || null,
      msg.timestamp || new Date().toLocaleTimeString()
    ]
  )
  await touchSession(sessionId)
  return result.lastInsertId
}

async function updateMessageContent(messageId, content, error = false) {
  if (!messageId) return
  const database = await getDb()
  await database.execute(
    'UPDATE agent_team_messages SET content = ?, is_error = ? WHERE id = ?',
    [content, error ? 1 : 0, messageId]
  )
}

async function loadMessagesForSession(sessionId) {
  const database = await getDb()
  const rows = await database.select(
    `SELECT id, agent_id, content, is_followup, is_user, is_error, mentioned_agent, timestamp
     FROM agent_team_messages WHERE session_id = ? ORDER BY id ASC`,
    [sessionId]
  )
  return rows.map(r => ({
    dbId: r.id,
    agentId: r.agent_id,
    content: r.content,
    isFollowUp: !!r.is_followup,
    isUser: !!r.is_user,
    error: !!r.is_error,
    mentionedAgent: r.mentioned_agent,
    timestamp: r.timestamp,
    streaming: false
  }))
}

// ==================== 切换/初始化 ====================

async function loadSession(sessionId) {
  // 切换会话前必须 abort 当前流式请求,否则旧 callAIStream 的 onChunk 会写到新会话的 discussionMessages
  abortCurrentStream('switch-session')
  const database = await getDb()
  const rows = await database.select(
    'SELECT id, topic, active_agents FROM agent_team_sessions WHERE id = ?',
    [sessionId]
  )
  if (rows.length === 0) return false

  currentSessionId.value = sessionId
  discussionTopic.value = rows[0].topic
  topic.value = ''
  followUpInput.value = ''
  isDiscussing.value = false
  abortFlag.value = false

  const agentIds = safeParseArray(rows[0].active_agents)
  if (agentIds.length > 0) {
    activeAgents.value = new Set(agentIds)
  }
  discussionMessages.value = await loadMessagesForSession(sessionId)
  return true
}

function startNewDiscussionView() {
  abortCurrentStream('new-discussion')
  currentSessionId.value = null
  topic.value = ''
  discussionTopic.value = ''
  discussionMessages.value = []
  followUpInput.value = ''
  isDiscussing.value = false
  abortFlag.value = false
}

async function ensureLoaded() {
  if (!rolesLoaded.value) await loadAllRoles()
  if (!sessionsLoaded.value) await loadSessionList()
}

// ==================== @ 提及解析 ====================

/**
 * 解析输入字符串中的 @角色名 token
 * @param {string} text — 用户输入
 * @returns {{ mentionedAgentId: string|null, cleanText: string }}
 */
function parseMention(text) {
  if (!text) return { mentionedAgentId: null, cleanText: text }
  // 匹配 @ + 角色名(中文/英文/数字/下划线)。
  // 角色名按长度倒序,避免短前缀误匹配(如 "测试" 优先于 "测试工程师")。
  // 注:旧实现用 `@角色名\b?`,但 `\b` 是零宽断言,后面加量词 `?` 在 Unicode 严格模式
  // (`/u` flag)下被规范禁止,会抛 "Nothing to repeat";中英文混排里 `\b` 行为本就
  // 不可靠(如 "@UI 设计师" 后面跟空格时 `\b` 不匹配中文),所以直接做前缀匹配,
  // 配合长度倒序遍历就能正确选出最长匹配。
  const sortedRoles = [...allRoles.value].sort((a, b) => b.name.length - a.name.length)
  for (const role of sortedRoles) {
    const escName = role.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`@${escName}`, 'u')
    if (pattern.test(text)) {
      return {
        mentionedAgentId: role.id,
        cleanText: text
      }
    }
  }
  return { mentionedAgentId: null, cleanText: text }
}

// ==================== Computed ====================

const enabledAgents = computed(() =>
  allRoles.value.filter(a => activeAgents.value.has(a.id))
)

const hasDiscussion = computed(() => discussionMessages.value.length > 0)

const currentAgentName = computed(() => {
  const agent = enabledAgents.value[currentAgentIndex.value]
  return agent?.name || ''
})

// ==================== Export ====================

export function useAgentTeam() {
  return {
    // state
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

    // computed
    enabledAgents,
    hasDiscussion,
    currentAgentName,

    // helpers
    getAgent,
    parseMention,
    ensureLoaded,

    // role CRUD
    loadAllRoles,
    saveCustomRole,
    deleteCustomRole,

    // session
    loadSessionList,
    createSession,
    deleteSession,
    loadSession,
    startNewDiscussionView,
    touchSession,

    // message
    saveMessage,
    updateMessageContent,
    loadMessagesForSession,

    // abort 控制(供发起讨论时申领新 controller、stop / 卸载时 abort)
    newAbortController,
    abortCurrentStream
  }
}
