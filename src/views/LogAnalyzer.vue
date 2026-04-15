<template>
  <div class="log-analyzer-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Document /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('logAnalyzer.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="selectLogFiles">
          <el-icon><Upload /></el-icon>
          {{ t('logAnalyzer.importLogs') }}
        </el-button>
        <el-button size="small" @click="selectSourceFolder">
          <el-icon><FolderOpened /></el-icon>
          {{ t('logAnalyzer.importSourceFolder') }}
        </el-button>
        <el-button size="small" @click="selectSourceFiles">
          <el-icon><FolderOpened /></el-icon>
          {{ t('logAnalyzer.importSources') }}
        </el-button>
        <el-button size="small" @click="clearAll" :disabled="!logFiles.length && !sourceFiles.length">
          <el-icon><Delete /></el-icon>
          {{ t('common.clear') }}
        </el-button>
        <el-button size="small" type="primary" @click="runAiAnalysis" :disabled="!canRunAi || aiLoading">
          <el-icon><MagicStick /></el-icon>
          {{ t('logAnalyzer.aiAnalyze') }}
        </el-button>
      </div>
    </div>

    <div class="workspace">
      <aside class="left-panel">
        <div class="left-sidebar-section left-sidebar-tools">
          <div class="search-row">
            <div class="search-input-wrap" ref="searchWrapRef">
              <el-input
                v-model="keyword"
                :placeholder="t('logAnalyzer.keywordPlaceholder')"
                clearable
                size="small"
                class="keyword-input"
                @focus="showHistory = true"
                @keydown.enter="commitSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <div v-if="showHistory && searchHistoryList.length" class="search-history-dropdown">
                <div class="search-history-head">
                  <span class="search-history-title">{{ t('logAnalyzer.searchHistory') }}</span>
                  <span class="search-history-clear" @click.stop="clearSearchHistory">{{ t('logAnalyzer.clearHistory') }}</span>
                </div>
                <div
                  v-for="(item, idx) in searchHistoryList"
                  :key="idx"
                  class="search-history-item"
                  @click="applyHistory(item)"
                >
                  <span class="search-history-text">{{ item }}</span>
                  <span class="search-history-remove" @click.stop="removeHistoryItem(idx)">&times;</span>
                </div>
              </div>
            </div>
            <el-select v-model="filterMode" size="small" class="mode-select">
              <el-option :label="t('logAnalyzer.filterIssues')" value="issues" />
              <el-option :label="t('logAnalyzer.filterAll')" value="all" />
              <el-option :label="t('logAnalyzer.filterErrors')" value="error" />
              <el-option :label="t('logAnalyzer.filterWarnings')" value="warn" />
              <el-option :label="t('logAnalyzer.filterExceptions')" value="exception" />
              <el-option :label="t('logAnalyzer.filterStacktraces')" value="stacktrace" />
            </el-select>
          </div>
        </div>

        <el-alert
          v-if="analysisHint"
          :title="analysisHint"
          type="info"
          :closable="false"
          class="hint-alert"
        />

        <div class="left-sidebar-section left-sidebar-list-wrap">
          <div class="left-sidebar-section-head">
            <span class="left-sidebar-section-title">{{ t('logAnalyzer.logFiles') }}</span>
            <span class="left-sidebar-count">{{ logFiles.length }}</span>
          </div>
          <ul v-if="logFiles.length" class="compact-file-list">
            <li
              v-for="file in logFiles"
              :key="file.path"
              class="compact-file-row"
              :class="{ active: activeLogPath === file.path }"
              @click="activeLogPath = file.path"
            >
              <div class="compact-main">
                <span class="compact-file-name" :title="file.name">{{ file.name }}</span>
                <span class="compact-file-meta">
                  <template v-if="file.status === 'indexing'">
                    {{ t('logAnalyzer.indexingShort', { percent: file.progressPercent || 0 }) }}
                  </template>
                  <template v-else-if="file.status === 'error'">
                    {{ t('logAnalyzer.parseFailed') }}
                  </template>
                  <template v-else>
                    {{ t('logAnalyzer.blockCount', { count: file.summary?.totalBlocks || 0 }) }}
                  </template>
                </span>
              </div>
              <span class="compact-badges">
                <span v-if="file.status === 'indexing'" class="compact-badge is-info">{{ file.progressPercent || 0 }}%</span>
                <span v-else-if="file.summary?.errors" class="compact-badge is-error">{{ file.summary.errors }}</span>
                <span v-if="file.summary?.warnings" class="compact-badge is-warn">{{ file.summary.warnings }}</span>
              </span>
              <span class="compact-remove" @click.stop="removeLogFile(file.path)">&times;</span>
            </li>
          </ul>
          <div v-else class="left-sidebar-empty">{{ t('logAnalyzer.noLogs') }}</div>
        </div>

        <div class="left-sidebar-section left-sidebar-list-wrap is-sources">
          <div class="left-sidebar-section-head">
            <span class="left-sidebar-section-title">{{ t('logAnalyzer.sourceFiles') }}</span>
            <span class="left-sidebar-count">{{ sourceFiles.length }}</span>
          </div>
          <ul v-if="sourceFiles.length" class="compact-file-list">
            <li v-for="file in sourceFiles" :key="file.path" class="compact-file-row is-static">
              <span class="compact-file-name" :title="file.meta.fullClassName || file.name">{{ file.meta.className || file.name }}</span>
              <span class="compact-file-pkg">{{ file.meta.packageName || '' }}</span>
              <span class="compact-remove" @click.stop="removeSourceFile(file.path)">&times;</span>
            </li>
          </ul>
          <div v-else class="left-sidebar-empty">{{ t('logAnalyzer.noSources') }}</div>
        </div>
      </aside>

      <main class="main-panel">
        <template v-if="activeLog">
          <div v-if="activeLog.status === 'indexing'" class="progress-card">
            <div class="section-header">
              <span>{{ t('logAnalyzer.indexingTitle') }}</span>
              <el-tag size="small">{{ activeLog.progressPercent || 0 }}%</el-tag>
            </div>
            <el-progress :percentage="activeLog.progressPercent || 0" :stroke-width="14" />
            <div class="progress-meta">
              <span>{{ t('logAnalyzer.linesRead', { count: activeProgress.linesRead || 0 }) }}</span>
              <span>{{ t('logAnalyzer.blocksIndexed', { count: activeProgress.blocksIndexed || 0 }) }}</span>
            </div>
          </div>

          <div v-else-if="activeLog.status === 'error'" class="progress-card is-error">
            <div class="section-header">
              <span>{{ t('logAnalyzer.parseFailed') }}</span>
            </div>
            <div class="error-text">{{ activeLog.error || t('logAnalyzer.aiFailed') }}</div>
          </div>

          <template v-else>
            <div class="summary-strip" role="group" :aria-label="t('logAnalyzer.title')">
              <div class="summary-stat">
                <span class="summary-stat-label">{{ t('logAnalyzer.totalLines') }}</span>
                <span class="summary-stat-value">{{ activeSummary.totalLines }}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat-label">{{ t('logAnalyzer.blockCountLabel') }}</span>
                <span class="summary-stat-value">{{ activeSummary.totalBlocks }}</span>
              </div>
              <div class="summary-stat is-error">
                <span class="summary-stat-label">{{ t('logAnalyzer.errors') }}</span>
                <span class="summary-stat-value">{{ activeSummary.errors }}</span>
              </div>
              <div class="summary-stat is-warn">
                <span class="summary-stat-label">{{ t('logAnalyzer.warnings') }}</span>
                <span class="summary-stat-value">{{ activeSummary.warnings }}</span>
              </div>
              <div class="summary-stat is-stack">
                <span class="summary-stat-label">{{ t('logAnalyzer.stacktraces') }}</span>
                <span class="summary-stat-value">{{ activeSummary.stackTraces }}</span>
              </div>
            </div>

            <div class="root-cause-hero" v-if="activeSummary.rootCauseCandidates.length">
              <div class="hero-header">
                <div>
                  <div class="hero-eyebrow">{{ t('logAnalyzer.coreAnalysis') }}</div>
                  <div class="hero-title">{{ t('logAnalyzer.rootCauseFocus') }}</div>
                </div>
                <el-tag type="danger" effect="dark">{{ t('logAnalyzer.rootCauseShowing', { shown: Math.min(activeSummary.rootCauseCandidates.length, 3), total: activeSummary.rootCauseCandidates.length }) }}</el-tag>
              </div>

              <div class="hero-cards">
                <div
                  v-for="item in activeSummary.rootCauseCandidates.slice(0, 3)"
                  :key="item.id"
                  class="hero-card"
                  :class="{ focused: selectedBlockId === item.id }"
                >
                  <div class="hero-card-topline">
                    <div class="hero-card-title">{{ item.exceptionType || item.headline }}</div>
                    <el-tag v-if="selectedBlockId === item.id" size="small" type="success">{{ t('logAnalyzer.currentTarget') }}</el-tag>
                  </div>
                  <div class="hero-card-meta">{{ t('logAnalyzer.linesRange', { start: item.startLine, end: item.endLine }) }}</div>
                  <div class="hero-card-text">{{ item.rootCauseLine || item.previewText || item.headline }}</div>
                  <div class="hero-card-actions">
                    <el-button size="small" text type="danger" @click="jumpToBlock(item)">{{ t('logAnalyzer.jumpToBlock') }}</el-button>
                  </div>
                </div>
              </div>
            </div>

            <div class="core-analysis-card">
              <div class="section-header">
                <span>{{ t('logAnalyzer.filteredBlocks') }}</span>
                <div class="header-inline-actions">
                  <el-select v-model="pageSize" size="small" class="page-size-select" @change="handlePageSizeChange">
                    <el-option :value="20" label="20 / page" />
                    <el-option :value="50" label="50 / page" />
                    <el-option :value="100" label="100 / page" />
                  </el-select>
                  <el-tag size="small">{{ blockPage.total }}</el-tag>
                </div>
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
                  <div class="block-query-toolbar">
                    <span class="subsection-title">{{ t('logAnalyzer.blockList') }}</span>
                    <span class="query-status" v-if="loadingBlocks">{{ t('logAnalyzer.queryingBlocks') }}</span>
                  </div>

                  <div v-if="blockPage.items.length" class="block-master-detail">
                    <div class="block-summary-list">
                      <div
                        v-for="block in blockPage.items"
                        :key="block.id"
                        class="block-summary-item"
                        :class="{ active: selectedBlockId === block.id }"
                        @click="selectBlock(block)"
                      >
                        <div class="block-summary-topline">
                          <el-tag size="small" :type="tagType(block)">{{ block.level || 'LOG' }}</el-tag>
                          <span class="block-summary-title">{{ block.exceptionType || block.headline }}</span>
                        </div>
                        <div class="block-summary-meta">
                          <span>{{ t('logAnalyzer.linesRange', { start: block.startLine, end: block.endLine }) }}</span>
                          <span v-if="block.stackFrameCount">{{ t('logAnalyzer.stackFrameCount', { count: block.stackFrameCount }) }}</span>
                        </div>
                        <div class="block-summary-preview">{{ block.rootCauseLine || block.previewText || block.message || block.headline }}</div>
                      </div>
                    </div>

                    <div class="block-detail-panel">
                      <div class="detail-toolbar">
                        <span class="subsection-title">{{ t('logAnalyzer.blockDetail') }}</span>
                        <span class="query-status" v-if="loadingDetail">{{ t('logAnalyzer.loadingBlockDetail') }}</span>
                      </div>

                      <template v-if="selectedBlockDetail">
                        <div class="detail-meta">
                          <el-tag size="small" :type="tagType(selectedBlockDetail.summary)">{{ selectedBlockDetail.summary.level || 'LOG' }}</el-tag>
                          <span>{{ t('logAnalyzer.linesRange', { start: selectedBlockDetail.summary.startLine, end: selectedBlockDetail.summary.endLine }) }}</span>
                          <span v-if="selectedBlockDetail.summary.exceptionType">{{ selectedBlockDetail.summary.exceptionType }}</span>
                        </div>
                        <pre class="block-content" v-html="selectedBlockHtml"></pre>
                      </template>
                      <el-empty v-else :description="t('logAnalyzer.selectBlockHint')" :image-size="50" />
                    </div>
                  </div>
                  <el-empty v-else :description="t('logAnalyzer.noFilteredBlocks')" />

                  <div v-if="blockPage.total > pageSize" class="pagination-wrap">
                    <el-pagination
                      background
                      layout="total, prev, pager, next"
                      :total="blockPage.total"
                      :page-size="pageSize"
                      :current-page="currentPage"
                      @update:current-page="handlePageChange"
                    />
                  </div>
                </section>
              </div>
            </div>

            <div class="source-context-card">
              <div class="section-header">
                <span>{{ t('logAnalyzer.sourceContext') }}</span>
                <div class="source-actions" v-if="activeSourceSnippet">
                  <el-button size="small" text @click="copySourceSnippet">{{ t('logAnalyzer.copySnippet') }}</el-button>
                  <el-tag size="small">{{ matchedSourceSnippets.length }}</el-tag>
                </div>
                <el-tag size="small" v-else-if="matchedSourceSnippets.length">{{ matchedSourceSnippets.length }}</el-tag>
              </div>

              <div class="matched-source-list" v-if="matchedSourceSnippets.length">
                <div
                  v-for="source in matchedSourceSnippets"
                  :key="source.sourceKey"
                  class="matched-source-item"
                  :class="{ active: activeSourceKey === source.sourceKey }"
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
                <pre class="source-snippet-content" v-html="highlightSourceSnippetHtml"></pre>
              </div>
            </div>
          </template>
        </template>

        <el-empty v-else :description="t('logAnalyzer.emptyState')" />
      </main>
    </div>

    <el-drawer
      v-model="showAiDrawer"
      :title="t('logAnalyzer.aiAnalysisDrawerTitle')"
      size="42%"
      append-to-body
      :destroy-on-close="false"
    >
      <div class="ai-drawer-content">
        <div class="ai-meta" v-if="matchedSourceSnippets.length">
          {{ t('logAnalyzer.aiUsingSources', { count: matchedSourceSnippets.length }) }}
        </div>
        <el-skeleton v-if="aiLoading" :rows="10" animated />
        <div v-else-if="aiResult" class="ai-result">{{ aiResult }}</div>
        <el-empty v-else :description="t('logAnalyzer.noAiResult')" :image-size="60" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Upload, FolderOpened, Delete, Search, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { t } from '@/i18n'
