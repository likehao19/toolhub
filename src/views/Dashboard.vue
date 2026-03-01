<template>
  <div class="dashboard-wrapper">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">工作台</h1>
      <div class="dashboard-actions">
        <el-button type="primary" :icon="MagicStick" circle title="AI助手 (Ctrl+K)" @click="showAIAssistant = true" />
        <el-button :icon="Refresh" circle @click="refreshAll" title="刷新所有数据" />
      </div>
    </div>

    <!-- 卡片网格布局 -->
    <div class="dashboard-grid">
      <!-- 今日概览卡片 -->
      <el-card class="dashboard-card today-card" shadow="never">
        <div class="today-header">
          <div class="today-date-main">
            <div class="today-day">{{ new Date().getDate() }}</div>
            <div class="today-meta">
              <div class="today-month-year">{{ new Date().getFullYear() }}年{{ new Date().getMonth() + 1 }}月</div>
              <div class="today-weekday">{{ todayWeekday }}</div>
            </div>
          </div>
        </div>
        <div class="today-summary">
          <div class="summary-item">
            <span class="summary-label">待办</span>
            <span class="summary-value">{{ todayTodos.length }} 项</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-item">
            <span class="summary-label">日程</span>
            <span class="summary-value">{{ todayEvents.length }} 项</span>
          </div>
        </div>
      </el-card>

      <!-- 今日待办卡片 -->
      <el-card class="dashboard-card content-card" shadow="never">
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon-wrapper todos-bg">
              <el-icon class="header-icon-large"><CircleCheck /></el-icon>
            </div>
            <div class="header-text">
              <h3 class="header-title">今日待办</h3>
              <p class="header-subtitle">{{ todayTodos.length }} 项任务</p>
            </div>
          </div>
          <el-button text type="primary" size="small" @click="navigateTo('/todos')">
            查看全部 →
          </el-button>
        </div>
        <div class="card-content">
          <el-empty v-if="todayTodos.length === 0" description="今天没有待办事项" :image-size="80" />
          <div v-else class="todo-list">
            <div v-for="todo in todayTodos.slice(0, 4)" :key="todo.id" class="todo-item">
              <el-checkbox v-model="todo.completed" @change="toggleTodo(todo)" />
              <span class="todo-text" :class="{ completed: todo.completed }">{{ todo.title }}</span>
              <el-tag v-if="todo.priority === 'high'" size="small" type="danger">重要</el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 今日日程卡片 -->
      <el-card class="dashboard-card content-card" shadow="never">
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon-wrapper events-bg">
              <el-icon class="header-icon-large"><Clock /></el-icon>
            </div>
            <div class="header-text">
              <h3 class="header-title">今日日程</h3>
              <p class="header-subtitle">{{ todayEvents.length }} 项安排</p>
            </div>
          </div>
          <el-button text type="primary" size="small" @click="navigateTo('/calendar')">
            查看全部 →
          </el-button>
        </div>
        <div class="card-content">
          <el-empty v-if="todayEvents.length === 0" description="今天没有日程安排" :image-size="80" />
          <div v-else class="event-list">
            <div v-for="event in todayEvents.slice(0, 4)" :key="event.id" class="event-item" @click="navigateTo('/calendar')">
              <div class="event-time">
                <div class="time-badge">{{ formatTime(event.start_time) }}</div>
              </div>
              <div class="event-info">
                <div class="event-title">{{ event.title }}</div>
                <div class="event-desc" v-if="event.description">{{ event.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 最近笔记卡片 -->
      <el-card class="dashboard-card content-card" shadow="never">
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon-wrapper notes-bg">
              <el-icon class="header-icon-large"><Document /></el-icon>
            </div>
            <div class="header-text">
              <h3 class="header-title">最近笔记</h3>
              <p class="header-subtitle">最新编辑的笔记</p>
            </div>
          </div>
          <el-button text type="primary" size="small" @click="navigateTo('/notes')">
            查看全部 →
          </el-button>
        </div>
        <div class="card-content">
          <el-empty v-if="recentNotes.length === 0" description="还没有笔记" :image-size="80" />
          <div v-else class="note-list">
            <div v-for="note in recentNotes.slice(0, 5)" :key="note.name" class="note-item" @click="openNote(note)">
              <div class="note-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="note-info">
                <div class="note-name">{{ note.title || note.name }}</div>
                <div class="note-time">{{ formatDate(note.updated_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 常用书签卡片 -->
      <el-card class="dashboard-card content-card bookmarks-card" shadow="never">
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon-wrapper bookmarks-bg">
              <el-icon class="header-icon-large"><Link /></el-icon>
            </div>
            <div class="header-text">
              <h3 class="header-title">常用书签</h3>
              <p class="header-subtitle">快速访问收藏</p>
            </div>
          </div>
          <el-button text type="primary" size="small" @click="navigateTo('/bookmarks')">
            查看全部 →
          </el-button>
        </div>
        <div class="card-content">
          <el-empty v-if="frequentBookmarks.length === 0" description="还没有书签" :image-size="80" />
          <div v-else class="bookmark-grid">
            <div v-for="bookmark in frequentBookmarks.slice(0, 8)" :key="bookmark.id"
                 class="bookmark-item"
                 @click="openBookmark(bookmark)"
                 :title="bookmark.name">
              <div class="bookmark-icon">
                <img v-if="bookmark.icon_url" :src="bookmark.icon_url" />
                <el-icon v-else><Link /></el-icon>
              </div>
              <div class="bookmark-name">{{ bookmark.name }}</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- AI助手对话框 -->
    <AIAssistant v-model="showAIAssistant" @operation-complete="handleOperationComplete" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, CircleCheck, Clock, Document, Link, Lock, MagicStick, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import AIAssistant from '@/components/AIAssistant.vue'

const router = useRouter()
const showAIAssistant = ref(false)

// 数据状态
const todayTodos = ref([])
const todayEvents = ref([])
const recentNotes = ref([])
const frequentBookmarks = ref([])
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
  todayDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  todayWeekday.value = now.toLocaleDateString('zh-CN', { weekday: 'long' })

  // 简单的农历显示（可以后续集成农历库）
  lunarDate.value = `农历${now.getMonth() + 1}月${now.getDate()}日`
}

// 加载今日待办
const loadTodayTodos = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const today = new Date().toISOString().split('T')[0]

    // 获取今日待办或未完成的待办（status=0表示未完成）
    const todos = await db.select(
      `SELECT * FROM todos
       WHERE (due_date = ? OR due_date IS NULL)
       AND status = 0
       ORDER BY priority DESC, created_at DESC
       LIMIT 10`,
      [today]
    )
    // 添加completed字段以兼容UI
    todayTodos.value = todos.map(t => ({ ...t, completed: t.status === 1 }))

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

// 加载今日日程
const loadTodayEvents = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const events = await db.select(
      `SELECT * FROM calendar_events
       WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
       ORDER BY start_time ASC`,
      [today, tomorrow]
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

// 加载最近笔记
const loadRecentNotes = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const notes = await db.select(
      `SELECT note_name as name, title, updated_at
       FROM note_metadata
       ORDER BY updated_at DESC
       LIMIT 5`
    )
    recentNotes.value = notes || []

    // 获取笔记总数
    const totalResult = await db.select('SELECT COUNT(*) as count FROM note_metadata')
    totalNotes.value = totalResult[0]?.count || 0
  } catch (error) {
    recentNotes.value = []
    totalNotes.value = 0
  }
}

// 加载常用书签
const loadFrequentBookmarks = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const bookmarks = await db.select(
      `SELECT id, title as name, url, favicon_url as icon_url, access_count as visit_count
       FROM bookmarks
       WHERE access_count > 5 OR read_later = 1
       ORDER BY access_count DESC
       LIMIT 6`
    )
    frequentBookmarks.value = bookmarks || []

    // 获取书签总数
    const totalResult = await db.select('SELECT COUNT(*) as count FROM bookmarks')
    totalBookmarks.value = totalResult[0]?.count || 0
  } catch (error) {
    frequentBookmarks.value = []
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
      loadFrequentBookmarks(),
      loadPasswordStats()
    ])
    ElMessage.success('数据已更新')
  } catch (error) {
    ElMessage.error('刷新失败')
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
    ElMessage.success(todo.completed ? '已完成' : '已标记为未完成')
  } catch (error) {
    todo.completed = !todo.completed // 回滚
    ElMessage.error('更新失败')
  }
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / 86400000)

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
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
.dashboard-wrapper {
  width: 100%;
  height: 100%;
  padding: var(--space-2xl);
  background: var(--bg-secondary);
  overflow-y: auto;
}

