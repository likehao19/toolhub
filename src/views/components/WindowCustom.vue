<template>
  <DocPage
    icon="🪟"
    title="窗口自定义"
    description="自定义标题栏和窗口控制功能。窗口自定义 API 提供了完整的窗口管理功能，包括最小化、最大化、关闭、设置窗口大小和位置、设置窗口标题、设置窗口置顶和全屏等。通过自定义标题栏，可以创建完全自定义的窗口外观，使用 data-tauri-drag-region 属性来定义可拖拽区域。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="自定义标题栏"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示：当前页面展示了自定义标题栏的实现方式。应用顶部已有一个自定义标题栏，你可以看到最小化、最大化、关闭按钮。"
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom: 16px;"
            />
            <el-descriptions :column="1" border>
              <el-descriptions-item label="标题栏高度">32px</el-descriptions-item>
              <el-descriptions-item label="拖拽区域">使用 data-tauri-drag-region 属性</el-descriptions-item>
              <el-descriptions-item label="窗口控制">
                <el-space>
                  <el-tag>最小化</el-tag>
                  <el-tag>最大化/还原</el-tag>
                  <el-tag>关闭</el-tag>
                </el-space>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="窗口控制功能"
        :code="windowControlCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <div>
                <h4 style="margin: 0 0 12px 0; color: #303133;">基础控制</h4>
                <el-space wrap>
                  <el-button @click="handleMinimize">
                    <el-icon><Minus /></el-icon>
                    最小化
                  </el-button>
                  <el-button @click="handleToggleMaximize">
                    <el-icon><FullScreen /></el-icon>
                    {{ isMaximized ? '还原' : '最大化' }}
                  </el-button>
                  <el-button type="danger" @click="handleClose">
                    <el-icon><Close /></el-icon>
                    关闭
                  </el-button>
                </el-space>
              </div>
              
              <el-divider />
              
              <div>
                <h4 style="margin: 0 0 12px 0; color: #303133;">窗口设置</h4>
                <el-space direction="vertical" style="width: 100%;">
                  <el-input
                    v-model="windowTitle"
                    placeholder="输入窗口标题"
                    style="width: 300px;"
                  >
                    <template #append>
                      <el-button @click="handleSetTitle">设置标题</el-button>
                    </template>
                  </el-input>
                  
                  <el-space wrap>
                    <el-button @click="handleCenter">窗口居中</el-button>
                    <el-button @click="handleToggleAlwaysOnTop">
                      {{ alwaysOnTop ? '取消置顶' : '窗口置顶' }}
                    </el-button>
                    <el-button @click="handleToggleFullscreen">
                      {{ isFullscreen ? '退出全屏' : '全屏' }}
                    </el-button>
                  </el-space>
                  
                  <el-space wrap>
                    <el-input-number
                      v-model="windowSize.width"
                      :min="400"
                      :max="2000"
                      label="宽度"
                      style="width: 150px;"
                    />
                    <el-input-number
                      v-model="windowSize.height"
                      :min="300"
                      :max="1500"
                      label="高度"
                      style="width: 150px;"
                    />
                    <el-button @click="handleSetSize">设置大小</el-button>
                  </el-space>
                </el-space>
              </div>
              
              <el-divider />
              
              <div>
                <h4 style="margin: 0 0 12px 0; color: #303133;">窗口状态</h4>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="是否最大化">
                    <el-tag :type="isMaximized ? 'success' : 'info'">
                      {{ isMaximized ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="是否全屏">
                    <el-tag :type="isFullscreen ? 'success' : 'info'">
                      {{ isFullscreen ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="是否置顶">
                    <el-tag :type="alwaysOnTop ? 'success' : 'info'">
                      {{ alwaysOnTop ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="窗口大小">
                    {{ currentSize.width }} × {{ currentSize.height }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Minus, FullScreen, Close } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriWindow } from '@/utils/tauri'

const isMaximized = ref(false)
const isFullscreen = ref(false)
const alwaysOnTop = ref(false)
const windowTitle = ref('Vue3 Tauri Desktop App')
const windowSize = ref({ width: 1200, height: 800 })
const currentSize = ref({ width: 0, height: 0 })

const basicCode = `<template>
  <div class="title-bar" data-tauri-drag-region>
    <div class="title-bar-content">
      <span class="app-title">应用标题</span>
      <div class="title-bar-buttons">
        <button @click="minimize">—</button>
        <button @click="toggleMaximize">□</button>
        <button @click="close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { TauriWindow } from '@/utils/tauri'

const minimize = () => {
  TauriWindow.minimize()
}

const toggleMaximize = async () => {
  await TauriWindow.toggleMaximize()
}

const close = () => {
  TauriWindow.close()
}
<\/script>

<style>
.title-bar {
  height: 32px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.title-bar[data-tauri-drag-region] {
  -webkit-app-region: drag;
}

.title-bar-buttons {
  -webkit-app-region: no-drag;
}
</style>`

const windowControlCode = `import { TauriWindow } from '@/utils/tauri'

// 最小化窗口
await TauriWindow.minimize()

// 最大化/还原窗口
await TauriWindow.toggleMaximize()

// 关闭窗口
TauriWindow.close()

// 设置窗口标题
await TauriWindow.setTitle('新标题')

// 窗口居中
await TauriWindow.center()

// 设置窗口置顶
await TauriWindow.setAlwaysOnTop(true)

// 设置全屏
await TauriWindow.setFullscreen(true)

// 设置窗口大小
await TauriWindow.setSize(1200, 800)

// 获取窗口大小
const size = await TauriWindow.getSize()
}

const handleToggleMaximize = async () => {
  await TauriWindow.toggleMaximize()
  isMaximized.value = await TauriWindow.isMaximized()
}

const handleClose = () => {
  TauriWindow.close()
}

const handleSetTitle = async () => {
  if (!windowTitle.value) {
    ElMessage.warning('请输入标题')
    return
  }
  await TauriWindow.setTitle(windowTitle.value)
  ElMessage.success('窗口标题已更新')
}

const handleCenter = async () => {
  await TauriWindow.center()
  ElMessage.success('窗口已居中')
}

const handleToggleAlwaysOnTop = async () => {
  alwaysOnTop.value = !alwaysOnTop.value
  await TauriWindow.setAlwaysOnTop(alwaysOnTop.value)
  ElMessage.success(alwaysOnTop.value ? '窗口已置顶' : '已取消置顶')
}

const handleToggleFullscreen = async () => {
  isFullscreen.value = !isFullscreen.value
  await TauriWindow.setFullscreen(isFullscreen.value)
  ElMessage.success(isFullscreen.value ? '已进入全屏' : '已退出全屏')
}

const handleSetSize = async () => {
  await TauriWindow.setSize(windowSize.value.width, windowSize.value.height)
  ElMessage.success('窗口大小已更新')
  await updateWindowInfo()
}

const updateWindowInfo = async () => {
  isMaximized.value = await TauriWindow.isMaximized()
  isFullscreen.value = await TauriWindow.isFullscreen()
  currentSize.value = await TauriWindow.getSize()
}

onMounted(async () => {
  await updateWindowInfo()
  
  // 监听窗口大小变化
  TauriWindow.onWindowEvent('tauri://resize', async () => {
    await updateWindowInfo()
  })
  
  // 监听窗口最大化状态变化
  TauriWindow.onWindowEvent('tauri://move', async () => {
    await updateWindowInfo()
  })
})

const apiData = [
  {
    name: '无',
    type: '-',
    default: '-',
    description: '大部分窗口控制方法不需要参数'
  }
]

const methodsData = [
  {
    name: 'minimize',
    description: '最小化当前窗口。窗口会最小化到任务栏。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'maximize',
    description: '最大化当前窗口。窗口会占据整个屏幕（除了任务栏）。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'unmaximize',
    description: '还原窗口大小。将最大化的窗口还原到之前的大小。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'toggleMaximize',
    description: '切换窗口最大化状态。如果窗口已最大化则还原，否则最大化。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'close',
    description: '关闭当前窗口。会触发窗口关闭事件。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'isMaximized',
    description: '检查窗口是否处于最大化状态。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<boolean>' }
    ]
  },
  {
    name: 'isFullscreen',
    description: '检查窗口是否处于全屏状态。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<boolean>' }
    ]
  },
  {
    name: 'setAlwaysOnTop',
    description: '设置窗口是否始终置顶。置顶的窗口会显示在所有其他窗口之上。',
    params: [
      { name: 'alwaysOnTop', type: 'Boolean', description: '是否置顶，true 表示置顶，false 表示取消置顶' }
    ]
  },
  {
    name: 'setFullscreen',
    description: '设置窗口是否全屏。全屏模式下窗口会占据整个屏幕。',
    params: [
      { name: 'fullscreen', type: 'Boolean', description: '是否全屏，true 表示全屏，false 表示退出全屏' }
    ]
  },
  {
    name: 'setSize',
    description: '设置窗口大小。窗口大小以像素为单位。',
    params: [
      { name: 'width', type: 'Number', description: '窗口宽度（像素）' },
      { name: 'height', type: 'Number', description: '窗口高度（像素）' }
    ]
  },
  {
    name: 'getSize',
    description: '获取当前窗口的内部大小（不包括标题栏和边框）。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<{width: number, height: number}>' }
    ]
  },
  {
    name: 'setPosition',
    description: '设置窗口位置。位置坐标以屏幕左上角为原点。',
    params: [
      { name: 'x', type: 'Number', description: '窗口 X 坐标（像素）' },
      { name: 'y', type: 'Number', description: '窗口 Y 坐标（像素）' }
    ]
  },
  {
    name: 'center',
    description: '将窗口居中显示在屏幕上。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'setTitle',
    description: '设置窗口标题。标题会显示在窗口标题栏或任务栏中。',
    params: [
      { name: 'title', type: 'String', description: '窗口标题文本' }
    ]
  },
  {
    name: 'setResizable',
    description: '设置窗口是否可调整大小。',
    params: [
      { name: 'resizable', type: 'Boolean', description: '是否可调整大小，true 表示可调整，false 表示不可调整' }
    ]
  },
  {
    name: 'onWindowEvent',
    description: '监听窗口事件。可以监听窗口大小变化、位置变化、最大化状态变化等事件。',
    params: [
      { name: 'event', type: 'String', description: '事件名称，例如：tauri://resize、tauri://move 等' },
      { name: 'callback', type: 'Function', description: '事件回调函数' }
    ]
  }
]
</script>

