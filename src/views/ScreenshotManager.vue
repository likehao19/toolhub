<template>
  <div class="screenshot-mgr-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Desktop Assets</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('screenshot.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" text @click="showSettings = !showSettings" :title="t('screenshot.settings')">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <!-- Quick Actions -->
      <div class="section">
        <div class="section-title">{{ t('screenshot.quickActions') }}</div>
        <div class="action-grid">
          <div class="action-card" @click="startScreenshot">
            <div class="action-icon">📷</div>
            <div class="action-name">{{ t('screenshot.regionCapture') }}</div>
            <div class="action-hint">{{ settings.hotkey }}</div>
          </div>
          <div class="action-card" @click="startFullscreen">
            <div class="action-icon">🖥️</div>
            <div class="action-name">{{ t('screenshot.fullCapture') }}</div>
            <div class="action-hint">{{ settings.fullscreenHotkey }}</div>
          </div>
          <div class="action-card" @click="startDelayed">
            <div class="action-icon">⏱️</div>
            <div class="action-name">{{ t('screenshot.delayCapture') }}</div>
            <div class="action-hint">{{ t('screenshot.delay3s') }}</div>
          </div>
          <div class="action-card" @click="startColorPicker">
            <div class="action-icon">🎨</div>
            <div class="action-name">{{ t('screenshot.colorPicker') }}</div>
            <div class="action-hint">{{ settings.colorPickerHotkey }}</div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="section">
        <div class="section-title">
          {{ t('screenshot.history') }} ({{ history.length }})
          <el-button v-if="history.length" size="small" text type="danger" @click="onClearHistory" :title="t('screenshot.clearHistory')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <div v-if="history.length" class="history-grid">
          <div v-for="item in history" :key="item.id" class="history-card">
            <img :src="item.thumbnail" class="history-thumb" />
            <div class="history-info">
              <span>{{ item.width }}×{{ item.height }}</span>
              <span>{{ formatTime(item.timestamp) }}</span>
            </div>
            <div class="history-actions">
              <el-button size="small" text @click="pinFromHistory(item)" :title="t('common.pin')">
                <el-icon><Position /></el-icon>
              </el-button>
              <el-button size="small" text type="danger" @click="onDeleteHistory(item.id)" :title="t('common.delete')">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('screenshot.noHistory') }}</div>
      </div>

      <!-- Color History -->
      <div class="section">
        <div class="section-title">{{ t('screenshot.colorHistory') }}</div>
        <div v-if="colors.length" class="color-grid">
          <div v-for="c in colors" :key="c.hex" class="color-card" @click="copyColor(c.hex)" :title="c.hex">
            <div class="color-swatch" :style="{ background: c.hex }"></div>
            <span class="color-hex">{{ c.hex }}</span>
          </div>
        </div>
        <div v-else class="empty-hint">{{ t('screenshot.noColors') }}</div>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="section settings-section">
        <div class="section-title">{{ t('screenshot.settings') }}</div>
        <el-form label-width="120px" size="small">
          <el-form-item :label="t('screenshot.hotkeyLabel')">
            <el-input v-model="settings.hotkey" style="width:200px" :placeholder="'F1'" />
          </el-form-item>
          <el-form-item :label="t('screenshot.fullHotkeyLabel')">
            <el-input v-model="settings.fullscreenHotkey" style="width:200px" :placeholder="'Ctrl+F1'" />
          </el-form-item>
          <el-form-item :label="t('screenshot.colorHotkeyLabel')">
            <el-input v-model="settings.colorPickerHotkey" style="width:200px" :placeholder="'Alt+C'" />
          </el-form-item>
          <el-form-item :label="t('screenshot.saveFormat')">
            <el-radio-group v-model="settings.saveFormat">
              <el-radio value="png">PNG</el-radio>
              <el-radio value="jpg">JPEG</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="t('screenshot.autoCopy')">
            <el-switch v-model="settings.autoCopy" />
          </el-form-item>
          <el-form-item :label="t('screenshot.showMagnifier')">
            <el-switch v-model="settings.showMagnifier" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="doSaveSettings">
              <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('common.save') }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span>{{ t('screenshot.historyCount', { count: history.length }) }}</span>
      <span>{{ t('screenshot.pinCount', { count: activePins }) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Briefcase, Setting, Delete, Position, Close, Check } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { loadSettings, saveSettings, loadHistory, clearHistory, deleteHistoryItem, loadColors } from '@/utils/screenshotManager'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

const router = useRouter()
const settings = ref(loadSettings())
const history = ref([])
const colors = ref([])
const showSettings = ref(false)
const activePins = ref(0)

onMounted(async () => {
  history.value = loadHistory()
  colors.value = loadColors()
  await refreshPinCount()
})

async function refreshPinCount() {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
    const allWins = await getAllWebviewWindows()
    activePins.value = allWins.filter(w => w.label.startsWith('pin-')).length
  } catch { activePins.value = 0 }
}

