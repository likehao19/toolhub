<template>
  <div class="img-b64-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Picture /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('imageToBase64.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <el-select v-model="outputFormat" size="small" class="format-select">
          <el-option :label="t('imageToBase64.dataUri')" value="dataUri" />
          <el-option :label="t('imageToBase64.rawBase64')" value="raw" />
        </el-select>
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <el-button size="small" text class="toolbar-icon-btn" @click="doCopy" :disabled="!base64Output">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button size="small" text class="toolbar-icon-btn" @click="doClear" :disabled="!base64Output">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="main-area">
      <!-- 左侧：输入区 -->
      <div class="input-panel">
        <!-- 拖拽区 -->
        <div
          class="drop-zone"
          :class="{ dragging: isDragging, 'has-preview': !!previewSrc }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
          @click="triggerFileInput"
        >
          <template v-if="previewSrc">
            <img :src="previewSrc" class="preview-img" />
            <button
              type="button"
              class="preview-clear-btn"
              :title="t('common.delete')"
              @click.stop="doClear"
            >
              <el-icon><Close /></el-icon>
            </button>
          </template>
          <template v-else>
            <el-icon class="drop-icon"><UploadFilled /></el-icon>
            <div class="drop-text">{{ t('imageToBase64.dropHint') }}</div>
            <div class="drop-formats">{{ t('imageToBase64.supportedFormats') }}</div>
          </template>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          :accept="ACCEPT_TYPES"
          class="hidden-input"
          @change="onFileSelect"
        />

        <!-- URL 输入 -->
        <div class="url-row">
          <el-input
            v-model="imageUrl"
            size="small"
            :placeholder="t('imageToBase64.urlPlaceholder')"
            clearable
            @keyup.enter="convertUrl"
          />
          <el-button size="small" type="primary" @click="convertUrl" :loading="urlLoading" :disabled="!imageUrl.trim()">
            <el-icon style="margin-right: 6px;"><MagicStick /></el-icon>{{ t('imageToBase64.convert') }}
          </el-button>
        </div>

        <!-- 文件信息 -->
        <div class="file-info" v-if="fileInfo.name">
          <div class="info-row">
            <span class="info-label">{{ t('imageToBase64.fileName') }}</span>
            <span class="info-value">{{ fileInfo.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('imageToBase64.fileSize') }}</span>
            <span class="info-value">{{ fileInfo.size }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('imageToBase64.mimeType') }}</span>
            <span class="info-value">{{ fileInfo.mime }}</span>
          </div>
          <div class="info-row" v-if="fileInfo.dimensions">
            <span class="info-label">{{ t('imageToBase64.dimensions') }}</span>
            <span class="info-value">{{ fileInfo.dimensions }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区 -->
      <div class="output-panel">
        <div class="output-header">
          <span class="output-title">Base64</span>
          <span class="output-meta" v-if="base64Output">{{ base64Output.length.toLocaleString() }} chars</span>
          <span class="output-meta" v-else>{{ t('imageToBase64.outputPlaceholder') }}</span>
        </div>
        <div class="output-body" :class="{ 'is-empty': !base64Output }">
          <textarea
            class="b64-output"
            :value="base64Output"
            readonly
            :placeholder="t('imageToBase64.outputPlaceholder')"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span>{{ statusText }}</span>
      <span class="status-spacer"></span>
      <span v-if="base64Output">{{ t('imageToBase64.base64Length') }}: {{ base64Output.length.toLocaleString() }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, CopyDocument, Delete, UploadFilled, Close, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'

const router = useRouter()

const ACCEPT_TYPES = 'image/png,image/jpeg,image/gif,image/bmp,image/webp,image/svg+xml,image/x-icon,image/tiff,image/avif'

// ---- state ----
const outputFormat = ref('dataUri')
const isDragging = ref(false)
const imageUrl = ref('')
const urlLoading = ref(false)
const fileInputRef = ref(null)
const previewSrc = ref('')
const dataUri = ref('')
const rawBase64 = ref('')
const statusText = ref('')

const fileInfo = reactive({
  name: '',
  size: '',
  mime: '',
  dimensions: ''
})

// ---- computed ----
const base64Output = computed(() => {
  if (!dataUri.value) return ''
  return outputFormat.value === 'dataUri' ? dataUri.value : rawBase64.value
})

// ---- helpers ----
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const getImageDimensions = (src) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(`${img.width} × ${img.height}`)
    img.onerror = () => resolve('')
    img.src = src
  })
}

