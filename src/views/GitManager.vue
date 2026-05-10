<template>
  <div class="git-manager-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Monitor /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('gitManager.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select
          v-if="discoveredRepos.length"
          v-model="repoPath"
          size="small"
          class="repo-select"
          :placeholder="t('gitManager.selectRepo')"
          @change="onRepoChange"
          filterable
        >
          <el-option v-for="r in discoveredRepos" :key="r" :label="repoDisplayName(r)" :value="r">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
              <span style="font-weight:600">{{ repoDisplayName(r) }}</span>
              <span style="font-size:11px;color:var(--text-quaternary);margin-left:12px">{{ r }}</span>
            </div>
          </el-option>
        </el-select>
        <el-button size="small" text @click="selectRepo" :title="t('gitManager.browseRepo')">
          <el-icon><FolderOpened /></el-icon>
        </el-button>
        <el-button size="small" text @click="scanRepos" :loading="scanning" :title="t('gitManager.rescan')">
          <el-icon><Search /></el-icon>
        </el-button>
        <el-button size="small" text @click="refresh" :loading="loading" :title="t('common.refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 仓库信息栏 -->
    <div class="repo-bar" v-if="repoPath">
      <div class="repo-info">
        <span class="repo-name">{{ repoDisplayName(repoPath) }}</span>
        <span class="repo-path-hint" :title="repoPath">{{ repoPath }}</span>
        <span class="branch-badge" v-if="branch">
          <el-icon><Connection /></el-icon>
          {{ branch }}
        </span>
        <span class="remote-status" v-if="remoteStatus">
          <span v-if="remoteStatus.ahead" class="ahead">↑{{ remoteStatus.ahead }}</span>
          <span v-if="remoteStatus.behind" class="behind">↓{{ remoteStatus.behind }}</span>
          <span v-if="!remoteStatus.ahead && !remoteStatus.behind" class="synced">✓</span>
        </span>
      </div>
      <div class="repo-actions">
        <el-select v-model="branch" size="small" class="branch-select" @change="switchBranch">
          <el-option v-for="b in branches" :key="b" :label="b" :value="b" />
        </el-select>
      </div>
    </div>

    <!-- 未选择仓库提示 -->
    <div class="empty-state" v-if="!repoPath && !scanning">
      <div class="empty-icon">📂</div>
      <div class="empty-text">{{ t('gitManager.noRepo') }}</div>
      <div class="empty-actions">
        <el-button type="primary" @click="scanRepos" :loading="scanning">
          <el-icon style="margin-right: 6px;"><Search /></el-icon>{{ t('gitManager.autoDetect') }}
        </el-button>
        <el-button @click="selectRepo">
          <el-icon style="margin-right: 6px;"><FolderOpened /></el-icon>{{ t('gitManager.browseRepo') }}
        </el-button>
      </div>
    </div>

    <!-- 扫描中 -->
    <div class="empty-state" v-if="!repoPath && scanning">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">{{ t('gitManager.scanning') }}</div>
    </div>

    <!-- 主内容区 -->
    <div class="workspace-shell" v-if="repoPath">
      <div class="main-content">
      <!-- 左侧：文件列表 -->
      <div class="file-panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('gitManager.changes') }} ({{ filteredFiles.length }})</span>
          <div class="panel-actions">
            <el-button size="small" text @click="doStageAll" :disabled="!hasUnstaged">
              {{ t('gitManager.stageAll') }}
            </el-button>
            <el-button size="small" text @click="doUnstageAll" :disabled="!hasStaged">
              {{ t('gitManager.unstageAll') }}
            </el-button>
          </div>
        </div>

        <!-- 搜索 -->
        <div class="file-filter">
          <el-input
            v-model="fileSearch"
            :placeholder="t('gitManager.searchFiles')"
            size="small"
            clearable
            class="file-search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 文件列表滚动区 -->
        <div class="file-list-scroll">
          <div v-if="loading" class="file-list-skeleton" aria-hidden="true">
            <div class="skeleton-section-label"></div>
            <div v-for="idx in 8" :key="`skeleton-${idx}`" class="skeleton-file-item">
              <span class="skeleton-check"></span>
              <span class="skeleton-status"></span>
              <span class="skeleton-name"></span>
            </div>
          </div>

          <!-- 更改（所有已跟踪的变动文件） -->
          <div class="file-section" v-if="!loading && trackedFiles.length">
            <div class="section-label">{{ t('gitManager.changes') }} ({{ trackedFiles.length }})</div>
            <template v-for="node in stagedTree" :key="'s-' + node.key">
              <div v-if="node.isDir" class="dir-item" @click="toggleDir('staged', node.key)">
                <span class="dir-arrow">{{ expandedDirs.has('staged:' + node.key) ? '▾' : '▸' }}</span>
                <span class="dir-icon">📁</span>
                <span class="dir-name">{{ node.name }}</span>
                <span class="dir-count">({{ node.children.length }})</span>
              </div>
              <template v-if="!node.isDir || expandedDirs.has('staged:' + node.key)">
                <div
                  v-for="f in (node.isDir ? node.children : [node])"
                  :key="'sf-' + f.path"
                  class="file-item"
                  :class="{ active: selectedFile?.path === f.path }"
                  :style="{ paddingLeft: node.isDir ? '32px' : '12px' }"
                  @click="selectFile(f)"
                >
                  <el-checkbox :model-value="f.isStaged" @click.stop @change="toggleStage(f)" />
                  <span class="file-status" :class="f.status">{{ statusIcon(f) }}</span>
                  <span class="file-name" :title="f.path">{{ fileName(f.path) }}</span>
                </div>
              </template>
            </template>
          </div>

          <!-- 未跟踪文件 -->
          <div class="file-section" v-if="!loading && untrackedFiles.length">
            <div class="section-label">{{ t('gitManager.untracked') }} ({{ untrackedFiles.length }})</div>
            <template v-for="node in untrackedTree" :key="'t-' + node.key">
              <div v-if="node.isDir" class="dir-item" @click="toggleDir('untracked', node.key)">
                <span class="dir-arrow">{{ expandedDirs.has('untracked:' + node.key) ? '▾' : '▸' }}</span>
                <span class="dir-icon">📁</span>
                <span class="dir-name">{{ node.name }}</span>
                <span class="dir-count">({{ node.children.length }})</span>
              </div>
              <template v-if="!node.isDir || expandedDirs.has('untracked:' + node.key)">
                <div
                  v-for="f in (node.isDir ? node.children : [node])"
                  :key="'tf-' + f.path"
                  class="file-item"
                  :class="{ active: selectedFile?.path === f.path }"
                  :style="{ paddingLeft: node.isDir ? '32px' : '12px' }"
                  @click="selectFile(f)"
                >
                  <el-checkbox :model-value="false" @click.stop @change="stageFile(f)" />
                  <span class="file-status" :class="f.status">{{ statusIcon(f) }}</span>
                  <span class="file-name" :title="f.path">{{ fileName(f.path) }}</span>
                </div>
              </template>
            </template>
          </div>

          <div class="empty-files" v-if="!files.length && !loading">
            <span>{{ t('gitManager.noChanges') }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：Diff预览 -->
      <div class="diff-panel">
        <div class="panel-header">
          <span class="panel-title">
            {{ selectedFile ? selectedFile.path : t('gitManager.diffPreview') }}
          </span>
        </div>
        <div class="diff-content" v-if="diffText">
          <div
            v-for="(line, idx) in diffLines"
            :key="idx"
            class="diff-line"
            :class="line.type"
          >
            <span class="line-num">{{ line.num || '' }}</span>
            <span class="line-text">{{ line.text }}</span>
          </div>
        </div>
        <div class="diff-empty" v-else>
          <div class="diff-empty-card">
            <div class="diff-empty-icon">⟂</div>
            <div class="diff-empty-title">{{ t('gitManager.diffPreview') }}</div>
            <div class="diff-empty-text">{{ t('gitManager.selectFileToView') }}</div>
          </div>
        </div>
      </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="bottom-bar">
      <div class="commit-area">
        <el-input
          v-model="commitMessage"
          :placeholder="t('gitManager.commitPlaceholder')"
          size="small"
          class="commit-input"
          @keyup.enter.ctrl="doCommit"
        />
        <el-button size="small" type="primary" @click="doCommit" :disabled="!commitMessage.trim() || !hasStaged" :loading="committing">
          <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('gitManager.commit') }}
        </el-button>
      </div>
      <div class="action-buttons">
        <el-button size="small" @click="doPull" :loading="pulling">
          <el-icon><Download /></el-icon>
          Pull
        </el-button>
        <el-button size="small" @click="doPush" :loading="pushing">
          <el-icon><Upload /></el-icon>
          Push
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" @click="doStash" :disabled="!files.length">
          Stash
        </el-button>
        <el-button size="small" @click="doStashPop">
          Pop
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" text @click="showLogDialog = true" :title="t('gitManager.log')">
          <el-icon><Tickets /></el-icon>
        </el-button>
      </div>
      </div>
    </div>

    <!-- 提交历史对话框 -->
    <el-dialog v-model="showLogDialog" :title="t('gitManager.commitHistory')" width="680px" append-to-body>
      <div class="log-list" v-loading="logLoading">
        <div v-for="item in logList" :key="item.hash" class="log-item">
          <div class="log-header">
            <span class="log-hash">{{ item.shortHash }}</span>
            <span class="log-refs" v-if="item.refs">{{ item.refs }}</span>
            <span class="log-date">{{ item.date?.substring(0, 16) }}</span>
          </div>
          <div class="log-subject">{{ item.subject }}</div>
          <div class="log-author">{{ item.author }}</div>
        </div>
        <div v-if="!logList.length && !logLoading" class="log-empty">{{ t('gitManager.noCommits') }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor, Refresh, FolderOpened, Connection, Download, Upload, Search, Tickets, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import * as git from '@/utils/gitManager.js'

const dialogMod = import('@tauri-apps/plugin-dialog')

const router = useRouter()

const repoPath = ref(localStorage.getItem('git_manager_repo') || '')
const discoveredRepos = ref(JSON.parse(localStorage.getItem('git_discovered_repos') || '[]'))
const scanning = ref(false)
const branch = ref('')
const branches = ref([])
const remoteStatus = ref(null)
const files = ref([])
const selectedFile = ref(null)
const diffText = ref('')
const commitMessage = ref('')
const loading = ref(false)
const committing = ref(false)
const pushing = ref(false)
const pulling = ref(false)
const showLogDialog = ref(false)
const logLoading = ref(false)
const logList = ref([])
const fileSearch = ref('')

// 过滤后的文件列表（仅搜索过滤，不隐藏任何 git 状态）
const filteredFiles = computed(() => {
  if (!fileSearch.value.trim()) return files.value
  const q = fileSearch.value.toLowerCase()
  return files.value.filter(f => f.path.toLowerCase().includes(q))
})

const trackedFiles = computed(() => filteredFiles.value.filter(f => !f.isUntracked))
const untrackedFiles = computed(() => filteredFiles.value.filter(f => f.isUntracked))
const hasStaged = computed(() => trackedFiles.value.some(f => f.isStaged))
const hasUnstaged = computed(() => trackedFiles.value.some(f => !f.isStaged) || untrackedFiles.value.length > 0)
const expandedDirs = ref(new Set())

// 将扁平文件列表按目录分组成树结构
function buildTree(fileList) {
  const dirMap = new Map() // dir => files
  const rootFiles = []

  for (const f of fileList) {
    const dir = fileDir(f.path)
    if (dir) {
      if (!dirMap.has(dir)) dirMap.set(dir, [])
      dirMap.get(dir).push(f)
    } else {
      rootFiles.push(f)
    }
  }

  const nodes = []
  // 目录节点排前面
  for (const [dir, children] of [...dirMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    nodes.push({ isDir: true, name: dir, key: dir, children })
  }
  // 根目录文件
  for (const f of rootFiles) {
    nodes.push({ ...f, isDir: false, key: f.path })
  }
  return nodes
}

const stagedTree = computed(() => buildTree(trackedFiles.value))
const untrackedTree = computed(() => buildTree(untrackedFiles.value))

function toggleDir(section, dirKey) {
  const key = section + ':' + dirKey
  const newSet = new Set(expandedDirs.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  expandedDirs.value = newSet
}

// diff 行解析
const diffLines = computed(() => {
  if (!diffText.value) return []
  return diffText.value.split('\n').map((text, i) => {
    let type = 'context'
    if (text.startsWith('+')) type = 'add'
    else if (text.startsWith('-')) type = 'del'
    else if (text.startsWith('@@')) type = 'hunk'
    else if (text.startsWith('diff') || text.startsWith('index') || text.startsWith('---') || text.startsWith('+++')) type = 'meta'
    return { num: i + 1, text, type }
  })
})

function statusIcon(f) {
  const map = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: 'U', copied: 'C' }
  return map[f.status] || '?'
}

function fileName(p) {
  return p.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || p
}

function fileDir(p) {
  const cleaned = p.replace(/[/\\]+$/, '')
  const parts = cleaned.split(/[/\\]/)
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

function repoDisplayName(path) {
  return path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path
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
    const repos = await git.discoverRepos()
    // 合并：扫描结果 + 用户手动添加过的（不丢失手动添加的仓库）
    const merged = new Set([...repos, ...discoveredRepos.value])
    discoveredRepos.value = [...merged].sort()
    localStorage.setItem('git_discovered_repos', JSON.stringify(discoveredRepos.value))

    // 如果还没选中仓库，自动选第一个
    if (!repoPath.value && discoveredRepos.value.length) {
      repoPath.value = discoveredRepos.value[0]
      localStorage.setItem('git_manager_repo', repoPath.value)
      await refresh()
    }
    ElMessage.success(t('gitManager.foundRepos', { count: repos.length }))
  } catch (e) {
    ElMessage.error(getGitUserHint(e.message, 'gitManager'))
  } finally {
    scanning.value = false
  }
}

function onRepoChange(newPath) {
  localStorage.setItem('git_manager_repo', newPath)
  selectedFile.value = null
  diffText.value = ''
  refresh()
}

async function selectRepo() {
  let dialogOpen
  try {
    dialogOpen = (await dialogMod).open
  } catch {
    ElMessage.warning(t('gitManager.dialogApiUnavailable'))
    return
  }
  const dir = await dialogOpen({ directory: true, title: t('gitManager.selectRepo') })
  if (!dir) return

  const isRepo = await git.isGitRepo(dir)
  if (!isRepo) {
    ElMessage.error(t('gitManager.notGitRepo'))
    return
  }

  repoPath.value = dir
  localStorage.setItem('git_manager_repo', dir)
  // 加入已发现列表
  if (!discoveredRepos.value.includes(dir)) {
    discoveredRepos.value.push(dir)
    localStorage.setItem('git_discovered_repos', JSON.stringify(discoveredRepos.value))
  }
  await refresh()
}

async function refresh() {
  if (!repoPath.value) return
  loading.value = true
  try {
    const [status, currentBranch, branchList, remote] = await Promise.all([
      git.getStatus(repoPath.value),
      git.getCurrentBranch(repoPath.value),
      git.getBranches(repoPath.value),
      git.getRemoteStatus(repoPath.value)
    ])
    files.value = status
    branch.value = currentBranch
    branches.value = branchList
    remoteStatus.value = remote

    // 如果当前选中文件仍在列表中，刷新 diff
    if (selectedFile.value) {
      const still = status.find(f => f.path === selectedFile.value.path)
      if (still) {
        selectFile(still)
      } else {
        selectedFile.value = null
        diffText.value = ''
      }
    }
  } catch (e) {
    ElMessage.error(e.message || t('gitManager.loadFail'))
  } finally {
    loading.value = false
  }
}

async function selectFile(f) {
  selectedFile.value = f
  try {
    // 目录条目（路径以 / 结尾）无法 diff
    if (f.path.endsWith('/')) {
      diffText.value = ''
      return
    }
    if (f.isUntracked) {
      diffText.value = await git.getUntrackedFileContent(repoPath.value, f.path)
    } else {
      // 统一对比 HEAD → 工作区，AM/MM 等双状态文件也能看到完整变更
      diffText.value = await git.getFileDiffFull(repoPath.value, f.path)
    }
  } catch (e) {
    diffText.value = ''
    ElMessage.error(e?.message || String(e))
  }
}

async function stageFile(f) {
  try {
    await git.stageFiles(repoPath.value, [f.path])
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function unstageFile(f) {
  try {
    await git.unstageFiles(repoPath.value, [f.path])
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function toggleStage(f) {
  if (f.isStaged) {
    await unstageFile(f)
  } else {
    await stageFile(f)
  }
}

async function doStageAll() {
  try {
    await git.stageAll(repoPath.value)
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function doUnstageAll() {
  try {
    await git.unstageAll(repoPath.value)
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function doCommit() {
  if (!commitMessage.value.trim() || !hasStaged.value) return
  committing.value = true
  try {
    await git.commit(repoPath.value, commitMessage.value.trim())
    ElMessage.success(t('gitManager.commitSuccess'))
    commitMessage.value = ''
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    committing.value = false
  }
}

async function doPush() {
  pushing.value = true
  try {
    const msg = await git.push(repoPath.value)
    ElMessage.success(t('gitManager.pushSuccess'))
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    pushing.value = false
  }
}

async function doPull() {
  pulling.value = true
  try {
    await git.pull(repoPath.value)
    ElMessage.success(t('gitManager.pullSuccess'))
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    pulling.value = false
  }
}

async function doStash() {
  try {
    await git.stash(repoPath.value)
    ElMessage.success('Stash saved')
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function doStashPop() {
  try {
    await git.stashPop(repoPath.value)
    ElMessage.success('Stash popped')
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function switchBranch(newBranch) {
  try {
    await git.checkoutBranch(repoPath.value, newBranch)
    ElMessage.success(`${t('gitManager.switchedTo')} ${newBranch}`)
    await refresh()
  } catch (e) {
    ElMessage.error(e.message)
    // 恢复原分支名
    branch.value = await git.getCurrentBranch(repoPath.value)
  }
}

// 查看提交历史
watch(showLogDialog, async (v) => {
  if (!v || !repoPath.value) return
  logLoading.value = true
  try {
    logList.value = await git.getLog(repoPath.value, 50)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    logLoading.value = false
  }
})

onMounted(() => {
  // 有已保存的仓库就直接用，不自动扫描（扫描由用户手动触发）
  if (repoPath.value) {
    refresh()
  }
})
</script>

<style scoped>
.git-manager-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}

/* ---- 顶栏 ---- */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}

.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-quaternary);
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

.repo-select { width: 240px; }
.repo-select :deep(.el-select-dropdown) { min-width: 420px !important; }

.empty-actions { display: flex; gap: 8px; }

/* ---- 仓库信息栏 ---- */
.repo-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  background: rgba(255,255,255,0.42);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
}

.repo-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  min-width: 0;
}

.repo-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13px;
}

.repo-path-hint {
  color: var(--text-quaternary);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.branch-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(64, 158, 255, 0.1);
  color: var(--accent-blue);
  font-weight: 600;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
}

.remote-status { font-size: 11px; font-weight: 600; }
.remote-status .ahead { color: #67c23a; margin-right: 4px; }
.remote-status .behind { color: #e6a23c; }
.remote-status .synced { color: #67c23a; }

.branch-select { width: 160px; }

/* ---- 空状态 ---- */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.empty-icon { font-size: 48px; }
.empty-text { color: var(--text-tertiary); font-size: 14px; }

/* ---- 主内容区 ---- */
.workspace-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 18px 0;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px 18px 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}


.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
  min-height: 0;
  padding: 0;
  gap: 0;
}

/* ---- 文件面板：去除卡片，分割线由统一 CSS 提供 ---- */
.file-panel {
  width: auto;
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
  background: transparent;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-actions { display: flex; gap: 4px; }

.file-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(60, 40, 20,0.06);
  flex-shrink: 0;
}

.file-search { flex: 1; }

/* 文件列表滚动容器 */
.file-list-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.25) transparent;
}
.file-list-scroll::-webkit-scrollbar { width: 5px; }
.file-list-scroll::-webkit-scrollbar-track { background: transparent; }
.file-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.25);
  border-radius: 4px;
}
.file-list-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.4);
}

.file-section {
  padding-bottom: 4px;
}

.file-list-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px 12px;
}

.skeleton-section-label,
.skeleton-check,
.skeleton-status,
.skeleton-name {
  position: relative;
  overflow: hidden;
  background: rgba(226, 232, 240, 0.82);
}

.skeleton-section-label::after,
.skeleton-check::after,
.skeleton-status::after,
.skeleton-name::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.78), transparent);
  animation: git-list-skeleton 1.15s ease-in-out infinite;
}

