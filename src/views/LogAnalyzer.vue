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
        <el-button size="small" type="primary" @click="runAiAnalysis" :disabled="!activeLogAnalysis || aiLoading">
          <el-icon><MagicStick /></el-icon>
          {{ t('logAnalyzer.aiAnalyze') }}
        </el-button>
      </div>
    </div>

    <div class="workspace">
      <aside class="left-panel">
        <!-- Search tools -->
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
              <!-- Search history dropdown -->
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

        <!-- Log files - compact one-line list -->
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
              <span class="compact-file-name" :title="file.name">{{ file.name }}</span>
              <span class="compact-badges">
                <span v-if="file.summary.errors" class="compact-badge is-error">{{ file.summary.errors }}</span>
                <span v-if="file.summary.warnings" class="compact-badge is-warn">{{ file.summary.warnings }}</span>
                <span v-if="file.summary.meta?.isLargeFile" class="compact-badge is-info">L</span>
              </span>
              <span class="compact-remove" @click.stop="removeLogFile(file.path)">&times;</span>
            </li>
          </ul>
          <div v-else class="left-sidebar-empty">{{ t('logAnalyzer.noLogs') }}</div>
        </div>

        <!-- Source files - compact one-line list -->
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
        <template v-if="activeLogAnalysis">
          <div class="summary-strip" role="group" :aria-label="t('logAnalyzer.title')">
            <div class="summary-stat">
              <span class="summary-stat-label">{{ t('logAnalyzer.totalLines') }}</span>
              <span class="summary-stat-value">{{ activeSummary.totalLines }}</span>
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
            <div v-if="activeSummary.meta?.isLargeFile" class="section-subhint">
              {{ t('logAnalyzer.largeFileDetail', { count: activeSummary.meta?.displayedBlockCount || filteredBlocks.length, total: activeSummary.meta?.totalBlockCount || activeSummary.totalBlocks }) }}
            </div>
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
                :class="{ focused: focusedRootCauseId === item.id }"
              >
                <div class="hero-card-topline">
                  <div class="hero-card-title">{{ item.exceptionType || item.headline }}</div>
                  <el-tag v-if="focusedRootCauseId === item.id" size="small" type="success">{{ t('logAnalyzer.currentTarget') }}</el-tag>
                </div>
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
            <div v-if="hasFilteredBlocksOverflow" class="section-subhint">
              {{ t('logAnalyzer.blockLimitHint', { count: BLOCK_DISPLAY_LIMIT }) }}
            </div>

            <div class="analysis-columns">
              <section class="analysis-section secondary">
                <div class="subsection-title">{{ t('logAnalyzer.exceptionTypes') }}</div>
                <div class="tag-list" v-if="activeSummary.topExceptions.length">
                  <el-tag v-for="item in activeSummary.topExceptions" :key="item.name" class="summary-tag">
                    {{ item.name }} &times; {{ item.count }}
                  </el-tag>
                </div>
                <el-empty v-else :description="t('logAnalyzer.noExceptions')" :image-size="46" />
              </section>

              <section class="analysis-section primary">
                <div class="subsection-title">{{ t('logAnalyzer.filteredBlocks') }}</div>
                <div v-if="filteredBlocks.length" class="block-list" ref="blockListRef">
                  <el-collapse v-model="activeBlockNames">
                    <el-collapse-item v-for="block in filteredBlocks" :key="block.id" :name="block.id">
                      <template #title>
                        <div class="block-title-row" :data-block-id="block.id">
                          <el-tag size="small" :type="tagType(block)">{{ block.level || 'LOG' }}</el-tag>
                          <span class="block-title">{{ displayBlockTitle(block) }}</span>
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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Upload, FolderOpened, Delete, Search, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { t } from '@/i18n'
import { openFiles, selectFolder } from '@/utils/tauri/dialog'
import { readTextFile } from '@/utils/tauri/fileOps'
import { readDir } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import {
  parseLogFile,
  summarizeLogAnalysis,
  filterLogBlocks,
  extractReferencedClasses,
  buildLogAiPayload,
  extractRelevantStackFrames,
  highlightLogText,
} from '@/utils/logAnalysis'
import { parseJavaSourceMeta, buildSourceSnippets } from '@/utils/sourceContextAnalysis'
import { analyzeJavaLogWithSources } from '@/services/aiService'

