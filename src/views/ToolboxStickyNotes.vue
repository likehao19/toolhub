<template>
  <div class="toolbox-wrapper toolbox-sticky-notes-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Desktop Assets</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">工具箱</span>
            <span class="breadcrumb-sep">/</span>
            <span>便签管理</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" circle title="重置为默认" @click="resetConfig">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
        <el-button size="small" type="primary" circle title="保存配置" @click="saveConfig">
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button size="small" circle title="打开便签" @click="openStickyNotes">
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <div class="settings-section">
        <div class="section-header">
          <span>存储</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">笔记文件夹</span>
              <span class="label-desc">选择已有文件夹作为便签存储位置</span>
            </div>
            <div class="setting-control">
              <el-select
                v-model="config.noteFolder"
                placeholder="选择文件夹"
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
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <span>快捷键</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">新建便签</span>
              <span class="label-desc">点击右侧区域后按下组合键录入，Esc 取消</span>
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
                  <span v-else class="recording-hint">请按下组合键...</span>
                </template>
                <template v-else-if="config.shortcut">
                  <template v-for="(key, i) in config.shortcut.split('+')" :key="i">
                    <span v-if="i > 0" class="keycap-sep">+</span>
                    <kbd class="keycap">{{ key }}</kbd>
                  </template>
                </template>
                <span v-else class="shortcut-placeholder">未设置</span>
              </div>
              <span
                v-if="config.shortcut && !isRecording"
                class="shortcut-clear"
                title="清除快捷键"
                @click.stop="config.shortcut = ''"
              >&times;</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <span>窗口</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">最大窗口数</span>
              <span class="label-desc">同时打开的便签窗口上限</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.maxWindows" :min="1" :max="20" size="small" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">默认置顶</span>
              <span class="label-desc">新建便签窗口始终显示在最上层</span>
            </div>
            <div class="setting-control">
              <el-switch v-model="config.alwaysOnTop" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">默认宽度</span>
              <span class="label-desc">新建便签窗口的初始宽度(px)</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.defaultWidth" :min="200" :max="800" :step="10" size="small" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">默认高度</span>
              <span class="label-desc">新建便签窗口的初始高度(px)</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.defaultHeight" :min="200" :max="800" :step="10" size="small" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span>文件夹：{{ config.noteFolder || '未设置' }}</span>
      <span>快捷键：{{ config.shortcut || '未设置' }}</span>
      <span>窗口上限：{{ config.maxWindows }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Promotion, Briefcase, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const STORAGE_KEY = 'sticky_notes_config'

const DEFAULT_CONFIG = {
  noteFolder: '渚跨',
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
      : [{ value: '渚跨', label: '渚跨', depth: 0 }]
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
    await ElMessageBox.confirm('确定要将所有设置恢复为默认值吗？', '重置设置', {
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      type: 'warning'
    })
    config.value = { ...DEFAULT_CONFIG }
    ElMessage.info('已恢复默认设置，点击保存后生效')
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

  ElMessage.success('配置已保存')
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
      ElMessage.warning('宸茶揪鍒版渶澶т究绛剧獥鍙ｆ暟')
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
      title: '渚跨',
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
      console.error('[渚跨] 绐楀彛鍒涘缓澶辫触:', e)
      ElMessage.error('鎵撳紑渚跨澶辫触')
    })
  } catch (e) {
    console.error('[渚跨] 鎵撳紑澶辫触:', e)
    ElMessage.error('鎵撳紑渚跨澶辫触')
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
.breadcrumb-sep { color: #c0c4cc; font-weight: 400; }
.header-actions { display: flex; gap: 8px; }
.header-actions :deep(.el-button) { --el-button-border-radius: 10px; }

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 0;
  scrollbar-gutter: stable;
}
.content-area::-webkit-scrollbar { width: 6px; }
.content-area::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
.content-area::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.content-area::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }

.settings-section {
  width: 100%;
  margin-bottom: 0;
  padding: 18px 0 6px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;
}
.settings-section:first-child { padding-top: 0; }
.settings-section:not(:last-child) { border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
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
  min-height: 58px;
  padding: 12px 0;
  transition: background 0.15s;
}
.setting-row:not(:last-child) { border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
.setting-row:hover { background: rgba(255,255,255,0.34); }
.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.label-text { font-size: 13px; color: #303133; font-weight: 500; }
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
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  user-select: none;
}
.shortcut-input:hover { border-color: #c0c4cc; }
.shortcut-input.recording { border-color: #409eff; box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15); }
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
  color: #303133;
  background: linear-gradient(180deg, #f5f7fa 0%, #e8eaed 100%);
  border: 1px solid #c0c4cc;
  border-bottom-width: 2px;
  border-radius: 4px;
  line-height: 1;
  white-space: nowrap;
}
.keycap.active { color: #409eff; border-color: #a0cfff; background: linear-gradient(180deg, #ecf5ff 0%, #d9ecff 100%); }
.keycap-sep { font-size: 11px; color: #c0c4cc; margin: 0 1px; }
.shortcut-clear { font-size: 16px; color: #c0c4cc; cursor: pointer; line-height: 1; transition: color 0.2s; }
.shortcut-clear:hover { color: #f56c6c; }
.shortcut-placeholder { font-size: 12px; color: #c0c4cc; }
.recording-hint { font-size: 12px; color: #909399; animation: blink 1s ease-in-out infinite; }
.recording-dot { width: 6px; height: 6px; border-radius: 50%; background: #409eff; animation: blink 0.8s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.folder-option { display: inline-flex; align-items: center; font-size: 13px; }
.folder-indent { color: #c0c4cc; margin-right: 2px; }

.status-bar {
  height: 30px;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 18px 18px;
  padding: 0 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-top: 0;
  border-radius: 0 0 18px 18px;
  background: rgba(255,255,255,0.72);
  color: var(--text-tertiary);
  font-size: 11px;
  box-sizing: border-box;
  flex-shrink: 0;
}

@media (max-width: 860px) {
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
}
</style>