import { openFiles, selectFolder } from '@/utils/tauri/dialog'
import { readTextFile } from '@/utils/tauri/fileOps'
import { readDir } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { highlightLogText, buildLogAiPayload } from '@/utils/logAnalysis'
import { parseJavaSourceMeta, buildSourceSnippets } from '@/utils/sourceContextAnalysis'
import { analyzeJavaLogWithSources } from '@/services/aiService'
import {
  openLogAnalysisSession,
  getLogAnalysisSummary,
  queryLogBlocks,
  getLogBlockDetail,
  closeLogAnalysisSession,
  cancelLogAnalysisSession,
} from '@/utils/tauri/logAnalysis'

const MATCHED_SOURCE_LIMIT = 8
const AI_SOURCE_LIMIT = 6
const AI_BLOCK_LIMIT = 8
const SEARCH_HISTORY_KEY = 'log_analyzer_search_history'
const SEARCH_HISTORY_MAX = 10
const DEBOUNCE_MS = 300
const DETAIL_CACHE_MAX = 200

const router = useRouter()
const searchWrapRef = ref(null)

const logFiles = ref([])
const sourceFiles = ref([])
const activeLogPath = ref('')
const activeSourceKey = ref('')
const selectedBlockId = ref('')
const selectedBlockDetail = ref(null)
const currentPage = ref(1)
const pageSize = ref(50)
const blockPage = ref(createEmptyBlockPage())
const loadingBlocks = ref(false)
const loadingDetail = ref(false)
const showAiDrawer = ref(false)
const keyword = ref('')
const debouncedKeyword = ref('')
const filterMode = ref('issues')
const aiResult = ref('')
const aiLoading = ref(false)
const showHistory = ref(false)
const searchHistoryList = ref([])
const detailCache = ref(new Map())

