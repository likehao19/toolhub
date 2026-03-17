<template>
  <div class="notes2-page">
    <div class="editor-view">
      <div class="editor-top-toolbar">
        <div class="toolbar-left">
          <div class="breadcrumb" id="breadcrumb">{{ t('noteEditor.knowledgeBase') }} / {{ currentFolderName || t('noteEditor.defaultFolder') }}</div>
        </div>
        <div class="toolbar-right">
          <el-button size="small" circle @click="hideSidebar = !hideSidebar"
                     :title="hideSidebar ? t('noteEditor.showSidebar') : t('noteEditor.hideSidebar')">
            <el-icon>
              <ArrowLeft v-if="!hideSidebar"/>
              <ArrowRight v-else/>
            </el-icon>
          </el-button>
          <el-button size="small" circle @click="showVersionHistory" :title="t('noteEditor.versionHistory')">
            <el-icon>
              <Clock/>
            </el-icon>
          </el-button>
          <el-button size="small" type="success" circle @click="saveNote" :title="t('noteEditor.save')">
            <el-icon>
              <Check/>
            </el-icon>
          </el-button>
          <el-button size="small" type="danger" circle @click="deleteCurrentNote" :title="t('noteEditor.delete')">
            <el-icon>
              <Delete/>
            </el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="main-container">
      <!-- 中间内容区域 -->
      <main class="content-area">
        <MdEditor
            v-model="text"
            theme="light"
            previewTheme="default"
            :preview="false"
            :showCodeRowNumber="true"
            codeTheme="github"
            @onSave="handleSave"
            :onUploadImg="onUploadImg"
            :toolbars="toolbars"
        />
      </main>

      <!-- 右侧大纲 -->
      <aside class="sidebar-right" :class="{ active: showTOC && showEditor && currentFileType === 'md' }">
        <div class="toc-header">
          <span><el-icon><Menu/></el-icon> {{ t('noteEditor.outline') }}</span>
          <el-icon style="cursor:pointer; color:#999" @click="toggleTOC">
            <Close/>
          </el-icon>
        </div>
        <ul class="toc-list">
          <li
              v-for="(item, index) in tocItems"
              :key="index"
              class="toc-item"
              :class="['toc-h' + item.level, { current: currentTocIndex === index }]"
              @click="scrollToHeading(index)"
          >
            {{ item.text }}
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, nextTick, watch} from 'vue'
import { t } from '@/i18n'
import {ElMessage, ElMessageBox} from 'element-plus'
import {
  Plus, Menu, Close, Edit, View, ArrowLeft, Check, Clock, Delete, ArrowRight, DocumentCopy
} from '@element-plus/icons-vue'
import {TauriFileManager} from '@/utils/tauri'
import {join, appDataDir} from '@tauri-apps/api/path'
import {readTextFile, writeTextFile, readFile, writeFile, exists, mkdir, remove, rename} from '@tauri-apps/plugin-fs'
import {markdownToHtml} from '@/utils/markdown'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import {Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel} from 'docx'
import {MdEditor} from 'md-editor-v3'

const text = ref('# Hello md-editor-v3 👋\n\n- 支持实时预览\n- 支持图片上传\n- 支持快捷键（如 Ctrl+S 保存）')
/*
 'bold',
  'underline',
  'italic',
  'strikeThrough',
  'title',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  'revoke',
  'next',
  'save',
  'prettier',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'previewOnly',
  'htmlPreview',
  '-',
  'github',
  '=',
  'catalog',
  */
const toolbars = [
  'bold',
  'underline',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  'codeRow',
  'code',
  '-',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  '-',
  'revoke',
  'next',
  // 'save',
  'prettier',

  '=',
  'fullscreen',
  'preview',
  'previewOnly',
  'catalog',
  'xxx',
]
/*编辑器主题*/
const previewThemes = [
  'default',
  'github',
  'vuepress',
  'mk-cute',
  'smart-blue',
  'cyanosis',
  'arknights'
]

function handleSave(v, html) {
  localStorage.setItem('post.md', v)
}

