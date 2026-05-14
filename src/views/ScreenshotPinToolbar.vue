<template>
  <div class="toolbar-root">
    <div class="toolbar">
      <div class="tool-row">
        <div v-for="tool in drawTools" :key="tool.id" class="tool-btn"
          :class="{ active: currentTool === tool.id }" :title="tool.label"
          @click="selectTool(tool.id)">
          {{ tool.icon }}
        </div>
        <span class="tool-sep">|</span>
        <div v-for="c in presetColors" :key="c" class="color-dot"
          :class="{ active: drawColor === c }" :style="{ background: c }" @click="setColor(c)" />
        <span class="tool-sep">|</span>
        <div v-for="w in [2, 4, 6]" :key="w" class="tool-btn size-btn"
          :class="{ active: drawWidth === w }" @click="setWidth(w)">
          <span :style="{ width: w * 3 + 'px', height: w + 'px', background: drawColor, borderRadius: '1px' }"></span>
        </div>
      </div>
      <div class="tool-row">
        <div class="tool-btn" @click="emitAction('undo')" title="Ctrl+Z">↩</div>
        <div class="tool-btn" @click="emitAction('redo')" title="Ctrl+Y">↪</div>
        <span class="tool-sep">|</span>
        <div class="tool-btn action-btn" @click="emitAction('copy')" title="Ctrl+C / Enter">📋 {{ t('screenshot.overlayCopy') }}</div>
        <div class="tool-btn action-btn" @click="emitAction('save')" title="Ctrl+S">💾 {{ t('screenshot.overlaySave') }}</div>
        <div class="tool-btn action-btn cancel-btn" @click="doClose" title="Esc">✕</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { t } from '@/i18n'

const parentLabel = ref('')
const currentTool = ref(null)
const drawColor = ref('var(--el-color-danger)')
const drawWidth = ref(2)

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

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  parentLabel.value = params.get('parent') || ''
  window.addEventListener('keydown', onKeyDown)

  // 强制页面背景透明
  document.documentElement.style.background = 'transparent'
  document.body.style.background = 'transparent'
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e) {
  if (e.key === 'Escape') doClose()
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); emitAction('undo') }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); emitAction('redo') }
  if (e.ctrlKey && e.key === 'c') { e.preventDefault(); emitAction('copy') }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); emitAction('save') }
}

async function emitAction(action, payload = {}) {
  try {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo(parentLabel.value, 'pin-toolbar-action', { action, ...payload })
  } catch {}
}

function selectTool(id) {
  currentTool.value = currentTool.value === id ? null : id
  emitAction('selectTool', { tool: currentTool.value })
}

function setColor(c) {
  drawColor.value = c
  emitAction('setColor', { color: c })
}

function setWidth(w) {
  drawWidth.value = w
  emitAction('setWidth', { width: w })
}

async function doClose() {
  await emitAction('close')
  await getCurrentWindow().close().catch(() => {})
}
</script>

<style scoped>
:global(html), :global(body), :global(#app) {
  background: transparent !important;
}
</style>

<style scoped>
.toolbar-root {
  width: 100vw;
  height: 100vh;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

/* 与 ScreenshotOverlay .toolbar 完全一致 */
.toolbar {
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
</style>
