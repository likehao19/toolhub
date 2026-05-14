<template>
  <div class="multi-print-wrapper">
    <!-- 顶栏（对齐 CryptoTool） -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Printer /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('multiPrint.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button size="small" text @click="showSettings = true" :title="t('multiPrint.settings')">
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button
          size="small"
          text
          @click="clearAll"
          :disabled="files.length === 0"
          :title="t('multiPrint.clearAll')"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主体（两栏：files-nav / content-area） -->
    <div class="main-body" @paste="onPaste" tabindex="-1">
      <!-- 左侧：文件列表 -->
      <div class="files-nav">
        <div class="files-nav-header">
          <el-button size="small" type="primary" plain @click="triggerFileInput" class="add-btn">
            <el-icon><Plus /></el-icon>
            {{ t('multiPrint.addFile') }}
          </el-button>
          <input
            ref="fileInputRef"
            type="file"
            :accept="ACCEPT"
            multiple
            class="hidden-input"
            @change="onFileSelect"
          />
        </div>

        <!-- 拖拽 / 空态 -->
        <div
          v-if="files.length === 0"
          class="files-empty"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
        >
          <el-icon class="empty-icon"><UploadFilled /></el-icon>
          <div class="empty-text">{{ t('multiPrint.dropHint') }}</div>
          <div class="empty-formats">{{ t('multiPrint.supportedFormats') }}</div>
        </div>

        <!-- 文件列表 -->
        <div
          v-else
          class="files-list"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
          :class="{ dragging: isDragging }"
        >
          <div
            v-for="(f, idx) in files"
            :key="f.id"
            class="file-item"
            :class="{ active: idx === activeFileIdx }"
            @click="activeFileIdx = idx"
          >
            <div class="file-icon">
              <el-icon v-if="f.type === 'pdf'" style="color:var(--color-red)"><Document /></el-icon>
              <el-icon v-else style="color:var(--accent-blue)"><Picture /></el-icon>
            </div>
            <div class="file-info">
              <div class="file-name" :title="f.name">{{ f.name }}</div>
              <div class="file-meta">
                <span v-if="f.loading" class="meta-loading">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  {{ t('multiPrint.parsing') }}
                </span>
                <span v-else-if="f.error" class="meta-error" :title="f.error">
                  <el-icon><WarningFilled /></el-icon>
                  {{ f.error }}
                </span>
                <span v-else>
                  {{ f.pages.length }} {{ t('multiPrint.pageUnit') }} · {{ formatSize(f.size) }}
                </span>
              </div>
            </div>
            <div class="file-actions" @click.stop>
              <button
                class="file-act-btn"
                @click="moveUp(idx)"
                :disabled="idx === 0"
                :title="t('multiPrint.moveUp')"
              >
                <el-icon><ArrowUp /></el-icon>
              </button>
              <button
                class="file-act-btn"
                @click="moveDown(idx)"
                :disabled="idx === files.length - 1"
                :title="t('multiPrint.moveDown')"
              >
                <el-icon><ArrowDown /></el-icon>
              </button>
              <button
                class="file-act-btn danger"
                @click="removeFile(idx)"
                :title="t('multiPrint.remove')"
              >
                <el-icon><Close /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：内容区（对齐 CryptoTool content-area） -->
      <div class="content-area">
        <!-- 信息条（对齐 algo-bar） -->
        <div class="info-bar">
          <div class="info-stats">
            <span class="info-item">
              <el-icon><Document /></el-icon>
              {{ files.length }} {{ t('multiPrint.fileUnit') }}
            </span>
            <span class="info-sep">·</span>
            <span class="info-item">
              <el-icon><Printer /></el-icon>
              {{ totalPages }} {{ t('multiPrint.pageUnit') }}
            </span>
            <span class="info-sep">·</span>
            <span class="info-paper">
              {{ settings.paperSize }} · {{ t(`multiPrint.${settings.orientation}`) }} · {{ t(`multiPrint.margin${marginCap}`) }}
            </span>
          </div>
          <el-button
            type="primary"
            @click="onPrint"
            :loading="printing"
            :disabled="totalPages === 0"
          >
            <el-icon style="margin-right: 6px;"><Printer /></el-icon>
            {{ t('multiPrint.printNow') }}
          </el-button>
        </div>

        <!-- 预览主区 -->
        <div class="preview-wrapper">
          <div v-if="totalPages === 0" class="empty-preview">
            <el-icon><Picture /></el-icon>
            <p>{{ t('multiPrint.previewEmpty') }}</p>
          </div>
          <div v-else class="page-grid" :class="`per-row-${settings.previewCols}`">
            <div
              v-for="(p, i) in allPages"
              :key="i"
              class="page-thumb"
              :style="{ aspectRatio: aspectByPaper() }"
            >
              <div class="page-thumb-inner">
                <img :src="p.url" :alt="p.name" />
                <div v-if="settings.showFooter" class="page-thumb-footer">
                  <span v-if="settings.showFilename" class="footer-name">{{ p.name }}</span>
                  <span v-if="settings.showPageNumber" class="footer-page">{{ i + 1 }} / {{ totalPages }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      :title="t('multiPrint.settingsTitle')"
      width="560px"
      append-to-body
    >
      <el-form label-width="100px" size="small">
        <el-form-item :label="t('multiPrint.paperSize')">
          <el-select v-model="settings.paperSize" style="width: 100%;">
            <el-option label="A4 (210 × 297 mm)" value="A4" />
            <el-option label="A3 (297 × 420 mm)" value="A3" />
            <el-option label="A5 (148 × 210 mm)" value="A5" />
            <el-option label="Letter (8.5 × 11 in)" value="Letter" />
            <el-option label="Legal (8.5 × 14 in)" value="Legal" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('multiPrint.orientation')">
          <el-radio-group v-model="settings.orientation">
            <el-radio-button value="portrait">{{ t('multiPrint.portrait') }}</el-radio-button>
            <el-radio-button value="landscape">{{ t('multiPrint.landscape') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('multiPrint.margin')">
          <el-radio-group v-model="settings.marginPreset">
            <el-radio-button value="narrow">{{ t('multiPrint.marginNarrow') }} (5mm)</el-radio-button>
            <el-radio-button value="normal">{{ t('multiPrint.marginNormal') }} (15mm)</el-radio-button>
            <el-radio-button value="wide">{{ t('multiPrint.marginWide') }} (25mm)</el-radio-button>
            <el-radio-button value="none">{{ t('multiPrint.marginNone') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('multiPrint.imageFit')">
          <el-radio-group v-model="settings.imageFit">
            <el-radio-button value="contain">{{ t('multiPrint.fitContain') }}</el-radio-button>
            <el-radio-button value="cover">{{ t('multiPrint.fitCover') }}</el-radio-button>
            <el-radio-button value="actual">{{ t('multiPrint.fitActual') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('multiPrint.previewCols')">
          <el-slider
            v-model="settings.previewCols"
            :min="1"
            :max="6"
            :step="1"
            show-stops
            :marks="{ 1:'1', 2:'2', 3:'3', 4:'4', 5:'5', 6:'6' }"
            style="max-width: 360px;"
          />
        </el-form-item>

        <el-form-item :label="t('multiPrint.footer')">
          <el-switch v-model="settings.showFooter" />
          <span style="margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary);">{{ t('multiPrint.footerHint') }}</span>
        </el-form-item>

        <template v-if="settings.showFooter">
          <el-form-item :label="t('multiPrint.showFilename')">
            <el-switch v-model="settings.showFilename" />
          </el-form-item>
          <el-form-item :label="t('multiPrint.showPageNumber')">
            <el-switch v-model="settings.showPageNumber" />
          </el-form-item>
        </template>

        <el-form-item :label="t('multiPrint.grayscale')">
          <el-switch v-model="settings.grayscale" />
          <span style="margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary);">{{ t('multiPrint.grayscaleHint') }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetSettings">{{ t('multiPrint.resetSettings') }}</el-button>
        <el-button type="primary" @click="showSettings = false">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Printer, Setting, Delete, Plus, UploadFilled, Picture, Document, Loading, WarningFilled, ArrowUp, ArrowDown, Close } from '@element-plus/icons-vue'
import { t } from '@/i18n'

// ==================== 路由 ====================
const router = useRouter()

// ==================== 配置 ====================

const ACCEPT = 'image/*,application/pdf'
const STORAGE_KEY = 'multi-print-settings-v2'

const DEFAULT_SETTINGS = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginPreset: 'narrow',
  imageFit: 'contain',
  previewCols: 3,
  showFooter: false,
  showFilename: false,
  showPageNumber: false,
  grayscale: false
}

const MARGIN_VALUES = { narrow: '5mm', normal: '15mm', wide: '25mm', none: '0' }

// ==================== 状态 ====================

const files = ref([])
const activeFileIdx = ref(0)
const isDragging = ref(false)
const printing = ref(false)
const showSettings = ref(false)
const fileInputRef = ref(null)

const settings = reactive({ ...DEFAULT_SETTINGS })

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  Object.assign(settings, { ...DEFAULT_SETTINGS, ...saved })
} catch {}

watch(settings, (val) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch {}
}, { deep: true })

// ==================== 计算属性 ====================

const allPages = computed(() => {
  const out = []
  for (const f of files.value) {
    for (let i = 0; i < f.pages.length; i++) {
      out.push({
        url: f.pages[i].url,
        name: f.pages.length > 1 ? `${f.name} (${i + 1})` : f.name
      })
    }
  }
  return out
})

const totalPages = computed(() => allPages.value.length)

// 信息条用的简短摘要：复用 i18n 的 marginNarrow/Normal/Wide/None
const marginCap = computed(() => {
  const m = settings.marginPreset
  return m.charAt(0).toUpperCase() + m.slice(1)
})

const aspectByPaper = () => {
  const sizeMap = {
    A3: 297 / 420,
    A4: 210 / 297,
    A5: 148 / 210,
    Letter: 8.5 / 11,
    Legal: 8.5 / 14
  }
  let r = sizeMap[settings.paperSize] || (210 / 297)
  if (settings.orientation === 'landscape') r = 1 / r
  return String(r)
}

// ==================== PDF 解析 ====================

let pdfjsLibCache = null
async function getPdfJs() {
  if (pdfjsLibCache) return pdfjsLibCache
  pdfjsLibCache = await import('pdfjs-dist')
  pdfjsLibCache.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  return pdfjsLibCache
}

async function pdfToImages(arrayBuffer) {
  const pdfjs = await getPdfJs()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    pages.push({ url: canvas.toDataURL('image/jpeg', 0.92) })
  }
  return pages
}

// ==================== 文件加载 ====================

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const idCounter = ref(0)
function nextId() {
  idCounter.value += 1
  return `${Date.now().toString(36)}-${idCounter.value}`
}

async function ingestFile(file) {
  const isImg = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isImg && !isPdf) {
    ElMessage.warning(t('multiPrint.unsupportedFile', { name: file.name }))
    return
  }

  const entry = reactive({
    id: nextId(),
    name: file.name || (isPdf ? 'document.pdf' : 'image'),
    type: isPdf ? 'pdf' : 'image',
    size: file.size || 0,
    pages: [],
    loading: true,
    error: ''
  })
  files.value.push(entry)

  try {
    if (isPdf) {
      const buf = await file.arrayBuffer()
      const pages = await pdfToImages(buf)
      entry.pages = pages
    } else {
      const url = await fileToDataUrl(file)
      entry.pages = [{ url }]
    }
  } catch (e) {
    console.error('parse file failed', e)
    entry.error = e.message || t('multiPrint.parseFailed')
  } finally {
    entry.loading = false
  }
}

async function ingestFiles(fileList) {
  const arr = Array.from(fileList || [])
  for (const f of arr) {
    await ingestFile(f)
  }
}

// ==================== 文件操作 ====================

const triggerFileInput = () => fileInputRef.value?.click()

const onFileSelect = (e) => {
  ingestFiles(e.target.files)
  e.target.value = ''
}

const onDrop = (e) => {
  isDragging.value = false
  if (e.dataTransfer?.files?.length) {
    ingestFiles(e.dataTransfer.files)
  }
}

const onPaste = (e) => {
  const items = e.clipboardData?.items
  if (!items) return
  const fs = []
  for (const it of items) {
    if (it.kind === 'file') {
      const f = it.getAsFile()
      if (f) fs.push(f)
    }
  }
  if (fs.length > 0) {
    e.preventDefault()
    ingestFiles(fs)
    ElMessage.success(t('multiPrint.pasted', { n: fs.length }))
  }
}

const removeFile = (idx) => {
  files.value.splice(idx, 1)
  if (activeFileIdx.value >= files.value.length) {
    activeFileIdx.value = Math.max(0, files.value.length - 1)
  }
}

const moveUp = (idx) => {
  if (idx <= 0) return
  const arr = files.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
}

const moveDown = (idx) => {
  if (idx >= files.value.length - 1) return
  const arr = files.value
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
}

const clearAll = () => {
  files.value = []
  activeFileIdx.value = 0
}

const resetSettings = () => {
  Object.assign(settings, DEFAULT_SETTINGS)
  ElMessage.success(t('multiPrint.resetSettings'))
}

const formatSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

// ==================== 打印（iframe 隔离方案） ====================

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch])
}

