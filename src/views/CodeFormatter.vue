<template>
  <div class="code-fmt-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Brush /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('codeFormatter.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <el-select v-model="selectedLang" size="small" class="lang-select" :placeholder="t('codeFormatter.autoDetect')">
          <el-option :label="t('codeFormatter.autoDetect')" value="auto" />
          <el-option v-for="(cfg, key) in LANGUAGES" :key="key" :label="cfg.label" :value="key" />
        </el-select>

        <el-select v-model="tabWidth" size="small" class="tab-select">
          <el-option label="2 spaces" :value="2" />
          <el-option label="4 spaces" :value="4" />
        </el-select>
      </div>

      <div class="toolbar-group">
        <el-button size="small" type="primary" class="toolbar-primary-btn" @click="doFormat" :loading="formatting" :disabled="!canFormat">
          {{ t('codeFormatter.format') }}
        </el-button>
        <el-button size="small" class="toolbar-secondary-btn" @click="doMinify" :disabled="!canMinify">
          {{ t('codeFormatter.minify') }}
        </el-button>
      </div>

      <div class="toolbar-spacer"></div>

      <div class="toolbar-group">
        <el-button size="small" text class="toolbar-icon-btn" @click="doCopy" :disabled="!code.trim()">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button size="small" text class="toolbar-icon-btn" @click="doClear" :disabled="!code.trim()">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 编辑器 -->
    <div class="editor-area" ref="editorContainer"></div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span class="status-lang">{{ activeLangLabel }}</span>
      <span class="status-sep">·</span>
      <span>{{ lineCount }} {{ t('codeFormatter.lines') }}</span>
      <span v-if="statusMsg" class="status-sep">·</span>
      <span v-if="statusMsg" class="status-msg" :class="statusType">{{ statusMsg }}</span>
      <span class="status-spacer"></span>
      <span class="status-hint">{{ canFormat ? t('codeFormatter.formatHint') : '' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Brush, CopyDocument, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'

import {
  LANGUAGES, detectLanguage, getLanguageExtension,
  formatCode, minifyCode,
} from '@/utils/codeFormatter'

const router = useRouter()

// ---- 状态 ----
const selectedLang = ref('auto')
const tabWidth = ref(2)
const formatting = ref(false)
const statusMsg = ref('')
const statusType = ref('ok')
const editorContainer = ref(null)

const editorView = shallowRef(null)
const langCompartment = new Compartment()
const themeCompartment = new Compartment()

// 内部标记：setEditorContent 触发的 docChanged 不清空状态消息
let suppressStatusClear = false

const code = ref('')
const lineCount = computed(() => code.value ? code.value.split('\n').length : 0)

const activeLang = computed(() => {
  if (selectedLang.value !== 'auto') return selectedLang.value
  return detectLanguage(code.value)
})

const activeLangLabel = computed(() => LANGUAGES[activeLang.value]?.label || activeLang.value)
const canFormat = computed(() => !!LANGUAGES[activeLang.value]?.formatter && !!code.value.trim())
const canMinify = computed(() => !!LANGUAGES[activeLang.value]?.minify && !!code.value.trim())

// ---- 浅色主题 ----
const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-quaternary)',
    borderRight: '1px solid var(--border-color)', minWidth: '44px',
  },
  '.cm-gutterElement': { padding: '0 10px 0 6px' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  '.cm-activeLine': { backgroundColor: 'rgba(64, 158, 255, 0.05)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(64, 158, 255, 0.15) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent-blue)', borderLeftWidth: '2px' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(64, 158, 255, 0.2)', color: 'inherit !important', outline: 'none' },
  '.cm-foldGutter .cm-gutterElement': { cursor: 'pointer', color: 'var(--text-quaternary)', padding: '0 4px' },
  '.cm-foldPlaceholder': {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    color: 'var(--text-tertiary)', borderRadius: '4px', padding: '1px 8px', margin: '0 4px',
    fontSize: '12px',
  },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(64, 158, 255, 0.2) !important' },
  '.cm-line': { padding: '0 10px' },
})

// ---- 编辑器初始化 ----
const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

