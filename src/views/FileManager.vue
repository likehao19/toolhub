<template>
  <div class="file-manager">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="breadcrumb">
        <el-breadcrumb separator="/" v-if="currentPath">
          <el-breadcrumb-item 
            v-if="currentPath.includes('\\')"
            @click="goToPath(currentPath.split('\\')[0] + '\\')"
            style="cursor: pointer;"
          >
            计算机
          </el-breadcrumb-item>
          <el-breadcrumb-item
            v-for="crumb in breadcrumbs"
            :key="crumb.path"
            @click="goToPath(crumb.path)"
            style="cursor: pointer;"
          >
            {{ crumb.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div v-else class="breadcrumb-empty">文件管理器</div>
      </div>
      <div class="toolbar-actions">
        <el-button size="small" @click="selectDirectory" type="primary">
          <el-icon><FolderOpened /></el-icon>
          选择目录
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" @click="goBack" :disabled="!canGoBack" title="后退">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-button size="small" @click="goForward" :disabled="!canGoForward" title="前进">
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button size="small" @click="goUp" :disabled="!parentPath" title="向上">
          <el-icon><Top /></el-icon>
        </el-button>
        <el-button size="small" @click="refresh" :disabled="!currentPath">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-input
          v-model="searchQuery"
          placeholder="搜索文件..."
          size="small"
          clearable
          :disabled="!currentPath"
          style="width: 200px; margin-left: 10px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content">
      <!-- 左侧目录树 -->
      <div class="sidebar">
        <div class="sidebar-header">文件夹</div>
        <div class="tree-container">
          <el-tree
            :key="treeKey"
            :data="treeData"
            :props="treeProps"
            node-key="path"
            :expand-on-click-node="false"
            :default-expanded-keys="expandedKeys"
            :highlight-current="true"
            @node-click="handleTreeNodeClick"
            lazy
            :load="loadTreeNode"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <span class="node-icon">📁</span>
                <span class="node-label">{{ data.name }}</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 右侧文件列表 -->
      <div class="file-list-container">
        <!-- 空状态 -->
        <div v-if="!currentPath" class="empty-state">
          <div class="empty-icon">📁</div>
          <div class="empty-title">请选择要浏览的文件夹</div>
          <div class="empty-description">点击左上角"选择目录"按钮开始浏览文件</div>
          <el-button type="primary" size="large" @click="selectDirectory" style="margin-top: 20px">
            <el-icon><FolderOpened /></el-icon>
            选择目录
          </el-button>
        </div>

        <!-- 文件列表 -->
        <template v-else>
          <!-- 状态栏 -->
          <div class="status-bar">
            <el-space>
              <el-tag size="small" type="info">
                <el-icon><Folder /></el-icon>
                {{ directories.length }} 个文件夹
              </el-tag>
              <el-tag size="small" type="primary">
                <el-icon><Document /></el-icon>
                {{ files.length }} 个文件
              </el-tag>
              <el-tag size="small" type="success">
                <el-icon><Timer /></el-icon>
                加载耗时: {{ rustDuration }}ms
              </el-tag>
            </el-space>
          </div>

          <!-- 列表头部 -->
          <div class="file-list-header">
            <div class="header-icon">图标</div>
            <div class="header-name">文件名</div>
            <div class="header-type">类型</div>
            <div class="header-size">大小</div>
          </div>

          <!-- 虚拟滚动列表 -->
          <div class="file-list" v-loading="loading">
            <div v-if="filteredItems.length === 0 && !loading" class="empty-file-list">
              <div class="empty-file-icon">📂</div>
              <div class="empty-file-text">当前文件夹为空</div>
              <div class="empty-file-hint">没有文件或文件夹</div>
            </div>
            <virtual-list
              v-else
              :data-key="'path'"
              :data-sources="filteredItems"
              :data-component="FileItem"
              :estimate-size="52"
              :item-class="'file-item-wrapper'"
              ref="virtualListRef"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- 文件预览抽屉 -->
    <FilePreview
      v-model="showPreview"
      :file-path="previewFile.path"
      :file-name="previewFile.name"
      :file-extension="previewFile.extension"
      @saved="handleFileSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, h } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Top, Refresh, Search, FolderOpened, Folder, Document, Timer } from '@element-plus/icons-vue'
import VirtualList from 'vue3-virtual-scroll-list'
import FilePreview from '@/components/FilePreview.vue'
import * as FileManagerAPI from '@/utils/tauri/fileManager'
import * as TauriDialog from '@/utils/tauri/dialog'

// 本地存储键名
const STORAGE_KEY = 'file-manager-last-path'

// 数据
const currentPath = ref('')
const directories = ref([])
const files = ref([])
const loading = ref(false)
const rustDuration = ref(0)
const searchQuery = ref('')
const selectedItems = ref([])
const history = ref([])
const historyIndex = ref(-1)

// 树相关
const treeData = ref([])
const expandedKeys = ref([])
const treeKey = ref(0) // 用于强制重新渲染树
const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: (data) => !data.is_dir
}

// 文件预览相关
const showPreview = ref(false)
const previewFile = ref({
  path: '',
  name: '',
  extension: ''
})

// 方法
const loadDirectory = async (path) => {
  loading.value = true
  try {
    const result = await FileManagerAPI.readDirectoryContent(path)
    directories.value = result.directories || []
    files.value = result.files || []
    rustDuration.value = result.rust_duration_ms || 0
  } catch (error) {
    const errorMsg = error.message || String(error)
    
    // 特殊处理常见错误
    if (errorMsg.includes('权限') || errorMsg.includes('permission') || errorMsg.includes('denied')) {
      ElMessage.error('没有权限访问此目录，请检查目录权限设置')
    } else if (errorMsg.includes('不存在') || errorMsg.includes('not found')) {
      ElMessage.error('目录不存在，可能已被删除或移动')
      // 尝试返回上一级
      if (parentPath.value) {
        goToPath(parentPath.value)
      }
    } else {
      ElMessage.error('读取目录失败: ' + errorMsg)
    }
    
    // 清空列表
    directories.value = []
    files.value = []
  } finally {
    loading.value = false
  }
}

// 刷新目录树
const refreshTree = async () => {
  if (!currentPath.value) {
    treeData.value = []
    // 强制重新渲染树
    treeKey.value++
    return
  }

  try {
    // 设置当前路径为展开状态
    if (!expandedKeys.value.includes(currentPath.value)) {
      expandedKeys.value.push(currentPath.value)
    }
    // 强制重新渲染树，让懒加载重新触发
    treeKey.value++
  } catch (error) {
    treeData.value = []

    // 即使出错也要强制重新渲染
    treeKey.value++
  }
}

const goToPath = async (path) => {
  if (!path || path === currentPath.value) return
  
  try {
    // 更新历史记录（在切换路径之前）
    if (historyIndex.value < history.value.length - 1) {
      // 如果不在历史记录末尾，截断后面的记录
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    
    // 添加新路径到历史记录
    history.value.push(path)
    historyIndex.value = history.value.length - 1
    
    // 更新当前路径
    currentPath.value = path

    // 保存到本地存储
    localStorage.setItem(STORAGE_KEY, path)

    // 加载文件列表
    await loadDirectory(path)
    
    // 只更新树节点选中状态，保持展开状态不变
    // 不调用 refreshTree()，避免重新加载树结构
    if (!expandedKeys.value.includes(path)) {
      expandedKeys.value.push(path)
    }
  } catch (error) {

    ElMessage.error('切换路径失败: ' + (error.message || String(error)))
  }
}

// 文件列表项组件（需要访问 goToPath）
const FileItem = {
  name: 'FileItem',
  props: {
    index: Number,
    source: Object
  },
  setup(props) {
    const item = computed(() => props.source)

    const handleClick = () => {
      if (item.value.is_dir) {
        // 文件夹点击 - 进入目录
        goToPath(item.value.path)
      } else {
        // 文件点击 - 打开预览
        openFilePreview(item.value)
      }
    }

    return () => h('div', {
      class: 'file-item-row',
      onClick: handleClick
    }, [
      h('div', { 
        class: ['file-row-icon', item.value.is_dir ? 'folder-icon' : 'file-icon'] 
      }, FileManagerAPI.getFileIcon(item.value)),
      h('div', { 
        class: ['file-row-name', item.value.is_dir ? 'folder-name' : 'file-name'], 
        title: item.value.name 
      }, item.value.name),
      h('div', { class: 'file-row-type' }, [
        h('span', { 
          class: item.value.is_dir ? 'type-folder' : 'type-file'
        },
          item.value.is_dir ? '文件夹' : (item.value.extension ? item.value.extension.toUpperCase() : '文件')
        )
      ]),
      h('div', { class: 'file-row-size' },
        item.value.is_dir ? '-' : (item.value.size ? FileManagerAPI.formatFileSize(item.value.size) : '-')
      )
    ])
  }
}

// 计算属性
const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  return FileManagerAPI.pathToBreadcrumbs(currentPath.value)
})
const parentPath = computed(() => {
  if (!currentPath.value) return null
  return FileManagerAPI.getParentPath(currentPath.value)
})
const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < history.value.length - 1)

