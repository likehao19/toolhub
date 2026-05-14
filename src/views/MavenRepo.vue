<template>
  <div class="maven-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Box /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('mavenRepo.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <span class="repo-label">{{ t('mavenRepo.repoPath') }}:</span>
        <span class="repo-path" :title="displayRepoPath">{{ displayRepoPath }}</span>
        <el-button size="small" text @click="changeRepoPath" :title="t('mavenRepo.changePath')">
          <el-icon><FolderOpened /></el-icon>
        </el-button>
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <el-button size="small" type="primary" class="toolbar-primary-btn" @click="selectProjectDir" plain>
          <el-icon style="margin-right: 6px;"><FolderOpened /></el-icon>{{ t('mavenRepo.selectProjectDir') }}
        </el-button>
        <el-button size="small" class="toolbar-secondary-btn" @click="doFullCheck" :loading="checking">
          <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('mavenRepo.fullCheck') }}
        </el-button>
        <el-button size="small" text class="toolbar-icon-btn" @click="doRefresh" :title="t('common.refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 统计栏 -->
    <div v-if="stats" class="stats-bar">
      <div class="stat-item">
        <span class="stat-num">{{ stats.totalArtifacts }}</span>
        <span class="stat-label">{{ t('mavenRepo.totalArtifacts') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">{{ formatBytes(stats.totalSize) }}</span>
        <span class="stat-label">{{ t('mavenRepo.totalSize') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-num">{{ stats.groupCount }}</span>
        <span class="stat-label">{{ t('mavenRepo.groups') }}</span>
      </div>
      <div class="stat-item is-error" v-if="stats.errorCount">
        <span class="stat-num">{{ stats.errorCount }}</span>
        <span class="stat-label">{{ t('mavenRepo.errors') }}</span>
      </div>
      <div class="stat-item is-warn" v-if="stats.warningCount">
        <span class="stat-num">{{ stats.warningCount }}</span>
        <span class="stat-label">{{ t('mavenRepo.warnings') }}</span>
      </div>
    </div>

    <!-- 主体 -->
    <div class="main-area">
      <!-- 左侧：仓库树 -->
      <div class="left-panel">
        <div class="search-box">
          <el-input v-model="searchQuery" :placeholder="t('mavenRepo.search')" size="small" clearable>
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>

        <!-- 项目模块列表（选择了项目目录后显示） -->
        <div v-if="projectPoms.length" class="project-modules-section">
          <div class="section-head">
            <span class="section-title">{{ t('mavenRepo.projectModules') }}</span>
            <span class="section-count">{{ projectPoms.length }}</span>
            <span class="section-close" @click="closeProjectView">&times;</span>
          </div>
          <div
            v-for="pom in projectPoms"
            :key="pom.path"
            class="module-row"
            :class="{ active: activeProjectPomPath === pom.path }"
            @click="selectProjectModule(pom)"
          >
            <span class="module-icon" :class="{ 'is-root': pom.isRoot }">{{ pom.isRoot ? 'R' : 'M' }}</span>
            <span class="module-name">{{ pom.artifactId || pom.relativePath }}</span>
            <span class="module-meta">{{ pom.packaging }}</span>
          </div>
        </div>

        <el-scrollbar class="tree-scroll">
          <div v-if="scanning" class="loading-hint">{{ t('mavenRepo.scanning') }}</div>
          <div v-else-if="filteredTree.length === 0" class="empty-hint">{{ t('mavenRepo.noResults') }}</div>
          <div v-for="group in filteredTree" :key="group.groupId" class="tree-group">
            <div class="tree-group-label" @click="toggleGroup(group.groupId)">
              <span class="tree-arrow">{{ expandedGroups.has(group.groupId) ? '▾' : '▸' }}</span>
              <span class="tree-group-name">{{ group.groupId }}</span>
              <span class="tree-count">{{ group.artifacts.length }}</span>
            </div>
            <template v-if="expandedGroups.has(group.groupId)">
              <div v-for="art in group.artifacts" :key="art.dirPath"
                class="tree-artifact" :class="{ active: selectedArtifact?.dirPath === art.dirPath }"
                @click="selectArtifact(art)">
                <span class="tree-status" :class="'is-' + art.integrity" />
                <span class="tree-art-name">{{ art.artifactId }}</span>
                <span class="tree-version">{{ art.version }}</span>
              </div>
            </template>
          </div>
        </el-scrollbar>
      </div>

      <!-- 右侧：详情 -->
      <div class="right-panel">
        <!-- 无选中 -->
        <div v-if="!selectedArtifact && !depTree && !projectPoms.length" class="empty-detail">
          <el-icon class="empty-icon"><Box /></el-icon>
          <p>{{ t('mavenRepo.selectArtifact') }}</p>
        </div>

        <!-- 项目概览（选了目录但没选具体模块/artifact） -->
        <div v-else-if="projectPoms.length && !depTree && !selectedArtifact" class="project-overview-panel">
          <div class="overview-header">
            <span class="overview-title">{{ t('mavenRepo.projectOverview') }}</span>
            <span class="overview-count">{{ t('mavenRepo.moduleCount', { count: projectPoms.length }) }}</span>
          </div>
          <div class="module-cards">
            <div v-for="pom in projectPoms" :key="pom.path" class="module-card" @click="selectProjectModule(pom)">
              <div class="module-card-head">
                <span class="module-card-badge" :class="{ 'is-root': pom.isRoot }">{{ pom.isRoot ? 'ROOT' : 'MODULE' }}</span>
                <span class="module-card-packaging">{{ pom.packaging }}</span>
              </div>
              <div class="module-card-name">{{ pom.artifactId }}</div>
              <div class="module-card-gav">{{ pom.groupId }}:{{ pom.version }}</div>
              <div class="module-card-meta">
                <span v-if="pom.depCount">{{ t('mavenRepo.depCount', { count: pom.depCount }) }}</span>
                <span v-if="pom.modules.length">{{ pom.modules.length }} sub-modules</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 依赖树模式 -->
        <div v-else-if="depTree" class="dep-tree-panel">
          <div class="detail-toolbar">
            <span class="detail-title">{{ t('mavenRepo.depTreeTitle') }}: {{ depTree.groupId }}:{{ depTree.artifactId }}:{{ depTree.version }}</span>
            <div class="detail-actions">
              <el-checkbox v-model="showMissingOnly" :label="t('mavenRepo.showMissing')" size="small" />
              <el-button size="small" text @click="expandAllNodes" :title="t('common.expand')">
                <el-icon><Expand /></el-icon>
              </el-button>
              <el-button size="small" text @click="collapseAllNodes" :title="t('common.collapse')">
                <el-icon><Fold /></el-icon>
              </el-button>
              <el-button size="small" text @click="closeProjectDepTree" :title="t('common.close')">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
          <el-scrollbar class="tree-content">
            <div class="dep-tree">
              <DepNode :node="depTree" :show-missing-only="showMissingOnly" :expanded-set="expandedNodes" @toggle="toggleNode" />
            </div>
          </el-scrollbar>
        </div>

        <!-- Artifact 详情 -->
        <div v-else-if="selectedArtifact" class="detail-panel">
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane :label="t('mavenRepo.overview')" name="overview">
              <div class="gav-card">
                <div class="gav-text">{{ currentGroupId }}:{{ detail?.artifactId }}:{{ detail?.version }}</div>
                <div class="gav-actions">
                  <el-button size="small" @click="copyAs('maven')">
                    <el-icon style="margin-right: 4px;"><CopyDocument /></el-icon>{{ t('mavenRepo.copyMaven') }}
                  </el-button>
                  <el-button size="small" @click="copyAs('gradle')">
                    <el-icon style="margin-right: 4px;"><CopyDocument /></el-icon>{{ t('mavenRepo.copyGradle') }}
                  </el-button>
                  <el-button size="small" @click="copyAs('gradleKts')">
                    <el-icon style="margin-right: 4px;"><CopyDocument /></el-icon>{{ t('mavenRepo.copyGradleKts') }}
                  </el-button>
                  <el-button size="small" @click="copyAs('sbt')">
                    <el-icon style="margin-right: 4px;"><CopyDocument /></el-icon>{{ t('mavenRepo.copySbt') }}
                  </el-button>
                </div>
              </div>
              <div v-if="detail?.integrityIssues?.length" class="issues-section">
                <h4>{{ t('mavenRepo.integrity') }}</h4>
                <div v-for="(issue, i) in detail.integrityIssues" :key="i" class="issue-row" :class="issue.severity">
                  <el-tag :type="issue.severity === 'error' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'info'" size="small">
                    {{ issue.severity }}
                  </el-tag>
                  <span class="issue-type">{{ issue.checkType }}</span>
                  <span class="issue-msg">{{ issue.message }}</span>
                </div>
              </div>
              <div v-else class="integrity-ok">{{ t('mavenRepo.integrityOk') }}</div>
            </el-tab-pane>

            <el-tab-pane :label="t('mavenRepo.files')" name="files">
              <div class="tab-surface">
                <el-table :data="detail?.files || []" size="small" stripe class="files-table">
                  <el-table-column prop="name" :label="t('mavenRepo.fileName')" min-width="280" show-overflow-tooltip />
                  <el-table-column :label="t('mavenRepo.fileSize')" width="100">
                    <template #default="{ row }">{{ formatBytes(row.size) }}</template>
                  </el-table-column>
                  <el-table-column :label="t('mavenRepo.lastModified')" width="160">
                    <template #default="{ row }">{{ formatDate(row.lastModified) }}</template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('mavenRepo.depTree')" name="deps">
              <div v-if="!artifactDepTree" class="dep-hint">
                <div class="dep-hint-card">
                  <div class="dep-hint-title">{{ t('mavenRepo.depTree') }}</div>
                  <div class="dep-hint-text">{{ t('mavenRepo.buildTree') }}</div>
                  <el-button type="primary" @click="buildArtifactDepTree" :loading="buildingTree">
                    {{ t('mavenRepo.buildTree') }}
                  </el-button>
                </div>
              </div>
              <div v-else class="dep-tree tab-surface">
                <DepNode :node="artifactDepTree" :show-missing-only="false" :expanded-set="expandedNodes" @toggle="toggleNode" />
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('mavenRepo.pomView')" name="pom">
              <div class="tab-surface">
                <pre v-if="detail?.pomContent" class="pom-content">{{ detail.pomContent }}</pre>
                <div v-else class="empty-hint">{{ t('mavenRepo.pomNotFound') }}</div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="status-bar">
      <span>{{ statusText || t('mavenRepo.localRepo') }}</span>
      <span class="status-spacer"></span>
      <span v-if="artifacts.length">{{ artifacts.length }} artifacts</span>
    </div>

    <!-- 全量检查对话框 -->
    <el-dialog v-model="checkDialogVisible" :title="t('mavenRepo.fullCheck')" width="700" top="8vh" class="check-dialog">
      <div v-if="checking" class="check-loading">
        <el-icon class="is-loading"><Loading /></el-icon> {{ t('mavenRepo.checking') }}
      </div>
      <template v-else-if="checkResult">
        <div class="check-summary">
          <div class="check-stat">{{ checkResult.total }} {{ t('mavenRepo.totalArtifacts') }}</div>
          <div class="check-stat is-error">{{ checkResult.errors }} {{ t('mavenRepo.errors') }}</div>
          <div class="check-stat is-warn">{{ checkResult.warnings }} {{ t('mavenRepo.warnings') }}</div>
        </div>
        <el-table :data="checkResult.issues" size="small" stripe max-height="400" class="check-table">
          <el-table-column width="80" :label="t('mavenRepo.severity')">
            <template #default="{ row }">
              <el-tag :type="row.severity === 'error' ? 'danger' : 'warning'" size="small">{{ row.severity }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="checkType" :label="t('mavenRepo.checkType')" width="140" />
          <el-table-column prop="message" :label="t('mavenRepo.message')" show-overflow-tooltip />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Box, Refresh, Search, Loading, FolderOpened, Check, Expand, Fold, Close, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { t } from '@/i18n'

const router = useRouter()

// ---- State ----
const repoPath = ref('')
const artifacts = ref([])
const scanning = ref(false)
const statusText = ref('')
const searchQuery = ref('')
const expandedGroups = ref(new Set())

const selectedArtifact = ref(null)
const detail = ref(null)
const activeTab = ref('overview')

const depTree = ref(null)
const artifactDepTree = ref(null)
const buildingTree = ref(false)
const showMissingOnly = ref(false)
const expandedNodes = ref(new Set())

const checking = ref(false)
const checkDialogVisible = ref(false)
const checkResult = ref(null)

// Project directory scan
const projectPoms = ref([])
const activeProjectPomPath = ref('')

const displayRepoPath = computed(() => repoPath.value || '~/.m2/repository')
const currentGroupId = computed(() => detail.value?.groupId || selectedArtifact.value?.groupId || '-')

function resetSelectionState() {
  selectedArtifact.value = null
  detail.value = null
  activeTab.value = 'overview'
  artifactDepTree.value = null
  depTree.value = null
  showMissingOnly.value = false
  expandedNodes.value = new Set()
}

function resetArtifactTreeState() {
  artifactDepTree.value = null
  expandedNodes.value = new Set()
  buildingTree.value = false
}

function closeProjectDepTree() {
  depTree.value = null
  showMissingOnly.value = false
  expandedNodes.value = new Set()
  statusText.value = selectedArtifact.value
    ? `${displayRepoPath.value} · ${selectedArtifact.value.groupId}:${selectedArtifact.value.artifactId}:${selectedArtifact.value.version}`
    : statsStatusText()
}

function closeProjectView() {
  projectPoms.value = []
  activeProjectPomPath.value = ''
  closeProjectDepTree()
}

function getSingleDialogPath(value) {
  return Array.isArray(value) ? value[0] || null : value || null
}

function expandToDepth(node, maxDepth, currentDepth = 0) {
  if (!node || currentDepth >= maxDepth) return
  const key = `${node.groupId}:${node.artifactId}:${node.version}`
  if ((node.children || []).length) expandedNodes.value.add(key)
  for (const child of (node.children || [])) expandToDepth(child, maxDepth, currentDepth + 1)
}

function applyDefaultNodeExpansion(node) {
  expandedNodes.value = new Set()
  expandToDepth(node, 2)
  expandedNodes.value = new Set(expandedNodes.value)
}

function statsStatusText() {
  return artifacts.value.length ? `${t('mavenRepo.scanComplete')} · ${displayRepoPath.value}` : displayRepoPath.value
}

function refreshExpandedGroups() {
  expandedGroups.value = searchQuery.value.trim()
    ? new Set(filteredTree.value.map(group => group.groupId))
    : new Set()
}

// ---- Computed ----
const filteredTree = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const groupMap = new Map()
  for (const a of artifacts.value) {
    const key = `${a.groupId}:${a.artifactId}`.toLowerCase()
    if (q && !key.includes(q)) continue
    if (!groupMap.has(a.groupId)) groupMap.set(a.groupId, { groupId: a.groupId, artifacts: [] })
    groupMap.get(a.groupId).artifacts.push(a)
  }
  return Array.from(groupMap.values()).map(group => ({
    ...group,
    artifacts: [...group.artifacts].sort((a, b) => a.artifactId.localeCompare(b.artifactId) || a.version.localeCompare(b.version)),
  }))
})

watch(searchQuery, () => refreshExpandedGroups())

const stats = computed(() => {
  if (!artifacts.value.length) return null
  let totalSize = 0
  const groups = new Set()
  let errorCount = 0
  let warningCount = 0
  for (const a of artifacts.value) {
    totalSize += (a.jarSize || 0) + (a.pomSize || 0)
    groups.add(a.groupId)
    if (a.integrity === 'error') errorCount++
    if (a.integrity === 'warning') warningCount++
  }
  return { totalArtifacts: artifacts.value.length, totalSize, groupCount: groups.size, errorCount, warningCount }
})

function toggleGroup(groupId) {
  const s = new Set(expandedGroups.value)
  if (s.has(groupId)) s.delete(groupId); else s.add(groupId)
  expandedGroups.value = s
}

// ---- DepNode component ----
const DepNode = defineComponent({
  name: 'DepNode',
  props: {
    node: { type: Object, required: true },
    showMissingOnly: { type: Boolean, default: false },
    expandedSet: { type: Object, required: true },
    level: { type: Number, default: 0 },
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    return () => {
      const n = props.node
      const key = `${n.groupId}:${n.artifactId}:${n.version}`
      const hasChildren = n.children && n.children.length > 0
      const isExpanded = props.expandedSet.has(key)
      if (props.showMissingOnly && n.existsLocally && !hasDescendantMissing(n)) return null

      const statusClass = !n.existsLocally ? 'dep-missing' : n.conflictVersion ? 'dep-conflict' : ''
      const statusChar = !n.existsLocally ? '!' : n.conflictVersion ? '~' : ''

      const arrow = hasChildren
        ? h('span', { class: 'dep-arrow', onClick: (e) => { e.stopPropagation(); emit('toggle', key) } }, isExpanded ? '▾ ' : '▸ ')
        : h('span', { class: 'dep-arrow' }, '  ')

      const label = h('span', { class: `dep-label ${statusClass}` }, [
        statusChar ? h('span', { class: `dep-status-icon ${statusClass}` }, statusChar) : null,
        h('span', { class: 'dep-gid' }, n.groupId + ':'),
        h('b', null, n.artifactId),
        h('span', { class: 'dep-ver' }, ':' + n.version),
        n.scope !== 'compile' ? h('span', { class: 'dep-scope' }, ` [${n.scope}]`) : null,
        n.conflictVersion ? h('span', { class: 'dep-conflict-tag' }, ` ← ${t('mavenRepo.conflict')}: ${n.conflictVersion}`) : null,
        !n.existsLocally ? h('span', { class: 'dep-missing-tag' }, ` [${t('mavenRepo.missing')}]`) : null,
      ])

      const children = hasChildren && isExpanded
        ? n.children.map(child => h(DepNode, {
            node: child, showMissingOnly: props.showMissingOnly,
            expandedSet: props.expandedSet, level: props.level + 1,
            onToggle: (k) => emit('toggle', k),
          }))
        : []

      return h('div', { class: 'dep-node', style: { paddingLeft: props.level * 18 + 'px' } }, [
        h('div', { class: 'dep-row' }, [arrow, label]),
        ...children,
      ])
    }
  },
})

function hasDescendantMissing(node) {
  if (!node.existsLocally) return true
  return (node.children || []).some(c => hasDescendantMissing(c))
}

function toggleNode(key) {
  const s = new Set(expandedNodes.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  expandedNodes.value = s
}

function expandAllHelper(node) {
  expandedNodes.value.add(`${node.groupId}:${node.artifactId}:${node.version}`)
  for (const c of (node.children || [])) expandAllHelper(c)
}
function expandAllNodes() {
  const root = depTree.value || artifactDepTree.value
  if (root) expandAllHelper(root)
  expandedNodes.value = new Set(expandedNodes.value)
}
function collapseAllNodes() { expandedNodes.value = new Set() }

// ---- Init ----
onMounted(async () => {
  try {
    const settings = await invoke('maven_parse_settings')
    repoPath.value = settings.localRepo || ''
  } catch { repoPath.value = '' }
  await doRefresh()
})

// ---- Actions ----
async function doRefresh() {
  scanning.value = true
  statusText.value = t('mavenRepo.scanning')
  resetSelectionState()
  try {
    artifacts.value = await invoke('maven_scan_repo', { path: repoPath.value })
    refreshExpandedGroups()
    statusText.value = statsStatusText()
  } catch (e) {
    artifacts.value = []
    expandedGroups.value = new Set()
    ElMessage.error(`${t('mavenRepo.loadFailed')}: ${e?.message || e}`)
    statusText.value = displayRepoPath.value
  } finally { scanning.value = false }
}

async function changeRepoPath() {
  try {
    const dir = getSingleDialogPath(await dialogOpen({ directory: true, multiple: false }))
    if (!dir) return
    repoPath.value = dir
    await doRefresh()
  } catch (e) { ElMessage.error(`${t('mavenRepo.pathChangeFailed')}: ${e?.message || e}`) }
}

async function selectArtifact(art) {
  selectedArtifact.value = art
  detail.value = null
  closeProjectDepTree()
  resetArtifactTreeState()
  activeTab.value = 'overview'
  try {
    detail.value = await invoke('maven_get_artifact', { dirPath: art.dirPath })
    statusText.value = `${displayRepoPath.value} · ${art.groupId}:${art.artifactId}:${art.version}`
  } catch (e) { ElMessage.error(`${t('mavenRepo.detailFailed')}: ${e?.message || e}`) }
}

async function buildArtifactDepTree() {
  if (!selectedArtifact.value) return
  buildingTree.value = true
  resetArtifactTreeState()
  try {
    const art = selectedArtifact.value
    const pomPath = `${art.dirPath}/${art.artifactId}-${art.version}.pom`
    artifactDepTree.value = await invoke('maven_dep_tree', { request: { pomPath, repoPath: repoPath.value } })
    applyDefaultNodeExpansion(artifactDepTree.value)
  } catch (e) { ElMessage.error(`${t('mavenRepo.buildFailed')}: ${e?.message || e}`) }
  finally { buildingTree.value = false }
}

async function selectProjectDir() {
  const dir = getSingleDialogPath(await dialogOpen({ directory: true, multiple: false }))
  if (!dir) return

  statusText.value = t('mavenRepo.scanningProject')
  resetSelectionState()
  projectPoms.value = []
  activeProjectPomPath.value = ''

  try {
    const poms = await invoke('maven_scan_project_poms', { rootDir: dir })
    if (!poms.length) {
      ElMessage.warning(t('mavenRepo.noPomFound'))
      statusText.value = statsStatusText()
      return
    }
    projectPoms.value = poms
    statusText.value = `${t('mavenRepo.projectModules')} · ${poms.length} modules · ${dir}`
  } catch (e) {
    ElMessage.error(`${t('mavenRepo.buildFailed')}: ${e?.message || e}`)
    statusText.value = statsStatusText()
  }
}

async function selectProjectModule(pom) {
  activeProjectPomPath.value = pom.path
  selectedArtifact.value = null
  detail.value = null
  resetArtifactTreeState()

  statusText.value = t('mavenRepo.building')
  try {
    const tree = await invoke('maven_dep_tree', { request: { pomPath: pom.path, repoPath: repoPath.value } })
    depTree.value = tree
    applyDefaultNodeExpansion(tree)
    statusText.value = `${t('mavenRepo.depTreeTitle')} · ${pom.artifactId}`
  } catch (e) {
    ElMessage.error(`${t('mavenRepo.buildFailed')}: ${e?.message || e}`)
    statusText.value = statsStatusText()
  }
}

async function doFullCheck() {
  checking.value = true
  checkResult.value = null
  checkDialogVisible.value = true
  try {
    checkResult.value = await invoke('maven_check_integrity', { repoPath: repoPath.value })
  } catch (e) { ElMessage.error(`${t('mavenRepo.checkFailed')}: ${e?.message || e}`) }
  finally { checking.value = false }
}

async function copyAs(format) {
  if (!detail.value) return
  const { groupId: g, artifactId: a, version: v } = detail.value
  const texts = {
    maven: `<dependency>\n    <groupId>${g}</groupId>\n    <artifactId>${a}</artifactId>\n    <version>${v}</version>\n</dependency>`,
    gradle: `implementation '${g}:${a}:${v}'`,
    gradleKts: `implementation("${g}:${a}:${v}")`,
    sbt: `libraryDependencies += "${g}" % "${a}" % "${v}"`,
  }
  try {
    await writeText(texts[format] || '')
    ElMessage.success(t('mavenRepo.copied'))
  } catch (e) { ElMessage.error(`${t('mavenRepo.copyFailed')}: ${e?.message || e}`) }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i]
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString()
}
</script>

<style scoped>
.maven-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, var(--surface-panel), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
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
  background: var(--surface-muted);
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 var(--surface-panel-soft), 0 8px 22px rgba(60, 40, 20,0.03);
}
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.toolbar-primary-btn :deep(span),
.toolbar-secondary-btn :deep(span) {
  font-weight: 600;
}
.toolbar-secondary-btn:not(.is-disabled) {
  background: rgba(248, 244, 232,0.9);
  border-color: rgba(60, 40, 20, 0.08);
  color: var(--text-primary);
}
.toolbar-icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 10px;
  color: var(--text-secondary);
  background: rgba(248, 244, 232,0.9);
  border: 1px solid rgba(60, 40, 20, 0.06);
}
.toolbar-icon-btn:hover:not(.is-disabled) {
  color: var(--text-primary);
  background: var(--surface-panel);
  border-color: rgba(60, 40, 20, 0.1);
}
.repo-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.repo-path {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(248, 244, 232,0.9);
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 10px;
}
.toolbar :deep(.el-button) { --el-border-radius-base: 10px; }

.stats-bar {
  display: flex;
  gap: 12px;
  margin: 14px 18px 0;
  padding: 10px 12px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.9));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  flex-wrap: wrap;
  box-shadow: inset 0 1px 0 var(--surface-panel-soft), 0 8px 22px rgba(60, 40, 20,0.03);
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-height: 28px;
  padding: 6px 10px;
  background: rgba(248, 244, 232,0.94);
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 999px;
}
.stat-num { font-size: 14px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.stat-label { font-size: 10px; color: var(--text-tertiary); }
.stat-item.is-error .stat-num { color: var(--color-red); }
.stat-item.is-warn .stat-num { color: var(--color-orange); }

.main-area {
  flex: 1;
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
.search-box { padding: 10px; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.search-box :deep(.el-input__wrapper) {
  background: rgba(248, 244, 232,0.92);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.08);
  border-radius: 10px;
}
.search-box :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.7);
}
.tree-scroll { flex: 1; }
.loading-hint,
.empty-hint {
  margin: 16px;
  padding: 18px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.9));
}

