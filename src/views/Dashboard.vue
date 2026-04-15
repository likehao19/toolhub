<template>
  <div class="dashboard-wrapper">
    <header class="dash-topbar">
      <div class="topbar-hero">
        <div class="topbar-copy">
          <div class="topbar-date-line">
            <span class="date-day">{{ currentDayNumber }}</span>
            <span class="date-meta">
              <span class="date-week">{{ currentWeekday }}</span>
              <span class="date-ym">{{ currentYearMonth }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="topbar-stats">
        <div class="stat-item" @click="navigateTo('/todos')">
          <span class="stat-chip-main">
            <span class="stat-dot todo-dot"></span>
            <span class="stat-label">{{ t('dashboard.statTodos') }}</span>
          </span>
          <span class="stat-num">{{ upcomingTodoCount }}</span>
        </div>
        <div class="stat-item" @click="navigateTo('/calendar')">
          <span class="stat-chip-main">
            <span class="stat-dot event-dot"></span>
            <span class="stat-label">{{ t('dashboard.statEvents') }}</span>
          </span>
          <span class="stat-num">{{ upcomingEventCount }}</span>
        </div>
        <div class="stat-item" @click="navigateTo('/notes')">
          <span class="stat-chip-main">
            <span class="stat-dot note-dot"></span>
            <span class="stat-label">{{ t('dashboard.statNotes') }}</span>
          </span>
          <span class="stat-num">{{ recentNotes.length }}</span>
        </div>
        <div class="stat-item" @click="navigateTo('/bookmarks')">
          <span class="stat-chip-main">
            <span class="stat-dot bm-dot"></span>
            <span class="stat-label">{{ t('dashboard.statBookmarks') }}</span>
          </span>
          <span class="stat-num">{{ topBookmarks.length }}</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-btn" :title="t('dashboard.aiAssistant')" @click="showAIAssistant = true">
            <el-icon><MagicStick /></el-icon>
          </button>
          <button class="icon-btn" @click="refreshAll" :title="t('dashboard.refresh')">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
      </div>

    </header>

    <div class="quick-strip" v-if="topBookmarks.length > 0 || topPasswords.length > 0">
      <div class="quick-panel qs-bookmarks panel-surface panel-surface-soft" v-if="topBookmarks.length > 0">
        <div class="quick-panel-head">
          <div class="quick-panel-title-row">
            <span class="quick-panel-label">{{ t('dashboard.statBookmarks') }}</span>
            <span class="quick-panel-count">{{ topBookmarks.length }}</span>
          </div>
        </div>
        <div class="qs-bookmark-list">
          <div
            v-for="bm in topBookmarks"
            :key="'bm-' + bm.id"
            class="qs-bm-icon"
            @click="openBookmark(bm)"
            :title="bm.title + '\n' + bm.url"
          >
            <img v-if="bm.favicon_data" :src="bm.favicon_data" class="qs-favicon" />
            <img v-else-if="bm.favicon_url" :src="bm.favicon_url" class="qs-favicon" @error="$event.target.style.display='none'" />
            <el-icon v-else class="qs-favicon-fallback"><Link /></el-icon>
          </div>
        </div>
      </div>

      <div class="quick-panel qs-credentials panel-surface panel-surface-soft" v-if="topPasswords.length > 0">
        <div class="quick-panel-head">
          <div class="quick-panel-title-row">
            <span class="quick-panel-label">{{ t('dashboard.credentials') }}</span>
            <span class="quick-panel-count">{{ topPasswords.length }}</span>
          </div>
        </div>
        <div class="qs-credentials-list">
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
    </div>

    <!-- 主体内容 -->
    <div class="dashboard-workspace">
      <div class="dash-body">
      <!-- 左列：最近笔记 -->
      <section class="dash-primary">
        <div class="section-block section-notes panel-surface panel-surface-soft">
          <div class="section-head">
            <div class="section-heading">
              <span class="section-title">{{ t('dashboard.recentNotes') }}</span>
              <span class="section-meta">{{ t('dashboard.itemsCount', { count: recentNotes.length }) }}</span>
            </div>
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
        <div class="section-block section-todos panel-surface panel-surface-soft">
          <div class="section-head">
            <div class="section-heading">
              <span class="section-title">{{ t('dashboard.todos') }}</span>
              <span class="section-meta">{{ t('dashboard.itemsCount', { count: todayTodos.length }) }}</span>
            </div>
            <button class="link-btn" @click="navigateTo('/todos')"><el-icon><ArrowRight /></el-icon></button>
          </div>
          <div class="section-content">
            <div v-if="todayTodos.length === 0" class="empty-state" @click="navigateTo('/todos')">
              <el-icon class="empty-icon"><CircleCheck /></el-icon>
              <span class="empty-text">{{ t('dashboard.noTodos') }}</span>
              <span class="empty-sub">{{ t('dashboard.goAddTask') }}</span>
            </div>
            <div v-else class="todo-rows">
              <template v-for="todo in visibleTodos" :key="todo.id">
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

        <div class="section-block section-events panel-surface panel-surface-soft">
          <div class="section-head">
            <div class="section-heading">
              <span class="section-title">{{ t('dashboard.upcomingEvents') }}</span>
              <span class="section-meta">{{ t('dashboard.itemsCount', { count: todayEvents.length }) }}</span>
            </div>
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
                v-for="(event, idx) in visibleEvents"
                :key="event.id"
                class="tl-item"
                @click="navigateTo('/calendar')"
              >
                <div class="tl-rail">
                  <span class="tl-dot" :class="{ 'tl-dot-now': isNowOrFuture(event.start_time) }"></span>
                  <span v-if="idx < visibleEvents.length - 1" class="tl-line"></span>
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
    </div>

    <!-- AI助手对话框 -->
    <AIAssistant v-model="showAIAssistant" @operation-complete="handleOperationComplete" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, CircleCheck, Clock, Document, Key, Link, MagicStick, Refresh, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { decryptPassword } from '@/utils/encryption'
import { TauriShell } from '@/utils/tauri'
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

const currentDate = ref(new Date())
let currentDateTimer = null
const dateLocale = computed(() => (locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'))

const visibleTodos = computed(() => todayTodos.value.slice(0, 5))
const visibleEvents = computed(() => todayEvents.value.slice(0, 8))
const currentDayNumber = computed(() => currentDate.value.getDate())
const currentWeekday = computed(() => currentDate.value.toLocaleDateString(dateLocale.value, { weekday: 'long' }))
const currentYearMonth = computed(() => currentDate.value.toLocaleDateString(dateLocale.value, { year: 'numeric', month: 'long' }))
const upcomingTodoCount = computed(() => todayTodos.value.length)
const upcomingEventCount = computed(() => todayEvents.value.length)

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

  } catch (error) {
    todayTodos.value = []
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

  } catch (error) {
    todayEvents.value = []
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
  } catch {
    recentNotes.value = []
  }
}

// 加载常用书签（quick-strip 展示）
const loadTopBookmarks = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const bookmarks = await db.select(
      `SELECT id, title, url, favicon_url, favicon_data
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
         LIMIT 3`
      )
    } catch {
      passwords = await db.select(
        `SELECT id, title, username, password, website
         FROM passwords
         ORDER BY updated_at DESC
         LIMIT 3`
      )
    }
    topPasswords.value = passwords || []
  } catch {
    topPasswords.value = []
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
      loadTopPasswords()
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

// 打开书签（使用系统默认浏览器）
const openBookmark = async (bookmark) => {
  try {
    await TauriShell.openURL(bookmark.url)
  } catch (error) {
    console.error('打开书签失败:', error)
  }

  // 更新访问次数（不阻塞）
  Database.load('sqlite:productivity.db').then(db =>
    db.execute(
      'UPDATE bookmarks SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?',
      [new Date().toISOString(), bookmark.id]
    )
  ).catch(() => {})
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

const startCurrentDateTimer = () => {
  const syncCurrentDate = () => {
    currentDate.value = new Date()
  }

  syncCurrentDate()

  const scheduleNextSync = () => {
    const now = new Date()
    const nextMinute = new Date(now)
    nextMinute.setSeconds(0, 0)
    nextMinute.setMinutes(nextMinute.getMinutes() + 1)

    currentDateTimer = window.setTimeout(() => {
      syncCurrentDate()
      scheduleNextSync()
    }, nextMinute.getTime() - now.getTime())
  }

  scheduleNextSync()
}

const stopCurrentDateTimer = () => {
  if (currentDateTimer !== null) {
    window.clearTimeout(currentDateTimer)
    currentDateTimer = null
  }
}

// 页面加载
onMounted(() => {
  startCurrentDateTimer()
  refreshAll()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopCurrentDateTimer()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.dashboard-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 5px;
  gap: 6px;
  background: var(--surface-page);
  overflow: hidden;
}

.panel-surface {
  background: color-mix(in srgb, var(--surface-panel) 70%, var(--bg-secondary) 30%);
  border: 1px solid var(--surface-divider);
  box-shadow: var(--shadow-card);
  border-radius: 14px;
}

.panel-surface-soft {
  background: color-mix(in srgb, var(--surface-panel-soft) 68%, var(--bg-secondary) 32%);
}

.dash-topbar {
  display: grid;
  grid-template-columns: minmax(170px, auto) minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--surface-panel-soft) 62%, var(--bg-secondary) 38%);
  border: 1px solid var(--surface-divider);
  box-shadow: var(--shadow-sm);
  border-radius: 14px;
  backdrop-filter: saturate(150%) blur(12px);
  flex-shrink: 0;
}

.topbar-hero {
  display: flex;
  align-items: center;
  min-width: 0;
}

.topbar-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-panel-label,
.section-title {
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.topbar-date-line {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.date-day {
  min-width: 56px;
  font-size: 40px;
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.035em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.date-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.date-week {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.08;
  color: var(--text-primary);
}

.date-ym {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--text-tertiary);
}

.topbar-stats {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px 18px;
  min-width: 0;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.stat-item:hover {
  opacity: 0.84;
}

.stat-chip-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.stat-chip-main .stat-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  flex-shrink: 0;
  opacity: 0.92;
}

.todo-dot  { background: #3b82f6; }
.event-dot { background: #f59e0b; }
.note-dot  { background: #10b981; }
.bm-dot    { background: #8b5cf6; }

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-num {
  min-width: 18px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  text-align: right;
  flex-shrink: 0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: var(--surface-muted);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.icon-btn:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
  color: var(--text-primary);
}

.quick-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 6px;
  flex-shrink: 0;
}

.quick-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
}

.quick-panel-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.quick-panel-title-row,
.section-heading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.quick-panel-count,
.section-meta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  min-height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-medium);
  color: var(--text-tertiary);
  background: var(--surface-muted);
  border: 1px solid transparent;
  font-variant-numeric: tabular-nums;
}

.qs-bookmarks,
.qs-credentials {
  padding-bottom: 8px;
}

.qs-bookmark-list,
.qs-credentials-list {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.qs-bookmark-list::-webkit-scrollbar,
.qs-credentials-list::-webkit-scrollbar {
  display: none;
}

.qs-bm-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid transparent;
  background: var(--surface-muted);
  flex-shrink: 0;
}

.qs-bm-icon:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
}

.qs-favicon {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  object-fit: contain;
}

.qs-favicon-fallback {
  font-size: 13px;
  color: var(--text-quaternary);
}

.qs-cred-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px 3px 7px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: var(--surface-muted);
  flex-shrink: 0;
  min-width: 132px;
  max-width: 200px;
}

.qs-cred-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.qs-copy-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: var(--surface-accent);
  border-radius: 5px;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 10px;
  flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.qs-copy-btn:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
  color: var(--accent-blue);
}