let debounceTimer = null
let blockRequestId = 0
let detailRequestId = 0

watch(keyword, val => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, DEBOUNCE_MS)
})

const activeLog = computed(() => logFiles.value.find(file => file.path === activeLogPath.value) || null)
const activeSummary = computed(() => activeLog.value?.summary || createEmptySummary())
const activeProgress = computed(() => activeLog.value?.progress || {})
const matchedSourceSnippets = computed(() => {
  if (!activeLog.value?.summary) return []
  return buildSourceSnippets(
    sourceFiles.value.map(item => ({ ...item.meta, path: item.path })),
    activeSummary.value.referencedClasses || [],
    {
      maxFiles: MATCHED_SOURCE_LIMIT,
      maxLength: 2000,
      stackFrames: activeSummary.value.relevantStackFrames || [],
      extraTerms: collectSnippetHighlightTerms(activeSummary.value),
    }
  )
})
const aiMatchedSources = computed(() => matchedSourceSnippets.value.slice(0, AI_SOURCE_LIMIT))
const activeSourceSnippet = computed(() => {
  if (!matchedSourceSnippets.value.length) return null
  return matchedSourceSnippets.value.find(item => item.sourceKey === activeSourceKey.value) || null
})
const highlightSourceSnippetHtml = computed(() => activeSourceSnippet.value?.highlightedSnippet || activeSourceSnippet.value?.snippet || '')
const selectedBlockHtml = computed(() => {
  if (!selectedBlockDetail.value) return ''
  return highlightLogText({ ...selectedBlockDetail.value.summary, rawText: selectedBlockDetail.value.rawText }, debouncedKeyword.value)
})
const canRunAi = computed(() => activeLog.value?.status === 'ready')
const analysisHint = computed(() => {
  if (!activeLog.value) return ''
  if (activeLog.value.status === 'indexing') return t('logAnalyzer.indexingHint')
  if (activeSummary.value.meta?.isLargeFile) return t('logAnalyzer.largeFileHint')
  if (sourceFiles.value.length && matchedSourceSnippets.value.length === 0) return t('logAnalyzer.sourceNotMatched')
  return ''
})

