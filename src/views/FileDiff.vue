<template>
  <div class="file-diff-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Document /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('fileDiff.title') }}</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <el-button size="small" @click="openFile('left')">
          <el-icon><FolderOpened /></el-icon>
          {{ t('fileDiff.openLeft') }}
        </el-button>
        <el-button size="small" @click="openFile('right')">
          <el-icon><FolderOpened /></el-icon>
          {{ t('fileDiff.openRight') }}
        </el-button>
      </div>

      <div class="toolbar-sep"></div>

      <div class="toolbar-group">
        <el-button size="small" text @click="swapSides" :disabled="!hasContent" :title="t('fileDiff.swap')">
          <el-icon><Sort /></el-icon>
        </el-button>
      </div>

      <div class="toolbar-sep"></div>

      <!-- 差异导航 + 合并 -->
      <div class="toolbar-group diff-nav" v-if="diffBlocks.length">
        <el-button size="small" text @click="goToDiff(-1)">
          <el-icon><ArrowUp /></el-icon>
        </el-button>
        <span class="diff-pos">{{ currentDiffIndex + 1 }}/{{ diffBlocks.length }}</span>
        <el-button size="small" text @click="goToDiff(1)">
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <div class="toolbar-sep-sm"></div>
        <el-button size="small" text class="merge-tb-btn" @click="doMerge(currentDiffIndex, 'left-to-right')" :title="t('fileDiff.mergeToRight')">
          →
        </el-button>
        <el-button size="small" text class="merge-tb-btn" @click="doMerge(currentDiffIndex, 'right-to-left')" :title="t('fileDiff.mergeToLeft')">
          ←
        </el-button>
      </div>

      <div class="toolbar-spacer"></div>

      <div class="toolbar-group">
        <el-button size="small" text @click="saveFile('left')" :disabled="!leftText" :title="t('fileDiff.saveLeft')">
          <el-icon><Download /></el-icon> L
        </el-button>
        <el-button size="small" text @click="saveFile('right')" :disabled="!rightText" :title="t('fileDiff.saveRight')">
          <el-icon><Download /></el-icon> R
        </el-button>
        <el-button size="small" text @click="doExportDiff" :disabled="!diffBlocks.length" :title="t('fileDiff.exportDiff')">
          <el-icon><Document /></el-icon> .diff
        </el-button>
      </div>
    </div>

    <!-- 文件名栏 -->
    <div class="file-name-bar">
      <div class="file-name left" @click="openFile('left')">
        <span class="file-tag removed-tag">{{ t('fileDiff.original') }}</span>
        <span class="file-label">{{ leftPath ? getFileName(leftPath) : '—' }}</span>
        <span v-if="leftModified" class="modified-dot" title="unsaved">●</span>
        <span class="line-count">{{ leftLineCount }} {{ t('fileDiff.lines') }}</span>
      </div>
      <div class="file-name right" @click="openFile('right')">
        <span class="file-tag added-tag">{{ t('fileDiff.modified') }}</span>
        <span class="file-label">{{ rightPath ? getFileName(rightPath) : '—' }}</span>
        <span v-if="rightModified" class="modified-dot" title="unsaved">●</span>
        <span class="line-count">{{ rightLineCount }} {{ t('fileDiff.lines') }}</span>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="editor-container">
      <div class="editor-pane left-pane">
        <div ref="leftEditorEl" class="editor-mount"></div>
      </div>
      <!-- 中间合并按钮栏 -->
      <div class="merge-gutter">
        <div
          v-for="pos in mergePositions"
          :key="pos.blockIdx"
          class="merge-btn-pair"
          :class="{ current: pos.blockIdx === currentDiffIndex, ['t-' + pos.type]: true }"
          :style="{ top: pos.top + 'px' }"
        >
          <button class="mg-btn mg-right" @click="doMerge(pos.blockIdx, 'left-to-right')" :title="t('fileDiff.mergeToRight')">›</button>
          <button class="mg-btn mg-left" @click="doMerge(pos.blockIdx, 'right-to-left')" :title="t('fileDiff.mergeToLeft')">‹</button>
        </div>
      </div>
      <div class="editor-pane right-pane">
        <div ref="rightEditorEl" class="editor-mount"></div>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <template v-if="diffBlocks.length">
        <span class="status-badge badge-total">{{ t('fileDiff.diffCount', { count: diffBlocks.length }) }}</span>
        <span v-if="addedCount" class="status-badge badge-added">{{ t('fileDiff.added', { count: addedCount }) }}</span>
        <span v-if="removedCount" class="status-badge badge-removed">{{ t('fileDiff.removed', { count: removedCount }) }}</span>
        <span v-if="modifiedCount" class="status-badge badge-modified">{{ t('fileDiff.modified', { count: modifiedCount }) }}</span>
      </template>
      <span v-else-if="hasContent && leftText && rightText" class="status-same">{{ t('fileDiff.noDiff') }}</span>
      <span class="status-spacer"></span>
      <span class="status-hint">Alt+↑↓ {{ t('fileDiff.navHint') }}　Ctrl+S {{ t('fileDiff.saveHint') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Document, FolderOpened, ArrowUp, ArrowDown, Download, Sort } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'

import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, StateField, StateEffect } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { Decoration } from '@codemirror/view'

