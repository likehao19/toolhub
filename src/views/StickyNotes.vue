<template>
  <div class="sticky-notes">
    <!-- 主内容区 -->
    <div class="content-wrapper">
      <!-- 左侧彩色页签 -->
      <div v-show="!isCollapsed" class="sidebar-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: activeTab === tab.id }"
          :style="{ backgroundColor: tab.color }"
          @click="switchTab(tab.id)"
          :title="tab.label"
        >
          <el-icon :size="16">
            <component :is="tab.icon" />
          </el-icon>
        </div>
      </div>

      <div class="right-section" :style="{ background: currentTabBg }" :class="{ collapsed: isCollapsed }">
        <!-- 窗口控制栏 -->
        <div class="control-bar" data-tauri-drag-region @dblclick="toggleCollapse">
          <div class="drag-area" data-tauri-drag-region>
            <span v-if="isCollapsed" class="collapsed-title">{{ collapsedContent }}</span>
          </div>
          <div class="control-buttons" :class="{ 'hide-icons': isCollapsed }">
            <el-button
              v-if="!isCollapsed"
              class="icon-btn"
              :icon="MagicStick"
              circle
              size="small"
              @click="onAIClick"
              :title="t('stickyNotes.aiOrganize')"
            />
            <el-button
              v-if="!isCollapsed"
              class="icon-btn"
              :class="{ 'is-pinned': alwaysOnTop }"
              :icon="Lock"
              circle
              size="small"
              @click="toggleAlwaysOnTop"
              :title="alwaysOnTop ? t('stickyNotes.unpinWindow') : t('stickyNotes.pinWindow')"
            />
            <el-button
              class="icon-btn"
              :icon="Close"
              circle
              size="small"
              @click="closeWindow"
              :title="t('stickyNotes.close')"
            />
          </div>
        </div>

        <!-- 内容区 -->
        <div v-show="!isCollapsed" class="content-area">
          <keep-alive>
            <component :is="currentComponent" />
          </keep-alive>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { t } from '@/i18n'
import { getCurrentWebviewWindow, getAllWebviewWindows } from '@tauri-apps/api/webviewWindow'
import { Document, Star, Calendar, CircleCheck, Close, MagicStick, Lock } from '@element-plus/icons-vue'

// 导入子组件（稍后创建）
import DocumentPreview from '@/components/sticky-notes/DocumentPreview.vue'
import BookmarkGrid from '@/components/sticky-notes/BookmarkGrid.vue'
import ScheduleView from '@/components/sticky-notes/ScheduleView.vue'
import TaskList from '@/components/sticky-notes/TaskList.vue'

// 状态管理
const activeTab = ref('documents')
const alwaysOnTop = ref(true) // 默认置顶
const isCollapsed = ref(false)
const currentContent = ref('') // 当前页面内容

// 页签配置 - 不同颜色
const tabs = computed(() => [
  { id: 'documents', label: t('stickyNotes.notes'), icon: Document, color: '#E0E7FF', bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', component: DocumentPreview },
  { id: 'bookmarks', label: t('stickyNotes.bookmarks'), icon: Star, color: '#FCE7F3', bg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)', component: BookmarkGrid },
  { id: 'schedule', label: t('stickyNotes.schedule'), icon: Calendar, color: '#D1FAE5', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', component: ScheduleView },
  { id: 'tasks', label: t('stickyNotes.tasks'), icon: CircleCheck, color: '#FEF3C7', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', component: TaskList }
])

const currentTabBg = computed(() => {
  const tab = tabs.value.find(item => item.id === activeTab.value)
  return tab ? tab.bg : '#fdfbf6'
})

// 计算当前组件
const currentComponent = computed(() => {
  const tab = tabs.value.find(item => item.id === activeTab.value)
  return tab ? tab.component : tabs.value[0].component
})

// 折叠时显示的内容（截取前30个字符）
const collapsedContent = computed(() => {
  if (!currentContent.value) {
    const tab = tabs.value.find(item => item.id === activeTab.value)
    return tab ? tab.label : t('stickyNotes.notes')
  }
  const text = currentContent.value.trim()
  if (text.length > 30) {
    return text.substring(0, 30) + '...'
  }
  return text
})

// AI 整理（仅笔记页生效，由 DocumentPreview 监听事件处理）
const onAIClick = () => {
  if (activeTab.value === 'documents') {
    window.dispatchEvent(new CustomEvent('sticky-notes-ai-organize'))
  }
}

// 切换页签
const switchTab = (tabId) => {
  activeTab.value = tabId
  saveWindowState()
}

// 切换置顶状态
const toggleAlwaysOnTop = async () => {
  try {
    const webviewWindow = getCurrentWebviewWindow()
    alwaysOnTop.value = !alwaysOnTop.value
    await webviewWindow.setAlwaysOnTop(alwaysOnTop.value)
    saveWindowState()
  } catch (error) {
    // ignore
  }
}

// 关闭窗口
const closeWindow = async () => {
  try {
    // 只保存当前激活的页签，其余页签无需保存
    const eventMap = {
      'documents': 'sticky-notes-save-documents',
      'bookmarks': 'sticky-notes-save-bookmarks',
      'schedule': 'sticky-notes-save-schedule',
      'tasks': 'sticky-notes-save-tasks'
    }
    const eventName = eventMap[activeTab.value]
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName))
    }

    // 给保存事件一帧的时间触发 emit，不需要硬等 200ms
    await new Promise(resolve => requestAnimationFrame(resolve))

    const webviewWindow = getCurrentWebviewWindow()
    await webviewWindow.close()
  } catch (error) {

  }
}