const resetState = () => {
  previewSrc.value = ''
  dataUri.value = ''
  rawBase64.value = ''
  fileInfo.name = ''
  fileInfo.size = ''
  fileInfo.mime = ''
  fileInfo.dimensions = ''
  statusText.value = t('imageToBase64.ready')
}

const processFile = async (file) => {
  if (!file || !file.type.startsWith('image/')) {
    ElMessage.warning(t('imageToBase64.invalidFile'))
    return
  }
  statusText.value = t('imageToBase64.converting')

  const reader = new FileReader()
  reader.onload = async (e) => {
    dataUri.value = e.target.result
    rawBase64.value = dataUri.value.split(',')[1] || ''
    previewSrc.value = dataUri.value

    fileInfo.name = file.name
    fileInfo.size = formatSize(file.size)
    fileInfo.mime = file.type
    fileInfo.dimensions = await getImageDimensions(dataUri.value)

    statusText.value = t('imageToBase64.convertSuccess')
  }
  reader.onerror = () => {
    ElMessage.error(t('imageToBase64.convertFail'))
    statusText.value = t('imageToBase64.convertFail')
  }
  reader.readAsDataURL(file)
}

// ---- handlers ----
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) processFile(file)
  e.target.value = ''
}

const onDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

const convertUrl = async () => {
  const url = imageUrl.value.trim()
  if (!url) return

  urlLoading.value = true
  statusText.value = t('imageToBase64.converting')

  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()

    if (!blob.type.startsWith('image/')) {
      ElMessage.warning(t('imageToBase64.invalidFile'))
      statusText.value = t('imageToBase64.ready')
      urlLoading.value = false
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      dataUri.value = e.target.result
      rawBase64.value = dataUri.value.split(',')[1] || ''
      previewSrc.value = dataUri.value

      const fileName = url.split('/').pop()?.split('?')[0] || 'image'
      fileInfo.name = fileName
      fileInfo.size = formatSize(blob.size)
      fileInfo.mime = blob.type
      fileInfo.dimensions = await getImageDimensions(dataUri.value)

      statusText.value = t('imageToBase64.convertSuccess')
      urlLoading.value = false
    }
    reader.onerror = () => {
      ElMessage.error(t('imageToBase64.convertFail'))
      statusText.value = t('imageToBase64.convertFail')
      urlLoading.value = false
    }
    reader.readAsDataURL(blob)
  } catch {
    ElMessage.error(t('imageToBase64.urlFetchError'))
    statusText.value = t('imageToBase64.urlFetchError')
    urlLoading.value = false
  }
}

const doCopy = async () => {
  if (!base64Output.value) return
  try {
    await navigator.clipboard.writeText(base64Output.value)
    ElMessage.success(t('imageToBase64.copied'))
  } catch {
    ElMessage.error(t('imageToBase64.copyFail'))
  }
}

const doClear = () => {
  resetState()
  imageUrl.value = ''
}

// init
statusText.value = t('imageToBase64.ready')
</script>

<style scoped>
.img-b64-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ============ Header（对齐 ImageFormatConverter） ============ */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: var(--surface-panel);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  min-height: 52px;
  box-sizing: border-box;
  flex-shrink: 0;
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

/* ============ Toolbar：扫平风（去卡片） ============ */
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
  flex-shrink: 0;
}
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.format-select { width: 130px; }
.toolbar :deep(.el-button) { --el-border-radius-base: 8px; }
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

/* ============ 主体：左右 panel 扫平拼接 ============ */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  gap: 0;
}
.input-panel {
  flex: 0 0 280px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 18px;
  overflow-y: auto;
  background: transparent;
  border-right: 1px solid rgba(60, 40, 20, 0.08);
}
.output-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}
.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
}
.output-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.output-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.output-body {
  flex: 1;
  min-height: 0;
  padding: 14px 18px;
  display: flex;
}

