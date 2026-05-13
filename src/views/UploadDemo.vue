<template>
  <div class="upload-demo-page">
    <TitleBar title="文件上传 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">📤 文件上传</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">上传文件</div>
          </template>
          <el-form :model="uploadForm" label-width="100px">
            <el-form-item label="上传 URL">
              <el-input v-model="uploadForm.url" placeholder="https://httpbin.org/post" />
            </el-form-item>
            <el-form-item label="选择文件">
              <el-button @click="selectFile">
                <el-icon><FolderOpened /></el-icon>
                选择文件
              </el-button>
              <span v-if="uploadForm.filePath" style="margin-left: 12px; color: var(--text-secondary)">
                {{ uploadForm.filePath }}
              </span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="uploadFile" :loading="uploading" :disabled="!uploadForm.filePath">
                <el-icon><Upload /></el-icon>
                开始上传
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="uploadResult">
          <template #header>
            <div class="card-header">上传结果</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="状态码">{{ uploadResult.status }}</el-descriptions-item>
            <el-descriptions-item label="响应">
              <pre class="response-body">{{ uploadResponseBody }}</pre>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速测试</div>
          </template>
          <el-space wrap>
            <el-button @click="quickTest('https://httpbin.org/post')">
              测试 HTTPBin
            </el-button>
            <el-button @click="quickTest('https://httpbin.org/put')">
              测试 PUT 上传
            </el-button>
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
import { FolderOpened, Upload } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriUpload } from '@/utils/tauri'
import { TauriDialog } from '@/utils/tauri'

const router = useRouter()
const uploading = ref(false)
const uploadForm = ref({
  url: 'https://httpbin.org/post',
  filePath: ''
})
const uploadResult = ref(null)
const uploadResponseBody = ref('')

const selectFile = async () => {
  try {
    const file = await TauriDialog.openFile({
      multiple: false
    })
    if (file) {
      uploadForm.value.filePath = Array.isArray(file) ? file[0] : file
    }
  } catch (error) {
    if (error !== '用户取消') {
      ElMessage.error('选择文件失败: ' + error.message)
    }
  }
}

const uploadFile = async () => {
  if (!uploadForm.value.url.trim()) {
    ElMessage.warning('请输入上传 URL')
    return
  }

  if (!uploadForm.value.filePath) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  uploading.value = true
  try {
    const response = await TauriUpload.uploadFile(
      uploadForm.value.url,
      uploadForm.value.filePath
    )
    uploadResult.value = response
    uploadResponseBody.value = await response.text()
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message)
    uploadResult.value = null
    uploadResponseBody.value = ''
  } finally {
    uploading.value = false
  }
}

const quickTest = (url) => {
  uploadForm.value.url = url
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.upload-demo-page {
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

.response-body {
  max-height: 300px;
  overflow: auto;
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

