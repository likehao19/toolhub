<template>
  <div class="dashboard-wrapper">
    <!-- 顶部状态栏：日期 + 快速统计 -->
    <header class="dash-topbar">
      <div class="topbar-date">
        <span class="date-day">{{ new Date().getDate() }}</span>
        <div class="date-meta">
          <span class="date-ym">{{ new Date().toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' }) }}</span>
          <span class="date-week">{{ todayWeekday }}</span>
        </div>
      </div>
      <div class="topbar-stats">
        <div class="stat-chip" @click="navigateTo('/todos')">
          <span class="stat-dot todo-dot"></span>
          <span class="stat-label">{{ t('dashboard.statTodos') }}</span>
          <span class="stat-num">{{ totalTodos }}</span>
        </div>
        <div class="stat-chip" @click="navigateTo('/calendar')">
          <span class="stat-dot event-dot"></span>
          <span class="stat-label">{{ t('dashboard.statEvents') }}</span>
          <span class="stat-num">{{ todayEvents.length }}</span>
        </div>
        <div class="stat-chip" @click="navigateTo('/notes')">
          <span class="stat-dot note-dot"></span>
          <span class="stat-label">{{ t('dashboard.statNotes') }}</span>
          <span class="stat-num">{{ totalNotes }}</span>
        </div>
        <div class="stat-chip" @click="navigateTo('/bookmarks')">
          <span class="stat-dot bm-dot"></span>
          <span class="stat-label">{{ t('dashboard.statBookmarks') }}</span>
          <span class="stat-num">{{ totalBookmarks }}</span>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" :title="t('dashboard.aiAssistant')" @click="showAIAssistant = true">
          <el-icon><MagicStick /></el-icon>
        </button>
        <button class="icon-btn" @click="refreshAll" :title="t('dashboard.refresh')">
          <el-icon><Refresh /></el-icon>
        </button>
      </div>
    </header>

    <!-- 快捷入口：左书签图标 | 右凭据列表 -->
    <div class="quick-strip" v-if="topBookmarks.length > 0 || topPasswords.length > 0">
      <!-- 左：常用网站（仅图标） -->
      <div class="qs-bookmarks" v-if="topBookmarks.length > 0">
        <div
          v-for="bm in topBookmarks"
          :key="'bm-' + bm.id"
          class="qs-bm-icon"
          @click="openBookmark(bm)"
          :title="bm.title + '\n' + bm.url"
        >
          <img v-if="bm.favicon_url" :src="bm.favicon_url" class="qs-favicon" />
          <el-icon v-else class="qs-favicon-fallback"><Link /></el-icon>
        </div>
      </div>

      <div class="qs-divider" v-if="topBookmarks.length > 0 && topPasswords.length > 0"></div>

      <!-- 右：常用凭据（标题 + 复制账号/密码） -->
      <div class="qs-credentials" v-if="topPasswords.length > 0">
        <div
          v-for="pwd in topPasswords"
          :key="'pwd-' + pwd.id"
          class="qs-cred-item"
        >
          <span class="qs-cred-title">{{ pwd.title }}</span>
          <button class="qs-copy-btn" @click="copyText(pwd.username, t('dashboard.copyAccount'))" :title="t('dashboard.copyAccount')">
            <el-icon><User /></el-icon>
          </button>
          <button class="qs-copy-btn" @click="copyText(decryptPassword(pwd.password), t('dashboard.copyPassword'))" :title="t('dashboard.copyPassword')">
            <el-icon><Key /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="dash-body">
      <!-- 左列：最近笔记 -->
      <section class="dash-primary">
        <div class="section-block">
          <div class="section-head">
            <span class="section-title">{{ t('dashboard.recentNotes') }}</span>
            <button class="link-btn" @click="navigateTo('/notes')"><el-icon><ArrowRight /></el-icon></button>
          </div>
          <div class="section-content">
            <div v-if="recentNotes.length === 0" class="empty-state" @click="navigateTo('/notes')">
              <el-icon class="empty-icon"><Document /></el-icon>
              <span class="empty-text">{{ t('dashboard.noNotes') }}</span>
            </div>
            <div v-else class="note-rows">
              <div
                v-for="note in recentNotes"
                :key="note.name"
                class="note-row"
                @click="openNote(note)"
              >
                <el-icon class="note-row-icon"><Document /></el-icon>
                <span class="note-row-name">{{ note.title || note.name }}</span>
                <span class="note-row-time">{{ formatDate(note.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 右列：待办 + 日程 -->
      <aside class="dash-secondary">
        <div class="section-block">
          <div class="section-head">
            <span class="section-title">{{ t('dashboard.todos') }}</span>
            <button class="link-btn" @click="navigateTo('/todos')"><el-icon><ArrowRight /></el-icon></button>
          </div>
          <div class="section-content">
            <div v-if="todayTodos.length === 0" class="empty-state" @click="navigateTo('/todos')">
              <el-icon class="empty-icon"><CircleCheck /></el-icon>
              <span class="empty-text">{{ t('dashboard.noTodos') }}</span>
              <span class="empty-sub">{{ t('dashboard.goAddTask') }}</span>
            </div>
            <div v-else class="todo-rows">
              <template v-for="todo in todayTodos.slice(0, 5)" :key="todo.id">
                <!-- 主任务 -->
                <div class="todo-row">
                  <span
                    v-if="todo.children && todo.children.length"
                    class="todo-arrow"
                    :class="{ 'is-open': expandedTodos.has(todo.id) }"
                    @click="toggleExpand(todo.id)"
                  >&#9654;</span>
                  <span v-else class="todo-arrow-placeholder"></span>
                  <el-checkbox
                    v-model="todo.completed"
                    @change="toggleTodo(todo)"
                    class="todo-check"
                  />
                  <span class="todo-label" :class="{ 'is-done': todo.completed }">{{ todo.title }}</span>
                  <span v-if="todo.priority === 2" class="priority-dot"></span>
                  <span class="todo-progress-bar" :title="Math.round(childProgress(todo) * 100) + '%'">
                    <span class="todo-progress-fill" :style="{ width: (childProgress(todo) * 100) + '%' }"></span>
                  </span>
                  <span class="todo-progress-text">{{ Math.round(childProgress(todo) * 100) }}%</span>
                  <span v-if="todo.due_date" class="todo-due">{{ todo.due_date }}</span>
                </div>
                <!-- 子任务（折叠） -->
                <template v-if="expandedTodos.has(todo.id)">
                  <div
                    v-for="child in todo.children"
                    :key="child.id"
                    class="todo-row todo-child"
                  >
                    <el-checkbox
                      v-model="child.completed"
                      @change="toggleTodo(child)"
                      class="todo-check"
                    />
                    <span class="todo-label" :class="{ 'is-done': child.completed }">{{ child.title }}</span>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>

        <div class="section-block">
          <div class="section-head">
            <span class="section-title">{{ t('dashboard.upcomingEvents') }}</span>
            <button class="link-btn" @click="navigateTo('/calendar')"><el-icon><ArrowRight /></el-icon></button>
          </div>
          <div class="section-content">
            <div v-if="todayEvents.length === 0" class="empty-state" @click="navigateTo('/calendar')">
              <el-icon class="empty-icon"><Clock /></el-icon>
              <span class="empty-text">{{ t('dashboard.noEvents') }}</span>
              <span class="empty-sub">{{ t('dashboard.goAddEvent') }}</span>
            </div>
            <div v-else class="event-timeline">
              <div
                v-for="(event, idx) in todayEvents.slice(0, 8)"
                :key="event.id"
                class="tl-item"
                @click="navigateTo('/calendar')"
              >
                <div class="tl-rail">
                  <span class="tl-dot" :class="{ 'tl-dot-now': isNowOrFuture(event.start_time) }"></span>
                  <span v-if="idx < todayEvents.slice(0, 8).length - 1" class="tl-line"></span>
                </div>
                <div class="tl-content">
                  <span class="tl-time">{{ formatEventTime(event.start_time) }}</span>
                  <span class="tl-title">{{ event.title }}</span>
                  <span v-if="event.description" class="tl-desc">{{ event.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- AI助手对话框 -->
    <AIAssistant v-model="showAIAssistant" @operation-complete="handleOperationComplete" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Calendar, CircleCheck, Clock, Document, Key, Link, Lock, MagicStick, Refresh, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { decryptPassword } from '@/utils/encryption'
import AIAssistant from '@/components/AIAssistant.vue'
import { t, locale } from '@/i18n'

const router = useRouter()
const showAIAssistant = ref(false)
const expandedTodos = ref(new Set())

// 数据状态
const todayTodos = ref([])
const todayEvents = ref([])
const recentNotes = ref([])
const topBookmarks = ref([])
const topPasswords = ref([])
const passwordStats = ref({
  total: 0,
  strong: 0,
  weak: 0
})

// 统计数据
const totalNotes = ref(0)
const totalTodos = ref(0)
const totalBookmarks = ref(0)
const completedTodos = ref(0)
const todoCompletionRate = ref(0)
const weekEvents = ref(0)

// 今日日期信息
const todayDate = ref('')
const todayWeekday = ref('')
const lunarDate = ref('')

// 初始化今日日期
const initTodayDate = () => {
  const now = new Date()
  const loc = locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'
  todayDate.value = now.toLocaleDateString(loc, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  todayWeekday.value = now.toLocaleDateString(loc, { weekday: 'long' })

  // 简单的农历显示（可以后续集成农历库）
  lunarDate.value = `农历${now.getMonth() + 1}月${now.getDate()}日`
}

// 加载待办
const loadTodayTodos = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')

    // 获取主任务
    const parents = await db.select(
      `SELECT * FROM todos
       WHERE status = 0 AND (parent_id IS NULL OR parent_id = 0)
       ORDER BY priority DESC, due_date ASC, created_at DESC
       LIMIT 8`
    )

    // 获取这些主任务的子任务
    const parentIds = parents.map(p => p.id)
    let children = []
    if (parentIds.length > 0) {
      children = await db.select(
        `SELECT * FROM todos
         WHERE parent_id IN (${parentIds.map(() => '?').join(',')})
         ORDER BY created_at ASC`,
        parentIds
      )
    }

    // 组装树结构
    const childMap = {}
    for (const c of children) {
      if (!childMap[c.parent_id]) childMap[c.parent_id] = []
      childMap[c.parent_id].push({ ...c, completed: c.status === 1 })
    }
    todayTodos.value = parents.map(t => ({
      ...t,
      completed: t.status === 1,
      children: childMap[t.id] || []
    }))

    // 获取待办总数和完成数
    const totalResult = await db.select('SELECT COUNT(*) as count FROM todos WHERE status = 0')
    totalTodos.value = totalResult[0]?.count || 0

    const completedResult = await db.select('SELECT COUNT(*) as count FROM todos WHERE status = 1')
    completedTodos.value = completedResult[0]?.count || 0

    // 计算完成率
    const total = totalTodos.value + completedTodos.value
    todoCompletionRate.value = total > 0 ? Math.round((completedTodos.value / total) * 100) : 0
  } catch (error) {
    todayTodos.value = []
    totalTodos.value = 0
    completedTodos.value = 0
    todoCompletionRate.value = 0
  }
}

// 加载日程
const loadTodayEvents = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const today = new Date().toISOString().split('T')[0]

    // 获取今天及之后的日程
    const events = await db.select(
      `SELECT * FROM calendar_events
       WHERE DATE(start_time) >= ?
       ORDER BY start_time ASC
       LIMIT 8`,
      [today]
    )
    todayEvents.value = events || []

    // 获取本周日程数量
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const weekResult = await db.select(
      `SELECT COUNT(*) as count FROM calendar_events
       WHERE DATE(start_time) >= ? AND DATE(start_time) < ?`,
      [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
    )
    weekEvents.value = weekResult[0]?.count || 0
  } catch (error) {
    todayEvents.value = []
    weekEvents.value = 0
  }
}

// 加载最近笔记（从文件系统扫描）
const loadRecentNotes = async () => {
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { readDir, stat } = await import('@tauri-apps/plugin-fs')
    const { join } = await import('@tauri-apps/api/path')

    const notesDir = await getNotesDir()
    const allFiles = []

    const scanDir = async (dirPath, folder) => {
      try {
        const entries = await readDir(dirPath)
        for (const entry of entries) {
          const fullPath = await join(dirPath, entry.name)
          if (entry.isDirectory && entry.name !== 'images' && !entry.name.startsWith('_')) {
            await scanDir(fullPath, entry.name)
          } else if (/\.(md|txt)$/i.test(entry.name)) {
            let mtime = null
            try {
              const s = await stat(fullPath)
              mtime = s.mtime
            } catch { /* ignore */ }
            allFiles.push({
              name: (folder ? folder + '/' : '') + entry.name,
              title: entry.name.replace(/\.(md|txt)$/i, ''),
              folder,
              updated_at: mtime ? new Date(mtime).toISOString() : new Date().toISOString()
            })
          }
        }
      } catch { /* ignore */ }
    }

    await scanDir(notesDir, null)
    allFiles.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    recentNotes.value = allFiles.slice(0, 20)
    totalNotes.value = allFiles.length
  } catch {
    recentNotes.value = []
    totalNotes.value = 0
  }
}

// 加载常用书签（quick-strip 展示）
const loadTopBookmarks = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const bookmarks = await db.select(
      `SELECT id, title, url, favicon_url
       FROM bookmarks
       ORDER BY access_count DESC, updated_at DESC
       LIMIT 8`
    )
    topBookmarks.value = bookmarks || []
  } catch {
    topBookmarks.value = []
  }
}

// 加载常用凭据（quick-strip 展示）
const loadTopPasswords = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    let passwords = []
    try {
      passwords = await db.select(
        `SELECT id, title, username, password, website
         FROM passwords
         WHERE is_deleted = 0 OR is_deleted IS NULL
         ORDER BY is_favorite DESC, updated_at DESC
         LIMIT 6`
      )
    } catch {
      passwords = await db.select(
        `SELECT id, title, username, password, website
         FROM passwords
         ORDER BY updated_at DESC
         LIMIT 6`
      )
    }
    topPasswords.value = passwords || []
  } catch {
    topPasswords.value = []
  }
}