function buildPrintHtml() {
  const margin = MARGIN_VALUES[settings.marginPreset] ?? '15mm'
  const grayscaleStyle = settings.grayscale ? 'filter: grayscale(100%);' : ''
  const total = totalPages.value

  const pagesHtml = allPages.value.map((p, i) => {
    const footerParts = []
    if (settings.showFooter) {
      if (settings.showFilename) footerParts.push(`<span class="name">${escapeHtml(p.name)}</span>`)
      if (settings.showPageNumber) footerParts.push(`<span class="page">${i + 1} / ${total}</span>`)
    }
    const footer = footerParts.length
      ? `<div class="footer">${footerParts.join('')}</div>`
      : ''
    return `<div class="page"><img class="fit-${settings.imageFit}" src="${p.url}" />${footer}</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(t('multiPrint.title'))}<\/title>
<style>
  @page { size: ${settings.paperSize} ${settings.orientation}; margin: ${margin}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; ${grayscaleStyle} }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    page-break-after: always;
    page-break-inside: avoid;
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .page:last-child { page-break-after: auto; }
  .page img { display: block; }
  .page img.fit-contain { max-width: 100%; max-height: 100%; object-fit: contain; }
  .page img.fit-cover { width: 100%; height: 100%; object-fit: cover; }
  .page img.fit-actual { max-width: none; max-height: none; width: auto; height: auto; }
  .footer {
    position: absolute; left: 0; right: 0; bottom: 0;
    padding: 4px 12px;
    font-size: 10px;
    color: #4b5563;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--el-border-color);
    background: var(--el-bg-color-overlay);
  }
  .footer .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 8px; }
<\/style>
<\/head>
<body>
${pagesHtml}
<\/body>
<\/html>`
}

async function waitForImagesLoaded(doc) {
  const imgs = Array.from(doc.images || [])
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
    })
  }))
}

