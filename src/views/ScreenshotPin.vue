<template>
  <div class="pin-root" @wheel.prevent="onWheel" @contextmenu.prevent
    @mousedown="onMouseDown" @dblclick="onDblClick">
    <img v-if="imgSrc" ref="imgEl" :src="imgSrc" class="pin-img" draggable="false" @load="onImgLoad" />
    <!-- 标注画布：v-show 保持 DOM，避免取消工具时标注消失 -->
    <canvas ref="annoCanvas" class="anno-canvas"
      v-show="showAnnoCanvas"
      @mousedown.stop="onAnnoDown" @mousemove="onAnnoMove" @mouseup="onAnnoUp" />
    <!-- 文字输入框 -->
    <input v-if="textInputVisible" ref="textInputEl" class="text-input-overlay"
      :style="textInputStyle" v-model="textInputValue"
      @keydown.enter="commitTextInput" @keydown.esc="cancelTextInput"
      @blur="commitTextInput" @mousedown.stop placeholder="输入文字" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { save as dialogSave } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

const GAP = 8 // 图片与工具栏间距

const imgSrc = ref('')
const imgEl = ref(null)
const annoCanvas = ref(null)
const textInputEl = ref(null)
const pinFilePath = ref('')
const initW = ref(0)
const initH = ref(0)

// 标注状态
const currentTool = ref(null)
const drawColor = ref('#F56C6C')
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

// 标注层显示：有标注或有工具时显示
const showAnnoCanvas = computed(() => !!currentTool.value || annotations.value.length > 0)

// 预缓存图片的 ImageData（用于马赛克）
let cachedImageData = null

let toolbarWin = null
let toolbarVisible = false
let unlistenAction = null
let unlistenMove = null
let unlistenResize = null

// 预缓存 dpi 模块避免每次动态 import
let LogicalPosition = null
let LogicalSize = null
let scaleFactor = 1