import { computeDiff, computeCharDiff, exportPatch, mergeBlock } from '@/utils/diffEngine'

const router = useRouter()

// ---- State ----
const leftText = ref('')
const rightText = ref('')
const leftPath = ref('')
const rightPath = ref('')
const leftModified = ref(false)
const rightModified = ref(false)

const diffBlocks = ref([])
const currentDiffIndex = ref(0)
const mergePositions = ref([])

const leftEditorEl = ref(null)
const rightEditorEl = ref(null)
const leftView = shallowRef(null)
const rightView = shallowRef(null)

// ---- Computed ----
const hasContent = computed(() => !!(leftText.value || rightText.value))
const leftLineCount = computed(() => leftText.value ? leftText.value.split('\n').length : 0)
const rightLineCount = computed(() => rightText.value ? rightText.value.split('\n').length : 0)
const addedCount = computed(() => diffCounts.value.added)
const removedCount = computed(() => diffCounts.value.removed)
const modifiedCount = computed(() => diffCounts.value.modified)
const diffCounts = computed(() => {
  let added = 0, removed = 0, modified = 0
  for (const b of diffBlocks.value) {
    if (b.type === 'added') added++
    else if (b.type === 'removed') removed++
    else if (b.type === 'modified') modified++
  }
  return { added, removed, modified }
})

// ---- Decoration system ----
function createDiffDecoField() {
  const effect = StateEffect.define()
  const field = StateField.define({
    create: () => Decoration.none,
    update(value, tr) {
      for (const e of tr.effects) {
        if (e.is(effect)) return e.value
      }
      return value
    },
    provide: f => EditorView.decorations.from(f),
  })
  return { effect, field }
}

const leftDeco = createDiffDecoField()
const rightDeco = createDiffDecoField()
// 当前选中块的高亮
const leftCurrentDeco = createDiffDecoField()
const rightCurrentDeco = createDiffDecoField()

const addedLineDeco = Decoration.line({ class: 'diff-line-added' })
const removedLineDeco = Decoration.line({ class: 'diff-line-removed' })
const modifiedLineDeco = Decoration.line({ class: 'diff-line-modified' })
const currentBlockDeco = Decoration.line({ class: 'diff-block-current' })
const charAddedMark = Decoration.mark({ class: 'diff-char-added' })
const charRemovedMark = Decoration.mark({ class: 'diff-char-removed' })

