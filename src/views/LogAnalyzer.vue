<template>
  <div class="log-analyzer-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Document /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('logAnalyzer.title') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="selectLogFiles">
          <el-icon><Upload /></el-icon>
          {{ t('logAnalyzer.importLogs') }}
        </el-button>
        <el-button size="small" @click="selectSourceFiles">
          <el-icon><FolderOpened /></el-icon>
          {{ t('logAnalyzer.importSources') }}
        </el-button>
        <el-button size="small" @click="clearAll" :disabled="!logFiles.length && !sourceFiles.length">
          <el-icon><Delete /></el-icon>
          {{ t('common.clear') }}
        </el-button>
        <el-button size="small" type="primary" @click="runAiAnalysis" :disabled="!activeLogAnalysis || aiLoading">
          <el-icon><MagicStick /></el-icon>
          {{ t('logAnalyzer.aiAnalyze') }}
        </el-button>
      </div>
    </div>

    <div class="workspace">
      <aside class="left-panel">
        <div class="search-card">
          <div class="search-card-header">
            <div class="panel-title">{{ t('logAnalyzer.searchTools') }}</div>
            <div class="search-card-subtitle">{{ t('logAnalyzer.searchToolsDesc') }}</div>
          </div>

          <el-input
            v-model="keyword"
            :placeholder="t('logAnalyzer.keywordPlaceholder')"
            clearable
            size="small"
            class="keyword-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select v-model="filterMode" size="small" class="mode-select">
            <el-option :label="t('logAnalyzer.filterIssues')" value="issues" />
            <el-option :label="t('logAnalyzer.filterAll')" value="all" />
            <el-option :label="t('logAnalyzer.filterErrors')" value="error" />
            <el-option :label="t('logAnalyzer.filterWarnings')" value="warn" />
            <el-option :label="t('logAnalyzer.filterExceptions')" value="exception" />
            <el-option :label="t('logAnalyzer.filterStacktraces')" value="stacktrace" />
          </el-select>
        </div>

        <el-alert
          v-if="analysisHint"
          :title="analysisHint"
          type="info"
          :closable="false"
          class="hint-alert"
        />

        <div class="panel-card files-card">
          <div class="panel-title">{{ t('logAnalyzer.logFiles') }}</div>
          <div class="file-list" v-if="logFiles.length">
            <div
              v-for="file in logFiles"
              :key="file.path"
              class="file-item"
              :class="{ active: activeLogPath === file.path }"
              @click="activeLogPath = file.path"
            >
              <div class="file-name">{{ file.name }}</div>
              <div class="file-meta">{{ file.summary.errors }} {{ t('logAnalyzer.errors') }} · {{ file.summary.warnings }} {{ t('logAnalyzer.warnings') }}</div>
            </div>
          </div>
          <el-empty v-else :description="t('logAnalyzer.noLogs')" :image-size="50" />
        </div>

        <div class="panel-card files-card compact-card">
          <div class="panel-title">{{ t('logAnalyzer.sourceFiles') }}</div>
          <div class="file-list" v-if="sourceFiles.length">
            <div v-for="file in sourceFiles" :key="file.path" class="file-item compact">
              <div class="file-name">{{ file.meta.className || file.name }}</div>
              <div class="file-meta">{{ file.meta.packageName || t('logAnalyzer.noPackage') }}</div>
            </div>
          </div>
          <el-empty v-else :description="t('logAnalyzer.noSources')" :image-size="50" />
        </div>
      </aside>

      <main class="main-panel">
        <template v-if="activeLogAnalysis">
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">{{ t('logAnalyzer.totalLines') }}</div>
              <div class="summary-value">{{ activeSummary.totalLines }}</div>
            </div>
            <div class="summary-card error">
              <div class="summary-label">{{ t('logAnalyzer.errors') }}</div>
              <div class="summary-value">{{ activeSummary.errors }}</div>
            </div>
            <div class="summary-card warn">
              <div class="summary-label">{{ t('logAnalyzer.warnings') }}</div>
              <div class="summary-value">{{ activeSummary.warnings }}</div>
            </div>
            <div class="summary-card stack">
              <div class="summary-label">{{ t('logAnalyzer.stacktraces') }}</div>
              <div class="summary-value">{{ activeSummary.stackTraces }}</div>
            </div>
          </div>

          <div class="root-cause-hero" v-if="activeSummary.rootCauseCandidates.length">
            <div class="hero-header">
              <div>
                <div class="hero-eyebrow">{{ t('logAnalyzer.coreAnalysis') }}</div>
                <div class="hero-title">{{ t('logAnalyzer.rootCauseFocus') }}</div>
              </div>
              <el-tag type="danger" effect="dark">{{ activeSummary.rootCauseCandidates.length }}</el-tag>
            </div>

            <div class="hero-cards">
              <div v-for="item in activeSummary.rootCauseCandidates.slice(0, 3)" :key="item.id" class="hero-card">
                <div class="hero-card-title">{{ item.exceptionType || item.headline }}</div>
                <div class="hero-card-meta">{{ t('logAnalyzer.linesRange', { start: item.startLine, end: item.endLine }) }}</div>
                <div class="hero-card-text">{{ item.rootCauseLine || item.headline }}</div>
                <div class="hero-card-actions">
                  <el-button size="small" text type="danger" @click="jumpToBlock(item)">{{ t('logAnalyzer.jumpToBlock') }}</el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="core-analysis-card">
            <div class="section-header">
              <span>{{ t('logAnalyzer.coreAnalysis') }}</span>
              <el-tag size="small">{{ filteredBlocks.length }}</el-tag>
            </div>

            <div class="analysis-columns">
              <section class="analysis-section secondary">
                <div class="subsection-title">{{ t('logAnalyzer.exceptionTypes') }}</div>
                <div class="tag-list" v-if="activeSummary.topExceptions.length">
                  <el-tag v-for="item in activeSummary.topExceptions" :key="item.name" class="summary-tag">
                    {{ item.name }} × {{ item.count }}
                  </el-tag>
                </div>
                <el-empty v-else :description="t('logAnalyzer.noExceptions')" :image-size="46" />
              </section>

              <section class="analysis-section primary">
                <div class="subsection-title">{{ t('logAnalyzer.filteredBlocks') }}</div>
                <div v-if="filteredBlocks.length" class="block-list">
                  <el-collapse v-model="activeBlockNames">
                    <el-collapse-item v-for="block in filteredBlocks" :key="block.id" :name="block.id">
                      <template #title>
                        <div class="block-title-row">
                          <el-tag size="small" :type="tagType(block)">{{ block.level || 'LOG' }}</el-tag>
                          <span class="block-title">{{ block.exceptionType || block.headline }}</span>
                          <span class="block-lines">{{ t('logAnalyzer.linesRange', { start: block.startLine, end: block.endLine }) }}</span>
                        </div>
                      </template>
                      <div class="block-meta-row" v-if="block.stackFrames?.length">
                        <el-tag size="small" type="info">{{ t('logAnalyzer.stackFrameCount', { count: block.stackFrames.length }) }}</el-tag>
                        <span class="block-frame-preview">{{ formatFramePreview(block) }}</span>
                      </div>
                      <pre class="block-content" v-html="highlightBlock(block)"></pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>
                <el-empty v-else :description="t('logAnalyzer.noFilteredBlocks')" />
              </section>
            </div>
          </div>

          <div class="source-context-card">
            <div class="section-header">
              <span>{{ t('logAnalyzer.sourceContext') }}</span>
              <el-tag size="small" v-if="matchedSources.length">{{ matchedSources.length }}</el-tag>
            </div>

            <div class="matched-source-list" v-if="matchedSources.length">
              <div
                v-for="source in matchedSources"
                :key="source.fileName"
                class="matched-source-item"
                :class="{ active: activeSourceKey === source.fileName }"
                @click="selectMatchedSource(source)"
              >
                <div class="candidate-title">{{ source.fullClassName || source.className }}</div>
                <div class="candidate-meta">score {{ source.matchScore }}</div>
              </div>
            </div>
            <el-empty v-else :description="t('logAnalyzer.noMatchedSources')" :image-size="46" />

            <div v-if="activeSourceSnippet" class="source-snippet-panel">
              <div class="subsection-title">{{ t('logAnalyzer.sourceSnippet') }}</div>
              <div class="candidate-meta">{{ activeSourceSnippet.fullClassName || activeSourceSnippet.fileName }}</div>
              <pre class="source-snippet-content">{{ activeSourceSnippet.snippet }}</pre>
            </div>
            <div v-else-if="matchedSources.length" class="source-snippet-empty">
              {{ t('logAnalyzer.selectSourceHint') }}
            </div>
          </div>
        </template>

        <el-empty v-else :description="t('logAnalyzer.emptyState')" />
      </main>
    </div>

    <el-drawer
      v-model="showAiDrawer"
      :title="t('logAnalyzer.aiAnalysisDrawerTitle')"
      size="42%"
      append-to-body
      destroy-on-close="false"
    >
      <div class="ai-drawer-content">
        <div class="ai-meta" v-if="aiMatchedSources.length">
          {{ t('logAnalyzer.aiUsingSources', { count: aiMatchedSources.length }) }}
        </div>
        <el-skeleton v-if="aiLoading" :rows="10" animated />
        <div v-else-if="aiResult" class="ai-result">{{ aiResult }}</div>
        <el-empty v-else :description="t('logAnalyzer.noAiResult')" :image-size="60" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Upload, FolderOpened, Delete, Search, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { openFiles } from '@/utils/tauri/dialog'