const onUploadImg = async (files, callback) => {
  // 示例：本地预览；生产中应将 files 上传到服务器后返回可访问的 URL 列表
  const urls = files.map((f) => URL.createObjectURL(f))
  callback(urls)
}

onMounted(() => {
  const cached = localStorage.getItem('post.md')
  if (cached) text.value = cached
})
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

// 应用 CSS 变量
onMounted(() => {
  const root = document.documentElement
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  loadNotesTree()
})

// 状态管理
const notesTree = ref({folders: [], files: []})
const expandedFolders = ref(new Set())
const selectedFolderKey = ref(null)
const currentFolderName = ref('')
const showEditor = ref(false)
const showTOC = ref(false)
const selectedFile = ref(null)
const statusText = ref(t('noteEditor.ready'))
const fileInputRef = ref(null)
const currentFileType = ref('md')
const noteContent = ref('')
const wordContent = ref('<p></p>')
const excelData = ref([])
const excelColumns = ref([])
const excelSheetName = ref('Sheet1')
const excelWorkbook = ref(null)
const folderFilesCache = ref(new Map())
const tocItems = ref([])
const currentTocIndex = ref(0)
const wordEditorRef = ref(null)
const editorTextarea = ref(null)

// Markdown 预览
const markdownPreview = computed(() => {
  if (!noteContent.value || currentFileType.value !== 'md') return ''
  try {
    // markdownToHtml 接受 (content, noteName) 两个参数
    const noteName = selectedFile.value?.name || selectedFile.value?.title || ''
    return markdownToHtml(noteContent.value, noteName)
  } catch (error) {
    return '<p>' + t('noteEditor.previewError') + '</p>'
  }
})

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
  if (folder.path) {
    // 使用相对路径作为键
    return folder.path.replace(/\\/g, '/')
  }
  return folder.name || ''
}

// 获取子文件夹
const getSubFolders = (folder) => {
  if (!notesTree.value || !notesTree.value.folders) return []
  const folderKey = getFolderKey(folder)
  return notesTree.value.folders.filter(f => f.parent === folderKey)
}

// 加载笔记树
const loadNotesTree = async () => {
  try {
    const appDir = await appDataDir()
    const notesDir = await join(appDir, 'notes')

    // 确保目录存在
    if (!(await exists(notesDir))) {
      await mkdir(notesDir, {recursive: true})
    }

    // 读取根目录
    const result = await TauriFileManager.readDirectoryContent(notesDir, null, false)

    const folders = []
    if (result.directories && Array.isArray(result.directories)) {
      for (const dir of result.directories) {
        folders.push({
          name: dir.name,
          path: dir.path || await join(notesDir, dir.name),
          type: 'folder',
          parent: null
        })
      }
    }

    notesTree.value = {folders, files: []}

    // 如果有文件夹，默认展开第一个
    if (folders.length > 0) {
      const firstFolder = folders[0]
      const firstKey = getFolderKey(firstFolder)
      expandedFolders.value.add(firstKey)
      selectedFolderKey.value = firstKey
      currentFolderName.value = firstFolder.name
      await loadFolderFiles(firstFolder)
    }

    updateStatus(t('noteEditor.loadComplete'))
  } catch (error) {
    ElMessage.error(t('noteEditor.loadTreeFailed'))
  }
}