watch(activeLogPath, async () => {
  selectedBlockId.value = ''
  selectedBlockDetail.value = null
  aiResult.value = ''
  currentPage.value = 1
  blockPage.value = createEmptyBlockPage()
  if (activeLog.value?.status === 'ready') {
    await loadBlockPage(1)
    await selectPreferredBlock()
  }
}, { immediate: true })

watch([debouncedKeyword, filterMode], async () => {
  if (activeLog.value?.status !== 'ready') return
  currentPage.value = 1
  await loadBlockPage(1)
  await selectPreferredBlock()
})

watch(matchedSourceSnippets, snippets => {
  if (!snippets.length) {
    activeSourceKey.value = ''
    return
  }
  const exists = snippets.some(item => item.sourceKey === activeSourceKey.value)
  if (!exists) {
    activeSourceKey.value = snippets[0].sourceKey
  }
}, { immediate: true })

onMounted(() => {
  loadSearchHistory()
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(async () => {
  document.removeEventListener('click', handleClickOutside, true)
  clearTimeout(debounceTimer)
  await cleanupAllLogs()
})

function createEmptySummary() {
  return {
    fileName: '',
    fileSize: 0,
    totalLines: 0,
    totalBlocks: 0,
    errors: 0,
    warnings: 0,
    stackTraces: 0,
    topExceptions: [],
    frequentBlocks: [],
    rootCauseCandidates: [],
    referencedClasses: [],
    relevantStackFrames: [],
    meta: {},
  }
}

function createEmptyBlockPage() {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: pageSize.value,
    hasMore: false,
  }
}

function nameFromPath(path) {
  return String(path || '').split(/[\\/]/).pop() || path
}

function getDetailCacheKey(sessionId, blockId) {
  return `${sessionId}:${blockId}`
}

function updateLogFile(path, mutator) {
  logFiles.value = logFiles.value.map(file => file.path === path ? mutator(file) : file)
}

function getLogFile(path) {
  return logFiles.value.find(file => file.path === path) || null
}

function computeProgressPercent(progress = {}) {
  if (!progress.totalBytes) return 0
  return Math.max(0, Math.min(100, Math.round((progress.bytesRead || 0) / progress.totalBytes * 100)))
}

function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    searchHistoryList.value = raw ? JSON.parse(raw) : []
  } catch {
    searchHistoryList.value = []
  }
}

