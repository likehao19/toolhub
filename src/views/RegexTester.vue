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

const PRESETS = computed(() => [
  { name: t('regexTester.presetEmail'),   regex: '[\\w.-]+@[\\w.-]+\\.\\w+',                              flags: ['g'],      sample: t('regexTester.sampleEmail') },
  { name: t('regexTester.presetPhone'),   regex: '1[3-9]\\d{9}',                                          flags: ['g'],      sample: t('regexTester.samplePhone') },
  { name: t('regexTester.presetUrl'),     regex: 'https?://[\\w.-]+(?:/[\\w./?#&=-]*)?',                  flags: ['g'],      sample: t('regexTester.sampleUrl') },
  { name: t('regexTester.presetIpv4'),    regex: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',             flags: ['g'],      sample: t('regexTester.sampleIpv4') },
  { name: t('regexTester.presetDate'),    regex: '\\d{4}-\\d{2}-\\d{2}',                                  flags: ['g'],      sample: t('regexTester.sampleDate') },
  { name: t('regexTester.presetHtmlTag'), regex: '<([a-z][a-z0-9]*)\\b[^>]*>(.*?)</\\1>',                 flags: ['g', 'i'], sample: t('regexTester.sampleHtml') },
  { name: t('regexTester.presetChinese'), regex: '[\\u4e00-\\u9fa5]+',                                    flags: ['g'],      sample: t('regexTester.sampleChinese') },
  { name: t('regexTester.presetHex'),     regex: '#[0-9a-fA-F]{3,8}',                                     flags: ['g'],      sample: t('regexTester.sampleHex') },
])

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
  const p = PRESETS.value[index]
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
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
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
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: var(--text-primary);
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
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.toolbar-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.toolbar-spacer { flex: 1; }
.toolbar-group :deep(.el-button) { --el-border-radius-base: 8px; }
.toolbar-secondary-btn :deep(span) { font-weight: 600; }
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
.flags-group :deep(.el-checkbox-button__inner) {
  padding: 4px 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(60, 40, 20, 0.12);
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

/* 正则输入区：去除卡片外壳，保留输入框边框 */
.regex-input-area {
  padding: 12px 18px;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.regex-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  padding: 0 12px;
  min-height: 38px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.regex-row:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(47, 111, 228, 0.1);
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
  border: 1px solid rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 10px;
  height: 34px;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.replace-field:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(47, 111, 228, 0.1);
}
.regex-error {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 2px 0;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  background: transparent;
  border: 0;
  border-radius: 0;
}

/* 主区：左右两栏用 border-right 分割 */
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  gap: 0;
}
.text-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid rgba(60, 40, 20, 0.1);
  background: transparent;
}
.result-panel {
  width: 340px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: transparent;
}
.panel-header {
  padding: 8px 16px;
  font-size: var(--font-size-caption);
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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

.result-scroll { flex: 1; overflow-y: auto; padding: 0; }
.no-match {
  margin: 16px;
  padding: 20px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  border: 1px dashed rgba(60, 40, 20, 0.14);
  border-radius: 8px;
  background: transparent;
}

/* 匹配项：去除卡片，分割线分隔 */
.match-item {
  margin: 0;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  background: transparent;
}
.match-item:hover {
  background: rgba(60, 40, 20, 0.025);
}
.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.match-index { font-size: 12px; font-weight: 700; color: var(--accent-blue); }
.match-range {
  font-size: 11px;
  color: var(--text-quaternary);
  font-family: 'Consolas', monospace;
}
.match-text {
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: rgba(60, 40, 20, 0.04);
  padding: 6px 10px;
  border-radius: 4px;
  border: 0;
  word-break: break-all;
  margin-bottom: 6px;
}
.match-group {
  font-size: 12px;
  padding: 4px 0 4px 12px;
  color: var(--text-tertiary);
  border-top: 1px dashed rgba(60, 40, 20, 0.08);
}
.match-group:first-of-type { border-top: none; }
.group-label { color: var(--text-secondary); margin-right: 4px; font-weight: 600; }
.group-value { font-family: 'Consolas', monospace; color: var(--text-primary); }

.replace-divider {
  padding: 10px 16px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  border-top: 1px solid rgba(60, 40, 20, 0.08);
}
.replace-result {
  padding: 10px 16px 14px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  background: transparent;
  margin: 0;
  border-radius: 0;
  border: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.status-bar {
  display: flex;
  align-items: center;
  padding: 0 18px;
  height: 30px;
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
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
  }

  .text-panel {
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  }

  .text-panel,
  .result-panel {
    width: 100%;
    min-width: 0;
  }
}
</style>
