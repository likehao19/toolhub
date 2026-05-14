<template>
  <div class="toolbox-wrapper toolbox-sticky-notes-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Desktop Assets</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('toolboxStickyNotes.pageTitle') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" text @click="resetConfig" :title="t('common.reset')">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
        <el-button size="small" text @click="saveConfig" :title="t('common.save')">
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button size="small" text @click="openStickyNotes" :title="t('toolboxStickyNotes.openNotes')">
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <div class="settings-section">
        <div class="section-header">
          <span>{{ t('toolboxStickyNotes.sectionBasic') }}</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.noteFolder') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.noteFolderDesc') }}</span>
            </div>
            <div class="setting-control">
              <el-select
                v-model="config.noteFolder"
                :placeholder="t('toolboxStickyNotes.selectFolder')"
                style="width: 240px;"
                :loading="foldersLoading"
              >
                <el-option
                  v-for="opt in folderOptions"
                  :key="opt.value"
                  :label="opt.value"
                  :value="opt.value"
                >
                  <span :style="{ paddingLeft: opt.depth * 16 + 'px' }" class="folder-option">
                    <span class="folder-indent" v-if="opt.depth > 0">└</span>
                    <span>{{ opt.label }}</span>
                  </span>
                </el-option>
              </el-select>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.newNote') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.shortcutDesc') }}</span>
            </div>
            <div class="setting-control shortcut-control">
              <div
                ref="shortcutRef"
                class="shortcut-input"
                :class="{ recording: isRecording }"
                @click="toggleRecording"
              >
                <template v-if="isRecording">
                  <template v-if="liveModifiers.length > 0">
                    <template v-for="(mod, i) in liveModifiers" :key="mod">
                      <span v-if="i > 0" class="keycap-sep">+</span>
                      <kbd class="keycap active">{{ mod }}</kbd>
                    </template>
                    <span class="keycap-sep">+</span>
                    <span class="recording-dot"></span>
                  </template>
                  <span v-else class="recording-hint">{{ t('toolboxStickyNotes.recordingHint') }}</span>
                </template>
                <template v-else-if="config.shortcut">
                  <template v-for="(key, i) in config.shortcut.split('+')" :key="i">
                    <span v-if="i > 0" class="keycap-sep">+</span>
                    <kbd class="keycap">{{ key }}</kbd>
                  </template>
                </template>
                <span v-else class="shortcut-placeholder">{{ t('toolboxStickyNotes.notSet') }}</span>
              </div>
              <span
                v-if="config.shortcut && !isRecording"
                class="shortcut-clear"
                :title="t('toolboxStickyNotes.clearShortcut')"
                @click.stop="config.shortcut = ''"
              >&times;</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <span>{{ t('toolboxStickyNotes.sectionWindow') }}</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.maxWindows') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.maxWindowsDesc') }}</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.maxWindows" :min="1" :max="20" size="small" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.defaultOnTop') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.defaultOnTopDesc') }}</span>
            </div>
            <div class="setting-control">
              <el-switch v-model="config.alwaysOnTop" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.defaultWidth') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.defaultWidthDesc') }}</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.defaultWidth" :min="200" :max="800" :step="10" size="small" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ t('toolboxStickyNotes.defaultHeight') }}</span>
              <span class="label-desc">{{ t('toolboxStickyNotes.defaultHeightDesc') }}</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.defaultHeight" :min="200" :max="800" :step="10" size="small" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Promotion, Briefcase, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'

const router = useRouter()

const STORAGE_KEY = 'sticky_notes_config'

const DEFAULT_CONFIG = {
  noteFolder: '',
  shortcut: 'Ctrl+Alt+N',
  maxWindows: 10,
  alwaysOnTop: true,
  defaultWidth: 350,
  defaultHeight: 400
}

const config = ref({ ...DEFAULT_CONFIG })

// ---- 鏂囦欢澶归€夋嫨 ----
const folderOptions = ref([])
const foldersLoading = ref(false)

// 璧勬簮/绯荤粺鏂囦欢澶癸紝涓嶅簲鍑虹幇鍦ㄩ€夋嫨鍒楄〃涓?
const EXCLUDED_FOLDERS = new Set([
  'images', 'videos', 'assets', 'attachments',
  '.git', '.svn', 'node_modules', '.DS_Store', 'Thumbs.db'
])