onMounted(async () => {
  // 预加载 dpi 模块
  const dpi = await import('@tauri-apps/api/dpi')
  LogicalPosition = dpi.LogicalPosition
  LogicalSize = dpi.LogicalSize

  // 获取缩放因子（物理像素 / 逻辑像素）
  const curWin = getCurrentWindow()
  scaleFactor = await curWin.scaleFactor()

  const params = new URLSearchParams(window.location.search)

  const filePath = params.get('file')
  if (filePath) {
    pinFilePath.value = filePath
    try {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const bytes = await readFile(filePath)
      const blob = new Blob([bytes], { type: 'image/png' })
      imgSrc.value = URL.createObjectURL(blob)
    } catch (e) {
      console.error('[Pin] 读取图片文件失败:', e)
    }
  }

  initW.value = parseInt(params.get('w')) || 0
  initH.value = parseInt(params.get('h')) || 0

  window.addEventListener('keydown', onKeyDown)

  // 监听工具栏窗口发来的操作
  const { listen } = await import('@tauri-apps/api/event')
  unlistenAction = await listen('pin-toolbar-action', async (event) => {
    const p = event.payload
    const action = p?.action
    if (action === 'copy') await doCopy()
    else if (action === 'save') await doSave()
    else if (action === 'close') await doClose()
    else if (action === 'undo') undo()
    else if (action === 'redo') redo()
    else if (action === 'selectTool') {
      currentTool.value = p.tool
      if (p.tool) initAnnoCanvas()
    }
    else if (action === 'setColor') drawColor.value = p.color
    else if (action === 'setWidth') drawWidth.value = p.width
  })

  // 监听窗口移动/缩放事件，实时同步工具栏位置（比 setInterval 流畅）
  const curWin2 = getCurrentWindow()
  unlistenMove = await curWin2.onMoved(() => syncToolbarPosition())
  unlistenResize = await curWin2.onResized(() => {
    syncToolbarPosition()
    // 窗口缩放后重新初始化标注画布尺寸
    if (annoCanvas.value) initAnnoCanvas()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (unlistenAction) unlistenAction()
  if (unlistenMove) unlistenMove()
  if (unlistenResize) unlistenResize()
  if (imgSrc.value && imgSrc.value.startsWith('blob:')) URL.revokeObjectURL(imgSrc.value)
  if (pinFilePath.value) {
    invoke('delete_temp_file', { path: pinFilePath.value }).catch(() => {})
  }
  cachedImageData = null
  if (toolbarWin) toolbarWin.close().catch(() => {})
})

function onKeyDown(e) {
  if (textInputVisible.value) return
  if (e.key === 'Escape') doClose()
  if (e.key === ' ') { e.preventDefault(); toggleToolbar() }
}

// 空格切换工具栏
async function toggleToolbar() {
  if (toolbarVisible) {
    // 隐藏
    if (toolbarWin) {
      try { await toolbarWin.hide() } catch {}
    }
    toolbarVisible = false
  } else {
    // 显示（首次时创建）
    if (!toolbarWin) {
      await createToolbarWindow()
    } else {
      try { await toolbarWin.show() } catch {}
    }
    toolbarVisible = true
    syncToolbarPosition()
  }
}

function onImgLoad() {
  // 缓存 ImageData 用于马赛克
  const img = imgEl.value
  if (!img) return
  try {
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = img.naturalWidth; tmpCanvas.height = img.naturalHeight
    tmpCanvas.getContext('2d').drawImage(img, 0, 0)
    cachedImageData = tmpCanvas.getContext('2d').getImageData(0, 0, img.naturalWidth, img.naturalHeight)
  } catch {}
}

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  resizeByDelta(delta)
}

async function resizeByDelta(delta) {
  try {
    const curWin = getCurrentWindow()
    const size = await curWin.innerSize()
    // innerSize 返回物理像素，转为逻辑像素计算
    const logW = size.width / scaleFactor
    const logH = size.height / scaleFactor
    const w = Math.max(100, Math.round(logW + logW * delta))
    const h = Math.max(80, Math.round(logH + logH * delta))
    await curWin.setSize(new LogicalSize(w, h))
  } catch {}
}

async function createToolbarWindow() {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const curWin = getCurrentWindow()
    const [pos, size] = await Promise.all([curWin.outerPosition(), curWin.outerSize()])
    const lx = Math.round(pos.x / scaleFactor)
    const ly = Math.round(pos.y / scaleFactor)
    const lw = Math.round(size.width / scaleFactor)
    const lh = Math.round(size.height / scaleFactor)

    const tbLabel = `${curWin.label}-toolbar`
    toolbarWin = new WebviewWindow(tbLabel, {
      url: `${window.location.origin}/screenshot-pin-toolbar?parent=${curWin.label}`,
      title: '',
      width: Math.max(lw, 460),
      height: 66,
      x: lx,
      y: ly + lh + GAP,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
    })
  } catch (e) {
    console.error('[Pin] 创建工具栏窗口失败:', e)
  }
}

async function syncToolbarPosition() {
  if (!toolbarWin || !toolbarVisible) return
  try {
    const curWin = getCurrentWindow()
    const [pos, size] = await Promise.all([curWin.outerPosition(), curWin.outerSize()])
    // outerPosition/outerSize 返回物理像素，setPosition/setSize 用逻辑像素
    const lx = Math.round(pos.x / scaleFactor)
    const ly = Math.round(pos.y / scaleFactor)
    const lw = Math.round(size.width / scaleFactor)
    const lh = Math.round(size.height / scaleFactor)
    await Promise.all([
      toolbarWin.setPosition(new LogicalPosition(lx, ly + lh + GAP)),
      toolbarWin.setSize(new LogicalSize(Math.max(lw, 460), 66)),
    ])
  } catch {}
}

async function onMouseDown(e) {
  if (e.button !== 0) return
  // 标注模式下不拖拽
  if (currentTool.value) return
  await getCurrentWindow().startDragging()
}

