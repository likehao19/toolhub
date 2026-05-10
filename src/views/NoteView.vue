<template>
  <div class="notes-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? t('notes.showSidebar') : t('notes.hideSidebar')" class="sidebar-toggle-btn">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="page-title-block">
          <div class="page-eyebrow">Knowledge Vault</div>
          <div class="breadcrumb">{{ t('notes.knowledgeBase') }} / {{ currentFolderName || t('notes.allNotes') }}</div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 文件名显示和编辑 -->
        <div v-if="selectedFile" class="file-name-editor">
          <template v-if="!isEditingFileName">
            <span class="file-name-display">{{ selectedFile.name }}</span>
            <el-button size="small" text @click="startEditFileName" :title="t('notes.rename')">
              <el-icon><Edit /></el-icon>
            </el-button>
          </template>
          <template v-else>
            <el-input
              ref="fileNameInputRef"
              v-model="editingFileName"
              size="small"
              @keyup.enter="confirmEditFileName"
              @keyup.esc="cancelEditFileName"
              @blur="confirmEditFileName"
              style="width: 200px;"
            />
          </template>
        </div>

        <!-- 预览模式：显示编辑和删除按钮 -->
        <template v-if="!isEditing && selectedFile">
          <el-button size="small" circle @click="startEdit" :title="t('notes.edit')">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" type="danger" circle @click="deleteCurrentNote" :title="t('notes.delete')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>

        <!-- 编辑模式：显示所有操作按钮 -->
        <template v-if="isEditing">
          <el-button size="small" circle @click="showVersionHistory" :title="t('notes.versionHistory')" v-if="currentFileType !== 'xlsx'">
            <el-icon><Clock /></el-icon>
          </el-button>
          <el-button size="small" type="success" circle @click="saveNote" :title="t('notes.save')">
            <el-icon><Check /></el-icon>
          </el-button>
          <el-button size="small" type="danger" circle @click="deleteCurrentNote" :title="t('notes.delete')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>

        <!-- 未选择文件时显示模版管理按钮 -->
        <el-button v-if="!selectedFile" size="small" type="primary" @click="openTemplateManager">
          <el-icon><Tickets /></el-icon>
          {{ t('notes.templateMgmt') }}
        </el-button>
      </div>
    </header>

    <div class="main-container" :class="{ 'sidebar-hidden': hideSidebar }">
      <!-- 左侧文件夹树 -->
      <aside class="sidebar-left" v-show="!hideSidebar" :style="{ width: sidebarWidth + 'px' }">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">{{ t('notes.folders') }}</span>
          <div class="actions">
            <span class="sidebar-btn" :title="t('notes.newRootFolder')" @click="createRootFolder">
              <i class="fa-solid fa-folder-plus"></i>
            </span>
          </div>
        </div>
        <ul class="file-tree" id="folder-root">
          <!-- 根目录新建文件夹输入框 -->
          <li v-if="creatingFolderParent === 'root'" class="root-new-folder-wrapper">
            <div class="new-folder-input-wrapper">
              <i class="fa-solid fa-folder" style="color: #f1c40f; margin-right: 8px;"></i>
              <input
                ref="newFolderInputRef"
                type="text"
                class="new-folder-input"
                :value="newFolderName"
                :placeholder="t('notes.folderPlaceholder')"
                @input="updateNewFolderName"
                @keyup.enter="confirmCreateFolder"
                @keyup.esc="cancelCreateFolder"
                @blur="confirmCreateFolder"
              />
            </div>
          </li>

          <!-- 根文件夹 - 使用递归组件 -->
          <FolderTreeItem
            v-for="folder in rootFolders"
              :key="getFolderKey(folder)"
              :folder="folder"
            :expandedFolders="expandedFolders"
            :selectedFolderKey="selectedFolderKey"
            :renamingFolderKey="renamingFolderKey"
            :renamingFolderName="renamingFolderName"
            :creatingFolderParent="creatingFolderParent"
            :newFolderName="newFolderName"
            :creatingFileParent="creatingFileParent"
            :newFileName="newFileName"
            :newFileType="newFileType"
            :selectedFile="selectedFile"
            :getFolderKey="getFolderKey"
            :getSubFolders="getSubFolders"
            :getFolderFiles="getFolderFiles"
            :getFileNameWithExt="getFileNameWithExt"
            :getFileIconColor="getFileIconColor"
            :selectFolder="selectFolder"
            :toggleFolder="toggleFolder"
            :handleFolderAction="handleFolderAction"
            :renameFolder="renameFolder"
            :deleteFolder="deleteFolder"
            :confirmRenameFolder="confirmRenameFolder"
            :cancelRenameFolder="cancelRenameFolder"
            :confirmCreateFolder="confirmCreateFolder"
            :cancelCreateFolder="cancelCreateFolder"
            :updateNewFolderName="updateNewFolderName"
            :updateRenamingFolderName="updateRenamingFolderName"
            :openFile="openFile"
            :moveFolder="moveFolder"
            :moveFile="moveFile"
          />
        </ul>
      </aside>

      <!-- 拖拽手柄 -->
      <div
        v-show="!hideSidebar"
        class="resize-handle"
        @mousedown="startResize"
        :class="{ resizing: isResizing }"
      ></div>

      <!-- 中间内容区域 -->
      <main class="content-area">
        <!-- Loading 动画 -->
        <div v-if="isLoadingFile" class="loading-overlay">
          <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
          <div class="loading-text">{{ t('notes.loading') }}</div>
        </div>

        <!-- Markdown 预览模式 - 使用 MdEditor + togglePreviewOnly -->
        <div v-if="selectedFile && currentFileType === 'md' && !isEditing" class="markdown-preview-mode">
          <MdEditor
            ref="previewEditorRef"
            v-model="noteContent"
            :toolbars="[]"
            :previewTheme="previewTheme"
            :codeTheme="previewCodeTheme"
            :mdHeadingId="customMdHeadingId"
            :mermaidConfig="{ logLevel: 'fatal' }"
            catalogLayout="flat"
            editable="false"
          />
        </div>

        <!-- Markdown 编辑模式 - 使用 MdEditor -->
        <div v-else-if="selectedFile && currentFileType === 'md' && isEditing" class="markdown-editor-mode">
          <MarkdownEditor
            ref="editorRef"
            v-model="noteContent"
            theme="light"
            :previewTheme="editorPreviewTheme"
            :codeTheme="editorCodeTheme"
            :previewOnly="false"
            :selectedFile="selectedFile"
            @save="handleSave"
            @uploadImg="onUploadImg"
          />
        </div>

        <!-- TXT 编辑器 -->
        <div v-else-if="selectedFile && currentFileType === 'txt' && isEditing" class="txt-mode">
          <TxtEditor v-model="noteContent" />
        </div>

        <!-- TXT 预览模式 -->
        <div v-else-if="selectedFile && currentFileType === 'txt' && !isEditing" class="txt-preview-mode">
          <pre class="txt-preview">{{ noteContent }}</pre>
        </div>

        <!-- Excel 预览模式 - 只读 -->
        <div v-else-if="selectedFile && currentFileType === 'xlsx' && !isEditing" class="excel-mode">
          <SpreadsheetEditor
            ref="excelPreviewRef"
            :readOnly="true"
          />
        </div>

        <!-- Excel 编辑器 -->
        <div v-else-if="selectedFile && currentFileType === 'xlsx' && isEditing" class="excel-mode">
          <SpreadsheetEditor
            ref="excelEditorRef"
            :readOnly="false"
          />
        </div>

        <!-- Word 编辑器 -->
        <div v-else-if="selectedFile && currentFileType === 'docx' && isEditing" class="word-mode">
          <WordEditor ref="wordEditorRef" v-model="wordContent" />
        </div>

        <!-- 其他文件类型预览 -->
        <div v-else-if="selectedFile && !isEditing && currentFileType !== 'xlsx'" class="preview-mode">
          <div class="preview-content">
            <el-empty>
              <template #description>
                <p>{{ currentFileType.toUpperCase() }} {{ t('notes.filePreview') }}</p>
                <el-button type="primary" @click="startEdit">{{ t('notes.startEdit') }}</el-button>
              </template>
            </el-empty>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="cursor-welcome">
            <!-- 操作区域 -->
            <div class="action-cards">
              <div class="action-card" @click="createNewNote">
                <el-icon :size="20"><DocumentAdd /></el-icon>
                <span>{{ t('notes.newNote') }}</span>
              </div>
              <div class="action-card" @click="importNote">
                <el-icon :size="20"><Upload /></el-icon>
                <span>{{ t('notes.importNote') }}</span>
              </div>
            </div>

            <!-- 最近编辑 -->
            <div class="recent-section" v-if="recentFiles.length > 0">
              <div class="recent-header">
                <h3>{{ t('notes.recentEdits') }}</h3>
              </div>
              <div class="recent-items">
                <div
                  v-for="file in recentFiles"
                  :key="file.path"
                  class="recent-row"
                  @click="openFile(file)"
                >
                  <div class="file-left">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-folder">{{ file.folder }}</span>
                  </div>
                  <span class="file-time">{{ formatTime(file.modified) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧目录已移除，使用 md-editor-v3 内置目录 -->
    </div>

    <!-- 版本历史对话框 -->
    <el-dialog
      v-model="showVersionDialog"
      :title="t('notes.versionHistory')"
      width="600px"
    >
      <div v-if="noteVersions.length === 0" class="version-empty">
        <el-empty :description="t('notes.noVersionHistory')" />
      </div>
      <div v-else class="version-list">
        <el-timeline>
          <el-timeline-item
            v-for="version in noteVersions"
            :key="version.id"
            :timestamp="formatVersionTime(version.saved_at)"
            placement="top"
          >
            <el-card>
              <div class="version-item">
                <div class="version-header">
                  <span class="version-number">{{ t('notes.versionNumber') }} {{ version.version_number }}</span>
                  <el-tag v-if="version.change_summary" size="small" type="info">
                    {{ version.change_summary }}
                  </el-tag>
                </div>
                <div class="version-actions">
                  <el-button text size="small" type="primary" @click="compareWithVersion(version)">
                    <el-icon><View /></el-icon>
                    {{ t('notes.compare') }}
                  </el-button>
                  <el-button text size="small" type="success" @click="restoreVersion(version)">
                    <el-icon><RefreshLeft /></el-icon>
                    {{ t('notes.restore') }}
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
      <template #footer>
        <el-button @click="showVersionDialog = false">{{ t('notes.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 版本对比对话框 -->
    <el-dialog
      v-model="showCompareDialog"
      :title="t('notes.versionCompare')"
      width="90%"
      top="5vh"
    >
      <div class="version-compare">
        <div class="compare-panel">
          <div class="compare-header">
            <h4>{{ t('notes.currentVersion') }}</h4>
          </div>
          <div class="compare-content">
            <pre>{{ noteContent }}</pre>
          </div>
        </div>
        <div class="compare-panel">
          <div class="compare-header">
            <h4>{{ t('notes.versionNumber') }} {{ compareVersion?.version_number }} ({{ formatVersionTime(compareVersion?.saved_at) }})</h4>
          </div>
          <div class="compare-content">
            <pre>{{ compareContent }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCompareDialog = false">{{ t('notes.close') }}</el-button>
        <el-button type="success" @click="restoreCompareVersion">{{ t('notes.restoreToVersion') }}</el-button>
      </template>
    </el-dialog>

    <!-- 模版管理对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="t('notes.templateMgmt')"
      width="800px"
    >
      <div class="template-manager">
        <el-button type="primary" @click="createTemplate" style="margin-bottom: 16px;">
          <el-icon><Plus /></el-icon>
          {{ t('notes.newTemplate') }}
        </el-button>
        <div class="template-table-container">
          <el-table :data="templates" style="width: 100%" max-height="450">
            <el-table-column prop="name" :label="t('notes.templateName')" />
            <el-table-column prop="type" :label="t('notes.templateType')">
              <template #default="scope">
                <el-tag>{{ scope.row.type.toUpperCase() }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('notes.templateOps')" width="200">
              <template #default="scope">
                <el-button text type="primary" size="small" @click="useTemplate(scope.row)">
                  {{ t('notes.use') }}
                </el-button>
                <el-button text type="warning" size="small" @click="editTemplate(scope.row)">
                  {{ t('notes.edit') }}
                </el-button>
                <el-button text type="danger" size="small" @click="deleteTemplate(scope.row)">
                  {{ t('notes.delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="showTemplateDialog = false">{{ t('notes.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 文件夹选择对话框（用于导入） - 树形结构 -->
    <el-dialog
      v-model="showFolderSelectDialog"
      :title="t('notes.selectImportFolder')"
      width="500px"
    >
      <div class="folder-tree-select">
        <el-tree
          ref="folderTreeRef"
          :data="folderTreeData"
          node-key="path"
          :props="{ label: 'name', children: 'children' }"
          :highlight-current="true"
          :expand-on-click-node="false"
          :default-expanded-keys="expandedTreeKeys"
          @node-click="handleTreeNodeClick"
        >
          <template #default="{ node, data }">
            <span class="tree-node-label">
              <el-icon><Folder /></el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>
      <template #footer>
        <el-button @click="showFolderSelectDialog = false">{{ t('notes.cancel') }}</el-button>
        <el-button type="primary" @click="confirmFolderSelect" :disabled="!selectedImportFolder">{{ t('notes.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件输入用于导入 -->
    <input
      ref="importFileInput"
      type="file"
      accept=".md,.txt,.docx,.xlsx"
      style="display: none;"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onBeforeUnmount, nextTick, watch, defineAsyncComponent} from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import { t } from '@/i18n'
import {Check, Edit, Close, Clock, Delete, ArrowLeft, ArrowRight, RefreshLeft, View, Loading, DocumentAdd, Upload, Document, Tickets, Plus, Folder} from '@element-plus/icons-vue'
import {TauriFileManager} from '@/utils/tauri'
import {join, appDataDir} from '@tauri-apps/api/path'
import {readTextFile, writeTextFile, exists, mkdir, remove, rename, readFile, writeFile, stat} from '@tauri-apps/plugin-fs'
import {convertFileSrc} from '@tauri-apps/api/core'
import {markdownToHtml} from '@/utils/markdown'
import FolderTreeItem from './NoteView/FolderTreeItem.vue'
import { MarkdownEditor, TxtEditor, WordEditor } from './NoteView/editors'
import * as versionAPI from '@/utils/noteVersion'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'  // 使用完整样式
import { loadConfig } from '@/utils/tauri/store'

// 大依赖：按需异步加载（只在打开 xlsx 时才会下载/初始化）
const SpreadsheetEditor = defineAsyncComponent(() => import('./NoteView/editors/SpreadsheetEditor.vue'))

// Markdown 编辑器配置
const noteContent = ref('')

// 主题设置
const previewTheme = ref('mk-cute')
const previewCodeTheme = ref('github')
const editorPreviewTheme = ref('mk-cute')
const editorCodeTheme = ref('github')

// 自定义标题 ID 生成器，避免重复 key（使用时间戳确保唯一性）
const customMdHeadingId = (text, level, index) => {
  // 确保 text 是字符串
  const textStr = typeof text === 'string' ? text : String(text || '')
  // 生成唯一ID：使用时间戳和随机数
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const safeText = textStr.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').substring(0, 20)
  return `heading-${level}-${index}-${timestamp}-${random}-${safeText}`
}

// 将 Markdown 内容中的相对图片路径转换为 asset URL
const convertImagePathsToAssetUrls = (content, filePath) => {
  return content.replace(
    /!\[([^\]]*)\]\((\.\/images\/[^)]+)\)/g,
    (match, alt, relativePath) => {
      try {
        const separator = filePath.includes('\\') ? '\\' : '/'

        // 找到 notes 根目录
        const notesIndex = filePath.indexOf(`${separator}notes${separator}`)
        if (notesIndex === -1) {

          return match
        }

        const notesRoot = filePath.substring(0, notesIndex + 6)
        const imagePath = relativePath.substring(2).replace(/\//g, separator)
        const absolutePath = `${notesRoot}${separator}${imagePath}`
        const assetUrl = convertFileSrc(absolutePath)

        return `![${alt}](${assetUrl})`
      } catch (error) {

        return match
      }
    }
  )
}

const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', 'codeRow', 'code', '-',
  'link', 'image', 'table', 'mermaid', 'katex', '-',
  'revoke', 'next', 'prettier', '=',
  'fullscreen', 'preview', 'previewOnly', 'catalog',
]

function handleSave(v, html) {
  saveNote()
}

const onUploadImg = async (files, callback) => {
  try {
    const urls = []

    // 确保 images 文件夹存在
    const notesDir = await getConfiguredNotesDir()
    const imagesDir = await join(notesDir, 'images')

    // 创建 images 文件夹（如果不存在）
    if (!(await exists(imagesDir))) {
      await mkdir(imagesDir, { recursive: true })
    }

    // 保存每个图片文件
    for (const file of files) {
      try {
        // 生成唯一文件名
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = file.name.split('.').pop()
        const fileName = `img_${timestamp}_${randomStr}.${ext}`
        const filePath = await join(imagesDir, fileName)

        // 读取文件内容
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // 保存文件
        const { writeFile } = await import('@tauri-apps/plugin-fs')
        await writeFile(filePath, uint8Array)

        // 返回相对路径
        urls.push(`./images/${fileName}`)
      } catch (error) {

        ElMessage.error(t('notes.saveImageFailed', { name: file.name }))
      }
    }

    callback(urls)
  } catch (error) {

    ElMessage.error(t('notes.uploadImageFailed'))
  }
}

// Markdown 预览
// markdownPreview 已移除，使用 md-editor-v3 内置预览

// CSS 变量
const cssVars = {
  '--bg-body': '#f7f9fb',
  '--bg-sidebar': '#fcfcfc',
  '--bg-content': '#ffffff',
  '--border-color': '#e1e4e8',
  '--text-primary': '#2c3e50',
  '--text-secondary': '#606f7b',
  '--accent-color': '#3498db',
  '--hover-bg': '#edf2f7',
  '--danger-color': '#e74c3c',
  '--success-color': '#2ecc71',
  '--icon-folder': '#f1c40f',
  '--icon-md': '#3498db',
  '--icon-word': '#2980b9',
  '--icon-excel': '#27ae60',
  '--icon-txt': '#95a5a6'
}

// 绑定滚动事件的辅助函数
// 应用 CSS 变量
// 侧边栏宽度调整
const startResize = (e) => {
  isResizing.value = true
  resizeStartX.value = e.clientX
  resizeStartWidth.value = sidebarWidth.value
  e.preventDefault()
}

const doResize = (e) => {
  if (!isResizing.value) return

  // 计算鼠标移动的距离
  const delta = e.clientX - resizeStartX.value
  const newWidth = resizeStartWidth.value + delta

  // 限制最小和最大宽度
  if (newWidth >= 260 && newWidth <= 600) {
    sidebarWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
}

onMounted(async () => {
  const root = document.documentElement
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  // 添加鼠标事件监听器用于调整侧边栏宽度
  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)

  // 加载主题设置
  await loadThemeSettings()

  await loadNotesTree()
  await loadRecentFiles()

  // 来自工作台等位置的深链:?path=<abs> 直接打开,?note=<name> 走兼容查找
  await openFromRouteQuery()

  // 监听页面关闭事件，自动保存
  window.addEventListener('beforeunload', handleBeforeUnload)

  // 监听笔记路径更改事件
  window.addEventListener('notes-path-changed', handleNotesPathChanged)

  // 监听文件拖拽事件
  setupFileDrop()
})

// 处理笔记路径更改事件
const handleNotesPathChanged = async (event) => {

  // 重置笔记目录缓存
  const { resetNotesDir } = await import('@/utils/notes')
  resetNotesDir()

  // 关闭当前文件
  selectedFile.value = null
  isEditing.value = false

  // 重新加载笔记树
  await loadNotesTree()

  ElMessage.success(t('notes.notesPathUpdated'))
}

// 加载主题设置的函数
const loadThemeSettings = async () => {
  try {
    const config = await loadConfig()
    if (config) {
      // 直接赋值，使用默认值作为后备
      previewTheme.value = config.previewTheme || 'mk-cute'
      previewCodeTheme.value = config.previewCodeTheme || 'github'
      editorPreviewTheme.value = config.editorPreviewTheme || 'mk-cute'
      editorCodeTheme.value = config.editorCodeTheme || 'github'
    }
  } catch (e) { /* ignore */ }
}

// 监听窗口焦点事件，重新加载主题设置
window.addEventListener('focus', loadThemeSettings)

// 组件卸载前自动保存
onBeforeUnmount(async () => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('focus', loadThemeSettings)
  window.removeEventListener('notes-path-changed', handleNotesPathChanged)
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)

  // 清理 Tauri 拖拽监听器(每次 setupFileDrop 注册 3 个,反复进入这个视图会累积导致一次拖拽触发多套逻辑)
  while (fileDropUnlisteners.length) {
    try { fileDropUnlisteners.pop()?.() } catch {}
  }

  if (selectedFile.value && isEditing.value) {
    await autoSaveCurrentFile()
  }
})

// 路由切换前自动保存
onBeforeRouteLeave(async (to, from, next) => {
  if (selectedFile.value && isEditing.value) {
    await autoSaveCurrentFile()
  }
  next()
})

// 页面关闭前自动保存
const handleBeforeUnload = async (e) => {
  if (selectedFile.value && isEditing.value) {
    await autoSaveCurrentFile()
  }
}

// 状态管理
const notesTree = ref({folders: [], files: []})
const expandedFolders = ref(new Set())
const selectedFolderKey = ref(null)
const currentFolderName = ref('')
const isEditing = ref(false) // 是否处于编辑模式
const hideSidebar = ref(false) // 是否隐藏侧边栏
const sidebarWidth = ref(260) // 侧边栏宽度
const isResizing = ref(false) // 是否正在调整宽度
const resizeStartX = ref(0) // 拖拽开始时的鼠标位置
const resizeStartWidth = ref(0) // 拖拽开始时的侧边栏宽度
const selectedFile = ref(null)
const fileInputRef = ref(null)
const currentFileType = ref('md')
const folderFilesCache = ref(new Map())

// 文件名编辑状态
const isEditingFileName = ref(false)
const editingFileName = ref('')
const fileNameInputRef = ref(null)
const newFolderInputRef = ref(null)
const editorRef = ref(null) // 编辑器引用（编辑模式）
const previewEditorRef = ref(null) // 预览模式编辑器引用
const wordEditorRef = ref(null) // Word编辑器引用
const excelEditorRef = ref(null) // Excel编辑器引用
const excelPreviewRef = ref(null) // Excel预览引用
const isLoadingFile = ref(false) // 文件加载状态

// Excel 和 Word 相关状态
const excelFileBytes = ref(null) // 当前打开的 xlsx 原始字节（用于预览/编辑切换）
const wordContent = ref('<p></p>')

let lastXlsxLoad = { mode: null, path: null, bytes: null }
let lastXlsxLoadError = { mode: null, path: null, bytes: null }
const tryLoadXlsxIntoActiveEditor = async () => {
  if (currentFileType.value !== 'xlsx') return
  if (!selectedFile.value?.path || !excelFileBytes.value) return

  const targetRef = isEditing.value ? excelEditorRef.value : excelPreviewRef.value
  if (!targetRef || typeof targetRef.loadXlsx !== 'function') return

  const mode = isEditing.value ? 'edit' : 'preview'
  if (
    lastXlsxLoad.mode === mode &&
    lastXlsxLoad.path === selectedFile.value.path &&
    lastXlsxLoad.bytes === excelFileBytes.value
  ) {
    return
  }

  await nextTick()

  const fileName = `${selectedFile.value.name}.${selectedFile.value.extension || 'xlsx'}`
  try {
    await targetRef.loadXlsx(excelFileBytes.value, fileName)
  } catch (error) {
    // 避免 watch 里未捕获 promise；仅对同一文件/模式提示一次
    if (
      lastXlsxLoadError.mode !== mode ||
      lastXlsxLoadError.path !== selectedFile.value.path ||
      lastXlsxLoadError.bytes !== excelFileBytes.value
    ) {
      ElMessage.error(t('notes.loadExcelFailed'))
      lastXlsxLoadError = { mode, path: selectedFile.value.path, bytes: excelFileBytes.value }
    }
    return
  }

  if (isEditing.value) {
    window.excelEditorRef = targetRef
  }

  lastXlsxLoad = { mode, path: selectedFile.value.path, bytes: excelFileBytes.value }
}

// 关键：异步组件加载时，ref 从 null -> instance 不会触发原先那组 watch
// 所以把 excelEditorRef / excelPreviewRef 也纳入触发条件，确保“实例出现后自动补一次 load”
watch(
  [isEditing, currentFileType, selectedFile, excelFileBytes, excelEditorRef, excelPreviewRef],
  () => {
    void tryLoadXlsxIntoActiveEditor()
  },
  { deep: false, flush: 'post' }
)

// 版本管理
const showVersionDialog = ref(false)
const noteVersions = ref([])
const showCompareDialog = ref(false)
const compareVersion = ref(null)
const compareContent = ref('')

// 模版管理
const showTemplateDialog = ref(false)
const templates = ref([])
const importFileInput = ref(null)
const importTargetFolder = ref(null)  // 保存导入的目标文件夹

// 文件夹选择对话框
const showFolderSelectDialog = ref(false)
const folderTreeData = ref([])
const selectedImportFolder = ref(null)
const folderTreeRef = ref(null)
const expandedTreeKeys = ref([])
const pendingDropFiles = ref([]) // 待导入的拖拽文件

// 最近编辑的文件
const recentFiles = ref([])

// 新建文件夹状态
const creatingFolderParent = ref(null)
const newFolderName = ref('')

// 更新新建文件夹名称
const updateNewFolderName = (e) => {
  newFolderName.value = e.target.value
}

// 新建文件状态
const creatingFileParent = ref(null)
const newFileName = ref('')
const newFileType = ref('md') // md, txt, docx, xlsx

// 更新新建文件名称
// 重命名文件夹状态
const renamingFolderKey = ref(null)
const renamingFolderName = ref('')

// 更新重命名文件夹名称
const updateRenamingFolderName = (e) => {
  renamingFolderName.value = e.target.value
}

// 监听创建状态变化，自动聚焦输入框
watch(creatingFolderParent, async (newVal) => {
  if (newVal) {
    await nextTick()
    const inputs = document.querySelectorAll('.new-folder-input')
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus()
    }
  }
})

// 监听重命名状态变化，自动聚焦输入框
watch(renamingFolderKey, async (newVal) => {
  if (newVal) {
    await nextTick()
    const input = document.querySelector('.rename-input')
    if (input) {
      input.focus()
      input.select()
    }
  }
})

// 获取文件夹中的文件
const getFolderFiles = (folder) => {
  const folderKey = getFolderKey(folder)
  return folderFilesCache.value.get(folderKey) || []
}

// 计算属性
const rootFolders = computed(() => {
  if (!notesTree.value || !notesTree.value.folders) return []
  return notesTree.value.folders.filter(f => !f.parent)
})

const currentFiles = computed(() => {
  if (!selectedFolderKey.value) return []
  return folderFilesCache.value.get(selectedFolderKey.value) || []
})

// 获取文件夹的唯一键
const getFolderKey = (folder) => {
  if (!folder) return ''
  if (folder.path) return folder.path.replace(/\\/g, '/')
  return folder.name || ''
}

// 获取子文件夹
const getSubFolders = (folder) => {
  if (!notesTree.value || !notesTree.value.folders) return []
  const folderKey = getFolderKey(folder)
  return notesTree.value.folders.filter(f => f.parent === folderKey)
}

const getConfiguredNotesDir = async () => {
  const { getNotesDir } = await import('@/utils/notes')
  return await getNotesDir()
}

const route = useRoute()

// 工作台等地方深链跳转过来:?path=<abs> 直接打开;?note=<name> 兜底按文件名找。
// 必须在 loadNotesTree() 之后调用,因为 expandToFile 依赖文件夹树已建好。
const openFromRouteQuery = async () => {
  const path = route.query.path
  const note = route.query.note
  if (!path && !note) return

  try {
    let targetFile = null

    if (path) {
      const sep = path.includes('\\') ? '\\' : '/'
      const baseName = path.split(sep).pop() || ''
      const dot = baseName.lastIndexOf('.')
      const noteName = dot > 0 ? baseName.slice(0, dot) : baseName
      const ext = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : 'md'
      const folder = path.substring(0, path.lastIndexOf(sep))
      const folderName = folder.split(sep).pop() || ''
      targetFile = {
        name: noteName,
        path,
        extension: ext,
        type: 'file',
        folder: folderName,
      }
    } else if (note) {
      // 在所有已加载文件夹缓存里按名找;找不到再递归遍历 rootFolders
      const flatten = []
      for (const f of notesTree.value.folders) {
        const files = folderFilesCache.value.get(getFolderKey(f)) || []
        flatten.push(...files)
      }
      targetFile = flatten.find(f => f.name === note || `${f.name}.${f.extension}` === note)
      if (!targetFile) {
        for (const f of rootFolders.value) {
          await loadFolderFiles(f)
          const files = folderFilesCache.value.get(getFolderKey(f)) || []
          targetFile = files.find(file => file.name === note)
          if (targetFile) break
        }
      }
    }

    if (targetFile?.path) {
      await openFile(targetFile, false)
    }
  } catch { /* ignore */ }
}

const getNoteVersionKey = async (file = selectedFile.value) => {
  if (!file?.path) return file?.name || ''
  const notesDir = (await getConfiguredNotesDir()).replace(/\\/g, '/')
  const filePath = file.path.replace(/\\/g, '/')
  const prefix = notesDir.endsWith('/') ? notesDir : `${notesDir}/`
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : getFileNameWithExt(file)
}

// 加载笔记树
const loadNotesTree = async () => {
  try {
    // 使用 getNotesDir() 获取配置的笔记路径
    const notesDir = await getConfiguredNotesDir()

    if (!(await exists(notesDir))) {
      await mkdir(notesDir, {recursive: true})
    }

    const result = await TauriFileManager.readDirectoryContent(notesDir, null, false)

    const folders = []
    if (result.directories && Array.isArray(result.directories)) {
      for (const dir of result.directories) {
        // 过滤掉 images 文件夹（系统文件夹）
        // 过滤掉 images / ebooks 等系统目录(ebooks 由 ebookManager 写到 notes/ebooks 下,不属于文档中心)
        if (dir.name === 'images' || dir.name === 'ebooks' || dir.name.startsWith('_')) {
          continue
        }
        folders.push({
          name: dir.name,
          path: dir.path || await join(notesDir, dir.name),
          type: 'folder',
          parent: null
        })
      }
    }

    notesTree.value = {folders, files: []}

    // 不再默认打开第一个文件夹
    // 用户需要手动点击文件夹查看内容
  } catch (error) {

    ElMessage.error(t('notes.loadTreeFailed'))
  }
}

// 加载文件夹内的文件
const loadFolderFiles = async (folder) => {
  try {
    const result = await TauriFileManager.readDirectoryContent(folder.path, null, false)

    const files = []
    const subFolders = []
    const supportedExtensions = ['.md', '.txt', '.docx', '.xlsx']

    if (result.directories && Array.isArray(result.directories)) {
      const parentKey = getFolderKey(folder)
      for (const dir of result.directories) {
        // 过滤掉 images 文件夹（系统文件夹）
        // 过滤掉 images / ebooks 等系统目录(ebooks 由 ebookManager 写到 notes/ebooks 下,不属于文档中心)
        if (dir.name === 'images' || dir.name === 'ebooks' || dir.name.startsWith('_')) {
          continue
        }
        const subFolderPath = dir.path || await join(folder.path, dir.name)
        subFolders.push({
          name: dir.name,
          path: subFolderPath,
          type: 'folder',
          parent: parentKey
        })
      }
    }

    if (result.files && Array.isArray(result.files)) {
      for (const fileEntry of result.files) {
        const fileName = fileEntry.name
        const ext = supportedExtensions.find(e => fileName.endsWith(e))
        if (ext) {
          const noteName = fileName.replace(ext, '')
          const path = fileEntry.path || await join(folder.path, fileName)
          let title = noteName

          if (ext === '.md' || ext === '.txt') {
            try {
              const content = await readTextFile(path)
              const lines = content.split('\n')
              for (const line of lines) {
                if (line.trim().startsWith('# ')) {
                  title = line.trim().substring(2)
                  break
                } else if (line.trim()) {
                  title = line.trim()
                  break
                }
              }
            } catch (error) {
              // 忽略读取错误
            }
          }

          // 获取文件的真实修改时间
          let modifiedTime = Date.now()
          try {
            const fileStats = await stat(path)

            if (fileStats.mtime) {
              // Tauri 2.0 的时间格式可能是不同的结构
              if (typeof fileStats.mtime === 'number') {
                modifiedTime = fileStats.mtime
              } else if (fileStats.mtime.secs !== undefined) {
                modifiedTime = fileStats.mtime.secs * 1000
              } else if (fileStats.mtime.seconds !== undefined) {
                modifiedTime = fileStats.mtime.seconds * 1000
              } else {
                // 尝试直接转换
                modifiedTime = new Date(fileStats.mtime).getTime()
              }

              // 如果还是 NaN，使用当前时间
              if (isNaN(modifiedTime)) {

                modifiedTime = Date.now()
              }
            }
          } catch (e) { /* ignore */ }

          files.push({
            name: noteName,
            title,
            path,
            type: 'file',
            extension: ext.replace('.', ''),
            modified: modifiedTime,
            size: fileEntry.size || 0,
            folder: folder.name
          })
        }
      }
    }

    files.sort((a, b) => {
      const timeDiff = new Date(b.modified) - new Date(a.modified)
      if (Math.abs(timeDiff) > 1000) return timeDiff
      return (a.name || a.title).localeCompare(b.name || b.title, 'zh-CN', {numeric: true})
    })

    const folderKey = getFolderKey(folder)
    folderFilesCache.value.set(folderKey, files)

    if (subFolders.length > 0) {
      for (const subFolder of subFolders) {
        const exists = notesTree.value.folders.some(f => f.path === subFolder.path)
        if (!exists) {
          notesTree.value.folders.push(subFolder)
        }
      }
    }
  } catch (error) {

    const folderKey = getFolderKey(folder)
    folderFilesCache.value.set(folderKey, [])
  }
}

// 文件夹操作
const toggleFolder = async (folder) => {
  const folderKey = getFolderKey(folder)
  if (expandedFolders.value.has(folderKey)) {
    expandedFolders.value.delete(folderKey)
  } else {
    expandedFolders.value.add(folderKey)
    await loadFolderFiles(folder)
  }
}

const selectFolder = async (folder) => {
    const folderKey = getFolderKey(folder)
  selectedFolderKey.value = folderKey
  currentFolderName.value = folder.name
  selectedFile.value = null
  isEditing.value = false

  if (!folderFilesCache.value.has(folderKey)) {
    await loadFolderFiles(folder)
  }
}

const handleLoadSubFolders = async (folder) => {
  await loadFolderFiles(folder)
}

// 新建文件夹相关
const createRootFolder = () => {
  creatingFolderParent.value = 'root'
  newFolderName.value = ''
  // 自动聚焦到输入框
  nextTick(() => {
    newFolderInputRef.value?.focus()
  })
}

const startCreateFolder = (folder) => {
  const folderKey = getFolderKey(folder)
  creatingFolderParent.value = folderKey
  newFolderName.value = ''

  if (!expandedFolders.value.has(folderKey)) {
    expandedFolders.value.add(folderKey)
  }
}

const confirmCreateFolder = async () => {
  if (!newFolderName.value || !newFolderName.value.trim()) {
    cancelCreateFolder()
    return
  }

  try {
    const notesDir = await getConfiguredNotesDir()

    let parentPath = notesDir
    let parentKey = null
    let parentFolder = null

    if (creatingFolderParent.value && creatingFolderParent.value !== 'root') {
      parentFolder = notesTree.value.folders.find(f => getFolderKey(f) === creatingFolderParent.value)
      if (parentFolder) {
        parentPath = parentFolder.path
        parentKey = creatingFolderParent.value
      }
    }

    const newFolderPath = await join(parentPath, newFolderName.value.trim())

    // 检查文件夹是否已存在
    if (await exists(newFolderPath)) {
      ElMessage.warning(t('notes.folderExists'))
      // 不要取消创建状态，让用户可以重新输入
      return
    }

    await mkdir(newFolderPath, {recursive: true})

    // 如果是在子文件夹中创建，刷新父文件夹以自动加载新创建的子文件夹
    if (parentFolder) {
      if (!expandedFolders.value.has(parentKey)) {
        expandedFolders.value.add(parentKey)
      }
      // 刷新父文件夹的文件列表，这会自动加载新的子文件夹
      await loadFolderFiles(parentFolder)
    } else {
      // 如果是根文件夹，手动添加
      const newFolder = {
        name: newFolderName.value.trim(),
        path: newFolderPath,
        type: 'folder',
        parent: null
      }

      const exists = notesTree.value.folders.some(f => f.path === newFolderPath)
      if (!exists) {
        notesTree.value.folders.push(newFolder)
      }

      const newKey = getFolderKey(newFolder)
      folderFilesCache.value.set(newKey, [])
    }

    ElMessage.success(t('notes.folderCreateSuccess'))

    // 清除创建状态
    cancelCreateFolder()
  } catch (error) {

    ElMessage.error(t('notes.folderCreateFailed'))
    // 失败时也清除创建状态
    cancelCreateFolder()
  }
}

const cancelCreateFolder = () => {
  newFolderName.value = '' // 改为空字符串
  creatingFolderParent.value = null
}

// 处理文件夹下拉菜单操作
const handleFolderAction = async (command, folder) => {
  if (command === 'newFolder') {
    startCreateFolder(folder)
  } else if (command.startsWith('new')) {
    // 新建文件：不弹窗，直接在树上创建输入框
    const extensionMap = {
      'newMd': 'md',
      'newTxt': 'txt',
      'newWord': 'docx',
      'newExcel': 'xlsx'
    }
    const ext = extensionMap[command]
    if (ext) {
      startCreateFile(folder, ext)
    }
  }
}

// 开始创建文件 - 直接创建并打开
const startCreateFile = async (folder, fileType) => {
  // 自动生成不重复的文件名
  let baseName = ''
  if (fileType === 'md') {
    baseName = t('notes.untitledNote')
  } else if (fileType === 'txt') {
    baseName = t('notes.untitledText')
  } else if (fileType === 'docx') {
    baseName = t('notes.untitledDoc')
  } else if (fileType === 'xlsx') {
    baseName = t('notes.untitledSheet')
  } else {
    baseName = t('notes.untitledDoc')
  }

  // 检查文件是否存在，如果存在则添加数字后缀
  const folderFiles = getFolderFiles(folder)
  let counter = 1
  let fileName = baseName

  while (folderFiles.some(f => f.name === fileName)) {
    counter++
    fileName = `${baseName}${counter}`
  }

  try {
    const fullFileName = fileName + '.' + fileType
    const filePath = await join(folder.path, fullFileName)

    // 根据文件类型创建文件
    if (fileType === 'md') {
      await writeTextFile(filePath, '')
      ElMessage.success(t('notes.mdCreateSuccess'))
    } else if (fileType === 'txt') {
      await writeTextFile(filePath, '')
      ElMessage.success(t('notes.txtCreateSuccess'))
    } else if (fileType === 'xlsx') {
      await createExcelFile(filePath, fileName)
      ElMessage.success(t('notes.xlsxCreateSuccess'))
    } else if (fileType === 'docx') {
      await createWordFile(filePath, fileName)
      ElMessage.success(t('notes.docxCreateSuccess'))
    } else {
      ElMessage.warning(t('notes.unsupportedType'))
      return
    }

    // 确保文件夹展开
    const folderKey = getFolderKey(folder)
    if (!expandedFolders.value.has(folderKey)) {
      expandedFolders.value.add(folderKey)
    }

    // 刷新文件列表
    await loadFolderFiles(folder)

    // 更新最近文件列表
    await loadRecentFiles()

    // 打开新建的文件（直接进入编辑模式）
    const files = folderFilesCache.value.get(folderKey) || []
    const newFile = files.find(f => f.path === filePath)
    if (newFile) {
      await openFile(newFile, true)  // 传入 true 表示进入编辑模式
    }
  } catch (error) {

    ElMessage.error(t('notes.createFileFailed') + error.message)
  }
}

// 获取文件名（带扩展名）
const getFileNameWithExt = (file) => {
  // 总是使用 file.name（不带扩展名），然后加上扩展名
  if (file.extension) {
    return `${file.name}.${file.extension}`
  }
  // 否则返回原始名称
  return file.name || t('notes.untitled')
}

const renameFolder = (folder) => {
  const folderKey = getFolderKey(folder)
  renamingFolderKey.value = folderKey
  renamingFolderName.value = folder.name
}

const confirmRenameFolder = async (folder) => {
  if (!renamingFolderName.value || !renamingFolderName.value.trim()) {
    cancelRenameFolder()
    return
  }

  if (renamingFolderName.value.trim() === folder.name) {
    cancelRenameFolder()
    return
  }

  try {
    const oldPath = folder.path
    const oldFolderKey = getFolderKey(folder)

    // 确定使用的路径分隔符
    const separator = oldPath.includes('\\') ? '\\' : '/'
    const pathParts = oldPath.split(/[/\\]/)
    pathParts[pathParts.length - 1] = renamingFolderName.value.trim()
    const newPath = pathParts.join(separator)

    // 目标文件夹已存在（Windows 会报 “目录不是空的”）
    if (await exists(newPath)) {
      ElMessage.error(t('notes.targetFolderExists'))
      // 保留重命名状态，让用户可以继续修改名称
      await nextTick()
      const input = document.querySelector('.rename-input')
      if (input) {
        input.focus()
        input.select?.()
      }
      return
    }

    // 执行重命名
    await rename(oldPath, newPath)

    // 同步迁移该文件夹下所有版本 key
    try {
      const notesRoot = (await getConfiguredNotesDir()).replace(/\\/g, '/')
      const oldPrefix = oldPath.replace(/\\/g, '/').replace(`${notesRoot}/`, '')
      const newPrefix = newPath.replace(/\\/g, '/').replace(`${notesRoot}/`, '')
      await versionAPI.renameNoteVersionPrefix(oldPrefix, newPrefix)
    } catch { /* ignore */ }

    // 更新文件夹对象
    folder.name = renamingFolderName.value.trim()
    folder.path = newPath

    // 更新缓存中的文件夹键
    const newFolderKey = getFolderKey(folder)

    // 更新文件缓存
    if (folderFilesCache.value.has(oldFolderKey)) {
      const files = folderFilesCache.value.get(oldFolderKey)
      folderFilesCache.value.delete(oldFolderKey)
      folderFilesCache.value.set(newFolderKey, files)
    }

    // 更新展开状态
    if (expandedFolders.value.has(oldFolderKey)) {
      expandedFolders.value.delete(oldFolderKey)
      expandedFolders.value.add(newFolderKey)
    }

    // 更新选中状态
    if (selectedFolderKey.value === oldFolderKey) {
      currentFolderName.value = renamingFolderName.value.trim()
      selectedFolderKey.value = newFolderKey
    }

    // 更新所有子文件夹的路径
    notesTree.value.folders.forEach(f => {
      if (f.path.startsWith(oldPath + separator)) {
        f.path = f.path.replace(oldPath, newPath)
      }
      if (f.parent && f.parent === oldFolderKey) {
        f.parent = newFolderKey
      }
    })

    ElMessage.success(t('notes.renameSuccess'))
    cancelRenameFolder()
  } catch (error) {

    ElMessage.error(t('notes.renameFailed'))
    // 出错时不自动 cancel，保留输入框便于用户继续修改
  }
}

const cancelRenameFolder = () => {
  renamingFolderKey.value = null
  renamingFolderName.value = ''
}

const deleteFolder = async (folder) => {
  try {
    await ElMessageBox.confirm(t('notes.confirmDeleteFolder'), t('notes.confirmDelete'), {
          confirmButtonText: t('notes.confirm'),
          cancelButtonText: t('notes.cancel'),
          type: 'warning'
    })

    await remove(folder.path, {recursive: true})

    // 文件夹连同里面的笔记一起没了,清理这些笔记的版本历史(按相对路径前缀匹配)
    try {
      const notesRoot = (await getConfiguredNotesDir()).replace(/\\/g, '/')
      const prefix = folder.path.replace(/\\/g, '/').replace(`${notesRoot}/`, '')
      const db = await (await import('@tauri-apps/plugin-sql')).default.load('sqlite:productivity.db')
      await db.execute(
        `DELETE FROM note_versions WHERE note_name LIKE ? || '%'`,
        [prefix + '/']
      )
    } catch { /* ignore */ }

    notesTree.value.folders = notesTree.value.folders.filter(f => f.path !== folder.path)

    const folderKey = getFolderKey(folder)
    folderFilesCache.value.delete(folderKey)
    expandedFolders.value.delete(folderKey)

    if (selectedFolderKey.value === folderKey) {
      if (rootFolders.value.length > 0) {
        await selectFolder(rootFolders.value[0])
      } else {
        selectedFolderKey.value = null
        currentFolderName.value = ''
      }
    }

    ElMessage.success(t('notes.folderDeleted'))
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error(t('notes.deleteFailed'))
    }
  }
}

// 展开左侧树并定位到文件
const expandToFile = async (file) => {
  if (!file || !file.path) return

  try {
    const separator = file.path.includes('\\') ? '\\' : '/'
    const pathParts = file.path.split(separator)

    // 找到 notes 根目录的位置
    const notesIndex = pathParts.indexOf('notes')
    if (notesIndex === -1) return

    // 获取从 notes 到文件的所有文件夹路径
    const folderPaths = []
    for (let i = notesIndex; i < pathParts.length - 1; i++) {
      const folderPath = pathParts.slice(0, i + 2).join(separator)
      folderPaths.push(folderPath)
    }

    // 递归展开所有父文件夹
    for (const folderPath of folderPaths) {
      // 找到对应的文件夹对象
      const folder = notesTree.value.folders.find(f => f.path === folderPath)
      if (folder) {
        const folderKey = getFolderKey(folder)

        // 展开文件夹
        if (!expandedFolders.value.has(folderKey)) {
          expandedFolders.value.add(folderKey)
        }

        // 加载文件夹内容
        await loadFolderFiles(folder)
      }
    }

    // 滚动到文件位置（可选）
    await nextTick()
    // 可以在这里添加滚动到文件的逻辑
  } catch (e) { /* ignore */ }
}

// 文件操作
const openFile = async (file, shouldEdit = false) => {
  isLoadingFile.value = true
  try {
    // 如果当前文件在编辑，先自动保存
    if (selectedFile.value && isEditing.value) {
      await autoSaveCurrentFile()
    }

    // 清除文件夹选中状态
    selectedFolderKey.value = null

    // 展开左侧树并定位到文件
    await expandToFile(file)

    // 根据文件路径更新面包屑（显示文件所在的文件夹）
    if (file.path) {
      const separator = file.path.includes('\\') ? '\\' : '/'
      const pathParts = file.path.split(separator)
      // 找到文件所在的文件夹名称（倒数第二个部分）
      if (pathParts.length >= 2) {
        const folderName = pathParts[pathParts.length - 2]
        // 如果不是 notes 根目录，则显示文件夹名称
        if (folderName !== 'notes' && !folderName.startsWith('_')) {
          currentFolderName.value = folderName
        }
      }
    }

    // 加载新文件
    selectedFile.value = file
    const ext = file.extension || 'md'
    currentFileType.value = ext.toLowerCase()

    if (ext === 'md' || ext === 'txt') {
      let content = await readTextFile(file.path)

      // 如果是 MD 文件，转换图片路径为 asset URL（用于显示）
      if (ext === 'md') {
        content = convertImagePathsToAssetUrls(content, file.path)
      }

      noteContent.value = content
    } else if (ext === 'xlsx') {
      await loadExcelFile(file)
    } else if (ext === 'docx') {
      await loadWordFile(file)
    } else {
      ElMessage.warning(t('notes.unsupportedEditType'))
      isLoadingFile.value = false
      return
    }

    // 根据参数决定是进入编辑模式还是预览模式
    if (shouldEdit) {
      // 新建文件：直接进入编辑模式
      isEditing.value = true
      hideSidebar.value = true

      // Markdown 编辑模式：设置目录和关闭预览
      if (ext === 'md') {
        await nextTick()
        setTimeout(() => {
          if (editorRef.value) {
            editorRef.value.toggleCatalog(true)
            editorRef.value.togglePreview(false)
          }
          isLoadingFile.value = false
        }, 100)
      } else {
        isLoadingFile.value = false
      }
    } else {
      // 正常打开文件：进入预览模式，不折叠侧边栏
      isEditing.value = false

      // Markdown 预览模式：设置为仅预览并显示目录
      if (ext === 'md') {
        await nextTick()
        setTimeout(() => {
          if (previewEditorRef.value) {
            previewEditorRef.value.togglePreviewOnly(true)
            previewEditorRef.value.toggleCatalog(true)
          }
          // 延长等待时间，确保 Markdown 渲染完成
          setTimeout(() => {
            isLoadingFile.value = false
          }, 300)
        }, 100)
      } else {
        isLoadingFile.value = false
      }
    }
  } catch (error) {

    ElMessage.error(t('notes.openFileFailed'))
    isLoadingFile.value = false
  }
}

// 加载 Excel 文件
const loadExcelFile = async (file) => {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const fileData = await readFile(file.path)

    // 保存字节，后续在预览/编辑切换时复用
    excelFileBytes.value = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData)
  } catch (error) {

    ElMessage.error(t('notes.loadExcelFileFailed') + ': ' + error.message)
    excelFileBytes.value = null
  }
}

// 加载 Word 文件
const loadWordFile = async (file) => {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const fileData = await readFile(file.path)

    if (!fileData || fileData.length === 0) {
      wordContent.value = '<p></p>'
      return
    }

    let arrayBuffer
    if (fileData instanceof Uint8Array) {
      arrayBuffer = fileData.buffer
    } else if (fileData instanceof ArrayBuffer) {
      arrayBuffer = fileData
    } else {
      arrayBuffer = new Uint8Array(fileData).buffer
    }

    const result = await mammoth.convertToHtml({ arrayBuffer })
    wordContent.value = result.value || '<p></p>'
  } catch (error) {

    ElMessage.error(t('notes.loadWordFailed'))
    wordContent.value = `<p>${t('notes.cannotLoadWord')}</p>`
  }
}

const startEdit = async () => {
  isEditing.value = true
  hideSidebar.value = true  // 自动折叠左侧树

  // 等待 DOM 更新后，默认开启目录并关闭预览
  await nextTick()

  setTimeout(() => {
    if (editorRef.value) {
      editorRef.value.toggleCatalog(true)   // 开启目录
      editorRef.value.togglePreview(false)  // 关闭预览
    }
  }, 100)
}

const cancelEdit = async () => {
  // 如果是 Markdown 文件，重新加载文件恢复原始内容
  if (currentFileType.value === 'md' && selectedFile.value) {
    let content = await readTextFile(selectedFile.value.path)
    noteContent.value = convertImagePathsToAssetUrls(content, selectedFile.value.path)
  }

  isEditing.value = false
  hideSidebar.value = false  // 退出编辑时恢复左侧树

  // 如果是 Markdown 文件，设置预览模式
  if (currentFileType.value === 'md') {
    await nextTick()
    setTimeout(() => {
      if (previewEditorRef.value) {
        previewEditorRef.value.togglePreviewOnly(true)
        previewEditorRef.value.toggleCatalog(true)
      }
    }, 100)
  }
}

const backToList = () => {
  selectedFile.value = null
  isEditing.value = false
  hideSidebar.value = false
}

// 开始重命名文件
const startEditFileName = () => {
  if (!selectedFile.value) return
  isEditingFileName.value = true
  editingFileName.value = selectedFile.value.name
  nextTick(() => {
    fileNameInputRef.value?.focus()
  })
}

// 取消重命名文件
const cancelEditFileName = () => {
  isEditingFileName.value = false
  editingFileName.value = ''
}

// 确认重命名文件
const confirmEditFileName = async () => {
  if (!selectedFile.value || !editingFileName.value.trim()) {
    cancelEditFileName()
    return
  }

  const newName = editingFileName.value.trim()
  if (newName === selectedFile.value.name) {
    cancelEditFileName()
    return
  }

  try {
    const oldPath = selectedFile.value.path
    const separator = oldPath.includes('\\') ? '\\' : '/'
    const lastSepIndex = oldPath.lastIndexOf(separator)
    const folderPath = oldPath.substring(0, lastSepIndex)
    const ext = selectedFile.value.extension
    const newPath = await join(folderPath, `${newName}.${ext}`)

    // 检查新文件名是否已存在
    if (await exists(newPath)) {
      ElMessage.error(t('notes.fileNameExists'))
      return
    }

    // 重命名前先记下旧版本 key,改完路径后立即迁移版本历史
    const oldVersionKey = await getNoteVersionKey(selectedFile.value)

    // 重命名文件
    await rename(oldPath, newPath)

    // 更新文件对象
    selectedFile.value.name = newName
    selectedFile.value.path = newPath

    // 同步迁移版本历史 key,避免改名后版本"断掉"
    try {
      const newVersionKey = await getNoteVersionKey(selectedFile.value)
      await versionAPI.renameNoteVersionKey(oldVersionKey, newVersionKey)
    } catch { /* ignore */ }

    // 找到文件所在的文件夹并重新加载
    const folder = notesTree.value.folders.find(f => f.path === folderPath)
    if (folder) {
      const folderKey = getFolderKey(folder)

      // 重新加载文件夹以获取最新的文件列表
      await loadFolderFiles(folder)

      // 确保文件夹是展开的
      if (!expandedFolders.value.has(folderKey)) {
        expandedFolders.value.add(folderKey)
      }
    }

    // 更新最近文件列表
    await loadRecentFiles()

    ElMessage.success(t('notes.renameSuccess'))
    isEditingFileName.value = false
    editingFileName.value = ''
  } catch (error) {

    ElMessage.error(t('notes.renameFailed'))
  }
}

const deleteCurrentNote = async () => {
  if (!selectedFile.value) return

  try {
    await ElMessageBox.confirm(t('notes.confirmDeleteFile', { name: selectedFile.value.name || selectedFile.value.title }), t('notes.confirmDelete'), {
      confirmButtonText: t('notes.confirm'),
      cancelButtonText: t('notes.cancel'),
      type: 'warning'
    })

    const filePath = selectedFile.value.path
    const versionKeyToDrop = await getNoteVersionKey(selectedFile.value)
    await remove(filePath)
    // 文件没了,版本历史一并清理
    try { await versionAPI.deleteNoteVersionsByKey(versionKeyToDrop) } catch { /* ignore */ }

    // 从文件路径中找到所属的文件夹
    const separator = filePath.includes('\\') ? '\\' : '/'
    const lastSepIndex = filePath.lastIndexOf(separator)
    const folderPath = filePath.substring(0, lastSepIndex)

    // 找到对应的文件夹对象
    const folder = notesTree.value.folders.find(f => f.path === folderPath)
    if (folder) {
      const folderKey = getFolderKey(folder)

      // 从缓存中删除文件
      const files = folderFilesCache.value.get(folderKey) || []
      const index = files.findIndex(f => f.path === filePath)
      if (index > -1) {
        files.splice(index, 1)
        folderFilesCache.value.set(folderKey, files)
      }

      // 如果文件夹已展开，重新加载以刷新显示
      if (expandedFolders.value.has(folderKey)) {
        await loadFolderFiles(folder)
      }
    }

    selectedFile.value = null
    isEditing.value = false
    ElMessage.success(t('notes.fileDeleted'))

    // 更新最近文件列表
    await loadRecentFiles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('notes.deleteFailed'))
    }
  }
}

const saveNote = async () => {
  if (!selectedFile.value) return

  try {
    const ext = currentFileType.value

    if (ext === 'md' || ext === 'txt') {
      let contentToSave = noteContent.value

      // 如果是 MD 文件，将 asset URL 转换回相对路径（用于保存）
      if (ext === 'md') {
        contentToSave = contentToSave.replace(
          /!\[([^\]]*)\]\((https?:\/\/asset\.localhost\/[^)]+)\)/g,
          (match, alt, assetUrl) => {
            // 从 asset URL 中提取文件名
            // URL 格式: https://asset.localhost/.../notes/images/xxx.png
            const imageMatch = assetUrl.match(/\/images\/([^/?#]+)/)
            if (imageMatch) {
              const fileName = decodeURIComponent(imageMatch[1])

              return `![${alt}](./images/${fileName})`
            }
            return match
          }
        )
      }

      // 保存文本文件
      await writeTextFile(selectedFile.value.path, contentToSave)

      // 保存版本历史（MD 和 TXT 文件）
      try {
        const versionKey = await getNoteVersionKey()
        await versionAPI.saveNoteVersion(versionKey, contentToSave, t('notes.manualSave'))
      } catch (e) { /* ignore */ }
    } else if (ext === 'xlsx') {
      // 保存Excel文件
      await saveExcelFile()
    } else if (ext === 'docx') {
      // 保存Word文件
      await saveWordFile()
    } else {
      ElMessage.warning(t('notes.unsupportedSaveType'))
      return
    }

    ElMessage.success(t('notes.saveSuccess'))

    // 获取文件的真实修改时间
    try {
      const fileStats = await stat(selectedFile.value.path)

      if (fileStats.mtime) {
        let realModifiedTime
        if (typeof fileStats.mtime === 'number') {
          realModifiedTime = fileStats.mtime
        } else if (fileStats.mtime.secs !== undefined) {
          realModifiedTime = fileStats.mtime.secs * 1000
        } else if (fileStats.mtime.seconds !== undefined) {
          realModifiedTime = fileStats.mtime.seconds * 1000
        } else {
          realModifiedTime = new Date(fileStats.mtime).getTime()
        }

        if (!isNaN(realModifiedTime)) {
          selectedFile.value.modified = realModifiedTime
        } else {
          selectedFile.value.modified = Date.now()
        }
      } else {
        selectedFile.value.modified = Date.now()
      }
    } catch (error) {

      selectedFile.value.modified = Date.now()
    }

    // 如果是 Markdown 文件，重新加载以转换图片路径
    if (ext === 'md') {
      let content = await readTextFile(selectedFile.value.path)
      noteContent.value = convertImagePathsToAssetUrls(content, selectedFile.value.path)
    }

    // 保存后切换到预览模式
    isEditing.value = false
    hideSidebar.value = false

    // 如果是 Markdown 文件，设置预览模式
    if (ext === 'md') {
      await nextTick()
      setTimeout(() => {
        if (previewEditorRef.value) {
          previewEditorRef.value.togglePreviewOnly(true)
          previewEditorRef.value.toggleCatalog(true)
        }
      }, 100)
    }

    const currentFolder = notesTree.value.folders.find(f => getFolderKey(f) === selectedFolderKey.value)
    if (currentFolder) {
      await loadFolderFiles(currentFolder)

      // 更新缓存中的文件修改时间（使用真实时间）
      const folderKey = getFolderKey(currentFolder)
      const files = folderFilesCache.value.get(folderKey) || []
      const fileIndex = files.findIndex(f => f.path === selectedFile.value.path)
      if (fileIndex > -1 && selectedFile.value) {
        files[fileIndex].modified = selectedFile.value.modified
        folderFilesCache.value.set(folderKey, files)
      }
    }

    // 更新最近文件列表（因为修改时间变了）
    await loadRecentFiles()
  } catch (error) {

    ElMessage.error(t('notes.saveFailed'))
  }
}

// 保存 Excel 文件
const saveExcelFile = async () => {
  try {
    if (!selectedFile.value) {
      ElMessage.error(t('notes.noFileSelected'))
      return
    }

    const activeExcelEditor = excelEditorRef.value || window.excelEditorRef
    if (!activeExcelEditor || typeof activeExcelEditor.exportXlsx !== 'function') {
      ElMessage.error(t('notes.excelEditorNotReady'))
      return
    }

    const fileName = `${selectedFile.value.name}.${selectedFile.value.extension || 'xlsx'}`
    const bytes = await activeExcelEditor.exportXlsx(fileName)

    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(selectedFile.value.path, bytes)

    // 保存后同步字节，用于预览/编辑切换
    excelFileBytes.value = bytes
  } catch (error) {

    throw error
  }
}

// 创建 Excel 文件
const createExcelFile = async (filePath, fileName) => {
  try {
    // 创建一个新的工作簿
    const workbook = XLSX.utils.book_new()

    // 创建一个空的工作表（100行x26列，与编辑器默认尺寸一致）
    const worksheet = XLSX.utils.aoa_to_sheet(
      Array(100).fill(0).map(() => Array(26).fill(''))
    )

    // 设置工作表属性，确保兼容性
    worksheet['!ref'] = 'A1:Z100'

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 生成 Excel 文件，使用 xlsx 格式确保 WPS/Office 兼容
    const excelBuffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx',
      bookSST: false, // 不使用共享字符串表，提高兼容性
      compression: true // 启用压缩
    })

    // 保存文件
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(filePath, new Uint8Array(excelBuffer))
  } catch (error) {

    throw error
  }
}

