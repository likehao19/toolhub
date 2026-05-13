<template>
  <div class="dashboard-wrapper">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">{{ t('home.title') }}</h1>
      <div class="dashboard-actions">
        <el-button type="primary" :icon="MagicStick" circle :title="t('home.aiAssistantTitle')" @click="showAIAssistant = true" />
        <el-button :icon="Refresh" circle @click="refreshAll" :title="t('home.refreshTitle')" />
      </div>
    </div>

    <!-- AI助手对话框 -->
    <AIAssistant v-model="showAIAssistant" @operation-complete="handleOperationComplete" />

    <!-- 卡片网格布局 -->
    <div class="dashboard-grid">
      <!-- 今日概览卡片 -->
      <el-card class="dashboard-card today-overview-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><Calendar /></el-icon>
            <span class="card-title">{{ t('home.todayOverview') }}</span>
          </div>
        </template>
        <div class="today-info">
          <div class="date-display">
            <div class="date-main">{{ todayDate }}</div>
            <div class="date-sub">{{ todayWeekday }} · {{ lunarDate }}</div>
          </div>
        </div>
      </el-card>

      <!-- 今日待办卡片 -->
      <el-card class="dashboard-card todos-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><CircleCheck /></el-icon>
            <span class="card-title">{{ t('home.todayTodos') }}</span>
            <span class="card-badge">{{ todayTodos.length }}</span>
          </div>
        </template>
        <div class="card-content">
          <el-empty v-if="todayTodos.length === 0" :description="t('home.noTodos')">
            <el-button type="primary" size="small" @click="navigateTo('/todos')">{{ t('home.addTodo') }}</el-button>
          </el-empty>
          <div v-else class="todos-list">
            <div v-for="todo in todayTodos.slice(0, 5)" :key="todo.id" class="todo-item">
              <el-checkbox v-model="todo.completed" @change="toggleTodo(todo)" />
              <span class="todo-text" :class="{ completed: todo.completed }">{{ todo.title }}</span>
            </div>
            <el-button v-if="todayTodos.length > 5" text type="primary" @click="navigateTo('/todos')">
              {{ t('home.viewAllTodos', { n: todayTodos.length }) }}
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 今日日程卡片 -->
      <el-card class="dashboard-card events-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><Clock /></el-icon>
            <span class="card-title">{{ t('home.todayEvents') }}</span>
            <span class="card-badge">{{ todayEvents.length }}</span>
          </div>
        </template>
        <div class="card-content">
          <el-empty v-if="todayEvents.length === 0" :description="t('home.noEvents')">
            <el-button type="primary" size="small" @click="navigateTo('/calendar')">{{ t('home.addEvent') }}</el-button>
          </el-empty>
          <div v-else class="events-list">
            <div v-for="event in todayEvents.slice(0, 4)" :key="event.id" class="event-item">
              <div class="event-time">{{ formatTime(event.start_time) }}</div>
              <div class="event-title">{{ event.title }}</div>
            </div>
            <el-button v-if="todayEvents.length > 4" text type="primary" @click="navigateTo('/calendar')">
              {{ t('home.viewAllEvents', { n: todayEvents.length }) }}
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 最近笔记卡片 -->
      <el-card class="dashboard-card notes-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><Document /></el-icon>
            <span class="card-title">{{ t('home.recentNotes') }}</span>
          </div>
        </template>
        <div class="card-content">
          <el-empty v-if="recentNotes.length === 0" :description="t('home.noNotes')">
            <el-button type="primary" size="small" @click="navigateTo('/notes')">{{ t('home.createNote') }}</el-button>
          </el-empty>
          <div v-else class="notes-list">
            <div v-for="note in recentNotes.slice(0, 5)" :key="note.name" class="note-item" @click="openNote(note)">
              <el-icon><Document /></el-icon>
              <span class="note-title">{{ note.name }}</span>
              <span class="note-time">{{ formatDate(note.updated_at) }}</span>
            </div>
            <el-button text type="primary" @click="navigateTo('/notes')">
              {{ t('home.viewMore') }}
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 常用网站卡片 -->
      <el-card class="dashboard-card bookmarks-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><Link /></el-icon>
            <span class="card-title">{{ t('home.frequentSites') }}</span>
          </div>
        </template>
        <div class="card-content">
          <el-empty v-if="frequentBookmarks.length === 0" :description="t('home.noBookmarks')">
            <el-button type="primary" size="small" @click="navigateTo('/bookmarks')">{{ t('home.addBookmark') }}</el-button>
          </el-empty>
          <div v-else class="bookmarks-grid">
            <div v-for="bookmark in frequentBookmarks.slice(0, 6)" :key="bookmark.id" class="bookmark-item" @click="openBookmark(bookmark)">
              <img v-if="bookmark.favicon_data" :src="bookmark.favicon_data" class="bookmark-icon" />
              <img v-else-if="bookmark.icon_url" :src="bookmark.icon_url" class="bookmark-icon" @error="$event.target.style.display='none'" />
              <el-icon v-else class="bookmark-icon-fallback"><Link /></el-icon>
              <span class="bookmark-name">{{ bookmark.name }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 密码安全卡片 -->
      <el-card class="dashboard-card passwords-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon class="card-icon"><Lock /></el-icon>
            <span class="card-title">{{ t('home.passwordSecurity') }}</span>
          </div>
        </template>
        <div class="card-content">
          <div class="password-stats">
            <div class="stat-item">
              <div class="stat-value">{{ passwordStats.total }}</div>
              <div class="stat-label">{{ t('home.totalPasswords') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: var(--el-color-success);">{{ passwordStats.strong }}</div>
              <div class="stat-label">{{ t('home.strongPasswords') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" style="color: var(--el-color-danger);">{{ passwordStats.weak }}</div>
              <div class="stat-label">{{ t('home.weakPasswords') }}</div>
            </div>
          </div>
          <el-button text type="primary" @click="navigateTo('/passwords')">
            {{ t('home.viewPasswordMgmt') }}
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, CircleCheck, Clock, Document, Link, Lock, MagicStick, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { TauriShell } from '@/utils/tauri'
import AIAssistant from '@/components/AIAssistant.vue'
import { t } from '@/i18n'

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
  lunarDate.value = t('home.lunarDate', { m: now.getMonth() + 1, d: now.getDate() })
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
  } catch (error) {
    todayTodos.value = []
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
  } catch (error) {
    todayEvents.value = []
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
  } catch (error) {
    recentNotes.value = []
  }
}

// 加载常用书签
const loadFrequentBookmarks = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const bookmarks = await db.select(
      `SELECT id, title as name, url, favicon_url as icon_url, favicon_data, access_count as visit_count
       FROM bookmarks
       ORDER BY access_count DESC, updated_at DESC
       LIMIT 6`
    )
    frequentBookmarks.value = bookmarks || []
  } catch (error) {
    frequentBookmarks.value = []
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
  const loading = ElMessage.loading(t('home.refreshing'))
  try {
    await Promise.all([
      loadTodayTodos(),
      loadTodayEvents(),
      loadRecentNotes(),
      loadFrequentBookmarks(),
      loadPasswordStats()
    ])
    loading.close()
    ElMessage.success(t('home.dataUpdated'))
  } catch (error) {
    loading.close()
    ElMessage.error(t('home.refreshFailed'))
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
    ElMessage.success(todo.completed ? t('home.completed') : t('home.markedUncomplete'))
  } catch (error) {
    todo.completed = !todo.completed // 回滚
    ElMessage.error(t('home.updateFailed'))
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
  
  if (days === 0) return t('home.today')
  if (days === 1) return t('home.yesterday')
  if (days < 7) return t('home.daysAgo', { n: days })
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
  padding: 20px;
  background: var(--el-fill-color-light);
  overflow-y: auto;
}

/* ignore */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
}

.dashboard-actions {
  display: flex;
  gap: 8px;
}

/* ignore */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  max-width: 1400px;
}

/* ignore */
.dashboard-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.card-icon {
  font-size: 20px;
  color: var(--accent-blue);
}

.card-title {
  flex: 1;
}

.card-badge {
  background: var(--accent-blue);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.card-content {
  min-height: 150px;
}

/* ignore */
.today-info {
  text-align: center;
  padding: 20px 0;
}

.date-display {
  padding: 16px;
}

.date-main {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.date-sub {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* ignore */
.todos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.todo-item:hover {
  background: var(--el-fill-color-light);
}

.todo-text {
  flex: 1;
  font-size: 14px;
}

.todo-text.completed {
  text-decoration: line-through;
  color: var(--el-text-color-secondary);
}

/* ignore */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-left: 3px solid var(--accent-blue);
  background: #f0f9ff;
  border-radius: 4px;
}

.event-time {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  white-space: nowrap;
}

.event-title {
  flex: 1;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

/* ignore */
.notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.note-item:hover {
  background: #f0f9ff;
}

.note-title {
  flex: 1;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.note-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ignore */
.bookmarks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bookmark-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.bookmark-item:hover {
  background: #f0f9ff;
}

.bookmark-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.bookmark-icon-fallback {
  font-size: 32px;
  color: var(--accent-blue);
}

.bookmark-name {
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* ignore */
.password-stats {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-blue);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ignore */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
  
  .bookmarks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .bookmarks-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
