<template>
  <div class="window-custom-demo">
    <TitleBar title="窗口自定义 Demo" />
    <div class="content" style="padding-top: 32px;">
      <div class="container">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">自定义标题栏</div>
          </template>
          <el-alert
            title="提示：当前页面展示了自定义标题栏的实现方式"
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

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">标题栏样式示例</div>
          </template>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="titlebar-example" style="background: #329ea3;">
                <div class="titlebar-example-content">
                  <span style="color: var(--el-color-white);">示例标题栏 1</span>
                  <div class="titlebar-example-buttons">
                    <div class="titlebar-example-button">—</div>
                    <div class="titlebar-example-button">□</div>
                    <div class="titlebar-example-button">×</div>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="titlebar-example" style="background: #2d2d2d;">
                <div class="titlebar-example-content">
                  <span style="color: var(--el-border-color-light);">示例标题栏 2 (深色)</span>
                  <div class="titlebar-example-buttons">
                    <div class="titlebar-example-button">—</div>
                    <div class="titlebar-example-button">□</div>
                    <div class="titlebar-example-button">×</div>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">创建自定义标题栏窗口</div>
          </template>
          <el-alert
            title="点击下方按钮创建一个新窗口，该窗口没有系统标题栏，使用自定义标题栏"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-button @click="createCustomWindow" type="primary" size="large" style="width: 100%;">
            <el-icon><Plus /></el-icon>
            创建自定义标题栏窗口
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">当前窗口控制功能</div>
          </template>
          <el-space wrap direction="vertical" style="width: 100%">
            <el-button @click="handleMinimize">
              <el-icon><Minus /></el-icon>
              最小化窗口
            </el-button>
            <el-button @click="handleToggleMaximize">
              <el-icon><FullScreen /></el-icon>
              {{ isMaximized ? '还原窗口' : '最大化窗口' }}
            </el-button>
            <el-button @click="handleClose" type="danger">
              <el-icon><Close /></el-icon>
              关闭窗口
            </el-button>
          </el-space>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">代码示例</div>
          </template>
          <el-tabs>
            <el-tab-pane label="HTML">
              <pre><code>&lt;div class="titlebar" data-tauri-drag-region&gt;
  &lt;div class="titlebar-content" data-tauri-drag-region&gt;
    &lt;span class="app-title"&gt;应用标题&lt;/span&gt;
    &lt;div class="titlebar-buttons"&gt;
      &lt;button @click="minimize"&gt;—&lt;/button&gt;
      &lt;button @click="toggleMaximize"&gt;□&lt;/button&gt;
      &lt;button @click="close"&gt;×&lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/div&gt;</code></pre>
            </el-tab-pane>
            <el-tab-pane label="JavaScript">
              <pre><code>import { getCurrentWindow } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()

// 最小化
appWindow.minimize()

// 最大化/还原
appWindow.toggleMaximize()

// 关闭
appWindow.close()</code></pre>
            </el-tab-pane>
            <el-tab-pane label="CSS">
              <pre><code>.titlebar {
  height: 30px;
  background: #329ea3;
  user-select: none;
  display: flex;
  justify-content: flex-end;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}

.titlebar-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
}

.titlebar-button:hover {
  background: #5bbec3;
}</code></pre>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Minus, FullScreen, Close, Plus } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriWindow } from '@/utils/tauri'
import { invoke } from '@tauri-apps/api/core'

const isMaximized = ref(false)

onMounted(async () => {
  isMaximized.value = await TauriWindow.isMaximized()
  
  // 监听窗口状态变化
  TauriWindow.onWindowEvent('tauri://resize', async () => {
    isMaximized.value = await TauriWindow.isMaximized()
  })
})

const handleMinimize = () => {
  TauriWindow.minimize()
  ElMessage.info('窗口已最小化')
}

const handleToggleMaximize = async () => {
  await TauriWindow.toggleMaximize()
  isMaximized.value = await TauriWindow.isMaximized()
  ElMessage.success(isMaximized.value ? '窗口已最大化' : '窗口已还原')
}

const handleClose = () => {
  TauriWindow.close()
}

const createCustomWindow = async () => {
  try {
    const windowLabel = await invoke('create_custom_titlebar_window')
    ElMessage.success(`已创建自定义标题栏窗口: ${windowLabel}`)
  } catch (error) {
    ElMessage.error('创建窗口失败: ' + error)
  }
}
</script>

<style scoped>
.window-custom-demo {
  height: 100vh;
  overflow-y: auto;
  background: var(--el-fill-color-light);
}

.content {
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.demo-card {
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.titlebar-example {
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.titlebar-example-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  height: 100%;
  font-size: 12px;
}

.titlebar-example-buttons {
  display: flex;
  gap: 4px;
}

.titlebar-example-button {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-panel-soft);
  border-radius: 2px;
  font-size: 12px;
  color: var(--el-color-white);
  cursor: pointer;
}

.titlebar-example-button:hover {
  background: var(--surface-panel-soft);
}

pre {
  background: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
}

code {
  font-family: "PingFang SC";
  font-size: 12px;
  line-height: 1.6;
}
</style>

