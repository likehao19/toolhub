<template>
  <li class="folder-node">
    <div 
      class="tree-item-wrapper" 
      :class="{ active: selectedFolderKey === getFolderKey(folder), 'drag-over': isDragOver }"
      :data-folder-path="folder.path"
      :draggable="renamingFolderKey !== getFolderKey(folder)"
      @click.stop="selectFolder(folder)"
      @dblclick.stop="toggleFolder(folder)"
      @dragstart="handleDragStart($event, folder, 'folder')"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver($event, folder)"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop($event, folder)"
    >
      <span 
        class="arrow" 
        :class="{ expanded: expandedFolders.has(getFolderKey(folder)) }"
        @click.stop="toggleFolder(folder)"
      >
        <i class="fa-solid fa-caret-right"></i>
      </span>
      <div class="tree-info">
        <i class="fa-solid fa-folder" style="color: #f1c40f;"></i>
        <!-- 正常显示或重命名输入框 -->
        <span v-if="renamingFolderKey !== getFolderKey(folder)">{{ folder.name }}</span>
        <input 
          v-else
          type="text"
          class="rename-input"
          :value="renamingFolderName"
          @input="updateRenamingFolderName"
          @keyup.enter="confirmRenameFolder(folder)"
          @keyup.esc="cancelRenameFolder"
          @blur="confirmRenameFolder(folder)"
          @click.stop
        />
      </div>
      <div class="folder-actions" @click.stop="">
        <el-dropdown trigger="click" @command="(cmd) => handleFolderAction(cmd, folder)">
          <span class="action-dropdown">
            <i class="fa-solid fa-plus" title="新建"></i>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="newFolder">
                <i class="fa-solid fa-folder"></i> 新建子文件夹
              </el-dropdown-item>
              <el-dropdown-item divided command="newMd">
                <i class="fa-solid fa-file-lines"></i> Markdown文件
              </el-dropdown-item>
              <el-dropdown-item command="newTxt">
                <i class="fa-solid fa-file-alt"></i> 文本文件
              </el-dropdown-item>
              <el-dropdown-item command="newWord">
                <i class="fa-solid fa-file-word"></i> Word文档
              </el-dropdown-item>
              <el-dropdown-item command="newExcel">
                <i class="fa-solid fa-file-excel"></i> Excel表格
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <i class="fa-solid fa-pen" title="重命名" @click="renameFolder(folder)"></i>
        <i class="del fa-solid fa-trash" title="删除" @click="deleteFolder(folder)"></i>
      </div>
    </div>
    
    <!-- 新建文件夹输入框 -->
    <div v-if="creatingFolderParent === getFolderKey(folder)" class="new-folder-input-wrapper">
      <input 
        type="text" 
        class="new-folder-input"
        :value="newFolderName"
        placeholder="输入文件夹名称"
        @input="updateNewFolderName"
        @keyup.enter="confirmCreateFolder"
        @keyup.esc="cancelCreateFolder"
        @blur="confirmCreateFolder"
      />
    </div>
    
    <!-- 文件夹展开内容 -->
    <ul v-if="expandedFolders.has(getFolderKey(folder))" class="sub-tree open">
      <!-- 递归显示子文件夹 -->
      <FolderTreeItem 
        v-for="subFolder in getSubFolders(folder)" 
        :key="getFolderKey(subFolder)"
        :folder="subFolder"
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
      
      <!-- 文件列表 -->
      <li 
        v-for="file in getFolderFiles(folder)" 
        :key="file.path" 
        class="file-node"
      >
        <div 
          class="tree-item-wrapper file-item" 
          :class="{ active: selectedFile && selectedFile.path === file.path }"
          :draggable="true"
          @click.stop="openFile(file)"
          @dragstart="handleDragStart($event, file, 'file')"
          @dragend="handleDragEnd"
        >
          <span class="arrow-placeholder"></span>
          <div class="tree-info">
            <i class="fa-solid fa-file-lines" :style="{ color: getFileIconColor(file.extension || 'md') }"></i>
            <span>{{ getFileNameWithExt(file) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </li>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  folder: Object,
  expandedFolders: Set,
  selectedFolderKey: String,
  renamingFolderKey: String,
  renamingFolderName: String,
  creatingFolderParent: String,
  newFolderName: String,
  creatingFileParent: String,
  newFileName: String,
  newFileType: String,
  selectedFile: Object,
  getFolderKey: Function,
  getSubFolders: Function,
  getFolderFiles: Function,
  getFileNameWithExt: Function,
  getFileIconColor: Function,
  selectFolder: Function,
  toggleFolder: Function,
  handleFolderAction: Function,
  renameFolder: Function,
  deleteFolder: Function,
  confirmRenameFolder: Function,
  cancelRenameFolder: Function,
  confirmCreateFolder: Function,
  cancelCreateFolder: Function,
  updateNewFolderName: Function,
  updateRenamingFolderName: Function,
  openFile: Function,
  moveFolder: Function,
  moveFile: Function
})

const isDragOver = ref(false)
let dragOverTimer = null

// 处理拖拽开始
const handleDragStart = (e, item, type) => {
  e.stopPropagation()
  
  // 使用更简单的方式存储数据
  window.__dragData = { item, type }
  e.dataTransfer.effectAllowed = 'move'
  
  // 添加拖拽样式
  setTimeout(() => {
    e.target.classList.add('dragging')
  }, 0)

}

