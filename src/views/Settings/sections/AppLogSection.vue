<template>
  <div v-show="active" class="settings-section app-log-section" :class="{ embedded }">
    <!-- 顶部：标题/路径 -->
    <div class="header-block">
      <div class="header-main">
        <h3 v-if="!embedded" class="group-title">{{ t('settings.appLog') }}</h3>
        <div class="path-row">
          <el-icon class="path-icon"><Document /></el-icon>
          <span class="path" :title="logPath">{{ logPath || '—' }}</span>
        </div>
        <div v-if="lastResult" class="stats-row">
          <span>
            <span class="stat-num">{{ lastResult.returned_lines }}</span>
            <span class="stat-unit">/{{ lastResult.total_lines }} {{ t('appLog.lines') }}</span>
          </span>
          <span v-if="lastResult.truncated" class="truncated-tag">{{ t('appLog.truncated') }}</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 左：搜索 + 级别芯片 -->
      <div class="toolbar-left">
        <el-input
          v-model="searchQuery"
          :placeholder="t('appLog.searchPlaceholder')"
          size="small"
          clearable
          class="search-input"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <div class="level-chips">
          <button
            v-for="lvl in levelChips"
            :key="lvl.key"
            class="level-chip"
            :class="[`chip-${lvl.key}`, { active: filterLevel === lvl.key }]"
            @click="filterLevel = filterLevel === lvl.key ? 'all' : lvl.key"
          >
            <span class="chip-dot" />
            <span class="chip-label">{{ lvl.label }}</span>
            <span class="chip-count">{{ levelCounts[lvl.key] || 0 }}</span>
          </button>
        </div>
      </div>
      <!-- 右：选项 + 操作 -->
      <div class="toolbar-right">
        <el-select v-model="tailLines" size="small" class="tail-select">
          <el-option label="200" :value="200" />
          <el-option label="500" :value="500" />
          <el-option label="1000" :value="1000" />
          <el-option label="5000" :value="5000" />
        </el-select>
        <el-tooltip :content="t('common.refresh')" placement="top">
          <el-button size="small" circle :loading="loading" @click="load">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="t('common.copy')" placement="top">
          <el-button size="small" circle :disabled="!filteredLines.length" @click="onCopy">
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="t('appLog.openDir')" placement="top">
          <el-button size="small" circle @click="onOpenDir">
            <el-icon><FolderOpened /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="t('appLog.clear')" placement="top">
          <el-button size="small" circle type="danger" plain @click="onClear">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 历史折叠 -->
    <el-collapse v-if="files.length > 1" v-model="historyExpanded" class="history-collapse">
      <el-collapse-item :title="`${t('appLog.history')} (${files.length - 1})`" name="history">
        <ul class="history-list">
          <li v-for="f in files.filter(x => !x.is_active)" :key="f.path" :title="f.path">
            <span class="hf-name">{{ f.name }}</span>
            <span class="hf-size">{{ formatBytes(f.size) }}</span>
            <span class="hf-date">{{ formatTime(f.modified_ms) }}</span>
          </li>
        </ul>
      </el-collapse-item>
    </el-collapse>

    <!-- 日志面板 -->
    <div class="log-panel">
      <!-- loading -->
      <div v-if="loading && !lastResult" class="state-block">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ t('appLog.loading') }}</span>
      </div>
      <!-- error -->
      <div v-else-if="error" class="state-block error">
        <el-icon><WarnTriangleFilled /></el-icon>
        <span>{{ error }}</span>
      </div>
      <!-- empty -->
      <div v-else-if="!filteredLines.length" class="state-block empty">
        <el-icon><InfoFilled /></el-icon>
        <span>
          {{ searchQuery
            ? t('appLog.emptySearch')
            : filterLevel === 'all'
              ? t('appLog.empty')
              : t('appLog.emptyFiltered')
          }}
        </span>
      </div>
      <!-- list -->
      <div v-else ref="logBoxRef" class="log-list" @scroll="onScroll">
        <div
          v-for="(line, idx) in filteredLines"
          :key="idx"
          class="log-row"
          :class="`lvl-${line.level}`"
        >
          <span class="row-bar" />
          <span class="row-time">{{ line.time || '—' }}</span>
          <span class="row-level">{{ line.level.toUpperCase() }}</span>
          <span v-if="line.shortTarget" class="row-target" :title="line.target">{{ line.shortTarget }}</span>
          <span class="row-message">{{ line.message || line.raw }}</span>
        </div>
      </div>

      <!-- 自动滚到底关闭时的"跳到底"浮按钮 -->
      <transition name="fade">
        <button
          v-if="!autoScroll && filteredLines.length"
          class="scroll-bottom-fab"
          @click="scrollToBottomManual"
        >
          <el-icon><ArrowDown /></el-icon>
          <span>{{ t('appLog.jumpBottom') }}</span>
        </button>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  DocumentCopy,
  FolderOpened,
  Delete,
  Loading,
  WarnTriangleFilled,
  InfoFilled,
  Document,
  Search,
  ArrowDown,
} from '@element-plus/icons-vue'
import { t } from '@/i18n'
import {
  getLogFilePath,
  readRecentLog,
  clearLogFile,
  listLogFiles,
  openLogDir,
  formatBytes,
  parseLogLine,
} from '@/utils/appLog'

