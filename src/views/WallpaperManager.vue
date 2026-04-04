<template>
  <div class="wallpaper-wrapper">
    <!-- Header -->
    <div class="wp-header">
      <div class="wp-header-left">
        <div class="breadcrumb">
          <el-icon><Picture /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('wallpaper.title') }}</span>
        </div>
      </div>
      <div class="wp-header-right">
        <div class="current-indicator" v-if="currentWallpaperName">
          <span class="current-dot" />
          <span class="current-text">{{ currentWallpaperName }}</span>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="wp-toolbar">
      <div class="source-tabs">
        <button
          v-for="src in sources"
          :key="src.key"
          class="source-tab"
          :class="{ active: activeSource === src.key }"
          @click="switchSource(src.key)"
        >
          <el-icon :size="14"><component :is="src.icon" /></el-icon>
          <span>{{ src.label }}</span>
          <span v-if="src.count" class="source-count">{{ src.count }}</span>
        </button>
      </div>
      <div class="toolbar-actions">
        <el-button v-if="activeSource === 'local'" size="small" @click="selectFolder">
          <el-icon><FolderOpened /></el-icon>
          {{ t('wallpaper.selectFolder') }}
        </el-button>
        <el-button
          v-if="activeSource !== 'local' && activeSource !== 'downloaded'"
          size="small"
          @click="refreshCurrentSource"
          :loading="loading"
        >
          <el-icon><Refresh /></el-icon>
          {{ t('wallpaper.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="wp-content" ref="scrollRef">
      <div v-if="loading && visibleImages.length === 0" class="wp-loading">
        <el-icon :size="32" class="is-loading"><Refresh /></el-icon>
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading && allImages.length === 0" class="wp-empty">
        <el-icon :size="48"><PictureFilled /></el-icon>
        <p v-if="activeSource === 'local' && !localDir">{{ t('wallpaper.selectFolderHint') }}</p>
        <p v-else-if="activeSource === 'local'">{{ t('wallpaper.noImages') }}</p>
        <p v-else-if="activeSource === 'downloaded'">{{ t('wallpaper.noDownloaded') }}</p>
        <p v-else>{{ t('wallpaper.noOnlineWallpapers') }}</p>
      </div>

      <template v-else>
        <!-- Image grid (only visible slice) -->
        <div class="wp-grid">
          <div
            v-for="img in visibleImages"
            :key="img.id"
            class="wp-card"
            :class="{
              'is-current': isCurrentWallpaper(img.localPath || img.path),
              'is-downloading': downloadProgress[img.id] != null,
            }"
            @click="openPreview(img)"
          >
            <img
              :src="img.thumbSrc"
              :alt="img.title"
              class="wp-card-img"
              loading="lazy"
            />

            <div class="wp-badge wp-badge-current" v-if="isCurrentWallpaper(img.localPath || img.path)">
              {{ t('wallpaper.currentApplied') }}
            </div>
            <div class="wp-badge wp-badge-downloaded" v-else-if="img.isDownloaded && !img.isLocal">
              {{ t('wallpaper.alreadyDownloaded') }}
            </div>

            <!-- Download progress overlay -->
            <div class="wp-progress-overlay" v-if="downloadProgress[img.id] != null">
              <el-progress
                :percentage="downloadProgress[img.id]"
                :stroke-width="4"
                :show-text="true"
                :format="(p) => `${p}%`"
                color="#409eff"
              />
            </div>

            <!-- Hover overlay -->
            <div class="wp-card-overlay" v-else>
              <span class="wp-card-title">{{ img.title }}</span>
              <span class="wp-card-meta" v-if="img.resolution">{{ img.resolution }}</span>
              <div class="wp-card-actions">
                <el-button
                  v-if="img.isOnline && !img.isDownloaded"
                  size="small"
                  circle
                  @click.stop="downloadImage(img)"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  circle
                  @click.stop="applyWallpaper(img)"
                  :loading="applyingId === img.id"
                >
                  <el-icon><Check /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Scroll sentinel / load-more indicator -->
        <div ref="sentinelRef" class="wp-sentinel">
          <el-icon v-if="loadingMore" :size="20" class="is-loading"><Refresh /></el-icon>
          <span v-else-if="hasMore" class="wp-sentinel-hint">{{ t('wallpaper.loadMore') }}</span>
        </div>
      </template>
    </div>

    <!-- Preview dialog -->
    <el-dialog
      v-model="showPreview"
      :title="previewImg?.title"
      width="80%"
      destroy-on-close
      class="preview-dialog"
    >
      <div class="preview-body" v-if="previewImg">
        <img :src="previewImg.fullSrc" class="preview-full" />
        <div class="preview-info">
          <span>{{ previewImg.title }}</span>
          <span v-if="previewImg.resolution">{{ previewImg.resolution }}</span>
          <span v-if="previewImg.copyright">{{ previewImg.copyright }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreview = false">{{ t('wallpaper.close') }}</el-button>
        <el-button
          v-if="previewImg?.isOnline && !previewImg?.isDownloaded"
          @click="downloadImage(previewImg)"
          :loading="downloadProgress[previewImg?.id] != null"
        >
          <el-icon><Download /></el-icon>
          {{ t('wallpaper.downloadOnly') }}
        </el-button>
        <el-button
          type="primary"
          @click="applyWallpaper(previewImg)"
          :loading="applyingId === previewImg?.id"
        >
          {{ t('wallpaper.setAsWallpaper') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, shallowRef, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Picture, FolderOpened, PictureFilled, Check, Refresh, Download, Cloudy, Files, Monitor } from '@element-plus/icons-vue'
import { open } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import {
  getCurrentWallpaper,
  setWallpaper,
  scanImages,
  fetchBingWallpapers,
  fetchWallhavenWallpapers,
  downloadWallpaper,
  fileNameFromUrl,
} from '@/utils/wallpaperManager'
import { t } from '@/i18n'

const router = useRouter()
const LAST_LOCAL_DIR_KEY = 'wallpaper_manager_last_local_dir'
const PAGE_SIZE = 8

// --- DOM refs ---
const scrollRef = ref(null)
const sentinelRef = ref(null)

// --- State ---
const activeSource = ref('bing')
const currentWallpaper = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const applyingId = ref('')
const downloadProgress = reactive({})
const downloadedPathSet = shallowRef(new Set())
const wallpaperDir = ref('')
const visibleCount = ref(PAGE_SIZE)

// Source data — shallowRef avoids deep reactivity on large arrays
const bingImages = shallowRef([])
const wallhavenImages = shallowRef([])
const wallhavenPage = ref(1)
const wallhavenHasMore = ref(true)
const downloadedImages = shallowRef([])
const localImages = shallowRef([])
const localDir = ref('')

// Preview
const previewImg = ref(null)
const showPreview = computed({
  get: () => !!previewImg.value,
  set: (v) => { if (!v) previewImg.value = null },
})

// --- Helpers ---
const normalizePath = (val) => (val || '').replace(/\\/g, '/').toLowerCase()

const currentWallpaperName = computed(() => {
  if (!currentWallpaper.value) return ''
  return currentWallpaper.value.replace(/\\/g, '/').split('/').pop() || ''
})

const isCurrentWallpaper = (path) => {
  if (!path || !currentWallpaper.value) return false
  return normalizePath(currentWallpaper.value) === normalizePath(path)
}

const sources = computed(() => [
  { key: 'bing', label: t('wallpaper.bing'), icon: markRaw(Cloudy), count: bingImages.value.length || '' },
  { key: 'wallhaven', label: t('wallpaper.wallhaven'), icon: markRaw(Monitor), count: wallhavenImages.value.length || '' },
  { key: 'downloaded', label: t('wallpaper.downloaded'), icon: markRaw(Files), count: downloadedImages.value.length || '' },
  { key: 'local', label: t('wallpaper.local'), icon: markRaw(FolderOpened), count: localImages.value.length || '' },
])

// --- Normalized display list (cached, only rebuilds when source data changes) ---
const displayList = shallowRef([])

function rebuildDisplayList() {
  const src = activeSource.value
  const dlSet = downloadedPathSet.value
  const wpDir = wallpaperDir.value

  if (src === 'bing') {
    displayList.value = bingImages.value.map((img, idx) => {
      const fileName = fileNameFromUrl(img.url)
      const hasLocal = dlSet.has(fileName)
      return {
        id: `bing-${img.date}-${idx}`,
        title: img.title,
        copyright: img.copyright,
        resolution: '',
        url: img.url,
        thumbSrc: bingThumbUrl(img.url),
        fullSrc: img.url,
        isOnline: true, isLocal: false,
        isDownloaded: hasLocal,
        localPath: hasLocal ? `${wpDir}/${fileName}` : '',
        path: hasLocal ? `${wpDir}/${fileName}` : '',
        fileName,
      }
    })
  } else if (src === 'wallhaven') {
    displayList.value = wallhavenImages.value.map((img, idx) => {
      const fileName = fileNameFromUrl(img.url)
      const hasLocal = dlSet.has(fileName)
      return {
        id: `wh-${img.id}`,
        title: img.id || `Wallhaven #${idx}`,
        copyright: '',
        resolution: img.resolution,
        url: img.url,
        // Wallhaven thumbUrl is mandatory — never fallback to full-res
        thumbSrc: img.thumbUrl || '',
        fullSrc: img.url,
        isOnline: true, isLocal: false,
        isDownloaded: hasLocal,
        localPath: hasLocal ? `${wpDir}/${fileName}` : '',
        path: hasLocal ? `${wpDir}/${fileName}` : '',
        fileName,
      }
    })
  } else if (src === 'downloaded') {
    displayList.value = downloadedImages.value.map((img, idx) => ({
      id: `dl-${idx}-${img.name}`,
      title: img.name, copyright: '', resolution: '',
      url: '', thumbSrc: img.thumbBase64 || convertFileSrc(img.path),
      fullSrc: convertFileSrc(img.path),
      isOnline: false, isLocal: true, isDownloaded: false,
      localPath: img.path, path: img.path, fileName: img.name,
    }))
  } else {
    displayList.value = localImages.value.map((img, idx) => ({
      id: `loc-${idx}-${img.name}`,
      title: img.name, copyright: '', resolution: '',
      url: '', thumbSrc: img.thumbBase64 || convertFileSrc(img.path),
      fullSrc: convertFileSrc(img.path),
      isOnline: false, isLocal: true, isDownloaded: false,
      localPath: img.path, path: img.path, fileName: img.name,
    }))
  }
}

// Rebuild only when the underlying source data actually changes
watch([activeSource, bingImages, wallhavenImages, downloadedImages, localImages, downloadedPathSet], rebuildDisplayList, { immediate: true })

const visibleImages = computed(() => displayList.value.slice(0, visibleCount.value))
const allImages = displayList // alias for template

const hasMore = computed(() => {
  if (visibleCount.value < displayList.value.length) return true
  if (activeSource.value === 'wallhaven' && wallhavenHasMore.value) return true
  return false
})

function bingThumbUrl(fullUrl) {
  if (fullUrl && fullUrl.includes('bing.com')) {
    const sep = fullUrl.includes('?') ? '&' : '?'
    return `${fullUrl}${sep}w=480&h=300`
  }
  return fullUrl
}

// --- IntersectionObserver (scroll-to-load) ---
let observer = null
let loadMoreLock = false

function setupObserver() {
  cleanupObserver()
  const el = sentinelRef.value
  if (!el) return
  observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) throttledLoadMore() },
    { root: scrollRef.value, rootMargin: '300px' },
  )
  observer.observe(el)
}

function cleanupObserver() {
  if (observer) { observer.disconnect(); observer = null }
}

let loadMoreTimer = null
function throttledLoadMore() {
  if (loadMoreTimer) return
  loadMoreTimer = setTimeout(() => { loadMoreTimer = null }, 300)
  loadMore()
}

async function loadMore() {
  if (loadMoreLock || loading.value) return
  loadMoreLock = true

  try {
    // Reveal more from buffer
    if (visibleCount.value < displayList.value.length) {
      visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, displayList.value.length)
      return
    }
    // Wallhaven: fetch next API page
    if (activeSource.value === 'wallhaven' && wallhavenHasMore.value) {
      wallhavenPage.value += 1
      loadingMore.value = true
      try {
        const imgs = await fetchWallhavenWallpapers('', wallhavenPage.value)
        if (!imgs.length) { wallhavenHasMore.value = false; return }
        wallhavenImages.value = [...wallhavenImages.value, ...imgs]
        // rebuildDisplayList runs via watch, then reveal next page
        await nextTick()
        visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, displayList.value.length)
      } catch (e) {
        ElMessage.error(e?.message || String(e))
      } finally {
        loadingMore.value = false
      }
    }
  } finally {
    loadMoreLock = false
  }
}