// ---- Theme ----
const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-quaternary)',
    borderRight: '1px solid var(--border-color)', minWidth: '44px',
  },
  '.cm-gutterElement': { padding: '0 10px 0 6px' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  '.cm-activeLine': { backgroundColor: 'rgba(64,158,255,0.05)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(64,158,255,0.15) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent-blue)', borderLeftWidth: '2px' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(64,158,255,0.2)', color: 'inherit !important', outline: 'none' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(64,158,255,0.2) !important' },
  '.cm-foldGutter .cm-gutterElement': { cursor: 'pointer', color: 'var(--text-quaternary)', padding: '0 4px' },
  '.cm-foldPlaceholder': {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    color: 'var(--text-tertiary)', borderRadius: '4px', padding: '1px 8px', margin: '0 4px', fontSize: '12px',
  },
  '.cm-line': { padding: '0 10px' },
})

const diffTheme = EditorView.theme({
  '&': {
    fontSize: '13.5px',
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    lineHeight: '1.7',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': { padding: '10px 0' },
  '.cm-placeholder': { color: 'var(--text-quaternary)', fontStyle: 'italic' },
  // Diff line backgrounds — GitHub-like colors (加强可见度)
  '.diff-line-added': { backgroundColor: 'rgba(46,160,67,0.18)' },
  '.diff-line-removed': { backgroundColor: 'rgba(248,81,73,0.18)' },
  '.diff-line-modified': { backgroundColor: 'rgba(210,153,34,0.18)' },
  // 当前选中块 — 加深 + 左边框指示
  '.diff-block-current': { boxShadow: 'inset 3px 0 0 var(--accent-blue)' },
  '.diff-block-current.diff-line-added': { backgroundColor: 'rgba(46,160,67,0.28)' },
  '.diff-block-current.diff-line-removed': { backgroundColor: 'rgba(248,81,73,0.28)' },
  '.diff-block-current.diff-line-modified': { backgroundColor: 'rgba(210,153,34,0.28)' },
  // Character-level highlights
  '.diff-char-added': { backgroundColor: 'rgba(46,160,67,0.40)', borderRadius: '2px' },
  '.diff-char-removed': { backgroundColor: 'rgba(248,81,73,0.40)', borderRadius: '2px' },
})

// ---- Click handler — 点击差异行选中该块 ----
function createClickHandler(side) {
  return EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const lineIdx = view.state.doc.lineAt(pos).number - 1
      const idx = findBlockAtLine(lineIdx, side)
      if (idx >= 0) {
        currentDiffIndex.value = idx
      }
      return false
    }
  })
}

function findBlockAtLine(lineIdx, side) {
  for (let i = 0; i < diffBlocks.value.length; i++) {
    const b = diffBlocks.value[i]
    if (side === 'left') {
      if (b.type !== 'added' && lineIdx >= b.leftStart && lineIdx < b.leftEnd) return i
    } else {
      if (b.type !== 'removed' && lineIdx >= b.rightStart && lineIdx < b.rightEnd) return i
    }
  }
  return -1
}

// ---- Create editor ----
function createEditor(parent, side) {
  const decoInfo = side === 'left' ? leftDeco : rightDeco
  const currentDecoInfo = side === 'left' ? leftCurrentDeco : rightCurrentDeco
  const placeholderText = side === 'left'
    ? t('fileDiff.placeholderLeft')
    : t('fileDiff.placeholderRight')

  const state = EditorState.create({
    doc: '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        { key: 'Alt-ArrowUp', run: () => { goToDiff(-1); return true } },
        { key: 'Alt-ArrowDown', run: () => { goToDiff(1); return true } },
        {
          key: 'Mod-s',
          run: () => { saveFile(side); return true },
        },
      ]),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      isDark.value ? oneDark : lightTheme,
      diffTheme,
      EditorView.lineWrapping,
      cmPlaceholder(placeholderText),
      decoInfo.field,
      currentDecoInfo.field,
      createClickHandler(side),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const text = update.state.doc.toString()
          if (side === 'left') {
            leftText.value = text
            leftModified.value = true
          } else {
            rightText.value = text
            rightModified.value = true
          }
        }
      }),
    ],
  })

  return new EditorView({ state, parent })
}