// 加载文件夹内的文件
const loadFolderFiles = async (folder) => {
  try {
    const result = await TauriFileManager.readDirectoryContent(folder.path, null, false)

    const files = []
    const subFolders = []

    const supportedExtensions = ['.md', '.txt', '.docx', '.xlsx']

    // 处理子文件夹
    if (result.directories && Array.isArray(result.directories)) {
      const parentKey = getFolderKey(folder)
      for (const dir of result.directories) {
        const subFolderPath = dir.path || await join(folder.path, dir.name)
        subFolders.push({
          name: dir.name,
          path: subFolderPath,
          type: 'folder',
          parent: parentKey
        })
      }
    }

    // 处理文件
    if (result.files && Array.isArray(result.files)) {
      for (const fileEntry of result.files) {
        const fileName = fileEntry.name
        const ext = supportedExtensions.find(e => fileName.endsWith(e))
        if (ext) {
          const noteName = fileName.replace(ext, '')
          const path = fileEntry.path || await join(folder.path, fileName)
          let title = noteName

          // 只对文本文件尝试读取标题
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

          files.push({
            name: noteName,
            title,
            path,
            type: 'file',
            extension: ext.replace('.', ''),
            modified: fileEntry.modified ? new Date(fileEntry.modified) : new Date(),
            size: fileEntry.size || 0,
            folder: folder.name
          })
        }
      }
    }

    // 排序：按修改时间倒序
    files.sort((a, b) => {
      const timeDiff = new Date(b.modified) - new Date(a.modified)
      if (Math.abs(timeDiff) > 1000) {
        return timeDiff
      }
      return (a.name || a.title).localeCompare(b.name || b.title, 'zh-CN', {numeric: true})
    })

    const folderKey = getFolderKey(folder)
    folderFilesCache.value.set(folderKey, files)

    // 如果有子文件夹，添加到文件夹树中
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
  showEditor.value = false
  selectedFile.value = null

  // 如果缓存中没有，加载文件
  if (!folderFilesCache.value.has(folderKey)) {
    await loadFolderFiles(folder)
  }

  updateStatus(t('noteEditor.switchedToFolder', { name: folder.name }))
}

const handleLoadSubFolders = async (folder) => {
  await loadFolderFiles(folder)
}

const handleFolderCommand = (command, folder) => {
  if (command === 'create-note') {
    createNewNoteInFolder(folder)
  }
}

const createFolder = async (parentFolder) => {
  try {
    const {value: name} = await ElMessageBox.prompt(t('noteEditor.newFolderPrompt'), t('noteEditor.newFolderTitle'), {
      confirmButtonText: t('noteEditor.confirm'),
      cancelButtonText: t('noteEditor.cancel'),
      inputValue: t('noteEditor.newFolderDefault')
    })

    if (name && name.trim()) {
      const appDir = await appDataDir()
      const notesDir = await join(appDir, 'notes')

      let parentPath = notesDir
      let parentKey = null

      if (parentFolder) {
        parentPath = parentFolder.path
        parentKey = getFolderKey(parentFolder)
      } else if (selectedFolderKey.value) {
        // 使用当前选中的文件夹
        const currentFolder = notesTree.value.folders.find(f => getFolderKey(f) === selectedFolderKey.value)
        if (currentFolder) {
          parentPath = currentFolder.path
          parentKey = selectedFolderKey.value
        }
      }

      const newFolderPath = await join(parentPath, name.trim())

      // 创建文件夹
      if (!(await exists(newFolderPath))) {
        await mkdir(newFolderPath, {recursive: true})
      }

      const newFolder = {
        name: name.trim(),
        path: newFolderPath,
        type: 'folder',
        parent: parentKey
      }

      notesTree.value.folders.push(newFolder)

      // 初始化空文件列表
      const newKey = getFolderKey(newFolder)
      folderFilesCache.value.set(newKey, [])

      // 如果是在父文件夹下创建，展开父文件夹
      if (parentFolder) {
        expandedFolders.value.add(parentKey)
      } else if (selectedFolderKey.value) {
        expandedFolders.value.add(selectedFolderKey.value)
      }

      updateStatus(t('noteEditor.folderCreateSuccess'))
    }
  } catch (error) {
    // 用户取消
  }
}

const renameFolder = async (folder) => {
  try {
    const {value: newName} = await ElMessageBox.prompt(t('noteEditor.renameFolderPrompt'), t('noteEditor.renameFolderTitle'), {
      confirmButtonText: t('noteEditor.confirm'),
      cancelButtonText: t('noteEditor.cancel'),
      inputValue: folder.name
    })

    if (newName && newName.trim() && newName !== folder.name) {
      const newPath = await join(await appDataDir(), 'notes', newName.trim())

      // 重命名文件夹
      await rename(folder.path, newPath)

      // 更新文件夹树
      folder.name = newName.trim()
      folder.path = newPath

      if (selectedFolderKey.value === getFolderKey(folder)) {
        currentFolderName.value = newName.trim()
        selectedFolderKey.value = getFolderKey(folder)
      }

      updateStatus(t('noteEditor.renameSuccess'))
    }
  } catch (error) {
    ElMessage.error(t('noteEditor.renameFailed'))
  }
}

const deleteFolder = async (folder) => {
  try {
    await ElMessageBox.confirm(t('noteEditor.confirmDeleteFolder'), t('noteEditor.confirmDeleteTitle'), {
      confirmButtonText: t('noteEditor.confirm'),
      cancelButtonText: t('noteEditor.cancel'),
      type: 'warning'
    })

    // 删除文件夹
    await remove(folder.path, {recursive: true})

    // 从文件夹树中移除
    notesTree.value.folders = notesTree.value.folders.filter(f => f.path !== folder.path)

    // 删除文件数据缓存
    const folderKey = getFolderKey(folder)
    folderFilesCache.value.delete(folderKey)
    expandedFolders.value.delete(folderKey)

    // 如果删除的是当前选中的文件夹，切换到第一个文件夹
    if (selectedFolderKey.value === folderKey) {
      if (rootFolders.value.length > 0) {
        await selectFolder(rootFolders.value[0])
      } else {
        selectedFolderKey.value = null
        currentFolderName.value = ''
      }
    }

    updateStatus(t('noteEditor.folderDeleted'))
  } catch (error) {
    ElMessage.error(t('noteEditor.deleteFailed'))
  }
}

// 文件操作
const openFile = async (file) => {
  try {
    selectedFile.value = file
    showEditor.value = true
    showTOC.value = false

    const ext = file.extension || getFileExtension(file)
    currentFileType.value = ext.toLowerCase() || 'md'

    // 根据文件类型加载内容
    if (ext === 'md' || ext === 'txt') {
      noteContent.value = await readTextFile(file.path)
      // extractTOC 会通过 watch 自动触发
    } else if (ext === 'xlsx') {
      await loadExcelFile(file)
    } else if (ext === 'docx') {
      await loadWordFile(file)
    }

    updateStatus(t('noteEditor.editing', { name: file.name || file.title }))
  } catch (error) {
    ElMessage.error(t('noteEditor.openFileFailed'))
  }
}

const getFileExtension = (file) => {
  if (!file || !file.name) return ''
  const match = file.name.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

const backToList = () => {
  showEditor.value = false
  showTOC.value = false
  selectedFile.value = null
  updateStatus(t('noteEditor.backToList'))
}

const saveNote = async () => {
  if (!selectedFile.value) return

  try {
    const ext = currentFileType.value

    if (ext === 'md' || ext === 'txt') {
      await writeTextFile(selectedFile.value.path, noteContent.value)
      updateStatus(t('noteEditor.saveSuccess'))
    } else if (ext === 'xlsx') {
      await saveExcelFile()
    } else if (ext === 'docx') {
      await saveWordFile()
    }
  } catch (error) {
    ElMessage.error(t('noteEditor.saveFailed'))
  }
}

const showFileMenu = (event, file) => {
  event.stopPropagation()
  ElMessageBox.confirm(
      t('noteEditor.fileOperationMsg', { name: file.name || file.title }),
      t('noteEditor.fileOperation'),
      {
        distinguishCancelAndClose: true,
        confirmButtonText: t('noteEditor.renameBtn'),
        cancelButtonText: t('noteEditor.deleteBtn'),
        type: 'info'
      }
  ).then(() => {
    // 重命名
    ElMessageBox.prompt(t('noteEditor.renameFilePrompt'), t('noteEditor.renameFileTitle'), {
      confirmButtonText: t('noteEditor.confirm'),
      cancelButtonText: t('noteEditor.cancel'),
      inputValue: file.name || file.title
    }).then(async ({value}) => {
      try {
        const ext = file.extension || getFileExtension(file)
        const newFileName = value + (ext ? '.' + ext : '')
        const newPath = await join(await appDataDir(), 'notes', file.folder || '', newFileName)
        await rename(file.path, newPath)

        // 更新文件信息
        file.name = value
        file.path = newPath

        updateStatus(t('noteEditor.fileRenamed'))
      } catch (error) {
        ElMessage.error(t('noteEditor.renameFailed'))
      }
    })
  }).catch((action) => {
    if (action === 'cancel') {
      // 删除
      ElMessageBox.confirm(t('noteEditor.confirmDeleteFile', { name: file.name || file.title }), t('noteEditor.confirmDeleteTitle'), {
        confirmButtonText: t('noteEditor.confirm'),
        cancelButtonText: t('noteEditor.cancel'),
        type: 'warning'
      }).then(async () => {
        try {
          await remove(file.path)

          // 从文件列表中移除
          const folderKey = selectedFolderKey.value
          const files = folderFilesCache.value.get(folderKey) || []
          const index = files.findIndex(f => f.path === file.path)
          if (index > -1) {
            files.splice(index, 1)
            folderFilesCache.value.set(folderKey, files)
          }

          updateStatus(t('noteEditor.fileDeleted'))
        } catch (error) {
          ElMessage.error(t('noteEditor.deleteFailed'))
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
    ElMessage.success(t('noteEditor.importSimulate', { name: files[0].name }))
  }
}

const triggerExport = () => {
  ElMessage.info(t('noteEditor.exportSimulate'))
}

const createNewNote = async () => {
  if (!selectedFolderKey.value) {
    ElMessage.warning(t('noteEditor.selectFolderFirst'))
    return
  }

  try {
    const {value: name} = await ElMessageBox.prompt(t('noteEditor.newNotePrompt'), t('noteEditor.newNoteTitle'), {
      confirmButtonText: t('noteEditor.confirm'),
      cancelButtonText: t('noteEditor.cancel'),
      inputValue: t('noteEditor.newNoteDefault')
    })

    if (name) {
      const currentFolder = notesTree.value.folders.find(f => getFolderKey(f) === selectedFolderKey.value)
      if (!currentFolder) return

      const filePath = await join(currentFolder.path, name + '.md')

      // 创建文件
      await writeTextFile(filePath, '# ' + name + '\n\n')

      // 刷新文件列表
      await loadFolderFiles(currentFolder)

      // 打开文件
      const files = folderFilesCache.value.get(selectedFolderKey.value) || []
      const newFile = files.find(f => f.path === filePath)
      if (newFile) {
        await openFile(newFile)
      }
    }
  } catch (error) {
    ElMessage.error(t('noteEditor.createNoteFailed'))
  }
}

const createNewNoteInFolder = async (folder) => {
  // 类似 createNewNote，但在指定文件夹中创建
  await createNewNote()
}

// Markdown 相关 - TOC 提取
const extractTOC = () => {
  const lines = noteContent.value.split('\n')
  const toc = []
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      toc.push({
        level: match[1].length,
        text: match[2].trim(),
        index
      })
    }
  })
  tocItems.value = toc
}

// 监听 Markdown 内容变化，更新 TOC
watch(() => noteContent.value, () => {
  if (currentFileType.value === 'md') {
    extractTOC()
  }
}, {immediate: true})

// Word 相关
const loadWordFile = async (file) => {
  try {
    const fileData = await readFile(file.path)

    let arrayBuffer
    if (fileData instanceof Uint8Array) {
      arrayBuffer = fileData.buffer
    } else if (fileData instanceof ArrayBuffer) {
      arrayBuffer = fileData
    } else {
      arrayBuffer = new Uint8Array(fileData).buffer
    }

    const result = await mammoth.convertToHtml({arrayBuffer})
    wordContent.value = result.value || '<p></p>'
    noteContent.value = ''
  } catch (error) {
    wordContent.value = '<p></p>'
    ElMessage.warning(t('noteEditor.wordEmpty'))
  }
}

const saveWordFile = async () => {
  try {
    if (!wordEditorRef.value) return

    const html = wordEditorRef.value.innerHTML
    const paragraphs = htmlToDocxParagraphs(html)

    const doc = new DocxDocument({
      sections: [{
        children: paragraphs
      }]
    })

    const blob = await Packer.toBlob(doc)
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    await writeFile(selectedFile.value.path, uint8Array)
    updateStatus(t('noteEditor.saveSuccess'))
  } catch (error) {
    ElMessage.error(t('noteEditor.saveFailed'))
  }
}

const htmlToDocxParagraphs = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const paragraphs = []

  const walkNodes = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim()
      if (text) {
        return new TextRun({text})
      }
      return null
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase()
      if (tagName === 'p') {
        const children = Array.from(node.childNodes).map(walkNodes).filter(Boolean)
        if (children.length > 0) {
          paragraphs.push(new Paragraph({children}))
        }
      } else if (tagName === 'h1') {
        paragraphs.push(new Paragraph({
          text: node.textContent,
          heading: HeadingLevel.HEADING_1
        }))
      } else if (tagName === 'h2') {
        paragraphs.push(new Paragraph({
          text: node.textContent,
          heading: HeadingLevel.HEADING_2
        }))
      } else if (tagName === 'strong' || tagName === 'b') {
        return new TextRun({text: node.textContent, bold: true})
      } else if (tagName === 'em' || tagName === 'i') {
        return new TextRun({text: node.textContent, italics: true})
      } else {
        const children = Array.from(node.childNodes).map(walkNodes).filter(Boolean)
        if (children.length > 0) {
          return children
        }
      }
    }
    return null
  }

  walkNodes(doc.body)

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({text: ''}))
  }

  return paragraphs
}