import { readTextFile } from '@/utils/tauri/fileOps'
import {
  parseLogFile,
  summarizeLogAnalysis,
  filterLogBlocks,
  extractReferencedClasses,
  buildLogAiPayload,
  extractRelevantStackFrames,
  highlightLogText,
} from '@/utils/logAnalysis'
import { parseJavaSourceMeta, matchSourceFilesByStackTrace, buildSourceSnippets } from '@/utils/sourceContextAnalysis'
import { analyzeJavaLogWithSources } from '@/services/aiService'

const router = useRouter()

const logFiles = ref([])
const sourceFiles = ref([])
const activeLogPath = ref('')
const activeSourceKey = ref('')
const activeBlockNames = ref([])
const showAiDrawer = ref(false)
const keyword = ref('')
const filterMode = ref('issues')
const aiResult = ref('')
const aiLoading = ref(false)

const activeLog = computed(() => logFiles.value.find(file => file.path === activeLogPath.value) || null)
const activeLogAnalysis = computed(() => activeLog.value?.analysis || null)
const activeSummary = computed(() => activeLog.value?.summary || {
  totalLines: 0,
  totalBlocks: 0,
  errors: 0,
  warnings: 0,
  stackTraces: 0,
  topExceptions: [],
  rootCauseCandidates: [],
})