// ---- Lifecycle ----
onMounted(() => {
  leftView.value = createEditor(leftEditorEl.value, 'left')
  rightView.value = createEditor(rightEditorEl.value, 'right')
  setupScrollSync()
})

onBeforeUnmount(() => {
  clearTimeout(diffTimer)
  cleanupScrollSync?.()
  leftView.value?.destroy()
  rightView.value?.destroy()
})

// ---- Scroll sync ----
let syncingScroll = false
let cleanupScrollSync = null
function setupScrollSync() {
  const lScroller = leftView.value?.scrollDOM
  const rScroller = rightView.value?.scrollDOM
  if (!lScroller || !rScroller) return

  const onLeftScroll = () => {
    if (syncingScroll) return
    syncingScroll = true
    rScroller.scrollTop = lScroller.scrollTop
    requestAnimationFrame(() => {
      computeMergePositions()
      syncingScroll = false
    })
  }
  const onRightScroll = () => {
    if (syncingScroll) return
    syncingScroll = true
    lScroller.scrollTop = rScroller.scrollTop
    requestAnimationFrame(() => {
      computeMergePositions()
      syncingScroll = false
    })
  }

  lScroller.addEventListener('scroll', onLeftScroll)
  rScroller.addEventListener('scroll', onRightScroll)

  cleanupScrollSync = () => {
    lScroller.removeEventListener('scroll', onLeftScroll)
    rScroller.removeEventListener('scroll', onRightScroll)
  }
}

// ---- Merge gutter position calculation ----
function computeMergePositions() {
  const lView = leftView.value
  const rView = rightView.value
  if (!lView || !rView || !diffBlocks.value.length) {
    mergePositions.value = []
    return
  }

  const positions = []

  for (let i = 0; i < diffBlocks.value.length; i++) {
    const block = diffBlocks.value[i]
    let top = null

    if (block.type === 'added') {
      // added 块只在右侧，用右侧编辑器位置
      if (block.rightStart < rView.state.doc.lines) {
        const pos = rView.state.doc.line(block.rightStart + 1).from
        const info = rView.lineBlockAt(pos)
        top = info.top - rView.scrollDOM.scrollTop
      }
    } else {
      // removed / modified 块用左侧编辑器位置
      if (block.leftStart < lView.state.doc.lines) {
        const pos = lView.state.doc.line(block.leftStart + 1).from
        const info = lView.lineBlockAt(pos)
        top = info.top - lView.scrollDOM.scrollTop
      }
    }

    if (top != null) {
      positions.push({ top, blockIdx: i, type: block.type })
    }
  }

  mergePositions.value = positions
}

// ---- Diff computation (debounced) ----
let diffTimer = null
watch([leftText, rightText], () => {
  clearTimeout(diffTimer)
  diffTimer = setTimeout(() => {
    if (!leftText.value && !rightText.value) {
      diffBlocks.value = []
      clearDecorations()
      mergePositions.value = []
      return
    }
    const blocks = computeDiff(leftText.value, rightText.value)
    diffBlocks.value = blocks
    currentDiffIndex.value = blocks.length ? 0 : -1
    applyDecorations(blocks)
    updateCurrentBlockHighlight(currentDiffIndex.value)
    nextTick(() => computeMergePositions())
  }, 300)
})

// ---- 当前选中块高亮 ----
watch(currentDiffIndex, (idx) => {
  updateCurrentBlockHighlight(idx)
})

function updateCurrentBlockHighlight(idx) {
  const lView = leftView.value
  const rView = rightView.value
  if (!lView || !rView) return

  const leftDecos = []
  const rightDecos = []

  if (idx >= 0 && idx < diffBlocks.value.length) {
    const block = diffBlocks.value[idx]
    if (block.type !== 'added') {
      for (let i = block.leftStart; i < block.leftEnd; i++) {
        addLineDeco(leftDecos, lView, i, currentBlockDeco)
      }
    }
    if (block.type !== 'removed') {
      for (let i = block.rightStart; i < block.rightEnd; i++) {
        addLineDeco(rightDecos, rView, i, currentBlockDeco)
      }
    }
  }

  lView.dispatch({ effects: leftCurrentDeco.effect.of(Decoration.set(leftDecos, true)) })
  rView.dispatch({ effects: rightCurrentDeco.effect.of(Decoration.set(rightDecos, true)) })
}