// --- Data loading ---
async function loadCurrentWallpaper() {
  try { currentWallpaper.value = await getCurrentWallpaper() }
  catch { currentWallpaper.value = '' }
}

async function initWallpaperDir() {
  const base = await appDataDir()
  wallpaperDir.value = await join(base, 'wallpapers')
}

async function refreshDownloadedPaths() {
  // Lightweight: readDir only, no thumbnail generation.
  // rebuildDisplayList uses convertFileSrc() for display.
  loading.value = true
  try {
    const { readDir } = await import('@tauri-apps/plugin-fs')
    let entries
    try {
      entries = await readDir(wallpaperDir.value)
    } catch {
      // Dir may not exist yet
      const { mkdir } = await import('@tauri-apps/plugin-fs')
      await mkdir(wallpaperDir.value, { recursive: true }).catch(() => {})
      entries = []
    }
    const IMAGE_EXTS = /\.(jpg|jpeg|png|bmp|webp|gif)$/i
    const images = []
    for (const entry of entries) {
      if (!entry.name || entry.isDirectory || !IMAGE_EXTS.test(entry.name)) continue
      const fullPath = await join(wallpaperDir.value, entry.name)
      images.push({ path: fullPath, name: entry.name, size: 0, thumbBase64: '' })
    }
    images.sort((a, b) => a.name.localeCompare(b.name))
    downloadedImages.value = images
    downloadedPathSet.value = new Set(images.map(e => e.name))
  } catch {
    downloadedImages.value = []
    downloadedPathSet.value = new Set()
  } finally {
    loading.value = false
  }
}

