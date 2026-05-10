<template>
  <div class="img-cvt-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Media Tools</div>
          <div class="breadcrumb">
            <el-icon><Picture /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('imageConverter.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <el-switch v-model="batchMode" :active-text="t('imageConverter.batchMode')" size="small" />
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <el-button size="small" text class="toolbar-secondary-btn" @click="addFilesViaDialog" :title="t('imageConverter.addFiles')">
          <el-icon><FolderAdd /></el-icon>
        </el-button>
        <el-button size="small" text class="toolbar-icon-btn" @click="doClear" :disabled="sourceFiles.length === 0" :title="t('common.clear')">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="main-area">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 拖拽区 -->
        <div class="drop-zone" :class="{ 'drop-active': dragOver, 'has-file': sourceFiles.length > 0 }"
          @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop" @click="addFilesViaDialog">
          <template v-if="sourceFiles.length === 0">
            <el-icon class="drop-icon"><Upload /></el-icon>
            <p class="drop-text">{{ batchMode ? t('imageConverter.dropHintBatch') : t('imageConverter.dropHint') }}</p>
            <p class="drop-sub">{{ t('imageConverter.supportedFormats') }}</p>
          </template>
          <template v-else-if="!batchMode">
            <img v-if="beforePreview" :src="'data:image/png;base64,' + beforePreview" class="preview-thumb" />
            <p class="file-name">{{ sourceFiles[0]?.name }}</p>
            <p class="file-meta">{{ sourceFiles[0]?.width }}×{{ sourceFiles[0]?.height }} · {{ formatBytes(sourceFiles[0]?.size) }} · {{ sourceFiles[0]?.format?.toUpperCase() }}</p>
          </template>
          <template v-else>
            <el-icon class="drop-icon"><Files /></el-icon>
            <p class="drop-text">{{ sourceFiles.length }} {{ t('imageConverter.addFiles') }}</p>
          </template>
        </div>

        <!-- 批量模式文件列表 -->
        <div v-if="batchMode && sourceFiles.length > 0" class="file-list">
          <el-scrollbar max-height="120">
            <div v-for="(f, i) in sourceFiles" :key="f.path" class="file-item">
              <span class="file-item-name" :title="f.name">{{ f.name }}</span>
              <span class="file-item-size">{{ formatBytes(f.size) }}</span>
              <el-icon class="file-item-remove" @click.stop="sourceFiles.splice(i, 1)"><Close /></el-icon>
            </div>
          </el-scrollbar>
        </div>

        <!-- 设置 -->
        <div class="settings">
          <div class="setting-row">
            <span class="setting-label">{{ t('imageConverter.targetFormat') }}</span>
            <el-select v-model="targetFormat" size="small" class="fmt-select">
              <el-option v-for="f in formats" :key="f" :label="f.toUpperCase()" :value="f" />
            </el-select>
          </div>

          <div v-if="showQuality" class="setting-row">
            <span class="setting-label">{{ t('imageConverter.quality') }}</span>
            <el-slider v-model="quality" :min="1" :max="100" :show-tooltip="false" class="quality-slider" />
            <el-input-number v-model="quality" :min="1" :max="100" size="small" controls-position="right" class="quality-num" />
          </div>

          <div class="setting-row">
            <el-checkbox v-model="enableResize" :label="t('imageConverter.enableResize')" size="small" />
          </div>
          <div v-if="enableResize" class="setting-row resize-row">
            <el-input-number v-model="resizeWidth" :min="1" :max="9999" size="small" :placeholder="t('imageConverter.width')"
              controls-position="right" class="dim-input" @change="onWidthChange" />
            <el-button :type="aspectLocked ? 'primary' : 'default'" size="small" text class="lock-btn"
              @click="aspectLocked = !aspectLocked" :title="aspectLocked ? t('common.unlock') : t('common.lock')">
              <el-icon><Lock v-if="aspectLocked" /><Unlock v-else /></el-icon>
            </el-button>
            <el-input-number v-model="resizeHeight" :min="1" :max="9999" size="small" :placeholder="t('imageConverter.height')"
              controls-position="right" class="dim-input" @change="onHeightChange" />
          </div>

          <div v-if="targetFormat === 'ico'" class="setting-row ico-row">
            <span class="setting-label">{{ t('imageConverter.icoSizes') }}</span>
            <el-checkbox-group v-model="icoSizes" size="small">
              <el-checkbox v-for="s in [16, 32, 48, 64, 128, 256]" :key="s" :value="s" :label="s + 'px'" />
            </el-checkbox-group>
          </div>
        </div>

        <!-- EXIF -->
        <div v-if="!batchMode && exifData.length > 0" class="exif-section">
          <div class="section-card-title">{{ t('imageConverter.exifInfo') }}</div>
          <el-collapse class="exif-collapse">
            <el-collapse-item :title="t('imageConverter.exifInfo')" name="exif">
              <div class="exif-list">
                <div v-for="e in exifData" :key="e.tag" class="exif-row">
                  <span class="exif-tag">{{ e.tag }}</span>
                  <span class="exif-val">{{ e.value }}</span>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 操作 -->
        <div class="actions">
          <el-button type="primary" @click="doConvert" :loading="converting" :disabled="sourceFiles.length === 0" size="default">
            <el-icon style="margin-right: 6px;"><MagicStick /></el-icon>{{ batchMode ? t('imageConverter.convertAll') : t('imageConverter.convert') }}
          </el-button>
          <el-button v-if="convertedResult && !batchMode" @click="doSaveAs" size="default">
            <el-icon style="margin-right: 6px;"><Download /></el-icon>{{ t('imageConverter.saveAs') }}
          </el-button>
          <el-button v-if="batchMode && batchResults.length > 0" @click="doBatchSave" size="default">
            <el-icon style="margin-right: 6px;"><Files /></el-icon>{{ t('imageConverter.batchSave') }}
          </el-button>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 单文件预览 -->
        <template v-if="!batchMode">
          <div v-if="sourceFiles.length === 0" class="empty-preview">
            <el-icon class="empty-icon"><PictureFilled /></el-icon>
            <p>{{ t('imageConverter.noFile') }}</p>
          </div>
          <div v-else class="preview-area">
            <div class="preview-grid">
              <div class="preview-card">
                <div class="preview-label">{{ t('imageConverter.before') }}</div>
                <img v-if="beforePreview" :src="'data:image/png;base64,' + beforePreview" class="preview-img" />
                <div v-if="sourceFiles[0]" class="preview-meta">
                  {{ sourceFiles[0].format?.toUpperCase() }} · {{ sourceFiles[0].width }}×{{ sourceFiles[0].height }} · {{ formatBytes(sourceFiles[0].size) }}
                </div>
              </div>
              <div class="preview-card">
                <div class="preview-label">{{ t('imageConverter.after') }}</div>
                <img v-if="afterPreview" :src="'data:image/png;base64,' + afterPreview" class="preview-img" />
                <div v-else-if="!converting" class="preview-placeholder">{{ t('imageConverter.convert') }}</div>
                <div v-if="convertedResult" class="preview-meta">
                  {{ convertedResult.format?.toUpperCase() }} · {{ convertedResult.width }}×{{ convertedResult.height }} · {{ formatBytes(convertedResult.outputSize) }}
                </div>
              </div>
            </div>
            <!-- 大小对比 -->
            <div v-if="convertedResult && sourceFiles[0]" class="size-compare">
              <div class="size-bar-wrap">
                <div class="size-bar before-bar" :style="{ width: beforeBarWidth + '%' }"></div>
                <div class="size-bar after-bar" :style="{ width: afterBarWidth + '%' }"></div>
              </div>
              <div class="size-labels">
                <span>{{ t('imageConverter.originalSize') }}: {{ formatBytes(sourceFiles[0].size) }}</span>
                <span :class="sizeChangeClass">
                  {{ t('imageConverter.sizeChange') }}: {{ sizeChangeText }}
                </span>
                <span>{{ t('imageConverter.convertedSize') }}: {{ formatBytes(convertedResult.outputSize) }}</span>
              </div>
            </div>
          </div>
        </template>
        <!-- 批量结果表格 -->
        <template v-else>
          <el-table v-if="batchResults.length > 0" :data="batchResults" size="small" stripe class="batch-table">
            <el-table-column prop="name" :label="t('imageConverter.fileName')" min-width="180" show-overflow-tooltip />
            <el-table-column :label="t('imageConverter.originalSize')" width="100">
              <template #default="{ row }">{{ formatBytes(row.inputSize) }}</template>
            </el-table-column>
            <el-table-column :label="t('imageConverter.convertedSize')" width="100">
              <template #default="{ row }">{{ row.success ? formatBytes(row.outputSize) : '-' }}</template>
            </el-table-column>
            <el-table-column :label="t('imageConverter.sizeChange')" width="100">
              <template #default="{ row }">
                <span v-if="row.success" :class="row.outputSize < row.inputSize ? 'size-down' : 'size-up'">
                  {{ ((row.outputSize - row.inputSize) / row.inputSize * 100).toFixed(1) }}%
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column :label="'Status'" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.success" type="success" size="small">{{ t('imageConverter.done') }}</el-tag>
                <el-tag v-else type="danger" size="small">{{ t('imageConverter.error') }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="empty-preview">
            <el-icon class="empty-icon"><PictureFilled /></el-icon>
            <p>{{ t('imageConverter.dropHintBatch') }}</p>
          </div>
        </template>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span>{{ statusText || t('imageConverter.ready') }}</span>
      <span class="status-spacer"></span>
      <span v-if="sourceFiles.length">{{ sourceFiles.length }} file(s)</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, Upload, Delete, FolderAdd, Close, Files, PictureFilled, CopyDocument, Lock, Unlock, MagicStick, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { t } from '@/i18n'

const router = useRouter()

// ---- State ----
const batchMode = ref(false)
const dragOver = ref(false)
const converting = ref(false)
const statusText = ref('')

const sourceFiles = ref([]) // { path, name, size, width, height, format }
const beforePreview = ref('')
const afterPreview = ref('')
const convertedResult = ref(null) // ConvertResult
const exifData = ref([])
const batchResults = ref([]) // { name, inputSize, outputSize, success, error }

// Settings
const targetFormat = ref('png')
const quality = ref(85)
const enableResize = ref(false)
const resizeWidth = ref(0)
const resizeHeight = ref(0)
const aspectLocked = ref(true)
const icoSizes = ref([16, 32, 48, 64, 128, 256])

const formats = ['png', 'jpeg', 'webp', 'bmp', 'gif', 'ico']
const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'ico', 'tiff', 'tif']

const showQuality = computed(() => targetFormat.value === 'jpeg' || targetFormat.value === 'webp')

// Size comparison
const beforeBarWidth = computed(() => {
  if (!convertedResult.value || !sourceFiles.value[0]) return 50
  const max = Math.max(sourceFiles.value[0].size, convertedResult.value.outputSize)
  return max > 0 ? (sourceFiles.value[0].size / max) * 100 : 50
})
const afterBarWidth = computed(() => {
  if (!convertedResult.value || !sourceFiles.value[0]) return 50
  const max = Math.max(sourceFiles.value[0].size, convertedResult.value.outputSize)
  return max > 0 ? (convertedResult.value.outputSize / max) * 100 : 50
})
const sizeChangeText = computed(() => {
  if (!convertedResult.value || !sourceFiles.value[0]) return ''
  const diff = convertedResult.value.outputSize - sourceFiles.value[0].size
  const pct = ((diff / sourceFiles.value[0].size) * 100).toFixed(1)
  return diff <= 0 ? `${pct}%` : `+${pct}%`
})
const sizeChangeClass = computed(() => {
  if (!convertedResult.value || !sourceFiles.value[0]) return ''
  return convertedResult.value.outputSize <= sourceFiles.value[0].size ? 'size-down' : 'size-up'
})

// ---- Lifecycle ----
let unlistenDrop = null

onMounted(async () => {
  try {
    unlistenDrop = await getCurrentWindow().listen('tauri://drag-drop', (event) => {
      const paths = event.payload?.paths || []
      handleFilePaths(paths)
    })
  } catch {}
})

onBeforeUnmount(() => {
  if (unlistenDrop) unlistenDrop()
})

// ---- File handling ----
function isImagePath(path) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return imageExtensions.includes(ext)
}

