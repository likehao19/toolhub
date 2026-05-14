<template>
  <div class="ebook-shelf">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Reading Tools</div>
          <div class="breadcrumb">
            <el-icon><Reading /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('ebookShelf.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-input v-model="searchText" :placeholder="t('ebookShelf.search')" size="small" clearable class="search-input">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterStatus" size="small" class="filter-select">
          <el-option :label="t('ebookShelf.all')" value="all" />
          <el-option :label="t('ebookShelf.reading')" value="reading" />
          <el-option :label="t('ebookShelf.finished')" value="finished" />
          <el-option :label="t('ebookShelf.unread')" value="unread" />
        </el-select>
        <el-select v-model="sortBy" size="small" class="sort-select">
          <el-option :label="t('ebookShelf.sortRecent')" value="recent" />
          <el-option :label="t('ebookShelf.sortTitle')" value="title" />
          <el-option :label="t('ebookShelf.sortAuthor')" value="author" />
        </el-select>
        <el-button type="primary" size="small" @click="importBooks">
          <el-icon style="margin-right: 6px;"><FolderAdd /></el-icon>{{ t('ebookShelf.import') }}
        </el-button>
        <el-button size="small" text @click="showSettings = true" :title="t('ebookShelf.storageSettings')">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 书架内容 -->
    <div class="shelf-content" v-if="filteredBooks.length" @dragover.prevent @drop.prevent="onDrop">
      <div class="book-grid">
        <div
          v-for="book in filteredBooks"
          :key="book.id"
          class="book-card"
          @click="openBook(book)"
          @contextmenu.prevent="showContextMenu($event, book)"
        >
          <div class="book-cover">
            <img v-if="book.cover" :src="book.cover" :alt="book.title" />
            <div v-else class="cover-placeholder" :class="'cover-' + (book.id % 6)">
              <span class="cover-ext">.{{ book.format }}</span>
              <span class="cover-title">{{ book.title }}</span>
            </div>
            <span class="format-badge">{{ book.format.toUpperCase() }}</span>
            <span v-if="(book.progress || 0) >= 100" class="done-badge">✓</span>
          </div>
          <div class="book-info">
            <div class="book-title" :title="book.title">{{ book.title }}</div>
            <div class="book-author">{{ book.author || t('ebookShelf.unknownAuthor') }}</div>
            <div class="book-progress-bar" v-if="book.progress != null && book.progress > 0">
              <div class="progress-fill" :style="{ width: Math.min(book.progress, 100) + '%' }"></div>
            </div>
            <div class="book-meta">
              <span v-if="book.progress > 0 && book.progress < 100">{{ Math.round(book.progress) }}%</span>
              <span v-else-if="book.progress >= 100">{{ t('ebookShelf.done') }}</span>
            </div>
          </div>
        </div>

        <!-- 导入卡片 -->
        <div class="book-card import-card" @click="importBooks">
          <div class="import-icon">+</div>
          <div class="import-text">{{ t('ebookShelf.import') }}</div>
          <div class="import-hint">{{ t('ebookShelf.importHint') }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else-if="!loading" @dragover.prevent @drop.prevent="onDrop">
      <div class="empty-icon">📚</div>
      <div class="empty-title">{{ t('ebookShelf.noBooks') }}</div>
      <div class="empty-hint">{{ t('ebookShelf.noBooksHint') }}</div>
      <el-button type="primary" @click="importBooks" style="margin-top: 16px">
        <el-icon style="margin-right: 6px;"><FolderAdd /></el-icon>{{ t('ebookShelf.import') }}
      </el-button>
      <div class="drop-hint">{{ t('ebookShelf.dropHint') }}</div>
    </div>

    <!-- 加载中 -->
    <div class="empty-state" v-if="loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span>{{ t('ebookShelf.totalBooks', { count: books.length }) }}</span>
      <span v-if="stats.reading">{{ t('ebookShelf.readingCount', { count: stats.reading }) }}</span>
      <span v-if="stats.finished">{{ t('ebookShelf.finishedCount', { count: stats.finished }) }}</span>
      <span v-if="stats.totalTime" class="status-right">{{ t('ebookShelf.totalReadTime') }}: {{ formatTime(stats.totalTime) }}</span>
    </div>

    <!-- 右键菜单 -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click="contextMenu.visible = false">
      <div class="ctx-item" @click="openBook(contextMenu.book)">{{ t('ebookShelf.continueReading') }}</div>
      <div class="ctx-item" @click="showBookInfo(contextMenu.book)">{{ t('ebookShelf.bookInfo') }}</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ctx-danger" @click="confirmDelete(contextMenu.book)">{{ t('ebookShelf.deleteBook') }}</div>
    </div>

    <!-- 存储设置对话框 -->
    <el-dialog v-model="showSettings" :title="t('ebookShelf.storageSettings')" width="480px" append-to-body>
      <el-form label-position="top">
        <el-form-item :label="t('ebookShelf.storagePath')">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="storagePath" readonly style="flex:1" />
            <el-button @click="selectStoragePath">
              <el-icon style="margin-right: 6px;"><FolderOpened /></el-icon>{{ t('ebookShelf.selectFolder') }}
            </el-button>
          </div>
          <div class="setting-hint">{{ t('ebookShelf.storageHint') }}</div>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 书籍信息对话框 -->
    <el-dialog v-model="showBookDetail" :title="t('ebookShelf.bookInfo')" width="480px" append-to-body>
      <div v-if="detailBook" class="book-detail">
        <div class="detail-row"><span class="detail-label">{{ t('ebookShelf.titleLabel') }}</span><span>{{ detailBook.title }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('ebookShelf.authorLabel') }}</span><span>{{ detailBook.author || '—' }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('ebookShelf.formatLabel') }}</span><span>{{ detailBook.format?.toUpperCase() }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('ebookShelf.sizeLabel') }}</span><span>{{ formatFileSize(detailBook.file_size) }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('ebookShelf.pathLabel') }}</span><span class="detail-path">{{ detailBook.file_path }}</span></div>
        <div class="detail-row" v-if="detailBook.description"><span class="detail-label">{{ t('ebookShelf.descLabel') }}</span><span>{{ detailBook.description }}</span></div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Reading, FolderAdd, Setting, Loading, Search, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import * as ebook from '@/utils/ebookManager'

