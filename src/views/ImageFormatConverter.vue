<template>
  <div class="img-cvt-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Picture /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('imageConverter.title') }}</span>
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
        <el-button size="small" text @click="addFilesViaDialog">
          <el-icon><FolderAdd /></el-icon> {{ t('imageConverter.addFiles') }}
        </el-button>
        <el-button size="small" text @click="doClear" :disabled="sourceFiles.length === 0">
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
              @click="aspectLocked = !aspectLocked">
              {{ aspectLocked ? '🔗' : '🔓' }}
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
          <el-collapse>
            <el-collapse-item :title="t('imageConverter.exifInfo')" name="exif">
              <div v-for="e in exifData" :key="e.tag" class="exif-row">
                <span class="exif-tag">{{ e.tag }}</span>
                <span class="exif-val">{{ e.value }}</span>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 操作 -->
        <div class="actions">
          <el-button type="primary" @click="doConvert" :loading="converting" :disabled="sourceFiles.length === 0" size="default">
            {{ batchMode ? t('imageConverter.convertAll') : t('imageConverter.convert') }}
          </el-button>
          <el-button v-if="convertedResult && !batchMode" @click="doSaveAs" size="default">
            {{ t('imageConverter.saveAs') }}
          </el-button>
          <el-button v-if="batchMode && batchResults.length > 0" @click="doBatchSave" size="default">
            {{ t('imageConverter.batchSave') }}
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
import { Picture, Upload, Delete, FolderAdd, Close, Files, PictureFilled, CopyDocument } from '@element-plus/icons-vue'
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
  background-color: var(--bg-secondary);
}

/* Header */
.header {
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 46px;
  box-sizing: border-box;
}
.header-left { display: flex; align-items: center; }
.breadcrumb {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 16px; color: var(--text-secondary); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}
.toolbar-group { display: flex; align-items: center; gap: 8px; }
.toolbar-spacer { flex: 1; }

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 380px;
  min-width: 380px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 12px;
}

.right-panel {
  flex: 1;
  background: var(--bg-primary);
  overflow-y: auto;
  padding: 16px;
}

/* Drop zone */
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-zone:hover, .drop-zone.drop-active {
  border-color: var(--accent-blue);
  background: rgba(64, 158, 255, 0.04);
}
.drop-zone.has-file { border-style: solid; border-color: var(--border-color); }
.drop-icon { font-size: 36px; color: var(--text-quaternary); margin-bottom: 8px; }
.drop-text { font-size: 13px; color: var(--text-secondary); margin: 0; }
.drop-sub { font-size: 11px; color: var(--text-quaternary); margin: 4px 0 0; }
.preview-thumb { max-width: 200px; max-height: 100px; border-radius: 4px; margin-bottom: 8px; object-fit: contain; }
.file-name { font-size: 13px; color: var(--text-primary); margin: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.file-meta { font-size: 11px; color: var(--text-tertiary); margin: 4px 0 0; }

/* File list (batch) */
.file-list { border: 1px solid var(--border-color); border-radius: 6px; }
.file-item {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 10px; font-size: 12px;
  border-bottom: 1px solid var(--border-lighter, var(--border-color));
}
.file-item:last-child { border-bottom: none; }
.file-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.file-item-size { color: var(--text-tertiary); flex-shrink: 0; }
.file-item-remove { cursor: pointer; color: var(--text-quaternary); flex-shrink: 0; }
.file-item-remove:hover { color: var(--accent-red, #f56c6c); }

/* Settings */
.settings { display: flex; flex-direction: column; gap: 10px; }
.setting-row { display: flex; align-items: center; gap: 8px; }
.setting-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; min-width: 70px; }
.fmt-select { width: 120px; }
.quality-slider { flex: 1; }
.quality-num { width: 80px; }
.resize-row { flex-wrap: wrap; }
.dim-input { width: 100px; }
.lock-btn { min-width: 32px; padding: 4px; font-size: 14px; }
.ico-row { flex-wrap: wrap; }

/* EXIF */
.exif-section { font-size: 12px; }
.exif-row { display: flex; gap: 8px; padding: 2px 0; border-bottom: 1px solid var(--border-color); }
.exif-tag { font-weight: 600; color: var(--text-secondary); min-width: 140px; }
.exif-val { color: var(--text-tertiary); word-break: break-all; }

/* Actions */
.actions { display: flex; gap: 8px; padding-top: 4px; }

/* Preview area */
.empty-preview {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: var(--text-quaternary);
}
.empty-icon { font-size: 64px; margin-bottom: 16px; }

.preview-area { display: flex; flex-direction: column; gap: 16px; }
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.preview-card {
  border: 1px solid var(--border-color); border-radius: 8px;
  padding: 12px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  min-height: 200px;
}
.preview-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.preview-img { max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 4px; }
.preview-meta { font-size: 11px; color: var(--text-tertiary); }
.preview-placeholder { color: var(--text-quaternary); font-size: 13px; margin: auto; }

/* Size comparison */
.size-compare { border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; }
.size-bar-wrap { display: flex; gap: 4px; height: 8px; border-radius: 4px; overflow: hidden; background: var(--bg-tertiary); margin-bottom: 8px; }
.size-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
.before-bar { background: var(--accent-blue); }
.after-bar { background: #67c23a; }
.size-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); }
.size-down { color: #67c23a; font-weight: 600; }
.size-up { color: #f56c6c; font-weight: 600; }

/* Batch table */
.batch-table { width: 100%; }

/* Status bar */
.status-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  font-size: 11.5px; color: var(--text-tertiary);
  height: 28px; box-sizing: border-box;
}
.status-spacer { flex: 1; }
</style>
