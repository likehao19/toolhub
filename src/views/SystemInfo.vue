<template>
  <div class="system-info-page">
    <TitleBar title="系统信息 - Tauri 功能演示" />
    <div class="info-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">💻 系统信息</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="info-card">
          <template #header>
            <div class="card-header">操作系统信息</div>
          </template>
          <el-descriptions :column="1" border v-loading="loading">
            <el-descriptions-item label="操作系统">
              <el-tag :type="getPlatformType(systemInfo.platform)">
                {{ systemInfo.platform }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="系统版本">
              {{ systemInfo.version }}
            </el-descriptions-item>
            <el-descriptions-item label="CPU 架构">
              <el-tag>{{ systemInfo.arch }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="应用版本">
              <el-tag type="success">v0.1.0</el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <el-button @click="refreshInfo" style="margin-top: 16px" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新信息
          </el-button>
        </el-card>

        <el-card shadow="hover" class="info-card">
          <template #header>
            <div class="card-header">环境信息</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Node 环境">
              {{ envMode }}
            </el-descriptions-item>
            <el-descriptions-item label="基础路径">
              {{ baseUrl }}
            </el-descriptions-item>
            <el-descriptions-item label="用户代理">
              {{ userAgent }}
            </el-descriptions-item>
            <el-descriptions-item label="语言">
              {{ language }}
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
import { Refresh } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriProcess } from '@/utils/tauri'

const router = useRouter()
const loading = ref(false)
const systemInfo = ref({
  platform: 'unknown',
  arch: 'unknown',
  version: 'unknown'
})

// 环境变量
const envMode = import.meta.env.MODE
const baseUrl = import.meta.env.BASE_URL

// 浏览器信息（安全访问）
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Tauri 环境'
const language = typeof navigator !== 'undefined' ? navigator.language : '未知'

const getPlatformType = (platform) => {
  if (platform.includes('win')) return 'primary'
  if (platform.includes('darwin')) return 'success'
  if (platform.includes('linux')) return 'warning'
  return 'info'
}

const refreshInfo = async () => {
  loading.value = true
  try {
    systemInfo.value = await TauriProcess.getSystemInfo()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  refreshInfo()
})
</script>

<style scoped>
.system-info-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
}

.info-view {
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

.info-card {
  width: 100%;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}
</style>

