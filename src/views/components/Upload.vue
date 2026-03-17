<template>
  <DocPage
    icon="📤"
    title="文件上传"
    description="通过 HTTP 上传文件到服务器。文件上传 API 提供了完整的文件上传功能，支持单文件和多文件上传，可以设置上传进度、自定义请求头、添加额外表单字段等。所有上传操作都通过 Rust 后端处理，确保安全性和性能。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="上传文件"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="uploadForm" label-width="100px">
              <el-form-item label="上传 URL">
                <el-input v-model="uploadForm.url" placeholder="https://httpbin.org/post" />
              </el-form-item>
              <el-form-item label="选择文件">
                <el-button @click="selectFile">
                  <el-icon><FolderOpened /></el-icon>
                  选择文件
                </el-button>
                <span v-if="uploadForm.filePath" style="margin-left: 12px; color: #666">
                  {{ uploadForm.filePath }}
                </span>
              </el-form-item>
              <el-form-item label="上传字段名">
                <el-input v-model="uploadForm.fieldName" placeholder="file" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="uploadFile" :loading="uploading" :disabled="!uploadForm.filePath">
                  <el-icon><Upload /></el-icon>
                  开始上传
                </el-button>
                <el-button @click="fillExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-progress
              v-if="uploadProgress > 0 && uploadProgress < 100"
              :percentage="uploadProgress"
              style="margin-top: 16px;"
            />
            <el-descriptions v-if="uploadResult" :column="1" border style="margin-top: 16px;">
              <el-descriptions-item label="状态码">
                <el-tag :type="uploadResult.status >= 200 && uploadResult.status < 300 ? 'success' : 'danger'">
                  {{ uploadResult.status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="响应">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 300px; overflow: auto;">{{ uploadResponseBody }}</pre>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="多文件上传示例"
        :code="multiFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              多文件上传功能需要选择多个文件，当前 demo 展示单文件上传。多文件上传的 API 调用方式与单文件相同，只需传入文件路径数组即可。
            </el-alert>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="支持的文件类型">
                所有文件类型
              </el-descriptions-item>
              <el-descriptions-item label="最大文件大小">
                取决于服务器配置
              </el-descriptions-item>
              <el-descriptions-item label="上传方式">
                multipart/form-data
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened, Upload } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriUpload, TauriDialog } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'uploadFile',
    description: '上传文件到服务器',
    params: [
      { name: 'url', type: 'string', description: '上传 URL' },
      { name: 'filePath', type: 'string | string[]', description: '文件路径或文件路径数组' },
      { name: 'options', type: 'Object', default: '{}', description: '上传选项（headers, fieldName 等）' }
    ],
    returns: 'Promise<Response>',
    example: "const result = await TauriUpload.uploadFile('https://httpbin.org/post', '/path/to/file.txt')"
  }
]

const methodsData = [
  {
    name: 'uploadFile',
    description: '上传文件',
    usage: "await TauriUpload.uploadFile('https://httpbin.org/post', '/path/to/file.txt')"
  }
]

const uploading = ref(false)
const uploadProgress = ref(0)
const uploadForm = ref({
  url: 'https://httpbin.org/post',
  filePath: '',
  fieldName: 'file'
})
const uploadResult = ref(null)

const basicCode = `import { TauriUpload, TauriDialog } from '@/utils/tauri'

// 选择文件
const filePath = await TauriDialog.openFile()

// 上传文件
const result = await TauriUpload.uploadFile(
  'https://httpbin.org/post',
  filePath
)

const data = await result.json()`

const multiFileCode = `import { TauriUpload } from '@/utils/tauri'

// 上传多个文件
const result = await TauriUpload.uploadFile(
  'https://httpbin.org/post',
  filePaths,
  {
    fieldName: 'files'
  }
)

const data = await result.json()`

const uploadResponseBody = computed(() => {
  if (!uploadResult.value) return ''
  try {
    return JSON.stringify(JSON.parse(uploadResult.value.body), null, 2)
  } catch {
    return uploadResult.value.body
  }
})

const selectFile = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      uploadForm.value.filePath = path
      ElMessage.success('文件已选择')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const uploadFile = async () => {
  if (!uploadForm.value.filePath) {
    ElMessage.warning('请选择文件')
    return
  }
  
  uploading.value = true
  uploadProgress.value = 0
  uploadResult.value = null
  
  try {
    const options = {}
    if (uploadForm.value.fieldName) {
      options.fieldName = uploadForm.value.fieldName
    }
    
    const result = await TauriUpload.uploadFile(uploadForm.value.url, uploadForm.value.filePath, options)
    const data = await result.json()
    uploadResult.value = {
      status: result.status || 200,
      body: JSON.stringify(data, null, 2)
    }
    uploadProgress.value = 100
    ElMessage.success('文件上传成功')
  } catch (error) {
    ElMessage.error('上传失败: ' + (error.message || String(error)))
    uploadProgress.value = 0
  } finally {
    uploading.value = false
  }
}

const fillExample = () => {
  uploadForm.value.url = 'https://httpbin.org/post'
  uploadForm.value.fieldName = 'file'
}
</script>
