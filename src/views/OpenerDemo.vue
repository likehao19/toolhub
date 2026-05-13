<template>
  <div class="opener-demo-page">
    <TitleBar title="打开外部应用 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🔗 打开外部应用</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">打开 URL</div>
          </template>
          <el-input
            v-model="urlInput"
            placeholder="输入 URL，例如: https://www.baidu.com"
            style="margin-bottom: 12px"
          />
          <el-button type="primary" @click="openUrl">
            <el-icon><Link /></el-icon>
            在浏览器中打开
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速链接</div>
          </template>
          <el-space wrap>
            <el-button @click="openQuickUrl('https://www.baidu.com')">百度</el-button>
            <el-button @click="openQuickUrl('https://www.github.com')">GitHub</el-button>
            <el-button @click="openQuickUrl('https://tauri.app')">Tauri 官网</el-button>
            <el-button @click="openQuickUrl('https://vuejs.org')">Vue.js 官网</el-button>
          </el-space>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">打开文件/目录</div>
          </template>
          <el-space direction="vertical" style="width: 100%">
            <el-button @click="openPathDialog">
              <el-icon><FolderOpened /></el-icon>
              选择并打开文件/目录
            </el-button>
            <div v-if="openedPath" class="result-box">
              <strong>已打开：</strong>
              <pre>{{ openedPath }}</pre>
            </div>
          </el-space>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link, FolderOpened } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriShell, TauriDialog } from '@/utils/tauri'
import { openPath } from '@tauri-apps/plugin-opener'

const router = useRouter()
const urlInput = ref('https://www.baidu.com')
const openedPath = ref('')

const openUrl = async () => {
  if (!urlInput.value.trim()) {
    ElMessage.warning('请输入 URL')
    return
  }
  await TauriShell.openURL(urlInput.value)
}

const openQuickUrl = async (url) => {
  urlInput.value = url
  await TauriShell.openURL(url)
}

const openPathDialog = async () => {
  const path = await TauriDialog.openFile()
  if (path) {
    openedPath.value = path
    await openPath(path)
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.opener-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: var(--el-fill-color-light);
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

.result-box {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.result-box pre {
  margin: 8px 0 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