// 创建 Word 文件
const createWordFile = async (filePath, fileName) => {
  try {
    const { Document, Packer, Paragraph, TextRun } = await import('docx')

    // 创建一个新的 Word 文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: fileName,
                bold: true,
                size: 32, // 16pt
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '',
              }),
            ],
          }),
        ],
      }],
    })

    // 在浏览器环境中使用 toBlob 而不是 toBuffer
    const blob = await Packer.toBlob(doc)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 保存文件
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(filePath, buffer)
  } catch (error) {

    throw error
  }
}

// 保存 Word 文件
const saveWordFile = async () => {
  try {
    if (!wordEditorRef.value || !selectedFile.value) {
      ElMessage.error(t('notes.wordEditorNotLoaded'))
      return
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    // 获取编辑器内容
    const htmlContent = wordEditorRef.value.getContent()

    // 将 HTML 转换为 docx 段落(原先用 require('docx') 在 Vite/webview 里没有 require,
    // 直接 ReferenceError;现在把 docx 类作参数传进去,跟外层动态 import 共用一份)
    const paragraphs = htmlToDocxParagraphs(htmlContent, { Paragraph, TextRun, HeadingLevel })

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    })

    // 在浏览器环境中使用 toBlob
    const blob = await Packer.toBlob(doc)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 保存文件
    await writeFile(selectedFile.value.path, buffer)
  } catch (error) {

    throw error
  }
}

