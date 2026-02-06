<template>
  <div class="header-bar" data-tauri-drag-region>
    <div class="header-content" data-tauri-drag-region>
      <div class="header-left" data-tauri-drag-region>
        <div class="app-logo" data-tauri-drag-region>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.9 7 2 7.9 2 9V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V9C22 7.9 21.1 7 20 7Z" fill="url(#gradient1)"/>
            <path d="M20 4H4C3.45 4 3 4.45 3 5C3 5.55 3.45 6 4 6H20C20.55 6 21 5.55 21 5C21 4.45 20.55 4 20 4Z" fill="url(#gradient2)"/>
            <circle cx="8" cy="13.5" r="1.5" fill="white"/>
            <circle cx="12" cy="13.5" r="1.5" fill="white"/>
            <circle cx="16" cy="13.5" r="1.5" fill="white"/>
            <defs>
              <linearGradient id="gradient1" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                <stop stop-color="#667eea"/>
                <stop offset="1" stop-color="#764ba2"/>
              </linearGradient>
              <linearGradient id="gradient2" x1="3" y1="4" x2="21" y2="6" gradientUnits="userSpaceOnUse">
                <stop stop-color="#667eea"/>
                <stop offset="1" stop-color="#764ba2"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="app-name" data-tauri-drag-region>ToolHub</span>
        <div class="global-search" @click.stop>
          <el-input
            v-model="searchQuery"
            placeholder="全局搜索 (Ctrl+K)"
            clearable
            size="small"
            style="width: 300px;"
            @input="handleGlobalSearch"
            @focus="showSearchResults = true"
            @blur="handleSearchBlur"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div v-if="showSearchResults && (searchQuery || searchResults.total > 0)" class="search-results" @click.stop>
            <div v-if="searchQuery && isSearching" class="search-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>搜索中...</span>
            </div>
            <div v-else-if="searchQuery && searchResults.total === 0" class="search-empty">
              <el-empty description="未找到结果" :image-size="60" />
            </div>
            <div v-else-if="searchResults.total > 0" class="search-results-content">
              <template v-for="(items, module) in searchResults" :key="module">
                <div v-if="module !== 'total' && items && Array.isArray(items) && items.length > 0" class="search-module">
                  <div class="module-header">
                    <el-icon>
                      <Document v-if="module === 'notes'" />
                      <List v-else-if="module === 'todos'" />
                      <Link v-else-if="module === 'bookmarks'" />
                      <Lock v-else-if="module === 'passwords'" />
                      <Calendar v-else-if="module === 'events'" />
                    </el-icon>
                    <span>{{ getModuleName(module) }}</span>
                    <span class="module-count">({{ items.length }})</span>
                  </div>
                  <div class="module-items">
                    <div
                      v-for="result in items.slice(0, 5)"
                      :key="result.item.id || result.item.name"
                      class="search-item"
                      @click="handleSearchItemClick(result)"
                    >
                      <div class="item-title" v-html="highlightText(result.item.title || result.item.name, searchQuery)"></div>
                      <div v-if="result.item.description" class="item-desc" v-html="highlightText(result.item.description.substring(0, 50), searchQuery)"></div>
                      <div v-if="result.item.url || result.item.website" class="item-url">{{ result.item.url || result.item.website }}</div>
                    </div>
                    <div v-if="items.length > 5" class="more-results" @click="viewAllResults(module)">
                      查看全部 {{ items.length }} 个结果
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="searchHistory.length > 0 && !searchQuery" class="search-history">
              <div class="history-header">搜索历史</div>
              <div
                v-for="history in searchHistory"
                :key="history.id"
                class="history-item"
                @click="applySearchHistory(history.query)"
              >
                <el-icon><Clock /></el-icon>
                <span>{{ history.query }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button 
          class="header-button pin-button" 
          :class="{ active: isPinned }"
          @click="handlePin"
          title="置顶"
        >
          <el-icon><Top /></el-icon>
        </button>
        <button class="header-button minimize-button" @click="handleMinimize" title="最小化">
          <el-icon><Minus /></el-icon>
        </button>
        <button 
          class="header-button maximize-button" 
          @click="handleToggleMaximize" 
          :title="isMaximized ? '还原' : '最大化'"
        >
          <el-icon><FullScreen v-if="!isMaximized" /><CopyDocument v-else /></el-icon>
        </button>
        <button class="header-button close-button" @click="handleClose" title="关闭">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Top, Minus, FullScreen, CopyDocument, Close, Search, Document, List, Link, Lock, Calendar, Loading, Clock } from '@element-plus/icons-vue'
import { TauriWindow } from '@/utils/tauri'
import { useRouter } from 'vue-router'
import * as searchAPI from '@/utils/search'
import { ElMessage } from 'element-plus'

const router = useRouter()
const isPinned = ref(false)
const isMaximized = ref(false)
const searchQuery = ref('')
const showSearchResults = ref(false)
const isSearching = ref(false)
const searchResults = ref({
  notes: [],
  todos: [],
  bookmarks: [],
  passwords: [],
  events: [],
  total: 0
})
const searchHistory = ref([])
let searchTimeout = null

// 置顶窗口
const handlePin = async () => {
  try {
    isPinned.value = !isPinned.value
    await TauriWindow.setAlwaysOnTop(isPinned.value)
  } catch (e) { /* ignore */ }
}

// 最小化
const handleMinimize = async () => {
  try {
    await TauriWindow.minimize()
  } catch (e) { /* ignore */ }
}

// 最大化/还原
const handleToggleMaximize = async () => {
  try {
    if (isMaximized.value) {
      await TauriWindow.unmaximize()
    } else {
      await TauriWindow.maximize()
    }
    isMaximized.value = !isMaximized.value
  } catch (e) { /* ignore */ }
}

// 关闭
const handleClose = async () => {
  try {
    await TauriWindow.close()
  } catch (e) { /* ignore */ }
}

// 全局搜索
const handleGlobalSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value || searchQuery.value.trim().length < 2) {
    searchResults.value = { notes: [], todos: [], bookmarks: [], passwords: [], events: [], total: 0 }
    return
  }
  
  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      const results = await searchAPI.globalSearch(searchQuery.value)
      const total = Object.values(results).reduce((sum, items) => sum + items.length, 0)
      searchResults.value = { ...results, total }
    } catch (e) { /* ignore */ } finally {
      isSearching.value = false
    }
  }, 300)
}