// 切换折叠状态
const toggleCollapse = async () => {
  try {
    const webviewWindow = getCurrentWebviewWindow()
    const { LogicalSize } = await import('@tauri-apps/api/dpi')
    
    if (!isCollapsed.value) {
      // 第一次双击：折叠为单行（280宽和右侧头部一样）
      isCollapsed.value = true
      await webviewWindow.setSize(new LogicalSize(280, 28))
    } else {
      // 第二次双击：恢复到初始大小
      isCollapsed.value = false
      await webviewWindow.setSize(new LogicalSize(350, 400))
    }
    
    saveWindowState()
  } catch (error) {

  }
}

// 监听内容更新事件（从各个子组件发送）
const handleContentUpdate = (event) => {
  if (event.detail && event.detail.content !== undefined) {
    currentContent.value = event.detail.content || ''
  }
}

// 保存窗口状态（每个窗口独立保存）
const saveWindowState = () => {
  try {
    const webviewWindow = getCurrentWebviewWindow()
    const state = {
      activeTab: activeTab.value,
      alwaysOnTop: alwaysOnTop.value
      // 不保存 isCollapsed, originalWidth, originalHeight
    }
    localStorage.setItem(`sticky-notes-state-${webviewWindow.label}`, JSON.stringify(state))
  } catch (error) {
    // ignore
  }
}

// 恢复窗口状态（每个窗口独立恢复）
const restoreWindowState = async () => {
  try {
    const webviewWindow = getCurrentWebviewWindow()
    
    const saved = localStorage.getItem(`sticky-notes-state-${webviewWindow.label}`)
    if (saved) {
      const state = JSON.parse(saved)
      // 新窗口始终默认显示笔记页签
      alwaysOnTop.value = state.alwaysOnTop !== undefined ? state.alwaysOnTop : true
    }
    activeTab.value = 'documents'
    
    // 设置置顶状态
    await webviewWindow.setAlwaysOnTop(alwaysOnTop.value)
    
    // 始终以非折叠状态打开
    isCollapsed.value = false
  } catch (error) {

  }
}

// 键盘快捷键处理
const handleKeydown = (e) => {
  // Ctrl+S 保存当前页面
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    // 根据当前激活的标签页发送对应的保存事件
    const eventMap = {
      'documents': 'sticky-notes-save-documents',
      'bookmarks': 'sticky-notes-save-bookmarks',
      'schedule': 'sticky-notes-save-schedule',
      'tasks': 'sticky-notes-save-tasks'
    }
    const eventName = eventMap[activeTab.value]
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName))
    }
    return
  }
  
  // Ctrl+1/2/3/4 切换页签
  if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
    e.preventDefault()
    const index = parseInt(e.key) - 1
    if (tabs.value[index]) {
      switchTab(tabs.value[index].id)
    }
  }
  
  // Esc 或 Ctrl+W 关闭窗口
  if (e.key === 'Escape' || (e.ctrlKey && e.key === 'w')) {
    e.preventDefault()
    closeWindow()
  }
  
  // Ctrl+T 切换置顶
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault()
    toggleAlwaysOnTop()
  }
}

// 生命周期
onMounted(() => {
  restoreWindowState()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('sticky-notes-content-update', handleContentUpdate)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('sticky-notes-content-update', handleContentUpdate)
})
</script>

<style scoped>
.sticky-notes {
  width: 100%;
  height: 100vh;
  display: flex;
  background: transparent;
  overflow: hidden;
}

/* 主内容区 */
.content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 左侧页签 */
.sidebar-tabs {
  width: 40px;
  background: transparent;
  display: flex;
  flex-direction: column;
  padding: 28px 0 8px;
  gap: 4px;
  flex-shrink: 0;
}

.tab-item {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
}

.tab-item:hover {
  color: #475569;
}

.tab-item.active {
  color: var(--el-text-color-regular);
  background: rgba(255,255,255,0.8) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 窗口控制栏 */
.control-bar {
  height: 28px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.drag-area {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  margin-right: 8px;
  min-width: 0;
}

.collapsed-title {
  font-size: 11px;
  color: var(--el-text-color-regular);
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  pointer-events: none;
}

.control-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.control-buttons .icon-btn {
  color: var(--el-text-color-primary);
  border-color: transparent;
  background: transparent;
  transition: all 0.2s;
}

.control-buttons .icon-btn:hover {
  color: var(--el-text-color-primary);
  background: rgba(0,0,0,0.06);
}

.control-buttons .icon-btn:active {
  color: var(--el-text-color-primary);
  background: rgba(0,0,0,0.12);
  transform: scale(0.95);
}

.control-buttons .icon-btn.is-pinned {
  color: var(--accent-blue);
}

.control-buttons .icon-btn.is-pinned:hover {
  color: var(--accent-blue-hover);
  background: rgba(194, 65, 12, 0.1);
}

/* 内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  color: var(--el-text-color-regular);
}

.content-area::-webkit-scrollbar {
  width: 8px;
}

.content-area::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.04);
}

.content-area::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 4px;
}
</style>