.skeleton-section-label {
  width: 108px;
  height: 12px;
  border-radius: 999px;
  margin: 2px 4px 4px;
}

.skeleton-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
}

.skeleton-check {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.skeleton-status {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex-shrink: 0;
}

.skeleton-name {
  height: 12px;
  border-radius: 999px;
  flex: 1;
}

.skeleton-file-item:nth-child(2n) .skeleton-name {
  max-width: 72%;
}

.skeleton-file-item:nth-child(3n) .skeleton-name {
  max-width: 56%;
}

.section-label {
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 8px 12px 4px;
  background: rgba(255,255,255,0.92);
  letter-spacing: 0.3px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background var(--transition-fast);
  border-radius: 10px;
  margin: 0 6px 4px;
  border: 1px solid transparent;
}
.file-item:hover { background: rgba(255,255,255,0.58); }
.file-item.active {
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,245,251,0.95));
  border-color: rgba(194, 65, 12,0.15);
  box-shadow: 0 1px 0 rgba(255,255,255,0.82), 0 6px 14px rgba(60, 40, 20,0.05);
}

.dir-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: background var(--transition-fast);
  user-select: none;
  border-radius: 10px;
  margin: 0 6px 4px;
}
.dir-item:hover { background: rgba(255,255,255,0.58); }