const router = useRouter()

const books = ref([])
const loading = ref(false)
const searchText = ref('')
const filterStatus = ref('all')
const sortBy = ref('recent')
const showSettings = ref(false)
const storagePath = ref('')

// 初始化存储路径
async function initStoragePath() {
  const dir = await ebook.getBooksDirAsync()
  storagePath.value = dir
}
const showBookDetail = ref(false)
const detailBook = ref(null)
const stats = ref({ total: 0, reading: 0, finished: 0, totalTime: 0 })

const contextMenu = ref({ visible: false, x: 0, y: 0, book: null })

// 过滤 + 排序
const filteredBooks = computed(() => {
  let list = [...books.value]
  // 搜索
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(b => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
  }
  // 状态筛选
  if (filterStatus.value === 'reading') list = list.filter(b => (b.progress || 0) > 0 && (b.progress || 0) < 100)
  else if (filterStatus.value === 'finished') list = list.filter(b => (b.progress || 0) >= 100)
  else if (filterStatus.value === 'unread') list = list.filter(b => !b.progress || b.progress === 0)
  // 排序
  if (sortBy.value === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
  else if (sortBy.value === 'author') list.sort((a, b) => (a.author || '').localeCompare(b.author || ''))
  else list.sort((a, b) => (b.last_read || b.created_at || '').localeCompare(a.last_read || a.created_at || ''))
  return list
})

async function loadBooks() {
  loading.value = true
  try {
    books.value = await ebook.getAllBooks()
    stats.value = await ebook.getReadingStats()
  } catch (e) {
    ElMessage.error(e.message || 'Load failed')
  } finally {
    loading.value = false
  }
}

async function importBooks() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile, copyFile } = await import('@tauri-apps/plugin-fs')

    const paths = await open({
      multiple: true,
      filters: [{ name: 'Ebooks', extensions: ['epub', 'pdf', 'txt'] }],
    })
    if (!paths || !paths.length) return

    const fileList = Array.isArray(paths) ? paths : [paths]
    let imported = 0

    for (const filePath of fileList) {
      try {
        const ext = filePath.split('.').pop().toLowerCase()
        const fileName = ebook.getFileName(filePath)
        const nameNoExt = fileName.replace(/\.\w+$/, '')

        // 读取文件获取大小
        const bytes = await readFile(filePath)
        const fileSize = bytes.byteLength

        // 复制到存储目录
        let destPath = filePath
        const dir = await ebook.getBooksDirAsync()
        if (dir) {
          try {
            const { mkdir } = await import('@tauri-apps/plugin-fs')
            await mkdir(dir, { recursive: true }).catch(() => {})
          } catch {}
          destPath = dir.replace(/[/\\]+$/, '') + '/' + fileName
          if (destPath !== filePath) {
            try { await copyFile(filePath, destPath) } catch { destPath = filePath }
          }
        }

        // 解析元数据
        let meta = { title: nameNoExt, author: '', cover: '', description: '', total_pages: 0 }

        if (ext === 'epub') {
          try {
            const ePub = (await import('epubjs')).default
            const book = ePub(bytes.buffer)
            await book.ready
            const md = book.packaging?.metadata
            if (md) {
              meta.title = md.title || nameNoExt
              meta.author = md.creator || ''
              meta.description = md.description || ''
            }
            try {
              const blobUrl = await book.coverUrl()
              if (blobUrl) {
                // Convert blob URL to base64 data URL for persistence
                const resp = await fetch(blobUrl)
                const blob = await resp.blob()
                meta.cover = await new Promise((resolve) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result)
                  reader.readAsDataURL(blob)
                })
                URL.revokeObjectURL(blobUrl)
              }
            } catch {}
            book.destroy()
          } catch { /* 解析失败用文件名 */ }
        } else if (ext === 'txt') {
          // TXT 按内容估算页数
          let text
          try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
          } catch {
            text = new TextDecoder('gbk').decode(bytes)
          }
          const pages = ebook.paginateText(text, { fontSize: 18, lineHeight: 1.8, margin: 48, pageWidth: 600, pageHeight: 800 })
          meta.total_pages = pages.length
        }

        await ebook.addBook({
          title: meta.title,
          author: meta.author,
          cover: meta.cover,
          format: ext,
          file_path: destPath,
          file_size: fileSize,
          total_pages: meta.total_pages,
          description: meta.description,
        })
        imported++
      } catch (e) {
        console.warn('Import failed:', filePath, e)
      }
    }

    if (imported > 0) {
      ElMessage.success(t('ebookShelf.importSuccess') + ` (${imported})`)
      await loadBooks()
    }
  } catch (e) {
    if (e.message) ElMessage.error(t('ebookShelf.importFailed') + ': ' + e.message)
  }
}