const formatWordText = (command, value = null) => {
  if (!wordEditorRef.value) return
  document.execCommand(command, false, value)
  wordEditorRef.value.focus()
}

const handleWordContentChange = () => {
  if (wordEditorRef.value) {
    wordContent.value = wordEditorRef.value.innerHTML
  }
}

const handleContentChange = () => {
  // 内容变化处理
}

// Excel 相关
const loadExcelFile = async (file) => {
  try {
    const fileData = await readFile(file.path)
    const workbook = XLSX.read(fileData, {type: 'array'})

    const firstSheetName = workbook.SheetNames[0]
    excelSheetName.value = firstSheetName
    const worksheet = workbook.Sheets[firstSheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''})

    let maxCols = 0
    jsonData.forEach(row => {
      if (row.length > maxCols) {
        maxCols = row.length
      }
    })

    jsonData.forEach(row => {
      while (row.length < maxCols) {
        row.push('')
      }
    })

    const defaultRows = 20
    const defaultCols = 20

    if (jsonData.length === 0 || maxCols === 0) {
      maxCols = Math.max(maxCols, defaultCols)
      for (let i = 0; i < defaultRows; i++) {
        if (!jsonData[i]) {
          jsonData.push(Array(maxCols).fill(''))
        } else {
          while (jsonData[i].length < maxCols) {
            jsonData[i].push('')
          }
        }
      }
    } else {
      while (jsonData.length < defaultRows) {
        jsonData.push(Array(maxCols).fill(''))
      }
      if (maxCols < defaultCols) {
        maxCols = defaultCols
        jsonData.forEach(row => {
          while (row.length < maxCols) {
            row.push('')
          }
        })
      }
    }

    excelData.value = jsonData
    excelColumns.value = Array(maxCols).fill(0).map((_, i) => i)
    excelWorkbook.value = workbook
    noteContent.value = ''
  } catch (error) {
    const defaultRows = 20
    const defaultCols = 20
    excelData.value = Array(defaultRows).fill(0).map(() => Array(defaultCols).fill(''))
    excelColumns.value = Array(defaultCols).fill(0).map((_, i) => i)
    excelSheetName.value = 'Sheet1'
    excelWorkbook.value = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData.value)
    XLSX.utils.book_append_sheet(excelWorkbook.value, ws, excelSheetName.value)
  }
}