// 将 HTML 转换为 docx 段落（简化版）
// docx 类由调用方注入,避免 require('docx') 在 ESM 环境里直接 ReferenceError。
const htmlToDocxParagraphs = (html, { Paragraph, TextRun, HeadingLevel }) => {
  const paragraphs = []

  // 移除 HTML 标签并按行分割
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  const elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, li')

  elements.forEach(el => {
    const text = el.textContent.trim()
    if (!text) return

    const tagName = el.tagName.toLowerCase()

    if (tagName.startsWith('h')) {
      // 标题
      const level = parseInt(tagName.charAt(1))
      paragraphs.push(new Paragraph({
        text: text,
        heading: HeadingLevel[`HEADING_${level}`],
      }))
    } else {
      // 普通段落
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: el.querySelector('strong') || el.querySelector('b'),
            italics: el.querySelector('em') || el.querySelector('i'),
          }),
        ],
      }))
    }
  })

  // 如果没有内容，添加一个空段落
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun('')],
    }))
  }

  return paragraphs
}

// 显示版本历史
const showVersionHistory = async () => {
  if (!selectedFile.value) {
    ElMessage.warning(t('notes.selectNoteFirst'))
    return
  }

  try {
    const versionKey = await getNoteVersionKey()
    noteVersions.value = await versionAPI.getNoteVersions(versionKey)
    showVersionDialog.value = true
  } catch (error) {

    ElMessage.error(t('notes.loadVersionFailed'))
  }
}