const props = defineProps({
  active: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
})

const loading = ref(false)
const error = ref('')
const logPath = ref('')
const lastResult = ref(null)
const files = ref([])
const filterLevel = ref('all')
const tailLines = ref(1000)
const searchQuery = ref('')
const historyExpanded = ref([])
const logBoxRef = ref(null)
const autoScroll = ref(true)

const levelChips = [
  { key: 'error', label: 'ERROR' },
  { key: 'warn', label: 'WARN' },
  { key: 'info', label: 'INFO' },
  { key: 'debug', label: 'DEBUG' },
  { key: 'trace', label: 'TRACE' },
]

const parsedLines = computed(() => {
  if (!lastResult.value?.content) return []
  return lastResult.value.content.split(/\r?\n/).map((raw) => parseLogLine(raw))
})

const levelCounts = computed(() => {
  const counts = { error: 0, warn: 0, info: 0, debug: 0, trace: 0, other: 0 }
  for (const l of parsedLines.value) {
    counts[l.level] = (counts[l.level] || 0) + 1
  }
  return counts
})

const filteredLines = computed(() => {
  let arr = parsedLines.value
  if (filterLevel.value !== 'all') {
    arr = arr.filter((l) => l.level === filterLevel.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    arr = arr.filter((l) => l.raw.toLowerCase().includes(q))
  }
  return arr
})

function formatTime(ms) {
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return ''
  }
}

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    if (!logPath.value) {
      logPath.value = await getLogFilePath()
    }
    const [result, fileList] = await Promise.all([
      readRecentLog(tailLines.value),
      listLogFiles(),
    ])
    lastResult.value = result
    files.value = fileList
    await nextTick()
    if (autoScroll.value) scrollToBottom()
  } catch (e) {
    error.value = String(e?.message ?? e)
  } finally {
    loading.value = false
  }
}

function scrollToBottom() {
  if (!logBoxRef.value) return
  logBoxRef.value.scrollTop = logBoxRef.value.scrollHeight
}

function scrollToBottomManual() {
  autoScroll.value = true
  scrollToBottom()
}

function onScroll() {
  if (!logBoxRef.value) return
  const el = logBoxRef.value
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  autoScroll.value = nearBottom
}

async function onCopy() {
  const text = filteredLines.value.map((l) => l.raw).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('appLog.copied', { n: filteredLines.value.length }))
  } catch (e) {
    ElMessage.error(String(e))
  }
}

async function onOpenDir() {
  try {
    await openLogDir()
  } catch (e) {
    ElMessage.error(String(e))
  }
}