const BLOCK_DISPLAY_LIMIT = 200
const MATCHED_SOURCE_LIMIT = 8
const AI_SOURCE_LIMIT = 6
const LARGE_LOG_LINE_HINT = 10000
const SEARCH_HISTORY_KEY = 'log_analyzer_search_history'
const SEARCH_HISTORY_MAX = 10
const DEBOUNCE_MS = 300

const router = useRouter()
const blockListRef = ref(null)
const searchWrapRef = ref(null)

const logFiles = ref([])
const sourceFiles = ref([])
const activeLogPath = ref('')
const activeSourceKey = ref('')
const activeBlockNames = ref([])
const focusedRootCauseId = ref('')
const showAiDrawer = ref(false)
const keyword = ref('')
const debouncedKeyword = ref('')
const filterMode = ref('issues')
const aiResult = ref('')
const aiLoading = ref(false)
const showHistory = ref(false)
const searchHistoryList = ref([])

// Debounce keyword
let debounceTimer = null
watch(keyword, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, DEBOUNCE_MS)
})

// Search history
function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    searchHistoryList.value = raw ? JSON.parse(raw) : []
  } catch { searchHistoryList.value = [] }
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

// Close history dropdown on outside click
function handleClickOutside(e) {
  if (searchWrapRef.value && !searchWrapRef.value.contains(e.target)) {
    showHistory.value = false
  }
}

onMounted(() => {
  loadSearchHistory()
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  clearTimeout(debounceTimer)
})

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

const allFilteredBlocks = computed(() => {
  if (!activeLogAnalysis.value) return []
  return filterLogBlocks(activeLogAnalysis.value, {
    mode: filterMode.value,
    keyword: debouncedKeyword.value,
  })
})

const filteredBlocks = computed(() => allFilteredBlocks.value.slice(0, BLOCK_DISPLAY_LIMIT))
const hasFilteredBlocksOverflow = computed(() => allFilteredBlocks.value.length > BLOCK_DISPLAY_LIMIT)

const relevantStackFrames = computed(() => {
  if (!activeLogAnalysis.value) return []
  return extractRelevantStackFrames(activeLogAnalysis.value, 30)
})

const snippetHighlightTerms = computed(() => {
  const terms = new Set()
  activeSummary.value.topExceptions.forEach(item => terms.add(item.name))
  relevantStackFrames.value.forEach(frame => {
    if (frame.methodName) terms.add(frame.methodName)
    if (frame.fullClassName) {
      terms.add(frame.fullClassName)
      const short = frame.fullClassName.split('.').pop()
      if (short) terms.add(short)
    }
  })
  return Array.from(terms)
})

const matchedSourceSnippets = computed(() => {
  if (!activeLogAnalysis.value) return []
  return buildSourceSnippets(sourceFiles.value.map(item => ({ ...item.meta, path: item.path })), extractReferencedClasses(activeLogAnalysis.value), {
    maxFiles: MATCHED_SOURCE_LIMIT,
    maxLength: 2000,
    stackFrames: relevantStackFrames.value,
    extraTerms: snippetHighlightTerms.value,
  })
})

const aiMatchedSources = computed(() => matchedSourceSnippets.value.slice(0, AI_SOURCE_LIMIT))

const activeSourceSnippet = computed(() => {
  if (!matchedSourceSnippets.value.length) return null
  return matchedSourceSnippets.value.find(item => item.sourceKey === activeSourceKey.value) || null
})

const highlightSourceSnippetHtml = computed(() => {
  return activeSourceSnippet.value?.highlightedSnippet || activeSourceSnippet.value?.snippet || ''
})