// 恢复版本
const restoreVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
        t('notes.confirmRestoreMsg', { version: version.version_number }),
        t('notes.confirmRestore'),
        { type: 'warning' }
    )

    // 获取版本内容
    const versionKey = await getNoteVersionKey()
    const content = await versionAPI.getVersionContent(versionKey, version.version_number)

    // 直接替换当前编辑器的内容
    noteContent.value = content

    // 保存到文件
    await writeTextFile(selectedFile.value.path, content)

    // 保存为新版本（作为恢复记录）
    await versionAPI.saveNoteVersion(
      versionKey,
      content,
      `恢复到版本 ${version.version_number}`
    )

    ElMessage.success(t('notes.restoreSuccess'))
    showVersionDialog.value = false
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error(t('notes.restoreFailed'))
    }
  }
}

// 格式化版本时间
const formatVersionTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 格式化时间为相对时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return t('notes.justNow')
  } else if (diff < hour) {
    return t('notes.minutesAgo', { n: Math.floor(diff / minute) })
  } else if (diff < day) {
    return t('notes.hoursAgo', { n: Math.floor(diff / hour) })
  } else if (diff < 7 * day) {
    return t('notes.daysAgo', { days: Math.floor(diff / day) })
  } else {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }
}

// 加载最近编辑的文件
const loadRecentFiles = async () => {
  try {
    const allFiles = []

    // 递归加载并收集所有文件
    const collectFilesFromFolder = async (folder) => {
      try {
        // 加载当前文件夹的文件
        await loadFolderFiles(folder)

        const folderKey = getFolderKey(folder)
        const files = folderFilesCache.value.get(folderKey) || []
        allFiles.push(...files)

        // 递归处理子文件夹
        const subFolders = getSubFolders(folder)
        for (const subFolder of subFolders) {
          await collectFilesFromFolder(subFolder)
        }
      } catch (e) { /* ignore */ }
    }

    // 遍历所有根文件夹
    for (const folder of rootFolders.value) {
      await collectFilesFromFolder(folder)
    }

    // 过滤有效文件
    const validFiles = allFiles.filter(file => file.modified && !isNaN(file.modified))

    // 按修改时间排序并取前4个
    recentFiles.value = validFiles
      .sort((a, b) => (b.modified || 0) - (a.modified || 0))
      .slice(0, 4)
  } catch (e) { /* ignore */ }
}