async function onClear() {
  try {
    await ElMessageBox.confirm(t('appLog.clearConfirm'), t('appLog.clear'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
  } catch {
    return
  }
  try {
    await clearLogFile()
    ElMessage.success(t('appLog.cleared'))
    await load()
  } catch (e) {
    ElMessage.error(String(e))
  }
}

watch(
  () => props.active,
  (v) => {
    if (v) load()
  },
  { immediate: true },
)

watch(tailLines, () => {
  if (props.active) load()
})

watch(filteredLines, () => {
  if (autoScroll.value) {
    nextTick(() => scrollToBottom())
  }
})
</script>

<style scoped>
.app-log-section {
  padding-bottom: 24px;
}

/* ===== 顶部信息 ===== */
.header-block {
  margin-bottom: 12px;
}
.embedded .header-block {
  margin-bottom: 8px;
}
.group-title {
  margin: 0 0 6px;
}
.path-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.path-icon {
  font-size: 13px;
  flex-shrink: 0;
}
.path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 580px;
}
.stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.stat-num {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);
  font-weight: 600;
}
.stat-unit {
  color: var(--el-text-color-secondary);
}
.truncated-tag {
  display: inline-block;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  font-size: 11px;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 320px;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.search-input {
  width: 220px;
}
.tail-select {
  width: 90px;
}

/* level chips */
.level-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.level-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px 3px 7px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  border-radius: 14px;
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.06s;
  user-select: none;
}
.level-chip:hover {
  background: var(--el-fill-color);
}
.level-chip:active {
  transform: scale(0.97);
}
.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}
.chip-label {
  letter-spacing: 0.5px;
}
.chip-count {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
  font-weight: 600;
  min-width: 14px;
  text-align: right;
}
.chip-error .chip-dot { background: #ef4444; }
.chip-warn  .chip-dot { background: #f59e0b; }
.chip-info  .chip-dot { background: #3b82f6; }
.chip-debug .chip-dot { background: #a3a3a3; }
.chip-trace .chip-dot { background: #6b7280; }
.level-chip.active.chip-error { background: #ef44441a; border-color: #ef444466; color: #dc2626; }
.level-chip.active.chip-warn  { background: #f59e0b1a; border-color: #f59e0b66; color: #d97706; }
.level-chip.active.chip-info  { background: #3b82f61a; border-color: #3b82f666; color: #2563eb; }
.level-chip.active.chip-debug { background: #a3a3a31a; border-color: #a3a3a366; color: #525252; }
.level-chip.active.chip-trace { background: #6b72801a; border-color: #6b728066; color: #4b5563; }
.level-chip.active .chip-count { color: inherit; }

/* ===== 历史 ===== */
.history-collapse {
  margin-bottom: 10px;
}
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.history-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}
.history-list li:last-child {
  border-bottom: none;
}
.hf-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--el-text-color-regular);
}

/* ===== 日志面板 ===== */
.log-panel {
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  overflow: hidden;
  background: var(--el-bg-color);
}

.state-block {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  background: var(--el-fill-color-blank);
}
.state-block.error {
  color: var(--el-color-danger);
}
.state-block.empty .el-icon {
  font-size: 22px;
  color: var(--el-text-color-placeholder);
}
.state-block .is-loading {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.log-list {
  height: calc(100vh - 380px);
  min-height: 280px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.6;
}
.embedded .log-list {
  height: calc(100vh - 520px);
  min-height: 220px;
}

.log-row {
  display: grid;
  grid-template-columns: 4px 64px 56px minmax(120px, 220px) 1fr;
  gap: 10px;
  padding: 4px 10px 4px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  align-items: baseline;
  position: relative;
  transition: background 0.1s;
}
.log-row:hover {
  background: var(--el-fill-color-light);
}
.log-row:last-child {
  border-bottom: none;
}
/* 行首色条 */
.row-bar {
  display: block;
  height: 100%;
  align-self: stretch;
  background: transparent;
}
.lvl-error .row-bar { background: #ef4444; }
.lvl-warn  .row-bar { background: #f59e0b; }
.lvl-info  .row-bar { background: #3b82f6; }
.lvl-debug .row-bar { background: #a3a3a3; }
.lvl-trace .row-bar { background: #6b7280; }
.lvl-other .row-bar { background: transparent; }

.row-time {
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}
.row-level {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 1px 4px;
  border-radius: 4px;
  align-self: center;
  line-height: 1.4;
}
.lvl-error .row-level { background: #ef44441a; color: #dc2626; }
.lvl-warn  .row-level { background: #f59e0b1a; color: #d97706; }
.lvl-info  .row-level { background: #3b82f61a; color: #2563eb; }
.lvl-debug .row-level { background: #a3a3a31a; color: #525252; }
.lvl-trace .row-level { background: #6b72801a; color: #4b5563; }
.lvl-other .row-level { background: transparent; color: var(--el-text-color-placeholder); }

.row-target {
  color: var(--el-text-color-secondary);
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-message {
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-all;
}
.lvl-error .row-message { color: var(--el-color-danger); }
.lvl-warn  .row-message { color: var(--el-color-warning); }

/* 浮按钮 */
.scroll-bottom-fab {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--el-color-primary);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s;
}
.scroll-bottom-fab:hover {
  transform: translateY(-1px);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 暗色主题适配：色条/标签自动透明背景已足够，文字色用主题变量 */
:global(.dark) .lvl-error .row-message,
:global(html.dark) .lvl-error .row-message { color: #fca5a5; }
:global(.dark) .lvl-warn .row-message,
:global(html.dark) .lvl-warn .row-message { color: #fcd34d; }
</style>
