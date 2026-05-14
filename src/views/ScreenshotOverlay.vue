<template>
  <div class="overlay-root" ref="rootEl" @contextmenu.prevent="onRightClick">
    <canvas ref="bgCanvas" class="full-canvas"
      @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" />
    <canvas ref="annoCanvas" class="full-canvas anno-layer"
      v-show="showAnnoCanvas"
      @mousedown="onAnnoDown" @mousemove="onAnnoMove" @mouseup="onAnnoUp" />

    <!-- 文字输入框 -->
    <input v-if="textInputVisible" ref="textInputEl" class="text-input-overlay"
      :style="textInputStyle" v-model="textInputValue"
      @keydown.enter="commitTextInput" @keydown.esc="cancelTextInput"
      @blur="commitTextInput" :placeholder="t('screenshot.textPlaceholder')" />

    <!-- 尺寸提示 -->
    <div v-if="selW > 0 && phase !== 'idle' && phase !== 'done'" class="size-label" :style="sizeLabelStyle">
      {{ selW }} × {{ selH }}
    </div>

    <!-- 工具栏 -->
    <div v-if="phase === 'selected' || phase === 'annotate'" class="toolbar" :style="toolbarStyle"
      @mousedown.stop @click.stop>
      <div class="tool-row">
        <div v-for="tool in drawTools" :key="tool.id" class="tool-btn"
          :class="{ active: currentTool === tool.id }" :title="tool.label"
          @click="selectTool(tool.id)">
          {{ tool.icon }}
        </div>
        <span class="tool-sep">|</span>
        <div v-for="c in presetColors" :key="c" class="color-dot"
          :class="{ active: drawColor === c }" :style="{ background: c }" @click="drawColor = c" />
        <span class="tool-sep">|</span>
        <div v-for="w in [2, 4, 6]" :key="w" class="tool-btn size-btn"
          :class="{ active: drawWidth === w }" @click="drawWidth = w">
          <span :style="{ width: w * 3 + 'px', height: w + 'px', background: drawColor, borderRadius: '1px' }"></span>
        </div>
      </div>
      <div class="tool-row">
        <div class="tool-btn" @click="undo" title="Ctrl+Z">↩</div>
        <div class="tool-btn" @click="redo" title="Ctrl+Y">↪</div>
        <span class="tool-sep">|</span>
        <div class="tool-btn action-btn" @click="doCopy" title="Ctrl+C / Enter">📋 {{ t('screenshot.overlayCopy') }}</div>
        <div class="tool-btn action-btn" @click="doSave" title="Ctrl+S">💾 {{ t('screenshot.overlaySave') }}</div>
        <div class="tool-btn action-btn pin-btn" @click="doPin" title="F3">📌 {{ t('screenshot.overlayPin') }}</div>
        <div class="tool-btn action-btn cancel-btn" @click="doCancel" title="Esc">✕</div>
      </div>
    </div>

    <!-- 取色模式提示 -->
    <div v-if="isColorPickerMode && (phase === 'idle')" class="color-picker-hint">
      {{ t('screenshot.colorPickerHint') }}
    </div>

    <!-- 放大镜 -->
    <div v-if="(phase === 'idle' || phase === 'selecting') && !textInputVisible" class="magnifier" :style="magnifierStyle">
      <canvas ref="magCanvas" width="120" height="120" />
      <div class="mag-info">
        <span>{{ magX }}, {{ magY }}</span>
        <span :style="{ color: magColor }">{{ magColor }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { save as dialogSave } from '@tauri-apps/plugin-dialog'
import { uuid, addToHistory, addColor } from '@/utils/screenshotManager'
import { t } from '@/i18n'

const rootEl = ref(null)
const bgCanvas = ref(null)
const annoCanvas = ref(null)
const magCanvas = ref(null)
const textInputEl = ref(null)

const phase = ref('idle') // idle → selecting → selected → annotate → done
const screenImage = ref(null)
const screenW = ref(0)
const screenH = ref(0)
const scaleFactor = ref(1)

// 预缓存的 ImageData（用于放大镜取色和马赛克）
let cachedImageData = null

// 取色器模式
const isColorPickerMode = ref(false)

// Selection
const startX = ref(0), startY = ref(0), endX = ref(0), endY = ref(0)
const selX = computed(() => Math.min(startX.value, endX.value))
const selY = computed(() => Math.min(startY.value, endY.value))
const selW = computed(() => Math.abs(endX.value - startX.value))
const selH = computed(() => Math.abs(endY.value - startY.value))

// Annotation
const currentTool = ref(null)
const drawColor = ref('var(--el-color-danger)')
const drawWidth = ref(2)
const annotations = ref([])
const redoStack = ref([])
const drawing = ref(false)
const drawStart = ref({ x: 0, y: 0 })
const drawEnd = ref({ x: 0, y: 0 })
const penPoints = ref([])
const numberCount = ref(1)

// 文字输入
const textInputVisible = ref(false)
const textInputValue = ref('')
const textInputPos = ref({ x: 0, y: 0 })
const textInputStyle = computed(() => ({
  left: textInputPos.value.x + 'px',
  top: textInputPos.value.y + 'px',
  color: drawColor.value,
  fontSize: '16px',
}))

// 标注层显示：selected 或 annotate 阶段都显示
const showAnnoCanvas = computed(() => phase.value === 'selected' || phase.value === 'annotate')

// Magnifier
const magX = ref(0), magY = ref(0), magColor = ref('#000000')

const presetColors = ['var(--el-color-danger)', 'var(--el-color-warning)', 'var(--el-color-success)', 'var(--accent-blue)', '#a855f7', '#ffffff', '#000000']
const drawTools = [
  { id: 'rect', icon: '□', label: t('screenshot.toolRect') },
  { id: 'ellipse', icon: '○', label: t('screenshot.toolEllipse') },
  { id: 'arrow', icon: '→', label: t('screenshot.toolArrow') },
  { id: 'line', icon: '╱', label: t('screenshot.toolLine') },
  { id: 'pen', icon: '✎', label: t('screenshot.toolPen') },
  { id: 'text', icon: 'A', label: t('screenshot.toolText') },
  { id: 'mosaic', icon: '▦', label: t('screenshot.toolMosaic') },
  { id: 'number', icon: '①', label: t('screenshot.toolNumber') },
]

// ===== Computed Styles =====
// CSS 坐标 = 物理坐标 / scaleFactor
const sizeLabelStyle = computed(() => ({
  left: selX.value / scaleFactor.value + 'px',
  top: Math.max(0, selY.value / scaleFactor.value - 26) + 'px',
}))
const toolbarStyle = computed(() => {
  const bottomCSS = (selY.value + selH.value) / scaleFactor.value + 8
  const winH = screenH.value / scaleFactor.value
  const topCSS = bottomCSS > winH - 80 ? selY.value / scaleFactor.value - 70 : bottomCSS
  return { left: Math.max(0, selX.value / scaleFactor.value) + 'px', top: Math.max(0, topCSS) + 'px' }
})
const magnifierStyle = computed(() => ({
  left: Math.min(magX.value + 20, screenW.value / scaleFactor.value - 150) + 'px',
  top: Math.min(magY.value + 20, screenH.value / scaleFactor.value - 170) + 'px',
}))

// ===== 全局键盘 =====
function onGlobalKeyDown(e) {
  if (phase.value === 'done') return
  if (textInputVisible.value) return

  // F3 贴图
  if (e.key === 'F3') {
    e.preventDefault()
    if (phase.value === 'selected' || phase.value === 'annotate') doPin()
    return
  }

  if (e.key === 'Escape') { e.preventDefault(); doCancel(); return }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); return }
  if (e.ctrlKey && e.key === 'c') {
    if (phase.value === 'selected' || phase.value === 'annotate') { e.preventDefault(); doCopy() }
    return
  }
  if (e.ctrlKey && e.key === 's') {
    if (phase.value === 'selected' || phase.value === 'annotate') { e.preventDefault(); doSave() }
    return
  }
  if (e.key === 'Enter') {
    if (phase.value === 'selected' || phase.value === 'annotate') { e.preventDefault(); doCopy() }
    return
  }
}

