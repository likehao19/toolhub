<template>
  <div class="download-manager-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Network Tools</div>
          <div class="breadcrumb">
            <el-icon><Download /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('downloadManager.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="showNewTaskDialog">
          <el-icon><Plus /></el-icon>
          {{ t('downloadManager.newTask') }}
        </el-button>
        <el-button size="small" @click="handlePauseAll" :disabled="!connected">
          <el-icon><VideoPause /></el-icon>
          {{ t('downloadManager.pauseAll') }}
        </el-button>
        <el-button size="small" @click="handleUnpauseAll" :disabled="!connected">
          <el-icon><VideoPlay /></el-icon>
          {{ t('downloadManager.resumeAll') }}
        </el-button>
        <el-button size="small" @click="showSettingsDialog">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-area">
      <div class="content-inner">
        <!-- 连接状态引导卡片 -->
        <div v-if="!connected" class="connect-card">
          <div class="connect-card-icon">
            <el-icon :size="36"><Download /></el-icon>
          </div>
          <div class="connect-card-body">
            <div class="connect-card-title">{{ aria2Error || t('downloadManager.notConnected') }}</div>
            <div class="connect-card-desc">{{ t('downloadManager.engineDesc') }}</div>
          </div>
          <el-button type="primary" @click="startAndConnect" :loading="connecting" round>
            <el-icon><VideoPlay /></el-icon>
            {{ t('downloadManager.startAria2') }}
          </el-button>
        </div>

        <!-- 统计概览卡片 -->
        <div v-if="connected" class="stat-row">
          <div class="stat-card stat-download">
            <div class="stat-card-icon"><span>↓</span></div>
            <div class="stat-card-info">
              <div class="stat-card-value">{{ formatSpeed(globalStat.downloadSpeed) }}</div>
              <div class="stat-card-label">{{ t('downloadManager.downloadSpeed') }}</div>
            </div>
          </div>
          <div class="stat-card stat-upload">
            <div class="stat-card-icon"><span>↑</span></div>
            <div class="stat-card-info">
              <div class="stat-card-value">{{ formatSpeed(globalStat.uploadSpeed) }}</div>
              <div class="stat-card-label">{{ t('downloadManager.uploadSpeed') }}</div>
            </div>
          </div>
          <div class="stat-card stat-active">
            <div class="stat-card-icon"><span>{{ globalStat.numActive || 0 }}</span></div>
            <div class="stat-card-info">
              <div class="stat-card-value">{{ t('downloadManager.tabActive') }}</div>
              <div class="stat-card-label">{{ globalStat.numWaiting || 0 }} {{ t('downloadManager.waitingTasks') }}</div>
            </div>
          </div>
          <div class="stat-card stat-done">
            <div class="stat-card-icon"><span>{{ globalStat.numStoppedTotal || 0 }}</span></div>
            <div class="stat-card-info">
              <div class="stat-card-value">{{ t('downloadManager.tabStopped') }}</div>
              <div class="stat-card-label">{{ speedLimit ? t('downloadManager.speedLimited') + ': ' + speedLimit : t('downloadManager.noSpeedLimit') }}</div>
            </div>
          </div>
        </div>

        <!-- 分类标签 + 搜索 -->
        <div v-if="connected" class="filter-bar">
          <div class="tab-group">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
              <span class="tab-count">{{ tab.count }}</span>
            </button>
          </div>
          <el-input
            v-model="searchText"
            :placeholder="t('downloadManager.search')"
            clearable
            size="small"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 任务列表 -->
        <div v-if="connected" class="task-list-area">
          <div v-if="filteredTasks.length === 0" class="empty-state">
            <div class="empty-icon">
              <el-icon :size="48"><Download /></el-icon>
            </div>
            <div class="empty-text">{{ t('downloadManager.noTasks') }}</div>
            <el-button type="primary" size="small" round @click="showNewTaskDialog">
              <el-icon><Plus /></el-icon>
              {{ t('downloadManager.newTask') }}
            </el-button>
          </div>

          <div v-else class="task-list">
            <div
              v-for="task in filteredTasks"
              :key="task.gid"
              class="task-item"
              :class="[
                `task-${task.status}`,
                { 'task-error': task.status === 'error' }
              ]"
            >
              <!-- 文件类型图标 -->
              <div class="task-icon" :class="`icon-${task.status}`">
                <el-icon v-if="task.status === 'active'" class="icon-spin"><Loading /></el-icon>
                <el-icon v-else-if="task.status === 'complete'"><SuccessFilled /></el-icon>
                <el-icon v-else-if="task.status === 'error'"><CircleCloseFilled /></el-icon>
                <el-icon v-else-if="task.status === 'paused'"><VideoPause /></el-icon>
                <el-icon v-else><Document /></el-icon>
              </div>

              <div class="task-body">
                <div class="task-row-top">
                  <div class="task-name" :title="getTaskName(task)">{{ getTaskName(task) }}</div>
                  <div class="task-actions">
                    <button
                      v-if="task.status === 'active' || task.status === 'waiting'"
                      class="action-btn"
                      @click="handlePause(task.gid)"
                      :title="t('downloadManager.pause')"
                    >
                      <el-icon><VideoPause /></el-icon>
                    </button>
                    <button
                      v-if="task.status === 'paused'"
                      class="action-btn action-resume"
                      @click="handleUnpause(task.gid)"
                      :title="t('downloadManager.resume')"
                    >
                      <el-icon><VideoPlay /></el-icon>
                    </button>
                    <button
                      v-if="task.status === 'complete'"
                      class="action-btn action-folder"
                      @click="openFolder(task)"
                      :title="t('downloadManager.openFolder')"
                    >
                      <el-icon><FolderOpened /></el-icon>
                    </button>
                    <button
                      class="action-btn action-delete"
                      @click="handleRemove(task)"
                      :title="t('downloadManager.delete')"
                    >
                      <el-icon><Delete /></el-icon>
                    </button>
                  </div>
                </div>

                <div class="task-progress-bar">
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      :class="`fill-${task.status}`"
                      :style="{ width: getProgress(task.completedLength, task.totalLength) + '%' }"
                    />
                  </div>
                  <span class="progress-text">{{ getProgress(task.completedLength, task.totalLength) }}%</span>
                </div>

                <div class="task-row-bottom">
                  <span class="meta-size">{{ formatSize(task.completedLength) }} / {{ formatSize(task.totalLength) }}</span>
                  <span v-if="task.status === 'active'" class="meta-speed">
                    ↓ {{ formatSpeed(task.downloadSpeed) }}
                  </span>
                  <span v-if="task.status === 'active' && Number(task.uploadSpeed) > 0" class="meta-upload">
                    ↑ {{ formatSpeed(task.uploadSpeed) }}
                  </span>
                  <span v-if="task.status === 'active'" class="meta-eta">
                    {{ formatEta(task.totalLength, task.completedLength, task.downloadSpeed) }}
                  </span>
                  <span v-if="task.connections" class="meta-conn">
                    {{ task.connections }} {{ t('downloadManager.connections') }}
                  </span>
                  <span v-if="task.errorMessage" class="meta-error">{{ task.errorMessage }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建下载对话框 -->
    <el-dialog
      v-model="newTaskVisible"
      :title="t('downloadManager.newTaskTitle')"
      width="560px"
      destroy-on-close
    >
      <el-tabs v-model="newTaskTab">
        <el-tab-pane :label="t('downloadManager.urlDownload')" name="url">
          <el-form label-width="80px" size="small">
            <el-form-item :label="t('downloadManager.downloadUrl')">
              <el-input
                v-model="newTaskForm.urls"
                type="textarea"
                :rows="4"
                :placeholder="t('downloadManager.urlPlaceholder')"
              />
            </el-form-item>
            <el-form-item :label="t('downloadManager.fileName')">
              <el-input v-model="newTaskForm.filename" :placeholder="t('downloadManager.fileNameAuto')" />
            </el-form-item>
            <el-form-item :label="t('downloadManager.saveDir')">
              <div class="dir-input-row">
                <el-input v-model="newTaskForm.dir" :placeholder="defaultDir" />
                <el-button @click="selectDir">{{ t('downloadManager.browse') }}</el-button>
              </div>
            </el-form-item>
            <el-form-item :label="t('downloadManager.threads')">
              <el-input-number v-model="newTaskForm.split" :min="1" :max="64" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane :label="t('downloadManager.torrentDownload')" name="torrent">
          <el-form label-width="80px" size="small">
            <el-form-item :label="t('downloadManager.torrentFile')">
              <el-button @click="selectTorrent">{{ t('downloadManager.selectFile') }}</el-button>
              <span v-if="newTaskForm.torrentName" class="torrent-name">{{ newTaskForm.torrentName }}</span>
            </el-form-item>
            <el-form-item :label="t('downloadManager.saveDir')">
              <div class="dir-input-row">
                <el-input v-model="newTaskForm.dir" :placeholder="defaultDir" />
                <el-button @click="selectDir">{{ t('downloadManager.browse') }}</el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="newTaskVisible = false">{{ t('downloadManager.cancel') }}</el-button>
        <el-button type="primary" @click="submitNewTask" :loading="submitting">
          {{ t('downloadManager.startDownload') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="settingsVisible"
      :title="t('downloadManager.settings')"
      width="480px"
      destroy-on-close
    >
      <el-form label-width="120px" size="small">
        <el-form-item :label="t('downloadManager.downloadLimit')">
          <el-input v-model="settingsForm.downloadLimit" :placeholder="t('downloadManager.noLimit')">
            <template #append>{{ t('downloadManager.perSecond') }}</template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('downloadManager.uploadLimit')">
          <el-input v-model="settingsForm.uploadLimit" :placeholder="t('downloadManager.noLimit')">
            <template #append>{{ t('downloadManager.perSecond') }}</template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('downloadManager.maxConcurrent')">
          <el-input-number v-model="settingsForm.maxConcurrent" :min="1" :max="20" />
        </el-form-item>
        <el-form-item :label="t('downloadManager.defaultDir')">
          <div class="dir-input-row">
            <el-input v-model="settingsForm.dir" />
            <el-button @click="selectSettingsDir">{{ t('downloadManager.browse') }}</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">{{ t('downloadManager.cancel') }}</el-button>
        <el-button type="primary" @click="applySettings">{{ t('downloadManager.apply') }}</el-button>
      </template>
    </el-dialog>

    <!-- 磁力/种子 文件选择对话框 -->
    <el-dialog
      v-model="filePickerVisible"
      :title="t('downloadManager.selectFiles')"
      width="640px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <!-- 获取中状态 -->
      <div v-if="filePickerLoading" class="picker-loading">
        <el-icon class="icon-spin" :size="28"><Loading /></el-icon>
        <div class="picker-loading-text">{{ t('downloadManager.fetchingMeta') }}</div>
        <div class="picker-loading-hint">{{ t('downloadManager.fetchingMetaHint') }}</div>
      </div>

      <!-- 文件列表 -->
      <template v-else>
        <div class="picker-header">
          <span class="picker-name">{{ filePickerName }}</span>
          <span class="picker-total">{{ t('downloadManager.totalSize') }}: {{ formatSize(filePickerTotalSize) }}</span>
        </div>
        <div class="picker-actions-row">
          <el-checkbox v-model="filePickerSelectAll" @change="toggleSelectAll">
            {{ t('downloadManager.selectAll') }}
          </el-checkbox>
          <span class="picker-selected-info">
            {{ t('downloadManager.selectedCount', { count: filePickerSelectedCount, size: formatSize(filePickerSelectedSize) }) }}
          </span>
        </div>
        <div class="picker-file-list">
          <div
            v-for="file in filePickerFiles"
            :key="file.index"
            class="picker-file-item"
            @click="file.selected = !file.selected"
          >
            <el-checkbox v-model="file.selected" @click.stop />
            <span class="picker-file-name" :title="file.path">{{ file.name }}</span>
            <span class="picker-file-size">{{ formatSize(file.length) }}</span>
          </div>
        </div>
      </template>

      <template #footer>
        <el-button @click="cancelFilePicker">{{ t('downloadManager.cancel') }}</el-button>
        <el-button type="primary" @click="confirmFilePicker" :disabled="filePickerLoading || filePickerSelectedCount === 0">
          {{ t('downloadManager.startDownload') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download, Plus, VideoPause, VideoPlay, Setting,
  Search, Delete, FolderOpened, Loading, SuccessFilled,
  CircleCloseFilled, Document,
} from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { readFile } from '@tauri-apps/plugin-fs'
import * as aria2 from '@/utils/downloadManager'

const router = useRouter()

// === 状态 ===
const connected = ref(false)
const connecting = ref(false)
const aria2Error = ref('')
const activeTab = ref('all')
const searchText = ref('')
const activeTasks = ref([])
const waitingTasks = ref([])
const stoppedTasks = ref([])
const globalStat = ref({})
const speedLimit = ref('')
const defaultDir = ref('')

// 新建任务
const newTaskVisible = ref(false)
const newTaskTab = ref('url')
const submitting = ref(false)
const newTaskForm = ref({
  urls: '',
  filename: '',
  dir: '',
  split: 16,
  torrentData: null,
  torrentName: '',
})

// 设置
const settingsVisible = ref(false)
const settingsForm = ref({
  downloadLimit: '',
  uploadLimit: '',
  maxConcurrent: 5,
  dir: '',
})

// 文件选择器（磁力/种子）
const filePickerVisible = ref(false)
const filePickerLoading = ref(false)
const filePickerGid = ref('')
const filePickerName = ref('')
const filePickerFiles = ref([])
const filePickerSelectAll = ref(true)
let filePickerPollTimer = null

const filePickerTotalSize = computed(() =>
  filePickerFiles.value.reduce((sum, f) => sum + Number(f.length || 0), 0)
)
const filePickerSelectedCount = computed(() =>
  filePickerFiles.value.filter(f => f.selected).length
)
const filePickerSelectedSize = computed(() =>
  filePickerFiles.value.filter(f => f.selected).reduce((sum, f) => sum + Number(f.length || 0), 0)
)

let pollTimer = null

// === 计算属性 ===
const allTasks = computed(() => [
  ...activeTasks.value,
  ...waitingTasks.value,
  ...stoppedTasks.value,
])

const tabs = computed(() => [
  { key: 'all', label: t('downloadManager.tabAll'), count: allTasks.value.length },
  { key: 'active', label: t('downloadManager.tabActive'), count: activeTasks.value.length },
  { key: 'waiting', label: t('downloadManager.tabWaiting'), count: waitingTasks.value.length },
  { key: 'stopped', label: t('downloadManager.tabStopped'), count: stoppedTasks.value.length },
])

const filteredTasks = computed(() => {
  let tasks
  switch (activeTab.value) {
    case 'active':
      tasks = activeTasks.value
      break
    case 'waiting':
      tasks = waitingTasks.value
      break
    case 'stopped':
      tasks = stoppedTasks.value
      break
    default:
      tasks = allTasks.value
  }
  if (!searchText.value) return tasks
  const keyword = searchText.value.toLowerCase()
  return tasks.filter(t => getTaskName(t).toLowerCase().includes(keyword))
})

// === 方法 ===
function getTaskName(task) {
  return aria2.getFileName(task)
}
function formatSize(bytes) {
  return aria2.formatSize(bytes)
}
function formatSpeed(bytes) {
  return aria2.formatSpeed(bytes)
}
function formatEta(total, completed, speed) {
  return aria2.formatEta(total, completed, speed)
}
function getProgress(completed, total) {
  return aria2.getProgress(completed, total)
}
function getStatusText(status) {
  return aria2.getStatusText(status)
}
function getStatusType(status) {
  return aria2.getStatusType(status)
}

async function startAndConnect() {
  connecting.value = true
  aria2Error.value = ''
  try {
    // 获取默认下载目录
    const dir = await invoke('get_default_download_dir')
    defaultDir.value = dir

    // 启动 aria2
    const result = await invoke('start_aria2', { downloadDir: dir })
    if (!result.success) {
      throw new Error(result.message)
    }

    // 等待 aria2 启动完成
    await new Promise(resolve => setTimeout(resolve, 800))

    // 连接 WebSocket
    await aria2.connect({
      url: `ws://127.0.0.1:${result.rpcPort}/jsonrpc`,
      onClose: () => {
        connected.value = false
        stopPolling()
      },
      onError: () => {
        connected.value = false
      },
      onNotify: handleNotification,
    })

    connected.value = true
    startPolling()
    ElMessage.success(t('downloadManager.connected'))
  } catch (e) {
    aria2Error.value = e.message || String(e)
    ElMessage.error(`${t('downloadManager.connectFailed')}: ${e.message || e}`)
  } finally {
    connecting.value = false
  }
}

function handleNotification(method, params) {
  // aria2 事件通知: onDownloadStart, onDownloadComplete, onDownloadError, etc.
  refreshTasks()
}

function startPolling() {
  stopPolling()
  refreshTasks()
  pollTimer = setInterval(refreshTasks, 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function refreshTasks() {
  if (!connected.value) return
  try {
    const [active, waiting, stopped, stat] = await Promise.all([
      aria2.tellActive(),
      aria2.tellWaiting(0, 100),
      aria2.tellStopped(0, 100),
      aria2.getGlobalStat(),
    ])
    activeTasks.value = active || []
    waitingTasks.value = waiting || []
    stoppedTasks.value = stopped || []
    globalStat.value = stat || {}
  } catch (e) {
    // 可能断开了
    if (!aria2.getConnectionState()) {
      connected.value = false
      stopPolling()
    }
  }
}

function showNewTaskDialog() {
  newTaskForm.value = {
    urls: '',
    filename: '',
    dir: '',
    split: 16,
    torrentData: null,
    torrentName: '',
  }
  newTaskTab.value = 'url'
  newTaskVisible.value = true
}

async function selectDir() {
  const selected = await openDialog({
    directory: true,
    title: t('downloadManager.selectDir'),
  })
  if (selected) {
    newTaskForm.value.dir = selected
  }
}

async function selectTorrent() {
  const selected = await openDialog({
    filters: [{ name: 'Torrent', extensions: ['torrent'] }],
    title: t('downloadManager.selectTorrentFile'),
  })
  if (selected) {
    const bytes = await readFile(selected)
    // Uint8Array 转 base64
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    newTaskForm.value.torrentData = btoa(binary)
    newTaskForm.value.torrentName = selected.split(/[/\\]/).pop()
  }
}

async function submitNewTask() {
  if (!connected.value) {
    ElMessage.warning(t('downloadManager.notConnected'))
    return
  }

  submitting.value = true
  try {
    if (newTaskTab.value === 'url') {
      const urls = newTaskForm.value.urls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      if (urls.length === 0) {
        ElMessage.warning(t('downloadManager.enterUrl'))
        submitting.value = false
        return
      }

      const options = {}
      if (newTaskForm.value.dir) options.dir = newTaskForm.value.dir
      if (newTaskForm.value.filename) options.out = newTaskForm.value.filename
      if (newTaskForm.value.split) options.split = String(newTaskForm.value.split)
      if (newTaskForm.value.split) options['max-connection-per-server'] = String(newTaskForm.value.split)

      // 区分磁力链接和普通 URL
      const magnetUrls = urls.filter(u => u.startsWith('magnet:'))
      const normalUrls = urls.filter(u => !u.startsWith('magnet:'))

      // 普通 URL 直接下载
      for (const url of normalUrls) {
        await aria2.addUri([url], options)
      }
      if (normalUrls.length > 0) {
        ElMessage.success(`${t('downloadManager.taskAdded')} (${normalUrls.length})`)
      }

      // 磁力链接走获取资源流程
      if (magnetUrls.length > 0) {
        newTaskVisible.value = false
        for (const magnet of magnetUrls) {
          await startMagnetResolve(magnet, options)
        }
      } else {
        newTaskVisible.value = false
      }
      refreshTasks()
    } else {
      // 种子下载 — 也走文件选择流程
      if (!newTaskForm.value.torrentData) {
        ElMessage.warning(t('downloadManager.selectTorrentFirst'))
        submitting.value = false
        return
      }
      const options = {}
      if (newTaskForm.value.dir) options.dir = newTaskForm.value.dir
      options.pause = 'true' // 先暂停，等用户选择文件
      const gid = await aria2.addTorrent(newTaskForm.value.torrentData, [], options)
      newTaskVisible.value = false
      await openFilePicker(gid)
    }
  } catch (e) {
    ElMessage.error(`${t('downloadManager.addFailed')}: ${e.message}`)
  } finally {
    submitting.value = false
  }
}

/**
 * 磁力链接：添加任务并等待元数据解析，然后弹出文件选择
 */
async function startMagnetResolve(magnetUri, options = {}) {
  // 添加磁力链接，暂停以等待用户选择文件
  const gid = await aria2.addUri([magnetUri], { ...options, pause: 'false' })
  await openFilePicker(gid)
}

/**
 * 打开文件选择器，等待元数据解析
 */
async function openFilePicker(gid) {
  filePickerGid.value = gid
  filePickerLoading.value = true
  filePickerFiles.value = []
  filePickerName.value = ''
  filePickerSelectAll.value = true
  filePickerVisible.value = true

  // 轮询等待元数据
  clearFilePickerPoll()
  let elapsed = 0
  filePickerPollTimer = setInterval(async () => {
    elapsed += 1
    try {
      const status = await aria2.tellStatus(gid)

      // 磁力链接第一阶段：元数据下载完成后 status='complete'，真正的下载在 followedBy
      if (status.status === 'complete' && status.followedBy?.length > 0) {
        clearFilePickerPoll()
        const realGid = status.followedBy[0]
        filePickerGid.value = realGid
        // 继续轮询真正的下载任务
        await pollRealTask(realGid)
        return
      }

      // 元数据已获取（bittorrent.info 出现表示解析完成）
      if (status.bittorrent?.info?.name && status.files?.length > 0) {
        // 确认至少有一个文件有路径（排除元数据阶段的空文件）
        const hasRealFiles = status.files.some(f => f.path && !f.path.endsWith('.torrent'))
        if (hasRealFiles) {
          clearFilePickerPoll()
          showFileList(status)
          return
        }
      }

      // 检查是否出错
      if (status.status === 'error') {
        clearFilePickerPoll()
        filePickerLoading.value = false
        filePickerVisible.value = false
        ElMessage.error(status.errorMessage || t('downloadManager.metaFetchFailed'))
        return
      }

      // 超时 5 分钟
      if (elapsed > 300) {
        clearFilePickerPoll()
        filePickerLoading.value = false
        filePickerVisible.value = false
        ElMessage.error(t('downloadManager.metaFetchFailed'))
        try { await aria2.forceRemove(gid) } catch { /* ignore */ }
      }
    } catch {
      // ignore polling errors
    }
  }, 1000)
}

/**
 * 轮询 followedBy 产生的真正下载任务
 */
async function pollRealTask(gid) {
  let elapsed = 0
  filePickerPollTimer = setInterval(async () => {
    elapsed += 1
    try {
      const status = await aria2.tellStatus(gid)

      if (status.bittorrent?.info?.name && status.files?.length > 0) {
        clearFilePickerPoll()
        showFileList(status)
        return
      }

      if (status.status === 'error') {
        clearFilePickerPoll()
        filePickerLoading.value = false
        filePickerVisible.value = false
        ElMessage.error(status.errorMessage || t('downloadManager.metaFetchFailed'))
        return
      }

      if (elapsed > 120) {
        clearFilePickerPoll()
        filePickerLoading.value = false
        filePickerVisible.value = false
        ElMessage.error(t('downloadManager.metaFetchFailed'))
      }
    } catch { /* ignore */ }
  }, 1000)
}

/**
 * 展示文件列表供用户选择
 */
async function showFileList(status) {
  filePickerName.value = status.bittorrent.info.name
  filePickerFiles.value = (status.files || []).map((f, i) => ({
    index: i + 1,
    path: f.path,
    name: f.path ? f.path.split(/[/\\]/).pop() : `File ${i + 1}`,
    length: f.length,
    selected: true,
  }))
  filePickerLoading.value = false

  // 暂停任务，等用户选择文件
  const gid = filePickerGid.value
  try { await aria2.pause(gid) } catch { /* 可能已暂停 */ }
}

function clearFilePickerPoll() {
  if (filePickerPollTimer) {
    clearInterval(filePickerPollTimer)
    filePickerPollTimer = null
  }
}

function toggleSelectAll(val) {
  filePickerFiles.value.forEach(f => f.selected = val)
}

async function confirmFilePicker() {
  const gid = filePickerGid.value
  const selectedIndices = filePickerFiles.value
    .filter(f => f.selected)
    .map(f => String(f.index))

  if (selectedIndices.length === 0) return

  try {
    // 设置选中的文件
    await aria2.changeOption(gid, { 'select-file': selectedIndices.join(',') })
    // 恢复下载
    try { await aria2.unpause(gid) } catch { /* 可能已在下载 */ }
    ElMessage.success(t('downloadManager.taskAdded'))
  } catch (e) {
    ElMessage.error(e.message)
  }

  filePickerVisible.value = false
  refreshTasks()
}

async function cancelFilePicker() {
  clearFilePickerPoll()
  // 如果还在获取元数据中，删除任务
  if (filePickerGid.value) {
    try { await aria2.forceRemove(filePickerGid.value) } catch { /* ignore */ }
  }
  filePickerVisible.value = false
  filePickerLoading.value = false
  refreshTasks()
}

async function handlePause(gid) {
  try {
    await aria2.pause(gid)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function handleUnpause(gid) {
  try {
    await aria2.unpause(gid)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function handlePauseAll() {
  try {
    await aria2.pauseAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function handleUnpauseAll() {
  try {
    await aria2.unpauseAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function handleRemove(task) {
  try {
    await ElMessageBox.confirm(
      t('downloadManager.confirmDelete'),
      t('downloadManager.deleteTitle'),
      { type: 'warning' }
    )
    if (task.status === 'active' || task.status === 'waiting' || task.status === 'paused') {
      await aria2.forceRemove(task.gid)
    } else {
      await aria2.removeDownloadResult(task.gid)
    }
    refreshTasks()
  } catch {
    // 取消
  }
}

async function openFolder(task) {
  if (task.files?.length > 0 && task.files[0].path) {
    const filePath = task.files[0].path
    // 取父目录：找最后一个 \ 或 /
    const sep = filePath.includes('\\') ? '\\' : '/'
    const lastIdx = filePath.lastIndexOf(sep)
    const dir = lastIdx > 0 ? filePath.substring(0, lastIdx) : filePath
    try {
      await openPath(dir)
    } catch {
      ElMessage.error(t('downloadManager.openFolderFailed'))
    }
  }
}

function showSettingsDialog() {
  settingsForm.value = {
    downloadLimit: '',
    uploadLimit: '',
    maxConcurrent: 5,
    dir: defaultDir.value,
  }
  settingsVisible.value = true
}

async function selectSettingsDir() {
  const selected = await openDialog({
    directory: true,
    title: t('downloadManager.selectDir'),
  })
  if (selected) {
    settingsForm.value.dir = selected
  }
}

async function applySettings() {
  if (!connected.value) return
  try {
    const options = {}
    if (settingsForm.value.downloadLimit) {
      options['max-overall-download-limit'] = settingsForm.value.downloadLimit
      speedLimit.value = settingsForm.value.downloadLimit
    } else {
      options['max-overall-download-limit'] = '0'
      speedLimit.value = ''
    }
    if (settingsForm.value.uploadLimit) {
      options['max-overall-upload-limit'] = settingsForm.value.uploadLimit
    } else {
      options['max-overall-upload-limit'] = '0'
    }
    if (settingsForm.value.maxConcurrent) {
      options['max-concurrent-downloads'] = String(settingsForm.value.maxConcurrent)
    }
    if (settingsForm.value.dir) {
      options.dir = settingsForm.value.dir
      defaultDir.value = settingsForm.value.dir
    }
    await aria2.changeGlobalOption(options)
    ElMessage.success(t('downloadManager.settingsApplied'))
    settingsVisible.value = false
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// === 生命周期 ===
onMounted(async () => {
  try {
    defaultDir.value = await invoke('get_default_download_dir')
  } catch { /* ignore */ }

  // 检查 aria2 是否已在运行
  try {
    const status = await invoke('get_aria2_status')
    if (status.running) {
      await aria2.connect({
        url: `ws://127.0.0.1:${status.rpcPort}/jsonrpc`,
        onClose: () => {
          connected.value = false
          stopPolling()
        },
        onNotify: handleNotification,
      })
      connected.value = true
      startPolling()
    }
  } catch { /* ignore */ }
})

onBeforeUnmount(() => {
  stopPolling()
  clearFilePickerPoll()
  aria2.disconnect()
})
</script>

<style scoped>
.download-manager-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}

/* ===== Header ===== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,249,252,0.82));
  border-bottom: 1px solid rgba(15,23,42,0.08);
  min-height: 58px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.page-title-block { display: flex; flex-direction: column; gap: 3px; }
.page-eyebrow { font-size: 10px; line-height: 1; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--text-quaternary); }
.breadcrumb { display: flex; align-items: center; gap: var(--space-sm); font-size: 15px; font-weight: 600; color: var(--text-primary); }
.breadcrumb .el-icon { font-size: 16px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--text-secondary); transition: color .2s; }
.breadcrumb-link:hover { color: var(--accent-blue); }
.breadcrumb-sep { color: var(--text-quaternary); margin: 0 2px; }
.header-actions { display: flex; align-items: center; gap: 8px; }

/* ===== Content area (glass container) ===== */
.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 18px 18px;
  background: linear-gradient(180deg, rgba(250,252,255,0.72), rgba(241,245,249,0.62));
  border: 1px solid rgba(255,255,255,0.52);
  border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75), 0 12px 28px rgba(15,23,42,0.04);
  backdrop-filter: blur(18px);
}
.content-inner {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  scrollbar-gutter: stable;
}
.content-inner::-webkit-scrollbar { width: 6px; }
.content-inner::-webkit-scrollbar-track { background: transparent; }
.content-inner::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.22); border-radius: 999px; }

/* ===== Connect card ===== */
.connect-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px 32px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(241,245,249,0.6));
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 20px rgba(15,23,42,0.04);
}
.connect-card-icon {
  width: 64px; height: 64px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  color: #3b82f6;
  flex-shrink: 0;
}
.connect-card-body { flex: 1; min-width: 0; }
.connect-card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.connect-card-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.5; }

/* ===== Stat row ===== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
  transition: transform .2s, box-shadow .2s;
}
.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 16px rgba(15,23,42,0.06);
}
.stat-card-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  font-size: 16px; font-weight: 700;
  flex-shrink: 0;
}
.stat-download .stat-card-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #2563eb; }
.stat-upload .stat-card-icon { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
.stat-active .stat-card-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
.stat-done .stat-card-icon { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
.stat-card-info { min-width: 0; }
.stat-card-value { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-card-label { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

/* ===== Filter bar ===== */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.tab-group { display: flex; gap: 4px; }
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all .2s;
  user-select: none;
}
.tab-btn:hover { background: rgba(255,255,255,0.6); }
.tab-btn.active {
  background: rgba(255,255,255,0.82);
  color: var(--text-primary);
  border-color: rgba(15,23,42,0.06);
  box-shadow: 0 1px 3px rgba(15,23,42,0.06);
  font-weight: 600;
}
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(15,23,42,0.05);
  color: var(--text-tertiary);
}
.tab-btn.active .tab-count { background: rgba(59,130,246,0.1); color: #3b82f6; }
.search-input { width: 200px; }

/* ===== Task list ===== */
.task-list-area { min-height: 0; }
.task-list { display: flex; flex-direction: column; gap: 8px; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
}
.empty-icon { color: rgba(148,163,184,0.5); }
.empty-text { font-size: 13px; color: var(--text-tertiary); }

/* ===== Task item ===== */
.task-item {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.58);
  border: 1px solid rgba(15,23,42,0.05);
  transition: transform .15s, border-color .2s, box-shadow .2s, background .2s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
}
.task-item:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.78);
  border-color: rgba(96,165,250,0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 20px rgba(59,130,246,0.06);
}
.task-item.task-error {
  border-color: rgba(239,68,68,0.18);
  background: rgba(255,245,245,0.5);
}

/* Task icon */
.task-icon {
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
  font-size: 18px;
  margin-top: 2px;
}
.icon-active { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #3b82f6; }
.icon-complete { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
.icon-error { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #dc2626; }
.icon-paused { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #6b7280; }
.icon-waiting { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
.icon-removed { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #9ca3af; }

@keyframes spin { to { transform: rotate(360deg); } }
.icon-spin { animation: spin 1.2s linear infinite; }

.task-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.task-row-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.task-name {
  font-size: 13px; font-weight: 500; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}

/* Task actions */
.task-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity .2s; }
.task-item:hover .task-actions { opacity: 1; }
.action-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 7px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all .15s;
  font-size: 14px;
}
.action-btn:hover { background: rgba(15,23,42,0.06); color: var(--text-primary); }
.action-resume:hover { background: rgba(16,185,129,0.1); color: #059669; }
.action-folder:hover { background: rgba(59,130,246,0.1); color: #3b82f6; }
.action-delete:hover { background: rgba(239,68,68,0.1); color: #dc2626; }

/* Progress bar */
.task-progress-bar { display: flex; align-items: center; gap: 8px; }
.progress-track {
  flex: 1; height: 5px;
  background: rgba(15,23,42,0.06);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}
.fill-active { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
.fill-complete { background: linear-gradient(90deg, #34d399, #10b981); }
.fill-error { background: linear-gradient(90deg, #f87171, #ef4444); }
.fill-paused { background: #cbd5e1; }
.fill-waiting { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.fill-removed { background: #e2e8f0; }
.progress-text { font-size: 11px; font-weight: 600; color: var(--text-tertiary); min-width: 32px; text-align: right; font-variant-numeric: tabular-nums; }

/* Task bottom row */
.task-row-bottom {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 11px; color: var(--text-tertiary);
}
.meta-speed { color: #3b82f6; font-weight: 600; }
.meta-upload { color: #10b981; font-weight: 600; }
.meta-eta { color: var(--text-secondary); }
.meta-error { color: #ef4444; }
.meta-conn { color: var(--text-quaternary); }

/* ===== Dialog ===== */
.dir-input-row { display: flex; gap: 8px; width: 100%; }
.dir-input-row .el-input { flex: 1; }
.torrent-name { margin-left: 8px; font-size: 12px; color: var(--text-secondary); }

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .stat-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .stat-row { grid-template-columns: 1fr; }
  .content-area { margin: 10px; border-radius: 16px; }
  .content-inner { padding: 14px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { width: 100% !important; }
  .connect-card { flex-direction: column; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  .task-item, .stat-card, .action-btn, .tab-btn { transition: none; }
  .icon-spin { animation: none; }
}

/* ===== File picker dialog ===== */
.picker-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: var(--text-secondary);
}
.picker-loading-text { font-size: 14px; font-weight: 500; }
.picker-loading-hint { font-size: 12px; color: var(--text-tertiary); }

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.picker-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.picker-total { font-size: 12px; color: var(--text-tertiary); }

.picker-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(15,23,42,0.06);
  margin-bottom: 8px;
}
.picker-selected-info { font-size: 12px; color: var(--text-secondary); }

.picker-file-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.picker-file-list::-webkit-scrollbar { width: 5px; }
.picker-file-list::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 999px; }

.picker-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;
}
.picker-file-item:hover { background: rgba(59,130,246,0.04); }
.picker-file-name {
  flex: 1; min-width: 0;
  font-size: 12px; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.picker-file-size { font-size: 11px; color: var(--text-tertiary); flex-shrink: 0; font-variant-numeric: tabular-nums; }
</style>
