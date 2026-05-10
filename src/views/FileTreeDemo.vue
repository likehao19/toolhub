<template>
  <div class="file-tree-demo">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>文件树读取测试</span>
          <el-tag type="success">高性能异步读取</el-tag>
        </div>
      </template>

      <el-space direction="vertical" :size="20" style="width: 100%">
        <!-- 选择目录 -->
        <div class="input-group">
          <el-input
            v-model="selectedPath"
            placeholder="请输入目录路径，如: C:\ 或 D:\Desktop"
            clearable
            style="flex: 1"
          >
            <template #prepend>目录路径</template>
          </el-input>
          <el-button type="primary" @click="selectDirectory">选择目录</el-button>
        </div>

        <!-- 配置选项 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-input
              v-model="fileExtensions"
              placeholder="文件类型过滤，如: js,vue,rs (留空读取所有)"
              clearable
            >
              <template #prepend>文件类型</template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-input-number
              v-model="maxDepth"
              :min="0"
              :max="100"
              placeholder="最大深度"
              style="width: 100%"
            />
          </el-col>
          <el-col :span="6">
            <el-checkbox v-model="includeHidden">包含隐藏文件</el-checkbox>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <el-row :gutter="10">
          <el-col :span="6">
            <el-button
              type="primary"
              :loading="isScanning"
              @click="startStreamScan"
              style="width: 100%"
            >
              <el-icon><Search /></el-icon>
              流式扫描 (推荐)
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="success"
              :loading="isScanning"
              @click="startNormalScan"
              style="width: 100%"
            >
              <el-icon><Files /></el-icon>
              普通扫描
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="info"
              :loading="isScanning"
              @click="scanStats"
              style="width: 100%"
            >
              <el-icon><DataAnalysis /></el-icon>
              快速统计
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="danger"
              :disabled="!isScanning"
              @click="stopScan"
              style="width: 100%"
            >
              <el-icon><CloseBold /></el-icon>
              停止扫描
            </el-button>
          </el-col>
        </el-row>
      </el-space>
    </el-card>

    <!-- 进度信息 -->
    <el-card v-if="isScanning || progress.scanned_files > 0" class="progress-card">
      <el-progress
        :percentage="progressPercentage"
        :status="isScanning ? 'success' : 'success'"
        :indeterminate="isScanning"
      />
      <div class="progress-info">
        <el-space wrap>
          <el-tag type="primary">文件: {{ progress.scanned_files }}</el-tag>
          <el-tag type="success">文件夹: {{ progress.scanned_dirs }}</el-tag>
          <el-tag type="info">总耗时: {{ scanDuration }}s</el-tag>
          <el-tag type="warning" v-if="currentPath">当前: {{ currentPath }}</el-tag>
        </el-space>
      </div>
      <!-- 性能统计 -->
      <div v-if="rustDuration > 0 || renderDuration > 0" class="performance-info">
        <el-divider content-position="left">性能统计</el-divider>
        <el-space wrap>
          <el-tag type="danger" effect="dark">
            🦀 Rust 读取: {{ rustDuration }}ms
          </el-tag>
          <el-tag type="success" effect="dark">
            🎨 前端渲染: {{ renderDuration }}ms
          </el-tag>
          <el-tag type="info" effect="dark">
            📊 总计: {{ rustDuration + renderDuration }}ms
          </el-tag>
        </el-space>
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-card v-if="stats" class="stats-card">
      <template #header>
        <div class="card-header">
          <span>统计信息</span>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="文件总数">
          {{ stats.file_count }}
        </el-descriptions-item>
        <el-descriptions-item label="文件夹总数">
          {{ stats.dir_count }}
        </el-descriptions-item>
        <el-descriptions-item label="总大小">
          {{ formatFileSize(stats.total_size) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 文件树 -->
    <el-card v-if="fileTree" class="tree-card">
      <template #header>
        <div class="card-header">
          <span>文件树结构</span>
          <el-button size="small" @click="expandAll">全部展开</el-button>
          <el-button size="small" @click="collapseAll">全部折叠</el-button>
        </div>
      </template>
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        default-expand-all
        :expand-on-click-node="false"
        node-key="path"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <el-icon v-if="data.is_dir" color="#409EFF"><Folder /></el-icon>
            <el-icon v-else color="#67C23A"><Document /></el-icon>
            <span class="node-label">{{ data.name }}</span>
            <el-tag v-if="!data.is_dir && data.extension" size="small" type="info">
              {{ data.extension }}
            </el-tag>
            <el-tag v-if="!data.is_dir && data.size" size="small" type="success">
              {{ formatFileSize(data.size) }}
            </el-tag>
          </span>
        </template>
      </el-tree>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Files,
  DataAnalysis,
  CloseBold,
  Folder,
  Document
} from '@element-plus/icons-vue'
import { TauriFileTree, TauriDialog } from '@/utils/tauri'

// 数据
const selectedPath = ref('D:\\Desktop')
const fileExtensions = ref('')
const maxDepth = ref(null)
const includeHidden = ref(false)
const isScanning = ref(false)
const currentTaskId = ref(null)
const startTime = ref(null)
const scanDuration = ref(0)
const currentPath = ref('')
const eventUnlisteners = ref([]) // 保存事件取消函数

// 性能统计
const rustDuration = ref(0) // Rust 读取时间（毫秒）
const renderDuration = ref(0) // 前端渲染时间（毫秒）

// 进度
const progress = ref({
  scanned_files: 0,
  scanned_dirs: 0
})

// 结果
const fileTree = ref(null)
const stats = ref(null)
const allNodes = ref([])

// 树组件
const treeRef = ref(null)

// 计算属性
const progressPercentage = computed(() => {
  if (!isScanning.value && progress.value.scanned_files > 0) {
    return 100
  }
  return 0
})

const treeData = computed(() => {
  if (!fileTree.value) return []
  return [fileTree.value]
})

const treeProps = {
  children: 'children',
  label: 'name'
}

// 监听扫描时长
// 旧实现:每次 isScanning 变 true 都新建 setInterval,之前的 timer 不会被清(只有在
// !isScanning 时下一 tick 才清);组件在扫描中被卸载也不会清,timer 永久跑下去访问已 dispose 的 ref。
let scanTimer = null
const stopScanTimer = () => {
  if (scanTimer !== null) { clearInterval(scanTimer); scanTimer = null }
}
watch(isScanning, (val) => {
  if (val) {
    startTime.value = Date.now()
    stopScanTimer()
    scanTimer = setInterval(() => {
      if (!isScanning.value) { stopScanTimer(); return }
      scanDuration.value = ((Date.now() - startTime.value) / 1000).toFixed(1)
    }, 100)
  } else {
    stopScanTimer()
  }
})
onBeforeUnmount(stopScanTimer)

// 选择目录
const selectDirectory = async () => {
  try {
    const path = await TauriDialog.selectFolder({
      title: '选择目录'
    })
    if (path) {
      selectedPath.value = path
    }
  } catch (error) {
    ElMessage.error('选择目录失败: ' + error)
  }
}

// 流式扫描
const startStreamScan = async () => {
  if (!selectedPath.value) {
    ElMessage.warning('请先选择目录')
    return
  }

  resetData()
  isScanning.value = true

  try {
    const extensions = fileExtensions.value
      ? fileExtensions.value.split(',').map(e => e.trim()).filter(e => e)
      : null

    const { taskId, unlisteners } = await TauriFileTree.readFileTreeStream(
      {
        path: selectedPath.value,
        extensions,
        maxDepth: maxDepth.value,
        includeHidden: includeHidden.value,
        batchSize: 200
      },
      {
        onProgress: (p) => {
          progress.value = p
          currentPath.value = p.current_path
        },
        onBatch: (batch) => {
          allNodes.value.push(...batch.nodes)

          // 渲染计时
          const renderStart = performance.now()

          // 实时构建树
          fileTree.value = TauriFileTree.buildFileTree(allNodes.value, selectedPath.value)

          // 累积渲染时间
          renderDuration.value += Math.round(performance.now() - renderStart)
        },
        onComplete: (result) => {
          isScanning.value = false
          currentTaskId.value = null
          eventUnlisteners.value = []

          // 保存 Rust 读取时间
          if (result.rust_duration_ms) {
            rustDuration.value = result.rust_duration_ms
          }

          ElMessage.success(`扫描完成！Rust: ${rustDuration.value}ms, 渲染: ${renderDuration.value}ms`)
        },
        onError: (error) => {
          isScanning.value = false
          currentTaskId.value = null
          eventUnlisteners.value = []
          ElMessage.error('扫描失败: ' + error)
        }
      }
    )

    currentTaskId.value = taskId
    eventUnlisteners.value = unlisteners
    ElMessage.success('开始扫描...')
  } catch (error) {
    isScanning.value = false
    ElMessage.error('启动扫描失败: ' + error)
  }
}

// 普通扫描
const startNormalScan = async () => {
  if (!selectedPath.value) {
    ElMessage.warning('请先选择目录')
    return
  }

  resetData()
  isScanning.value = true

  try {
    const extensions = fileExtensions.value
      ? fileExtensions.value.split(',').map(e => e.trim()).filter(e => e)
      : null

    // 调用 Rust 读取
    const result = await TauriFileTree.readFileTree({
      path: selectedPath.value,
      extensions,
      maxDepth: maxDepth.value,
      includeHidden: includeHidden.value
    })

    // 保存 Rust 读取时间
    rustDuration.value = result.rust_duration_ms

    // 开始渲染计时
    const renderStart = performance.now()

    // 设置文件树（触发 Vue 渲染）
    fileTree.value = result.tree

    // 等待 DOM 更新完成
    await nextTick()

    // 计算渲染时间
    renderDuration.value = Math.round(performance.now() - renderStart)

    // 统计节点数量
    const countNodes = (node) => {
      if (!node) return { files: 0, dirs: 0 }

      let files = node.is_dir ? 0 : 1
      let dirs = node.is_dir ? 1 : 0

      if (node.children) {
        node.children.forEach(child => {
          const counts = countNodes(child)
          files += counts.files
          dirs += counts.dirs
        })
      }

      return { files, dirs }
    }

    const counts = countNodes(fileTree.value)
    progress.value = {
      scanned_files: counts.files,
      scanned_dirs: counts.dirs - 1 // 减去根目录
    }

    isScanning.value = false
    ElMessage.success(`扫描完成！Rust: ${rustDuration.value}ms, 渲染: ${renderDuration.value}ms`)
  } catch (error) {
    isScanning.value = false
    ElMessage.error('扫描失败: ' + error)
  }
}

// 快速统计
const scanStats = async () => {
  if (!selectedPath.value) {
    ElMessage.warning('请先选择目录')
    return
  }

  isScanning.value = true

  try {
    stats.value = await TauriFileTree.scanDirectoryStats(selectedPath.value)
    isScanning.value = false
    ElMessage.success('统计完成!')
  } catch (error) {
    isScanning.value = false
    ElMessage.error('统计失败: ' + error)
  }
}

// 停止扫描
const stopScan = () => {
  // 清理事件监听器
  if (eventUnlisteners.value && eventUnlisteners.value.length > 0) {
    eventUnlisteners.value.forEach(unlisten => {
      if (typeof unlisten === 'function') {
        unlisten()
      }
    })
    eventUnlisteners.value = []
  }

  isScanning.value = false
  currentTaskId.value = null
  ElMessage.info('已停止扫描')
}

// 重置数据
const resetData = () => {
  // 先清理监听器
  if (eventUnlisteners.value && eventUnlisteners.value.length > 0) {
    eventUnlisteners.value.forEach(unlisten => {
      if (typeof unlisten === 'function') {
        unlisten()
      }
    })
    eventUnlisteners.value = []
  }

  fileTree.value = null
  stats.value = null
  allNodes.value = []
  progress.value = {
    scanned_files: 0,
    scanned_dirs: 0
  }
  currentPath.value = ''
  scanDuration.value = 0
  currentTaskId.value = null

  // 重置性能统计
  rustDuration.value = 0
  renderDuration.value = 0
}

// 展开所有
const expandAll = () => {
  if (treeRef.value) {
    const nodes = treeRef.value.store._getAllNodes()
    nodes.forEach(node => {
      node.expanded = true
    })
  }
}

// 折叠所有
const collapseAll = () => {
  if (treeRef.value) {
    const nodes = treeRef.value.store._getAllNodes()
    nodes.forEach(node => {
      node.expanded = false
    })
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  return TauriFileTree.formatFileSize(bytes)
}
</script>

<style scoped>
.file-tree-demo {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-card {
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
}

.progress-card {
  margin-bottom: 20px;
}

.progress-info {
  margin-top: 15px;
}

.performance-info {
  margin-top: 10px;
}

.stats-card {
  margin-bottom: 20px;
}

.tree-card {
  margin-bottom: 20px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-label {
  flex: 1;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 5px 0;
}
</style>