const highlightedBlocks = computed(() => {
  return new Map(filteredBlocks.value.map(block => [block.id, highlightLogText(block, debouncedKeyword.value)]))
})

const analysisHint = computed(() => {
  if (!activeLog.value) return ''
  if (activeLog.value?.summary?.meta?.isLargeFile || (activeLog.value?.summary?.totalLines || 0) > LARGE_LOG_LINE_HINT) {
    return t('logAnalyzer.largeFileHint')
  }
  if (sourceFiles.value.length && matchedSourceSnippets.value.length === 0) {
    return t('logAnalyzer.sourceNotMatched')
  }
  return ''
})

function nameFromPath(path) {
  return String(path || '').split(/[/\\]/).pop() || path
}

async function loadFiles(paths, kind) {
  if (!paths?.length) return
  const list = Array.isArray(paths) ? paths : [paths]
  const existingPaths = new Set((kind === 'log' ? logFiles.value : sourceFiles.value).map(item => item.path))
  const nextEntries = []
  let skipped = 0

  for (const path of list) {
    if (existingPaths.has(path)) {
      skipped += 1
      continue
    }

    try {
      const result = await readTextFile(path)
      const content = typeof result === 'string' ? result : result?.content || ''
      const name = path.split(/[/\\]/).pop()

      if (kind === 'log') {
        const analysis = parseLogFile(content, name)
        const summary = summarizeLogAnalysis(analysis)
        nextEntries.push({ path, name, content, analysis, summary })
      } else {
        nextEntries.push({
          path,
          name,
          content,
          meta: parseJavaSourceMeta(content, name),
        })
      }

      existingPaths.add(path)
    } catch {
      ElMessage.error(`${nameFromPath(path)} ${t('logAnalyzer.readFailed')}`)
    }
  }

  if (nextEntries.length) {
    if (kind === 'log') {
      logFiles.value = [...logFiles.value, ...nextEntries]
      if (!activeLogPath.value) {
        activeLogPath.value = nextEntries[0].path
      }
    } else {
      sourceFiles.value = [...sourceFiles.value, ...nextEntries]
    }
  }

  if (skipped) {
    ElMessage.warning(t('logAnalyzer.duplicateSkipped', { count: skipped }))
  }
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

function removeLogFile(path) {
  const nextFiles = logFiles.value.filter(file => file.path !== path)
  logFiles.value = nextFiles
  if (activeLogPath.value === path) {
    activeLogPath.value = nextFiles[0]?.path || ''
  }
}

function removeSourceFile(path) {
  sourceFiles.value = sourceFiles.value.filter(file => file.path !== path)
  if (activeSourceSnippet.value?.path === path) {
    activeSourceKey.value = ''
  }
}

function clearAll() {
  logFiles.value = []
  sourceFiles.value = []
  activeLogPath.value = ''
  activeSourceKey.value = ''
  activeBlockNames.value = []
  focusedRootCauseId.value = ''
  showAiDrawer.value = false
  aiResult.value = ''
  keyword.value = ''
  debouncedKeyword.value = ''
  filterMode.value = 'issues'
}

async function runAiAnalysis() {
  if (!activeLogAnalysis.value) return
  showAiDrawer.value = true
  aiLoading.value = true
  aiResult.value = ''
  try {
    const payload = buildLogAiPayload(activeLogAnalysis.value, aiMatchedSources.value, {
      keyword: debouncedKeyword.value,
      mode: filterMode.value,
      maxBlocks: 20,
      maxSources: AI_SOURCE_LIMIT,
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

function displayBlockTitle(block) {
  return block.exceptionType || block.rootCauseLine || block.headline
}

function highlightBlock(block) {
  return highlightedBlocks.value.get(block.id) || block.rawText
}

function selectMatchedSource(source) {
  activeSourceKey.value = source.sourceKey
}

async function focusRootCauseBlock() {
  const first = activeSummary.value.rootCauseCandidates?.[0]
  activeBlockNames.value = first ? [first.id] : []
  focusedRootCauseId.value = first?.id || ''
  if (first?.id) {
    await nextTick()
    await scrollBlockIntoView(first.id)
  }
}

async function scrollBlockIntoView(blockId) {
  await nextTick()
  const container = blockListRef.value
  if (!container) return
  const target = container.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function jumpToBlock(block) {
  if (!block?.id) return
  focusedRootCauseId.value = block.id
  activeBlockNames.value = [block.id]
  await scrollBlockIntoView(block.id)
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

// Only one watcher for activeLogPath — no duplicate activeSummary watcher
watch(activeLogPath, () => {
  activeSourceKey.value = ''
  void focusRootCauseBlock()
}, { immediate: true })

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

:deep(.source-hl) {
  background: rgba(64, 158, 255, 0.14);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}

:deep(.source-exception) {
  background: rgba(245, 108, 108, 0.18);
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
  min-width: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  overflow: hidden;
}

.left-panel {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-right: 2px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-primary);
  overflow: hidden;
}

.left-sidebar-section {
  padding: 10px 10px;
  border-bottom: 1px solid var(--divider);
}

.left-sidebar-tools {
  flex: none;
}

.left-sidebar-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.left-sidebar-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.left-sidebar-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.left-sidebar-list-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.left-sidebar-list-wrap.is-sources {
  flex: 0.9;
  min-height: 100px;
}

.left-sidebar-empty {
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 0 4px 8px;
}

/* ===== Search row ===== */
.search-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.search-input-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
}

.keyword-input {
  width: 100%;
}

.mode-select {
  width: 90px;
  flex-shrink: 0;
}

/* ===== Search history dropdown ===== */
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

.search-history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid var(--divider);
}

.search-history-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.search-history-clear {
  font-size: 11px;
  color: var(--accent-blue);
  cursor: pointer;
}

.search-history-clear:hover {
  text-decoration: underline;
}

.search-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  cursor: pointer;
  transition: background 0.1s;
}

.search-history-item:hover {
  background: var(--bg-grouped);
}

.search-history-text {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.search-history-remove {
  flex-shrink: 0;
  margin-left: 6px;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  line-height: 1;
}

.search-history-remove:hover {
  color: var(--color-red);
}

/* ===== Compact file list (one-line per item) ===== */
.compact-file-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.left-sidebar-list-wrap:not(.is-sources) .compact-file-list {
  max-height: 200px;
}

.left-sidebar-list-wrap.is-sources .compact-file-list {
  max-height: 160px;
}

.compact-file-list::-webkit-scrollbar {
  width: 4px;
}

.compact-file-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.compact-file-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 26px;
}

.compact-file-row:hover {
  background: var(--bg-grouped);
}

.compact-file-row.active {
  background: var(--accent-blue-bg);
  box-shadow: inset 2px 0 0 var(--accent-blue);
}

.compact-file-row.is-static {
  cursor: default;
}

.compact-file-row.is-static:hover {
  background: transparent;
}

.compact-file-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-file-pkg {
  flex-shrink: 1;
  min-width: 0;
  font-size: 10px;
  color: var(--text-quaternary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60px;
}

.compact-badges {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.compact-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

.compact-badge.is-error {
  background: rgba(245, 108, 108, 0.15);
  color: var(--color-red);
}

.compact-badge.is-warn {
  background: rgba(230, 162, 60, 0.15);
  color: var(--color-orange);
}

.compact-badge.is-info {
  background: rgba(64, 158, 255, 0.12);
  color: var(--accent-blue);
}

.compact-remove {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.1s;
}

.compact-file-row:hover .compact-remove {
  opacity: 1;
}

.compact-remove:hover {
  color: var(--color-red);
}

.hint-alert {
  flex-shrink: 0;
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
}

/* ===== Main panel ===== */
.main-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.summary-strip {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-width: 0;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  box-sizing: border-box;
  flex-shrink: 0;
}

.summary-stat {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 0 8px;
  border-right: 1px solid var(--divider);
}

.summary-stat:last-child {
  border-right: none;
}

.summary-stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 42%;
}

.summary-stat-value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  flex-shrink: 0;
}

.summary-stat.is-error .summary-stat-value {
  color: var(--color-red);
}

.summary-stat.is-warn .summary-stat-value {
  color: var(--color-orange);
}

.summary-stat.is-stack .summary-stat-value {
  color: var(--accent-blue);
}

/* ===== Root cause hero ===== */
.root-cause-hero {
  min-width: 0;
  max-width: 100%;
  border: 1px solid rgba(245, 108, 108, 0.18);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.08), var(--bg-primary));
  box-shadow: 0 12px 28px rgba(245, 108, 108, 0.08);
  box-sizing: border-box;
}

.hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hero-eyebrow {
  font-size: 11px;
  color: var(--color-red);
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
  min-width: 0;
  width: 100%;
}

.hero-card {
  border: 1px solid rgba(245, 108, 108, 0.18);
  border-radius: 12px;
  background: var(--bg-primary);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.hero-card.focused {
  border-color: var(--color-green);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12);
}

.hero-card-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.hero-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
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
  overflow-wrap: anywhere;
  flex: 1;
  min-width: 0;
}