async function refreshDownloadedFileNames() {
  try {
    const { readDir } = await import('@tauri-apps/plugin-fs')
    const entries = await readDir(wallpaperDir.value)
    const names = new Set()
    for (const entry of entries) {
      if (entry.name && !entry.isDirectory) names.add(entry.name)
    }
    downloadedPathSet.value = names
  } catch {
    downloadedPathSet.value = new Set()
  }
}

function switchSource(key) { activeSource.value = key }

function resetVisible() {
  visibleCount.value = PAGE_SIZE
  if (scrollRef.value) scrollRef.value.scrollTop = 0
}

async function refreshCurrentSource() {
  resetVisible()
  if (activeSource.value === 'bing') await loadBing()
  else if (activeSource.value === 'wallhaven') await loadWallhaven(true)
}

async function loadBing() {
  loading.value = true
  try { bingImages.value = await fetchBingWallpapers(8) }
  catch (e) { ElMessage.error(e?.message || String(e)); bingImages.value = [] }
  finally { loading.value = false }
}

async function loadWallhaven(reset = false) {
  if (reset) { wallhavenPage.value = 1; wallhavenImages.value = []; wallhavenHasMore.value = true }
  loading.value = true
  try {
    const imgs = await fetchWallhavenWallpapers('', wallhavenPage.value)
    if (!imgs.length) wallhavenHasMore.value = false
    wallhavenImages.value = reset ? imgs : [...wallhavenImages.value, ...imgs]
  } catch (e) { ElMessage.error(e?.message || String(e)) }
  finally { loading.value = false }
}