// ===== Init =====
let unlistenPin = null
onMounted(async () => {
  window.addEventListener('keydown', onGlobalKeyDown, true)

  // 监听 App.vue 发来的 F3 贴图事件
  try {
    const { listen } = await import('@tauri-apps/api/event')
    unlistenPin = await listen('screenshot-do-pin', () => {
      if (phase.value === 'selected' || phase.value === 'annotate') doPin()
    })
  } catch {}

  // 检查是否为取色器模式
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('mode') === 'colorPicker') {
    isColorPickerMode.value = true
  }

  try {
    let screens
    const preCaptured = localStorage.getItem('__screenshot_pre_capture')
    if (preCaptured) {
      screens = JSON.parse(preCaptured)
      localStorage.removeItem('__screenshot_pre_capture')
    } else {
      screens = await invoke('capture_screen_fast')
    }
    if (!screens.length) { doCancel(); return }

    const s = screens[0]
    screenW.value = s.width
    screenH.value = s.height
    const winW = window.innerWidth, winH = window.innerHeight
    scaleFactor.value = Math.max(s.width / winW, s.height / winH) || 1

    // 从 BMP 临时文件加载图片（避免 base64 传输）
    let imgSrc
    if (s.path) {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const bytes = await readFile(s.path)
      const blob = new Blob([bytes], { type: 'image/bmp' })
      imgSrc = URL.createObjectURL(blob)
    } else {
      imgSrc = `data:image/png;base64,${s.data}`
    }

    const img = new Image()
    img.onload = async () => {
      screenImage.value = img
      const bg = bgCanvas.value
      bg.width = s.width
      bg.height = s.height
      bg.style.width = winW + 'px'
      bg.style.height = winH + 'px'

      // 预缓存 ImageData
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = s.width; tmpCanvas.height = s.height
      tmpCanvas.getContext('2d').drawImage(img, 0, 0)
      cachedImageData = tmpCanvas.getContext('2d').getImageData(0, 0, s.width, s.height)

      drawBackground()
      phase.value = 'idle'

      // 图片就绪，显示窗口（消除白屏闪烁）
      try { await getCurrentWindow().show() } catch {}

      // 释放 objectURL
      if (imgSrc.startsWith('blob:')) URL.revokeObjectURL(imgSrc)
    }
    img.src = imgSrc
  } catch (e) {
    console.error('截图失败:', e)
    doCancel()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  if (unlistenPin) unlistenPin()
  cachedImageData = null
})