.hero-card-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.hero-card-actions :deep(.el-button) {
  font-weight: 600;
}

/* ===== Cards ===== */
.core-analysis-card,
.source-context-card {
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  box-sizing: border-box;
  padding: 14px;
}

.section-header,
.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  min-width: 0;
}

.source-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-meta,
.candidate-meta,
.section-subhint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.analysis-columns {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  width: 100%;
  align-items: start;
}

.analysis-section {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-primary);
}

.analysis-section.primary {
  min-height: 0;
}

.subsection-title {
  margin-bottom: 10px;
}

.matched-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matched-source-item {
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 10px;
  cursor: pointer;
}

.matched-source-item.active {
  border-color: var(--accent-blue);
  background: var(--accent-blue-bg);
}

.candidate-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
  overflow-wrap: anywhere;
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
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-secondary);
}

.source-snippet-content {
  margin: 8px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-tertiary, var(--bg-secondary));
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
  box-sizing: border-box;
}

/* block list */
.block-list {
  min-height: 0;
  overflow: visible;
}

.block-title-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
  width: 100%;
}

.block-title-row :deep(.el-tag) {
  flex-shrink: 0;
  margin-top: 1px;
}

.block-title {
  flex: 1 1 160px;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: normal;
  overflow: visible;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.block-lines {
  flex: 0 1 auto;
  max-width: 100%;
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.block-meta-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0;
}

.block-frame-preview {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--text-tertiary);
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.core-analysis-card :deep(.el-collapse) {
  width: 100%;
  --el-collapse-header-height: auto;
}

.core-analysis-card :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 44px;
  line-height: 1.45;
  align-items: flex-start;
  padding-top: 10px;
  padding-bottom: 10px;
  box-sizing: border-box;
  overflow: visible;
}

.core-analysis-card :deep(.el-collapse-item__arrow) {
  align-self: flex-start;
  margin-top: 6px;
}

.core-analysis-card :deep(.el-collapse-item__wrap) {
  overflow: visible;
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
  overflow-wrap: anywhere;
  max-width: 100%;
  box-sizing: border-box;
}

.ai-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.ai-drawer-content .ai-result {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 200px minmax(0, 1fr);
  }

  .summary-strip {
    flex-wrap: wrap;
    row-gap: 8px;
    padding: 8px 10px;
  }

  .summary-stat {
    flex: 1 1 45%;
    border-right: none;
    padding: 4px 6px;
    justify-content: flex-start;
  }

  .summary-stat:nth-child(odd) {
    border-right: 1px solid var(--divider);
  }

  .hero-cards,
  .analysis-columns {
    grid-template-columns: 1fr;
  }
}
</style>