// 加载书签统计
const loadBookmarkStats = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')

    // 获取书签总数
    const totalResult = await db.select('SELECT COUNT(*) as count FROM bookmarks')
    totalBookmarks.value = totalResult[0]?.count || 0
  } catch (error) {
    totalBookmarks.value = 0
  }
}

// 加载密码统计
const loadPasswordStats = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const stats = await db.select('SELECT COUNT(*) as total FROM passwords')
    passwordStats.value.total = stats[0]?.total || 0

    // 根据password_strength字段统计（如果存在）
    try {
      const strongStats = await db.select('SELECT COUNT(*) as count FROM passwords WHERE password_strength >= 3')
      const weakStats = await db.select('SELECT COUNT(*) as count FROM passwords WHERE password_strength < 3 OR password_strength IS NULL')
      passwordStats.value.strong = strongStats[0]?.count || Math.floor(passwordStats.value.total * 0.7)
      passwordStats.value.weak = weakStats[0]?.count || (passwordStats.value.total - passwordStats.value.strong)
    } catch {
      // 如果没有password_strength字段，使用估算
      passwordStats.value.strong = Math.floor(passwordStats.value.total * 0.7)
      passwordStats.value.weak = passwordStats.value.total - passwordStats.value.strong
    }
  } catch (error) {
    passwordStats.value = { total: 0, strong: 0, weak: 0 }
  }
}