// ===== 鼠标坐标转换（CSS坐标 → canvas物理像素坐标） =====
function toPhysical(cssX, cssY) {
  return { x: Math.round(cssX * scaleFactor.value), y: Math.round(cssY * scaleFactor.value) }
}

// ===== Background Drawing =====
function drawBackground() {
  const ctx = bgCanvas.value.getContext('2d')
  ctx.drawImage(screenImage.value, 0, 0)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.fillRect(0, 0, screenW.value, screenH.value)

  if (selW.value > 0 && selH.value > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(selX.value, selY.value, selW.value, selH.value)
    ctx.clip()
    ctx.drawImage(screenImage.value, 0, 0)
    ctx.restore()

    ctx.strokeStyle = 'var(--accent-blue)'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.strokeRect(selX.value, selY.value, selW.value, selH.value)

    const handles = getSelectionHandles()
    ctx.fillStyle = 'var(--accent-blue)'
    handles.forEach(h => { ctx.fillRect(h.x - 3, h.y - 3, 6, 6) })
  }
}

function getSelectionHandles() {
  const x = selX.value, y = selY.value, w = selW.value, h = selH.value
  return [
    { x, y }, { x: x + w / 2, y }, { x: x + w, y },
    { x, y: y + h / 2 }, { x: x + w, y: y + h / 2 },
    { x, y: y + h }, { x: x + w / 2, y: y + h }, { x: x + w, y: y + h },
  ]
}