const loadFolders = async () => {
  foldersLoading.value = true
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { readDir } = await import('@tauri-apps/plugin-fs')
    const { join } = await import('@tauri-apps/api/path')

    const rootDir = await getNotesDir()

    // 閫掑綊鎵弿鏂囦欢澶癸紝鏋勫缓鏍戝苟灞曞钩涓哄甫缂╄繘鐨勫垪琛?
    const scanDir = async (dirPath, depth, prefix) => {
      const entries = await readDir(dirPath)
      const result = []

      const dirs = entries
        .filter(e => e.isDirectory && !e.name.startsWith('.') && !EXCLUDED_FOLDERS.has(e.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

      for (const entry of dirs) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
        result.push({ value: relativePath, label: entry.name, depth })

        // 閫掑綊瀛愭枃浠跺す锛堥檺鍒舵繁搴﹂槻姝㈣繃娣憋級
        if (depth < 3) {
          const childPath = await join(dirPath, entry.name)
          const children = await scanDir(childPath, depth + 1, relativePath)
          result.push(...children)
        }
      }
      return result
    }

    const options = await scanDir(rootDir, 0, '')

    // 纭繚褰撳墠閫変腑鍊煎湪鍒楄〃涓?
    if (config.value.noteFolder && !options.some(o => o.value === config.value.noteFolder)) {
      options.unshift({ value: config.value.noteFolder, label: config.value.noteFolder, depth: 0 })
    }

    folderOptions.value = options
  } catch {
    folderOptions.value = config.value.noteFolder
      ? [{ value: config.value.noteFolder, label: config.value.noteFolder, depth: 0 }]
      : [{ value: t('toolboxStickyNotes.defaultFolder'), label: t('toolboxStickyNotes.defaultFolder'), depth: 0 }]
  } finally {
    foldersLoading.value = false
  }
}

// ---- 蹇嵎閿綍鍏?----
const shortcutRef = ref(null)
const isRecording = ref(false)
const liveModifiers = ref([])

const MODIFIER_KEYS = new Set([
  'Control', 'Alt', 'Shift', 'Meta',
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'
])

const normalizeKey = (key) => {
  const keyMap = {
    ' ': 'Space',
    'ArrowUp': 'Up', 'ArrowDown': 'Down',
    'ArrowLeft': 'Left', 'ArrowRight': 'Right',
    'Escape': 'Esc', 'Delete': 'Del',
    'Backspace': 'Backspace', 'Enter': 'Enter',
    'Tab': 'Tab', 'Insert': 'Ins',
    'Home': 'Home', 'End': 'End',
    'PageUp': 'PageUp', 'PageDown': 'PageDown',
  }
  if (keyMap[key]) return keyMap[key]
  if (/^F\d{1,2}$/.test(key)) return key
  if (key.length === 1) return key.toUpperCase()
  return null
}

const getModifiers = (e) => {
  const mods = []
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  return mods
}

const onRecordKeyDown = (e) => {
  e.preventDefault()
  e.stopPropagation()

  // Esc 鍙栨秷褰曞叆
  if (e.key === 'Escape') {
    stopRecording()
    return
  }

  // 瀹炴椂鏇存柊淇グ閿樉绀?
  liveModifiers.value = getModifiers(e)

  // 鍒ゆ柇鏄惁鎸変笅浜嗛潪淇グ閿?
  if (MODIFIER_KEYS.has(e.key)) return

  const key = normalizeKey(e.key)
  if (!key) return

  const mods = getModifiers(e)
  if (mods.length === 0) return // 蹇呴』鍚慨楗伴敭

  config.value.shortcut = [...mods, key].join('+')
  stopRecording()
}

const onRecordKeyUp = (e) => {
  if (!isRecording.value) return
  liveModifiers.value = getModifiers(e)
}