// 打开模版管理
const openTemplateManager = () => {
  loadTemplates()
  showTemplateDialog.value = true
}

// 加载模版列表
const loadTemplates = async () => {
  try {
    const dataDir = await appDataDir()
    const templatesDir = await join(dataDir, 'templates')

    // 确保模版目录存在
    if (!await exists(templatesDir)) {
      await mkdir(templatesDir, { recursive: true })
      templates.value = []
      return
    }

    // 读取模版文件（这里简化处理，实际应该读取目录）
    // 暂时使用本地存储模拟
    const stored = localStorage.getItem('note_templates')
    templates.value = stored ? JSON.parse(stored) : []
  } catch (error) {

    templates.value = []
  }
}

// 创建新模版
const createTemplate = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt(t('notes.templateNamePrompt'), t('notes.newTemplate'), {
      confirmButtonText: t('notes.confirm'),
      cancelButtonText: t('notes.cancel'),
      inputPattern: /.+/,
      inputErrorMessage: t('notes.templateNameEmpty')
    })

    if (!name) return

    const { value: type } = await ElMessageBox.prompt(t('notes.templateTypePrompt'), t('notes.templateType'), {
      confirmButtonText: t('notes.confirm'),
      cancelButtonText: t('notes.cancel'),
      inputPattern: /^(md|txt|docx|xlsx)$/,
      inputErrorMessage: t('notes.templateTypeInvalid'),
      inputValue: 'md'
    })

    const template = {
      id: Date.now().toString(),
      name: name.trim(),
      type: type || 'md',
      content: '',
      created: Date.now()
    }

    templates.value.push(template)
    localStorage.setItem('note_templates', JSON.stringify(templates.value))
    ElMessage.success(t('notes.templateCreateSuccess'))
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error(t('notes.templateCreateFailed'))
    }
  }
}

