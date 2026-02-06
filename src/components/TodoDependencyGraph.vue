<template>
  <el-dialog
    v-model="visible"
    title="任务依赖关系图"
    width="90%"
    :close-on-click-modal="false"
  >
    <div class="dependency-graph-container">
      <div class="graph-toolbar">
        <el-button-group>
          <el-button @click="layout = 'dagre'" :type="layout === 'dagre' ? 'primary' : ''">
            层次布局
          </el-button>
          <el-button @click="layout = 'force'" :type="layout === 'force' ? 'primary' : ''">
            力导向布局
          </el-button>
          <el-button @click="layout = 'circular'" :type="layout === 'circular' ? 'primary' : ''">
            环形布局
          </el-button>
        </el-button-group>
        <el-button @click="fitView">适应画布</el-button>
        <el-button @click="zoomIn">放大</el-button>
        <el-button @click="zoomOut">缩小</el-button>
        <el-button @click="resetZoom">重置</el-button>
      </div>
      <div ref="graphContainer" class="graph-canvas"></div>
      <div v-if="criticalPathInfo.criticalPath.length > 0" class="critical-path-info">
        <el-alert
          title="关键路径信息"
          type="info"
          :closable="false"
        >
          <template #default>
            <div>总时长: {{ criticalPathInfo.totalDuration }} 小时</div>
            <div>关键路径节点数: {{ criticalPathInfo.criticalPath.length }}</div>
          </template>
        </el-alert>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Graph } from '@antv/g6'
import { buildDependencyGraph, calculateCriticalPath } from '@/utils/todoDependency'

const props = defineProps({
  modelValue: Boolean,
  todos: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const graphContainer = ref(null)
const layout = ref('dagre')
const graphInstance = ref(null)
let criticalPathInfo = ref({ criticalPath: [], totalDuration: 0 })

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    nextTick(() => {
      initGraph()
    })
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(layout, () => {
  if (graphInstance.value) {
    updateLayout()
  }
})

watch(() => props.todos, () => {
  if (graphInstance.value && visible.value) {
    updateGraph()
  }
}, { deep: true })

const initGraph = () => {
  if (!graphContainer.value) return
  
  // 销毁旧图
  if (graphInstance.value) {
    graphInstance.value.destroy()
    graphInstance.value = null
  }
  
  const graphData = buildDependencyGraph(props.todos)
  criticalPathInfo.value = calculateCriticalPath(props.todos)
  
  // 标记关键路径节点
  const criticalNodeIds = new Set(criticalPathInfo.value.criticalPath)
  
  graphData.nodes.forEach(node => {
    node.style = {
      fill: criticalNodeIds.has(node.id) ? '#ff4d4f' : '#1890ff',
      stroke: criticalNodeIds.has(node.id) ? '#cf1322' : '#096dd9',
      lineWidth: criticalNodeIds.has(node.id) ? 3 : 2
    }
    node.labelCfg = {
      style: {
        fill: criticalNodeIds.has(node.id) ? '#ff4d4f' : '#000'
      }
    }
  })
  
  // 标记关键路径边
  graphData.edges.forEach(edge => {
    const sourceId = edge.source
    const targetId = edge.target
    const isCritical = criticalNodeIds.has(sourceId) && criticalNodeIds.has(targetId)
    
    edge.style = {
      stroke: isCritical ? '#ff4d4f' : '#91d5ff',
      lineWidth: isCritical ? 3 : 2,
      endArrow: {
        path: 'M 0,0 L 8,4 L 8,-4 Z',
        fill: isCritical ? '#ff4d4f' : '#91d5ff'
      }
    }
  })
  
  const graph = new Graph({
    container: graphContainer.value,
    width: graphContainer.value.clientWidth,
    height: 600,
    data: graphData,
    layout: {
      type: layout.value,
      ...getLayoutConfig()
    },
    node: {
      style: {
        radius: 4
      },
      labelText: (d) => d.label || d.id
    },
    edge: {
      style: {
        radius: 4,
        offset: 15
      }
    },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element']
  })
  
  graph.render()
  
  // 保存 graph 实例的引用以便后续操作
  graphInstance.value = graph
  
  // 监听节点点击
  graph.on('node:click', (e) => {
    const node = e.item.getModel()
    // 可以在这里添加节点点击事件处理
  })
}

const getLayoutConfig = () => {
  switch (layout.value) {
    case 'dagre':
      return {
        rankdir: 'TB',
        nodesep: 50,
        ranksep: 80
      }
    case 'force':
      return {
        preventOverlap: true,
        nodeSize: 120
      }
    case 'circular':
      return {
        radius: 200
      }
    default:
      return {}
  }
}

const updateLayout = () => {
  if (!graphInstance.value) return
  // G6 5.x 中需要重新读取数据并设置布局
  const graphData = buildDependencyGraph(props.todos)
  graphInstance.value.read(graphData)
  graphInstance.value.setLayout({
    type: layout.value,
    ...getLayoutConfig()
  })
  graphInstance.value.render()
}

const updateGraph = () => {
  if (!graphInstance.value) return
  const graphData = buildDependencyGraph(props.todos)
  criticalPathInfo.value = calculateCriticalPath(props.todos)
  
  const criticalNodeIds = new Set(criticalPathInfo.value.criticalPath)
  
  graphData.nodes.forEach(node => {
    node.style = {
      fill: criticalNodeIds.has(node.id) ? '#ff4d4f' : '#1890ff',
      stroke: criticalNodeIds.has(node.id) ? '#cf1322' : '#096dd9',
      lineWidth: criticalNodeIds.has(node.id) ? 3 : 2
    }
  })
  
  graphData.edges.forEach(edge => {
    const sourceId = edge.source
    const targetId = edge.target
    const isCritical = criticalNodeIds.has(sourceId) && criticalNodeIds.has(targetId)
    
    edge.style = {
      stroke: isCritical ? '#ff4d4f' : '#91d5ff',
      lineWidth: isCritical ? 3 : 2
    }
  })
  
  graphInstance.value.read(graphData)
}

const fitView = () => {
  if (graphInstance.value) {
    graphInstance.value.fitView()
  }
}

const zoomIn = () => {
  if (graphInstance.value) {
    try {
      const currentZoom = graphInstance.value.getZoom?.() || 1
      graphInstance.value.zoomTo?.(currentZoom * 1.2) || graphInstance.value.zoom(currentZoom * 1.2)
    } catch (e) { /* ignore */ }
  }
}

const zoomOut = () => {
  if (graphInstance.value) {
    try {
      const currentZoom = graphInstance.value.getZoom?.() || 1
      graphInstance.value.zoomTo?.(currentZoom * 0.8) || graphInstance.value.zoom(currentZoom * 0.8)
    } catch (e) { /* ignore */ }
  }
}

const resetZoom = () => {
  if (graphInstance.value) {
    try {
      graphInstance.value.zoomTo?.(1) || graphInstance.value.zoom(1)
      graphInstance.value.fitView()
    } catch (e) { /* ignore */ }
  }
}

onUnmounted(() => {
  if (graphInstance.value) {
    graphInstance.value.destroy()
    graphInstance.value = null
  }
})
</script>

<style scoped>
.dependency-graph-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.graph-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.graph-canvas {
  flex: 1;
  min-height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.critical-path-info {
  margin-top: 16px;
}
</style>