// ---- Apply decorations ----
function applyDecorations(blocks) {
  const lView = leftView.value
  const rView = rightView.value
  if (!lView || !rView) return

  const leftDecos = []
  const rightDecos = []

  for (const block of blocks) {
    if (block.type === 'removed') {
      for (let i = block.leftStart; i < block.leftEnd; i++) {
        addLineDeco(leftDecos, lView, i, removedLineDeco)
      }
    } else if (block.type === 'added') {
      for (let i = block.rightStart; i < block.rightEnd; i++) {
        addLineDeco(rightDecos, rView, i, addedLineDeco)
      }
    } else if (block.type === 'modified') {
      for (let i = block.leftStart; i < block.leftEnd; i++) {
        addLineDeco(leftDecos, lView, i, modifiedLineDeco)
      }
      for (let i = block.rightStart; i < block.rightEnd; i++) {
        addLineDeco(rightDecos, rView, i, modifiedLineDeco)
      }
      // Character-level highlights
      const maxPairs = Math.min(block.leftLines.length, block.rightLines.length)
      for (let j = 0; j < maxPairs; j++) {
        const charDiffs = computeCharDiff(block.leftLines[j], block.rightLines[j])
        let leftOffset = getLineStart(lView, block.leftStart + j)
        let rightOffset = getLineStart(rView, block.rightStart + j)

        for (const cd of charDiffs) {
          if (cd.type === 'removed') {
            if (cd.value.length > 0) {
              leftDecos.push(charRemovedMark.range(leftOffset, leftOffset + cd.value.length))
            }
            leftOffset += cd.value.length
          } else if (cd.type === 'added') {
            if (cd.value.length > 0) {
              rightDecos.push(charAddedMark.range(rightOffset, rightOffset + cd.value.length))
            }
            rightOffset += cd.value.length
          } else {
            leftOffset += cd.value.length
            rightOffset += cd.value.length
          }
        }
      }
    }
  }

  lView.dispatch({ effects: leftDeco.effect.of(Decoration.set(leftDecos, true)) })
  rView.dispatch({ effects: rightDeco.effect.of(Decoration.set(rightDecos, true)) })
}

function addLineDeco(decos, view, lineIdx, deco) {
  if (lineIdx >= view.state.doc.lines) return
  const line = view.state.doc.line(lineIdx + 1)
  decos.push(deco.range(line.from))
}

function getLineStart(view, lineIdx) {
  if (lineIdx >= view.state.doc.lines) return view.state.doc.length
  return view.state.doc.line(lineIdx + 1).from
}

function clearDecorations() {
  leftView.value?.dispatch({
    effects: [
      leftDeco.effect.of(Decoration.none),
      leftCurrentDeco.effect.of(Decoration.none),
    ]
  })
  rightView.value?.dispatch({
    effects: [
      rightDeco.effect.of(Decoration.none),
      rightCurrentDeco.effect.of(Decoration.none),
    ]
  })
}

// ---- Editor content helpers ----
function setEditorContent(view, text) {
  if (!view) return
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
  })
}

// ---- File operations ----
async function openFile(side) {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')

    const path = await open({
      multiple: false,
      filters: [{ name: t('fileDiff.allFiles'), extensions: ['*'] }],
    })
    if (!path) return

    const bytes = await readFile(path)
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
    } catch {
      text = new TextDecoder('gbk').decode(new Uint8Array(bytes))
    }

    if (side === 'left') {
      leftPath.value = path
      leftModified.value = false
      setEditorContent(leftView.value, text)
    } else {
      rightPath.value = path
      rightModified.value = false
      setEditorContent(rightView.value, text)
    }
  } catch (e) {
    ElMessage.error(`${t('fileDiff.openFailed')}: ${e.message || e}`)
  }
}