.dir-arrow {
  width: 14px;
  font-size: 10px;
  color: var(--text-quaternary);
  text-align: center;
  flex-shrink: 0;
  transition: color var(--transition-fast);
}
.dir-item:hover .dir-arrow { color: var(--text-secondary); }

.dir-icon { font-size: 13px; flex-shrink: 0; opacity: 0.75; }

.dir-name { color: var(--text-primary); }

.dir-count {
  font-weight: 400;
  color: var(--text-quaternary);
  font-size: 11px;
  margin-left: 2px;
}

.file-status {
  font-size: 11px;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}
.file-status.modified { color: #409EFF; }
.file-status.added { color: #67C23A; }
.file-status.deleted { color: #F56C6C; }
.file-status.renamed { color: #409EFF; }
.file-status.untracked { color: #909399; }

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-weight: 500;
}

.empty-files {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
}

/* ---- Diff 面板 ---- */
.diff-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.diff-content {
  flex: 1;
  overflow: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  padding: 6px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.25) transparent;
}
.diff-content::-webkit-scrollbar { width: 5px; height: 5px; }
.diff-content::-webkit-scrollbar-track { background: transparent; }
.diff-content::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.25);
  border-radius: 4px;
}
.diff-content::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.4);
}

.diff-line {
  display: flex;
  white-space: pre;
  padding: 0 8px;
}
.diff-line.add { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
.diff-line.del { background: rgba(245, 108, 108, 0.1); color: #f56c6c; }
.diff-line.hunk { color: var(--accent-blue); font-weight: 600; background: rgba(64, 158, 255, 0.05); }
.diff-line.meta { color: var(--text-tertiary); }
.diff-line.context { color: var(--text-secondary); }

.line-num {
  width: 44px;
  text-align: right;
  color: var(--text-quaternary);
  padding-right: 8px;
  user-select: none;
  flex-shrink: 0;
}

.line-text { flex: 1; }

.diff-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.diff-empty-card {
  width: min(320px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 24px;
  border: 1px dashed rgba(148, 163, 184, 0.34);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 88%, var(--accent-warm-soft) 12%), color-mix(in srgb, var(--bg-secondary) 76%, transparent 24%));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.diff-empty-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
  font-size: 20px;
  font-weight: 700;
}

.diff-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.diff-empty-text {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}

@keyframes git-list-skeleton {
  100% {
    transform: translateX(100%);
  }
}

/* ---- 底部操作栏 ---- */
.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  background: rgba(255,255,255,0.42);
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  gap: 12px;
  flex-shrink: 0;
}

.commit-area {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.commit-input { flex: 1; }

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ---- Log 对话框 ---- */
.log-list {
  max-height: 450px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.25) transparent;
}
.log-list::-webkit-scrollbar { width: 5px; }
.log-list::-webkit-scrollbar-track { background: transparent; }
.log-list::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.25);
  border-radius: 4px;
}
.log-list::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.4);
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}
.log-item:last-child { border-bottom: none; }

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-hash {
  font-family: monospace;
  font-size: 12px;
  color: var(--accent-blue);
  font-weight: 600;
}

.log-refs {
  font-size: 11px;
  background: rgba(64, 158, 255, 0.1);
  color: var(--accent-blue);
  padding: 0 6px;
  border-radius: 8px;
}

.log-date {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
}

.log-subject {
  font-size: 13px;
  color: var(--text-primary);
}

.log-author {
  font-size: 11px;
  color: var(--text-quaternary);
  margin-top: 2px;
}

.log-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-quaternary);
}
</style>
