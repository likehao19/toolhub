<template>
  <div class="toolbox-wrapper">
    <!-- 顶部工具栏 -->
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
      <!-- 存储设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><FolderOpened /></el-icon>
          <span>存储</span>
        </div>
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">笔记文件夹</span>
              <span class="label-desc">选择已有文件夹或输入新名称，将自动创建</span>
            </div>
            <div class="setting-control">
              <el-select
                v-model="config.noteFolder"
                filterable
                allow-create
                default-first-option
                placeholder="输入或选择文件夹"
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
                    <span class="folder-indent" v-if="opt.depth > 0">└ </span>
                    <span>{{ opt.label }}</span>
                  </span>
                </el-option>
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷键设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Keyboard /></el-icon>
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
                <!-- 录入中：实时显示按下的修饰键 -->
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
                <!-- 已设置：显示键位 -->
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

      <!-- 窗口设置 -->
      <div class="settings-section">
        <div class="section-header">
          <el-icon class="section-icon"><Monitor /></el-icon>
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
              <span class="label-desc">新建便签窗口的初始宽度（px）</span>
            </div>
            <div class="setting-control">
              <el-input-number v-model="config.defaultWidth" :min="200" :max="800" :step="10" size="small" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label-text">默认高度</span>
              <span class="label-desc">新建便签窗口的初始高度（px）</span>
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
import { Check, Promotion, Briefcase, FolderOpened, Monitor, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const Keyboard = {
  template: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor"><path d="M896 128H128c-35.3 0-64 28.7-64 64v512c0 35.3 28.7 64 64 64h768c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64z m0 576H128V192h768v512zM256 288h64v64h-64z m0 128h64v64h-64z m128-128h64v64h-64z m0 128h64v64h-64z m128-128h64v64h-64z m0 128h64v64h-64z m128-128h64v64h-64z m0 128h64v64h-64z m128-128h64v64h-64z m0 128h64v64h-64z m-384 128h384v64H384z"/></svg>`
}

const router = useRouter()

const STORAGE_KEY = 'sticky_notes_config'

const DEFAULT_CONFIG = {
  noteFolder: '便签',
  shortcut: 'Ctrl+Alt+N',
  maxWindows: 10,
  alwaysOnTop: true,
  defaultWidth: 350,
  defaultHeight: 400
}

const config = ref({ ...DEFAULT_CONFIG })

// ---- 文件夹选择 ----
const folderOptions = ref([])
const foldersLoading = ref(false)

// 资源/系统文件夹，不应出现在选择列表中
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

    // 递归扫描文件夹，构建树并展平为带缩进的列表
    const scanDir = async (dirPath, depth, prefix) => {
      const entries = await readDir(dirPath)
      const result = []

      const dirs = entries
        .filter(e => e.isDirectory && !e.name.startsWith('.') && !EXCLUDED_FOLDERS.has(e.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

      for (const entry of dirs) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
        result.push({ value: relativePath, label: entry.name, depth })

        // 递归子文件夹（限制深度防止过深）
        if (depth < 3) {
          const childPath = await join(dirPath, entry.name)
          const children = await scanDir(childPath, depth + 1, relativePath)
          result.push(...children)
        }
      }
      return result
    }

    const options = await scanDir(rootDir, 0, '')

    // 确保当前选中值在列表中
    if (config.value.noteFolder && !options.some(o => o.value === config.value.noteFolder)) {
      options.unshift({ value: config.value.noteFolder, label: config.value.noteFolder, depth: 0 })
    }

    folderOptions.value = options
  } catch {
    folderOptions.value = config.value.noteFolder
      ? [{ value: config.value.noteFolder, label: config.value.noteFolder, depth: 0 }]
      : [{ value: '便签', label: '便签', depth: 0 }]
  } finally {
    foldersLoading.value = false
  }
}

// ---- 快捷键录入 ----
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

  // Esc 取消录入
  if (e.key === 'Escape') {
    stopRecording()
    return
  }

  // 实时更新修饰键显示
  liveModifiers.value = getModifiers(e)

  // 判断是否按下了非修饰键
  if (MODIFIER_KEYS.has(e.key)) return

  const key = normalizeKey(e.key)
  if (!key) return

  const mods = getModifiers(e)
  if (mods.length === 0) return // 必须含修饰键

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

// ---- 重置 ----
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要将所有设置恢复为默认值吗？', '重置设置', {
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      type: 'warning'
    })
    config.value = { ...DEFAULT_CONFIG }
    ElMessage.info('已恢复默认设置，点击保存生效')
  } catch {
    // 用户取消
  }
}

// ---- 初始化 ----
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

// ---- 保存并立即生效 ----
const saveConfig = async () => {
  // 读取旧配置中的快捷键
  const oldCfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  const oldShortcut = (oldCfg.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')
  const newShortcut = (config.value.shortcut || 'Ctrl+Alt+N').replace('Ctrl', 'CommandOrControl')

  // 写入 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))

  // 通知 App.vue 重新注册快捷键
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
      ElMessage.warning('已达到最大便签窗口数')
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
      title: '便签',
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
      console.error('[便签] 窗口创建失败:', e)
      ElMessage.error('打开便签失败')
    })
  } catch (e) {
    console.error('[便签] 打开失败:', e)
    ElMessage.error('打开便签失败')
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
  margin-bottom: 18px;
  max-width: 760px;
  padding: 16px 18px 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 24px rgba(15,23,42,0.04);
}
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  padding-bottom: 12px;
}
.section-icon { font-size: 15px; color: #909399; }
.settings-group {
  background: rgba(255,255,255,0.82);
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  transition: background 0.15s;
}
.setting-row:not(:last-child) { border-bottom: 1px solid rgba(15, 23, 42, 0.05); }
.setting-row:hover { background: rgba(248,250,252,0.8); }
.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.label-text { font-size: 13px; color: #303133; font-weight: 500; }
.label-desc { font-size: 12px; color: #a8abb2; line-height: 1.4; }
.setting-control { flex-shrink: 0; margin-left: 24px; }
.shortcut-control { display: flex; align-items: center; gap: 6px; }
.shortcut-input {
  min-width: 140px;
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
</style>