// ===== Mouse - Region Selection =====
function onMouseDown(e) {
  const p = toPhysical(e.offsetX, e.offsetY)

  // 取色器模式：直接取色并关闭
  if (isColorPickerMode.value && phase.value === 'idle') {
    pickColor(p.x, p.y)
    return
  }

  if (phase.value === 'annotate' || phase.value === 'selected') {
    if (!isInSelection(p.x, p.y)) {
      phase.value = 'selecting'
      startX.value = p.x; startY.value = p.y
      endX.value = p.x; endY.value = p.y
      annotations.value = []
      redoStack.value = []
      numberCount.value = 1
    }
    return
  }
  phase.value = 'selecting'
  startX.value = p.x; startY.value = p.y
  endX.value = p.x; endY.value = p.y
}

function onMouseMove(e) {
  const p = toPhysical(e.offsetX, e.offsetY)
  magX.value = e.offsetX; magY.value = e.offsetY
  if (phase.value === 'idle' || phase.value === 'selecting') updateMagnifier(p.x, p.y)
  if (phase.value === 'selecting') {
    endX.value = p.x; endY.value = p.y
    drawBackground()
  }
}

function onMouseUp(e) {
  if (phase.value !== 'selecting') return
  const p = toPhysical(e.offsetX, e.offsetY)
  endX.value = p.x; endY.value = p.y
  if (selW.value < 5 || selH.value < 5) { phase.value = 'idle'; return }
  phase.value = 'selected'
  initAnnotationCanvas()
}

function isInSelection(x, y) {
  return x >= selX.value && x <= selX.value + selW.value &&
         y >= selY.value && y <= selY.value + selH.value
}

// ===== 取色 =====
async function pickColor(px, py) {
  if (!cachedImageData) return
  const idx = (py * screenW.value + px) * 4
  const r = cachedImageData.data[idx], g = cachedImageData.data[idx + 1], b = cachedImageData.data[idx + 2]
  const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
  addColor(hex)
  try { await writeText(hex) } catch {}
  closeSelf()
}

// ===== Annotation =====
function selectTool(id) {
  currentTool.value = currentTool.value === id ? null : id
  if (currentTool.value) phase.value = 'annotate'
}

function initAnnotationCanvas() {
  const ac = annoCanvas.value
  ac.width = screenW.value; ac.height = screenH.value
  ac.style.width = (screenW.value / scaleFactor.value) + 'px'
  ac.style.height = (screenH.value / scaleFactor.value) + 'px'
  redrawAnnotations()
}

function redrawAnnotations() {
  if (!annoCanvas.value) return
  const ctx = annoCanvas.value.getContext('2d')
  ctx.clearRect(0, 0, screenW.value, screenH.value)
  for (const a of annotations.value) drawAnnotation(ctx, a)
}

function drawAnnotation(ctx, a) {
  ctx.save()
  ctx.strokeStyle = a.color; ctx.fillStyle = a.color
  ctx.lineWidth = a.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  switch (a.type) {
    case 'rect': ctx.strokeRect(a.x, a.y, a.w, a.h); break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.abs(a.w / 2), Math.abs(a.h / 2), 0, 0, Math.PI * 2)
      ctx.stroke(); break
    case 'arrow': drawArrow(ctx, a.x1, a.y1, a.x2, a.y2, a.width); break
    case 'line': ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke(); break
    case 'pen':
      if (a.points.length < 2) break
      ctx.beginPath(); ctx.moveTo(a.points[0].x, a.points[0].y)
      for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y)
      ctx.stroke(); break
    case 'text':
      ctx.font = `${a.fontSize || 16}px sans-serif`; ctx.fillText(a.text, a.x, a.y); break
    case 'mosaic': drawMosaic(ctx, a.x, a.y, a.w, a.h); break
    case 'number': {
      const r = 12
      ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(a.num), a.x, a.y); break
    }
  }
  ctx.restore()
}