const filteredBlocks = computed(() => {
  if (!activeLogAnalysis.value) return []
  return filterLogBlocks(activeLogAnalysis.value, {
    mode: filterMode.value,
    keyword: keyword.value,
  }).slice(0, 200)
})

const relevantStackFrames = computed(() => {
  if (!activeLogAnalysis.value) return []
  return extractRelevantStackFrames(activeLogAnalysis.value, 30)
})

const matchedSources = computed(() => {
  if (!activeLogAnalysis.value) return []
  return matchSourceFilesByStackTrace(
    sourceFiles.value.map(item => item.meta),
    extractReferencedClasses(activeLogAnalysis.value),
    relevantStackFrames.value,
  ).slice(0, 8)
})

const aiMatchedSources = computed(() => {
  if (!activeLogAnalysis.value) return []
  return buildSourceSnippets(sourceFiles.value.map(item => item.meta), extractReferencedClasses(activeLogAnalysis.value), {
    maxFiles: 6,
    maxLength: 2000,
    stackFrames: relevantStackFrames.value,
  })
})

const activeSourceSnippet = computed(() => {
  if (!aiMatchedSources.value.length) return null
  return aiMatchedSources.value.find(item => item.fileName === activeSourceKey.value) || aiMatchedSources.value[0]
})