function saveSearchHistory() {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistoryList.value))
}

function commitSearch() {
  const val = keyword.value.trim()
  if (!val) return
  debouncedKeyword.value = val
  const list = searchHistoryList.value.filter(item => item !== val)
  list.unshift(val)
  searchHistoryList.value = list.slice(0, SEARCH_HISTORY_MAX)
  saveSearchHistory()
  showHistory.value = false
}

function applyHistory(item) {
  keyword.value = item
  debouncedKeyword.value = item
  showHistory.value = false
}

function removeHistoryItem(idx) {
  searchHistoryList.value.splice(idx, 1)
  saveSearchHistory()
}

function clearSearchHistory() {
  searchHistoryList.value = []
  saveSearchHistory()
  showHistory.value = false
}

function handleClickOutside(e) {
  if (searchWrapRef.value && !searchWrapRef.value.contains(e.target)) {
    showHistory.value = false
  }
}

function collectSnippetHighlightTerms(summary = {}) {
  const terms = new Set()
  ;(summary.topExceptions || []).forEach(item => terms.add(item.name))
  ;(summary.relevantStackFrames || []).forEach(frame => {
    if (frame.methodName) terms.add(frame.methodName)
    if (frame.fullClassName) {
      terms.add(frame.fullClassName)
      const shortName = frame.fullClassName.split('.').pop()
      if (shortName) terms.add(shortName)
    }
  })
  return Array.from(terms)
}

async function startLogImport(path) {
  const name = nameFromPath(path)
  logFiles.value = [...logFiles.value, {
    path,
    name,
    sessionId: '',
    status: 'indexing',
    progress: {},
    progressPercent: 0,
    summary: null,
    error: '',
    unlisteners: [],
  }]

  if (!activeLogPath.value) {
    activeLogPath.value = path
  }

  try {
    const { sessionId, unlisteners } = await openLogAnalysisSession({ path }, {
      onProgress: progress => {
        updateLogFile(path, file => ({
          ...file,
          progress,
          progressPercent: computeProgressPercent(progress),
        }))
      },
      onComplete: async progress => {
        try {
          const summary = await getLogAnalysisSummary(sessionId)
          updateLogFile(path, file => ({
            ...file,
            status: 'ready',
            progress,
            progressPercent: 100,
            summary,
            error: '',
          }))
          if (activeLogPath.value === path) {
            await loadBlockPage(1)
            await selectPreferredBlock()
          }
        } catch (error) {
          updateLogFile(path, file => ({
            ...file,
            status: 'error',
            error: error.message || String(error),
          }))
        }
      },
      onError: error => {
        updateLogFile(path, file => ({
          ...file,
          status: 'error',
          error: error?.message || String(error),
        }))
      },
    })

    updateLogFile(path, file => ({
      ...file,
      sessionId,
      unlisteners,
    }))
  } catch (error) {
    updateLogFile(path, file => ({
      ...file,
      status: 'error',
      error: error.message || String(error),
    }))
    ElMessage.error(`${name} ${t('logAnalyzer.readFailed')}`)
  }
}

async function loadFiles(paths, kind) {
  if (!paths?.length) return
  const list = Array.isArray(paths) ? paths : [paths]
  const existingPaths = new Set((kind === 'log' ? logFiles.value : sourceFiles.value).map(item => item.path))
  let skipped = 0

  for (const path of list) {
    if (existingPaths.has(path)) {
      skipped += 1
      continue
    }

    try {
      if (kind === 'log') {
        await startLogImport(path)
      } else {
        const result = await readTextFile(path)
        const content = typeof result === 'string' ? result : result?.content || ''
        const name = nameFromPath(path)
        sourceFiles.value = [...sourceFiles.value, {
          path,
          name,
          content,
          meta: parseJavaSourceMeta(content, name),
        }]
      }
      existingPaths.add(path)
    } catch {
      ElMessage.error(`${nameFromPath(path)} ${t('logAnalyzer.readFailed')}`)
    }
  }

  if (skipped) {
    ElMessage.warning(t('logAnalyzer.duplicateSkipped', { count: skipped }))
  }
}