// 处理搜索框失焦
const handleSearchBlur = () => {
  // 延迟隐藏，允许点击搜索结果
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

// 高亮文本
const highlightText = (text, query) => {
  if (!text || !query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 获取模块名称
const getModuleName = (module) => {
  const names = {
    notes: '笔记',
    todos: '待办',
    bookmarks: '书签',
    passwords: '密码',
    events: '日程'
  }
  return names[module] || module
}

// 处理搜索结果项点击
const handleSearchItemClick = (result) => {
  const item = result.item
  showSearchResults.value = false
  
  if (result.module === 'notes') {
    router.push(`/notes?note=${encodeURIComponent(item.name)}`)
  } else if (result.module === 'todos') {
    router.push(`/todos?id=${item.id}`)
  } else if (result.module === 'bookmarks') {
    router.push(`/bookmarks?id=${item.id}`)
  } else if (result.module === 'passwords') {
    router.push(`/passwords?id=${item.id}`)
  } else if (result.module === 'events') {
    router.push(`/calendar?id=${item.id}`)
  }
}

// 查看全部结果
const viewAllResults = (module) => {
  showSearchResults.value = false
  const routes = {
    notes: '/notes',
    todos: '/todos',
    bookmarks: '/bookmarks',
    passwords: '/passwords',
    events: '/calendar'
  }
  if (routes[module]) {
    router.push(`${routes[module]}?search=${encodeURIComponent(searchQuery.value)}`)
  }
}

// 应用搜索历史
const applySearchHistory = (query) => {
  searchQuery.value = query
  showSearchResults.value = true
  handleGlobalSearch()
}

// 加载搜索历史
const loadSearchHistory = async () => {
  try {
    searchHistory.value = await searchAPI.getSearchHistory('global', 5)
  } catch (e) { /* ignore */ }
}

// 键盘快捷键
const handleKeyDown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    // 聚焦搜索框
    const searchInput = document.querySelector('.global-search input')
    if (searchInput) {
      searchInput.focus()
      showSearchResults.value = true
    }
  }
}

// 检查窗口状态
onMounted(async () => {
  try {
    isMaximized.value = await TauriWindow.isMaximized()
  } catch (e) { /* ignore */ }
  
  await loadSearchHistory()
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<style scoped>
.header-bar {
  height: 32px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  user-select: none;
  -webkit-app-region: drag;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 8px;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: drag;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: drag;
  margin-left: 4px;
}

.app-logo svg {
  display: block;
}

.app-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.5px;
  -webkit-app-region: drag;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.header-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  color: #606266;
}

.header-button:hover {
  background: #f5f7fa;
}

.header-button.close-button:hover {
  background: #f56c6c;
  color: #ffffff;
}

.header-button.pin-button.active {
  color: #409eff;
}

.header-button .el-icon {
  font-size: 14px;
}

.global-search {
  position: relative;
  -webkit-app-region: no-drag;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 500px;
  overflow-y: auto;
  z-index: 1000;
}

.search-loading,
.search-empty {
  padding: 20px;
  text-align: center;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.search-results-content {
  padding: 8px;
}

.search-module {
  margin-bottom: 16px;
}

.search-module:last-child {
  margin-bottom: 0;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 8px;
}

.module-count {
  color: #909399;
  font-weight: normal;
  font-size: 12px;
}

.module-items {
  padding: 0 8px;
}

.search-item {
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-item:hover {
  background: #f5f7fa;
}

.item-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #303133;
}

.item-title mark {
  background: #fff3cd;
  color: #856404;
  padding: 0 2px;
}

.item-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.item-desc mark {
  background: #fff3cd;
  color: #856404;
  padding: 0 2px;
}

.item-url {
  font-size: 12px;
  color: #409eff;
}

.more-results {
  padding: 8px;
  text-align: center;
  color: #409eff;
  cursor: pointer;
  font-size: 12px;
  border-top: 1px solid #e4e7ed;
  margin-top: 8px;
}

.more-results:hover {
  background: #f5f7fa;
}

.search-history {
  padding: 8px;
}

.history-header {
  padding: 8px;
  font-weight: 600;
  font-size: 12px;
  color: #909399;
  text-transform: uppercase;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: #f5f7fa;
}

.history-item .el-icon {
  color: #909399;
}

/* ignore */
@media (prefers-color-scheme: dark) {
  .search-results {
    background: #2d2d2d;
    border-color: #3a3a3a;
  }

  .module-header {
    color: #eee;
    border-color: #3a3a3a;
  }

  .search-item:hover {
    background: #1a1a1a;
  }

  .item-title {
    color: #eee;
  }

  .item-desc {
    color: #aaa;
  }

  .more-results {
    border-color: #3a3a3a;
  }

  .more-results:hover {
    background: #1a1a1a;
  }

  .history-item:hover {
    background: #1a1a1a;
  }
}
</style>