function openBook(book) {
  router.push(`/toolbox/ebook-reader/${book.id}`)
}

function showContextMenu(e, book) {
  const x = Math.min(e.clientX, window.innerWidth - 170)
  const y = Math.min(e.clientY, window.innerHeight - 130)
  contextMenu.value = { visible: true, x, y, book }
}

function showBookInfo(book) {
  detailBook.value = book
  showBookDetail.value = true
}

async function confirmDelete(book) {
  try {
    await ElMessageBox.confirm(
      t('ebookShelf.deleteConfirm', { title: book.title }),
      t('ebookShelf.deleteBook'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    await ebook.deleteBook(book.id)
    ElMessage.success(t('common.deleteSuccess'))
    await loadBooks()
  } catch { /* cancelled */ }
}

async function selectStoragePath() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const dir = await open({ directory: true })
    if (dir) {
      storagePath.value = dir
      ebook.setBooksDir(dir)
    }
  } catch {}
}

async function onDrop(e) {
  // Tauri 桌面端 drop 事件暂不处理文件，提示用户使用导入按钮
  ElMessage.info(t('ebookShelf.useImportBtn'))
}

// 全局点击关闭右键菜单
function closeContextMenu() { contextMenu.value.visible = false }

const { formatTime, formatFileSize } = ebook