async function handleFilePaths(paths) {
  dragOver.value = false
  const imgPaths = paths.filter(isImagePath)
  if (!imgPaths.length) return

  if (!batchMode.value) {
    // 单文件模式只取第一个
    await loadFile(imgPaths[0])
  } else {
    for (const p of imgPaths) {
      await loadFileInfo(p)
    }
  }
}

async function loadFile(path) {
  try {
    statusText.value = t('imageConverter.converting') + '...'
    const info = await invoke('image_get_info', { path })
    const name = path.split(/[/\\]/).pop() || 'unknown'
    sourceFiles.value = [{ path, name, size: info.fileSize, width: info.width, height: info.height, format: info.format }]
    exifData.value = info.exif || []
    resizeWidth.value = info.width
    resizeHeight.value = info.height
    convertedResult.value = null
    afterPreview.value = ''

    const preview = await invoke('image_preview', { path, maxSize: 400 })
    beforePreview.value = preview.base64
    statusText.value = t('imageConverter.ready')
  } catch (e) {
    ElMessage.error(String(e))
    statusText.value = ''
  }
}

async function loadFileInfo(path) {
  try {
    const info = await invoke('image_get_info', { path })
    const name = path.split(/[/\\]/).pop() || 'unknown'
    // 避免重复
    if (sourceFiles.value.some(f => f.path === path)) return
    sourceFiles.value.push({ path, name, size: info.fileSize, width: info.width, height: info.height, format: info.format })
  } catch {}
}