const allItems = computed(() => {
  // 合并文件夹和文件，文件夹在前
  const items = [
    ...directories.value.map(dir => ({ ...dir, is_dir: true })),
    ...files.value.map(file => ({ ...file, is_dir: false }))
  ]
  return items
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return allItems.value

  const query = searchQuery.value.toLowerCase()
  return allItems.value.filter(item =>
    item.name.toLowerCase().includes(query)
  )
})

const goBack = async () => {
  if (canGoBack.value && historyIndex.value > 0) {
    historyIndex.value--
    const targetPath = history.value[historyIndex.value]
    
    try {
      currentPath.value = targetPath
      localStorage.setItem(STORAGE_KEY, targetPath)
      await loadDirectory(targetPath)
      // 只更新展开状态，不刷新整个树
      if (!expandedKeys.value.includes(targetPath)) {
        expandedKeys.value.push(targetPath)
      }
    } catch (error) {

      ElMessage.error('后退失败: ' + (error.message || String(error)))
    }
  }
}

const goForward = async () => {
  if (canGoForward.value && historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const targetPath = history.value[historyIndex.value]
    
    try {
      currentPath.value = targetPath
      localStorage.setItem(STORAGE_KEY, targetPath)
      await loadDirectory(targetPath)
      // 只更新展开状态，不刷新整个树
      if (!expandedKeys.value.includes(targetPath)) {
        expandedKeys.value.push(targetPath)
      }
    } catch (error) {

      ElMessage.error('前进失败: ' + (error.message || String(error)))
    }
  }
}

