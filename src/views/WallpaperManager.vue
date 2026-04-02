<template>
  <div class="wallpaper-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Picture /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('wallpaper.title') }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="current-card">
          <span class="current-label">{{ t('wallpaper.current') }}</span>
          <el-tooltip :content="currentWallpaper || t('wallpaper.unknown')" placement="bottom">
            <span class="current-path">{{ currentWallpaperName }}</span>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="wp-tabs">
      <!-- 本地壁纸 -->
      <el-tab-pane :label="t('wallpaper.local')" name="local">
        <div class="toolbar">
          <div class="toolbar-meta">
            <div class="toolbar-title">{{ t('wallpaper.local') }}</div>
            <div class="toolbar-desc">{{ t('wallpaper.localSectionDesc') }}</div>
          </div>
          <el-button size="small" type="primary" @click="selectFolder">
            <el-icon><FolderOpened /></el-icon>
            {{ t('wallpaper.selectFolder') }}
          </el-button>
          <span class="folder-path" v-if="localDir">{{ localDir }}</span>
          <div class="toolbar-spacer" />
          <span class="count" v-if="localImages.length">{{ localImages.length }} {{ t('wallpaper.images') }}</span>
        </div>

        <div class="grid-area" v-loading="localLoading">
          <div v-if="!localDir && !localLoading" class="empty-hint">
            <el-icon :size="48"><FolderOpened /></el-icon>
            <p>{{ t('wallpaper.selectFolderHint') }}</p>
          </div>
          <div v-else-if="localImages.length === 0 && !localLoading" class="empty-hint">
            <el-icon :size="48"><PictureFilled /></el-icon>
            <p>{{ t('wallpaper.noImages') }}</p>
          </div>
          <div v-else class="image-grid">
            <div
              v-for="img in localImages"
              :key="img.path"
              class="image-card"
              :class="{ active: isCurrentWallpaper(img.path) }"
              @click="previewImage = img"
            >
              <img :src="img.thumbBase64" :alt="img.name" class="thumb" loading="lazy" />
              <div class="card-badge" v-if="isCurrentWallpaper(img.path)">{{ t('wallpaper.currentApplied') }}</div>
              <div class="card-overlay">
                <span class="card-name">{{ img.name }}</span>
                <el-button
                  size="small"
                  type="primary"
                  circle
                  @click.stop="applyWallpaper(img.path)"
                  :loading="applyingPath === img.path"
                >
                  <el-icon><Check /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 在线壁纸 (Bing) -->
      <el-tab-pane :label="t('wallpaper.online')" name="online">
        <div class="toolbar">
          <div class="toolbar-meta">
            <div class="toolbar-title">{{ t('wallpaper.online') }}</div>
            <div class="toolbar-desc">{{ t('wallpaper.onlineSectionDesc') }}</div>
          </div>
          <el-button size="small" type="primary" @click="loadBingWallpapers" :loading="bingLoading">
            <el-icon><Refresh /></el-icon>
            {{ t('wallpaper.refresh') }}
          </el-button>
          <div class="toolbar-spacer" />
          <span class="bing-label">Bing {{ t('wallpaper.dailyWallpaper') }}</span>
        </div>

        <div class="grid-area" v-loading="bingLoading">
          <div v-if="bingImages.length === 0 && !bingLoading" class="empty-hint">
            <el-icon :size="48"><Cloudy /></el-icon>
            <p>{{ t('wallpaper.clickRefresh') }}</p>
          </div>
          <div v-else class="image-grid online-grid">
            <div
              v-for="img in bingImages"
              :key="img.date"
              class="image-card bing-card"
              @click="previewBing = img"
            >
              <img :src="img.url" :alt="img.title" class="thumb" loading="lazy" />
              <div class="card-overlay">
                <span class="card-name">{{ img.title }}</span>
                <el-button
                  size="small"
                  type="primary"
                  circle
                  @click.stop="downloadAndApply(img)"
                  :loading="downloadingUrl === img.url"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 本地图片预览弹窗 -->
    <el-dialog
      v-model="showLocalPreview"
      :title="previewImage?.name"
      width="80%"
      destroy-on-close
      class="preview-dialog"
    >
      <div class="preview-body" v-if="previewImage">
        <img :src="localPreviewSrc" class="preview-full" />
        <div class="preview-info">
          <span>{{ previewImage.name }}</span>
          <span>{{ formatSize(previewImage.size) }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showLocalPreview = false">{{ t('wallpaper.close') }}</el-button>
        <el-button type="primary" @click="applyFromPreview" :loading="applyingPath === previewImage?.path">
          {{ t('wallpaper.setAsWallpaper') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Bing 预览弹窗 -->
    <el-dialog
      v-model="showBingPreview"
      :title="previewBing?.title"
      width="80%"
      destroy-on-close
      class="preview-dialog"
    >
      <div class="preview-body" v-if="previewBing">
        <img :src="previewBing.url" class="preview-full" />
        <div class="preview-info">
          <span>{{ previewBing.copyright }}</span>
          <span>{{ previewBing.date }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBingPreview = false">{{ t('wallpaper.close') }}</el-button>
        <el-button type="primary" @click="downloadAndApplyFromPreview" :loading="downloadingUrl === previewBing?.url">
          <el-icon><Download /></el-icon>
          {{ t('wallpaper.downloadAndSet') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Picture, FolderOpened, PictureFilled, Check, Refresh, Download, Cloudy } from '@element-plus/icons-vue'
import { open } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'
import {
  getCurrentWallpaper,
  setWallpaper,
  scanImages,
  fetchBingWallpapers,
  downloadAndSetWallpaper,
} from '@/utils/wallpaperManager'
import { t } from '@/i18n'

const router = useRouter()
const LAST_LOCAL_DIR_KEY = 'wallpaper_manager_last_local_dir'

// --- 状态 ---
const activeTab = ref('local')
const currentWallpaper = ref('')

// 本地
const localDir = ref('')
const localImages = ref([])
const localLoading = ref(false)
const applyingPath = ref('')

// 在线
const bingImages = ref([])
const bingLoading = ref(false)
const downloadingUrl = ref('')

// 预览
const previewImage = ref(null)
const previewBing = ref(null)

const showLocalPreview = computed({
  get: () => !!previewImage.value,
  set: (v) => { if (!v) previewImage.value = null },
})
const showBingPreview = computed({
  get: () => !!previewBing.value,
  set: (v) => { if (!v) previewBing.value = null },
})

const localPreviewSrc = computed(() => {
  if (!previewImage.value) return ''
  return previewImage.value.path ? convertFileSrc(previewImage.value.path) : previewImage.value.thumbBase64
})

const normalizePath = (value) => (value || '').replace(/\\/g, '/').toLowerCase()

const currentWallpaperName = computed(() => {
  if (!currentWallpaper.value) return t('wallpaper.unknown')
  const parts = currentWallpaper.value.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || t('wallpaper.unknown')
})

const isCurrentWallpaper = (path) => normalizePath(currentWallpaper.value) === normalizePath(path)

// --- 方法 ---
const loadCurrentWallpaper = async () => {
  try {
    currentWallpaper.value = await getCurrentWallpaper()
  } catch {
    currentWallpaper.value = ''
  }
}

const syncWallpaperState = async (expectedPath = '') => {
  const actualPath = await getCurrentWallpaper()
  currentWallpaper.value = actualPath || ''
  return !expectedPath || normalizePath(actualPath) === normalizePath(expectedPath)
}

const toErrorMessage = (error) => error?.message || String(error)

const ensureWallpaperApplied = async (expectedPath, failMessage) => {
  const applied = await syncWallpaperState(expectedPath)
  if (!applied) {
    throw new Error(failMessage)
  }
}

const selectFolder = async () => {
  const dir = await open({ directory: true, title: t('wallpaper.selectFolder') })
  if (!dir) return
  localDir.value = dir
  localStorage.setItem(LAST_LOCAL_DIR_KEY, dir)
  await loadLocalImages()
}

const loadLocalImages = async () => {
  if (!localDir.value) return
  localLoading.value = true
  try {
    localImages.value = await scanImages(localDir.value)
  } catch (e) {
    ElMessage.error(toErrorMessage(e))
    localImages.value = []
  } finally {
    localLoading.value = false
  }
}

const applyWallpaper = async (path) => {
  applyingPath.value = path
  try {
    const appliedPath = await setWallpaper(path)
    await ensureWallpaperApplied(appliedPath || path, t('wallpaper.setFailed'))
    ElMessage.success(t('wallpaper.setSuccess'))
  } catch (e) {
    ElMessage.error(toErrorMessage(e))
  } finally {
    applyingPath.value = ''
  }
}

const applyFromPreview = () => {
  if (previewImage.value) applyWallpaper(previewImage.value.path)
}

const loadBingWallpapers = async () => {
  bingLoading.value = true
  try {
    bingImages.value = await fetchBingWallpapers(8)
  } catch (e) {
    ElMessage.error(toErrorMessage(e))
    bingImages.value = []
  } finally {
    bingLoading.value = false
  }
}

const downloadAndApply = async (img) => {
  downloadingUrl.value = img.url
  try {
    const saveDir = (await appDataDir()) + '/wallpapers'
    const appliedPath = await downloadAndSetWallpaper(img.url, saveDir)
    await ensureWallpaperApplied(appliedPath, t('wallpaper.downloadFailed'))
    ElMessage.success(t('wallpaper.downloadSuccess'))
  } catch (e) {
    ElMessage.error(toErrorMessage(e))
  } finally {
    downloadingUrl.value = ''
  }
}

const downloadAndApplyFromPreview = () => {
  if (previewBing.value) downloadAndApply(previewBing.value)
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// --- 初始化 ---
onMounted(async () => {
  await loadCurrentWallpaper()
  const lastLocalDir = localStorage.getItem(LAST_LOCAL_DIR_KEY)
  if (lastLocalDir) {
    localDir.value = lastLocalDir
    await loadLocalImages()
  }
})

// 切到在线 tab 时自动加载
watch(activeTab, (tab) => {
  if (tab === 'online' && bingImages.value.length === 0) {
    loadBingWallpapers()
  }
})
</script>

<style scoped>
.wallpaper-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.breadcrumb-link {
  cursor: pointer;
  color: var(--el-color-primary);
}
.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--el-text-color-placeholder);
}

.header-right {
  display: flex;
  align-items: center;
}

.current-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
  max-width: 320px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.current-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.current-path {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
}

.toolbar-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.toolbar-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
}

.current-label,
.count,
.bing-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.folder-path {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
}

.grid-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 20px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  color: var(--el-text-color-placeholder);
  gap: 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 16px;
  background: var(--el-fill-color-lighter);
}

.image-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16/10;
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.image-card:hover {
  transform: translateY(-2px);
  border-color: var(--el-border-color);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.image-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.card-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(64, 158, 255, 0.92);
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.28);
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-name {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 44px);
}

.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--el-bg-color-page);
}

.preview-full {
  width: 100%;
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  background: #000;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 14px 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .current-card {
    min-width: 0;
    width: 100%;
    max-width: none;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar-spacer {
    display: none;
  }
}

.wp-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 20px;
}

.wp-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.wp-tabs :deep(.el-tab-pane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar-spacer {
  flex: 1;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-card:hover .card-overlay {
  opacity: 1;
}

/* 预览弹窗 */
.preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}
</style>