async function addFilesViaDialog() {
  try {
    const result = await dialogOpen({
      multiple: batchMode.value,
      filters: [{ name: 'Images', extensions: imageExtensions }],
    })
    if (!result) return
    const paths = Array.isArray(result) ? result : [result]
    await handleFilePaths(paths)
  } catch {}
}

function onDrop(e) {
  dragOver.value = false
  // Tauri drag-drop 事件会单独处理路径，HTML5 drop 作为备用
  const files = e.dataTransfer?.files
  if (files?.length) {
    // HTML5 drop 无法获取绝对路径，提示用户通过对话框添加
    ElMessage.info(t('imageConverter.selectFile'))
  }
}

// ---- Resize aspect ratio ----
function onWidthChange(val) {
  if (aspectLocked.value && sourceFiles.value[0]) {
    const ratio = sourceFiles.value[0].height / sourceFiles.value[0].width
    resizeHeight.value = Math.round(val * ratio) || 1
  }
}
function onHeightChange(val) {
  if (aspectLocked.value && sourceFiles.value[0]) {
    const ratio = sourceFiles.value[0].width / sourceFiles.value[0].height
    resizeWidth.value = Math.round(val * ratio) || 1
  }
}

// ---- Convert ----
async function doConvert() {
  if (sourceFiles.value.length === 0) return

  if (batchMode.value) {
    await doBatchConvert()
    return
  }

  converting.value = true
  statusText.value = t('imageConverter.converting')
  try {
    const src = sourceFiles.value[0]
    const ext = targetFormat.value === 'jpeg' ? 'jpg' : targetFormat.value
    const tempDir = await invoke('get_temp_dir')
    const outputPath = `${tempDir}/toolhub-convert-${Date.now()}.${ext}`

    const request = {
      inputPath: src.path,
      outputPath,
      targetFormat: targetFormat.value,
      quality: showQuality.value ? quality.value : null,
      resizeWidth: enableResize.value ? resizeWidth.value : null,
      resizeHeight: enableResize.value ? resizeHeight.value : null,
      icoSizes: targetFormat.value === 'ico' ? icoSizes.value : null,
    }

    const result = await invoke('image_convert', { request })
    convertedResult.value = result

    // 预览转换后（ICO 无法预览为 PNG，跳过）
    if (targetFormat.value !== 'ico') {
      const preview = await invoke('image_preview', { path: result.outputPath, maxSize: 400 })
      afterPreview.value = preview.base64
    } else {
      afterPreview.value = ''
    }

    statusText.value = t('imageConverter.convertSuccess')
    ElMessage.success(t('imageConverter.convertSuccess'))
  } catch (e) {
    statusText.value = t('imageConverter.convertFail')
    ElMessage.error(`${t('imageConverter.convertFail')}: ${e}`)
  } finally {
    converting.value = false
  }
}