// 刷新所有数据
const refreshAll = async () => {
  try {
    await Promise.all([
      loadTodayTodos(),
      loadTodayEvents(),
      loadRecentNotes(),
      loadTopBookmarks(),
      loadTopPasswords(),
      loadBookmarkStats(),
      loadPasswordStats()
    ])
    ElMessage.success(t('dashboard.dataUpdated'))
  } catch (error) {
    ElMessage.error(t('dashboard.refreshFailed'))
  }
}

// 切换待办完成状态
const toggleTodo = async (todo) => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const newStatus = todo.completed ? 1 : 0
    await db.execute(
      'UPDATE todos SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?',
      [newStatus, new Date().toISOString(), todo.completed ? new Date().toISOString() : null, todo.id]
    )
    ElMessage.success(todo.completed ? t('dashboard.completed') : t('dashboard.markedUncompleted'))
  } catch (error) {
    todo.completed = !todo.completed // 回滚
    ElMessage.error(t('dashboard.updateFailed'))
  }
}

// 展开/折叠子任务
const toggleExpand = (todoId) => {
  if (expandedTodos.value.has(todoId)) {
    expandedTodos.value.delete(todoId)
  } else {
    expandedTodos.value.add(todoId)
  }
}

// 计算子任务完成进度
const childProgress = (todo) => {
  if (!todo.children || todo.children.length === 0) return todo.progress || 0
  const done = todo.children.filter(c => c.completed).length
  return done / todo.children.length
}

