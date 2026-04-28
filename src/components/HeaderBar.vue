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

// 缃《绐楀彛
const handlePin = async () => {
  try {
    isPinned.value = !isPinned.value
    await TauriWindow.setAlwaysOnTop(isPinned.value)
  } catch (e) { /* ignore */ }
}

// 鏈€灏忓寲
const handleMinimize = async () => {
  try {
    await TauriWindow.minimize()
  } catch (e) { /* ignore */ }
}

// 鏈€澶у寲/杩樺師
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

// 鍏抽棴
const handleClose = async () => {
  try {
    await TauriWindow.close()
  } catch (e) { /* ignore */ }
}

// 鍏ㄥ眬鎼滅储
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

// 澶勭悊鎼滅储妗嗗け鐒?
const handleSearchBlur = () => {
  // 寤惰繜闅愯棌锛屽厑璁哥偣鍑绘悳绱㈢粨鏋?
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

// 楂樹寒鏂囨湰
const highlightText = (text, query) => {
  if (!text || !query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 鑾峰彇妯″潡鍚嶇О
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

// 澶勭悊鎼滅储缁撴灉椤圭偣鍑?
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

// 鏌ョ湅鍏ㄩ儴缁撴灉
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

// 搴旂敤鎼滅储鍘嗗彶
const applySearchHistory = (query) => {
  searchQuery.value = query
  showSearchResults.value = true
  handleGlobalSearch()
}

// 鍔犺浇鎼滅储鍘嗗彶
const loadSearchHistory = async () => {
  try {
    searchHistory.value = await searchAPI.getSearchHistory('global', 5)
  } catch (e) { /* ignore */ }
}

// 閿洏蹇嵎閿?
const handleKeyDown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    // 鑱氱劍鎼滅储妗?
    const searchInput = document.querySelector('.global-search input')
    if (searchInput) {
      searchInput.focus()
      showSearchResults.value = true
    }
  }
}

// 妫€鏌ョ獥鍙ｇ姸鎬?
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(248, 251, 255, 0.84) 100%);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 88%, #dbe7f6 12%);
  backdrop-filter: saturate(165%) blur(16px);
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
  padding: 0 10px;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: drag;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: linear-gradient(180deg, #3f7ff0 0%, #2f6fe4 100%);
  box-shadow: 0 8px 18px rgba(47, 111, 228, 0.22);
  -webkit-app-region: drag;
  margin-left: 2px;
}

.app-logo svg {
  display: block;
  width: 16px;
  height: 16px;
}

.app-logo svg path {
  fill: rgba(255, 255, 255, 0.96);
}

.app-logo svg circle {
  fill: rgba(47, 111, 228, 0.9);
}

.app-name {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: #0f172a;
  letter-spacing: 0.03em;
  -webkit-app-region: drag;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid color-mix(in srgb, var(--border-color) 70%, #e9eff7 30%);
  -webkit-text-fill-color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.header-button {
  width: 31px;
  height: 31px;
  border: 1px solid color-mix(in srgb, var(--border-color) 86%, #d9e4f2 14%);
  background: rgba(255, 255, 255, 0.72);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), transform var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
  color: #475569;
}

.header-button:hover {
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}

.header-button.close-button:hover {
  background: var(--color-red);
  color: #ffffff;
  border-color: transparent;
}

.header-button.pin-button.active {
  color: #2f6fe4;
  border-color: rgba(47, 111, 228, 0.38);
  background: rgba(47, 111, 228, 0.12);
}

.header-button .el-icon {
  font-size: 14px;
}

.global-search {
  position: relative;
  -webkit-app-region: no-drag;
}

.global-search :deep(.el-input) {
  width: 300px;
  --el-input-bg-color: rgba(255, 255, 255, 0.72);
  --el-input-border-color: color-mix(in srgb, var(--border-color) 85%, #dce7f6 15%);
  --el-input-hover-border-color: #b7c8dd;
  --el-input-focus-border-color: #2f6fe4;
}

.global-search :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border-color) 85%, #dce7f6 15%);
  min-height: 34px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

.global-search :deep(.el-input__wrapper:hover) {
  border-color: #b7c8dd;
}

.global-search :deep(.el-input__wrapper.is-focus) {
  border-color: #2f6fe4;
  box-shadow: 0 0 0 2px rgba(47, 111, 228, 0.14) !important;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid color-mix(in srgb, var(--border-color) 90%, #dce6f4 10%);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(12px);
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
  padding: 8px;
}

.search-module {
  margin-bottom: 12px;
}

.search-module:last-child {
  margin-bottom: 0;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-weight: var(--font-weight-semibold);
  font-size: 13px;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(223, 231, 241, 0.85);
  margin-bottom: 6px;
}

.module-count {
  color: var(--text-tertiary);
  font-weight: var(--font-weight-regular);
  font-size: var(--font-size-caption);
}

.module-items {
  padding: 0 6px;
}

.search-item {
  padding: 10px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
}

.search-item:hover {
  background: rgba(47, 111, 228, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
}

.item-title {
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-xs);
  color: var(--text-primary);
}

.item-title mark {
  background: rgba(255, 204, 0, 0.25);
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
  background: rgba(255, 204, 0, 0.25);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.item-url {
  font-size: var(--font-size-caption);
  color: var(--accent-blue);
}

.more-results {
  padding: 8px;
  text-align: center;
  color: var(--accent-blue);
  cursor: pointer;
  font-size: var(--font-size-caption);
  border-top: 1px solid rgba(223, 231, 241, 0.85);
  margin-top: 6px;
  transition: background var(--transition-fast);
}

.more-results:hover {
  background: rgba(47, 111, 228, 0.07);
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
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.history-item:hover {
  background: rgba(47, 111, 228, 0.08);
  transform: translateY(-1px);
}

.history-item .el-icon {
  color: var(--text-tertiary);
}

@media (max-width: 1220px) {
  .global-search :deep(.el-input) {
    width: 240px;
  }
}

@media (max-width: 1060px) {
  .app-name {
    display: none;
  }

  .global-search :deep(.el-input) {
    width: 200px;
  }
}
</style>