async function selectLogFiles() {
  const paths = await openFiles({ filters: [{ name: 'Logs', extensions: ['log', 'out', 'txt'] }] })
  await loadFiles(paths, 'log')
}

async function selectSourceFiles() {
  const paths = await openFiles({ filters: [{ name: 'Java', extensions: ['java'] }] })
  await loadFiles(paths, 'source')
}

async function collectJavaFiles(dirPath, depth = 0) {
  if (!dirPath || depth > 6) return []

  try {
    const entries = await readDir(dirPath)
    const files = []

    for (const entry of entries) {
      if (!entry?.name) continue
      const fullPath = await join(dirPath, entry.name)
      if (entry.isDirectory) {
        if (!entry.name.startsWith('.') && entry.name !== 'target' && entry.name !== 'node_modules') {
          files.push(...await collectJavaFiles(fullPath, depth + 1))
        }
        continue
      }
      if (/\.java$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }

    return files
  } catch {
    return []
  }
}

async function selectSourceFolder() {
  const dirPath = await selectFolder({ title: t('logAnalyzer.importSourceFolder') })
  if (!dirPath) return

  const files = await collectJavaFiles(dirPath)
  if (!files.length) {
    ElMessage.warning(t('logAnalyzer.noJavaFilesFound'))
    return
  }

  await loadFiles(files, 'source')
}

async function loadBlockPage(page = currentPage.value) {
  const log = activeLog.value
  if (!log?.sessionId || log.status !== 'ready') {
    blockPage.value = createEmptyBlockPage()
    return
  }

  const requestId = ++blockRequestId
  loadingBlocks.value = true
  try {
    const result = await queryLogBlocks(log.sessionId, {
      mode: filterMode.value,
      keyword: debouncedKeyword.value,
      page,
      pageSize: pageSize.value,
    })
    if (requestId !== blockRequestId) return
    currentPage.value = result.page
    blockPage.value = result
  } catch (error) {
    if (requestId === blockRequestId) {
      ElMessage.error(error.message || t('logAnalyzer.readFailed'))
      blockPage.value = createEmptyBlockPage()
    }
  } finally {
    if (requestId === blockRequestId) {
      loadingBlocks.value = false
    }
  }
}

async function fetchBlockDetail(blockId) {
  const log = activeLog.value
  if (!log?.sessionId) return null
  const cacheKey = getDetailCacheKey(log.sessionId, blockId)
  if (detailCache.value.has(cacheKey)) {
    return detailCache.value.get(cacheKey)
  }
  const detail = await getLogBlockDetail(log.sessionId, blockId)
  // Fix 8: 限制缓存大小，FIFO 淘汰
  if (detailCache.value.size >= DETAIL_CACHE_MAX) {
    const firstKey = detailCache.value.keys().next().value
    detailCache.value.delete(firstKey)
  }
  detailCache.value.set(cacheKey, detail)
  return detail
}

async function selectBlock(block) {
  const log = activeLog.value
  if (!log?.sessionId || !block?.id) return

  const requestId = ++detailRequestId
  selectedBlockId.value = block.id
  loadingDetail.value = true
  try {
    const detail = await fetchBlockDetail(block.id)
    if (requestId !== detailRequestId || selectedBlockId.value !== block.id) return
    selectedBlockDetail.value = detail
  } catch (error) {
    if (requestId === detailRequestId) {
      ElMessage.error(error.message || t('logAnalyzer.readFailed'))
      selectedBlockDetail.value = null
    }
  } finally {
    if (requestId === detailRequestId) {
      loadingDetail.value = false
    }
  }
}

async function selectPreferredBlock() {
  if (!blockPage.value.items.length) {
    selectedBlockId.value = ''
    selectedBlockDetail.value = null
    return
  }

  const preferred = activeSummary.value.rootCauseCandidates.find(item => blockPage.value.items.some(block => block.id === item.id))
  const nextBlock = preferred || blockPage.value.items[0]
  await selectBlock(nextBlock)
}

async function jumpToBlock(block) {
  if (!block?.id) return
  await selectBlock(block)
}

function selectMatchedSource(source) {
  activeSourceKey.value = source.sourceKey
}

async function copySourceSnippet() {
  if (!activeSourceSnippet.value?.snippet) return
  try {
    await writeText(activeSourceSnippet.value.snippet)
    ElMessage.success(t('logAnalyzer.copySnippetSuccess'))
  } catch {
    ElMessage.error(t('logAnalyzer.copySnippetFailed'))
  }
}

async function handlePageChange(page) {
  currentPage.value = page
  await loadBlockPage(page)
  await selectPreferredBlock()
}

async function handlePageSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  await loadBlockPage(1)
  await selectPreferredBlock()
}

