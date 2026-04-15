<template>
  <div class="regex-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><EditPen /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('regexTester.title') }}</span>
          </div>
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
          <el-button size="small" class="toolbar-secondary-btn">
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
        <el-button size="small" text class="toolbar-icon-btn" @click="doClear">
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

const REGEX_TIMEOUT_MS = 2000

const matches = ref([])
let matchTimer = null

function runMatch() {
  if (!pattern.value || !testText.value || regexError.value) {
    matches.value = []
    execTime.value = null
    return
  }

  try {
    const re = new RegExp(pattern.value, flagsStr.value)
    const results = []
    const t0 = performance.now()

    if (re.global) {
      let m
      let safety = 0
      while ((m = re.exec(testText.value)) !== null && safety < 10000) {
        if (performance.now() - t0 > REGEX_TIMEOUT_MS) break
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
    matches.value = results
  } catch {
    matches.value = []
  }
}

watch([pattern, () => testText.value, flagsStr], () => {
  clearTimeout(matchTimer)
  matchTimer = setTimeout(runMatch, 300)
}, { immediate: true })

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
.toolbar-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.toolbar-spacer { flex: 1; }
.toolbar-group :deep(.el-button) { --el-border-radius-base: 10px; }
.toolbar-secondary-btn :deep(span) {
  font-weight: 600;
}
.toolbar-secondary-btn:not(.is-disabled) {
  background: rgba(248,250,252,0.9);
  border-color: rgba(15, 23, 42, 0.08);
  color: var(--text-primary);
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
.flags-group :deep(.el-checkbox-button__inner) {
  padding: 4px 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background: rgba(248,250,252,0.92);
  border-color: rgba(15, 23, 42, 0.08);
}
.flags-group :deep(.el-checkbox-button.is-checked .el-checkbox-button__inner) {
  background: rgba(64, 158, 255, 0.12);
  border-color: rgba(64, 158, 255, 0.5);
  color: var(--accent-blue);
  box-shadow: none;
}
.preset-hint {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-quaternary);
  font-family: 'Consolas', monospace;
}

.regex-input-area {
  margin: 14px 18px 0;
  padding: 14px 16px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 24px rgba(15,23,42,0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.regex-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(248,250,252,0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 0 12px;
  min-height: 40px;
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
.replace-row { display: flex; align-items: center; gap: 8px; }
.replace-label {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 40px;
}
.replace-field {
  flex: 1;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  outline: none;
  background: rgba(248,250,252,0.9);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 10px;
  height: 34px;
  box-sizing: border-box;
}
.replace-field:focus { border-color: var(--accent-blue); }
.regex-error {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: 24px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.16);
  border-radius: 999px;
}

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  padding: 14px 18px 0;
  gap: 0;
}
.text-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
}
.result-panel {
  width: 340px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, rgba(248,250,252,0.94), rgba(241,245,249,0.98));
}
.panel-header {
  padding: 10px 16px;
  font-size: var(--font-size-caption);
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.64);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.text-container { flex: 1; position: relative; overflow: hidden; }
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
  background: transparent;
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
.text-input::placeholder { color: var(--text-quaternary); }

.result-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
.no-match {
  margin: 16px;
  padding: 18px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(248,250,252,0.9));
}
.match-item {
  margin: 0 12px 10px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248,250,252,0.92));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
}
.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.match-index { font-size: 12px; font-weight: 700; color: var(--accent-blue); }
.match-range {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
  color: var(--text-quaternary);
  font-family: 'Consolas', monospace;
  background: rgba(248,250,252,0.94);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 999px;
}
.match-text {
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: rgba(248,250,252,0.94);
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  word-break: break-all;
  margin-bottom: 8px;
}
.match-group { font-size: 12px; padding: 5px 0 5px 12px; color: var(--text-tertiary); border-top: 1px dashed rgba(15, 23, 42, 0.06); }
.match-group:first-of-type { border-top: none; }
.group-label { color: var(--text-secondary); margin-right: 4px; font-weight: 600; }
.group-value { font-family: 'Consolas', monospace; color: var(--text-primary); }
.replace-divider {
  padding: 10px 16px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  margin-top: 6px;
}
.replace-result {
  padding: 12px 16px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248,250,252,0.92));
  margin: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

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
.status-sep { margin: 0 8px; }
.status-spacer { flex: 1; }
.status-hint { color: var(--text-quaternary); }

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
  background: var(--text-quaternary);
  border-radius: 3px;
}

@media (max-width: 980px) {
  .main-area {
    flex-direction: column;
    gap: 12px;
  }

  .text-panel,
  .result-panel {
    width: 100%;
    min-width: 0;
    border-radius: 18px;
    border: 1px solid rgba(15, 23, 42, 0.08);
  }

  .status-bar {
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px;
  }
}
</style>