// 使用模版
const useTemplate = (template) => {
  // 这里可以基于模版创建新笔记
  ElMessage.info(`${t('notes.useTemplate')}: ${template.name}`)
  showTemplateDialog.value = false
  // TODO: 实现基于模版创建笔记的逻辑
}

// 编辑模版
const editTemplate = (template) => {
  ElMessage.info(`${t('notes.editTemplate')}: ${template.name}`)
  // TODO: 实现编辑模版的逻辑
}

// 删除模版
const deleteTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(
      t('notes.confirmDeleteTemplate', { name: template.name }),
      t('notes.confirmDelete'),
      {
        confirmButtonText: t('notes.confirm'),
        cancelButtonText: t('notes.cancel'),
        type: 'warning'
      }
    )

    templates.value = templates.value.filter(t => t.id !== template.id)
    localStorage.setItem('note_templates', JSON.stringify(templates.value))
    ElMessage.success(t('notes.templateDeleted'))
  } catch (error) {
    // 用户取消
  }
}

// 导入笔记
const importNote = async () => {
  // 检查是否有文件夹
  if (rootFolders.value.length === 0) {
    ElMessage.warning(t('notes.createFolderFirst'))
    return
  }

  // 构建树形数据
  folderTreeData.value = buildFolderTree()

  // 展开第一层
  expandedTreeKeys.value = rootFolders.value.map(f => f.path)

  // 如果只有一个文件夹，默认选中
  if (rootFolders.value.length === 1) {
    selectedImportFolder.value = rootFolders.value[0].path
  } else {
    selectedImportFolder.value = null
  }

  // 清空待导入文件
  pendingDropFiles.value = []

  // 显示文件夹选择对话框
  showFolderSelectDialog.value = true
}

// 构建文件夹树形数据
const buildFolderTree = () => {
  const tree = []
  const folderMap = new Map()

  // 第一遍：创建所有节点
  notesTree.value.folders.forEach(folder => {
    const node = {
      name: folder.name,
      path: folder.path,
      parent: folder.parent,
      children: [],
      folder: folder // 保存原始 folder 对象
    }
    folderMap.set(getFolderKey(folder), node)
  })

  // 第二遍：构建树形结构
  folderMap.forEach((node, key) => {
    if (!node.parent) {
      // 根节点
      tree.push(node)
    } else {
      // 子节点 - 添加到父节点的 children
      const parentNode = folderMap.get(node.parent)
      if (parentNode) {
        parentNode.children.push(node)
      }
    }
  })

  return tree
}

// 树节点点击
const handleTreeNodeClick = (data) => {
  selectedImportFolder.value = data.path
}

// 确认选择文件夹并开始导入
const confirmFolderSelect = async () => {
  if (!selectedImportFolder.value) {
    ElMessage.warning(t('notes.selectFolder'))
    return
  }

  // 找到选中的文件夹对象
  const findFolder = (path) => {
    return notesTree.value.folders.find(f => f.path === path)
  }

  const folder = findFolder(selectedImportFolder.value)
  if (!folder) {
    ElMessage.error(t('notes.folderNotFound'))
    return
  }

  importTargetFolder.value = folder
  showFolderSelectDialog.value = false

  // 如果有待导入的拖拽文件，直接处理
  if (pendingDropFiles.value.length > 0) {
    await handleDroppedFiles(pendingDropFiles.value, true) // 自动打开
    pendingDropFiles.value = []
  } else {
    // 否则触发文件选择
    importFileInput.value?.click()
  }
}

// 设置文件拖拽监听
// 收集 listen() 返回的 unlisten,组件卸载时清理。
// 否则每次进入这个视图都会向当前窗口堆叠 3 个 drag-over/leave/drop 监听,
// 多次切回 NoteView 后,一次拖拽会触发多套处理逻辑(用闭包里的过期 state)。
const fileDropUnlisteners = []
const setupFileDrop = async () => {
  try {
    const { listen } = await import('@tauri-apps/api/event')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    // 保存拖拽悬浮的目标文件夹
    let dropTargetFolder = null
    let isDragging = false
    let hoverTimer = null
    let lastHoverFolder = null
    let currentHighlightElement = null // 缓存当前高亮的元素

    // 监听 Tauri 拖拽悬浮事件
    fileDropUnlisteners.push(await listen('tauri://drag-over', async (event) => {
      isDragging = true
      const position = event.payload?.position
      if (!position) return

      // 获取窗口信息用于坐标转换
      const window = getCurrentWindow()
      const scaleFactor = await window.scaleFactor()

      // 转换坐标（考虑 DPI 缩放）
      const x = position.x / scaleFactor
      const y = position.y / scaleFactor

      // 获取鼠标位置对应的元素
      const element = document.elementFromPoint(x, y)
      if (!element) {
        // 清除高亮
        if (currentHighlightElement) {
          currentHighlightElement.classList.remove('drop-target')
          currentHighlightElement = null
        }
        dropTargetFolder = null
        lastHoverFolder = null
        if (hoverTimer) {
          clearTimeout(hoverTimer)
          hoverTimer = null
        }
        return
      }

      // 向上查找最近的 tree-item-wrapper
      const folderItem = element.closest('.tree-item-wrapper[data-folder-path]')

      if (folderItem) {
        // 只在元素改变时才更新 DOM
        if (currentHighlightElement !== folderItem) {
          // 移除之前的高亮
          if (currentHighlightElement) {
            currentHighlightElement.classList.remove('drop-target')
          }
          // 添加新的高亮
          folderItem.classList.add('drop-target')
          currentHighlightElement = folderItem
        }

        const folderPath = folderItem.getAttribute('data-folder-path')
        const folder = notesTree.value.folders.find(f => f.path === folderPath)
        if (folder) {
          dropTargetFolder = folder

          // 如果悬停在新的文件夹上，重置计时器
          if (lastHoverFolder !== folder) {
            if (hoverTimer) {
              clearTimeout(hoverTimer)
            }
            lastHoverFolder = folder

            // 设置自动展开计时器（悬停 800ms 后自动展开）
            const folderKey = getFolderKey(folder)
            if (!expandedFolders.value.has(folderKey)) {
              hoverTimer = setTimeout(async () => {

                expandedFolders.value.add(folderKey)
                await loadFolderFiles(folder)
              }, 800)
            }
          }
        }
      } else {
        // 鼠标不在文件夹上
        if (currentHighlightElement) {
          currentHighlightElement.classList.remove('drop-target')
          currentHighlightElement = null
        }
        dropTargetFolder = null
        lastHoverFolder = null
        if (hoverTimer) {
          clearTimeout(hoverTimer)
          hoverTimer = null
        }
      }
    }))

    // 监听拖拽离开
    fileDropUnlisteners.push(await listen('tauri://drag-leave', async () => {
      isDragging = false
      dropTargetFolder = null
      lastHoverFolder = null
      if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
      }
      // 清除高亮
      if (currentHighlightElement) {
        currentHighlightElement.classList.remove('drop-target')
        currentHighlightElement = null
      }
    }))

    // 监听文件拖拽释放事件
    fileDropUnlisteners.push(await listen('tauri://drag-drop', async (event) => {
      isDragging = false

      // 清除计时器
      if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
      }
      lastHoverFolder = null

      // 清除视觉反馈
      if (currentHighlightElement) {
        currentHighlightElement.classList.remove('drop-target')
        currentHighlightElement = null
      }

      const paths = event.payload.paths || event.payload
      if (!paths || paths.length === 0) return

      // 检查是否有文件夹
      if (rootFolders.value.length === 0) {
        ElMessage.warning(t('notes.createFolderFirst'))
        dropTargetFolder = null
        return
      }

      // 如果拖拽到了文件夹节点上，直接导入
      if (dropTargetFolder) {
        importTargetFolder.value = dropTargetFolder
        const targetFolder = dropTargetFolder
        dropTargetFolder = null
        await handleDroppedFiles(paths, true) // 传入 true 表示自动打开
        return
      }

      // 否则保存待导入的文件，弹窗让用户选择
      pendingDropFiles.value = paths

      // 构建树形数据
      folderTreeData.value = buildFolderTree()

      // 展开第一层
      expandedTreeKeys.value = rootFolders.value.map(f => f.path)

      // 如果只有一个文件夹，默认选中
      if (rootFolders.value.length === 1) {
        selectedImportFolder.value = rootFolders.value[0].path
      } else {
        selectedImportFolder.value = null
      }

      // 显示文件夹选择对话框
      showFolderSelectDialog.value = true
    }))
  } catch (e) { /* ignore */ }
}