/* ============ Drop Zone：扫平、文字防溢出 ============ */
.drop-zone {
  position: relative;
  border: 1px dashed rgba(60, 40, 20, 0.18);
  border-radius: 10px;
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: padding 0.2s ease, min-height 0.2s ease,
              background 0.2s ease, border-color 0.15s ease;
  min-height: 140px;
  background: var(--surface-muted);
  /* 关键：防止内部文字撑破容器 */
  min-width: 0;
  overflow: hidden;
  text-align: center;
}
.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--accent-blue);
  background: rgba(238, 246, 255, 0.7);
}
.drop-zone.has-preview {
  border-style: solid;
  border-color: rgba(60, 40, 20, 0.12);
  padding: 12px;
  min-height: 140px;
  background: var(--surface-panel-soft);
}
.drop-icon {
  font-size: 36px;
  color: var(--text-quaternary);
  margin-bottom: 8px;
}
.drop-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 4px;
  font-weight: 600;
  /* 中文长串无空格也能在窄面板内换行 */
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.4;
  max-width: 100%;
}
.drop-formats {
  font-size: 11px;
  color: var(--text-quaternary);
  text-align: center;
  line-height: 1.5;
  /* 长格式列表也能换行 */
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
}
.preview-img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(248, 244, 232, 0.6);
  border: 1px solid rgba(60, 40, 20, 0.06);
}
/* 浮层清除按钮 */
.preview-clear-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(60, 40, 20, 0.12);
  background: var(--surface-panel);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(60, 40, 20, 0.08);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.15s, transform 0.15s, color 0.15s, background 0.15s;
}
.drop-zone:hover .preview-clear-btn,
.preview-clear-btn:focus-visible {
  opacity: 1;
  transform: translateY(0);
}
.preview-clear-btn:hover {
  color: var(--el-color-danger);
  background: var(--el-bg-color-overlay);
  border-color: rgba(245, 108, 108, 0.4);
}
.hidden-input { display: none; }

/* ============ URL Row ============ */
.url-row { display: flex; gap: 8px; min-width: 0; }
.url-row :deep(.el-input) { min-width: 0; }
.url-row :deep(.el-input__wrapper) {
  border-radius: 8px;
  background: var(--surface-panel-soft);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.url-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px var(--accent-blue);
}

/* ============ File Info：扫平分行 ============ */
.file-info {
  display: flex;
  flex-direction: column;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  padding: 4px 0;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-size: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  min-width: 0;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  color: var(--text-tertiary);
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}
.info-value {
  color: var(--text-primary);
  font-family: var(--font-mono, 'Consolas', monospace);
  word-break: break-all;
  overflow-wrap: anywhere;
  text-align: right;
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
}

/* ============ Base64 输出 textarea ============ */
.b64-output {
  flex: 1;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(60, 40, 20, 0.1);
  outline: none;
  resize: none;
  font-size: 12px;
  font-family: var(--font-mono, 'Consolas', monospace);
  line-height: 1.65;
  color: var(--text-primary);
  background: var(--surface-panel-soft);
  border-radius: 8px;
  word-break: break-all;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.b64-output:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.08);
}
.b64-output::placeholder { color: var(--text-quaternary); }

/* ============ 状态栏：扫平 ============ */
.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 11.5px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.status-spacer { flex: 1; }

/* ============ Scrollbar ============ */
.input-panel::-webkit-scrollbar,
.b64-output::-webkit-scrollbar { width: 5px; }
.input-panel::-webkit-scrollbar-track,
.b64-output::-webkit-scrollbar-track { background: transparent; }
.input-panel::-webkit-scrollbar-thumb,
.b64-output::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 3px; }
.input-panel::-webkit-scrollbar-thumb:hover,
.b64-output::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

/* ============ 响应式 ============ */
@media (max-width: 980px) {
  .main-area {
    flex-direction: column;
  }
  .input-panel {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  }
}
</style>