const goUp = () => {
  if (parentPath.value) {
    goToPath(parentPath.value)
  }
}

const refresh = () => {
  if (currentPath.value) {
    loadDirectory(currentPath.value)
  }
}

// 选择目录
const selectDirectory = async () => {
  try {
    const selectedPath = await TauriDialog.selectFolder({
      title: '选择要浏览的文件夹',
      defaultPath: currentPath.value
    })

    if (selectedPath) {
      currentPath.value = selectedPath
      localStorage.setItem(STORAGE_KEY, selectedPath)

      // 加载文件列表
      await loadDirectory(selectedPath)

      // 初始化左侧树
      await refreshTree()

      ElMessage.success('已切换到: ' + selectedPath)
    }
  } catch (error) {
    ElMessage.error('选择目录失败: ' + error)
  }
}

// 树节点懒加载
const loadTreeNode = async (node, resolve) => {
  if (node.level === 0) {
    // 根节点 - 加载当前选择的根路径的父级目录结构
    if (!currentPath.value) {
      resolve([])
      return
    }
    
    try {
      // 获取根路径（Windows: C:\ 或 Linux: /）
      const isWindows = currentPath.value.includes('\\')
      const separator = isWindows ? '\\' : '/'
      const normalizedPath = currentPath.value.replace(/[\/\\]+$/, '')
      const parts = normalizedPath.split(separator).filter(p => p)
      
      if (parts.length === 0) {
        resolve([])
        return
      }
      
      // 构建根路径
      const rootPath = isWindows ? `${parts[0]}${separator}` : separator
      
      // 加载根目录
      const result = await FileManagerAPI.readDirectoryContent(rootPath)
      const rootDirs = (result.directories || []).map(dir => ({
        ...dir,
        children: []
      }))
      
      resolve(rootDirs)
    } catch (error) {

      ElMessage.warning('加载目录树失败: ' + (error.message || String(error)))
      resolve([])
    }
  } else {
    // 加载子目录
    try {
      const result = await FileManagerAPI.readDirectoryContent(node.data.path)
      const childDirs = (result.directories || []).map(dir => ({
        ...dir,
        children: []
      }))
      resolve(childDirs)
    } catch (error) {

      // 不显示错误消息，因为可能是权限问题，静默处理
      resolve([])
    }
  }
}