function tagType(block) {
  if (block.level === 'ERROR' || block.hasException) return 'danger'
  if (block.level === 'WARN') return 'warning'
  return 'info'
}

async function collectAiBlockDetails() {
  const ids = []
  if (selectedBlockId.value) ids.push(selectedBlockId.value)
  ;(activeSummary.value.rootCauseCandidates || []).forEach(item => ids.push(item.id))
  ;(blockPage.value.items || []).slice(0, AI_BLOCK_LIMIT).forEach(item => ids.push(item.id))
  const uniqueIds = Array.from(new Set(ids)).slice(0, AI_BLOCK_LIMIT)
  const details = []
  for (const id of uniqueIds) {
    try {
      const detail = await fetchBlockDetail(id)
      if (detail) details.push(detail)
    } catch {
      // ignore per-block failures for AI payload assembly
    }
  }
  return details
}

async function runAiAnalysis() {
  if (!canRunAi.value) return
  showAiDrawer.value = true
  aiLoading.value = true
  aiResult.value = ''
  try {
    const details = await collectAiBlockDetails()
    const payload = buildLogAiPayload(activeSummary.value, details, aiMatchedSources.value, {
      keyword: debouncedKeyword.value,
      mode: filterMode.value,
      maxBlocks: AI_BLOCK_LIMIT,
      maxSources: AI_SOURCE_LIMIT,
    })
    aiResult.value = await analyzeJavaLogWithSources(payload)
  } catch (error) {
    ElMessage.error(error.message || t('logAnalyzer.aiFailed'))
  } finally {
    aiLoading.value = false
  }
}

async function cleanupLogEntry(file) {
  try {
    ;(file.unlisteners || []).forEach(unlisten => {
      try { unlisten() } catch {}
    })
    if (file.sessionId) {
      if (file.status === 'indexing') {
        await cancelLogAnalysisSession(file.sessionId).catch(() => {})
      }
      await closeLogAnalysisSession(file.sessionId).catch(() => {})
    }
  } catch {
    // ignore cleanup errors
  }
}

async function removeLogFile(path) {
  const target = getLogFile(path)
  if (target) {
    await cleanupLogEntry(target)
  }
  logFiles.value = logFiles.value.filter(file => file.path !== path)
  if (activeLogPath.value === path) {
    activeLogPath.value = logFiles.value[0]?.path || ''
  }
}

function removeSourceFile(path) {
  sourceFiles.value = sourceFiles.value.filter(file => file.path !== path)
  if (activeSourceSnippet.value?.path === path) {
    activeSourceKey.value = ''
  }
}

async function cleanupAllLogs() {
  const files = [...logFiles.value]
  for (const file of files) {
    await cleanupLogEntry(file)
  }
}

async function clearAll() {
  await cleanupAllLogs()
  logFiles.value = []
  sourceFiles.value = []
  activeLogPath.value = ''
  activeSourceKey.value = ''
  selectedBlockId.value = ''
  selectedBlockDetail.value = null
  blockPage.value = createEmptyBlockPage()
  currentPage.value = 1
  pageSize.value = 50
  showAiDrawer.value = false
  aiResult.value = ''
  keyword.value = ''
  debouncedKeyword.value = ''
  filterMode.value = 'issues'
  detailCache.value = new Map()
}
</script>

<style scoped>
:deep(.log-hl) {
  background: rgba(64, 158, 255, 0.18);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}

:deep(.log-hl.level) { background: rgba(230, 162, 60, 0.22); }
:deep(.log-hl.exception) { background: rgba(245, 108, 108, 0.2); }
:deep(.log-hl.cause) { background: rgba(103, 194, 58, 0.2); }
:deep(.source-hl) {
  background: rgba(64, 158, 255, 0.14);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}

.log-analyzer-wrapper {
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
}

.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
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
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); }
.header-actions { display: flex; align-items: center; gap: 8px; }
.workspace {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  padding: 14px 18px 0;
  overflow: hidden;
}

.left-panel {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
  overflow: hidden;
}

.left-sidebar-section { padding: 12px; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
.left-sidebar-list-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.left-sidebar-list-wrap.is-sources { flex: 0.9; min-height: 100px; }
.left-sidebar-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.left-sidebar-section-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.left-sidebar-count { font-size: 11px; font-weight: 600; color: var(--text-tertiary); }
.left-sidebar-empty { margin-top: 12px; font-size: 11px; color: var(--text-tertiary); text-align: center; padding: 0 4px 8px; }
.search-row { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
.search-input-wrap { flex: 1; min-width: 0; position: relative; }
.keyword-input { width: 100%; }
.mode-select { width: 94px; flex-shrink: 0; }
.search-history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 4px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  box-shadow: var(--shadow-md);
  max-height: 220px;
  overflow-y: auto;
}

.search-history-head,
.search-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
}