.dashboard-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
}

.dash-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) 360px;
  overflow: hidden;
  gap: 10px;
  padding: 2px 0 0;
}

.dash-primary,
.dash-secondary {
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-block {
  padding: 10px 12px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-notes {
  flex: 1;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  padding: 0 4px;
  flex-shrink: 0;
}

.link-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.link-btn:hover {
  background: var(--surface-muted);
  color: var(--accent-blue);
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 14px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--surface-muted);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  min-height: 70px;
}

.empty-state:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
}

.empty-icon {
  font-size: 20px;
  color: var(--text-quaternary);
}

.empty-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-sub {
  font-size: 10px;
  color: var(--text-quaternary);
}

.note-rows {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  gap: 3px;
}

.note-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 7px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid transparent;
  background: var(--surface-muted);
}

.note-row:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
}

.note-row-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
  flex-shrink: 0;
}

.note-row-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row-time {
  font-size: 10px;
  color: var(--text-quaternary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.todo-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px;
  border-radius: 8px;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid transparent;
  background: var(--surface-muted);
}

.todo-row:hover {
  background: var(--surface-hover);
  border-color: var(--surface-divider);
}

.todo-arrow {
  width: 14px;
  font-size: 8px;
  color: var(--text-quaternary);
  cursor: pointer;
  flex-shrink: 0;
  text-align: center;
  transition: transform var(--transition-fast);
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
  width: 13px;
  height: 13px;
  border-radius: 4px;
}

.todo-label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-label.is-done {
  text-decoration: line-through;
  color: var(--text-quaternary);
}

.priority-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.todo-progress-bar {
  width: 32px;
  height: 3px;
  border-radius: 999px;
  background: var(--surface-divider);
  overflow: hidden;
  flex-shrink: 0;
}

.todo-progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.todo-progress-text,
.todo-due {
  font-size: 10px;
  color: var(--text-quaternary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.todo-progress-text {
  width: 22px;
  text-align: right;
}

.todo-child {
  margin-left: 18px;
}

.todo-child .todo-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tl-item {
  display: flex;
  gap: 8px;
  cursor: pointer;
  padding: 4px 3px 4px 0;
  border-radius: 7px;
  transition: background var(--transition-fast);
}

.tl-item:hover {
  background: var(--surface-muted);
}

.tl-item:hover .tl-title {
  color: var(--accent-blue);
}

.tl-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 10px;
  flex-shrink: 0;
  padding-top: 2px;
}

.tl-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.6);
  flex-shrink: 0;
  z-index: 1;
}