const onClickOutside = (e) => {
  if (shortcutRef.value && !shortcutRef.value.contains(e.target)) {
    stopRecording()
  }
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const startRecording = () => {
  isRecording.value = true
  liveModifiers.value = []
  document.addEventListener('keydown', onRecordKeyDown, true)
  document.addEventListener('keyup', onRecordKeyUp, true)
  setTimeout(() => {
    document.addEventListener('mousedown', onClickOutside, true)
  }, 0)
}

const stopRecording = () => {
  isRecording.value = false
  liveModifiers.value = []
  document.removeEventListener('keydown', onRecordKeyDown, true)
  document.removeEventListener('keyup', onRecordKeyUp, true)
  document.removeEventListener('mousedown', onClickOutside, true)
}

// ---- 閲嶇疆 ----
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(t('toolboxStickyNotes.resetConfirmMsg'), t('toolboxStickyNotes.resetConfirmTitle'), {
      confirmButtonText: t('common.reset'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    config.value = { ...DEFAULT_CONFIG }
    ElMessage.info(t('toolboxStickyNotes.resetDone'))
  } catch {
    // 鐢ㄦ埛鍙栨秷
  }
}

// ---- 鍒濆鍖?----
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      config.value = { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      // ignore
    }
  }
  loadFolders()
})

onBeforeUnmount(() => {
  stopRecording()
})

