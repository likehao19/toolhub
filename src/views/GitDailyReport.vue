<template>
  <div class="git-report-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Monitor /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('gitReport.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select
          v-model="selectedRepos"
          multiple
          collapse-tags
          collapse-tags-tooltip
          size="small"
          class="repo-select"
          :placeholder="t('gitReport.selectRepos')"
          filterable
        >
          <el-option v-for="r in discoveredRepos" :key="r" :label="repoName(r)" :value="r">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
              <span style="font-weight:600">{{ repoName(r) }}</span>
              <span style="font-size:11px;color:var(--text-quaternary);margin-left:12px">{{ r }}</span>
            </div>
          </el-option>
        </el-select>
        <el-button size="small" text @click="addRepo" :title="t('gitReport.addRepo')">
          <el-icon><FolderAdd /></el-icon>
        </el-button>
        <el-button size="small" text @click="scanRepos" :loading="scanning" :title="t('gitReport.rescan')">
          <el-icon><Search /></el-icon>
        </el-button>
        <el-button size="small" type="primary" @click="generate" :loading="generating">
          <el-icon style="margin-right: 6px;"><Document /></el-icon>{{ t('gitReport.generate') }}
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-radio-group v-model="timeRange" size="small" @change="onTimeRangeChange">
          <el-radio-button value="today">{{ t('gitReport.today') }}</el-radio-button>
          <el-radio-button value="week">{{ t('gitReport.thisWeek') }}</el-radio-button>
          <el-radio-button value="month">{{ t('gitReport.thisMonth') }}</el-radio-button>
          <el-radio-button value="custom">{{ t('gitReport.custom') }}</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="timeRange === 'custom'"
          v-model="customRange"
          type="daterange"
          size="small"
          :start-placeholder="t('gitReport.startDate')"
          :end-placeholder="t('gitReport.endDate')"
          value-format="YYYY-MM-DD"
          class="date-picker"
        />
      </div>
      <div class="filter-right">
        <el-select v-model="selectedAuthor" size="small" :placeholder="t('gitReport.allAuthors')" clearable class="author-select">
          <el-option v-for="a in authors" :key="a" :label="a" :value="a" />
        </el-select>
      </div>
    </div>

    <!-- 未选择仓库提示 -->
    <div class="empty-state" v-if="!selectedRepos.length && !scanning">
      <div class="empty-icon">📊</div>
      <div class="empty-text">{{ t('gitReport.noRepo') }}</div>
      <div style="display:flex;gap:8px">
        <el-button type="primary" @click="scanRepos" :loading="scanning">
          <el-icon style="margin-right: 6px;"><Search /></el-icon>{{ t('gitReport.autoDetect') }}
        </el-button>
        <el-button @click="addRepo">
          <el-icon style="margin-right: 6px;"><FolderAdd /></el-icon>{{ t('gitReport.addRepo') }}
        </el-button>
      </div>
    </div>

    <div class="empty-state" v-if="!selectedRepos.length && scanning">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">{{ t('gitReport.scanning') }}</div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content" v-if="selectedRepos.length">
      <!-- 左侧：统计 + 提交列表 -->
      <div class="left-panel">
        <!-- 统计卡片 -->
        <div class="stats-cards" v-if="stats">
          <div class="stat-card">
            <div class="stat-value">{{ commits.length }}</div>
            <div class="stat-label">{{ t('gitReport.commits') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value green">+{{ stats.insertions }}</div>
            <div class="stat-label">{{ t('gitReport.insertions') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value red">-{{ stats.deletions }}</div>
            <div class="stat-label">{{ t('gitReport.deletions') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.filesChanged }}</div>
            <div class="stat-label">{{ t('gitReport.filesChanged') }}</div>
          </div>
        </div>

        <!-- 分类提交列表 -->
        <div class="commit-groups" v-if="groupedCommits.length">
          <div v-for="group in groupedCommits" :key="group.label" class="commit-group">
            <div class="group-header">
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">({{ group.commits.length }})</span>
            </div>
            <div v-for="c in group.commits" :key="c.hash" class="commit-item">
              <span class="commit-repo" v-if="selectedRepos.length > 1">[{{ c.repoName }}]</span>
              <span class="commit-msg">{{ c.subject }}</span>
              <span class="commit-time">{{ c.date?.substring(11, 16) }}</span>
            </div>
          </div>
        </div>

        <div class="empty-commits" v-if="!commits.length && !generating">
          {{ t('gitReport.noCommits') }}
        </div>
      </div>

      <!-- 右侧：日报预览 -->
      <div class="right-panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('gitReport.preview') }}</span>
          <div class="panel-actions">
            <el-button size="small" text @click="copyReport" :disabled="!reportMarkdown" :title="t('common.copy')">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <el-button size="small" text @click="exportReport" :disabled="!reportMarkdown" :title="t('common.export')">
              <el-icon><Download /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="report-preview" v-if="reportMarkdown">
          <el-input
            v-model="reportMarkdown"
            type="textarea"
            :autosize="{ minRows: 20 }"
            class="report-textarea"
          />
        </div>
        <div class="report-empty" v-else>
          <span>{{ t('gitReport.clickGenerate') }}</span>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar" v-if="selectedRepos.length">
      <span>{{ t('gitReport.repos') }}: {{ selectedRepos.length }}</span>
      <span v-if="commits.length">{{ t('gitReport.totalCommits') }}: {{ commits.length }}</span>
      <span v-if="lastGenerated" class="status-right">{{ t('gitReport.lastGenerated') }}: {{ lastGenerated }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor, FolderAdd, Document, CopyDocument, Download, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import * as report from '@/utils/gitReportManager.js'
import { discoverRepos } from '@/utils/gitManager.js'

const router = useRouter()

// 共享 GitManager 的已发现仓库列表
const discoveredRepos = ref(JSON.parse(localStorage.getItem('git_discovered_repos') || '[]'))
// 当前选中的仓库（多选）
const selectedRepos = ref(JSON.parse(localStorage.getItem('git_report_selected') || '[]'))
const scanning = ref(false)
const timeRange = ref('today')
const customRange = ref(null)
const selectedAuthor = ref('')
const authors = ref([])
const commits = ref([])
const stats = ref(null)
const groupedCommits = ref([])
const reportMarkdown = ref('')
const generating = ref(false)
const lastGenerated = ref('')

function repoName(path) {
  return path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path
}

// 保存选中仓库到 localStorage
watch(selectedRepos, (val) => {
  localStorage.setItem('git_report_selected', JSON.stringify(val))
}, { deep: true })

function getDateRange() {
  const now = new Date()
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  if (timeRange.value === 'today') {
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return { since: fmt(now), until: fmt(tomorrow) }
  }
  if (timeRange.value === 'week') {
    const day = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - day + 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return { since: fmt(monday), until: fmt(tomorrow) }
  }
  if (timeRange.value === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return { since: fmt(first), until: fmt(tomorrow) }
  }
  if (timeRange.value === 'custom' && customRange.value) {
    // until 需要 +1 天，因为 git --until 语义是"此日期之前"
    const endDate = new Date(customRange.value[1])
    endDate.setDate(endDate.getDate() + 1)
    return { since: customRange.value[0], until: fmt(endDate) }
  }
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return { since: fmt(now), until: fmt(tomorrow) }
}

function getGitUserHint(message, scope) {
  const text = String(message || '')
  const lower = text.toLowerCase()

  if (lower.includes('not allowed')) {
    return t(`${scope}.gitPermissionHint`)
  }
  if (
    lower.includes('not found') ||
    text.includes('系统找不到指定的文件') ||
    text.includes('No such file or directory')
  ) {
    return t(`${scope}.gitMissingHint`)
  }
  return text
}

async function scanRepos() {
  scanning.value = true
  try {
    const repos = await discoverRepos()
    const merged = new Set([...repos, ...discoveredRepos.value])
    discoveredRepos.value = [...merged].sort()
    localStorage.setItem('git_discovered_repos', JSON.stringify(discoveredRepos.value))

    // 如果还没选中仓库，自动全选
    if (!selectedRepos.value.length && discoveredRepos.value.length) {
      selectedRepos.value = [...discoveredRepos.value]
    }
    if (selectedRepos.value.length) {
      await loadAuthors()
      await generate()
    }
    ElMessage.success(t('gitReport.foundRepos', { count: repos.length }))
  } catch (e) {
    ElMessage.error(getGitUserHint(e.message, 'gitReport'))
  } finally {
    scanning.value = false
  }
}

async function addRepo() {
  let dialogOpen
  try {
    dialogOpen = (await import('@tauri-apps/plugin-dialog')).open
  } catch {
    ElMessage.warning('Dialog API unavailable')
    return
  }
  const dir = await dialogOpen({ directory: true, title: t('gitReport.addRepo') })
  if (!dir) return

  // 加入已发现列表
  if (!discoveredRepos.value.includes(dir)) {
    discoveredRepos.value.push(dir)
    localStorage.setItem('git_discovered_repos', JSON.stringify(discoveredRepos.value))
  }

  // 同时选中
  if (!selectedRepos.value.includes(dir)) {
    selectedRepos.value.push(dir)
  }
  await loadAuthors()
  await generate()
}

function onTimeRangeChange() {
  if (timeRange.value !== 'custom') {
    generate()
  }
}

async function loadAuthors() {
  const allAuthors = new Set()
  const results = await Promise.all(
    selectedRepos.value.map(repo =>
      report.getAuthors(repo).catch(() => [])
    )
  )
  for (const list of results) {
    list.forEach(a => allAuthors.add(a))
  }
  authors.value = [...allAuthors]
}

async function generate() {
  if (!selectedRepos.value.length) return
  generating.value = true
  try {
    const { since, until } = getDateRange()
    const options = { since, until }
    if (selectedAuthor.value) options.author = selectedAuthor.value

    const result = await report.aggregateRepos(selectedRepos.value, options)
    commits.value = result.commits
    stats.value = result.stats
    groupedCommits.value = report.groupByCategory(result.commits)
    reportMarkdown.value = report.generateReport(result.commits, result.stats, {
      date: since,
      repoNames: result.repoNames
    })
    lastGenerated.value = new Date().toLocaleTimeString()
  } catch (e) {
    ElMessage.error(e.message || t('gitReport.generateFail'))
  } finally {
    generating.value = false
  }
}

async function copyReport() {
  if (!reportMarkdown.value) return
  try {
    await navigator.clipboard.writeText(reportMarkdown.value)
    ElMessage.success(t('gitReport.copied'))
  } catch {
    ElMessage.error(t('gitReport.copyFail'))
  }
}

async function exportReport() {
  if (!reportMarkdown.value) return
  let dialogSave, fsWriteTextFile
  try {
    dialogSave = (await import('@tauri-apps/plugin-dialog')).save
    fsWriteTextFile = (await import('@tauri-apps/plugin-fs')).writeTextFile
  } catch {
    ElMessage.warning('File API unavailable')
    return
  }
  try {
    const { since } = getDateRange()
    const path = await dialogSave({
      defaultPath: `daily-report-${since}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (!path) return
    await fsWriteTextFile(path, reportMarkdown.value)
    ElMessage.success(t('gitReport.exported'))
  } catch (e) {
    ElMessage.error(e.message)
  }
}

watch(selectedRepos, async (val, oldVal) => {
  if (JSON.stringify(val) === JSON.stringify(oldVal)) return
  if (!val.length) {
    commits.value = []
    stats.value = null
    groupedCommits.value = []
    reportMarkdown.value = ''
    authors.value = []
    return
  }
  await loadAuthors()
  await generate()
}, { deep: true })

watch(selectedAuthor, () => {
  if (selectedRepos.value.length) generate()
})

watch(customRange, (val) => {
  if (timeRange.value === 'custom' && Array.isArray(val) && val[0] && val[1]) {
    generate()
  }
}, { deep: true })

onMounted(async () => {
  // 清理：移除已不在 discovered 列表中的选中仓库
  selectedRepos.value = selectedRepos.value.filter(r => discoveredRepos.value.includes(r))

  if (selectedRepos.value.length) {
    await loadAuthors()
    await generate()
  }
})
</script>

<style scoped>
.git-report-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, var(--surface-panel), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.header-actions :deep(.el-button),
.header-actions :deep(.el-select) { --el-border-radius-base: 10px; }
.repo-select { width: 280px; }
.repo-select :deep(.el-select-dropdown) { min-width: 420px !important; }

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 0;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-bar :deep(.el-radio-button__inner),
.filter-bar :deep(.el-select),
.filter-bar :deep(.el-date-editor) { --el-border-radius-base: 10px; }
.date-picker { width: 240px; }
.author-select { width: 160px; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 18px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: var(--surface-panel-soft);
}
.empty-icon { font-size: 48px; }
.empty-text { color: var(--text-tertiary); font-size: 14px; }

.main-content {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  overflow: hidden;
  min-height: 0;
  padding: 0;
  gap: 0;
}

.left-panel {
  width: 260px;
  min-width: 260px;
  border: 0;
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.stat-card {
  text-align: center;
  padding: 10px 6px;
  background: var(--surface-panel-soft);
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 14px;
}
.stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-value.green { color: var(--el-color-success); }
.stat-value.red { color: var(--el-color-danger); }
.stat-label { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }

.commit-groups { padding: 10px 0; }
.commit-group { margin-bottom: 8px; }
.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.group-icon { font-size: 14px; }
.group-count { color: var(--text-tertiary); font-weight: 400; }
.commit-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 8px 32px;
  margin: 0 10px 8px;
  font-size: 12px;
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 12px;
  background: var(--surface-panel-soft);
}
.commit-repo {
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.commit-msg {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.commit-time {
  color: var(--text-quaternary);
  font-size: 11px;
  flex-shrink: 0;
}
.empty-commits {
  text-align: center;
  margin: 14px;
  padding: 24px;
  color: var(--text-quaternary);
  font-size: 13px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: var(--surface-muted);
}

.right-panel {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
  background: var(--surface-panel-soft);
}
.panel-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.panel-actions { display: flex; gap: 2px; }
.report-preview {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 14px;
  box-sizing: border-box;
}
.report-textarea {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
}
.report-textarea :deep(.el-textarea__inner) {
  flex: 1;
  width: 100%;
  height: 100% !important;
  min-height: 100% !important;
  box-sizing: border-box;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.7;
  background: rgba(248, 244, 232,0.88);
  color: var(--text-primary);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  resize: none;
  box-shadow: none;
}
.report-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  font-size: 13px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  margin: 0 18px 18px;
  background: var(--surface-panel-soft);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: none;
  font-size: 11px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: 0 0 18px 18px;
}
.status-right { margin-left: auto; }

@media (max-width: 1100px) {
  .header,
  .filter-bar {
    align-items: flex-start;
  }

  .header {
    flex-direction: column;
    padding: 10px 14px;
  }

  .header-left,
  .header-actions,
  .filter-left,
  .filter-right {
    width: 100%;
  }

  .main-content {
    flex-direction: column;
    gap: 12px;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    min-width: 0;
    border-radius: 18px;
    border: 1px solid rgba(60, 40, 20, 0.08);
  }

  .status-bar {
    border-top: 1px solid rgba(60, 40, 20, 0.08);
    border-radius: 18px;
  }
}
</style>