function onDblClick() {
  // 标注模式下不关闭
  if (currentTool.value || textInputVisible.value) return
  doClose()
}

async function doClose() {
  if (toolbarWin) await toolbarWin.close().catch(() => {})
  await getCurrentWindow().close()
}

// 合成结果画布（原图 + 标注）
function getResultCanvas() {
  const img = imgEl.value
  if (!img) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  // 将标注画布合成上去
  const ac = annoCanvas.value
  if (ac && annotations.value.length > 0) {
    ctx.drawImage(ac, 0, 0, ac.width, ac.height, 0, 0, canvas.width, canvas.height)
  }
  return canvas
}

async function doCopy() {
  if (!imgSrc.value) return
  try {
    const canvas = getResultCanvas()
    if (!canvas) return
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch {
    await writeText('[Pin] 复制失败')
  }
}

async function doSave() {
  if (!imgSrc.value) return
  const path = await dialogSave({
    defaultPath: `pin-${Date.now()}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }],
  })
  if (!path) return
  // 有标注时用合成画布，无标注时直接复制原文件
  if (annotations.value.length > 0) {
    const canvas = getResultCanvas()
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    await invoke('save_screenshot_file', { path, data: dataUrl.split(',')[1] })
  } else if (pinFilePath.value) {
    const { copyFile } = await import('@tauri-apps/plugin-fs')
    await copyFile(pinFilePath.value, path)
  } else {
    const canvas = getResultCanvas()
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    await invoke('save_screenshot_file', { path, data: dataUrl.split(',')[1] })
  }
}

// ===== 标注功能 =====
function initAnnoCanvas() {
  const ac = annoCanvas.value
  if (!ac) return
  // 使用物理像素尺寸，避免 HiDPI 模糊
  const cssW = window.innerWidth, cssH = window.innerHeight
  ac.width = Math.round(cssW * scaleFactor)
  ac.height = Math.round(cssH * scaleFactor)
  ac.style.width = cssW + 'px'
  ac.style.height = cssH + 'px'
  redrawAnnotations()
}

// CSS坐标 → 画布物理坐标
function toCanvasPhysical(cssX, cssY) {
  return { x: Math.round(cssX * scaleFactor), y: Math.round(cssY * scaleFactor) }
}

function redrawAnnotations() {
  const ac = annoCanvas.value
  if (!ac) return
  const ctx = ac.getContext('2d')
  ctx.clearRect(0, 0, ac.width, ac.height)
  for (const a of annotations.value) drawAnnotation(ctx, a)
}

function drawAnnotation(ctx, a) {
  ctx.save()
  ctx.strokeStyle = a.color; ctx.fillStyle = a.color
  ctx.lineWidth = a.width * scaleFactor; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  switch (a.type) {
    case 'rect': ctx.strokeRect(a.x, a.y, a.w, a.h); break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.abs(a.w / 2), Math.abs(a.h / 2), 0, 0, Math.PI * 2)
      ctx.stroke(); break
    case 'arrow': {
      const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1)
      const headLen = Math.max(10 * scaleFactor, a.width * scaleFactor * 4)
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(a.x2, a.y2)
      ctx.lineTo(a.x2 - headLen * Math.cos(angle - 0.4), a.y2 - headLen * Math.sin(angle - 0.4))
      ctx.lineTo(a.x2 - headLen * Math.cos(angle + 0.4), a.y2 - headLen * Math.sin(angle + 0.4))
      ctx.closePath(); ctx.fill(); break
    }
    case 'line': ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke(); break
    case 'pen':
      if (a.points.length < 2) break
      ctx.beginPath(); ctx.moveTo(a.points[0].x, a.points[0].y)
      for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y)
      ctx.stroke(); break
    case 'text':
      ctx.font = `${(a.fontSize || 16) * scaleFactor}px sans-serif`; ctx.fillText(a.text, a.x, a.y); break
    case 'mosaic': drawMosaic(ctx, a.x, a.y, a.w, a.h); break
    case 'number': {
      const r = 12 * scaleFactor
      ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = `bold ${13 * scaleFactor}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(a.num), a.x, a.y); break
    }
  }
  ctx.restore()
}

