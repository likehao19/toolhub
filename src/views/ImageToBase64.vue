<template>
  <div class="img-b64-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Picture /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('imageToBase64.title') }}</span>
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
        <el-button size="small" text @click="doCopy" :disabled="!base64Output">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button size="small" text @click="doClear" :disabled="!base64Output">
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
        <textarea
          class="b64-output"
          :value="base64Output"
          readonly
          :placeholder="t('imageToBase64.outputPlaceholder')"
        ></textarea>
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
  background-color: var(--bg-secondary);
}

/* ---- 顶栏 ---- */
.header {
  display: flex;
  justify-content: space-between;
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
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); transition: opacity 0.15s; }
.breadcrumb-link:hover { text-decoration: underline; opacity: 0.85; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

/* ---- 工具栏 ---- */
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
.format-select { width: 130px; }

/* ---- 主体 ---- */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.input-panel {
  width: 380px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  background-color: var(--bg-primary);
}

.output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-primary);
}

/* ---- 拖拽区 ---- */
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: 160px;
  background-color: var(--bg-secondary);
}
.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--accent-blue);
  background-color: color-mix(in srgb, var(--accent-blue) 6%, var(--bg-secondary));
}
.drop-zone.has-preview {
  padding: 8px;
  min-height: auto;
}
.drop-icon {
  font-size: 40px;
  color: var(--text-quaternary);
  margin-bottom: 8px;
}
.drop-text {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  margin-bottom: 4px;
}
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
  border-radius: var(--radius-md);
}
.hidden-input { display: none; }

/* ---- URL 行 ---- */
.url-row {
  display: flex;
  gap: 8px;
}

/* ---- 文件信息 ---- */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-caption);
}
.info-label {
  color: var(--text-tertiary);
}
.info-value {
  color: var(--text-primary);
  font-family: var(--font-mono, 'Consolas', monospace);
  word-break: break-all;
  text-align: right;
  max-width: 220px;
}

/* ---- Base64 输出 ---- */
.b64-output {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-size: var(--font-size-xs);
  font-family: var(--font-mono, 'Consolas', monospace);
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  word-break: break-all;
  box-sizing: border-box;
}
.b64-output::placeholder {
  color: var(--text-quaternary);
}

/* ---- 底栏 ---- */
.status-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 28px;
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
}
.status-spacer { flex: 1; }

/* ---- 滚动条 ---- */
.input-panel::-webkit-scrollbar,
.b64-output::-webkit-scrollbar { width: 6px; }
.input-panel::-webkit-scrollbar-track,
.b64-output::-webkit-scrollbar-track { background: transparent; }
.input-panel::-webkit-scrollbar-thumb,
.b64-output::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}
.input-panel::-webkit-scrollbar-thumb:hover,
.b64-output::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