function drawArrow(ctx, x1, y1, x2, y2, lineW) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = Math.max(10, lineW * 4)
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4))
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4))
  ctx.closePath(); ctx.fill()
}

function drawMosaic(ctx, x, y, w, h) {
  if (!cachedImageData || w <= 0 || h <= 0) return
  const block = 8
  const sx = Math.max(0, x), sy = Math.max(0, y)
  const sw = Math.min(w, screenW.value - sx), sh = Math.min(h, screenH.value - sy)
  if (sw <= 0 || sh <= 0) return
  const d = cachedImageData.data
  const imgW = screenW.value
  for (let by = 0; by < sh; by += block) {
    for (let bx = 0; bx < sw; bx += block) {
      let r = 0, g = 0, b = 0, count = 0
      for (let py = by; py < Math.min(by + block, sh); py++) {
        for (let px = bx; px < Math.min(bx + block, sw); px++) {
          const i = ((sy + py) * imgW + (sx + px)) * 4
          r += d[i]; g += d[i + 1]; b += d[i + 2]; count++
        }
      }
      ctx.fillStyle = `rgb(${r / count | 0},${g / count | 0},${b / count | 0})`
      ctx.fillRect(sx + bx, sy + by, block, block)
    }
  }
}

// ===== Annotation Mouse =====
function onAnnoDown(e) {
  if (!currentTool.value) {
    // 无工具时转发给选区逻辑（修复事件穿透）
    const p = toPhysical(e.offsetX, e.offsetY)
    if (!isInSelection(p.x, p.y)) {
      phase.value = 'selecting'
      startX.value = p.x; startY.value = p.y
      endX.value = p.x; endY.value = p.y
      annotations.value = []; redoStack.value = []; numberCount.value = 1
    }
    return
  }
  const p = toPhysical(e.offsetX, e.offsetY)
  const x = p.x, y = p.y

  if (currentTool.value === 'text') {
    // 显示文字输入框
    textInputPos.value = { x: e.offsetX, y: e.offsetY }
    textInputValue.value = ''
    textInputVisible.value = true
    nextTick(() => textInputEl.value?.focus())
    return
  }
  if (currentTool.value === 'number') {
    annotations.value.push({ type: 'number', x, y, num: numberCount.value++, color: drawColor.value, width: drawWidth.value })
    redoStack.value = []
    redrawAnnotations()
    return
  }

  drawing.value = true
  drawStart.value = { x, y }; drawEnd.value = { x, y }
  penPoints.value = [{ x, y }]
}

function onAnnoMove(e) {
  if (!currentTool.value && phase.value === 'selecting') {
    onMouseMove(e); return
  }
  if (!drawing.value) return
  const p = toPhysical(e.offsetX, e.offsetY)
  drawEnd.value = { x: p.x, y: p.y }
  if (currentTool.value === 'pen' || currentTool.value === 'mosaic') {
    penPoints.value.push({ x: p.x, y: p.y })
  }
  redrawAnnotations()
  previewDraw(annoCanvas.value.getContext('2d'))
}

function onAnnoUp(e) {
  if (!currentTool.value && phase.value === 'selecting') {
    onMouseUp(e); return
  }
  if (!drawing.value) return
  drawing.value = false
  const s = drawStart.value, en = drawEnd.value
  let anno = null
  switch (currentTool.value) {
    case 'rect':
      anno = { type: 'rect', x: Math.min(s.x, en.x), y: Math.min(s.y, en.y), w: Math.abs(en.x - s.x), h: Math.abs(en.y - s.y), color: drawColor.value, width: drawWidth.value }; break
    case 'ellipse':
      anno = { type: 'ellipse', x: Math.min(s.x, en.x), y: Math.min(s.y, en.y), w: Math.abs(en.x - s.x), h: Math.abs(en.y - s.y), color: drawColor.value, width: drawWidth.value }; break
    case 'arrow':
      anno = { type: 'arrow', x1: s.x, y1: s.y, x2: en.x, y2: en.y, color: drawColor.value, width: drawWidth.value }; break
    case 'line':
      anno = { type: 'line', x1: s.x, y1: s.y, x2: en.x, y2: en.y, color: drawColor.value, width: drawWidth.value }; break
    case 'pen':
      if (penPoints.value.length > 1)
        anno = { type: 'pen', points: [...penPoints.value], color: drawColor.value, width: drawWidth.value }
      break
    case 'mosaic': {
      const xs = penPoints.value.map(p => p.x), ys = penPoints.value.map(p => p.y)
      anno = { type: 'mosaic', x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), color: drawColor.value, width: drawWidth.value }
      break
    }
  }
  if (anno && (anno.w > 2 || anno.h > 2 || anno.points?.length > 1 || anno.x2 !== undefined)) {
    annotations.value.push(anno)
    redoStack.value = []
  }
  redrawAnnotations()
}