/* 页面头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2xl);
}

.dashboard-title {
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: -0.5px;
  margin: 0;
}

.dashboard-actions {
  display: flex;
  gap: var(--space-sm);
}

/* 卡片网格 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-xl);
  max-width: 1600px;
}

/* 通用卡片 */
.dashboard-card {
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--transition-normal);
}

.dashboard-card:hover {
  box-shadow: var(--shadow-card-hover);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xl);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

/* 卡片头部图标 — 浅色圆底 + 单色图标 */
.header-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon-large {
  font-size: 16px;
}

.todos-bg {
  background: rgba(0,122,255,0.10);
  color: var(--accent-blue);
}
.events-bg {
  background: rgba(255,149,0,0.10);
  color: var(--color-orange);
}
.notes-bg {
  background: rgba(52,199,89,0.10);
  color: var(--color-green);
}
.bookmarks-bg {
  background: rgba(175,82,222,0.10);
  color: var(--color-purple);
}

.header-text {
  flex: 1;
}

.header-title {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 2px 0;
}

.header-subtitle {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  margin: 0;
}

/* 卡片内容 */
.card-content {
  padding: var(--space-lg) var(--space-xl) var(--space-xl);
  min-height: 140px;
}

/* 今日概览卡片 — 不使用渐变，保持白色 */
.today-card {
  background: var(--bg-primary);
}