const onPrint = async () => {
  if (totalPages.value === 0) return
  if (files.value.some(f => f.loading)) {
    ElMessage.warning(t('multiPrint.waitParsing'))
    return
  }
  printing.value = true

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(buildPrintHtml())
    doc.close()

    await waitForImagesLoaded(doc)
    await new Promise(r => setTimeout(r, 100))

    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  } catch (e) {
    console.error('print failed', e)
    ElMessage.error(t('multiPrint.printFailed', { error: e.message || e }))
  } finally {
    setTimeout(() => {
      iframe.remove()
      printing.value = false
    }, 1500)
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  window.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
})
</script>

<style scoped>
.multi-print-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/*
 * Header / breadcrumb / page-eyebrow / header-right 的样式完全交给全局规则
 * (toolbox-unified.css + editorial-flat.css 白名单已注册 .multi-print-wrapper).
 */

/* ==================== 主体三栏 ==================== */
.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  outline: none;
}

/* ==================== 左侧：文件列表（对齐 CryptoTool category-nav） ==================== */
.files-nav {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
  border-right: 1px solid rgba(60, 40, 20, 0.06);
}

.files-nav-header {
  padding: 12px 14px 8px;
  flex-shrink: 0;
}

.add-btn {
  width: 100%;
  justify-content: center;
}