const handleTreeNodeClick = (data) => {
  if (data.is_dir) {
    goToPath(data.path)
  }
}

// 打开文件预览
const openFilePreview = (file) => {
  previewFile.value = {
    path: file.path,
    name: file.name,
    extension: file.extension
  }
  showPreview.value = true
}

// 文件保存后回调
const handleFileSaved = () => {
  // 可以在这里刷新文件列表或更新文件信息
  ElMessage.success('文件已保存')
}

// 监听路径变化
watch(currentPath, (newPath) => {

})

// 初始化
onMounted(async () => {
  // 从本地存储读取上次的路径
  const lastPath = localStorage.getItem(STORAGE_KEY)
  if (lastPath) {
    try {
      currentPath.value = lastPath
      // 初始化历史记录
      history.value = [lastPath]
      historyIndex.value = 0
      await loadDirectory(lastPath)
      await refreshTree()
    } catch (error) {

      // 如果路径无效，清空存储
      localStorage.removeItem(STORAGE_KEY)
      currentPath.value = ''
      history.value = []
      historyIndex.value = -1
    }
  } else {
    // 初始化空历史记录
    history.value = []
    historyIndex.value = -1
  }
})
</script>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.breadcrumb {
  flex: 1;
}

.breadcrumb-empty {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: var(--bg-primary);
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px 20px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.node-icon {
  font-size: 18px;
  transition: transform 0.2s ease;
}

.node-label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

:deep(.el-tree-node__content:hover) .node-icon {
  transform: scale(1.15);
}

:deep(.el-tree-node__expand-icon) {
  color: #409eff;
  font-weight: bold;
}

.file-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

/* ignore */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #909399;
}

.status-bar {
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

/* ignore */
.file-list-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(to right, #f5f7fa, #fafbfc);
  border-bottom: 2px solid #dcdfe6;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  gap: 0;
  margin: 0;
  box-sizing: border-box;
}

.header-icon {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  flex-shrink: 0;
  flex-grow: 0;
  text-align: center;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.header-name {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 8px;
  margin: 0;
  text-align: left;
  box-sizing: border-box;
}

.header-type {
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  flex-shrink: 0;
  flex-grow: 0;
  text-align: center;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.header-size {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  flex-shrink: 0;
  flex-grow: 0;
  text-align: right;
  padding-right: 10px;
  padding-left: 0;
  margin: 0;
  box-sizing: border-box;
}

.file-list {
  flex: 1;
  overflow: auto;
  background: var(--bg-primary);
}

/* ignore */
.empty-file-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  color: #909399;
}

.empty-file-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-file-text {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.empty-file-hint {
  font-size: 13px;
  color: #909399;
}

.file-item-wrapper {
  padding: 0;
  width: 100%;
  display: block;
}

.file-item-wrapper > * {
  width: 100%;
}

/* ignore */
:deep(.virtual-list-container) {
  width: 100%;
}

:deep(.virtual-list-item) {
  width: 100%;
}

/* ignore */
:deep(.file-item-wrapper) {
  padding: 0 !important;
  width: 100% !important;
  display: block !important;
}

:deep(.file-item-row) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
}

:deep(.file-row-icon),
:deep(.file-row-name),
:deep(.file-row-type),
:deep(.file-row-size) {
  display: inline-flex !important;
  flex-shrink: 0 !important;
}

:deep(.file-row-name) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

/* ignore */
.file-item-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 14px 20px !important;
  cursor: pointer;
  transition: all 0.25s ease;
  border-bottom: 1px solid #f5f7fa;
  background: var(--bg-primary);
  position: relative;
  width: 100% !important;
  box-sizing: border-box;
  gap: 0 !important;
  margin: 0 !important;
}

/* ignore */
.file-item-row > * {
  display: inline-flex !important;
  flex-shrink: 0;
}

.file-item-row:nth-child(even) {
  background: #fafbfc;
}

.file-item-row.folder-row {
  background: linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%);
}