async function doBatchConvert() {
  converting.value = true
  statusText.value = t('imageConverter.converting')
  batchResults.value = []

  try {
    const dirResult = await dialogOpen({ directory: true, multiple: false, title: t('imageConverter.selectOutputDir') })
    if (!dirResult) { converting.value = false; statusText.value = ''; return }

    const request = {
      inputPaths: sourceFiles.value.map(f => f.path),
      outputDir: dirResult,
      targetFormat: targetFormat.value,
      quality: showQuality.value ? quality.value : null,
      resizeWidth: enableResize.value ? resizeWidth.value : null,
      resizeHeight: enableResize.value ? resizeHeight.value : null,
      icoSizes: targetFormat.value === 'ico' ? icoSizes.value : null,
    }

    const results = await invoke('image_batch_convert', { request })
    batchResults.value = results.map((r, i) => ({
      name: sourceFiles.value[i]?.name || '',
      inputSize: sourceFiles.value[i]?.size || 0,
      outputSize: r.outputSize,
      success: r.success,
      error: r.error,
    }))

    const successCount = results.filter(r => r.success).length
    statusText.value = `${t('imageConverter.done')}: ${successCount}/${results.length}`
    ElMessage.success(`${t('imageConverter.convertSuccess')}: ${successCount}/${results.length}`)
  } catch (e) {
    statusText.value = t('imageConverter.convertFail')
    ElMessage.error(String(e))
  } finally {
    converting.value = false
  }
}