onMounted(async () => {
  const langExt = await getLanguageExtension(activeLang.value) || []

  // Ctrl+S 触发格式化
  const formatKeymap = keymap.of([{
    key: 'Ctrl-s',
    run: () => { if (canFormat.value) doFormat(); return true },
  }])

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
      formatKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      langCompartment.of(langExt ? [langExt] : []),
      themeCompartment.of(isDark.value ? oneDark : lightTheme),
      EditorView.lineWrapping,
      cmPlaceholder(t('codeFormatter.placeholder')),
      EditorView.theme({
        '&': {
          fontSize: '14.5px',
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
          lineHeight: '1.7',
        },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content': { padding: '12px 0' },
        '.cm-placeholder': { color: 'var(--text-quaternary)', fontStyle: 'italic' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          code.value = update.state.doc.toString()
          if (!suppressStatusClear) statusMsg.value = ''
        }
      }),
    ],
  })

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  })

  // 监听主题变化
  themeObserver = new MutationObserver(() => {
    if (!editorView.value) return
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    editorView.value.dispatch({
      effects: themeCompartment.reconfigure(dark ? oneDark : lightTheme),
    })
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

let themeObserver = null

onBeforeUnmount(() => {
  editorView.value?.destroy()
  if (themeObserver) themeObserver.disconnect()
})

watch(activeLang, async (lang) => {
  if (!editorView.value) return
  const ext = await getLanguageExtension(lang)
  editorView.value.dispatch({
    effects: langCompartment.reconfigure(ext ? [ext] : []),
  })
})

// ---- 操作 ----
function setEditorContent(text) {
  const view = editorView.value
  if (!view) return
  suppressStatusClear = true
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
  })
  suppressStatusClear = false
}

async function doFormat() {
  formatting.value = true
  try {
    const result = await formatCode(code.value, activeLang.value, { tabWidth: tabWidth.value })
    setEditorContent(result)
    statusMsg.value = t('codeFormatter.formatSuccess')
    statusType.value = 'ok'
  } catch (e) {
    statusMsg.value = `${t('codeFormatter.formatError')}: ${e.message || e}`
    statusType.value = 'err'
  } finally {
    formatting.value = false
  }
}

function doMinify() {
  try {
    const result = minifyCode(code.value, activeLang.value)
    setEditorContent(result)
    statusMsg.value = t('codeFormatter.minifySuccess')
    statusType.value = 'ok'
  } catch (e) {
    statusMsg.value = `${t('codeFormatter.minifyError')}: ${e.message || e}`
    statusType.value = 'err'
  }
}

async function doCopy() {
  try {
    await writeText(code.value)
    ElMessage.success(t('codeFormatter.copied'))
  } catch {
    ElMessage.error(t('codeFormatter.copyFail'))
  }
}

function doClear() {
  setEditorContent('')
  statusMsg.value = ''
}
</script>

<style scoped>
.code-fmt-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: var(--surface-panel);
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

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); transition: opacity 0.15s; }
.breadcrumb-link:hover { text-decoration: underline; opacity: 0.85; }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }

/* 工具栏：去除卡片，仅留底部分割线 */
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

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.toolbar-group :deep(.el-button),
.toolbar-group :deep(.el-select) { --el-border-radius-base: 8px; }
.toolbar-group :deep(.el-select__wrapper) {
  background: var(--surface-panel-soft);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.toolbar-group :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1px var(--accent-blue);
}
.toolbar-primary-btn :deep(span),
.toolbar-secondary-btn :deep(span) {
  font-weight: 600;
}
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
.toolbar-spacer { flex: 1; }
.lang-select { width: 136px; }
.tab-select { width: 104px; }

/* 编辑区：去除卡片外壳，让 codemirror 占满 */
.editor-area {
  flex: 1;
  overflow: hidden;
  background: var(--surface-muted);
}

.editor-area :deep(.cm-editor) {
  height: 100%;
  outline: none !important;
  background: transparent;
  border-radius: 0;
}

.editor-area :deep(.cm-editor.cm-focused) { outline: none !important; }
.editor-area :deep(.cm-scroller) {
  scrollbar-width: thin;
  scrollbar-color: var(--text-quaternary) transparent;
}
.editor-area :deep(.cm-scroller::-webkit-scrollbar) { width: 7px; height: 7px; }
.editor-area :deep(.cm-scroller::-webkit-scrollbar-track) { background: transparent; }
.editor-area :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--text-quaternary);
  border-radius: 4px;
}
.editor-area :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) { background: var(--text-tertiary); }
.editor-area :deep(.cm-gutters) { padding-left: 4px; }

/* 状态栏：去除卡片，简单分割线 */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 11.5px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
}

.status-lang {
  display: inline-flex;
  align-items: center;
  padding: 0;
  font-weight: 700;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}
.status-sep { color: rgba(60, 40, 20, 0.18); }
.status-msg {
  display: inline-flex;
  align-items: center;
  padding: 0;
  font-weight: 600;
  background: transparent;
  border: 0;
}
.status-msg.ok { color: var(--el-color-success); }
.status-msg.err { color: var(--el-color-danger); }
.status-spacer { flex: 1; }
.status-hint { color: var(--text-quaternary); font-size: 10.5px; }
</style>