const saveExcelFile = async () => {
  try {
    const ws = XLSX.utils.aoa_to_sheet(excelData.value)

    if (!excelWorkbook.value) {
      excelWorkbook.value = XLSX.utils.book_new()
    }

    // 更新或添加工作表
    if (excelWorkbook.value.SheetNames.includes(excelSheetName.value)) {
      excelWorkbook.value.Sheets[excelSheetName.value] = ws
    } else {
      XLSX.utils.book_append_sheet(excelWorkbook.value, ws, excelSheetName.value)
    }

    const excelBuffer = XLSX.write(excelWorkbook.value, {type: 'array', bookType: 'xlsx'})
    await writeFile(selectedFile.value.path, new Uint8Array(excelBuffer))
    updateStatus(t('noteEditor.saveSuccess'))
  } catch (error) {
    ElMessage.error(t('noteEditor.saveFailed'))
  }
}

const handleExcelCellChange = () => {
  // 单元格变化处理
}

const getColumnName = (colIndex) => {
  let result = ''
  let num = colIndex
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }
  return result
}

// 工具函数
const toggleTOC = () => {
  showTOC.value = !showTOC.value
}

const updateStatus = (msg) => {
  statusText.value = msg
  setTimeout(() => {
    if (statusText.value === msg) {
      statusText.value = t('noteEditor.ready')
    }
  }, 3000)
}

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
    return t('noteEditor.yesterday')
  } else if (days < 7) {
    return t('noteEditor.daysAgo', { days })
  } else {
    return date.toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'})
  }
}

