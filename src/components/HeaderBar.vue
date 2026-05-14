<template>
  <div class="header-bar" data-tauri-drag-region>
    <div class="header-content" data-tauri-drag-region>
      <div class="header-left" data-tauri-drag-region>
        <div class="app-logo" data-tauri-drag-region>
          <img src="/logo.png" alt="logo" />
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
            @keydown.enter="handleSearchEnter"
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
                      <Tools v-if="module === 'tools'" />
                      <Document v-else-if="module === 'notes'" />
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
                      <div class="item-row">
                        <span v-if="module === 'tools'" class="item-emoji">{{ result.item.icon }}</span>
                        <div class="item-text">
                          <div class="item-title" v-html="highlightText(getDisplayTitle(result), searchQuery)"></div>
                        </div>
                      </div>
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
import { Top, Minus, FullScreen, CopyDocument, Close, Search, Document, List, Link, Lock, Calendar, Loading, Clock, Tools } from '@element-plus/icons-vue'
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
  tools: [],
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

  if (!searchQuery.value || !searchQuery.value.trim()) {
    searchResults.value = { tools: [], notes: [], todos: [], bookmarks: [], passwords: [], events: [], total: 0 }
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

// 回车跳到第一个匹配结果(优先级:工具 > 笔记 > 待办 > 书签 > 密码 > 日程)
const handleSearchEnter = () => {
  if (!searchQuery.value || searchResults.value.total === 0) return
  const order = ['tools', 'notes', 'todos', 'bookmarks', 'passwords', 'events']
  for (const module of order) {
    const items = searchResults.value[module]
    if (Array.isArray(items) && items.length > 0) {
      handleSearchItemClick(items[0])
      return
    }
  }
}

// 楂樹寒鏂囨湰
const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightText = (text, query) => {
  if (!text || !query) return text
  const safe = escapeHtml(String(text))
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return safe.replace(regex, '<mark>$1</mark>')
}

// 鑾峰彇妯″潡鍚嶇О
const getModuleName = (module) => {
  const names = {
    tools: t('header.tools') || '工具',
    notes: t('header.notes'),
    todos: t('header.todos'),
    bookmarks: t('header.bookmarks'),
    passwords: t('header.passwords'),
    events: t('header.events')
  }
  return names[module] || module
}

// 笔记模块只展示文件名(name);其它模块仍优先显示 title
const getDisplayTitle = (result) => {
  if (result.module === 'notes') return result.item.name || result.item.title
  return result.item.title || result.item.name
}

// 澶勭悊鎼滅储缁撴灉椤圭偣鍑?
const handleSearchItemClick = (result) => {
  const item = result.item
  showSearchResults.value = false
  searchQuery.value = ''

  if (result.module === 'tools') {
    if (item.path) router.push(item.path)
    return
  }
  if (result.module === 'notes') {
    // NoteView 优先识别 ?path=<abs> 直接打开;?note=<name> 仅当 name 不含路径时兜底。
    // listNotes 现在递归扫描子文件夹,item.name 可能含 '/',传 path 更可靠。
    if (item.path) {
      router.push(`/notes?path=${encodeURIComponent(item.path)}`)
    } else {
      router.push(`/notes?note=${encodeURIComponent(item.name)}`)
    }
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
    tools: '/toolbox',
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
  background: linear-gradient(180deg, var(--surface-panel) 0%, rgba(248, 251, 255, 0.84) 100%);
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
  gap: 4px;
  -webkit-app-region: drag;
}

.app-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  -webkit-app-region: drag;
  margin-left: 2px;
  overflow: hidden;
}

.app-logo img {
  display: block;
  width: 22px;
  height: 22px;
  object-fit: contain;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

.app-name {
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--el-text-color-primary);
  letter-spacing: 0.02em;
  -webkit-app-region: drag;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  -webkit-text-fill-color: var(--el-text-color-primary);
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
  background: var(--surface-panel-soft);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), transform var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
  color: #475569;
}

.header-button:hover {
  background: var(--surface-panel);
  color: var(--el-text-color-primary);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(60, 40, 20, 0.12);
}

.header-button.close-button:hover {
  background: var(--color-red);
  color: var(--el-color-white);
  border-color: transparent;
}

.header-button.pin-button.active {
  color: var(--accent-blue);
  border-color: rgba(47, 111, 228, 0.38);
  background: rgba(47, 111, 228, 0.12);
}

.header-button .el-icon {
  font-size: 14px;
}

.global-search {
  position: relative;
  margin-left: 14px;
  -webkit-app-region: no-drag;
}

.global-search :deep(.el-input) {
  width: 300px;
  --el-input-bg-color: var(--surface-panel-soft);
  --el-input-border-color: color-mix(in srgb, var(--border-color) 85%, #dce7f6 15%);
  --el-input-hover-border-color: #b7c8dd;
  --el-input-focus-border-color: var(--accent-blue);
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
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(47, 111, 228, 0.14) !important;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: var(--surface-panel);
  border: 1px solid color-mix(in srgb, var(--border-color) 90%, #dce6f4 10%);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(60, 40, 20, 0.14);
  backdrop-filter: blur(12px);
  max-height: 460px;
  overflow: hidden auto;
  z-index: 1000;
}

.search-loading,
.search-empty {
  padding: 14px;
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 12px;
}

.search-results-content {
  padding: 0;
}

.search-module {
  margin: 0;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 4px;
  font-weight: var(--font-weight-semibold);
  font-size: 11px;
  color: var(--text-tertiary);
  background: rgba(248, 250, 253, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.search-module:not(:first-child) .module-header {
  border-top: 1px solid rgba(223, 231, 241, 0.6);
}

.module-header .el-icon {
  font-size: 12px;
}

.module-count {
  color: var(--text-tertiary);
  font-weight: var(--font-weight-regular);
  font-size: 11px;
}

.module-items {
  padding: 2px 0;
}

.search-item {
  padding: 7px 14px;
  cursor: pointer;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transition: background 0.12s ease !important;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-emoji {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  width: 16px;
  text-align: center;
}

.item-text {
  flex: 1;
  min-width: 0;
}

.search-item:hover {
  background: rgba(47, 111, 228, 0.06) !important;
  transform: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.item-title {
  font-weight: var(--font-weight-regular);
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-title mark {
  background: transparent;
  color: var(--accent-blue);
  font-weight: var(--font-weight-semibold);
  padding: 0;
}

.item-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-desc mark {
  background: transparent;
  color: var(--accent-blue);
  padding: 0;
}

.item-url {
  font-size: 11px;
  color: var(--accent-blue);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-results {
  padding: 6px 12px;
  text-align: center;
  color: var(--accent-blue);
  cursor: pointer;
  font-size: 11px;
  transition: background 0.12s ease;
}

.more-results:hover {
  background: rgba(47, 111, 228, 0.06);
}

.search-history {
  padding: 2px 0;
}

.history-header {
  padding: 6px 12px 4px;
  font-weight: var(--font-weight-semibold);
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(248, 250, 253, 0.55);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transition: background 0.12s ease !important;
}

.history-item:hover {
  background: rgba(47, 111, 228, 0.06) !important;
  transform: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.history-item .el-icon {
  color: var(--text-tertiary);
  font-size: 12px;
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


