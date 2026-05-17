<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="560px"
    :close-on-click-modal="phase !== 'downloading' && phase !== 'installing'"
    :close-on-press-escape="phase !== 'downloading' && phase !== 'installing'"
    :show-close="phase !== 'downloading' && phase !== 'installing'"
    align-center
    @close="handleClose"
  >
    <div v-if="info" class="update-dialog-body">
      <!-- 版本信息区 -->
      <div class="version-row">
        <div class="version-block">
          <div class="version-label">{{ t('update.currentVersion') }}</div>
          <div class="version-value current">v{{ info.current_version }}</div>
        </div>
        <el-icon class="version-arrow"><ArrowRight /></el-icon>
        <div class="version-block">
          <div class="version-label">{{ t('update.latestVersion') }}</div>
          <div class="version-value latest">v{{ info.latest_version }}</div>
        </div>
      </div>

      <!-- 元信息 -->
      <div class="meta-row">
        <span v-if="info.published_at">
          {{ t('update.publishedAt') }}：{{ formattedPublished }}
        </span>
        <span v-if="info.asset">
          {{ t('update.downloadSize') }}：{{ formatBytes(info.asset.size) }}
        </span>
        <span v-if="info.source" class="source-tag">{{ info.source }}</span>
      </div>

      <!-- Release notes -->
      <div v-if="info.release_notes" class="release-notes-wrap">
        <div class="section-title">{{ t('update.releaseNotes') }}</div>
        <div class="release-notes" v-html="renderedNotes"></div>
      </div>

      <!-- 下载进度 -->
      <div v-if="phase === 'downloading' || phase === 'ready'" class="progress-wrap">
        <el-progress
          :percentage="Math.min(100, Math.round(progress.percent || 0))"
          :status="phase === 'ready' ? 'success' : ''"
        />
        <div class="progress-meta">
          <span>{{ formatBytes(progress.downloaded) }} / {{ formatBytes(progress.total || (info.asset && info.asset.size) || 0) }}</span>
          <span v-if="phase === 'downloading'" class="speed">{{ formatSpeed(progress.speed_bps || 0) }}</span>
          <span v-else class="done">{{ t('update.downloadComplete') }}</span>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="phase === 'error'" class="error-box">
        <el-icon><WarnTriangleFilled /></el-icon>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- 无可用 asset 提示 -->
      <div v-if="phase === 'available' && !info.asset" class="error-box">
        <el-icon><WarnTriangleFilled /></el-icon>
        <span>{{ t('update.noAssetForPlatform') }}</span>
      </div>

      <!-- macOS 提示 -->
      <div v-if="phase === 'ready' && isMacos" class="hint-box">
        {{ t('update.macosHint') }}
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <!-- available -->
        <template v-if="phase === 'available'">
          <el-button @click="visible = false">{{ t('update.later') }}</el-button>
          <el-button type="primary" :disabled="!info?.asset" @click="startDownload">
            {{ t('update.updateNow') }}
          </el-button>
        </template>

        <!-- downloading -->
        <template v-else-if="phase === 'downloading'">
          <el-button @click="onCancel">{{ t('update.cancel') }}</el-button>
        </template>

        <!-- ready -->
        <template v-else-if="phase === 'ready'">
          <el-button @click="visible = false">{{ t('update.later') }}</el-button>
          <el-button type="primary" @click="onInstall">{{ t('update.installAndExit') }}</el-button>
        </template>

        <!-- error -->
        <template v-else-if="phase === 'error'">
          <el-button @click="visible = false">{{ t('common.close') }}</el-button>
          <el-button type="primary" @click="startDownload">{{ t('update.retry') }}</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, WarnTriangleFilled } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { t } from '@/i18n'
import {
  downloadUpdate,
  cancelDownload,
  installUpdate,
  formatBytes,
  formatSpeed,
  getCachedInstaller,
  setCachedInstaller,
} from '@/utils/updater'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  info: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const phase = ref('available')
const progress = ref({ downloaded: 0, total: 0, percent: 0, speed_bps: 0 })
const errorMsg = ref('')
const installerPath = ref('')

const isMacos = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform || navigator.userAgent || '')
})