const handleKeydown = (event) => {
  // Ctrl+S 保存
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    saveNote()
  }
  // Tab 键插入两个空格（仅Markdown和TXT）
  if (event.key === 'Tab' && (currentFileType.value === 'md' || currentFileType.value === 'txt')) {
    event.preventDefault()
    const textarea = event.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = noteContent.value
    noteContent.value = text.substring(0, start) + '  ' + text.substring(end)
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
      textarea.focus()
    })
  }
}

const insertImage = () => {
  ElMessage.info(t('noteEditor.insertImageDev'))
}

const scrollToHeading = (index) => {
  currentTocIndex.value = index
  // 滚动到对应标题的逻辑
}

// 监听文件内容变化，自动保存（可选）
// watch(noteContent, debounce(() => {
//   if (selectedFile.value && autoSave.value) {
//     saveNote()
//   }
// }, 2000))
</script>

<style scoped>
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
  --danger-color: #e74c3c;
  --success-color: #2ecc71;
  --icon-folder: #f1c40f;
  --icon-md: #3498db;
  --icon-word: #2980b9;
  --icon-excel: #27ae60;
  --icon-txt: #95a5a6;
}

.md-editor {
  height: calc(100vh - 82px);
}

.notes2-page {
  //height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "PingFang SC";
  color: var(--text-primary);
  background-color: var(--bg-body);
}

