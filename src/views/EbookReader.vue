<template>
  <div class="ebook-reader" :style="readerStyle">
    <!-- 顶栏 -->
    <div class="reader-header" :class="{ hidden: !showToolbar }">
      <div class="rh-left">
        <el-button text size="small" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          {{ t('ebookReader.backToShelf') }}
        </el-button>
      </div>
      <div class="rh-center">
        <span class="rh-title">{{ bookData?.title || '' }}</span>
        <span class="rh-chapter" v-if="currentChapter">{{ currentChapter }}</span>
      </div>
      <div class="rh-right">
        <span class="rh-page" v-if="totalPages">{{ currentPage }}/{{ totalPages }}</span>
        <el-button text size="small" @click="toggleToc" :class="{ active: showToc }">
          <el-icon><Menu /></el-icon>
        </el-button>
        <el-button text size="small" @click="toggleBookmarks" :class="{ active: showBookmarkPanel }">
          <el-icon><Star /></el-icon>
        </el-button>
        <el-button text size="small" @click="searchVisible = !searchVisible">
          <el-icon><Search /></el-icon>
        </el-button>
        <el-button text size="small" @click="showSettingsPanel = !showSettingsPanel">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar" v-if="searchVisible">
      <el-input v-model="searchQuery" :placeholder="t('ebookReader.searchHint')" size="small" clearable @keyup.enter="doSearch" prefix-icon="Search" />
      <div class="search-results" v-if="searchResults.length">
        <div v-for="(r, i) in searchResults" :key="i" class="search-item" @click="goToSearchResult(r)">
          <span class="search-excerpt" v-html="r.excerpt"></span>
        </div>
      </div>
    </div>

    <!-- 主阅读区 -->
    <div class="reader-body" @click="onBodyClick">
      <!-- EPUB 渲染容器 -->
      <div v-if="bookData?.format === 'epub'" ref="epubContainer" class="epub-container"></div>

      <!-- PDF 渲染容器 -->
      <div v-else-if="bookData?.format === 'pdf'" class="pdf-container">
        <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
      </div>

      <!-- TXT 翻页容器 -->
      <div v-else-if="bookData?.format === 'txt'" class="txt-container">
        <!-- 仿真翻页模式 -->
        <div v-if="config.pageMode === 'flip'" class="flip-book" ref="flipBookEl">
          <div class="flip-page left-page" @click.stop="prevPage">
            <!-- 向后翻时：底下露出的前一页 -->
            <div v-if="flipDirection === 'backward'" class="page-under">
              <div class="page-content" :style="pageStyle" v-html="renderTxtPage(currentPage - 3)"></div>
              <div class="page-number">{{ currentPage - 2 }}</div>
            </div>
            <!-- 向后翻时：翻动的页 -->
            <div v-if="flipDirection === 'backward'" class="page-flip-back" :class="{ flipping: isFlipping }" @transitionend="onFlipEnd">
              <div class="page-content" :style="pageStyle" v-html="renderTxtPage(currentPage - 1)"></div>
              <div class="page-number">{{ currentPage }}</div>
            </div>
            <!-- 正常显示的左页 -->
            <div v-if="flipDirection !== 'backward' || !isFlipping" class="page-content" :style="pageStyle" v-html="renderTxtPage(currentPage - 1)"></div>
            <div v-if="flipDirection !== 'backward' || !isFlipping" class="page-number">{{ currentPage }}</div>
          </div>
          <div class="flip-page right-page" @click.stop="nextPage">
            <div class="page-under">
              <div class="page-content" :style="pageStyle" v-html="renderTxtPage(currentPage + 1)"></div>
              <div class="page-number">{{ currentPage + 2 }}</div>
            </div>
            <div class="page-flip" :class="{ flipping: isFlipping && flipDirection === 'forward' }" @transitionend="onFlipEnd">
              <div class="page-content" :style="pageStyle" v-html="renderTxtPage(currentPage)"></div>
              <div class="page-number">{{ currentPage + 1 }}</div>
            </div>
          </div>
        </div>

        <!-- 滑动模式 -->
        <div v-else-if="config.pageMode === 'slide'" class="slide-container" @click.stop="onSlideClick">
          <transition :name="slideDirection">
            <div :key="currentPage" class="slide-page" :style="pageStyle">
              <div class="page-content" v-html="renderTxtPage(currentPage - 1)"></div>
              <div class="page-number">{{ currentPage }}</div>
            </div>
          </transition>
        </div>

        <!-- 滚动模式 -->
        <div v-else class="scroll-container" ref="scrollContainer" @scroll="onScrollRead">
          <div class="scroll-content" :style="pageStyle">
            {{ txtContent }}
          </div>
        </div>
      </div>

      <!-- 翻页按钮 -->
      <button class="nav-prev" @click.stop="prevPage" v-if="totalPages > 1">&lsaquo;</button>
      <button class="nav-next" @click.stop="nextPage" v-if="totalPages > 1">&rsaquo;</button>
    </div>

    <!-- 底部进度条 -->
    <div class="reader-footer" :class="{ hidden: !showToolbar }">
      <div class="footer-progress">
        <el-slider v-model="progressPercent" :min="0" :max="100" :step="0.1" :show-tooltip="false" size="small" @change="onProgressChange" />
      </div>
      <div class="footer-info">
        <span v-if="readingTime">{{ t('ebookReader.readingTime') }}: {{ formatTime(readingTime) }}</span>
        <span class="footer-spacer"></span>
        <span v-if="totalPages">{{ Math.round(progressPercent) }}%</span>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="reader-loading" v-if="loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>

    <!-- 目录侧边栏 -->
    <transition name="slide-panel">
      <div class="side-panel toc-panel" v-if="showToc">
        <div class="panel-header">
          <span>{{ t('ebookReader.toc') }}</span>
          <el-button text size="small" @click="showToc = false"><el-icon><Close /></el-icon></el-button>
        </div>
        <div class="panel-body">
          <div v-for="(item, i) in tocList" :key="i" class="toc-item" :style="{ paddingLeft: (item.level || 0) * 16 + 12 + 'px' }" @click="goToTocItem(item)">
            {{ item.label }}
          </div>
          <div v-if="!tocList.length" class="panel-empty">{{ t('ebookReader.noToc') }}</div>
        </div>
      </div>
    </transition>

    <!-- 书签面板 -->
    <transition name="slide-panel">
      <div class="side-panel bookmark-panel" v-if="showBookmarkPanel">
        <div class="panel-header">
          <span>{{ t('ebookReader.bookmarks') }}</span>
          <el-button text size="small" type="primary" @click="addCurrentBookmark">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button text size="small" @click="showBookmarkPanel = false"><el-icon><Close /></el-icon></el-button>
        </div>
        <div class="panel-body">
          <div v-for="bm in bookmarks" :key="bm.id" class="bookmark-item" @click="goToBookmark(bm)">
            <div class="bm-color" :style="{ background: bm.color }"></div>
            <div class="bm-info">
              <div class="bm-title">{{ bm.title || t('ebookReader.page') + ' ' + bm.page }}</div>
              <div class="bm-time">{{ bm.created_at?.substring(0, 16) }}</div>
            </div>
            <el-button text size="small" @click.stop="removeBookmarkItem(bm.id)"><el-icon><Delete /></el-icon></el-button>
          </div>
          <div v-if="!bookmarks.length" class="panel-empty">{{ t('ebookReader.noBookmarks') }}</div>
        </div>
      </div>
    </transition>

    <!-- 设置面板 -->
    <transition name="slide-panel">
      <div class="side-panel settings-panel" v-if="showSettingsPanel">
        <div class="panel-header">
          <span>{{ t('ebookReader.settings') }}</span>
          <el-button text size="small" @click="showSettingsPanel = false"><el-icon><Close /></el-icon></el-button>
        </div>
        <div class="panel-body">
          <div class="setting-group">
            <div class="setting-label">{{ t('ebookReader.pageMode') }}</div>
            <el-radio-group v-model="config.pageMode" size="small" @change="onConfigChange">
              <el-radio-button value="flip">{{ t('ebookReader.modeFlip') }}</el-radio-button>
              <el-radio-button value="slide">{{ t('ebookReader.modeSlide') }}</el-radio-button>
              <el-radio-button value="scroll">{{ t('ebookReader.modeScroll') }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="setting-group">
            <div class="setting-label">{{ t('ebookReader.fontSize') }}</div>
            <div class="setting-row">
              <el-button size="small" text @click="changeFontSize(-1)">A-</el-button>
              <span class="setting-value">{{ config.fontSize }}px</span>
              <el-button size="small" text @click="changeFontSize(1)">A+</el-button>
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-label">{{ t('ebookReader.lineHeight') }}</div>
            <el-slider v-model="config.lineHeight" :min="1.2" :max="3.0" :step="0.1" size="small" @change="onConfigChange" />
          </div>
          <div class="setting-group">
            <div class="setting-label">{{ t('ebookReader.margin') }}</div>
            <el-slider v-model="config.margin" :min="16" :max="80" :step="4" size="small" @change="onConfigChange" />
          </div>
          <div class="setting-group">
            <div class="setting-label">{{ t('ebookReader.theme') }}</div>
            <div class="theme-options">
              <div v-for="(th, key) in themes" :key="key" class="theme-dot" :class="{ active: config.theme === key }" :style="{ background: th.page, color: th.text, borderColor: config.theme === key ? 'var(--accent-blue)' : th.page }" @click="config.theme = key; onConfigChange()">
                {{ th.name.charAt(0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Menu, Star, Search, Setting, Close, Plus, Delete, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import * as ebook from '@/utils/ebookManager'

const router = useRouter()
const route = useRoute()

const bookData = ref(null)
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
const progressPercent = ref(0)
const currentChapter = ref('')
const readingTime = ref(0)
const readingTimer = ref(null)

const showToolbar = ref(true)
const showToc = ref(false)
const showBookmarkPanel = ref(false)
const showSettingsPanel = ref(false)
const searchVisible = ref(false)
const searchQuery = ref('')
const searchResults = ref([])

const tocList = ref([])
const bookmarks = ref([])

const config = ref(ebook.getReadingConfig())
const themes = ebook.READING_THEMES

// TXT 相关
const txtContent = ref('')
const txtPages = ref([])

// EPUB 相关
const epubContainer = ref(null)
let epubBook = null
let epubRendition = null

// PDF 相关
const pdfCanvas = ref(null)
let pdfDoc = null

// TXT scroll
const scrollContainer = ref(null)

// 翻页动画
const isFlipping = ref(false)
const flipDirection = ref('forward') // 'forward' | 'backward'
const slideDirection = ref('slide-left')

const readerStyle = computed(() => {
  const th = themes[config.value.theme] || themes.default
  return { backgroundColor: th.bg, color: th.text }
})

const pageStyle = computed(() => ({
  fontFamily: config.value.fontFamily === 'system' ? 'inherit' : config.value.fontFamily,
  fontSize: config.value.fontSize + 'px',
  lineHeight: config.value.lineHeight,
  padding: config.value.margin + 'px',
  color: (themes[config.value.theme] || themes.default).text,
  backgroundColor: (themes[config.value.theme] || themes.default).page,
}))

const { formatTime, escapeHtml, highlightSearchText } = ebook

// ---- 初始化 ----

onMounted(async () => {
  const bookId = Number(route.params.id)
  if (!bookId) { goBack(); return }

  loading.value = true
  try {
    bookData.value = await ebook.getBook(bookId)
    if (!bookData.value) { goBack(); return }

    // 恢复进度
    if (bookData.value.current_page) currentPage.value = bookData.value.current_page
    if (bookData.value.progress) progressPercent.value = bookData.value.progress
    if (bookData.value.total_time) readingTime.value = bookData.value.total_time

    // 加载书签
    bookmarks.value = await ebook.getBookmarks(bookId)

    // 按格式渲染
    if (bookData.value.format === 'epub') await loadEpub()
    else if (bookData.value.format === 'pdf') await loadPdf()
    else if (bookData.value.format === 'txt') await loadTxt()

    // 开始计时
    readingTimer.value = setInterval(() => { readingTime.value++ }, 1000)

    // 键盘
    document.addEventListener('keydown', onKeyDown)
  } catch (e) {
    ElMessage.error(e.message || 'Load failed')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  saveCurrentProgress()
  clearInterval(readingTimer.value)
  document.removeEventListener('keydown', onKeyDown)
  epubBook?.destroy()
})

// ---- EPUB ----

async function loadEpub() {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(bookData.value.file_path)

  const ePub = (await import('epubjs')).default
  epubBook = ePub(bytes.buffer)
  await epubBook.ready

  // 目录
  const nav = await epubBook.loaded.navigation
  tocList.value = flattenToc(nav.toc)

  // 渲染
  await nextTick()
  if (!epubContainer.value) return

  epubRendition = epubBook.renderTo(epubContainer.value, {
    width: '100%',
    height: '100%',
    spread: 'auto',
    flow: 'paginated',
  })

  // 主题
  applyEpubTheme()

  // 恢复位置
  if (bookData.value.current_cfi) {
    await epubRendition.display(bookData.value.current_cfi)
  } else {
    await epubRendition.display()
  }

  // 生成位置
  await epubBook.locations.generate(1024)
  totalPages.value = epubBook.locations.length()

  epubRendition.on('relocated', (location) => {
    const pct = epubBook.locations.percentageFromCfi(location.start.cfi)
    progressPercent.value = Math.round(pct * 1000) / 10
    currentPage.value = epubBook.locations.locationFromCfi(location.start.cfi) || 1

    // 章节名
    const ch = epubBook.navigation?.toc?.find(t => epubBook.canonical(t.href) === epubBook.canonical(location.start.href))
    currentChapter.value = ch?.label || ''
  })

  epubRendition.on('keydown', onKeyDown)
}

function applyEpubTheme() {
  if (!epubRendition) return
  const th = themes[config.value.theme] || themes.default
  epubRendition.themes.override('color', th.text)
  epubRendition.themes.override('background', th.page)
  epubRendition.themes.override('font-size', config.value.fontSize + 'px')
  epubRendition.themes.override('line-height', String(config.value.lineHeight))
}

function flattenToc(toc, level = 0) {
  const result = []
  for (const item of toc) {
    result.push({ label: item.label?.trim(), href: item.href, level })
    if (item.subitems?.length) result.push(...flattenToc(item.subitems, level + 1))
  }
  return result
}

// ---- PDF ----

async function loadPdf() {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(bookData.value.file_path)

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

  pdfDoc = await pdfjsLib.getDocument({ data: bytes.buffer || bytes }).promise
  totalPages.value = pdfDoc.numPages

  await renderPdfPage(currentPage.value)
}

async function renderPdfPage(pageNum) {
  if (!pdfDoc || !pdfCanvas.value) return
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = pdfCanvas.value
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
}

// ---- TXT ----

async function loadTxt() {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(bookData.value.file_path)

  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('gbk').decode(bytes)
  }

  txtContent.value = text
  rePaginateTxt()
}

function rePaginateTxt() {
  txtPages.value = ebook.paginateText(txtContent.value, {
    fontSize: config.value.fontSize,
    lineHeight: config.value.lineHeight,
    margin: config.value.margin,
    pageWidth: 600,
    pageHeight: 780,
  })
  totalPages.value = txtPages.value.length
}

function renderTxtPage(pageIdx) {
  if (pageIdx < 0 || pageIdx >= txtPages.value.length) return ''
  const text = txtPages.value[pageIdx] || ''
  return escapeHtml(text).replace(/\n/g, '<br>')
}

// ---- 翻页 ----

function nextPage() {
  if (bookData.value?.format === 'epub') {
    epubRendition?.next()
    return
  }
  if (bookData.value?.format === 'pdf') {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      renderPdfPage(currentPage.value)
      updateProgress()
    }
    return
  }
  // TXT
  if (config.value.pageMode === 'flip') {
    if (currentPage.value + 1 < totalPages.value && !isFlipping.value) {
      flipDirection.value = 'forward'
      isFlipping.value = true
    }
    return
  }
  if (currentPage.value < totalPages.value) {
    slideDirection.value = 'slide-left'
    currentPage.value++
    updateProgress()
  }
}

function prevPage() {
  if (bookData.value?.format === 'epub') {
    epubRendition?.prev()
    return
  }
  if (bookData.value?.format === 'pdf') {
    if (currentPage.value > 1) {
      currentPage.value--
      renderPdfPage(currentPage.value)
      updateProgress()
    }
    return
  }
  // TXT
  if (config.value.pageMode === 'flip') {
    if (currentPage.value > 2 && !isFlipping.value) {
      flipDirection.value = 'backward'
      isFlipping.value = true
    }
    return
  }
  if (currentPage.value > 1) {
    slideDirection.value = 'slide-right'
    currentPage.value--
    updateProgress()
  }
}

function onFlipEnd(e) {
  if (!isFlipping.value) return
  if (e.propertyName !== 'transform') return
  const el = e.currentTarget
  el.style.transition = 'none'
  isFlipping.value = false
  if (flipDirection.value === 'forward') {
    currentPage.value = Math.min(currentPage.value + 2, totalPages.value)
  } else {
    currentPage.value = Math.max(1, currentPage.value - 2)
  }
  updateProgress()
  nextTick(() => {
    void el.offsetHeight
    el.style.transition = ''
  })
}

function updateProgress() {
  if (totalPages.value > 0) {
    progressPercent.value = Math.round((currentPage.value / totalPages.value) * 1000) / 10
  }
}

function onProgressChange(val) {
  if (bookData.value?.format === 'epub' && epubBook) {
    const cfi = epubBook.locations.cfiFromPercentage(val / 100)
    epubRendition.display(cfi)
    return
  }
  const page = Math.max(1, Math.round((val / 100) * totalPages.value))
  currentPage.value = page
  if (bookData.value?.format === 'pdf') renderPdfPage(page)
  if (bookData.value?.format === 'txt' && config.value.pageMode === 'scroll' && scrollContainer.value) {
    const el = scrollContainer.value
    el.scrollTop = (val / 100) * (el.scrollHeight - el.clientHeight)
  }
}

function onScrollRead() {
  const el = scrollContainer.value
  if (!el) return
  const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
  progressPercent.value = Math.round(pct * 10) / 10
}

// ---- 保存进度 ----

async function saveCurrentProgress() {
  if (!bookData.value?.id) return
  try {
    await ebook.saveProgress(bookData.value.id, {
      currentPage: currentPage.value,
      currentCfi: epubRendition ? (await getCurrentCfi()) : '',
      progress: progressPercent.value,
      totalTime: readingTime.value,
    })
  } catch { /* ignore */ }
}

function getCurrentCfi() {
  try { return epubRendition?.location?.start?.cfi || '' } catch { return '' }
}

// 定期保存
// 旧:setInterval 直接调 async 函数,前一次没完下一次又触发,
// 数据库 write 并发会导致进度乱序甚至 SQLITE_BUSY。
let isSaving = false
let saveTimer = setInterval(async () => {
  if (isSaving) return
  isSaving = true
  try { await saveCurrentProgress() }
  catch (e) { console.warn('[ebook] auto-save failed:', e) }
  finally { isSaving = false }
}, 30000)
onBeforeUnmount(() => clearInterval(saveTimer))

// ---- 目录 ----

function goToTocItem(item) {
  if (bookData.value?.format === 'epub') {
    epubRendition?.display(item.href)
  }
  showToc.value = false
}

function toggleToc() {
  showToc.value = !showToc.value
  showBookmarkPanel.value = false
  showSettingsPanel.value = false
}

// ---- 书签 ----

function toggleBookmarks() {
  showBookmarkPanel.value = !showBookmarkPanel.value
  showToc.value = false
  showSettingsPanel.value = false
}

async function addCurrentBookmark() {
  if (!bookData.value?.id) return
  try {
    await ebook.addBookmark(bookData.value.id, {
      page: currentPage.value,
      cfi: getCurrentCfi(),
      title: currentChapter.value || `${t('ebookReader.page')} ${currentPage.value}`,
    })
    bookmarks.value = await ebook.getBookmarks(bookData.value.id)
    ElMessage.success(t('ebookReader.addBookmark'))
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function removeBookmarkItem(id) {
  await ebook.removeBookmark(id)
  bookmarks.value = await ebook.getBookmarks(bookData.value.id)
}

function goToBookmark(bm) {
  if (bookData.value?.format === 'epub' && bm.cfi) {
    epubRendition?.display(bm.cfi)
  } else {
    currentPage.value = bm.page || 1
    if (bookData.value?.format === 'pdf') renderPdfPage(currentPage.value)
  }
  showBookmarkPanel.value = false
}

// ---- 搜索 ----

async function doSearch() {
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  const q = searchQuery.value.trim()
  const results = []

  if (bookData.value?.format === 'epub' && epubBook) {
    const spine = epubBook.spine
    for (let i = 0; i < spine.items.length && results.length < 50; i++) {
      const item = spine.items[i]
      const doc = await item.load(epubBook.load.bind(epubBook))
      const text = doc.body?.textContent || ''
      let idx = text.toLowerCase().indexOf(q.toLowerCase())
      while (idx !== -1 && results.length < 50) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(text.length, idx + q.length + 30)
        const excerpt = highlightSearchText(text.substring(start, end), q)
        results.push({ excerpt, href: item.href, section: i })
        idx = text.toLowerCase().indexOf(q.toLowerCase(), idx + 1)
      }
    }
  } else if (bookData.value?.format === 'txt') {
    const text = txtContent.value
    let idx = text.toLowerCase().indexOf(q.toLowerCase())
    while (idx !== -1 && results.length < 50) {
      const start = Math.max(0, idx - 40)
      const end = Math.min(text.length, idx + q.length + 40)
      const excerpt = highlightSearchText(text.substring(start, end), q)
      // 找到对应页
      let charCount = 0
      let page = 0
      for (let p = 0; p < txtPages.value.length; p++) {
        charCount += txtPages.value[p].length + 1
        if (charCount >= idx) { page = p + 1; break }
      }
      results.push({ excerpt, page })
      idx = text.toLowerCase().indexOf(q.toLowerCase(), idx + 1)
    }
  }

  searchResults.value = results
  if (!results.length) ElMessage.info(t('ebookReader.noResults'))
}

function goToSearchResult(r) {
  if (bookData.value?.format === 'epub' && r.href) {
    epubRendition?.display(r.href)
  } else if (r.page) {
    currentPage.value = r.page
    if (bookData.value?.format === 'pdf') renderPdfPage(r.page)
  }
  searchVisible.value = false
}

// ---- 设置 ----

function onConfigChange() {
  ebook.saveReadingConfig(config.value)
  if (bookData.value?.format === 'epub') applyEpubTheme()
  if (bookData.value?.format === 'txt') rePaginateTxt()
}

function changeFontSize(delta) {
  config.value.fontSize = Math.max(12, Math.min(32, config.value.fontSize + delta * 2))
  onConfigChange()
}

// ---- UI ----

function toggleToolbar() { showToolbar.value = !showToolbar.value }

function onSlideClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  if (e.clientX - rect.left < rect.width / 2) prevPage()
  else nextPage()
}

function onBodyClick(e) {
  // 关闭所有面板
  if (showToc.value || showBookmarkPanel.value || showSettingsPanel.value) {
    const panel = e.target.closest('.side-panel')
    if (!panel) {
      showToc.value = false
      showBookmarkPanel.value = false
      showSettingsPanel.value = false
    }
    return
  }
  // 点击空白区域切换工具栏
  if (!e.target.closest('.flip-book, .slide-container, .scroll-container, .epub-container, .pdf-container')) {
    toggleToolbar()
  }
}

function goBack() {
  saveCurrentProgress()
  router.push('/toolbox/ebook-shelf')
}

function onKeyDown(e) {
  if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return
  switch (e.key) {
    case 'ArrowLeft': prevPage(); break
    case 'ArrowRight': case ' ': e.preventDefault(); nextPage(); break
    case 'Home': currentPage.value = 1; if (bookData.value?.format === 'pdf') renderPdfPage(1); break
    case 'End': currentPage.value = totalPages.value; if (bookData.value?.format === 'pdf') renderPdfPage(totalPages.value); break
    case 'Escape': if (searchVisible.value) searchVisible.value = false; else if (showToc.value || showBookmarkPanel.value || showSettingsPanel.value) { showToc.value = false; showBookmarkPanel.value = false; showSettingsPanel.value = false } else goBack(); break
    case 'f': case 'F': if (e.ctrlKey) { e.preventDefault(); searchVisible.value = true } break
    case 'b': case 'B': if (e.ctrlKey) { e.preventDefault(); addCurrentBookmark() } break
    case '=': case '+': if (e.ctrlKey) { e.preventDefault(); changeFontSize(1) } break
    case '-': if (e.ctrlKey) { e.preventDefault(); changeFontSize(-1) } break
  }
}
</script>

<style scoped>
.ebook-reader {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  transition: background-color 0.3s, color 0.3s;
}

/* Header */
.reader-header {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 42px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(128,128,128,0.15);
  transition: height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, border-color 0.3s ease;
  z-index: 10;
  overflow: hidden;
}
.reader-header.hidden { height: 0; padding: 0; border-color: transparent; opacity: 0; pointer-events: none; }
.rh-left { display: flex; align-items: center; }
.rh-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
.rh-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.rh-chapter { font-size: 11px; opacity: 0.6; }
.rh-right { display: flex; align-items: center; gap: 4px; }
.rh-page { font-size: 12px; opacity: 0.5; margin-right: 8px; font-variant-numeric: tabular-nums; }
.rh-right .active { color: var(--accent-blue) !important; }

/* Search */
.search-bar { padding: 8px 16px; border-bottom: 1px solid rgba(128,128,128,0.15); flex-shrink: 0; }
.search-results { max-height: 240px; overflow-y: auto; margin-top: 8px; }
.search-item { padding: 6px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; }
.search-item:hover { background: rgba(128,128,128,0.1); }
.search-item :deep(mark) { background: #ffeb3b; color: var(--text-primary); border-radius: 2px; padding: 0 1px; }

/* Reader body */
.reader-body { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }

/* EPUB */
.epub-container { width: 100%; height: 100%; }

/* PDF */
.pdf-container { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; overflow: auto; }
.pdf-canvas { max-width: 100%; max-height: 100%; }

/* TXT Flip Book */
.txt-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.flip-book {
  display: flex;
  perspective: 1800px;
  width: min(90%, 1000px);
  height: min(90%, 780px);
}
.flip-page {
  width: 50%;
  height: 100%;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.left-page { border-right: 1px solid rgba(128,128,128,0.1); cursor: pointer; }
.right-page { overflow: visible; cursor: pointer; }
.page-under {
  position: absolute;
  inset: 0;
}
.page-flip {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1);
  z-index: 2;
}
.page-flip.flipping {
  transform: rotateY(-180deg);
}
.page-flip-back {
  position: absolute;
  inset: 0;
  transform-origin: right center;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1);
  z-index: 2;
  transform: rotateY(180deg);
}
.page-flip-back.flipping {
  transform: rotateY(0deg);
}
.page-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}
.page-number {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  opacity: 0.35;
}

/* Slide mode */
.slide-container { width: min(90%, 560px); height: min(90%, 780px); position: relative; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
.slide-page { width: 100%; height: 100%; position: absolute; inset: 0; overflow: hidden; border-radius: 8px; }
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.35s ease; }
.slide-left-enter-from { transform: translateX(100%); }
.slide-left-leave-to { transform: translateX(-100%); }
.slide-right-enter-from { transform: translateX(-100%); }
.slide-right-leave-to { transform: translateX(100%); }

/* Scroll mode */
.scroll-container { width: min(90%, 680px); height: 100%; overflow-y: auto; }
.scroll-content { white-space: pre-wrap; word-break: break-word; min-height: 100%; }
.scroll-container::-webkit-scrollbar { width: 6px; }
.scroll-container::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 3px; }

/* Navigation buttons */
.nav-prev, .nav-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  background: rgba(128,128,128,0.06);
  border: 1px solid rgba(128,128,128,0.12);
  width: 36px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: rgba(128,128,128,0.35);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
}
.nav-prev { left: 8px; }
.nav-next { right: 8px; }
.nav-prev:hover, .nav-next:hover {
  background: rgba(128,128,128,0.15);
  color: rgba(128,128,128,0.7);
}