.today-header {
  padding: var(--space-2xl) var(--space-xl);
}

.today-date-main {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.today-day {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
}

.today-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.today-month-year {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.today-weekday {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}

/* 摘要统计 */
.today-summary {
  display: flex;
  padding: var(--space-lg) var(--space-xl) var(--space-xl);
  gap: var(--space-lg);
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.summary-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.summary-value {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  align-self: center;
}

/* 待办列表 */
.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 0.5px solid var(--divider);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: transparent;
}

.todo-text {
  flex: 1;
  font-size: var(--font-size-body);
  color: var(--text-primary);
  line-height: 1.5;
}

.todo-text.completed {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

/* 日程列表 */
.event-list {
  display: flex;
  flex-direction: column;
}

.event-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 0.5px solid var(--divider);
  cursor: pointer;
}

.event-item:last-child {
  border-bottom: none;
}

.event-time {
  flex-shrink: 0;
}

.time-badge {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--accent-blue);
  min-width: 48px;
}

.event-info {
  flex: 1;
}

.event-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.event-desc {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 笔记列表 */
.note-list {
  display: flex;
  flex-direction: column;
}

.note-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 0.5px solid var(--divider);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-radius: var(--radius-xs);
}

.note-item:last-child {
  border-bottom: none;
}

.note-item:hover {
  background: var(--bg-tertiary);
}

.note-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52,199,89,0.10);
  color: var(--color-green);
  border-radius: var(--radius-sm);
  font-size: 14px;
  flex-shrink: 0;
}

.note-info {
  flex: 1;
  min-width: 0;
}

.note-name {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.note-time {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

/* 书签网格 */
.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.bookmark-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: center;
  transition: background var(--transition-fast);
}

.bookmark-item:hover {
  background: var(--bg-tertiary);
}

.bookmark-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: var(--text-secondary);
}

.bookmark-icon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.bookmark-name {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 空状态 */
.card-content .el-empty {
  padding: var(--space-xl) 0;
}

.el-empty :deep(.el-empty__description) {
  font-size: var(--font-size-footnote);
  color: var(--text-tertiary);
}

/* 响应式 */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bookmark-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: var(--space-lg);
  }

  .dashboard-title {
    font-size: var(--font-size-title2);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

  .bookmark-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
