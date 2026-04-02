<template>
  <div class="regex-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><EditPen /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('regexTester.title') }}</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group flags-group">
        <span class="toolbar-label">Flags:</span>
        <el-checkbox-group v-model="flags" size="small">
          <el-checkbox-button v-for="f in FLAG_OPTIONS" :key="f.value" :value="f.value">
            {{ f.label }}
          </el-checkbox-button>
        </el-checkbox-group>
      </div>
      <div class="toolbar-group">
        <el-dropdown trigger="click" @command="applyPreset">
          <el-button size="small">
            {{ t('regexTester.presets') }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(p, i) in PRESETS" :key="i" :command="i">
                {{ p.name }}
                <span class="preset-hint">{{ p.regex }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <el-button size="small" text @click="doClear">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 正则 + 替换输入行 -->
    <div class="regex-input-area">
      <div class="regex-row">
        <span class="regex-slash">/</span>
        <input
          v-model="pattern"
          class="regex-field"
          :placeholder="t('regexTester.patternPlaceholder')"
          spellcheck="false"
        />
        <span class="regex-slash">/{{ flagsStr }}</span>
      </div>
      <div class="replace-row">
        <span class="replace-label">{{ t('regexTester.replace') }}:</span>
        <input
          v-model="replaceStr"
          class="replace-field"
          :placeholder="t('regexTester.replacePlaceholder')"
          spellcheck="false"
        />
      </div>
      <div class="regex-error" v-if="regexError">{{ regexError }}</div>
    </div>

    <!-- 主体 -->
    <div class="main-area">
      <!-- 左侧：测试文本 -->
      <div class="text-panel">
        <div class="panel-header">{{ t('regexTester.testText') }}</div>
        <div class="text-container">
          <div class="highlight-layer" v-html="highlightedHtml"></div>
          <textarea
            v-model="testText"
            class="text-input"
            :placeholder="t('regexTester.textPlaceholder')"
            spellcheck="false"
            @scroll="syncScroll"
            ref="textareaRef"
          ></textarea>
        </div>
      </div>

      <!-- 右侧：匹配结果 -->
      <div class="result-panel">
        <div class="panel-header">{{ t('regexTester.matches') }} ({{ matches.length }})</div>
        <div class="result-scroll">
          <div v-if="matches.length === 0 && !regexError && pattern" class="no-match">
            {{ t('regexTester.noMatch') }}
          </div>
          <div v-for="(m, i) in matches" :key="i" class="match-item">
            <div class="match-header">
              <span class="match-index">Match {{ i + 1 }}</span>
              <span class="match-range">[{{ m.index }}–{{ m.end }}]</span>
            </div>
            <div class="match-text">"{{ m.text }}"</div>
            <div v-for="(g, gi) in m.groups" :key="gi" class="match-group">
              <span class="group-label">Group {{ gi + 1 }}{{ g.name ? ` (${g.name})` : '' }}:</span>
              <span class="group-value">"{{ g.value ?? '' }}"</span>
            </div>
          </div>

          <!-- 替换预览 -->
          <template v-if="replaceStr !== '' && matches.length > 0">
            <div class="replace-divider">{{ t('regexTester.replacePreview') }}</div>
            <div class="replace-result">{{ replaceResult }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span>{{ t('regexTester.matchCount') }}: {{ matches.length }}</span>
      <span class="status-sep" v-if="execTime !== null">·</span>
      <span v-if="execTime !== null">{{ t('regexTester.execTime') }}: {{ execTime }}ms</span>
      <span class="status-spacer"></span>
      <span class="status-hint">{{ t('regexTester.hint') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { EditPen, Delete, ArrowDown } from '@element-plus/icons-vue'
import { t } from '@/i18n'

const router = useRouter()

// ---- constants ----
const FLAG_OPTIONS = [
  { label: 'g', value: 'g' },
  { label: 'i', value: 'i' },
  { label: 'm', value: 'm' },
  { label: 's', value: 's' },
  { label: 'u', value: 'u' },
]

const PRESETS = [
  { name: '邮箱 Email', regex: '[\\w.-]+@[\\w.-]+\\.\\w+', flags: ['g'], sample: 'user@example.com 测试 test@test.cn' },
  { name: '手机号 Phone', regex: '1[3-9]\\d{9}', flags: ['g'], sample: '联系方式：13812345678 或 15900001111' },
  { name: 'URL', regex: 'https?://[\\w.-]+(?:/[\\w./?#&=-]*)?', flags: ['g'], sample: '访问 https://example.com/path?q=1 或 http://test.cn' },
  { name: 'IPv4', regex: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', flags: ['g'], sample: '服务器 192.168.1.1 和 10.0.0.1' },
  { name: '日期 Date', regex: '\\d{4}-\\d{2}-\\d{2}', flags: ['g'], sample: '日期：2026-03-26 和 2025-12-31' },
  { name: 'HTML 标签', regex: '<([a-z][a-z0-9]*)\\b[^>]*>(.*?)</\\1>', flags: ['g', 'i'], sample: '<div class="a">hello</div> <span>world</span>' },
  { name: '中文 Chinese', regex: '[\\u4e00-\\u9fa5]+', flags: ['g'], sample: 'Hello 你好世界 Test 测试文字' },
  { name: '十六进制颜色 Hex', regex: '#[0-9a-fA-F]{3,8}', flags: ['g'], sample: '颜色：#fff #00aaff #123456' },
]

// ---- state ----
const pattern = ref('')
const flags = ref(['g'])
const testText = ref('')
const replaceStr = ref('')
const textareaRef = ref(null)
const execTime = ref(null)

// ---- computed ----
const flagsStr = computed(() => flags.value.join(''))

const regexError = computed(() => {
  if (!pattern.value) return ''
  try {
    new RegExp(pattern.value, flagsStr.value)
    return ''
  } catch (e) {
    return e.message
  }
})

const matches = computed(() => {
  if (!pattern.value || !testText.value || regexError.value) return []

  try {
    const re = new RegExp(pattern.value, flagsStr.value)
    const results = []
    const t0 = performance.now()

    if (re.global) {
      let m
      let safety = 0
      while ((m = re.exec(testText.value)) !== null && safety < 10000) {
        // prevent infinite loop on zero-length matches
        if (m[0].length === 0) { re.lastIndex++; safety++; continue }
        const groups = []
        for (let i = 1; i < m.length; i++) {
          groups.push({ name: m.groups ? Object.keys(m.groups).find(k => m.groups[k] === m[i]) : null, value: m[i] })
        }
        results.push({ text: m[0], index: m.index, end: m.index + m[0].length, groups })
        safety++
      }
    } else {
      const m = re.exec(testText.value)
      if (m) {
        const groups = []
        for (let i = 1; i < m.length; i++) {
          groups.push({ name: m.groups ? Object.keys(m.groups).find(k => m.groups[k] === m[i]) : null, value: m[i] })
        }
        results.push({ text: m[0], index: m.index, end: m.index + m[0].length, groups })
      }
    }

    execTime.value = (performance.now() - t0).toFixed(1)
    return results
  } catch {
    return []
  }
})

const highlightedHtml = computed(() => {
  const text = testText.value
  if (!text) return ''
  if (!matches.value.length) return escapeHtml(text)

  const colors = ['#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5', '#c4b5fd', '#fbcfe8']
  let html = ''
  let lastEnd = 0

  for (let i = 0; i < matches.value.length; i++) {
    const m = matches.value[i]
    if (m.index < lastEnd) continue
    html += escapeHtml(text.slice(lastEnd, m.index))
    const color = colors[i % colors.length]
    html += `<mark style="background:${color};color:#1a1a1a;border-radius:2px;">${escapeHtml(m.text)}</mark>`
    lastEnd = m.end
  }
  html += escapeHtml(text.slice(lastEnd))
  return html
})

const replaceResult = computed(() => {
  if (!pattern.value || !testText.value || regexError.value) return ''
  try {
    const re = new RegExp(pattern.value, flagsStr.value)
    return testText.value.replace(re, replaceStr.value)
  } catch {
    return ''
  }
})

// ---- helpers ----
const escapeHtml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const syncScroll = (e) => {
  const hl = e.target.previousElementSibling
  if (hl) {
    hl.scrollTop = e.target.scrollTop
    hl.scrollLeft = e.target.scrollLeft
  }
}

// ---- actions ----
const applyPreset = (index) => {
  const p = PRESETS[index]
  pattern.value = p.regex
  flags.value = [...p.flags]
  testText.value = p.sample
  replaceStr.value = ''
}

const doClear = () => {
  pattern.value = ''
  flags.value = ['g']
  testText.value = ''
  replaceStr.value = ''
  execTime.value = null
}
</script>

<style scoped>
.regex-wrapper {
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
.toolbar-label { font-size: var(--font-size-caption); color: var(--text-secondary); font-weight: 500; }
.toolbar-spacer { flex: 1; }

.flags-group :deep(.el-checkbox-button__inner) {
  padding: 4px 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.preset-hint {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-quaternary);
  font-family: 'Consolas', monospace;
}

/* ---- 正则输入区 ---- */
.regex-input-area {
  padding: 10px 16px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.regex-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 10px;
  height: 36px;
}

.regex-slash {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 15px;
  color: var(--accent-blue);
  font-weight: 600;
  user-select: none;
  flex-shrink: 0;
}

.regex-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: var(--text-primary);
  padding: 0 6px;
}

.replace-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.replace-label {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 40px;
}

.replace-field {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  outline: none;
  background: var(--bg-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 10px;
  height: 32px;
  box-sizing: border-box;
}
.replace-field:focus {
  border-color: var(--accent-blue);
}

.regex-error {
  font-size: var(--font-size-caption);
  color: #ef4444;
  padding: 2px 0;
}

/* ---- 主体 ---- */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.text-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  min-width: 0;
}

.result-panel {
  width: 340px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.panel-header {
  padding: 8px 16px;
  font-size: var(--font-size-caption);
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

/* ---- 文本 + 高亮叠加 ---- */
.text-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.highlight-layer,
.text-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: auto;
  box-sizing: border-box;
  margin: 0;
}

.highlight-layer {
  color: transparent;
  pointer-events: none;
  z-index: 0;
  background: var(--bg-primary);
}

.text-input {
  position: relative;
  z-index: 1;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  caret-color: var(--text-primary);
}

.text-input::placeholder {
  color: var(--text-quaternary);
}

/* ---- 结果列表 ---- */
.result-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.no-match {
  padding: 16px;
  text-align: center;
  color: var(--text-quaternary);
  font-size: var(--font-size-caption);
}

.match-item {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.match-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
}

.match-range {
  font-size: 11px;
  color: var(--text-quaternary);
  font-family: 'Consolas', monospace;
}

.match-text {
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  word-break: break-all;
  margin-bottom: 4px;
}

.match-group {
  font-size: 12px;
  padding: 2px 0 2px 12px;
  color: var(--text-tertiary);
}

.group-label {
  color: var(--text-secondary);
  margin-right: 4px;
}

.group-value {
  font-family: 'Consolas', monospace;
  color: var(--text-primary);
}

/* ---- 替换预览 ---- */
.replace-divider {
  padding: 10px 16px 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-color);
  margin-top: 4px;
}

.replace-result {
  padding: 8px 16px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  margin: 0 12px;
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
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
.status-sep { margin: 0 8px; }
.status-spacer { flex: 1; }
.status-hint { color: var(--text-quaternary); }

/* ---- 滚动条 ---- */
.result-scroll::-webkit-scrollbar,
.text-input::-webkit-scrollbar,
.highlight-layer::-webkit-scrollbar,
.replace-result::-webkit-scrollbar { width: 6px; }
.result-scroll::-webkit-scrollbar-track,
.text-input::-webkit-scrollbar-track,
.highlight-layer::-webkit-scrollbar-track,
.replace-result::-webkit-scrollbar-track { background: transparent; }
.result-scroll::-webkit-scrollbar-thumb,
.text-input::-webkit-scrollbar-thumb,
.highlight-layer::-webkit-scrollbar-thumb,
.replace-result::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}
</style>