async function saveFile(side) {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    const text = side === 'left' ? leftText.value : rightText.value
    if (!text) return

    let filePath = side === 'left' ? leftPath.value : rightPath.value

    if (!filePath) {
      filePath = await save({
        filters: [{ name: t('fileDiff.allFiles'), extensions: ['*'] }],
      })
      if (!filePath) return
    }

    await writeFile(filePath, new TextEncoder().encode(text))

    if (side === 'left') {
      leftPath.value = filePath
      leftModified.value = false
    } else {
      rightPath.value = filePath
      rightModified.value = false
    }
    ElMessage.success(t('fileDiff.saved'))
  } catch (e) {
    ElMessage.error(`${t('fileDiff.saveFailed')}: ${e.message || e}`)
  }
}

async function doExportDiff() {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    const patch = exportPatch(
      leftPath.value || 'original',
      rightPath.value || 'modified',
      leftText.value,
      rightText.value
    )
    const filePath = await save({
      defaultPath: 'changes.diff',
      filters: [{ name: 'Diff files', extensions: ['diff', 'patch'] }],
    })
    if (!filePath) return

    await writeFile(filePath, new TextEncoder().encode(patch))
    ElMessage.success(t('fileDiff.exported'))
  } catch (e) {
    ElMessage.error(`${e.message || e}`)
  }
}

// ---- Navigation ----
function goToDiff(direction) {
  if (!diffBlocks.value.length) return
  let idx = currentDiffIndex.value + direction
  if (idx < 0) idx = diffBlocks.value.length - 1
  if (idx >= diffBlocks.value.length) idx = 0
  currentDiffIndex.value = idx

  const block = diffBlocks.value[idx]
  if (block.leftStart != null) scrollToLine(leftView.value, block.leftStart)
  if (block.rightStart != null) scrollToLine(rightView.value, block.rightStart)
}

function scrollToLine(view, lineIdx) {
  if (!view || lineIdx >= view.state.doc.lines) return
  const line = view.state.doc.line(lineIdx + 1)
  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
  })
}

// ---- Merge ----
function doMerge(blockIdx, direction) {
  const block = diffBlocks.value[blockIdx]
  if (!block) return

  currentDiffIndex.value = blockIdx

  if (direction === 'left-to-right') {
    const newRight = mergeBlock(block, leftText.value, rightText.value, direction)
    setEditorContent(rightView.value, newRight)
    rightModified.value = true
  } else {
    const newLeft = mergeBlock(block, leftText.value, rightText.value, direction)
    setEditorContent(leftView.value, newLeft)
    leftModified.value = true
  }
}

// ---- Swap sides ----
function swapSides() {
  const tmpText = leftText.value
  const tmpPath = leftPath.value
  const tmpMod = leftModified.value

  setEditorContent(leftView.value, rightText.value)
  setEditorContent(rightView.value, tmpText)

  leftPath.value = rightPath.value
  rightPath.value = tmpPath
  leftModified.value = rightModified.value
  rightModified.value = tmpMod
}

// ---- Helpers ----
function getFileName(path) {
  if (!path) return ''
  return path.replace(/\\/g, '/').split('/').pop()
}
</script>

<style scoped>
.file-diff-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

/* ---- Header ---- */
.header {
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 46px;
  box-sizing: border-box;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 16px; color: var(--text-secondary); }
.breadcrumb-link {
  cursor: pointer;
  color: var(--accent-blue);
  transition: opacity var(--transition-fast);
}
.breadcrumb-link:hover { text-decoration: underline; opacity: 0.85; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

/* ---- Toolbar ---- */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
}
.toolbar-sep-sm {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 2px;
}
.toolbar-spacer { flex: 1; }