/* Footer */
.reader-footer {
  padding: 8px 20px;
  flex-shrink: 0;
  border-top: 1px solid rgba(128,128,128,0.15);
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, border-color 0.3s ease;
  max-height: 80px;
  overflow: hidden;
}
.reader-footer.hidden { max-height: 0; padding: 0; border-color: transparent; opacity: 0; pointer-events: none; }
.footer-progress { padding: 0 4px; }
.footer-info { display: flex; align-items: center; font-size: 11px; opacity: 0.5; margin-top: 4px; }
.footer-spacer { flex: 1; }

/* Loading */
.reader-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: inherit; z-index: 25; }

/* Side panels */
.side-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: -4px 0 16px rgba(0,0,0,0.08);
  z-index: 20;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}
.panel-header > span:first-child { flex: 1; }
.panel-body { flex: 1; overflow-y: auto; padding: 8px 0; }
.panel-empty { text-align: center; padding: 32px; font-size: 13px; color: var(--text-quaternary); }

.slide-panel-enter-active, .slide-panel-leave-active { transition: transform 0.25s ease; }
.slide-panel-enter-from, .slide-panel-leave-to { transform: translateX(100%); }

/* TOC */
.toc-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.15s;
}
.toc-item:hover { background: var(--bg-tertiary); }

/* Bookmarks */
.bookmark-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.bookmark-item:hover { background: var(--bg-tertiary); }
.bm-color { width: 4px; height: 28px; border-radius: 2px; flex-shrink: 0; }
.bm-info { flex: 1; min-width: 0; }
.bm-title { font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bm-time { font-size: 11px; color: var(--text-quaternary); }

/* Settings */
.setting-group { padding: 12px 16px; }
.setting-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.setting-row { display: flex; align-items: center; gap: 12px; }
.setting-value { font-size: 14px; font-weight: 600; min-width: 50px; text-align: center; color: var(--text-primary); }

.theme-options { display: flex; gap: 10px; }
.theme-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.theme-dot:hover { transform: scale(1.1); }
.theme-dot.active { border-color: var(--accent-blue) !important; transform: scale(1.1); }
</style>
