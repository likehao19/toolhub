<template>
  <div class="dialog-demo-page">
    <TitleBar title="对话框演示 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">💬 对话框演示</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">文件对话框</div>
          </template>
          <el-space direction="vertical" style="width: 100%">
            <el-button @click="openFileDialog">
              <el-icon><FolderOpened /></el-icon>
              选择文件
            </el-button>
            <el-button @click="openFilesDialog">
              <el-icon><Files /></el-icon>
              选择多个文件
            </el-button>
            <el-button @click="openFolderDialog">
              <el-icon><Folder /></el-icon>
              选择文件夹
            </el-button>
            <el-button @click="openSaveDialog">
              <el-icon><Document /></el-icon>
              保存文件
            </el-button>
          </el-space>
          <div v-if="selectedPath" class="result-box">
            <strong>选择结果：</strong>
            <pre>{{ selectedPath }}</pre>
          </div>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">消息对话框</div>
          </template>
          <el-space wrap>
            <el-button type="info" @click="showMessage">消息对话框</el-button>
            <el-button type="warning" @click="showConfirm">确认对话框</el-button>
            <el-button type="danger" @click="showAsk">询问对话框</el-button>
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
import { FolderOpened, Files, Folder, Document } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriDialog } from '@/utils/tauri'

const router = useRouter()
const selectedPath = ref('')

const openFileDialog = async () => {
  const path = await TauriDialog.openFile()
  if (path) {
    selectedPath.value = `单个文件: ${path}`
  }
}

const openFilesDialog = async () => {
  const paths = await TauriDialog.openFiles()
  if (paths) {
    selectedPath.value = `多个文件:\n${paths.join('\n')}`
  }
}

const openFolderDialog = async () => {
  const path = await TauriDialog.selectFolder()
  if (path) {
    selectedPath.value = `文件夹: ${path}`
  }
}

const openSaveDialog = async () => {
  const path = await TauriDialog.saveFile({
    defaultPath: 'untitled.txt'
  })
  if (path) {
    selectedPath.value = `保存路径: ${path}`
  }
}

const showMessage = async () => {
  await TauriDialog.messageDialog('这是一个消息对话框示例', {
    title: '消息',
    kind: 'info'
  })
}

const showConfirm = async () => {
  const confirmed = await TauriDialog.confirmDialog('确定要执行此操作吗？', {
    title: '确认',
    kind: 'warning'
  })
  ElMessage.info(confirmed ? '已确认' : '已取消')
}

const showAsk = async () => {
  const result = await TauriDialog.askDialog('是否继续？', {
    title: '询问',
    kind: 'question'
  })
  ElMessage.info(result ? '选择了是' : '选择了否')
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.dialog-demo-page {
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