// ---- 淇濆瓨骞剁珛鍗崇敓鏁?----
const saveConfig = async () => {
  // 璇诲彇鏃ч厤缃腑鐨勫揩鎹烽敭
  const oldCfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  const oldShortcut = (oldCfg.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')
  const newShortcut = (config.value.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')

  // 鍐欏叆 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))

  // 閫氱煡 App.vue 閲嶆柊娉ㄥ唽蹇嵎閿?
  try {
    const { emit } = await import('@tauri-apps/api/event')
    await emit('sticky-notes-config-changed', {
      ...config.value,
      _oldShortcut: oldShortcut,
      _newShortcut: newShortcut
    })
  } catch {
    // ignore in non-Tauri env
  }

  ElMessage.success(t('toolboxStickyNotes.configSaved'))
}

const openStickyNotes = async () => {
  try {
    const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')

    const allWindows = await getAllWebviewWindows()

    const preConfigured = allWindows.find(w => w.label === 'sticky-notes')
    if (preConfigured) {
      const visible = await preConfigured.isVisible()
      if (!visible) {
        await preConfigured.show()
        preConfigured.setFocus()
        return
      }
    }

    const existingLabels = allWindows.map(w => w.label)
    let label = null
    if (!existingLabels.includes('sticky-notes')) {
      label = 'sticky-notes'
    } else {
      for (let i = 1; i < config.value.maxWindows; i++) {
        const testLabel = `sticky-notes-${i}`
        if (!existingLabels.includes(testLabel)) {
          label = testLabel
          break
        }
      }
    }

    if (!label) {
      ElMessage.warning(t('toolboxStickyNotes.maxWindowsReached'))
      return
    }

    const existingStickyCount = allWindows.filter(w =>
      w.label === 'sticky-notes' || /^sticky-notes-\d+$/.test(w.label)
    ).length
    const offset = existingStickyCount * 30

    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const x = Math.floor((screenWidth - config.value.defaultWidth) / 2) + offset
    const y = Math.floor((screenHeight - config.value.defaultHeight) / 2) + offset

    const timestamp = Date.now()
    const stickyUrl = `${window.location.origin}/sticky-notes?id=${timestamp}`
    const stickyWindow = new WebviewWindow(label, {
      url: stickyUrl,
      title: t('toolboxStickyNotes.stickyWindowTitle'),
      x, y,
      width: config.value.defaultWidth,
      height: config.value.defaultHeight,
      minWidth: 300,
      minHeight: 350,
      resizable: true,
      decorations: false,
      transparent: true,
      shadow: false,
      center: false,
      alwaysOnTop: config.value.alwaysOnTop,
      skipTaskbar: false,
      visible: true,
      focus: true
    })

    stickyWindow.once('tauri://error', (e) => {
      console.error('[Sticky Notes] window create failed:', e)
      ElMessage.error(t('toolboxStickyNotes.openFailed'))
    })
  } catch (e) {
    console.error('[Sticky Notes] open failed:', e)
    ElMessage.error(t('toolboxStickyNotes.openFailed'))
  }
}
</script>

<style scoped>
.toolbox-wrapper {
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
.breadcrumb .el-icon { font-size: 15px; color: #ff9800; }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); transition: color 0.2s; }
.breadcrumb-link:hover { color: var(--accent-blue); text-decoration: underline; }
.breadcrumb-sep { color: var(--el-text-color-placeholder); font-weight: 400; }
.header-actions { display: flex; gap: 8px; }
.header-actions :deep(.el-button) {
  --el-button-border-radius: 10px;
  min-width: 84px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 0;
  scrollbar-gutter: stable;
}
.content-area::-webkit-scrollbar { width: 6px; }
.content-area::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
.content-area::-webkit-scrollbar-thumb { background: var(--el-border-color); border-radius: 3px; }
.content-area::-webkit-scrollbar-thumb:hover { background: var(--el-text-color-placeholder); }

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: var(--surface-panel-soft);
  box-shadow: inset 0 1px 0 var(--surface-panel), 0 8px 20px rgba(60, 40, 20, 0.04);
}

.overview-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.overview-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.settings-section {
  width: 100%;
  margin-bottom: 12px;
  padding: 14px 16px 6px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;
}
.settings-section:first-child { padding-top: 0; }
.settings-section:first-of-type { padding-top: 14px; }
.section-header {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0 0 10px;
  line-height: 1.3;
}
.settings-group {
  background: transparent;
  border-radius: 0;
  border: 0;
}
.setting-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  align-items: center;
  gap: 28px;
  min-height: 56px;
  padding: 12px 0;
  transition: background 0.15s;
}
.setting-row:not(:last-child) { border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.setting-row:hover { background: rgba(255,255,255,0.34); }
.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.label-text { font-size: 13px; color: var(--el-text-color-primary); font-weight: 500; }
.label-desc { font-size: 12px; color: #a8abb2; line-height: 1.4; }
.setting-control {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  padding-right: 2px;
}
.setting-control :deep(.el-select),
.setting-control :deep(.el-input-number) {
  width: 100% !important;
  max-width: 240px;
}
.shortcut-control { display: flex; align-items: center; gap: 6px; }
.shortcut-input {
  width: 100%;
  max-width: 240px;
  min-width: 160px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  background: var(--bg-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
  user-select: none;
}
.shortcut-input:hover { border-color: var(--el-text-color-placeholder); }
.shortcut-input.recording { border-color: var(--accent-blue); box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15); }
.keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  font-size: 11px;
  font-family: "PingFang SC";
  font-weight: 500;
  color: var(--el-text-color-primary);
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, #e8eaed 100%);
  border: 1px solid var(--el-text-color-placeholder);
  border-bottom-width: 2px;
  border-radius: 4px;
  line-height: 1;
  white-space: nowrap;
}
.keycap.active { color: var(--accent-blue); border-color: #a0cfff; background: linear-gradient(180deg, var(--el-color-primary-light-9) 0%, #d9ecff 100%); }
.keycap-sep { font-size: 11px; color: var(--el-text-color-placeholder); margin: 0 1px; }
.shortcut-clear { font-size: 16px; color: var(--el-text-color-placeholder); cursor: pointer; line-height: 1; transition: color 0.2s; }
.shortcut-clear:hover { color: var(--el-color-danger); }
.shortcut-placeholder { font-size: 12px; color: var(--el-text-color-placeholder); }
.recording-hint { font-size: 12px; color: var(--el-text-color-secondary); animation: blink 1s ease-in-out infinite; }
.recording-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-blue); animation: blink 0.8s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.folder-option { display: inline-flex; align-items: center; font-size: 13px; }
.folder-indent { color: var(--el-text-color-placeholder); margin-right: 2px; }

.status-bar {
  min-height: 34px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 0 18px 18px;
  padding: 0 16px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-top: 0;
  border-radius: 0 0 18px 18px;
  background: var(--surface-panel-soft);
  color: var(--text-tertiary);
  font-size: 11px;
  box-sizing: border-box;
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-area {
    padding: 14px 14px 8px;
  }

  .setting-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px 0;
    align-items: flex-start;
  }

  .setting-control {
    width: 100%;
    justify-content: flex-start;
  }

  .status-bar {
    border-radius: 12px;
    border-top: 1px solid rgba(60, 40, 20, 0.08);
  }
}
</style>

