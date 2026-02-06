<template>
  <DocPage
    icon="⚙️"
    title="进程管理"
    description="应用退出、重启等进程控制功能"
  >
    <template #basic>
      <CodeExample
        title="应用控制"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="警告"
              type="warning"
              :closable="false"
              style="margin-bottom: 16px"
            >
              这些操作会直接影响应用程序的运行状态
            </el-alert>
            <el-space>
              <el-button type="danger" @click="handleExit">
                <el-icon><Close /></el-icon>
                退出应用
              </el-button>
              <el-button type="primary" @click="handleRelaunch">
                <el-icon><Refresh /></el-icon>
                重启应用
              </el-button>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Close, Refresh } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import TauriProcess from '@/utils/tauri/process'

const basicCode = `import TauriProcess from '@/utils/tauri/process'

// 退出应用
await TauriProcess.exitApp()

// 重启应用
await TauriProcess.relaunchApp()`

const handleExit = async () => {
  try {
    await ElMessageBox.confirm('确定要退出应用吗？', '确认退出', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await TauriProcess.exitApp()
  } catch {
    // 用户取消
  }
}

const handleRelaunch = async () => {
  try {
    await ElMessageBox.confirm('确定要重启应用吗？', '确认重启', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    await TauriProcess.relaunchApp()
  } catch {
    // 用户取消
  }
}
</script>