// ===== Screenshot Actions =====
async function startScreenshot(mode) {
  const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
  const allWins = await getAllWebviewWindows()
  if (allWins.find(w => w.label.startsWith('screenshot-overlay'))) return

  const { invoke } = await import('@tauri-apps/api/core')
  const screens = await invoke('capture_screen_fast')
  if (!screens.length) return
  localStorage.setItem('__screenshot_pre_capture', JSON.stringify(screens))

  const modeParam = mode === 'colorPicker' ? '?mode=colorPicker' : ''
  const win = new WebviewWindow(`screenshot-overlay-${Date.now()}`, {
    url: `${window.location.origin}/screenshot-overlay${modeParam}`,
    title: '',
    fullscreen: true,
    transparent: true,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    visible: false,
  })
  win.once('tauri://destroyed', () => {
    history.value = loadHistory()
    colors.value = loadColors()
  })
}

async function startFullscreen() {
  try {
    const { invoke, convertFileSrc } = await import('@tauri-apps/api/core')
    const screens = await invoke('capture_all_screens')
    if (!screens.length) return
    const s = screens[0]
    // 后端现在返回 PNG 文件路径(避免 base64 base64 经 IPC 多屏暴增内存),
    // 前端通过 asset:// URL 拿 Blob,再走 clipboard / Image 加载。
    const assetUrl = convertFileSrc(s.path)
    const blob = await fetch(assetUrl).then(r => r.blob())
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    ElMessage.success(t('screenshot.copiedFull'))
    const { addToHistory, uuid } = await import('@/utils/screenshotManager')
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const thumbH = 80
      const thumbW = (img.width / img.height) * thumbH
      c.width = thumbW; c.height = thumbH
      c.getContext('2d').drawImage(img, 0, 0, thumbW, thumbH)
      // 限制 fullImage 尺寸避免 localStorage 溢出
      let fullImage = ''
      const MAX_FULL = 1200
      if (img.width <= MAX_FULL && img.height <= MAX_FULL) {
        // 小图用 canvas 转 dataURL 持久化(asset:// URL 关掉就失效,localStorage 历史不能存)
        const fc2 = document.createElement('canvas')
        fc2.width = img.width; fc2.height = img.height
        fc2.getContext('2d').drawImage(img, 0, 0)
        fullImage = fc2.toDataURL('image/png')
      } else {
        const fc = document.createElement('canvas')
        const ratio = Math.min(MAX_FULL / img.width, MAX_FULL / img.height)
        fc.width = Math.round(img.width * ratio); fc.height = Math.round(img.height * ratio)
        fc.getContext('2d').drawImage(img, 0, 0, fc.width, fc.height)
        fullImage = fc.toDataURL('image/png')
      }
      addToHistory({
        id: uuid(), timestamp: Date.now(), width: s.width, height: s.height,
        thumbnail: c.toDataURL('image/png', 0.6),
        fullImage,
      })
      history.value = loadHistory()
      // 截图已经吃进 Blob/canvas,临时文件可以删了。失败不影响主流程,
      // 后端 capture_screen_fast 也会定期清理 >2 分钟的旧文件。
      invoke('delete_temp_file', { path: s.path }).catch(() => {})
    }
    img.src = assetUrl
  } catch (e) {
    ElMessage.error(String(e))
  }
}

let delayTimer = null

function startDelayed() {
  ElMessage.info(t('screenshot.delayStarting'))
  delayTimer = setTimeout(() => startScreenshot(), 3000)
}

onBeforeUnmount(() => {
  clearTimeout(delayTimer)
})

