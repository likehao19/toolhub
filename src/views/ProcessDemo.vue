<template>
  <div class="process-demo-page">
    <TitleBar title="进程管理 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">⚙️ 进程管理</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">应用控制</div>
          </template>
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

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">系统信息</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="操作系统">
              {{ systemInfo.platform }}
            </el-descriptions-item>
            <el-descriptions-item label="CPU 架构">
              {{ systemInfo.arch }}
            </el-descriptions-item>
            <el-descriptions-item label="系统版本">
              {{ systemInfo.version }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Close, Refresh } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriProcess } from '@/utils/tauri'

const router = useRouter()
const systemInfo = ref({
  platform: 'unknown',
  arch: 'unknown',
  version: 'unknown'
})

const handleExit = async () => {
  try {
    await ElMessageBox.confirm('确定要退出应用吗？', '确认退出', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await TauriProcess.exitApp(0)
  } catch {
    // 用户取消
  }
}

const handleRelaunch = async () => {
  try {
    await ElMessageBox.confirm('确定要重启应用吗？', '确认重启', {
      confirmButtonText: '重启',
      cancelButtonText: '取消',
      type: 'info'
    })
    await TauriProcess.relaunchApp()
  } catch {
    // 用户取消
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(async () => {
  systemInfo.value = await TauriProcess.getSystemInfo()
})
</script>

<style scoped>
.process-demo-page {
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
</style>