onMounted(() => {
  initStoragePath()
  loadBooks()
  document.addEventListener('click', closeContextMenu)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<style scoped>
.ebook-shelf {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 2px; }
.search-input { width: 220px; }
.filter-select { width: 108px; }
.sort-select { width: 128px; }

.shelf-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 0;
}
.shelf-content::-webkit-scrollbar { width: 6px; }
.shelf-content::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 3px; }

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.book-card {
  cursor: pointer;
  border-radius: 18px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(60, 40, 20, 0.08);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  user-select: none;
  padding: 12px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.book-card:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(60, 40, 20,0.08); border-color: rgba(64,158,255,0.28); }

.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(60, 40, 20,0.12), 0 1px 4px rgba(60, 40, 20,0.08);
}
.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  box-sizing: border-box;
}
.cover-0 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.cover-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.cover-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.cover-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.cover-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.cover-5 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.cover-ext { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; }
.cover-title { font-size: 14px; color: var(--el-color-white); font-weight: 700; text-align: center; line-height: 1.3; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }

.format-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.55);
  color: var(--el-color-white);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}
.done-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: var(--el-color-success);
  color: var(--el-color-white);
  font-size: 11px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.book-info { padding: 12px 2px 4px; }
.book-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-author {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-progress-bar {
  height: 4px;
  background: rgba(226,232,240,0.9);
  border-radius: 999px;
  margin-top: 8px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), #7c3aed);
  border-radius: 999px;
  transition: width 0.3s;
}
.book-meta {
  font-size: 10px;
  color: var(--text-quaternary);
  margin-top: 6px;
}

.import-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(60, 40, 20, 0.12);
  border-radius: 18px;
  min-height: 240px;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(255,255,255,0.42);
}
.import-card:hover {
  border-color: var(--accent-blue);
  background: rgba(64,158,255,0.06);
}
.import-icon { font-size: 36px; color: var(--text-quaternary); font-weight: 300; }
.import-text { font-size: 13px; color: var(--text-secondary); margin-top: 8px; font-weight: 500; }
.import-hint { font-size: 11px; color: var(--text-quaternary); margin-top: 4px; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 14px 18px 0;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.5);
}
.empty-icon { font-size: 64px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--text-secondary); }
.empty-hint { font-size: 13px; color: var(--text-quaternary); }
.drop-hint { font-size: 12px; color: var(--text-quaternary); margin-top: 24px; }

.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255,255,255,0.82);
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 11px;
  color: var(--text-tertiary);
  min-height: 30px;
  flex-shrink: 0;
  backdrop-filter: blur(16px);
}
.status-right { margin-left: auto; }

.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  box-shadow: 0 16px 32px rgba(60, 40, 20,0.14);
  padding: 6px 0;
  min-width: 150px;
  backdrop-filter: blur(20px);
}
.ctx-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}
.ctx-item:hover { background: rgba(240, 233, 220,0.9); }
.ctx-danger { color: var(--el-color-danger); }
.ctx-sep { height: 1px; background: rgba(60, 40, 20, 0.08); margin: 4px 0; }

.setting-hint { font-size: 12px; color: var(--text-quaternary); margin-top: 6px; }
.book-detail { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 12px; font-size: 13px; }
.detail-label { color: var(--text-tertiary); min-width: 60px; flex-shrink: 0; }
.detail-path { word-break: break-all; color: var(--text-secondary); font-size: 12px; }

@media (max-width: 1100px) {
  .header-actions { width: 100%; justify-content: flex-end; }
}

@media (max-width: 860px) {
  .header {
    align-items: flex-start;
    padding: 12px 14px;
  }
  .search-input { width: 100%; }
  .filter-select,
  .sort-select { width: 120px; }
  .shelf-content { padding: 14px 14px 0; }
  .empty-state { margin: 14px 14px 0; }
  .status-bar { padding: 0 14px; flex-wrap: wrap; height: auto; padding-top: 6px; padding-bottom: 6px; }
}
</style>
