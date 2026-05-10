<template>
  <div class="shortcut-demo-page">
    <TitleBar title="全局快捷键 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">⌨️ 全局快捷键</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">注册快捷键</div>
          </template>
          <el-form :model="shortcutForm" label-width="120px">
            <el-form-item label="快捷键">
              <el-input
                v-model="shortcutForm.shortcut"
                placeholder="例如: CommandOrControl+Shift+C"
              />
              <div class="form-tip">
                支持的修饰键: CommandOrControl, Alt, Shift, Meta, Super
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="registerShortcut">
                <el-icon><Plus /></el-icon>
                注册快捷键
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">已注册的快捷键</div>
          </template>
          <el-table :data="registeredShortcuts" border style="width: 100%">
            <el-table-column prop="shortcut" label="快捷键" />
            <el-table-column prop="count" label="触发次数" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  @click="unregisterShortcut(row.shortcut)"
                >
                  取消注册
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button
            type="danger"
            @click="unregisterAll"
            style="margin-top: 12px"
            :disabled="registeredShortcuts.length === 0"
          >
            取消所有快捷键
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快捷键日志</div>
          </template>
          <div class="log-container">
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="log-item"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-content">{{ log.content }}</span>
            </div>
            <div v-if="logs.length === 0" class="empty-log">
              暂无日志，注册快捷键后触发时会显示在这里
            </div>
          </div>
          <el-button @click="clearLogs" style="margin-top: 12px" size="small">
            清空日志
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">实用快捷键 Demo</div>
          </template>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          >
            <template #title>
              <div>注册以下快捷键后，即使应用不在焦点也能触发操作</div>
            </template>
          </el-alert>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="demo-group">
                <div class="group-title">窗口控制</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button 
                    type="primary" 
                    @click="registerDemoShortcut('CommandOrControl+Shift+H', handleShowHideWindow)"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+H')"
                  >
                    <el-icon><Hide v-if="windowVisible" /><View v-else /></el-icon>
                    Ctrl+Shift+H - 显示/隐藏窗口
                  </el-button>
                </el-space>
              </div>
            </el-col>
            
            <el-col :span="12">
              <div class="demo-group">
                <div class="group-title">打开新窗口</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button 
                    @click="registerDemoShortcut('CommandOrControl+Shift+N', () => openNewWindow('https://www.baidu.com'))"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+N')"
                  >
                    <el-icon><Link /></el-icon>
                    Ctrl+Shift+N - 打开百度
                  </el-button>
                  <el-button 
                    @click="registerDemoShortcut('CommandOrControl+Shift+G', () => openNewWindow('https://www.github.com'))"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+G')"
                  >
                    <el-icon><Link /></el-icon>
                    Ctrl+Shift+G - 打开 GitHub
                  </el-button>
                </el-space>
              </div>
            </el-col>
            
            <el-col :span="12">
              <div class="demo-group">
                <div class="group-title">页面导航</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button 
                    @click="registerDemoShortcut('CommandOrControl+Shift+1', () => navigateTo('/'))"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+1')"
                  >
                    <el-icon><HomeFilled /></el-icon>
                    Ctrl+Shift+1 - 回到首页
                  </el-button>
                  <el-button 
                    @click="registerDemoShortcut('CommandOrControl+Shift+2', () => navigateTo('/settings'))"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+2')"
                  >
                    <el-icon><Setting /></el-icon>
                    Ctrl+Shift+2 - 打开设置
                  </el-button>
                  <el-button 
                    @click="registerDemoShortcut('CommandOrControl+Shift+3', () => navigateTo('/file-manager'))"
                    :disabled="isShortcutRegistered('CommandOrControl+Shift+3')"
                  >
                    <el-icon><FolderOpened /></el-icon>
                    Ctrl+Shift+3 - 文件管理器
                  </el-button>
                </el-space>
              </div>
            </el-col>
            
            <el-col :span="12">
              <div class="demo-group">
                <div class="group-title">快速测试</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button @click="quickRegister('CommandOrControl+Shift+C')">
                    注册 Ctrl+Shift+C
                  </el-button>
                  <el-button @click="quickRegister('Alt+F1')">
                    注册 Alt+F1
                  </el-button>
                  <el-button @click="quickRegister('CommandOrControl+K')">
                    注册 Ctrl+K
                  </el-button>
                </el-space>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Hide, View, Link, HomeFilled, Setting, FolderOpened } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriGlobalShortcut } from '@/utils/tauri'
import { windowApi } from '@/api/window'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const router = useRouter()
const shortcutForm = ref({
  shortcut: 'CommandOrControl+Shift+C'
})
const registeredShortcuts = ref([])
const logs = ref([])
const windowVisible = ref(true)