.project-modules-section {
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  max-height: 200px;
  overflow-y: auto;
  background: linear-gradient(180deg, var(--surface-muted), rgba(248, 244, 232,0.3));
}
.section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--surface-panel-soft);
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.section-title { font-size: 11px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.02em; text-transform: uppercase; }
.section-count {
  font-size: 10px;
  color: var(--text-tertiary);
  background: rgba(248, 244, 232,0.94);
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(60, 40, 20, 0.06);
}
.section-close { margin-left: auto; cursor: pointer; color: var(--text-quaternary); font-size: 14px; line-height: 1; }
.section-close:hover { color: var(--color-red); }
.module-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.05);
}
.module-row:last-child { border-bottom: none; }
.module-row:hover { background: rgba(64, 158, 255, 0.06); }
.module-row.active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.14), rgba(64, 158, 255, 0.04));
  box-shadow: inset 2px 0 0 var(--accent-blue);
}
.module-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: var(--el-color-white);
  background: var(--text-tertiary);
  flex-shrink: 0;
}
.module-icon.is-root { background: var(--accent-blue); }
.module-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 600; }
.module-meta { font-size: 10px; color: var(--text-quaternary); }
.tree-group { border-bottom: 1px solid rgba(60, 40, 20, 0.06); }
.tree-group-label {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.3);
}
.tree-group-label:hover { background: var(--surface-muted); }
.tree-arrow { font-size: 10px; width: 12px; color: var(--text-quaternary); flex-shrink: 0; }
.tree-group-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.tree-count {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-quaternary);
  background: rgba(248, 244, 232,0.94);
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(60, 40, 20, 0.06);
  flex-shrink: 0;
}
.tree-artifact {
  padding: 8px 10px 8px 26px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tree-artifact:hover { background: rgba(64, 158, 255, 0.06); }
.tree-artifact.active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.12), rgba(64, 158, 255, 0.03));
  box-shadow: inset 2px 0 0 var(--accent-blue);
}
.tree-status { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--color-green); }
.tree-status.is-error { background: var(--color-red); }
.tree-status.is-warning { background: var(--color-orange); }
.tree-art-name { color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-version { color: var(--text-quaternary); font-size: 11px; font-family: monospace; flex-shrink: 0; }

.right-panel {
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0 18px 0 0;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
}
.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 16px;
  color: var(--text-quaternary);
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.9));
}
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.project-overview-panel { padding: 18px; }
.overview-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
.overview-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.overview-count { font-size: 12px; color: var(--text-tertiary); }
.module-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.module-card {
  padding: 14px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.92));
  box-shadow: inset 0 1px 0 var(--surface-panel-soft);
}
.module-card:hover { border-color: rgba(64, 158, 255, 0.28); box-shadow: 0 10px 24px rgba(60, 40, 20,0.06); transform: translateY(-1px); }
.module-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.module-card-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px; color: var(--text-tertiary); background: rgba(248, 244, 232,0.94); border: 1px solid rgba(60, 40, 20, 0.06); }
.module-card-badge.is-root { color: var(--accent-blue); background: var(--accent-blue-bg); border-color: rgba(64, 158, 255, 0.16); }
.module-card-packaging { font-size: 10px; color: var(--text-quaternary); }
.module-card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.module-card-gav { font-size: 11px; color: var(--text-tertiary); font-family: monospace; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.module-card-meta { display: flex; gap: 10px; font-size: 10px; color: var(--text-quaternary); flex-wrap: wrap; }
.detail-panel { padding: 0; height: 100%; display: flex; flex-direction: column; }
.detail-tabs { height: 100%; display: flex; flex-direction: column; }
.detail-tabs :deep(.el-tabs__content) { flex: 1; overflow-y: auto; padding: 16px; background: linear-gradient(180deg, rgba(255,255,255,0.28), rgba(248, 244, 232,0.18)); }
.detail-tabs :deep(.el-tabs__header) { padding: 0 16px; margin: 0; background: var(--surface-muted); border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.detail-tabs :deep(.el-tabs__nav-wrap::after) { background-color: rgba(60, 40, 20, 0.08); }
.tab-surface {
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.92));
  box-shadow: inset 0 1px 0 var(--surface-panel-soft);
  padding: 14px;
}
.files-table :deep(.el-table) {
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface-panel-soft);
}
.files-table :deep(.el-table th.el-table__cell) {
  background: rgba(248, 244, 232,0.94);
  color: var(--text-secondary);
  font-weight: 700;
}
.files-table :deep(.el-table td.el-table__cell) {
  background: transparent;
}
.dep-hint-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  padding: 20px 22px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.92));
  box-shadow: inset 0 1px 0 var(--surface-panel-soft);
}
.dep-hint-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.dep-hint-text {
  font-size: 12px;
  color: var(--text-tertiary);
}
.gav-card {
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.92));
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 16px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  box-shadow: inset 0 1px 0 var(--surface-panel-soft);
}
.gav-text { font-family: monospace; font-size: 13px; color: var(--text-primary); font-weight: 600; margin-bottom: 10px; }
.gav-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.issues-section h4 { margin: 0 0 8px; font-size: 13px; color: var(--text-secondary); }
.issue-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 12px;
  background: var(--surface-panel-soft);
}
.issue-row + .issue-row { margin-top: 8px; }
.issue-type { color: var(--text-tertiary); font-family: monospace; min-width: 100px; }
.issue-msg { color: var(--text-secondary); }
.integrity-ok {
  padding: 16px;
  font-size: 14px;
  color: var(--color-green);
  border: 1px solid rgba(103, 194, 58, 0.18);
  border-radius: 16px;
  background: rgba(103, 194, 58, 0.06);
}
.pom-content {
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.92));
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  max-height: 100%;
  overflow: auto;
  margin: 0;
}
.dep-tree-panel { display: flex; flex-direction: column; height: 100%; }
.detail-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-wrap: wrap;
  background: var(--surface-muted);
}
.detail-title { font-size: 13px; font-weight: 600; color: var(--text-primary); font-family: monospace; }
.detail-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.tree-content { flex: 1; padding: 14px 16px; }
.dep-node { font-size: 12px; font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; }
.dep-row {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  cursor: default;
  line-height: 1.6;
  border-radius: 10px;
}
.dep-row:hover { background: rgba(64, 158, 255, 0.05); }
.dep-arrow { cursor: pointer; width: 14px; font-size: 10px; color: var(--text-quaternary); flex-shrink: 0; }
.dep-label { color: var(--text-primary); display: flex; align-items: center; gap: 2px; }
.dep-gid { color: var(--text-tertiary); }
.dep-ver { color: var(--accent-blue); }
.dep-scope { color: var(--text-quaternary); font-size: 11px; }
.dep-missing { color: var(--color-red); }
.dep-conflict { color: var(--color-orange); }
.dep-status-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 3px; font-size: 10px; font-weight: 700; margin-right: 4px; }
.dep-status-icon.dep-missing { background: rgba(245, 108, 108, 0.15); color: var(--color-red); }
.dep-status-icon.dep-conflict { background: rgba(230, 162, 60, 0.15); color: var(--color-orange); }
.dep-missing-tag { color: var(--color-red); font-weight: 700; font-size: 11px; }
.dep-conflict-tag { color: var(--color-orange); font-size: 11px; }
.dep-hint { padding: 24px; text-align: center; }
.check-loading {
  padding: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(248, 244, 232,0.9));
}
.check-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.check-stat {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  background: rgba(248, 244, 232,0.94);
  border: 1px solid rgba(60, 40, 20, 0.06);
}
.check-stat.is-error { color: var(--color-red); }
.check-stat.is-warn { color: var(--color-orange); }
.check-table :deep(.el-table) {
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  overflow: hidden;
}
.check-table :deep(.el-table th.el-table__cell) {
  background: rgba(248, 244, 232,0.94);
  color: var(--text-secondary);
  font-weight: 700;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  margin: 0 18px 18px;
  background: linear-gradient(180deg, var(--surface-panel-soft), rgba(247,249,252,0.9));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: none;
  font-size: 11.5px;
  color: var(--text-tertiary);
  height: 32px;
  box-sizing: border-box;
  border-radius: 0 0 18px 18px;
  box-shadow: inset 0 1px 0 var(--surface-panel-soft);
}
.status-spacer { flex: 1; }

@media (max-width: 1080px) {
  .main-area {
    flex-direction: column;
    gap: 12px;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(60, 40, 20, 0.08);
    border-radius: 18px;
  }

  .status-bar {
    border-top: 1px solid rgba(60, 40, 20, 0.08);
    border-radius: 18px;
  }
}
</style>