const highlightedBlocks = computed(() => {
  return new Map(filteredBlocks.value.map(block => [block.id, highlightLogText(block, keyword.value)]))
})

const analysisHint = computed(() => {
  if (!activeLog.value) return ''
  if (activeLog.summary.totalLines > 10000) {
    return t('logAnalyzer.largeFileHint')
  }
  if (sourceFiles.value.length && matchedSources.value.length === 0) {
    return t('logAnalyzer.sourceNotMatched')
  }
  return ''
})

async function loadFiles(paths, kind) {
  if (!paths?.length) return
  const list = Array.isArray(paths) ? paths : [paths]

  for (const path of list) {
    try {
      const result = await readTextFile(path)
      const content = typeof result === 'string' ? result : result?.content || ''
      const name = path.split(/[/\\]/).pop()

      if (kind === 'log') {
        const analysis = parseLogFile(content, name)
        const summary = summarizeLogAnalysis(analysis)
        logFiles.value.push({ path, name, content, analysis, summary })
        if (!activeLogPath.value) activeLogPath.value = path
      } else {
        sourceFiles.value.push({
          path,
          name,
          content,
          meta: parseJavaSourceMeta(content, name),
        })
      }
    } catch {
      ElMessage.error(`${nameFromPath(path)} ${t('logAnalyzer.readFailed')}`)
    }
  }
}

function nameFromPath(path) {
  return String(path || '').split(/[/\\]/).pop() || path
}

async function selectLogFiles() {
  const paths = await openFiles({
    filters: [{ name: 'Logs', extensions: ['log', 'out', 'txt'] }],
  })
  await loadFiles(paths, 'log')
}

async function selectSourceFiles() {
  const paths = await openFiles({
    filters: [{ name: 'Java', extensions: ['java'] }],
  })
  await loadFiles(paths, 'source')
}

function clearAll() {
  logFiles.value = []
  sourceFiles.value = []
  activeLogPath.value = ''
  activeSourceKey.value = ''
  activeBlockNames.value = []
  showAiDrawer.value = false
  aiResult.value = ''
  keyword.value = ''
  filterMode.value = 'issues'
}

async function runAiAnalysis() {
  if (!activeLogAnalysis.value) return
  showAiDrawer.value = true
  aiLoading.value = true
  aiResult.value = ''
  try {
    const payload = buildLogAiPayload(activeLogAnalysis.value, aiMatchedSources.value, {
      keyword: keyword.value,
      mode: filterMode.value,
      maxBlocks: 20,
      maxSources: 6,
    })
    aiResult.value = await analyzeJavaLogWithSources(payload)
  } catch (error) {
    ElMessage.error(error.message || t('logAnalyzer.aiFailed'))
  } finally {
    aiLoading.value = false
  }
}

function tagType(block) {
  if (block.level === 'ERROR' || block.hasException) return 'danger'
  if (block.level === 'WARN') return 'warning'
  return 'info'
}

function highlightBlock(block) {
  return highlightedBlocks.value.get(block.id) || block.rawText
}

function selectMatchedSource(source) {
  activeSourceKey.value = source.fileName
}

function focusRootCauseBlock() {
  const first = activeSummary.value.rootCauseCandidates?.[0]
  activeBlockNames.value = first ? [first.id] : []
}

function jumpToBlock(block) {
  if (!block?.id) return
  activeBlockNames.value = [block.id]
}

watch(activeLogPath, () => {
  activeSourceKey.value = ''
  focusRootCauseBlock()
}, { immediate: true })

watch(activeSummary, () => {
  focusRootCauseBlock()
})

function formatFramePreview(block) {
  const frame = block.stackFrames?.[0]
  if (!frame) return ''
  const className = frame.fullClassName?.split('.').pop() || frame.fileName || ''
  const methodName = frame.methodName ? `.${frame.methodName}()` : ''
  const lineText = frame.lineNumber ? `:${frame.lineNumber}` : ''
  return `${className}${methodName}${lineText}`
}
</script>