.search-history-item { cursor: pointer; }
.search-history-item:hover { background: var(--bg-grouped); }
.search-history-title { font-size: 11px; font-weight: 600; color: var(--text-tertiary); }
.search-history-clear { font-size: 11px; color: var(--accent-blue); cursor: pointer; }
.search-history-text { font-size: 12px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-history-remove { margin-left: 6px; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.hint-alert { flex-shrink: 0; margin: 0; border-radius: 0; border-left: none; border-right: none; }
.compact-file-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.compact-file-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.compact-file-row:hover { background: var(--bg-grouped); }
.compact-file-row.active { background: var(--accent-blue-bg); box-shadow: inset 2px 0 0 var(--accent-blue); }
.compact-file-row.is-static { cursor: default; }
.compact-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.compact-file-name { font-size: 12px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compact-file-meta,
.compact-file-pkg { font-size: 10px; color: var(--text-quaternary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compact-badges { display: flex; gap: 4px; flex-shrink: 0; }
.compact-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
}

.compact-badge.is-error { background: rgba(245, 108, 108, 0.15); color: var(--color-red); }
.compact-badge.is-warn { background: rgba(230, 162, 60, 0.15); color: var(--color-orange); }
.compact-badge.is-info { background: rgba(64, 158, 255, 0.12); color: var(--accent-blue); }
.compact-remove { flex-shrink: 0; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.main-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0 18px 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
}

.summary-strip,
.progress-card,
.root-cause-hero,
.core-analysis-card,
.source-context-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.82);
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 8px 12px;
}

.summary-stat { display: flex; justify-content: center; align-items: baseline; gap: 6px; border-right: 1px solid var(--divider); padding: 0 8px; }
.summary-stat:last-child { border-right: none; }
.summary-stat-label { font-size: 11px; color: var(--text-tertiary); }
.summary-stat-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.summary-stat.is-error .summary-stat-value { color: var(--color-red); }
.summary-stat.is-warn .summary-stat-value { color: var(--color-orange); }
.summary-stat.is-stack .summary-stat-value { color: var(--accent-blue); }
.progress-card { padding: 16px; }
.progress-card.is-error { border-color: rgba(245, 108, 108, 0.28); }
.progress-meta { display: flex; gap: 14px; margin-top: 10px; font-size: 12px; color: var(--text-secondary); }
.error-text { color: var(--color-red); font-size: 13px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-inline-actions { display: flex; align-items: center; gap: 8px; }
.page-size-select { width: 104px; }
.root-cause-hero,
.core-analysis-card,
.source-context-card { padding: 16px; }
.hero-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.hero-eyebrow { font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; }
.hero-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.hero-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.hero-card { border: 1px solid rgba(245, 108, 108, 0.18); border-radius: 14px; padding: 14px; background: rgba(255,255,255,0.92); }
.hero-card.focused { box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.3); }
.hero-card-topline { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.hero-card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.hero-card-meta,
.hero-card-text,
.query-status,
.candidate-meta,
.detail-meta { font-size: 12px; color: var(--text-secondary); }
.hero-card-text { margin-top: 8px; line-height: 1.5; }
.hero-card-actions { margin-top: 8px; }
.analysis-columns { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 14px; margin-top: 12px; }
.analysis-section { border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 14px; background: rgba(248, 250, 252, 0.7); padding: 14px; min-width: 0; }
.subsection-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.block-query-toolbar,
.detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.block-master-detail { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 14px; min-height: 420px; }
.block-summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
  max-height: 520px;
  padding-right: 4px;
}

.block-summary-item {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.86);
  cursor: pointer;
}

.block-summary-item.active { border-color: rgba(64, 158, 255, 0.35); box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.18); }
.block-summary-topline { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.block-summary-title { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-summary-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: var(--text-tertiary); }
.block-summary-preview { margin-top: 8px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; }
.block-detail-panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: rgba(255,255,255,0.9);
  padding: 12px;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.detail-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.block-content,
.source-snippet-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  background: rgba(15, 23, 42, 0.03);
  border-radius: 12px;
  padding: 14px;
  min-height: 0;
  overflow: auto;
}

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
.matched-source-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.matched-source-item { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 10px; padding: 10px 12px; cursor: pointer; background: rgba(255,255,255,0.88); }
.matched-source-item.active { border-color: rgba(64, 158, 255, 0.35); }
.candidate-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.source-snippet-panel { margin-top: 12px; }
.ai-drawer-content { display: flex; flex-direction: column; gap: 12px; }
.ai-meta { font-size: 12px; color: var(--text-tertiary); }
.ai-result { white-space: pre-wrap; line-height: 1.7; color: var(--text-primary); }

@media (max-width: 1280px) {
  .hero-cards,
  .analysis-columns,
  .block-master-detail {
    grid-template-columns: 1fr;
  }
}
</style>
