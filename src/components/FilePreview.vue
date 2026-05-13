<template>
  <el-drawer
    v-model="visible"
    :title="title"
    size="60%"
    direction="rtl"
    :before-close="handleClose"
  >
    <div class="file-preview-container">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
        <p>加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <el-icon :size="50" color="var(--el-color-danger)"><CircleClose /></el-icon>
        <p>{{ error }}</p>
      </div>

      <!-- 图片预览 -->
      <div v-else-if="fileType === 'image'" class="image-preview">
        <img :src="imageData" :alt="fileName" />
        <div class="image-info">
          <el-tag>{{ fileExtension?.toUpperCase() }}</el-tag>
          <el-tag type="info">{{ formatSize(fileSize) }}</el-tag>
        </div>
      </div>

      <!-- 文本预览 -->
      <div v-else-if="fileType === 'text'" class="text-preview">
        <div class="preview-toolbar">
          <el-space>
            <el-tag>{{ fileExtension?.toUpperCase() }}</el-tag>
            <el-tag type="info">{{ formatSize(fileSize) }}</el-tag>
            <el-tag type="success">{{ lineCount }} 行</el-tag>
          </el-space>
          <el-space>
            <el-button size="small" @click="enableEdit" v-if="!isEditing">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="primary" @click="saveFile" v-if="isEditing">
              <el-icon><Check /></el-icon>
              保存
            </el-button>
            <el-button size="small" @click="cancelEdit" v-if="isEditing">
              <el-icon><Close /></el-icon>
              取消
            </el-button>
          </el-space>
        </div>

        <!-- 只读模式 -->
        <pre v-if="!isEditing" class="code-view"><code>{{ fileContent }}</code></pre>

        <!-- 编辑模式 -->
        <el-input
          v-else
          v-model="editContent"
          type="textarea"
          :rows="30"
          class="code-editor"
          placeholder="输入文件内容..."
        />
      </div>

      <!-- 不支持的文件类型 -->
      <div v-else class="unsupported-state">
        <el-icon :size="50" color="var(--el-text-color-secondary)"><Document /></el-icon>
        <p>不支持预览此文件类型</p>
        <el-tag>{{ fileExtension?.toUpperCase() || '未知' }}</el-tag>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, CircleClose, Document, Edit, Check, Close } from '@element-plus/icons-vue'
import * as FileOps from '@/utils/tauri/fileOps'

const props = defineProps({
  modelValue: Boolean,
  filePath: String,
  fileName: String,
  fileExtension: String
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const title = computed(() => props.fileName || '文件预览')

const loading = ref(false)
const error = ref(null)
const fileType = ref(null) // 'image', 'text', 'unsupported'
const fileContent = ref('')
const fileSize = ref(0)
const imageData = ref('')

// 编辑相关
const isEditing = ref(false)
const editContent = ref('')
const originalContent = ref('')

// 计算行数
const lineCount = computed(() => {
  return fileContent.value.split('\n').length
})

// 监听文件路径变化，加载文件
watch(() => props.filePath, (newPath) => {
  if (newPath && visible.value) {
    loadFile(newPath)
  }
}, { immediate: true })

// 监听抽屉打开
watch(visible, (isVisible) => {
  if (isVisible && props.filePath) {
    loadFile(props.filePath)
  } else if (!isVisible) {
    // 关闭时重置状态
    resetState()
  }
})

// 文件大小限制（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 加载文件
 */
const loadFile = async (path) => {
  loading.value = true
  error.value = null

  try {
    const ext = props.fileExtension

    // 判断文件类型
    if (FileOps.isImageFile(ext)) {
      // 图片文件
      fileType.value = 'image'
      
      // 检查文件大小（图片文件限制为 50MB）
      const MAX_IMAGE_SIZE = 50 * 1024 * 1024
      try {
        // 先尝试获取文件大小
        const fs = await import('@tauri-apps/plugin-fs')
        const stat = await fs.stat(path)
        if (stat.size > MAX_IMAGE_SIZE) {
          throw new Error(`图片文件过大（${(stat.size / 1024 / 1024).toFixed(2)}MB），最大支持 50MB`)
        }
      } catch (err) {
        if (err.message.includes('过大')) {
          throw err
        }
        // 如果获取大小失败，继续尝试加载
      }
      
      const base64 = await FileOps.readFileAsBase64(path)
      const mimeType = FileOps.getMimeType(ext)
      imageData.value = `data:${mimeType};base64,${base64}`
    } else if (FileOps.isTextFile(ext)) {
      // 文本文件
      fileType.value = 'text'
      const result = await FileOps.readTextFile(path)
      
      // 检查文件大小
      if (result.size > MAX_FILE_SIZE) {
        throw new Error(`文件过大（${(result.size / 1024 / 1024).toFixed(2)}MB），最大支持 10MB`)
      }
      
      fileContent.value = result.content
      fileSize.value = result.size
      originalContent.value = result.content
    } else {
      // 不支持的类型
      fileType.value = 'unsupported'
    }
  } catch (err) {
    error.value = err.message || '加载文件失败'
    // 特殊处理权限错误
    if (err.message && (err.message.includes('权限') || err.message.includes('permission') || err.message.includes('denied'))) {
      error.value = '没有权限访问此文件，请检查文件权限设置'
    }
  } finally {
    loading.value = false
  }
}

/**
 * 启用编辑模式
 */
const enableEdit = () => {
  editContent.value = fileContent.value
  isEditing.value = true
}

/**
 * 取消编辑
 */
const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

/**
 * 保存文件
 */
const saveFile = async () => {
  try {
    loading.value = true
    await FileOps.writeTextFile(props.filePath, editContent.value)

    // 更新显示内容
    fileContent.value = editContent.value
    originalContent.value = editContent.value
    isEditing.value = false

    ElMessage.success('文件保存成功')
    emit('saved')
  } catch (err) {
    ElMessage.error('保存失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

/**
 * 格式化文件大小
 */
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  if (!bytes) return '-'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 关闭前检查
 */
const handleClose = async (done) => {
  if (isEditing.value && editContent.value !== originalContent.value) {
    // 有未保存的修改
    try {
      await ElMessageBox.confirm(
        '有未保存的修改，确定要关闭吗？',
        '确认关闭',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      done()
    } catch {
      // 用户取消，不关闭
    }
  } else {
    done()
  }
}

/**
 * 重置状态
 */
const resetState = () => {
  loading.value = false
  error.value = null
  fileType.value = null
  fileContent.value = ''
  fileSize.value = 0
  imageData.value = ''
  isEditing.value = false
  editContent.value = ''
  originalContent.value = ''
}
</script>

<style scoped>
.file-preview-container {
  height: 100%;
  overflow: auto;
}

.loading-state,
.error-state,
.unsupported-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 20px;
}

.loading-state p,
.error-state p,
.unsupported-state p {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.error-state p {
  color: var(--el-color-danger);
}

/* ignore */
.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.image-preview img {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.image-info {
  display: flex;
  gap: 10px;
}

/* ignore */
.text-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  background: var(--el-fill-color-light);
}

.code-view {
  flex: 1;
  margin: 0;
  padding: 20px;
  background: #f8f8f8;
  border: none;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre;
}

.code-view code {
  background: transparent;
}

.code-editor {
  flex: 1;
}

.code-editor :deep(textarea) {
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.6;
  background: #f8f8f8;
}
</style>
