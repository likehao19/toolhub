<template>
  <div class="menu-demo">
    <TitleBar title="原生菜单 Demo" />
    <div class="content" style="padding-top: 32px;">
      <div class="container">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">菜单类型</div>
          </template>
          <el-alert
            title="提示：点击下方按钮创建不同类型的菜单"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-alert
            :title="menuLocationHint"
            type="warning"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-row :gutter="20">
            <el-col :span="12">
              <el-button @click="createBasicMenu" type="primary" style="width: 100%;">
                <el-icon><Menu /></el-icon>
                创建基础菜单
              </el-button>
            </el-col>
            <el-col :span="12">
              <el-button @click="createMultiLevelMenu" type="success" style="width: 100%;">
                <el-icon><Menu /></el-icon>
                创建多级菜单
              </el-button>
            </el-col>
            <el-col :span="12">
              <el-button @click="createPredefinedMenu" type="warning" style="width: 100%;">
                <el-icon><Menu /></el-icon>
                创建预定义菜单
              </el-button>
            </el-col>
            <el-col :span="12">
              <el-button @click="createDynamicMenu" type="danger" style="width: 100%;">
                <el-icon><Menu /></el-icon>
                创建动态菜单
              </el-button>
            </el-col>
          </el-row>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">菜单功能说明</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="基础菜单">
              包含单个菜单项（如退出按钮）
            </el-descriptions-item>
            <el-descriptions-item label="多级菜单">
              包含子菜单，支持嵌套结构（如文件、编辑菜单）
            </el-descriptions-item>
            <el-descriptions-item label="预定义菜单">
              使用系统预定义的菜单项（如复制、粘贴、撤销等）
            </el-descriptions-item>
            <el-descriptions-item label="动态菜单">
              支持动态更改菜单状态（如复选框、文本更改）
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">代码示例</div>
          </template>
          <el-tabs>
            <el-tab-pane label="基础菜单">
              <pre><code>import { Menu } from '@tauri-apps/api/menu'

const menu = await Menu.new({
  items: [
    {
      id: 'quit',
      text: '退出',
      action: () => {
      },
    },
  ],
})

await menu.setAsAppMenu()</code></pre>
            </el-tab-pane>
            <el-tab-pane label="多级菜单">
              <pre><code>import { Menu, Submenu, MenuItem } from '@tauri-apps/api/menu'

const fileSubmenu = await Submenu.new({
  text: '文件',
  items: [
    await MenuItem.new({
      id: 'new',
      text: '新建',
      action: () => console.log('New clicked'),
    }),
  ],
})

const menu = await Menu.new({
  items: [fileSubmenu],
})

await menu.setAsAppMenu()</code></pre>
            </el-tab-pane>
            <el-tab-pane label="预定义菜单">
              <pre><code>import { Menu, PredefinedMenuItem } from '@tauri-apps/api/menu'

const copy = await PredefinedMenuItem.new({
  text: 'copy-text',
  item: 'Copy',
})

const menu = await Menu.new({
  items: [copy],
})

await menu.setAsAppMenu()</code></pre>
            </el-tab-pane>
            <el-tab-pane label="动态菜单">
              <pre><code>import { Menu, CheckMenuItem, MenuItem } from '@tauri-apps/api/menu'

const checkItem = await CheckMenuItem.new({
  id: 'en',
  text: 'English',
  checked: true,
  action: () => {
    checkItem.setChecked(!checkItem.checked)
  },
})

const textItem = await MenuItem.new({
  id: 'text',
  text: '文本项',
  action: () => {
    textItem.setText('文本已更改')
  },
})</code></pre>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">操作日志</div>
          </template>
          <div class="log-container">
            <div v-for="(log, index) in logs" :key="index" class="log-item">
              <el-tag :type="log.type" size="small">{{ log.time }}</el-tag>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">
              暂无操作日志
            </div>
          </div>
          <el-button @click="clearLogs" size="small" style="margin-top: 10px;">
            清空日志
          </el-button>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Menu } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import TauriMenu from '@/utils/tauri/menu'
import { platform } from '@tauri-apps/plugin-os'

const logs = ref([])
const currentPlatform = ref('')

// 获取平台信息
onMounted(async () => {
  try {
    currentPlatform.value = await platform()
  } catch (error) {
    currentPlatform.value = 'unknown'
  }
})

const menuLocationHint = computed(() => {
  if (currentPlatform.value === 'win32') {
    return '菜单显示位置说明：在 Windows 上，由于窗口使用了自定义标题栏（decorations: false），应用菜单不会显示在窗口顶部。菜单会显示在窗口左上角右键菜单中，或者您可以通过 Alt 键访问。建议在 macOS 上测试菜单功能，菜单会显示在系统顶部菜单栏。'
  } else if (currentPlatform.value === 'darwin') {
    return '菜单显示位置说明：在 macOS 上，应用菜单会显示在系统顶部菜单栏（屏幕顶部）。点击菜单项后会在页面日志中显示操作记录。'
  } else {
    return '菜单显示位置说明：应用菜单会显示在系统菜单栏。点击菜单项后会在页面日志中显示操作记录。'
  }
})

const addLog = (message, type = 'info') => {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift({ time, message, type })
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

const clearLogs = () => {
  logs.value = []
  ElMessage.success('日志已清空')
}

const createBasicMenu = async () => {
  try {
    addLog('正在创建基础菜单...', 'info')
    const menu = await TauriMenu.createBasicMenu()
    await TauriMenu.setAppMenu(menu)
    addLog('基础菜单创建成功', 'success')
  } catch (error) {
    addLog('创建基础菜单失败: ' + error.message, 'danger')
  }
}

const createMultiLevelMenu = async () => {
  try {
    addLog('正在创建多级菜单...', 'info')
    const menu = await TauriMenu.createMultiLevelMenu()
    await TauriMenu.setAppMenu(menu)
    addLog('多级菜单创建成功', 'success')
  } catch (error) {
    addLog('创建多级菜单失败: ' + error.message, 'danger')
  }
}

const createPredefinedMenu = async () => {
  try {
    addLog('正在创建预定义菜单...', 'info')
    const menu = await TauriMenu.createPredefinedMenu()
    await TauriMenu.setAppMenu(menu)
    addLog('预定义菜单创建成功', 'success')
  } catch (error) {
    addLog('创建预定义菜单失败: ' + error.message, 'danger')
  }
}

const createDynamicMenu = async () => {
  try {
    addLog('正在创建动态菜单...', 'info')
    const { menu } = await TauriMenu.createDynamicMenu()
    await TauriMenu.setAppMenu(menu)
    addLog('动态菜单创建成功，可以尝试点击菜单项查看状态变化', 'success')
  } catch (error) {
    addLog('创建动态菜单失败: ' + error.message, 'danger')
  }
}
</script>

<style scoped>
.menu-demo {
  height: 100vh;
  overflow-y: auto;
  background: #f5f5f5;
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

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-empty {
  text-align: center;
  color: #999;
  padding: 20px;
}

pre {
  background: #f5f5f5;
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

