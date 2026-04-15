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
            {{ t('imageToBase64.convert') }}
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
import { Picture, CopyDocument, Delete, UploadFilled } from '@element-plus/icons-vue'
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
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
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
.breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); transition: opacity 0.15s; }
.breadcrumb-link:hover { text-decoration: underline; opacity: 0.85; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 18px 0;
  padding: 10px 12px;
  flex-wrap: wrap;
  min-height: 52px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.58);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75), 0 8px 22px rgba(15,23,42,0.03);
}
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.format-select { width: 130px; }
.toolbar :deep(.el-button),
.toolbar :deep(.el-select) { --el-border-radius-base: 10px; }
.toolbar :deep(.el-select__wrapper),
.url-row :deep(.el-input__wrapper) {
  background: rgba(248,250,252,0.92);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}
.toolbar :deep(.el-select__wrapper.is-focused),
.url-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.7);
}
.toolbar-icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 10px;
  color: var(--text-secondary);
  background: rgba(248,250,252,0.9);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.toolbar-icon-btn:hover:not(.is-disabled) {
  color: var(--text-primary);
  background: rgba(255,255,255,0.96);
  border-color: rgba(15, 23, 42, 0.1);
}

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  padding: 14px 18px 0;
  gap: 0;
}
.input-panel {
  width: 380px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
}
.output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
}
.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255,255,255,0.64);
}
.output-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.output-meta {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: rgba(248,250,252,0.94);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.output-body {
  flex: 1;
  min-height: 0;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.36), rgba(248,250,252,0.22));
}
.output-body.is-empty {
  display: flex;
}

.drop-zone {
  border: 1px dashed rgba(15, 23, 42, 0.14);
  border-radius: 18px;
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: 160px;
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(248,250,252,0.92));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}
.drop-zone:hover,
.drop-zone.dragging {
  border-color: rgba(64, 158, 255, 0.45);
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(238,246,255,0.96));
}
.drop-zone.has-preview {
  padding: 10px;
  min-height: auto;
}
.drop-icon { font-size: 40px; color: var(--text-quaternary); margin-bottom: 8px; }
.drop-text { font-size: var(--font-size-body); color: var(--text-secondary); margin-bottom: 4px; font-weight: 600; }
.drop-formats {
  font-size: var(--font-size-caption);
  color: var(--text-quaternary);
  text-align: center;
  line-height: 1.4;
}
.preview-img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 14px;
  background: rgba(248,250,252,0.9);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.hidden-input { display: none; }
.url-row { display: flex; gap: 8px; }
.file-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248,250,252,0.92));
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-size: var(--font-size-caption);
  padding: 6px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.info-row:last-child { border-bottom: none; padding-bottom: 0; }
.info-label { color: var(--text-tertiary); font-weight: 600; }
.info-value {
  color: var(--text-primary);
  font-family: var(--font-mono, 'Consolas', monospace);
  word-break: break-all;
  text-align: right;
  max-width: 220px;
}
.b64-output {
  flex: 1;
  width: 100%;
  min-height: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  outline: none;
  resize: none;
  font-size: 12px;
  font-family: var(--font-mono, 'Consolas', monospace);
  line-height: 1.65;
  color: var(--text-primary);
  background: rgba(248,250,252,0.94);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
  word-break: break-all;
  box-sizing: border-box;
}
.b64-output::placeholder { color: var(--text-quaternary); }

.status-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 32px;
  margin: 0 18px 18px;
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(247,249,252,0.9));
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-top: none;
  border-radius: 0 0 18px 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
}
.status-spacer { flex: 1; }

.input-panel::-webkit-scrollbar,
.b64-output::-webkit-scrollbar { width: 6px; }
.input-panel::-webkit-scrollbar-track,
.b64-output::-webkit-scrollbar-track { background: transparent; }
.input-panel::-webkit-scrollbar-thumb,
.b64-output::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 3px; }
.input-panel::-webkit-scrollbar-thumb:hover,
.b64-output::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

@media (max-width: 980px) {
  .main-area {
    flex-direction: column;
    gap: 12px;
  }

  .input-panel,
  .output-panel {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px;
  }

  .status-bar {
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px;
  }
}
</style>