// 处理拖拽的文件
const handleDroppedFiles = async (paths, autoOpen = false) => {
  if (!importTargetFolder.value) {
    ElMessage.error(t('notes.noTargetFolder'))
    return
  }

  const importedFiles = [] // 记录成功导入的文件路径

  for (const filePath of paths) {
    try {
      // 检查文件是否存在
      const fileExists = await exists(filePath)
      if (!fileExists) {
        ElMessage.warning(`${t('notes.fileNotExist')}: ${filePath}`)
        continue
      }

      // 获取文件名
      const fileName = filePath.split(/[/\\]/).pop()
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

      // 验证文件类型
      if (!['.md', '.txt', '.docx', '.xlsx'].includes(ext)) {
        ElMessage.warning(`${t('notes.unsupportedFileType')}: ${fileName}`)
        continue
      }

      // 目标路径
      const targetPath = await join(importTargetFolder.value.path, fileName)

      // 检查目标文件是否已存在
      if (await exists(targetPath)) {
        try {
          await ElMessageBox.confirm(
            t('notes.fileExistsOverwrite', { name: fileName }),
            t('notes.confirmOverwrite'),
            {
              confirmButtonText: t('notes.overwrite'),
              cancelButtonText: t('notes.skip'),
              type: 'warning'
            }
          )
        } catch {
          // 用户选择跳过
          continue
        }
      }

      // 读取并复制文件
      if (ext === '.md' || ext === '.txt') {
        const content = await readTextFile(filePath)
        await writeTextFile(targetPath, content)
      } else {
        const fileData = await readFile(filePath)
        await writeFile(targetPath, fileData)
      }

      ElMessage.success(`${t('notes.importSuccess')}: ${fileName}`)
      importedFiles.push(targetPath)
    } catch (error) {

      const fileName = filePath.split(/[/\\]/).pop()
      ElMessage.error(`${t('notes.importFailed')}: ${fileName}`)
    }
  }

  // 刷新目标文件夹
  const folderKey = getFolderKey(importTargetFolder.value)
  if (!expandedFolders.value.has(folderKey)) {
    expandedFolders.value.add(folderKey)
  }
  await loadFolderFiles(importTargetFolder.value)
  await loadRecentFiles()

  // 如果需要自动打开且有导入成功的文件，打开第一个
  if (autoOpen && importedFiles.length > 0) {
    const files = folderFilesCache.value.get(folderKey) || []
    const firstImportedFile = files.find(f => f.path === importedFiles[0])
    if (firstImportedFile) {
      await openFile(firstImportedFile)
    }
  }

  // 清空目标文件夹引用
  importTargetFolder.value = null
}

// 移动文件夹到目标文件夹
const moveFolder = async (sourceFolder, targetFolder) => {
  try {
    // 确认操作
    await ElMessageBox.confirm(
      t('notes.confirmMoveFolder', { source: sourceFolder.name, target: targetFolder.name }),
      t('notes.confirmMove'),
      {
        confirmButtonText: t('notes.confirm'),
        cancelButtonText: t('notes.cancel'),
        type: 'warning'
      }
    )

    const sourcePath = sourceFolder.path
    const separator = sourcePath.includes('\\') ? '\\' : '/'

    // 构建新路径
    const newPath = await join(targetFolder.path, sourceFolder.name)

    // 检查目标是否已存在
    if (await exists(newPath)) {
      ElMessage.error(t('notes.targetExists'))
      return
    }

    // 执行移动（重命名）
    await rename(sourcePath, newPath)

    // 同步迁移该文件夹下所有版本 key
    try {
      const notesRoot = (await getConfiguredNotesDir()).replace(/\\/g, '/')
      const oldPrefix = sourcePath.replace(/\\/g, '/').replace(`${notesRoot}/`, '')
      const newPrefix = newPath.replace(/\\/g, '/').replace(`${notesRoot}/`, '')
      await versionAPI.renameNoteVersionPrefix(oldPrefix, newPrefix)
    } catch { /* ignore */ }

    // 更新文件夹对象
    const oldFolderKey = getFolderKey(sourceFolder)
    const oldParent = sourceFolder.parent

    sourceFolder.path = newPath
    sourceFolder.parent = getFolderKey(targetFolder)

    // 递归更新所有子文件夹的路径
    const updateChildrenPaths = (oldBasePath, newBasePath) => {
      notesTree.value.folders.forEach(f => {
        if (f.path.startsWith(oldBasePath + separator)) {
          f.path = f.path.replace(oldBasePath, newBasePath)
        }
      })
    }
    updateChildrenPaths(sourcePath, newPath)

    // 更新文件缓存中的路径
    const newFolderKey = getFolderKey(sourceFolder)
    if (folderFilesCache.value.has(oldFolderKey)) {
      const files = folderFilesCache.value.get(oldFolderKey)
      folderFilesCache.value.delete(oldFolderKey)
      folderFilesCache.value.set(newFolderKey, files)
    }

    // 更新展开状态
    if (expandedFolders.value.has(oldFolderKey)) {
      expandedFolders.value.delete(oldFolderKey)
      expandedFolders.value.add(newFolderKey)
    }

    // 确保目标文件夹展开
    const targetKey = getFolderKey(targetFolder)
    if (!expandedFolders.value.has(targetKey)) {
      expandedFolders.value.add(targetKey)
    }
    await loadFolderFiles(targetFolder)

    ElMessage.success(t('notes.moveSuccess'))
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error('移动失败')
    }
  }
}

// 移动文件到目标文件夹
const moveFile = async (sourceFile, targetFolder) => {

  try {
    // 确认操作
    await ElMessageBox.confirm(
      `确定要将文件 "${sourceFile.name}" 移动到 "${targetFolder.name}" 吗？`,
      '确认移动',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const sourcePath = sourceFile.path
    const fileName = getFileNameWithExt(sourceFile)

    // 构建新路径
    const newPath = await join(targetFolder.path, fileName)

    // 检查目标是否已存在
    if (await exists(newPath)) {
      ElMessage.error('目标文件夹中已存在同名文件')
      return
    }

    // 移动前先记下旧版本 key
    const oldVersionKey = await getNoteVersionKey(sourceFile)

    // 执行移动
    await rename(sourcePath, newPath)

    // 同步迁移版本历史 key
    try {
      const movedFile = { ...sourceFile, path: newPath }
      const newVersionKey = await getNoteVersionKey(movedFile)
      await versionAPI.renameNoteVersionKey(oldVersionKey, newVersionKey)
    } catch { /* ignore */ }

    // 找到源文件所在的文件夹
    const separator = sourcePath.includes('\\') ? '\\' : '/'
    const sourceFolderPath = sourcePath.substring(0, sourcePath.lastIndexOf(separator))
    const sourceFolder = notesTree.value.folders.find(f => f.path === sourceFolderPath)

    // 从源文件夹缓存中删除
    if (sourceFolder) {
      const sourceFolderKey = getFolderKey(sourceFolder)
      const files = folderFilesCache.value.get(sourceFolderKey) || []

      const index = files.findIndex(f => f.path === sourcePath)
      if (index > -1) {
        files.splice(index, 1)
        folderFilesCache.value.set(sourceFolderKey, files)

      }
    }

    // 刷新目标文件夹
    const targetKey = getFolderKey(targetFolder)

    if (!expandedFolders.value.has(targetKey)) {
      expandedFolders.value.add(targetKey)
    }
    await loadFolderFiles(targetFolder)

    const targetFiles = folderFilesCache.value.get(targetKey) || []

    // 如果移动的是当前打开的文件，关闭它
    if (selectedFile.value && selectedFile.value.path === sourcePath) {
      selectedFile.value = null
      isEditing.value = false

    }

    ElMessage.success(t('notes.moveSuccess'))

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移动失败')
    }
  }
}

// 处理导入的文件
const handleImportFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 检查是否选择了目标文件夹
  if (!importTargetFolder.value) {
    ElMessage.error('请先选择目标文件夹')
    event.target.value = ''
    return
  }

  try {
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.'))

    // 验证文件类型
    if (!['.md', '.txt', '.docx', '.xlsx'].includes(ext)) {
      ElMessage.error('不支持的文件类型')
      event.target.value = ''
      return
    }

    // 读取文件内容
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const targetPath = await join(importTargetFolder.value.path, fileName)

        // 检查文件是否已存在
        if (await exists(targetPath)) {
          await ElMessageBox.confirm(
            `文件 "${fileName}" 已存在，是否覆盖？`,
            '确认',
            {
              confirmButtonText: '覆盖',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        }

        // 保存文件
        if (ext === '.md' || ext === '.txt') {
          await writeTextFile(targetPath, e.target.result)
        } else {
          // 对于二进制文件（docx, xlsx）
          const arrayBuffer = e.target.result
          const uint8Array = new Uint8Array(arrayBuffer)
          await writeFile(targetPath, uint8Array)
        }

        ElMessage.success('导入成功')

        // 确保目标文件夹展开
        const folderKey = getFolderKey(importTargetFolder.value)
        if (!expandedFolders.value.has(folderKey)) {
          expandedFolders.value.add(folderKey)
        }

        // 刷新目标文件夹的文件列表
        await loadFolderFiles(importTargetFolder.value)
        await loadRecentFiles()

        // 打开导入的文件
        const files = folderFilesCache.value.get(folderKey) || []
        const importedFile = files.find(f => f.path === targetPath)
        if (importedFile) {
          await openFile(importedFile)
        }

        // 清空文件输入和目标文件夹
        event.target.value = ''
        importTargetFolder.value = null
      } catch (error) {
        if (error !== 'cancel') {

          ElMessage.error('导入文件失败')
        }
        event.target.value = ''
        importTargetFolder.value = null
      }
    }

    reader.onerror = () => {
      ElMessage.error('读取文件失败')
      event.target.value = ''
      importTargetFolder.value = null
    }

    // 根据文件类型选择读取方式
    if (ext === '.md' || ext === '.txt') {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  } catch (error) {

    ElMessage.error('导入文件失败')
    event.target.value = ''
    importTargetFolder.value = null
  }
}

// 对比版本
const compareWithVersion = async (version) => {
  try {
    const versionKey = await getNoteVersionKey()
    const content = await versionAPI.getVersionContent(versionKey, version.version_number)
    compareVersion.value = version
    compareContent.value = content
    showCompareDialog.value = true
  } catch (error) {

    ElMessage.error('加载版本内容失败')
  }
}