.diff-nav {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}
.diff-pos {
  min-width: 42px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.merge-tb-btn {
  font-weight: 700 !important;
  font-size: 14px !important;
  width: 28px;
  min-width: 28px;
}

/* ---- File name bar ---- */
.file-name-bar {
  display: flex;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}
.file-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}
.file-name:hover { background: var(--bg-tertiary); }
.file-name.left { border-right: 1px solid var(--border-color); }

.file-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.removed-tag {
  background: rgba(248,81,73,0.12);
  color: #f85149;
}
.added-tag {
  background: rgba(46,160,67,0.12);
  color: #2ea043;
}

.file-label {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modified-dot {
  color: #f59e0b;
  font-size: 12px;
  flex-shrink: 0;
}
.line-count {
  margin-left: auto;
  color: var(--text-quaternary);
  font-size: 10.5px;
  flex-shrink: 0;
}

/* ---- Editor container ---- */
.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.editor-pane {
  flex: 1;
  overflow: hidden;
  background: var(--bg-primary);
}
.left-pane { border-right: 1px solid var(--border-color); }
.right-pane { border-left: 1px solid var(--border-color); }

.editor-mount {
  height: 100%;
  width: 100%;
}
.editor-mount :deep(.cm-editor) {
  height: 100%;
  outline: none !important;
}
.editor-mount :deep(.cm-editor.cm-focused) { outline: none !important; }

/* Scrollbar */
.editor-mount :deep(.cm-scroller) {
  scrollbar-width: thin;
  scrollbar-color: var(--text-quaternary) transparent;
}
.editor-mount :deep(.cm-scroller::-webkit-scrollbar) { width: 7px; height: 7px; }
.editor-mount :deep(.cm-scroller::-webkit-scrollbar-track) { background: transparent; }
.editor-mount :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--text-quaternary);
  border-radius: 4px;
}
.editor-mount :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: var(--text-tertiary);
}

/* Gutter polish */
.editor-mount :deep(.cm-gutters) {
  padding-left: 4px;
}

/* ---- 中间合并按钮栏 ---- */
.merge-gutter {
  position: relative;
  width: 36px;
  min-width: 36px;
  background: var(--bg-secondary);
  overflow: hidden;
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
}

.merge-btn-pair {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 2px 0;
  z-index: 1;
  transition: opacity 0.15s;
}

.mg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  background: var(--bg-primary);
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
  transition: all 0.15s;
  padding: 0;
}
.mg-btn:hover {
  background: var(--accent-blue);
  color: #fff;
  border-color: var(--accent-blue);
}

/* 按差异类型着色 */
.merge-btn-pair.t-added .mg-btn { border-color: rgba(46,160,67,0.4); color: #2ea043; }
.merge-btn-pair.t-removed .mg-btn { border-color: rgba(248,81,73,0.4); color: #f85149; }
.merge-btn-pair.t-modified .mg-btn { border-color: rgba(210,153,34,0.4); color: #d29922; }

.merge-btn-pair.t-added .mg-btn:hover,
.merge-btn-pair.t-removed .mg-btn:hover,
.merge-btn-pair.t-modified .mg-btn:hover {
  background: var(--accent-blue);
  color: #fff;
  border-color: var(--accent-blue);
}

/* 当前选中块的按钮高亮 */
.merge-btn-pair.current .mg-btn {
  background: var(--accent-blue-bg, rgba(64,158,255,0.1));
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

/* ---- Status bar ---- */
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  font-size: 11.5px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.badge-total {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.badge-added {
  background: rgba(46,160,67,0.12);
  color: #2ea043;
}
.badge-removed {
  background: rgba(248,81,73,0.12);
  color: #f85149;
}
.badge-modified {
  background: rgba(210,153,34,0.12);
  color: #d29922;
}

.status-same {
  color: #2ea043;
  font-weight: 500;
}
.status-spacer { flex: 1; }
.status-hint {
  color: var(--text-quaternary);
  font-size: 10.5px;
}
</style>