.tl-dot-now {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}

.tl-line {
  width: 1px;
  flex: 1;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.22), rgba(148, 163, 184, 0.04));
  min-height: 10px;
}

.tl-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 6px;
}

.tl-time {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-quaternary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tl-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.tl-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash-primary::-webkit-scrollbar,
.dash-secondary::-webkit-scrollbar,
.note-rows::-webkit-scrollbar {
  width: 6px;
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
  border-radius: 999px;
}

.dash-primary:hover::-webkit-scrollbar-thumb,
.dash-secondary:hover::-webkit-scrollbar-thumb,
.note-rows:hover::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.42);
}

@media (max-width: 900px) {
  .dash-topbar {
    grid-template-columns: 1fr;
  }

  .topbar-stats {
    justify-content: flex-start;
  }
}

@media (max-width: 540px) {
  .topbar-date-line {
    gap: 10px;
  }

  .date-day {
    min-width: 52px;
    font-size: 34px;
  }

  .date-meta {
    gap: 2px;
  }

  .date-ym {
    font-size: 12px;
  }

  .date-week {
    font-size: 11px;
  }

  .topbar-stats {
    gap: 6px 12px;
  }

  .stat-item {
    gap: 6px;
  }

  .stat-chip-main {
    gap: 5px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-num {
    font-size: 14px;
  }

  .stat-dot {
    width: 5px;
    height: 5px;
  }

  .topbar-actions {
    gap: 2px;
    margin-left: 0;
  }

  .icon-btn {
    width: 24px;
    height: 24px;
  }
}


</style>