function drawMosaic(ctx, x, y, w, h) {
  if (!cachedImageData || w <= 0 || h <= 0) return
  // 将画布坐标映射回原图像素坐标
  const img = imgEl.value
  if (!img) return
  const ac = annoCanvas.value
  const imgW = img.naturalWidth, imgH = img.naturalHeight
  const scaleX = imgW / ac.width, scaleY = imgH / ac.height
  const block = 8
  const sx = Math.max(0, Math.round(x * scaleX)), sy = Math.max(0, Math.round(y * scaleY))
  const sw = Math.min(Math.round(w * scaleX), imgW - sx), sh = Math.min(Math.round(h * scaleY), imgH - sy)
  if (sw <= 0 || sh <= 0) return
  const d = cachedImageData.data
  // 在画布坐标系中绘制马赛克块
  const blockW = block / scaleX, blockH = block / scaleY
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
      ctx.fillRect(x + bx / scaleX, y + by / scaleY, Math.ceil(blockW), Math.ceil(blockH))
    }
  }
}

function onAnnoDown(e) {
  if (!currentTool.value) return
  const p = toCanvasPhysical(e.offsetX, e.offsetY)
  const x = p.x, y = p.y

  if (currentTool.value === 'text') {
    // 显示内联文字输入框
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
  drawStart.value = { x, y }
  drawEnd.value = { x, y }
  penPoints.value = [{ x, y }]
}

function onAnnoMove(e) {
  if (!drawing.value) return
  const p = toCanvasPhysical(e.offsetX, e.offsetY)
  drawEnd.value = { x: p.x, y: p.y }
  if (currentTool.value === 'pen' || currentTool.value === 'mosaic') {
    penPoints.value.push({ x: p.x, y: p.y })
  }
  redrawAnnotations()
  previewDraw()
}

function onAnnoUp() {
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
    const p = toCanvasPhysical(textInputPos.value.x, textInputPos.value.y)
    annotations.value.push({
      type: 'text', x: p.x, y: p.y, text: textInputValue.value,
      fontSize: 16, color: drawColor.value, width: drawWidth.value
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

function previewDraw() {
  const ac = annoCanvas.value
  if (!ac) return
  const ctx = ac.getContext('2d')
  ctx.save()
  ctx.strokeStyle = drawColor.value; ctx.fillStyle = drawColor.value
  ctx.lineWidth = drawWidth.value * scaleFactor; ctx.setLineDash([4, 4])
  const s = drawStart.value, e = drawEnd.value
  switch (currentTool.value) {
    case 'rect': ctx.strokeRect(Math.min(s.x, e.x), Math.min(s.y, e.y), Math.abs(e.x - s.x), Math.abs(e.y - s.y)); break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse((s.x + e.x) / 2, (s.y + e.y) / 2, Math.abs(e.x - s.x) / 2, Math.abs(e.y - s.y) / 2, 0, 0, Math.PI * 2)
      ctx.stroke(); break
    case 'arrow': ctx.setLineDash([]); drawAnnotation(ctx, { type: 'arrow', x1: s.x, y1: s.y, x2: e.x, y2: e.y, color: drawColor.value, width: drawWidth.value }); break
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
</script>

<style scoped>
.pin-root {
  width: 100vw;
  height: 100vh;
  background: transparent;
  cursor: move;
  user-select: none;
  overflow: hidden;
  position: relative;
}
.pin-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
  border-radius: 2px;
}
.anno-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 1;
}
.text-input-overlay {
  position: absolute;
  z-index: 25;
  background: rgba(255,255,255,0.9);
  border: 2px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 16px;
  outline: none;
  min-width: 120px;
}
</style>