// 文字输入提交
function commitTextInput() {
  if (textInputValue.value.trim()) {
    const p = toPhysical(textInputPos.value.x, textInputPos.value.y)
    annotations.value.push({
      type: 'text', x: p.x, y: p.y, text: textInputValue.value,
      fontSize: Math.round(16 * scaleFactor.value), color: drawColor.value, width: drawWidth.value
    })
    redoStack.value = []
    redrawAnnotations()
  }
  textInputVisible.value = false
  textInputValue.value = ''
}

function cancelTextInput() {
  textInputVisible.value = false
  textInputValue.value = ''
}

function previewDraw(ctx) {
  ctx.save()
  ctx.strokeStyle = drawColor.value; ctx.fillStyle = drawColor.value
  ctx.lineWidth = drawWidth.value; ctx.setLineDash([4, 4])
  const s = drawStart.value, e = drawEnd.value
  switch (currentTool.value) {
    case 'rect': ctx.strokeRect(Math.min(s.x, e.x), Math.min(s.y, e.y), Math.abs(e.x - s.x), Math.abs(e.y - s.y)); break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse((s.x + e.x) / 2, (s.y + e.y) / 2, Math.abs(e.x - s.x) / 2, Math.abs(e.y - s.y) / 2, 0, 0, Math.PI * 2)
      ctx.stroke(); break
    case 'arrow': ctx.setLineDash([]); drawArrow(ctx, s.x, s.y, e.x, e.y, drawWidth.value); break
    case 'line': ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); break
    case 'pen':
      ctx.setLineDash([]); ctx.beginPath()
      ctx.moveTo(penPoints.value[0].x, penPoints.value[0].y)
      penPoints.value.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke(); break
    case 'mosaic': {
      const xs = penPoints.value.map(p => p.x), ys = penPoints.value.map(p => p.y)
      const mx = Math.min(...xs), my = Math.min(...ys)
      const mw = Math.max(...xs) - mx, mh = Math.max(...ys) - my
      if (mw > 0 && mh > 0) drawMosaic(ctx, mx, my, mw, mh)
      break
    }
  }
  ctx.restore()
}

// ===== Undo/Redo =====
function undo() {
  if (!annotations.value.length) return
  const removed = annotations.value.pop()
  if (removed.type === 'number') numberCount.value = Math.max(1, numberCount.value - 1)
  redoStack.value.push(removed)
  redrawAnnotations()
}
function redo() {
  if (!redoStack.value.length) return
  const restored = redoStack.value.pop()
  if (restored.type === 'number') numberCount.value++
  annotations.value.push(restored)
  redrawAnnotations()
}

// ===== Magnifier =====
function updateMagnifier(px, py) {
  if (!magCanvas.value || !screenImage.value) return
  const ctx = magCanvas.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 120, 120)
  ctx.drawImage(screenImage.value, px - 4, py - 4, 9, 9, 0, 0, 120, 120)
  ctx.strokeStyle = 'var(--accent-blue)'; ctx.lineWidth = 1
  const s = 120 / 9
  ctx.strokeRect(60 - s / 2, 60 - s / 2, s, s)
  // 从缓存的 ImageData 取色
  if (cachedImageData && px >= 0 && py >= 0 && px < screenW.value && py < screenH.value) {
    const idx = (py * screenW.value + px) * 4
    const d = cachedImageData.data
    magColor.value = `#${[d[idx], d[idx + 1], d[idx + 2]].map(c => c.toString(16).padStart(2, '0')).join('')}`
  }
}