// 从对比对话框恢复版本
const restoreCompareVersion = async () => {
  if (!compareVersion.value) return

  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 ${compareVersion.value.version_number} 吗？当前内容将被覆盖。`,
      '确认恢复',
      { type: 'warning' }
    )

    // 直接使用已经加载的对比内容
    const content = compareContent.value

    // 替换当前编辑器的内容
    noteContent.value = content

    // 保存到文件
    await writeTextFile(selectedFile.value.path, content)

    // 保存为新版本（作为恢复记录）
    const versionKey = await getNoteVersionKey()
    await versionAPI.saveNoteVersion(
      versionKey,
      content,
      `恢复到版本 ${compareVersion.value.version_number}`
    )

    ElMessage.success('版本恢复成功')
    showCompareDialog.value = false
    showVersionDialog.value = false
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error('恢复失败')
    }
  }
}

// 自动保存当前文件
const autoSaveCurrentFile = async () => {
  if (!selectedFile.value) return

  try {
    if (currentFileType.value === 'md' || currentFileType.value === 'txt') {
      // 保存文件内容
      await writeTextFile(selectedFile.value.path, noteContent.value)

      // 保存到版本历史
      try {
        const versionKey = await getNoteVersionKey()
        await versionAPI.saveNoteVersion(
          versionKey,
          noteContent.value,
          '自动保存'
        )
      } catch (e) { /* ignore */ }
    } else if (currentFileType.value === 'xlsx') {
      await saveExcelFile()
    } else if (currentFileType.value === 'docx') {
      await saveWordFile()
    }

  } catch (e) { /* ignore */ }
}

const showFileMenu = (event, file) => {
  event.stopPropagation()
  ElMessageBox.confirm(
      `对文件 "${file.name || file.title}" 执行操作`,
      '文件操作',
      {
        distinguishCancelAndClose: true,
        confirmButtonText: '编辑',
        cancelButtonText: '删除',
        type: 'info'
      }
  ).then(() => {
    openFile(file, true)  // 从文件菜单编辑，进入编辑模式
  }).catch((action) => {
    if (action === 'cancel') {
      ElMessageBox.confirm(`确定删除 ${file.name || file.title} 吗?`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await remove(file.path)

          const folderKey = selectedFolderKey.value
          const files = folderFilesCache.value.get(folderKey) || []
          const index = files.findIndex(f => f.path === file.path)
          if (index > -1) {
            files.splice(index, 1)
            folderFilesCache.value.set(folderKey, files)
          }

          ElMessage.success('文件已删除')
  } catch (error) {
          ElMessage.error('删除失败')
        }
      })
    }
  })
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleFileImport = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    ElMessage.success(`模拟导入: 已读取文件 ${files[0].name}`)
  }
}

const triggerExport = () => {
  ElMessage.info('模拟导出: 正在打包当前文件夹内容为 ZIP...')
}

const createNewNote = async () => {
  // 如果没有选中文件夹，默认在根目录创建
  let targetFolder = null

  if (selectedFolderKey.value) {
    targetFolder = notesTree.value.folders.find(f => getFolderKey(f) === selectedFolderKey.value)
  }

  // 如果没有选中文件夹或找不到，使用第一个根目录文件夹
  if (!targetFolder && notesTree.value.folders.length > 0) {
    targetFolder = notesTree.value.folders[0]
  }

  if (!targetFolder) {
    ElMessage.warning(t('notes.createFolderFirst'))
    return
  }

  // 直接创建并打开文件
  await startCreateFile(targetFolder, 'md')
}

// Markdown 相关 - TOC 提取
// extractTOC 和 watch 已移除，使用 md-editor-v3 内置目录

const getFileIconClass = (type) => {
  const iconMap = {
    'md': '📝',
    'docx': '📘',
    'xlsx': '📗',
    'txt': '📄'
  }
  return iconMap[type] || '📄'
}

const getFileIconColor = (type) => {
  const colorMap = {
    'md': 'var(--icon-md)',
    'docx': 'var(--icon-word)',
    'xlsx': 'var(--icon-excel)',
    'txt': 'var(--icon-txt)'
  }
  return colorMap[type] || 'var(--text-secondary)'
}

const formatFileTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'})
  }
}

// TOC 功能已移除，使用 md-editor-v3 内置目录
</script>

<style scoped>
/* ignore */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

/* ignore */
:root {
  --bg-body: #f7f9fb;
  --bg-sidebar: #fcfcfc;
  --bg-content: #ffffff;
  --border-color: #e1e4e8;
  --text-primary: #2c3e50;
  --text-secondary: #606f7b;
  --accent-color: #3498db;
  --hover-bg: #edf2f7;
  --active-bg: #e6f4ff;
  --danger-color: #e74c3c;
  --success-color: #2ecc71;
  --icon-folder: #f1c40f;
  --icon-md: #3498db;
  --icon-word: #2980b9;
  --icon-excel: #27ae60;
  --icon-txt: #95a5a6;
}

.notes-page-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "PingFang SC";
  color: var(--text-primary);
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
  height: 100%;
  width: 100%;
}

/* ignore */
.header {
  min-height: 58px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle-btn {
  border: 1px solid rgba(60, 40, 20, 0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(242,246,251,0.92));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
}

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
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
  background: transparent;
  padding: 0;
  border-radius: 0;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-name-editor {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.74);
  border: 1px solid rgba(60, 40, 20,0.06);
  border-radius: 999px;
  margin-right: 12px;
}

.file-name-display {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.header-actions .btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.header-actions .btn:hover {
  background: var(--hover-bg);
  color: var(--accent-color);
}

.btn-primary {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.btn-primary:hover {
  background: #2980b9;
  border-color: #2980b9;
  color: white;
}

/* ignore */
.main-container {
  display: grid;
  grid-template-columns: minmax(260px, auto) 4px minmax(0, 1fr);
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 5px 5px 0;
  gap: 0;
}

.main-container.sidebar-hidden {
  grid-template-columns: minmax(0, 1fr);
}

/* ignore */
.sidebar-left {
  min-width: 260px;
  max-width: 600px;
  flex-shrink: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, var(--accent-warm-soft) 4%), var(--bg-secondary));
  border: 1px solid var(--divider);
  border-right: none;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
  border-radius: 18px 0 0 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: var(--accent-blue);
}

.resize-handle.resizing {
  background-color: var(--accent-blue-hover);
}

.sidebar-toolbar {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(60, 40, 20,0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sidebar-btn:hover {
  color: var(--accent-color);
}

.file-tree {
  list-style: none;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  padding: 8px 10px 20px 10px;
  margin: 0;
  min-height: 0;
}

/* ignore */
.folder-node {
  list-style: none;
}

.tree-item-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--text-primary);
  position: relative;
  border: 1px solid transparent;
}

.tree-item-wrapper:hover {
  background-color: rgba(255,255,255,0.58);
}

.tree-item-wrapper.active {
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,245,251,0.95));
  color: var(--accent-color);
  font-weight: 600;
  border-color: rgba(194, 65, 12,0.15);
  box-shadow: 0 1px 0 rgba(255,255,255,0.82), 0 6px 14px rgba(60, 40, 20,0.05);
}

.tree-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.tree-info span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-info i.fa-folder {
  color: var(--icon-folder);
}

.arrow {
  font-size: 0.7rem;
  color: #ccc;
  transition: transform 0.2s;
  width: 12px;
  text-align: center;
  cursor: pointer;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.arrow:hover {
  color: var(--accent-color);
}

/* ignore */
.folder-actions {
  display: none;
  gap: 8px;
  margin-left: 5px;
}

.tree-item-wrapper:hover .folder-actions {
  display: flex;
}

.folder-actions i {
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: 0.2s;
  cursor: pointer;
}

.folder-actions i:hover {
  color: var(--accent-color);
  transform: scale(1.1);
}

.folder-actions i.del:hover {
  color: var(--danger-color);
}

.action-dropdown {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.action-dropdown i {
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: 0.2s;
}

.action-dropdown:hover i {
  color: var(--accent-color);
  transform: scale(1.1);
}

/* ignore */
.root-new-folder-wrapper {
  list-style: none;
  margin: 0;
  padding: 0;
}

.root-new-folder-wrapper .new-folder-input-wrapper {
  padding: 8px 10px;
  display: flex;
  align-items: center;
}

.new-folder-input-wrapper {
  padding: 4px 10px 4px 30px;
}

.new-folder-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  font-size: 0.85rem;
  outline: none;
  background: var(--bg-primary);
}

.new-folder-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* ignore */
.rename-input {
  flex: 1;
  padding: 2px 6px;
  border: 1px solid var(--accent-color);
  border-radius: 3px;
  font-size: 0.85rem;
  outline: none;
  background: var(--bg-primary);
  min-width: 80px;
}

.rename-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* ignore */
.new-file-input {
  flex: 1;
  padding: 2px 6px;
  border: 1px solid var(--accent-color);
  border-radius: 3px;
  font-size: 0.85rem;
  outline: none;
  background: var(--bg-primary);
  min-width: 100px;
}

.new-file-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* ignore */
.sub-tree {
  display: block;
  list-style: none;
  padding-left: 18px;
  margin: 0;
}

/* ignore */
.content-area {
  flex: 1;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
  z-index: 0;
  border: 1px solid var(--divider);
  border-radius: 0 18px 18px 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}

.main-container.sidebar-hidden .content-area {
  border-radius: 18px;
}

/* ignore */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-icon {
  color: #409eff;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #606266;
}

.view-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ignore */
.content-toolbar {
  height: 45px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
  background: var(--bg-primary);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
  border-right: 1px solid #eee;
  padding-right: 15px;
}

.toolbar-group:last-child {
  border: none;
}

.tool-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 4px;
}

.tool-btn:hover {
  color: var(--accent-color);
  background: var(--hover-bg);
}

/* ignore */
.file-node {
  list-style: none;
}

.file-item {
  padding-left: 12px;
}

.arrow-placeholder {
  width: 12px;
  display: inline-block;
}

/* ignore */
/* ignore */
.markdown-preview-mode {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

/* ignore */
.markdown-preview-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.markdown-preview-mode :deep(.md-editor) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* ignore */
.markdown-editor-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  height: 0;
}

.markdown-editor-mode :deep(.md-editor) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* ignore */
.preview-mode {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 40px 60px;
  background: var(--bg-primary);
  min-height: 0;
}

.preview-content {
  max-width: 900px;
  margin: 0 auto;
  line-height: 1.8;
  min-width: 0;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.preview-content :deep(h1),
.preview-content :deep(h2) {
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-top: 24px;
  margin-bottom: 16px;
}

.preview-content :deep(code) {
  background: rgba(27, 31, 35, .05);
  border-radius: 3px;
  font-size: 85%;
  margin: 0;
  padding: 0.2em 0.4em;
}

.preview-content :deep(pre) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
}

/* ignore */
/* ignore */
.txt-mode,
.excel-mode,
.word-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  height: 0;
}

/* ignore */
.txt-preview-mode {
  flex: 1;
  overflow: auto;
  padding: 40px 60px;
  background: var(--bg-primary);
  min-height: 0;
}

.txt-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

/* ignore */
.unsupported-editor {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

/* ignore */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: var(--bg-primary);
  overflow-y: auto;
}

.cursor-welcome {
  width: 100%;
  max-width: 600px;
}

/* ignore */
.action-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 40px;
  background: #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  flex: 1;
}

.action-card:hover {
  background-color: #d8d8d8;
}

.action-card span {
  font-size: 13px;
  color: #333333;
  font-weight: 400;
}

/* ignore */
.recent-section {
  width: 100%;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recent-header h3 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8e8e93;
  margin: 0;
}

.recent-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.recent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.recent-row:hover {
  opacity: 0.7;
}

.file-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: #007aff;
  font-weight: 400;
  flex-shrink: 0;
}

.file-folder {
  font-size: 12px;
  color: #8e8e93;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-time {
  font-size: 12px;
  color: #8e8e93;
  font-weight: 400;
  margin-left: 24px;
  flex-shrink: 0;
  white-space: nowrap;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

/* ignore */
.btn-success {
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

.btn-success:hover {
  background: #27ae60;
  border-color: #27ae60;
}

.btn-danger {
  background: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}

.btn-danger:hover {
  background: #c0392b;
  border-color: #c0392b;
}

/* ignore */
/* ignore */

/* ignore */
.type-md {
  color: var(--icon-md);
}

.type-docx {
  color: var(--icon-word);
}

.type-xlsx {
  color: var(--icon-excel);
}

.type-txt {
  color: var(--icon-txt);
}

/* ignore */
.version-list {
  max-height: 500px;
  overflow-y: auto;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-number {
  font-weight: bold;
  color: var(--accent-color);
}

.version-actions {
  display: flex;
  gap: 8px;
}

/* ignore */
.version-compare {
  display: flex;
  gap: 20px;
  height: 70vh;
}

/* ignore */
.template-manager {
  min-height: 400px;
}

.template-table-container {
  max-height: 450px;
  overflow-y: auto;
}

.template-manager .el-table {
  margin-top: 16px;
}

.compare-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.compare-header {
  background: #f5f7fa;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.compare-header h4 {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.compare-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--bg-primary);
}

.compare-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: "PingFang SC";
  font-size: 13px;
  line-height: 1.6;
  color: #333;
}

.version-empty {
  padding: 40px 0;
  text-align: center;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-empty {
  padding: 20px;
  text-align: center;
}

/* ignore */
.folder-tree-select {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
}

.folder-tree-select :deep(.el-tree) {
  background: transparent;
}

.folder-tree-select :deep(.el-tree-node__content) {
  height: 36px;
  padding: 0 8px;
  border-radius: 4px;
}

.folder-tree-select :deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

.folder-tree-select :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
  color: #409eff;
}

.tree-node-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tree-node-label .el-icon {
  color: #f39c12;
  font-size: 16px;
}

.folder-tree-select :deep(.el-tree-node.is-current) .tree-node-label .el-icon {
  color: #409eff;
}
</style>