// 处理拖拽结束
const handleDragEnd = (e) => {
  e.target.classList.remove('dragging')
  document.querySelectorAll('.tree-item-wrapper.drag-over').forEach(el => {
    el.classList.remove('drag-over')
  })
  window.__dragData = null
}

// 处理拖拽悬浮
const handleDragOver = (e, targetFolder) => {
  e.preventDefault() // 必须阻止默认行为才能触发 drop
  e.stopPropagation()
  
  // 获取拖拽的数据
  const dragData = window.__dragData
  if (!dragData) {
    e.dataTransfer.dropEffect = 'none'
    return
  }
  
  const { item: dragItem, type: dragType } = dragData
  
  // 不能拖到自己身上
  if (dragType === 'folder' && props.getFolderKey(dragItem) === props.getFolderKey(targetFolder)) {
    e.dataTransfer.dropEffect = 'none'
    isDragOver.value = false
    return
  }
  
  // 不能拖到自己的子文件夹
  if (dragType === 'folder') {
    const targetPath = targetFolder.path
    const dragPath = dragItem.path
    if (targetPath.startsWith(dragPath + (dragPath.includes('\\') ? '\\' : '/'))) {
      e.dataTransfer.dropEffect = 'none'
      isDragOver.value = false
      return
    }
  }
  
  e.dataTransfer.dropEffect = 'move'
  
  // 只在真正改变目标时才更新状态
  if (!isDragOver.value) {
    isDragOver.value = true
  }
  
  // 自动展开（悬停 800ms）
  if (dragOverTimer) {
    clearTimeout(dragOverTimer)
  }
  const folderKey = props.getFolderKey(targetFolder)
  if (!props.expandedFolders.has(folderKey)) {
    dragOverTimer = setTimeout(() => {

      props.toggleFolder(targetFolder)
    }, 800)
  }
}

// 处理拖拽离开
const handleDragLeave = (e) => {
  // 只有当真正离开这个元素（不是进入子元素）时才清除高亮
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  
  // 如果鼠标还在元素范围内，不清除高亮（可能是进入了子元素）
  if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
    return
  }
  
  e.stopPropagation()
  isDragOver.value = false
  if (dragOverTimer) {
    clearTimeout(dragOverTimer)
    dragOverTimer = null
  }
}

// 处理拖拽释放
const handleDrop = async (e, targetFolder) => {
  e.preventDefault()
  e.stopPropagation()

  isDragOver.value = false
  
  if (dragOverTimer) {
    clearTimeout(dragOverTimer)
    dragOverTimer = null
  }
  
  const dragData = window.__dragData

  if (!dragData) {

    return
  }
  
  const { item: dragItem, type: dragType } = dragData

  // 调用父组件的移动方法
  try {
    if (dragType === 'folder') {

      await props.moveFolder?.(dragItem, targetFolder)
    } else if (dragType === 'file') {

      await props.moveFile?.(dragItem, targetFolder)
    }

  } catch (e) { /* ignore */ }
  
  window.__dragData = null
}

</script>

<style scoped>
.folder-node {
  list-style: none;
}

.tree-item-wrapper {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  user-select: none;
  position: relative;
}

.tree-item-wrapper:hover {
  background: var(--hover-bg, #edf2f7);
}

.tree-item-wrapper.active {
  background: var(--active-bg, #e6f4ff) !important;
  color: var(--accent-color, #3498db);
  font-weight: 600;
}

.tree-item-wrapper.drop-target {
  background: #e8f5e9 !important;
  border: 2px dashed #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
  border-radius: 6px;
}

.tree-item-wrapper.dragging {
  opacity: 0.5;
}

.tree-item-wrapper.drag-over {
  background: var(--active-bg) !important;
  border: 2px solid var(--accent-color);
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.3);
  border-radius: 6px;
}

.arrow {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.arrow-placeholder {
  width: 20px;
  height: 20px;
  display: inline-block;
  flex-shrink: 0;
}

.tree-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tree-info i {
  flex-shrink: 0;
}

.tree-info span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-actions {
  display: none;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 0 8px;
}

.tree-item-wrapper:hover .folder-actions,
.tree-item-wrapper.active .folder-actions {
  display: flex;
}

.folder-actions i {
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  font-size: 12px;
}

.folder-actions i:hover {
  background: rgba(0, 0, 0, 0.1);
}

.folder-actions i.del:hover {
  color: #f56c6c;
}

.action-dropdown {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.rename-input,
.new-file-input {
  border: 1px solid #409eff;
  border-radius: 3px;
  padding: 2px 6px;
  outline: none;
  font-size: 13px;
  flex: 1;
  min-width: 0;
}

.new-folder-input-wrapper {
  padding: 5px 0 5px 20px;
}

.new-folder-input {
  width: 100%;
  border: 1px solid #409eff;
  border-radius: 3px;
  padding: 4px 8px;
  outline: none;
  font-size: 13px;
}

.sub-tree {
  list-style: none;
  padding-left: 20px;
  margin: 0;
}

.file-node {
  list-style: none;
}

.file-item {
  padding-left: 0;
}

/* ignore */
.file-node .tree-item-wrapper.active {
  background: var(--active-bg, #e6f4ff) !important;
  color: var(--accent-color, #3498db);
  font-weight: 500;
}
</style>