// 判断是否当前或未来时间
const isNowOrFuture = (timeStr) => {
  if (!timeStr) return false
  return new Date(timeStr) >= new Date()
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleTimeString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

// 格式化日程时间（完整年月日时分秒）
const formatEventTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${M}-${d} ${h}:${m}:${s}`
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / 86400000)

  if (days === 0) return t('dashboard.today')
  if (days === 1) return t('dashboard.yesterday')
  if (days < 7) return `${days}${t('dashboard.daysAgo')}`
  return date.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' })
}

// 导航
const navigateTo = (path) => {
  router.push(path)
}

// 打开笔记
const openNote = (note) => {
  router.push(`/notes?note=${encodeURIComponent(note.name)}`)
}

// 打开书签
const openBookmark = (bookmark) => {
  window.open(bookmark.url, '_blank')
}

// 复制文本到剪贴板
const copyText = async (text, label) => {
  if (!text) {
    ElMessage.warning(`${label}`)
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}`)
  } catch {
    ElMessage.error(t('dashboard.copyFailed'))
  }
}

// AI操作完成回调
const handleOperationComplete = () => {
  // 刷新相关数据
  refreshAll()
}

// 键盘快捷键：Ctrl+K 唤起AI助手
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showAIAssistant.value = true
  }
}