async function selectFolder() {
  const dir = await open({ directory: true, title: t('wallpaper.selectFolder') })
  if (!dir) return
  localDir.value = dir
  localStorage.setItem(LAST_LOCAL_DIR_KEY, dir)
  resetVisible()
  await loadLocalImages()
}

async function loadLocalImages() {
  if (!localDir.value) return
  loading.value = true
  try { localImages.value = await scanImages(localDir.value) }
  catch (e) { ElMessage.error(e?.message || String(e)); localImages.value = [] }
  finally { loading.value = false }
}

async function downloadImage(img) {
  if (!img?.url || !img?.fileName) return
  const savePath = await join(wallpaperDir.value, img.fileName)
  downloadProgress[img.id] = 0
  try {
    await downloadWallpaper(img.url, savePath, (progress, total) => {
      downloadProgress[img.id] = total > 0 ? Math.round((progress / total) * 100) : 0
    })
    downloadProgress[img.id] = 100
    downloadedPathSet.value = new Set([...downloadedPathSet.value, img.fileName])
    ElMessage.success(t('wallpaper.downloadComplete'))
    if (activeSource.value === 'downloaded') await refreshDownloadedPaths()
  } catch (e) {
    ElMessage.error(`${t('wallpaper.downloadError')}: ${e?.message || String(e)}`)
  } finally {
    setTimeout(() => { delete downloadProgress[img.id] }, 800)
  }
}

async function applyWallpaper(img) {
  if (!img) return
  let applyPath = img.localPath || img.path
  if (img.isOnline && !applyPath) {
    const savePath = await join(wallpaperDir.value, img.fileName)
    applyingId.value = img.id
    try {
      downloadProgress[img.id] = 0
      await downloadWallpaper(img.url, savePath, (progress, total) => {
        downloadProgress[img.id] = total > 0 ? Math.round((progress / total) * 100) : 0
      })
      delete downloadProgress[img.id]
      applyPath = savePath
      downloadedPathSet.value = new Set([...downloadedPathSet.value, img.fileName])
    } catch (e) {
      delete downloadProgress[img.id]
      applyingId.value = ''
      ElMessage.error(`${t('wallpaper.downloadError')}: ${e?.message || String(e)}`)
      return
    }
  }
  applyingId.value = img.id
  try {
    const appliedPath = await setWallpaper(applyPath)
    currentWallpaper.value = appliedPath || applyPath
    ElMessage.success(t('wallpaper.setSuccess'))
  } catch (e) {
    ElMessage.error(e?.message || t('wallpaper.setFailed'))
  } finally { applyingId.value = '' }
}