const dialogTitle = computed(() => {
  switch (phase.value) {
    case 'downloading':
      return t('update.downloading')
    case 'ready':
      return t('update.downloadComplete')
    case 'error':
      return t('update.downloadFailedShort')
    default:
      return t('update.newVersionAvailable', { v: props.info?.latest_version || '' })
  }
})

const formattedPublished = computed(() => {
  if (!props.info?.published_at) return ''
  try {
    const d = new Date(props.info.published_at)
    if (Number.isNaN(d.getTime())) return props.info.published_at
    return d.toLocaleString()
  } catch {
    return props.info.published_at
  }
})

const renderedNotes = computed(() => {
  const src = props.info?.release_notes || ''
  if (!src) return ''
  try {
    return marked.parse(src, { breaks: true, gfm: true })
  } catch {
    return src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  }
})

// 重置状态：每次重新打开 dialog。如果本会话已下载过同名安装包，直接跳到 ready。
watch(() => props.modelValue, (v) => {
  if (!v) return
  const cachedPath = getCachedInstaller(props.info?.asset?.name)
  if (cachedPath) {
    installerPath.value = cachedPath
    progress.value = {
      downloaded: props.info?.asset?.size || 0,
      total: props.info?.asset?.size || 0,
      percent: 100,
      speed_bps: 0,
    }
    errorMsg.value = ''
    phase.value = 'ready'
  } else {
    phase.value = 'available'
    progress.value = { downloaded: 0, total: 0, percent: 0, speed_bps: 0 }
    errorMsg.value = ''
    installerPath.value = ''
  }
})

async function startDownload() {
  if (!props.info?.asset) return
  phase.value = 'downloading'
  errorMsg.value = ''
  progress.value = { downloaded: 0, total: props.info.asset.size || 0, percent: 0, speed_bps: 0 }
  try {
    const path = await downloadUpdate(props.info.asset, (p) => {
      progress.value = p
    })
    installerPath.value = path
    setCachedInstaller(props.info.asset.name, path)
    phase.value = 'ready'
  } catch (e) {
    const msg = String(e)
    if (msg.includes('cancelled')) {
      phase.value = 'available'
      ElMessage.info(t('update.cancelled'))
    } else {
      phase.value = 'error'
      errorMsg.value = msg
    }
  }
}

async function onCancel() {
  try { await cancelDownload() } catch {}
}

async function onInstall() {
  if (!installerPath.value) return
  phase.value = 'installing'
  try {
    await installUpdate(installerPath.value)
    // 正常情况下，调用后应用即退出，不会执行到这里
  } catch (e) {
    phase.value = 'error'
    errorMsg.value = String(e)
  }
}

function handleClose() {
  // 下载中关闭：尝试取消，避免后台残留
  if (phase.value === 'downloading') {
    onCancel()
  }
}
</script>

<style scoped>
.update-dialog-body {
  padding: 0 4px;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 14px 0 18px;
}
.version-block {
  text-align: center;
  min-width: 120px;
}
.version-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.version-value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.version-value.current {
  color: var(--el-text-color-regular);
}
.version-value.latest {
  color: var(--el-color-primary);
}
.version-arrow {
  font-size: 22px;
  color: var(--el-text-color-secondary);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.source-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 11px;
  text-transform: uppercase;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.release-notes-wrap {
  margin-bottom: 14px;
}
.release-notes {
  max-height: 220px;
  overflow-y: auto;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.release-notes :deep(h1),
.release-notes :deep(h2),
.release-notes :deep(h3) {
  font-size: 14px;
  margin: 10px 0 6px;
  font-weight: 600;
}
.release-notes :deep(ul),
.release-notes :deep(ol) {
  padding-left: 20px;
  margin: 6px 0;
}
.release-notes :deep(li) {
  margin: 2px 0;
}
.release-notes :deep(code) {
  background: var(--el-fill-color-dark);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.release-notes :deep(pre) {
  background: var(--el-fill-color-dark);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
.release-notes :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.progress-wrap {
  padding: 12px 0 4px;
}
.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}
.progress-meta .speed {
  color: var(--el-color-primary);
  font-variant-numeric: tabular-nums;
}
.progress-meta .done {
  color: var(--el-color-success);
}

.error-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
  color: var(--el-color-danger);
  font-size: 13px;
  margin-top: 10px;
}
.error-box .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.hint-box {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