// 页面加载
onMounted(() => {
  initTodayDate()
  refreshAll()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* ================================================================
   Borderless — 纯白底 · 细线分区 · 快捷入口
   ================================================================ */
.dashboard-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #fff);
  overflow: hidden;
}

/* ── 顶部状态栏 ───────────────────────────────── */
.dash-topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--border-color, #ebebef);
  flex-shrink: 0;
}

.topbar-date {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-day {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.date-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-ym {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.date-week {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.topbar-stats {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}

.stat-chip:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.todo-dot  { background: #3b82f6; }
.event-dot { background: #f59e0b; }
.note-dot  { background: #10b981; }
.bm-dot   { background: #8b5cf6; }

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.stat-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.topbar-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--text-tertiary, #999);
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  color: var(--text-primary);
}

/* ── 快捷入口条：左书签 | 右凭据 均匀分布 ────────── */
.quick-strip {
  display: flex;
  align-items: center;
  padding: 10px 28px;
  border-bottom: 1px solid var(--border-color, #ebebef);
  flex-shrink: 0;
  gap: 0;
  min-height: 0;
}

.qs-bookmarks {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
}

.qs-bm-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  border: 1px solid var(--border-color, #ebebef);
}

.qs-bm-icon:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  transform: scale(1.08);
}

.qs-favicon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: contain;
}

.qs-favicon-fallback {
  font-size: 14px;
  color: var(--text-quaternary, #c7c7cc);
}

.qs-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color, #ebebef);
  flex-shrink: 0;
  margin: 0 16px;
}

.qs-credentials {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}

.qs-credentials::-webkit-scrollbar { display: none; }

.qs-cred-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #ebebef);
  flex-shrink: 0;
  max-width: 220px;
}

.qs-cred-title {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.qs-copy-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 4px;
  color: var(--text-quaternary, #aeaeb2);
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}

.qs-copy-btn:hover {
  background: var(--bg-hover, rgba(0,0,0,0.06));
  color: var(--text-primary);
}

/* ── 主体双栏布局 ──────────────────────────────── */
.dash-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.dash-primary {
  flex: 1;
  min-width: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dash-secondary {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid var(--border-color, #ebebef);
  display: flex;
  flex-direction: column;
}

/* ── 区块容器 ──────────────────────────────────── */
.section-block {
  padding: 20px 28px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-block + .section-block {
  border-top: 1px solid var(--border-color, #ebebef);
}

/* ── 区块标题栏 ────────────────────────────────── */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary, #8e8e93);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.link-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-quaternary, #aeaeb2);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.link-btn:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  color: var(--text-primary);
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── 空态 ──────────────────────────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px;
  border-radius: 8px;
  border: 1px dashed var(--border-color, #e0e0e3);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 90px;
}

.empty-state:hover {
  border-color: var(--text-quaternary, #c7c7cc);
  background: var(--bg-hover, rgba(0,0,0,0.015));
}

.empty-icon {
  font-size: 26px;
  color: var(--text-quaternary, #d1d1d6);
}

.empty-text {
  font-size: 13px;
  color: var(--text-tertiary, #8e8e93);
}

.empty-sub {
  font-size: 11px;
  color: var(--text-quaternary, #c7c7cc);
}

/* ── 笔记行 ───────────────────────────────────── */
.note-rows {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.note-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--border-color, #ebebef);
}

.note-row:last-child {
  border-bottom: none;
}

.note-row:hover {
  background: var(--bg-hover, rgba(0,0,0,0.03));
}

.note-row-icon {
  font-size: 15px;
  color: var(--text-quaternary, #c7c7cc);
  flex-shrink: 0;
}

.note-row-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row-time {
  font-size: 11px;
  color: var(--text-quaternary, #aeaeb2);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ── 待办行 ────────────────────────────────────── */
.todo-rows {
  display: flex;
  flex-direction: column;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 5px;
  transition: background 0.12s;
  border-bottom: 1px solid var(--border-color, #ebebef);
}

.todo-row:last-child {
  border-bottom: none;
}

.todo-row:hover {
  background: var(--bg-hover, rgba(0,0,0,0.03));
}

.todo-arrow {
  width: 14px;
  font-size: 8px;
  color: var(--text-quaternary, #aeaeb2);
  cursor: pointer;
  flex-shrink: 0;
  text-align: center;
  transition: transform 0.15s;
  user-select: none;
  line-height: 1;
}

.todo-arrow.is-open {
  transform: rotate(90deg);
}

.todo-arrow-placeholder {
  width: 14px;
  flex-shrink: 0;
}

.todo-check {
  flex-shrink: 0;
}

.todo-check :deep(.el-checkbox__inner) {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.todo-label {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.todo-label.is-done {
  text-decoration: line-through;
  color: var(--text-quaternary, #c7c7cc);
}

.priority-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.todo-progress-bar {
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: var(--border-color, #ebebef);
  overflow: hidden;
  flex-shrink: 0;
}

.todo-progress-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: #3b82f6;
}

.todo-progress-text {
  font-size: 10px;
  color: var(--text-quaternary, #aeaeb2);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 26px;
  text-align: right;
}

.todo-due {
  font-size: 10px;
  color: var(--text-quaternary, #aeaeb2);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.todo-child {
  padding-left: 34px;
}

.todo-child .todo-label {
  font-size: 11px;
  color: var(--text-secondary, #636366);
}

/* ── 日程时间线 ──────────────────────────────────── */
.event-timeline {
  display: flex;
  flex-direction: column;
}

.tl-item {
  display: flex;
  gap: 10px;
  cursor: pointer;
  padding-right: 4px;
}

.tl-item:hover .tl-title {
  color: var(--el-color-primary, #409eff);
}

.tl-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
  padding-top: 2px;
}

.tl-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border-color, #dcdfe6);
  flex-shrink: 0;
  z-index: 1;
}

.tl-dot-now {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.tl-line {
  width: 1px;
  flex: 1;
  background: var(--border-color, #e4e7ed);
  min-height: 8px;
}

.tl-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 10px;
}

.tl-time {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-quaternary, #aeaeb2);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tl-title {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.12s;
}

.tl-desc {
  font-size: 10px;
  color: var(--text-quaternary, #aeaeb2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 滚动条 ────────────────────────────────────── */
.dash-primary::-webkit-scrollbar,
.dash-secondary::-webkit-scrollbar,
.note-rows::-webkit-scrollbar {
  width: 4px;
}

.dash-primary::-webkit-scrollbar-track,
.dash-secondary::-webkit-scrollbar-track,
.note-rows::-webkit-scrollbar-track {
  background: transparent;
}

.dash-primary::-webkit-scrollbar-thumb,
.dash-secondary::-webkit-scrollbar-thumb,
.note-rows::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}

.dash-primary:hover::-webkit-scrollbar-thumb,
.dash-secondary:hover::-webkit-scrollbar-thumb,
.note-rows:hover::-webkit-scrollbar-thumb {
  background: var(--text-quaternary, #d1d1d6);
}

/* ── 响应式 ────────────────────────────────────── */
@media (max-width: 900px) {
  .dash-body {
    flex-direction: column;
  }

  .dash-secondary {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color, #ebebef);
  }

  .topbar-stats {
    display: none;
  }

  .quick-nav {
    padding: 12px 20px;
  }

  .section-block {
    padding: 16px 20px;
  }
}
</style>