function openPreview(img) { previewImg.value = img }

// --- Lifecycle ---
onMounted(async () => {
  await initWallpaperDir()
  loadCurrentWallpaper()
  refreshDownloadedFileNames()
  loadBing()

  const lastDir = localStorage.getItem(LAST_LOCAL_DIR_KEY)
  if (lastDir) localDir.value = lastDir

  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  cleanupObserver()
  clearTimeout(loadMoreTimer)
})

// Source switch: reset page, lazy-load data, re-attach observer
watch(activeSource, async (src) => {
  resetVisible()
  // Clear display immediately to avoid stale images flashing
  displayList.value = []

  if (src === 'wallhaven' && wallhavenImages.value.length === 0) {
    await loadWallhaven(true)
  } else if (src === 'downloaded') {
    await refreshDownloadedPaths()
  } else if (src === 'local' && localDir.value && localImages.value.length === 0) {
    await loadLocalImages()
  } else {
    // Data already in memory, just rebuild
    rebuildDisplayList()
  }

  await nextTick()
  setupObserver()
})

// Re-attach observer only when sentinel first appears (loading→done transition)
watch(loading, async (val) => {
  if (!val) {
    await nextTick()
    setupObserver()
  }
})</script>

<style scoped>
.wallpaper-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-secondary);
}

/* ===== Header ===== */
.wp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 44px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.wp-header-left { display: flex; align-items: center; }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); }

.wp-header-right { display: flex; align-items: center; }

.current-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent-blue-bg);
  font-size: 12px;
  color: var(--accent-blue);
  font-weight: 500;
  max-width: 260px;
}

.current-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-blue);
  flex-shrink: 0;
}

.current-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Toolbar ===== */
.wp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.source-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 2px;
}

.source-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.source-tab:hover {
  color: var(--text-primary);
  background: var(--bg-primary);
}

.source-tab.active {
  color: var(--accent-blue);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.source-count {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.toolbar-actions { display: flex; gap: 8px; }

/* ===== Content ===== */
.wp-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
}

.wp-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-tertiary);
}

.wp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  color: var(--text-quaternary);
  gap: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  background: var(--bg-primary);
}

.wp-empty p { font-size: 13px; color: var(--text-tertiary); }

/* ===== Grid ===== */
.wp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.wp-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16/10;
  background: var(--bg-tertiary, var(--bg-secondary));
  border: 2px solid transparent;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.wp-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.wp-card.is-current {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-bg);
}

.wp-card-img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

/* Badges */
.wp-badge {
  position: absolute;
  top: 8px; left: 8px; z-index: 2;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.wp-badge-current { color: #fff; background: rgba(64, 158, 255, 0.88); }
.wp-badge-downloaded { color: #fff; background: rgba(103, 194, 58, 0.88); }

/* Progress overlay */
.wp-progress-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 3;
  padding: 24px;
}

.wp-progress-overlay :deep(.el-progress) { width: 70%; }
.wp-progress-overlay :deep(.el-progress__text) { color: #fff; font-weight: 600; }
.wp-progress-overlay :deep(.el-progress-bar__outer) { background: rgba(255, 255, 255, 0.2); }

/* Hover overlay */
.wp-card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
  background: linear-gradient(transparent 40%, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}

.wp-card:hover .wp-card-overlay { opacity: 1; }

.wp-card-title {
  font-size: 12px; font-weight: 600; color: #fff;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.wp-card-meta { font-size: 10px; color: rgba(255, 255, 255, 0.7); margin-top: 2px; }

.wp-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.wp-card-actions :deep(.el-button) { backdrop-filter: blur(8px); }

/* Scroll sentinel */
.wp-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: var(--text-tertiary);
}

.wp-sentinel-hint { font-size: 12px; }

/* ===== Preview ===== */
.preview-dialog :deep(.el-dialog__body) { padding: 0; }

.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #000;
}

.preview-full {
  width: 100%; max-width: 100%; max-height: 60vh;
  object-fit: contain;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-primary);
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .wp-header {
    flex-direction: column;
    align-items: flex-start;
    height: auto;
    padding: 10px 16px;
    gap: 8px;
  }

  .wp-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 16px;
  }

  .source-tabs { flex-wrap: wrap; }

  .wp-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
}

@media (max-width: 600px) {
  .wp-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
