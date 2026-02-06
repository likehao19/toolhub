<template>
  <div class="markdown-editor-wrapper">
    <MdEditor
      ref="editorRef"
      v-model="content"
      :theme="theme"
      :toolbars="toolbars"
      :previewTheme="previewTheme"
      :codeTheme="codeTheme"
      :editorConfig="{ renderDelay: 0 }"
      :transformImgUrl="transformImgUrl"
      :mdHeadingId="customMdHeadingId"
      :mermaidConfig="{ logLevel: 'fatal' }"
      catalogLayout="flat"
      @onSave="handleSave"
      @onUploadImg="handleUploadImg"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { convertFileSrc } from '@tauri-apps/api/core'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'light'
  },
  previewTheme: {
    type: String,
    default: 'mk-cute'
  },
  codeTheme: {
    type: String,
    default: 'github'
  },
  previewOnly: {
    type: Boolean,
    default: false
  },
  selectedFile: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'uploadImg'])

const editorRef = ref(null)
const content = ref(props.modelValue)

// 工具栏配置 - 完整的编辑工具栏
const toolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', 'codeRow', 'code', '-',
  'link', 'image', 'table', 'mermaid', 'katex', '-',
  'revoke', 'next', 'prettier', '=',
  'fullscreen', 'preview', 'catalog',
]

// 转换图片 URL - 将相对路径转换为 Tauri 可访问的绝对路径
const transformImgUrl = (url) => {
  // 如果已经是 http/https/data 协议，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('asset://')) {
    return url
  }
  
  // 如果是相对路径 ./images/...
  if (url.startsWith('./images/') && props.selectedFile) {
    try {
      const filePath = props.selectedFile.path
      const separator = filePath.includes('\\') ? '\\' : '/'
      
      // 找到 notes 根目录
      const notesIndex = filePath.indexOf(`${separator}notes${separator}`)
      if (notesIndex === -1) {
        return url
      }
      
      const notesRoot = filePath.substring(0, notesIndex + separator.length + 5) // +5 for "notes"
      const imagePath = url.substring(2).replace(/\//g, separator) // 移除 "./" 并统一路径分隔符
      const absolutePath = `${notesRoot}${separator}${imagePath}`
      
      return convertFileSrc(absolutePath)
    } catch (error) {
      return url
    }
  }
  
  return url
}

// 自定义标题 ID 生成函数，确保唯一性
const customMdHeadingId = (text, level, index) => {
  const textStr = typeof text === 'string' ? text : String(text || '')
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const safeText = textStr.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').substring(0, 30)
  return `heading-${level}-${index}-${timestamp}-${random}-${safeText}`
}

// 监听内容变化
watch(content, (newVal) => {
  emit('update:modelValue', newVal)
})

watch(() => props.modelValue, (newVal) => {
  if (newVal !== content.value) {
    content.value = newVal
  }
})

// 处理保存
const handleSave = (v) => {
  emit('save', v)
}

// 处理图片上传
const handleUploadImg = (files, callback) => {
  emit('uploadImg', files, callback)
}

// 暴露方法供父组件调用
defineExpose({
  editorRef,
  toggleCatalog: (show) => {
    editorRef.value?.toggleCatalog(show)
  },
  togglePreview: (show) => {
    editorRef.value?.togglePreview(show)
  },
  togglePreviewOnly: (show) => {
    editorRef.value?.togglePreviewOnly(show)
  }
})
</script>

<style scoped>
.markdown-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.markdown-editor-wrapper :deep(.md-editor) {
  height: 100%;
}
</style>