/* ignore */
.header {
  height: 50px;
  background-color: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.app-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.breadcrumb {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: #f0f2f5;
  padding: 4px 10px;
  border-radius: 4px;
}

.header-actions .btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: white;
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
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ignore */
.sidebar-left {
  width: 260px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  user-select: none;
}

.sidebar-toolbar {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
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
  flex: 1;
  padding-bottom: 20px;
  margin: 0;
  padding-left: 0;
}

/* ignore */
.tree-item-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary);
  border-left: 3px solid transparent;
}

.tree-item-wrapper:hover {
  background-color: var(--hover-bg);
}

.tree-item-wrapper.active {
  background-color: #e1f0fa;
  color: var(--accent-color);
  border-left-color: var(--accent-color);
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

.folder-actions .el-icon {
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: 0.2s;
  cursor: pointer;
  margin: 0 2px;
}

.folder-actions .el-icon:hover {
  color: var(--accent-color);
  transform: scale(1.1);
}

.folder-actions .el-icon.del:hover {
  color: var(--danger-color);
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
  background-color: var(--bg-content);
  display: flex;
  flex-direction: column;
  position: relative;
  //height: 100vh;
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
  background: #fff;
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
.file-list-view {
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  grid-auto-rows: min-content;
  gap: 20px;
  flex: 1;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  justify-content: center;
  min-height: 120px;
}

.file-card:hover {
  background-color: var(--hover-bg);
  border-color: var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-card.active {
  background-color: #e1f0fa;
  border-color: var(--accent-color);
}

.file-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
  pointer-events: none;
  display: block;
  text-align: center;
}

.file-name {
  font-size: 0.9rem;
  text-align: center;
  word-break: break-all;
  line-height: 1.4;
  margin-bottom: 4px;
  pointer-events: none;
}

.file-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  pointer-events: none;
}

/* ignore */
.card-menu-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
}