async function doSaveAs() {
  if (!convertedResult.value) return
  try {
    const ext = targetFormat.value === 'jpeg' ? 'jpg' : targetFormat.value
    const path = await dialogSave({
      defaultPath: `converted-${Date.now()}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!path) return

    const { copyFile } = await import('@tauri-apps/plugin-fs')
    await copyFile(convertedResult.value.outputPath, path)
    ElMessage.success(t('imageConverter.convertSuccess'))
  } catch (e) {
    ElMessage.error(String(e))
  }
}

async function doBatchSave() {
  // 批量模式已在 doBatchConvert 时直接保存到目录
  ElMessage.info(t('imageConverter.done'))
}

function doClear() {
  sourceFiles.value = []
  beforePreview.value = ''
  afterPreview.value = ''
  convertedResult.value = null
  exifData.value = []
  batchResults.value = []
  statusText.value = ''
}

// ---- Utils ----
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i]
}
</script>

<style scoped>
.img-cvt-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  min-height: 52px;
  box-sizing: border-box;
}
.header-left { display: flex; align-items: center; min-width: 0; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  flex-wrap: wrap;
  min-height: 44px;
  box-sizing: border-box;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.toolbar-secondary-btn:not(.is-disabled) {
  color: var(--text-primary);
}
.toolbar-icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
}
.toolbar-icon-btn:hover:not(.is-disabled) {
  color: var(--text-primary);
  background: rgba(60, 40, 20, 0.05);
  border-color: rgba(60, 40, 20, 0.1);
}
.toolbar :deep(.el-button) { --el-border-radius-base: 8px; }

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  gap: 0;
}
.left-panel {
  width: 260px;
  min-width: 260px;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px 18px;
  gap: 14px;
}
.right-panel {
  flex: 1;
  background: transparent;
  overflow-y: auto;
  padding: 14px 18px;
}

/* 拖拽区保留虚线作为上传交互提示 */
.drop-zone {
  border: 1px dashed rgba(60, 40, 20, 0.18);
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
}
.drop-zone:hover,
.drop-zone.drop-active { border-color: var(--accent-blue); background: rgba(238, 246, 255, 0.7); }
.drop-zone.has-file { border-style: solid; border-color: rgba(60, 40, 20, 0.12); }
.drop-icon { font-size: 36px; color: var(--text-quaternary); margin-bottom: 8px; }
.drop-text { font-size: 13px; color: var(--text-secondary); margin: 0; font-weight: 600; }
.drop-sub { font-size: 11px; color: var(--text-quaternary); margin: 4px 0 0; }
.preview-thumb { max-width: 200px; max-height: 100px; border-radius: 8px; margin-bottom: 8px; object-fit: contain; border: 1px solid rgba(60, 40, 20, 0.08); background: rgba(248, 244, 232, 0.5); }
.file-name {
  font-size: 13px;
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.file-meta { font-size: 11px; color: var(--text-tertiary); margin: 4px 0 0; }

/* 文件列表：分割线分隔条目，无外框 */
.file-list {
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.file-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 0; font-size: 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.file-item:last-child { border-bottom: none; }
.file-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }
.file-item-size { color: var(--text-tertiary); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.file-item-remove { cursor: pointer; color: var(--text-quaternary); flex-shrink: 0; }
.file-item-remove:hover { color: var(--accent-red, #f56c6c); }

/* 设置区：分行无卡片 */
.settings {
  display: flex;
  flex-direction: column;
  background: transparent;
}
.setting-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.setting-row:last-child { border-bottom: 0; }
.setting-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; min-width: 70px; font-weight: 600; }
.fmt-select { width: 120px; }
.quality-slider { flex: 1; }
.quality-num { width: 80px; }
.resize-row { flex-wrap: wrap; }
.dim-input { width: 100px; }
.lock-btn { min-width: 32px; padding: 4px; font-size: 14px; }
.ico-row { flex-wrap: wrap; }
.settings :deep(.el-input__wrapper),
.settings :deep(.el-select__wrapper),
.settings :deep(.el-input-number__wrapper) {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.settings :deep(.el-input__wrapper.is-focus),
.settings :deep(.el-select__wrapper.is-focused),
.settings :deep(.el-input-number__wrapper:focus-within) {
  box-shadow: inset 0 0 0 1px var(--accent-blue);
}
.settings :deep(.el-checkbox__label) {
  color: var(--text-secondary);
  font-weight: 500;
}
.settings :deep(.el-checkbox-group) {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 段落小标题：去除药丸样式 */
.section-card-title {
  display: block;
  padding: 8px 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  margin-bottom: 8px;
}

/* EXIF 区：去除卡片，分行展示 */
.exif-section {
  font-size: 12px;
  background: transparent;
}
.exif-collapse :deep(.el-collapse) {
  border-top: none;
  border-bottom: none;
  background: transparent;
}
.exif-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 32px;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.exif-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: none;
}
.exif-collapse :deep(.el-collapse-item__content) {
  padding: 8px 0 0;
}
.exif-list {
  display: flex;
  flex-direction: column;
}
.exif-row {
  display: flex;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  background: transparent;
}
.exif-row:last-child { border-bottom: 0; }
.exif-tag { font-weight: 600; color: var(--text-secondary); min-width: 140px; }
.exif-val { color: var(--text-tertiary); word-break: break-all; }
.actions { display: flex; gap: 8px; padding-top: 8px; flex-wrap: wrap; }
.actions :deep(.el-button) { --el-border-radius-base: 8px; }

/* 空状态：保留虚线提示 */
.empty-preview {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; min-height: 240px;
  color: var(--text-tertiary);
  border: 1px dashed rgba(60, 40, 20, 0.14);
  border-radius: 10px;
  background: transparent;
  padding: 24px;
  gap: 10px;
}
.empty-icon { font-size: 60px; margin-bottom: 4px; }
.empty-preview p {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 预览区：去除每个卡片，左右两列用分割线 */
.preview-area { display: flex; flex-direction: column; gap: 16px; }
.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.preview-card {
  padding: 14px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 200px;
  background: transparent;
}
.preview-card:first-child {
  border-right: 1px solid rgba(60, 40, 20, 0.08);
}
.preview-label {
  display: block;
  padding-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  width: 100%;
  text-align: center;
}
.preview-img { max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 8px; border: 1px solid rgba(60, 40, 20, 0.08); background: rgba(255,255,255,0.5); }
.preview-meta { font-size: 11px; color: var(--text-tertiary); line-height: 1.5; }
.preview-placeholder {
  color: var(--text-quaternary);
  font-size: 13px;
  margin: auto;
}

/* 体积对比：去除卡片，仅留进度条与文字 */
.size-compare {
  padding: 12px 0;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
}
.size-bar-wrap { display: flex; gap: 4px; height: 8px; border-radius: 4px; overflow: hidden; background: rgba(60, 40, 20, 0.06); margin-bottom: 8px; }
.size-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
.before-bar { background: var(--accent-blue); }
.after-bar { background: #67c23a; }
.size-labels {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}
.size-down { color: #67c23a; font-weight: 600; }
.size-up { color: #f56c6c; font-weight: 600; }

/* 批量表格：去除外框卡片，让 el-table 自身样式生效 */
.batch-table {
  width: 100%;
  background: transparent;
}
.batch-table :deep(.el-table) {
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
}
.batch-table :deep(.el-table th.el-table__cell) {
  background: rgba(60, 40, 20, 0.04);
  color: var(--text-secondary);
  font-weight: 700;
}

.status-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 0 18px;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 11.5px; color: var(--text-tertiary);
  height: 30px; box-sizing: border-box;
}
.status-spacer { flex: 1; }

@media (max-width: 1100px) {
  .main-area {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  }

  .preview-grid {
    grid-template-columns: 1fr;
  }
  .preview-card:first-child {
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  }
}
</style>