const addLog = (content) => {
  logs.value.unshift({
    content,
    time: new Date().toLocaleTimeString()
  })
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

const registerShortcut = async () => {
  if (!shortcutForm.value.shortcut.trim()) {
    ElMessage.warning('请输入快捷键')
    return
  }

  const shortcut = shortcutForm.value.shortcut.trim()
  
  // 检查是否已注册
  if (registeredShortcuts.value.find(s => s.shortcut === shortcut)) {
    ElMessage.warning('该快捷键已注册')
    return
  }

  try {
    // 先添加到数组，这样 handler 中才能找到
    const item = {
      shortcut,
      count: 0
    }
    registeredShortcuts.value.push(item)
    
    // 然后注册快捷键
    await TauriGlobalShortcut.registerShortcut(shortcut, () => {
      item.count++
      addLog(`快捷键 ${shortcut} 被触发`)
    })
    
    addLog(`快捷键 ${shortcut} 注册成功`)
  } catch (error) {
    // 如果注册失败，从数组中移除
    registeredShortcuts.value = registeredShortcuts.value.filter(s => s.shortcut !== shortcut)
    ElMessage.error('注册失败: ' + error.message)
  }
}

const unregisterShortcut = async (shortcut) => {
  try {
    await TauriGlobalShortcut.unregisterShortcut(shortcut)
    registeredShortcuts.value = registeredShortcuts.value.filter(s => s.shortcut !== shortcut)
    addLog(`快捷键 ${shortcut} 已取消注册`)
  } catch (error) {
    ElMessage.error('取消注册失败: ' + error.message)
  }
}

const unregisterAll = async () => {
  try {
    await TauriGlobalShortcut.unregisterAllShortcuts()
    registeredShortcuts.value = []
    addLog('所有快捷键已取消注册')
  } catch (error) {
    ElMessage.error('取消注册失败: ' + error.message)
  }
}

const quickRegister = async (shortcut) => {
  shortcutForm.value.shortcut = shortcut
  await registerShortcut()
}

const clearLogs = () => {
  logs.value = []
}

const goBack = () => {
  router.push('/')
}

// 检查快捷键是否已注册
const isShortcutRegistered = (shortcut) => {
  return registeredShortcuts.value.some(s => s.shortcut === shortcut)
}

// 注册 Demo 快捷键（带特定功能）
const registerDemoShortcut = async (shortcut, handler) => {
  if (isShortcutRegistered(shortcut)) {
    ElMessage.warning('该快捷键已注册')
    return
  }

  try {
    await TauriGlobalShortcut.registerShortcut(shortcut, handler)
    
    registeredShortcuts.value.push({
      shortcut,
      count: 0,
      isDemo: true
    })
    
    addLog(`快捷键 ${shortcut} 注册成功（Demo）`)
    ElMessage.success(`快捷键 ${shortcut} 注册成功`)
  } catch (error) {
    ElMessage.error('注册失败: ' + error.message)
  }
}

// 显示/隐藏窗口
const handleShowHideWindow = async () => {
  try {
    const window = getCurrentWebviewWindow()
    const isVisible = await window.isVisible()
    
    if (isVisible) {
      await window.hide()
      windowVisible.value = false
      addLog('窗口已隐藏')
      ElMessage.info('窗口已隐藏到后台')
    } else {
      await window.show()
      await window.setFocus()
      windowVisible.value = true
      addLog('窗口已显示')
      ElMessage.success('窗口已显示')
    }
    
    // 更新触发次数
    const item = registeredShortcuts.value.find(s => s.shortcut === 'CommandOrControl+Shift+H')
    if (item) {
      item.count++
    }
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

// 打开新窗口
const openNewWindow = async (url) => {
  try {
    await windowApi.createChildWindow(url)
    addLog(`已打开新窗口: ${url}`)
    ElMessage.success('新窗口已打开')
    
    // 更新触发次数
    const shortcut = url.includes('github') ? 'CommandOrControl+Shift+G' : 'CommandOrControl+Shift+N'
    const item = registeredShortcuts.value.find(s => s.shortcut === shortcut)
    if (item) {
      item.count++
    }
  } catch (error) {
    ElMessage.error('打开窗口失败: ' + error.message)
  }
}

// 页面导航
const navigateTo = (path) => {
  router.push(path)
  addLog(`已导航到: ${path}`)
  ElMessage.success(`已导航到 ${path}`)
  
  // 更新触发次数
  let shortcut = ''
  if (path === '/') shortcut = 'CommandOrControl+Shift+1'
  else if (path === '/settings') shortcut = 'CommandOrControl+Shift+2'
  else if (path === '/file-manager') shortcut = 'CommandOrControl+Shift+3'
  
  if (shortcut) {
    const item = registeredShortcuts.value.find(s => s.shortcut === shortcut)
    if (item) {
      item.count++
    }
  }
}

// 初始化时检查窗口状态
onMounted(async () => {
  try {
    const window = getCurrentWebviewWindow()
    windowVisible.value = await window.isVisible()
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.shortcut-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
}

.demo-view {
  padding: 24px;
  padding-top: 56px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-card {
  width: 100%;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
}

.log-item {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.log-time {
  color: #999;
  font-size: 11px;
  margin-right: 8px;
}

.log-content {
  word-break: break-all;
}

.empty-log {
  text-align: center;
  color: #999;
  padding: 20px;
}

.demo-group {
  margin-bottom: 20px;
}

.group-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: #666;
  font-size: 14px;
}
</style>

