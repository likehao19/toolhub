<template>
  <div class="clipboard-demo-page">
    <TitleBar title="剪贴板管理 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">📋 剪贴板管理</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">写入剪贴板</div>
          </template>
          <el-input
            v-model="clipboardText"
            type="textarea"
            :rows="4"
            placeholder="输入要复制到剪贴板的文本..."
          />
          <el-button type="primary" @click="writeToClipboard" style="margin-top: 12px">
            <el-icon><DocumentCopy /></el-icon>
            复制到剪贴板
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">读取剪贴板</div>
          </template>
          <el-input
            v-model="readText"
            type="textarea"
            :rows="4"
            readonly
            placeholder="点击按钮读取剪贴板内容..."
          />
          <el-button type="success" @click="readFromClipboard" style="margin-top: 12px">
            <el-icon><Reading /></el-icon>
            读取剪贴板
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速操作</div>
          </template>
          <el-space wrap>
            <el-button @click="copyQuickText('Hello Tauri!')">复制示例文本</el-button>
            <el-button @click="copyQuickText('当前时间: ' + new Date().toLocaleString())">
              复制当前时间
            </el-button>
            <el-button @click="copyQuickText(window.location.href)">复制当前 URL</el-button>
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
import { DocumentCopy, Reading } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriClipboard } from '@/utils/tauri'

const router = useRouter()
const clipboardText = ref('')
const readText = ref('')

const writeToClipboard = async () => {
  if (!clipboardText.value.trim()) {
    ElMessage.warning('请输入要复制的文本')
    return
  }
  await TauriClipboard.write(clipboardText.value)
}

const readFromClipboard = async () => {
  readText.value = await TauriClipboard.read()
}

const copyQuickText = async (text) => {
  clipboardText.value = text
  await TauriClipboard.write(text)
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.clipboard-demo-page {
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
</style>

