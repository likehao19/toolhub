<template>
  <div class="folder-tree-item">
    <div
      class="folder-item"
      :class="{
        expanded: isExpanded,
        active: isActive
      }"
      @contextmenu.prevent="$emit('contextmenu', $event, folder)"
    >
      <div class="folder-header">
        <div class="folder-main" @click="toggleExpand">
          <el-icon class="folder-drag-handle" style="cursor: move; opacity: 0.5;">
            <Operation />
          </el-icon>
          <el-icon class="folder-arrow" :class="{ expanded: isExpanded && hasChildren }">
            <ArrowRight v-if="hasChildren && !isExpanded" />
            <ArrowDown v-else-if="hasChildren && isExpanded" />
          </el-icon>
          <el-icon class="folder-icon">
            <Folder v-if="!isExpanded" />
            <FolderOpened v-else />
          </el-icon>
          <span class="folder-name" @click.stop="$emit('select', folder)">{{ folder.name }}</span>
          <span class="folder-count" v-if="fileCount > 0">({{ fileCount }})</span>
        </div>
        <div class="folder-actions" @click.stop>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button text size="small" circle>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="create-note">
                  <el-icon><Document /></el-icon>
                  <span>新建笔记</span>
                </el-dropdown-item>
                <el-dropdown-item command="create-folder">
                  <el-icon><FolderAdd /></el-icon>
                  <span>新建文件夹</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="rename">
                  <el-icon><Edit /></el-icon>
                  <span>重命名</span>
                </el-dropdown-item>
                <el-dropdown-item command="move">
                  <el-icon><FolderOpened /></el-icon>
                  <span>移动到</span>
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 子文件夹 -->
    <div v-if="isExpanded && subFolders.length > 0" class="sub-folders">
      <FolderTreeItem
        v-for="subFolder in sortedSubFolders"
        :key="subFolder.path"
        :folder="subFolder"
        :expanded-folders="expandedFolders"
        :current-path="currentPath"
        :file-counts="fileCounts"
        :get-folder-key="getFolderKey"
        :get-sub-folders="getSubFolders"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @command="$emit('command', $event, $arguments[1])"
        @contextmenu="$emit('contextmenu', $event, $arguments[1])"
        @load-subfolders="$emit('load-subfolders', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import {
  Folder, FolderOpened, ArrowRight, ArrowDown, MoreFilled, Document,
  FolderAdd, Edit, Delete, Operation
} from '@element-plus/icons-vue'

const props = defineProps({
  folder: {
    type: Object,
    required: true
  },
  expandedFolders: {
    type: Set,
    required: true
  },
  currentPath: {
    type: String,
    default: ''
  },
  fileCounts: {
    type: Object,
    default: () => ({})
  },
  getFolderKey: {
    type: Function,
    required: true
  },
  getSubFolders: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['toggle', 'select', 'command', 'contextmenu', 'load-subfolders'])

const hasLoaded = ref(false) // 是否已加载过子文件夹

// 从props中获取函数
const getFolderKey = props.getFolderKey
const getSubFolders = props.getSubFolders
const folderKey = computed(() => getFolderKey(props.folder))
const isExpanded = computed(() => props.expandedFolders.has(folderKey.value))
const isActive = computed(() => props.currentPath === folderKey.value)

// 从父组件获取子文件夹列表
const subFolders = computed(() => {
  return getSubFolders(props.folder) || []
})

// 如果已加载，根据实际子文件夹数量判断；如果未加载，假设可能有子文件夹
const hasChildren = computed(() => {
  if (hasLoaded.value) {
    return subFolders.value.length > 0
  }
  // 未加载时，假设可能有子文件夹
  return true
})

const fileCount = computed(() => props.fileCounts[folderKey.value] || 0)

// 排序后的子文件夹
const sortedSubFolders = computed(() => {
  return [...subFolders.value].sort((a, b) => {
    return a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
  })
})

const toggleExpand = async () => {
  const wasExpanded = isExpanded.value
  emit('toggle', props.folder)
  // 等待状态更新
  await nextTick()
  // 如果现在是展开状态且之前是折叠状态，且还没有加载过子文件夹，则加载
  if (isExpanded.value && !wasExpanded && !hasLoaded.value) {
    await loadSubFolders()
  }
}

const loadSubFolders = async () => {
  if (hasLoaded.value) return // 已经加载过，不再重复加载
  
  try {
    // 通过事件通知父组件加载子文件夹
    emit('load-subfolders', props.folder)
    hasLoaded.value = true
  } catch (error) {
    hasLoaded.value = true // 即使失败也标记为已加载，避免重复尝试
  }
}

// 监听展开状态，展开时加载子文件夹
watch(isExpanded, async (newVal) => {
  if (newVal && !hasLoaded.value) {
    await loadSubFolders()
  }
})

// 监听子文件夹变化，如果子文件夹被添加，标记为已加载
watch(subFolders, (newVal) => {
  if (newVal && newVal.length > 0 && !hasLoaded.value) {
    hasLoaded.value = true
  }
}, { immediate: true })

// 处理命令事件
const handleCommand = (cmd) => {
  if (!props.folder) {
    return
  }
  emit('command', cmd, props.folder)
}
</script>

<style scoped>
.folder-tree-item {
  margin-bottom: 2px;
}

.folder-item {
  font-weight: 500;
  padding: 3px 6px;
  border-radius: 6px;
  transition: all 0.25s ease;
}

.folder-item:hover {
  background: rgba(64, 158, 255, 0.06);
}

.folder-item.expanded {
  background: rgba(64, 158, 255, 0.04);
}

.folder-item.active {
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, #e1f0ff 100%);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}

.folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 4px;
  gap: 8px;
  min-height: 36px;
}

.folder-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.folder-arrow {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s;
  flex-shrink: 0;
}

.folder-arrow.expanded {
  transform: rotate(90deg);
  color: var(--accent-blue);
}

.folder-icon {
  color: var(--color-orange);
  font-size: 16px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.folder-item.expanded .folder-icon {
  color: var(--color-orange);
}

.folder-item:hover .folder-icon {
  transform: scale(1.1);
}

.folder-name {
  flex: 1;
  font-weight: 500;
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
  transition: color 0.2s;
}

.folder-item:hover .folder-name {
  color: var(--accent-blue);
}

.folder-item.active .folder-name {
  color: var(--accent-blue);
  font-weight: 600;
}

.folder-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
  transition: all 0.2s;
}

.folder-item:hover .folder-count {
  background: #e1f0ff;
  color: var(--accent-blue);
}

.folder-item.active .folder-count {
  background: var(--accent-blue);
  color: var(--el-color-white);
}

.folder-actions {
  flex-shrink: 0;
  display: none;
}

.folder-item:hover .folder-actions,
.folder-item.active .folder-actions {
  display: block;
}

.sub-folders {
  margin-left: 16px;
  padding-left: 12px;
  border-left: 2px solid var(--el-border-color-light);
  margin-top: 4px;
  position: relative;
}

.sub-folders::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, transparent, var(--el-border-color-light) 10%, var(--el-border-color-light) 90%, transparent);
  transition: background 0.3s;
}

.sub-folders:hover::before {
  background: linear-gradient(to bottom, transparent, var(--accent-blue) 10%, var(--accent-blue) 90%, transparent);
  opacity: 0.3;
}
</style>
