<template>
  <div class="header-bar" data-tauri-drag-region>
    <div class="header-content" data-tauri-drag-region>
      <div class="header-left" data-tauri-drag-region>
        <div class="app-logo" data-tauri-drag-region>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.9 7 2 7.9 2 9V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V9C22 7.9 21.1 7 20 7Z" fill="currentColor"/>
            <path d="M20 4H4C3.45 4 3 4.45 3 5C3 5.55 3.45 6 4 6H20C20.55 6 21 5.55 21 5C21 4.45 20.55 4 20 4Z" fill="currentColor" opacity="0.8"/>
            <circle cx="8" cy="13.5" r="1.5" fill="white"/>
            <circle cx="12" cy="13.5" r="1.5" fill="white"/>
            <circle cx="16" cy="13.5" r="1.5" fill="white"/>
          </svg>
        </div>
        <span class="app-name" data-tauri-drag-region>ToolHub</span>
        <div class="global-search" @click.stop>
          <el-input
            v-model="searchQuery"
            :placeholder="t('header.search')"
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
              <span>{{ t('header.searching') }}</span>
            </div>
            <div v-else-if="searchQuery && searchResults.total === 0" class="search-empty">
              <el-empty :description="t('header.noResults')" :image-size="60" />
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
                      {{ t('header.viewAll', { n: items.length }) }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="searchHistory.length > 0 && !searchQuery" class="search-history">
              <div class="history-header">{{ t('header.searchHistory') }}</div>
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
          :title="t('header.pinTop')"
        >
          <el-icon><Top /></el-icon>
        </button>
        <button class="header-button minimize-button" @click="handleMinimize" :title="t('header.minimize')">
          <el-icon><Minus /></el-icon>
        </button>
        <button
          class="header-button maximize-button"
          @click="handleToggleMaximize"
          :title="isMaximized ? t('header.restore') : t('header.maximize')"
        >
          <el-icon><FullScreen v-if="!isMaximized" /><CopyDocument v-else /></el-icon>
        </button>
        <button class="header-button close-button" @click="handleClose" :title="t('header.close')">
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
import { t } from '@/i18n'

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
    notes: t('header.notes'),
    todos: t('header.todos'),
    bookmarks: t('header.bookmarks'),
    passwords: t('header.passwords'),
    events: t('header.events')
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
  height: var(--header-height);
  background: color-mix(in srgb, var(--surface-panel) 86%, transparent 14%);
  border-bottom: 1px solid var(--divider);
  backdrop-filter: saturate(160%) blur(18px);
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
  padding: 0 var(--space-md);
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  -webkit-app-region: drag;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: drag;
  margin-left: var(--space-xs);
}

.app-logo svg {
  display: block;
}

/* Logo 单色系统蓝 */
.app-logo svg path {
  fill: var(--accent-blue);
}

.app-logo svg circle {
  fill: #ffffff;
}

/* 应用名称：纯色，semibold，移除渐变 */
.app-name {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: color-mix(in srgb, var(--text-primary) 92%, #111827 8%);
  letter-spacing: 0.02em;
  -webkit-app-region: drag;
  background: none;
  -webkit-text-fill-color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  -webkit-app-region: no-drag;
}

/* 窗口控制按钮 */
.header-button {
  width: 31px;
  height: 31px;
  border: none;
  background: color-mix(in srgb, var(--surface-panel-soft) 88%, transparent 12%);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), transform var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
  color: var(--text-secondary);
  border: 1px solid var(--divider);
}

.header-button:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
  transform: var(--interactive-lift);
  box-shadow: var(--shadow-sm);
}

/* 关闭按钮特殊处理 */
.header-button.close-button:hover {
  background: var(--color-red);
  color: #ffffff;
}

.header-button.pin-button.active {
  color: var(--accent-blue);
  border-color: color-mix(in srgb, var(--accent-blue) 40%, var(--divider) 60%);
  background: color-mix(in srgb, var(--accent-blue-bg) 80%, transparent 20%);
}

.header-button .el-icon {
  font-size: 14px;
}

/* 搜索框 */
.global-search {
  position: relative;
  -webkit-app-region: no-drag;
}

.global-search :deep(.el-input) {
  width: 300px;
  --el-input-bg-color: color-mix(in srgb, var(--surface-panel-soft) 84%, transparent 16%);
  --el-input-border-color: var(--divider);
  --el-input-hover-border-color: var(--border-color-strong);
  --el-input-focus-border-color: var(--accent-blue);
}

.global-search :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-radius: var(--radius-md);
  border: 1px solid var(--divider);
  min-height: 34px;
}

/* 搜索结果下拉面板 */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 10px;
  background: color-mix(in srgb, var(--surface-panel) 90%, transparent 10%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  max-height: 500px;
  overflow-y: auto;
  z-index: 1000;
}

.search-loading,
.search-empty {
  padding: var(--space-xl);
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.search-results-content {
  padding: var(--space-sm);
}

.search-module {
  margin-bottom: var(--space-lg);
}

.search-module:last-child {
  margin-bottom: 0;
}

.module-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-body);
  color: var(--text-primary);
  border-bottom: 0.5px solid var(--border-color);
  margin-bottom: var(--space-sm);
}

.module-count {
  color: var(--text-tertiary);
  font-weight: var(--font-weight-regular);
  font-size: var(--font-size-caption);
}

.module-items {
  padding: 0 var(--space-sm);
}

.search-item {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.search-item:hover {
  background: color-mix(in srgb, var(--accent-blue-bg) 60%, transparent 40%);
  transform: var(--interactive-lift);
}

.item-title {
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-xs);
  color: var(--text-primary);
}

.item-title mark {
  background: rgba(255,204,0,0.25);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.item-desc {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.item-desc mark {
  background: rgba(255,204,0,0.25);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.item-url {
  font-size: var(--font-size-caption);
  color: var(--accent-blue);
}

.more-results {
  padding: var(--space-sm);
  text-align: center;
  color: var(--accent-blue);
  cursor: pointer;
  font-size: var(--font-size-caption);
  border-top: 0.5px solid var(--border-color);
  margin-top: var(--space-sm);
  transition: background var(--transition-fast);
}

.more-results:hover {
  background: var(--bg-tertiary);
}

.search-history {
  padding: var(--space-sm);
}

.history-header {
  padding: var(--space-sm);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-caption2);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.history-item:hover {
  background: color-mix(in srgb, var(--accent-blue-bg) 55%, transparent 45%);
  transform: var(--interactive-lift);
}

.history-item .el-icon {
  color: var(--text-tertiary);
}
</style>