.hidden-input { display: none; }

.files-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  margin: 8px 14px 14px;
  text-align: center;
  border: 2px dashed rgba(60, 40, 20, 0.15);
  border-radius: 10px;
  color: var(--text-tertiary);
  transition: all 0.2s;
}

.files-empty.dragging {
  border-color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.05);
}

.empty-icon {
  font-size: 32px;
  color: var(--text-quaternary);
  margin-bottom: 10px;
}

.empty-text { font-size: 13px; margin-bottom: 4px; }
.empty-formats { font-size: 11px; color: var(--text-quaternary); }

.files-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(60,40,20,0.15) transparent;
}

.files-list::-webkit-scrollbar { width: 4px; }
.files-list::-webkit-scrollbar-thumb { background: rgba(60,40,20,0.15); border-radius: 2px; }

.files-list.dragging { background: rgba(47, 111, 228, 0.04); }

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  border-left: 2px solid transparent;
  position: relative;
}

.file-item:hover { background: rgba(60, 40, 20, 0.03); }

.file-item.active {
  background: rgba(47, 111, 228, 0.06);
  border-left-color: var(--accent-blue);
}

.file-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(60, 40, 20, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.file-icon .el-icon { font-size: 16px; }

.meta-loading .el-icon,
.meta-error .el-icon {
  vertical-align: -2px;
  margin-right: 2px;
}

.is-loading {
  animation: mp-spin 1s linear infinite;
}

@keyframes mp-spin {
  to { transform: rotate(360deg); }
}

.file-info { flex: 1; min-width: 0; }

.file-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  line-height: 1.3;
}