function startColorPicker() {
  startScreenshot('colorPicker')
}

// ===== History =====
function onClearHistory() {
  ElMessageBox.confirm(t('screenshot.confirmClearHistory'), t('common.confirmDelete'), { type: 'warning' })
    .then(() => { clearHistory(); history.value = [] })
    .catch(() => {})
}

function onDeleteHistory(id) {
  history.value = deleteHistoryItem(id)
}

async function pinFromHistory(item) {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const { invoke } = await import('@tauri-apps/api/core')
  const pinId = `pin-${Date.now()}`

  // 通过临时文件传递图片（跨窗口 localStorage 不共享）
  const imgData = item.fullImage || item.thumbnail
  const base64 = imgData.split(',')[1]
  const tmpDir = await invoke('get_temp_dir')
  const tmpPath = `${tmpDir}/toolhub-pin-${pinId}.png`
  await invoke('save_screenshot_file', { path: tmpPath, data: base64 })

  const pinW = item.width
  const pinH = item.height
  const win = new WebviewWindow(pinId, {
    url: `${window.location.origin}/screenshot-pin?w=${pinW}&h=${pinH}&file=${encodeURIComponent(tmpPath)}`,
    title: '', width: pinW, height: pinH,
    decorations: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
  })
  activePins.value++
  win.once('tauri://destroyed', () => {
    refreshPinCount()
  })
}

// ===== Colors =====
async function copyColor(hex) {
  await writeText(hex)
  ElMessage.success(`${t('screenshot.colorCopied')}: ${hex}`)
}

// ===== Settings =====
function doSaveSettings() {
  saveSettings(settings.value)
  // 旧:t('apiWorkbench.saved') —— 这是复制粘贴导致的 namespace 错误,
  // apiWorkbench 在 i18n 里根本没有 saved 子键,toast 显示原始 key 字符串。
  ElMessage.success(t('common.saveSuccess'))
}

// ===== Helpers =====
function formatTime(ts) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}
</script>

<style scoped>
.screenshot-mgr-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }
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
  font-size: 15px; font-weight: 600; color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { color: var(--accent-blue); text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); }
.header-actions :deep(.el-button) { --el-border-radius-base: 10px; }
.content-area { flex: 1; overflow-y: auto; padding: 14px 18px 0; }
.section {
  margin-bottom: 18px;
  padding: 16px 18px 18px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 24px rgba(60, 40, 20,0.04);
}
.section-title {
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  margin-bottom: 12px; display: flex; align-items: center; gap: 12px;
}
.action-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.action-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 20px 12px; border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 16px;
  cursor: pointer; background: rgba(255,255,255,0.68); transition: all 0.15s;
}
.action-card:hover { border-color: var(--accent-blue); background: rgba(64,158,255,0.04); transform: translateY(-2px); }
.action-icon { font-size: 32px; margin-bottom: 8px; }
.action-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.action-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
.history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.history-card {
  border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 12px;
  overflow: hidden; background: rgba(255,255,255,0.78); cursor: pointer;
  transition: border-color 0.15s; position: relative;
}
.history-card:hover { border-color: var(--accent-blue); }
.history-thumb { width: 100%; height: 80px; object-fit: cover; display: block; background: rgba(248, 244, 232,0.9); }
.history-info {
  padding: 6px 8px; font-size: 10px; color: var(--text-tertiary);
  display: flex; justify-content: space-between;
}
.history-actions { position: absolute; top: 6px; right: 6px; display: none; }
.history-card:hover .history-actions { display: flex; }
.color-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.color-card {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px;
  border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 10px;
  cursor: pointer; font-size: 11px; font-family: monospace;
  background: rgba(255,255,255,0.78);
}
.color-card:hover { border-color: var(--accent-blue); }
.color-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); }
.color-hex { color: var(--text-secondary); }
.settings-section {
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  padding: 16px;
  background: rgba(255,255,255,0.78);
}
.empty-hint {
  text-align: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.5);
}
.status-bar {
  height: 30px; display: flex; align-items: center; gap: 16px; padding: 0 16px;
  margin: 0 18px 18px;
  background: rgba(255,255,255,0.72); border: 1px solid rgba(60, 40, 20, 0.08); border-top: none;
  font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
  border-radius: 0 0 18px 18px;
}
</style>