.file-item-row.folder-row:nth-child(even) {
  background: linear-gradient(90deg, #e0f2fe 0%, #fafbfc 100%);
}

.file-item-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: linear-gradient(to bottom, #409eff, #67c23a);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.file-item-row:hover {
  background: #ecf5ff !important;
  box-shadow: inset 0 1px 0 rgba(64, 158, 255, 0.1), inset 0 -1px 0 rgba(64, 158, 255, 0.1);
}

.file-item-row.folder-row:hover {
  background: linear-gradient(90deg, #d9ecff 0%, #ecf5ff 100%) !important;
}

.file-item-row:hover::before {
  opacity: 1;
}

.file-item-row:active {
  transform: scale(0.995);
  background: #d9ecff !important;
}

.file-row-icon {
  font-size: 36px;
  width: 60px !important;
  min-width: 60px !important;
  max-width: 60px !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: transform 0.25s ease;
  padding: 0 !important;
  margin: 0 !important;
  text-align: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.file-row-icon.folder-icon {
  filter: drop-shadow(0 2px 6px rgba(64, 158, 255, 0.3));
}

.file-row-icon.file-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.file-item-row:hover .file-row-icon {
  transform: scale(1.2) rotate(5deg);
}

.file-item-row:hover .file-row-icon.folder-icon {
  transform: scale(1.25) rotate(-5deg);
}

.file-row-name {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  max-width: none !important;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  padding: 0 8px !important;
  display: inline-flex !important;
  align-items: center !important;
  text-align: left;
  gap: 6px;
}

.file-row-name.folder-name {
  font-weight: 600;
  color: #409eff;
}

.file-row-name .dir-indicator {
  font-size: 16px;
  margin-right: 4px;
}

.file-item-row:hover .file-row-name.folder-name {
  color: #66b1ff;
}

.file-row-type {
  width: 150px !important;
  min-width: 150px !important;
  max-width: 150px !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  text-align: center;
}

.file-row-type span {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  transition: all 0.2s ease;
}

.file-row-type .type-folder {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.file-row-type .type-file {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
  box-shadow: 0 2px 6px rgba(103, 194, 58, 0.25);
}

.file-row-size {
  width: 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  font-size: 13px;
  color: #606266;
  text-align: right !important;
  padding-right: 10px !important;
  padding-left: 0 !important;
  margin: 0 !important;
  font-family: "PingFang SC";
  font-weight: 500;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  white-space: nowrap !important;
}

/* ignore */
.tree-container::-webkit-scrollbar,
.file-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tree-container::-webkit-scrollbar-track,
.file-list::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.tree-container::-webkit-scrollbar-thumb,
.file-list::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

.tree-container::-webkit-scrollbar-thumb:hover,
.file-list::-webkit-scrollbar-thumb:hover {
  background: #a8abb2;
}

/* ignore */
:deep(.el-breadcrumb__item) {
  font-weight: 500;
}

:deep(.el-breadcrumb__inner) {
  color: #409eff;
  cursor: pointer;
  transition: color 0.2s;
}

:deep(.el-breadcrumb__inner:hover) {
  color: #66b1ff;
}

:deep(.el-tag) {
  border-radius: 4px;
  font-size: 12px;
}

:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
  margin: 2px 0;
  transition: all 0.2s ease;
  cursor: pointer;
}

:deep(.el-tree-node__content:hover) {
  background-color: #ecf5ff;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #409eff;
  color: white;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) .node-label {
  color: white;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) .node-icon {
  filter: brightness(0) invert(1);
}

/* ignore */
* .file-item-row,
.file-item-row {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
}

* .file-item-row > *,
.file-item-row > * {
  display: inline-flex !important;
}
</style>