.card-menu-btn:hover {
  background: #dcdcdc;
  color: #333;
}

.file-card:hover .card-menu-btn {
  display: flex;
}

.empty-folder {
  grid-column: 1/-1;
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

/* ignore */
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-color);
  background: #fafbfc;
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
  align-items: center;
}

.editor-toolbar .btn {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.editor-toolbar .btn:hover {
  background: var(--hover-bg);
}

.editor-toolbar .el-icon {
  color: var(--text-secondary);
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
}

.editor-toolbar .el-icon:hover {
  background: #e1e4e8;
  color: #333;
}

/* ignore */
.markdown-editor {
  width: 100%;
  height: 100%;
  padding: 40px 60px;
  border: none;
  outline: none;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.8;
  resize: none;
  background: #fff;
}

/* ignore */
.split-editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.split-editor-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
}

.split-editor-right {
  flex: 1;
  overflow-y: auto;
  background: #fafbfc;
  padding: 40px 60px;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.markdown-preview {
  line-height: 1.8;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2) {
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-preview :deep(code) {
  background: rgba(27, 31, 35, .05);
  border-radius: 3px;
  font-size: 85%;
  margin: 0;
  padding: 0.2em 0.4em;
}

/* ignore */
.excel-editor {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.excel-table-wrapper {
  flex: 1;
  overflow: auto;
}

.excel-table {
  border-collapse: collapse;
  width: 100%;
}

.excel-row-header {
  background: #f5f7fa;
  border: 1px solid var(--border-color);
  padding: 8px;
  font-weight: 600;
  text-align: center;
  min-width: 50px;
  position: sticky;
  left: 0;
  z-index: 1;
}

.excel-corner {
  position: sticky;
  top: 0;
  z-index: 2;
}

.excel-col-header {
  background: #f5f7fa;
  border: 1px solid var(--border-color);
  padding: 8px;
  font-weight: 600;
  text-align: center;
  min-width: 80px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.excel-cell {
  border: 1px solid var(--border-color);
  padding: 0;
  position: relative;
}

.excel-cell-input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 8px;
  font-size: 14px;
  background: transparent;
}

.excel-cell-input:focus {
  background: #fff;
  box-shadow: inset 0 0 0 2px var(--accent-color);
}

/* ignore */
.word-editor {
  flex: 1;
  overflow: hidden;
}

.word-editor-content {
  flex: 1;
  padding: 40px 60px;
  overflow-y: auto;
  line-height: 1.8;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  outline: none;
  min-height: 100%;
}

.word-editor-content:focus {
  outline: none;
}

/* ignore */
.sidebar-right {
  width: 0;
  background-color: var(--bg-sidebar);
  border-left: 0 solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  opacity: 0;
}

.sidebar-right.active {
  width: 240px;
  border-left-width: 1px;
  opacity: 1;
}

.toc-header {
  padding: 15px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
}

.toc-list {
  list-style: none;
  padding: 15px;
  overflow-y: auto;
  margin: 0;
}

.toc-item {
  padding: 4px 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  border-left: 2px solid transparent;
  padding-left: 10px;
  margin-bottom: 4px;
  transition: color 0.2s;
}

.toc-item:hover {
  color: var(--accent-color);
}

.toc-item.current {
  color: var(--accent-color);
  border-left-color: var(--accent-color);
  font-weight: 500;
}

.editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.editor-header-bar {
  padding: 8px 12px;
  background: #f5f7fa;
}

.editor-top-toolbar {
  padding: 8px 16px 8px 12px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.editor-top-toolbar .toolbar-left,
.editor-top-toolbar .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>