<style scoped>
:deep(.log-hl) {
  background: rgba(64, 158, 255, 0.18);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}

:deep(.log-hl.level) {
  background: rgba(230, 162, 60, 0.22);
}

:deep(.log-hl.exception) {
  background: rgba(245, 108, 108, 0.2);
}

:deep(.log-hl.cause) {
  background: rgba(103, 194, 58, 0.2);
}

.log-analyzer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-lg);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 44px;
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

.breadcrumb-link {
  cursor: pointer;
  color: var(--accent-blue);
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--text-quaternary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
}

.left-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card,
.panel-card,
.core-analysis-card,
.source-context-card {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
}

.search-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.search-card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-card-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
}

.keyword-input,
.mode-select {
  width: 100%;
}

.hint-alert {
  margin: 0;
}

.panel-card {
  padding: 12px;
}

.files-card {
  min-height: 140px;
  max-height: 230px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.compact-card {
  max-height: 190px;
}

.hero-card-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.file-item.compact .file-meta,
.file-item.compact .file-name {
  margin-top: 2px;
}

.file-item.compact {
  padding-top: 7px;
  padding-bottom: 7px;
}

.file-list {
  padding-right: 2px;
}

.file-list::-webkit-scrollbar {
  width: 4px;
}

.file-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.file-list::-webkit-scrollbar-track {
  background: transparent;
}

.block-list::-webkit-scrollbar {
  width: 6px;
}

.block-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.block-list::-webkit-scrollbar-track {
  background: transparent;
}

.hero-card {
  display: flex;
  flex-direction: column;
}

.hero-card-text {
  flex: 1;
}

.hero-card-meta {
  margin-top: 6px;
}

.hero-card-title {
  line-height: 1.35;
}

.hero-card-text,
.candidate-text {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-card-text {
  -webkit-line-clamp: 5;
}

.file-meta {
  line-height: 1.3;
}

.file-item.compact .file-name {
  font-size: 11.5px;
}

.file-item.compact .file-meta {
  font-size: 10.5px;
}

.file-item.compact .file-name + .file-meta {
  margin-top: 3px;
}

.file-item .file-name + .file-meta {
  margin-top: 4px;
}

.file-item {
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
}

.file-item.active {
  box-shadow: 0 6px 14px rgba(64, 158, 255, 0.08);
}

.block-list {
  scroll-behavior: smooth;
}

.hero-card-actions :deep(.el-button) {
  padding-right: 0;
}

.hero-card-actions :deep(.el-button + .el-button) {
  margin-left: 8px;
}

.hero-card-actions :deep(.el-button.is-text) {
  font-weight: 600;
}

.hero-card-actions :deep(.el-button.is-text:hover) {
  background: rgba(245, 108, 108, 0.08);
}

.hero-card-actions :deep(.el-button span) {
  font-size: 12px;
}

.hero-card-actions :deep(.el-button) {
  height: auto;
}

.hero-card-actions :deep(.el-button:not(.is-disabled)) {
  color: #dc2626;
}

.hero-card-actions :deep(.el-button:not(.is-disabled):hover) {
  color: #b91c1c;
}

.hero-card-actions :deep(.el-button.is-text) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.hero-card-actions :deep(.el-button.is-text) span {
  line-height: 1.2;
}

.hero-card-actions :deep(.el-button .el-icon) {
  margin-right: 4px;
}

.hero-card-actions :deep(.el-button) {
  min-height: 24px;
}

.hero-card-actions :deep(.el-button span) {
  display: inline-flex;
  align-items: center;
}

.hero-card-actions :deep(.el-button) {
  border-radius: 8px;
}

.hero-card-actions :deep(.el-button:hover) {
  transform: none;
}

.hero-card-actions :deep(.el-button) {
  transition: background 0.15s ease, color 0.15s ease;
}

.hero-card-actions :deep(.el-button) {
  margin-left: auto;
}

.hero-card-actions :deep(.el-button) {
  box-shadow: none;
}

.hero-card-actions :deep(.el-button) {
  font-size: 12px;
}

.hero-card-actions :deep(.el-button) {
  letter-spacing: 0;
}

.hero-card-actions :deep(.el-button) {
  white-space: nowrap;
}

.hero-card-actions :deep(.el-button) {
  text-decoration: none;
}

.hero-card-actions :deep(.el-button:hover) {
  text-decoration: none;
}

.hero-card-actions :deep(.el-button) {
  outline: none;
}

.hero-card-actions :deep(.el-button:focus-visible) {
  outline: 2px solid rgba(220, 38, 38, 0.18);
  outline-offset: 2px;
}

.hero-card-actions :deep(.el-button) {
  cursor: pointer;
}

.hero-card-actions :deep(.el-button.is-disabled) {
  cursor: not-allowed;
}

.hero-card-actions :deep(.el-button) {
  user-select: none;
}

.hero-card-actions :deep(.el-button) {
  background: transparent;
}

.hero-card-actions :deep(.el-button:hover) {
  background: rgba(245, 108, 108, 0.08);
}

.hero-card-actions :deep(.el-button:active) {
  background: rgba(245, 108, 108, 0.12);
}

.hero-card-actions :deep(.el-button) {
  border: none;
}

.hero-card-actions :deep(.el-button) {
  line-height: 1;
}

.hero-card-actions :deep(.el-button span) {
  gap: 0;
}

.hero-card-actions :deep(.el-button .el-icon) {
  font-size: 12px;
}

.hero-card-actions :deep(.el-button) {
  padding-left: 8px;
}

.hero-card-actions :deep(.el-button) {
  padding-right: 8px;
}

.panel-title,
.section-header,
.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title {
  margin-bottom: 10px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.file-item {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  padding: 8px 9px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  background: rgba(255, 255, 255, 0.72);
}

.file-item:hover,
.file-item.active {
  border-color: var(--accent-blue);
  background: rgba(64, 158, 255, 0.08);
  transform: translateY(-1px);
}

.file-item.compact {
  cursor: default;
}

.file-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  word-break: break-all;
  line-height: 1.35;
}

.file-meta,
.ai-meta,
.candidate-meta,
.block-lines {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.main-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.summary-card.error {
  border-color: rgba(245, 108, 108, 0.28);
}

.summary-card.warn {
  border-color: rgba(230, 162, 60, 0.28);
}

.summary-card.stack {
  border-color: rgba(64, 158, 255, 0.28);
}

.summary-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.summary-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.root-cause-hero {
  border: 1px solid rgba(245, 108, 108, 0.18);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.08), rgba(255, 255, 255, 0.92));
  box-shadow: 0 12px 28px rgba(245, 108, 108, 0.08);
}

.hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hero-eyebrow {
  font-size: 11px;
  color: #dc2626;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-title {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hero-card {
  border: 1px solid rgba(245, 108, 108, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  padding: 12px;
}

.hero-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-card-meta {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.hero-card-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  word-break: break-word;
}

.core-analysis-card,
.source-context-card {
  padding: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.analysis-columns {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
}

.analysis-section {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.82);
}

.analysis-section.primary {
  min-height: 420px;
}

.subsection-title {
  margin-bottom: 10px;
}

.candidate-list,
.matched-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.candidate-item,
.matched-source-item {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.16);
  padding: 10px;
}

.matched-source-item {
  cursor: pointer;
}

.matched-source-item.active {
  border-color: var(--accent-blue);
  background: rgba(64, 158, 255, 0.08);
}

.candidate-title,
.block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.candidate-text {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-tag {
  margin-right: 0;
}

.source-snippet-panel {
  margin-top: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.82);
}

.source-snippet-content {
  margin: 8px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.source-snippet-empty {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.block-list {
  min-height: 360px;
  max-height: 680px;
  overflow: auto;
}

.block-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.block-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.block-frame-preview {
  font-size: 11px;
  color: var(--text-tertiary);
}

.block-content,
.ai-result {
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 200px minmax(0, 1fr);
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-cards,
  .analysis-columns {
    grid-template-columns: 1fr;
  }
}
</style>