// ===== Actions =====
function getResultCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = selW.value; canvas.height = selH.value
  const ctx = canvas.getContext('2d')
  ctx.drawImage(screenImage.value, selX.value, selY.value, selW.value, selH.value, 0, 0, selW.value, selH.value)
  if (annoCanvas.value) {
    ctx.drawImage(annoCanvas.value, selX.value, selY.value, selW.value, selH.value, 0, 0, selW.value, selH.value)
  }
  return canvas
}

async function doCopy() {
  if (selW.value < 5) return
  const canvas = getResultCanvas()
  try {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch {
    await writeText(canvas.toDataURL('image/png'))
  }
  saveToHistory(canvas)
  closeSelf()
}

async function doSave() {
  if (selW.value < 5) return
  const canvas = getResultCanvas()
  const path = await dialogSave({
    defaultPath: `screenshot-${Date.now()}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }],
  })
  if (!path) return
  const dataUrl = canvas.toDataURL(path.endsWith('.jpg') ? 'image/jpeg' : 'image/png')
  await invoke('save_screenshot_file', { path, data: dataUrl.split(',')[1] })
  saveToHistory(canvas)
  closeSelf()
}

async function doPin() {
  if (selW.value < 5) return
  const canvas = getResultCanvas()

  // 限制 pin 图片尺寸避免存储溢出
  const MAX_PIN = 1600
  let pinCanvas = canvas
  if (canvas.width > MAX_PIN || canvas.height > MAX_PIN) {
    const ratio = Math.min(MAX_PIN / canvas.width, MAX_PIN / canvas.height)
    pinCanvas = document.createElement('canvas')
    pinCanvas.width = Math.round(canvas.width * ratio)
    pinCanvas.height = Math.round(canvas.height * ratio)
    pinCanvas.getContext('2d').drawImage(canvas, 0, 0, pinCanvas.width, pinCanvas.height)
  }
  const dataUrl = pinCanvas.toDataURL('image/png')

  const pinId = `pin-${Date.now()}`
  // localStorage 跨窗口不共享，改用临时文件传递图片
  const base64 = dataUrl.split(',')[1]
  const tmpPath = `${await invoke('get_temp_dir')}/toolhub-pin-${pinId}.png`
  await invoke('save_screenshot_file', { path: tmpPath, data: base64 })

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const pinW = Math.round(selW.value / scaleFactor.value)
  const pinH = Math.round(selH.value / scaleFactor.value)
  // 窗口高度 = 图片高度（工具栏是独立窗口）
  const win = new WebviewWindow(pinId, {
    url: `${window.location.origin}/screenshot-pin?w=${pinW}&h=${pinH}&file=${encodeURIComponent(tmpPath)}`,
    title: '',
    width: pinW,
    height: pinH,
    x: Math.round(selX.value / scaleFactor.value),
    y: Math.round(selY.value / scaleFactor.value),
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
  })

  // 等 pin 窗口创建完成后再关闭 overlay，避免白屏
  let pinSaved = false
  win.once('tauri://created', () => {
    if (!pinSaved) { pinSaved = true; saveToHistory(canvas) }
    closeSelf()
  })
  // 超时兜底
  setTimeout(() => { if (!pinSaved) { pinSaved = true; saveToHistory(canvas) }; closeSelf() }, 2000)
}

function saveToHistory(canvas) {
  // 缩略图
  const thumbCanvas = document.createElement('canvas')
  const thumbH = 80
  const thumbW = Math.max(1, (canvas.width / canvas.height) * thumbH)
  thumbCanvas.width = thumbW; thumbCanvas.height = thumbH
  thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbW, thumbH)
  // 原图（限制最大尺寸避免 localStorage 溢出）
  let fullImage = ''
  const MAX_FULL = 1200
  if (canvas.width <= MAX_FULL && canvas.height <= MAX_FULL) {
    fullImage = canvas.toDataURL('image/png')
  } else {
    const fc = document.createElement('canvas')
    const ratio = Math.min(MAX_FULL / canvas.width, MAX_FULL / canvas.height)
    fc.width = canvas.width * ratio; fc.height = canvas.height * ratio
    fc.getContext('2d').drawImage(canvas, 0, 0, fc.width, fc.height)
    fullImage = fc.toDataURL('image/png')
  }
  addToHistory({
    id: uuid(), timestamp: Date.now(),
    width: canvas.width, height: canvas.height,
    thumbnail: thumbCanvas.toDataURL('image/png', 0.6),
    fullImage,
  })
}

function doCancel() { closeSelf() }

function onRightClick() {
  if (phase.value === 'annotate' || phase.value === 'selected') {
    phase.value = 'idle'
    startX.value = 0; startY.value = 0; endX.value = 0; endY.value = 0
    annotations.value = []; redoStack.value = []; currentTool.value = null; numberCount.value = 1
    // 清除标注画布残留
    if (annoCanvas.value) {
      const ctx = annoCanvas.value.getContext('2d')
      ctx.clearRect(0, 0, screenW.value, screenH.value)
    }
    drawBackground()
  } else {
    doCancel()
  }
}

async function closeSelf() {
  if (phase.value === 'done') return
  phase.value = 'done'
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  try { await getCurrentWindow().destroy() } catch {
    try { await getCurrentWindow().close() } catch {}
  }
}
</script>

<style scoped>
.overlay-root {
  position: fixed;
  inset: 0;
  cursor: crosshair;
  overflow: hidden;
  z-index: 99999;
  background: transparent;
}
.full-canvas {
  position: absolute;
  top: 0; left: 0;
}
.anno-layer { pointer-events: auto; z-index: 1; }
.size-label {
  position: absolute;
  background: rgba(0,0,0,0.75);
  color: var(--el-color-white);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
  font-family: monospace;
}
.toolbar {
  position: absolute;
  z-index: 20;
  background: rgba(30,30,30,0.94);
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
}
.tool-row { display: flex; align-items: center; gap: 2px; }
.tool-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-radius: 4px; color: #ccc; font-size: 14px;
  transition: all 0.1s; user-select: none;
}
.tool-btn:hover { background: rgba(255,255,255,0.15); color: var(--el-color-white); }
.tool-btn.active { background: var(--accent-blue); color: var(--el-color-white); }
.action-btn { width: auto; padding: 0 8px; font-size: 12px; }
.pin-btn:hover { background: rgba(103,194,58,0.3); }
.cancel-btn:hover { background: rgba(245,108,108,0.3); }
.tool-sep { color: rgba(255,255,255,0.2); margin: 0 2px; font-size: 14px; }
.color-dot {
  width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: border-color 0.1s;
}
.color-dot:hover { border-color: rgba(255,255,255,0.5); }
.color-dot.active { border-color: var(--el-bg-color-overlay); }
.size-btn span { display: block; }
.magnifier {
  position: absolute; z-index: 15;
  background: rgba(0,0,0,0.9); border-radius: 6px; padding: 4px;
  pointer-events: none; box-shadow: 0 2px 10px rgba(0,0,0,0.6);
}
.magnifier canvas { display: block; border-radius: 4px; image-rendering: pixelated; }
.mag-info {
  display: flex; justify-content: space-between;
  padding: 2px 4px; font-size: 10px; color: var(--text-quaternary); font-family: monospace;
}
.text-input-overlay {
  position: absolute;
  z-index: 25;
  background: rgba(255,255,255,0.9);
  border: 2px solid var(--accent-blue);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 16px;
  outline: none;
  min-width: 120px;
}
.color-picker-hint {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: var(--el-color-white);
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 30;
  pointer-events: none;
}
</style>