.file-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-loading { color: var(--accent-blue); }
.meta-error { color: var(--el-color-danger); }

.file-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.12s;
  flex-shrink: 0;
}

.file-item:hover .file-actions,
.file-item.active .file-actions { opacity: 1; }

.file-act-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
}

.file-act-btn .el-icon { font-size: 14px; }

.file-act-btn:hover:not(:disabled) {
  background: rgba(60, 40, 20, 0.08);
  color: var(--text-primary);
}

.file-act-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.file-act-btn.danger:hover:not(:disabled) {
  background: rgba(245, 108, 108, 0.12);
  color: var(--el-color-danger);
}

/* ==================== 中间：内容区（对齐 CryptoTool） ==================== */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 0;
  background: transparent;
}

/* 信息条（对齐 algo-bar） */
.info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.info-stats {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 0;
}

.info-item { display: inline-flex; align-items: center; gap: 6px; }
.info-item .el-icon { color: var(--accent-blue); font-size: 13px; }
.info-sep { color: var(--text-quaternary); margin: 0 2px; }
.info-paper { color: var(--text-tertiary); font-size: 12px; }

.info-bar :deep(.el-button) { --el-button-border-radius: 8px; }

/* 预览区 */
.preview-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60,40,20,0.15) transparent;
}

.preview-wrapper::-webkit-scrollbar { width: 8px; }
.preview-wrapper::-webkit-scrollbar-thumb { background: rgba(60,40,20,0.15); border-radius: 4px; }

.empty-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
}

.empty-preview .el-icon {
  font-size: 56px;
  margin-bottom: 14px;
  color: var(--text-quaternary);
}

.empty-preview p { font-size: 14px; margin: 0; }

.page-grid { display: grid; gap: 14px; }
.page-grid.per-row-1 { grid-template-columns: 1fr; }
.page-grid.per-row-2 { grid-template-columns: repeat(2, 1fr); }
.page-grid.per-row-3 { grid-template-columns: repeat(3, 1fr); }
.page-grid.per-row-4 { grid-template-columns: repeat(4, 1fr); }
.page-grid.per-row-5 { grid-template-columns: repeat(5, 1fr); }
.page-grid.per-row-6 { grid-template-columns: repeat(6, 1fr); }

.page-thumb {
  background: var(--el-bg-color-overlay);
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.page-thumb-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.page-thumb img {
  flex: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--el-fill-color-lighter);
  min-height: 0;
}

.page-thumb-footer {
  padding: 4px 8px;
  font-size: 10px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.footer-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.footer-page { flex-shrink: 0; color: var(--el-text-color-secondary); }

/* ==================== 响应式 ==================== */
@media (max-width: 1180px) {
  .files-nav { width: 220px; min-width: 220px; }
}

@media (max-width: 960px) {
  .main-body { flex-direction: column; }
  .files-nav {
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    max-height: 220px;
  }
}

@media (max-width: 720px) {
  .header {
    height: auto;
    min-height: 52px;
    padding: 10px 14px;
    align-items: flex-start;
    flex-direction: column;
  }
  .header-left, .header-right { width: 100%; }
}
</style>
