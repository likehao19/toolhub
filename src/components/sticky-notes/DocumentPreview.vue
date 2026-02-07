<template>
  <div class="quick-note">
    <textarea
      v-model="content"
      class="note-input"
      placeholder="直接写…"
      spellcheck="false"
    />
    <div class="bar">
      <span class="hint">Ctrl+S 保存</span>
      <span class="status" :class="{ unsaved: !isSaved }">
        {{ isSaved ? '已保存' : '未保存' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, onActivated } from 'vue'
import { ElMessage } from 'element-plus'
import { emit } from '@tauri-apps/api/event'
import { improveNote } from '@/services/aiService'

const content = ref('')
const saving = ref(false)
const noteName = ref('')
const isSaved = ref(false) // 保存状态，初始为未保存
const savedContent = ref('') // 保存时的内容快照

// 生成基于时间戳的文件名：YYYYMMDD_HHMMSS.md
const generateNoteName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}.md`
}

const save = async () => {
  // 内容为空时不保存，避免生成空文件
  if (!content.value.trim()) {
    return
  }
  // 如果已保存，跳过
  if (isSaved.value) {
    return
  }
  
  try {
    saving.value = true
    
    // 通过事件通知主窗口保存，主窗口会使用正确的路径配置
    await emit('sticky-notes-save', {
      noteName: noteName.value,
      content: content.value
    })
    
    // 保存成功后更新状态
    isSaved.value = true
    savedContent.value = content.value
  } catch (e) {
    const errorMsg = e?.message || e?.toString() || '未知错误'
    ElMessage.error('保存失败: ' + errorMsg)
  } finally {
    saving.value = false
  }
}

// 监听内容变化，检测是否需要保存
watch(content, (newContent) => {
  if (savedContent.value !== newContent) {
    isSaved.value = false
  }
  // 通知父组件内容更新
  window.dispatchEvent(new CustomEvent('sticky-notes-content-update', {
    detail: { content: newContent }
  }))
}, { immediate: false })

const onAIOrganize = async () => {
  const text = (content.value || '').trim()
  if (!text) {
    ElMessage.info('请先输入内容')
    return
  }
  try {
    const result = await improveNote(text)
    content.value = result || content.value
    ElMessage.success('已整理')
  } catch (e) {
    ElMessage.error(e?.message || 'AI 整理失败')
  }
}

onMounted(() => {
  noteName.value = generateNoteName()
  window.addEventListener('sticky-notes-save-documents', save)
  window.addEventListener('sticky-notes-ai-organize', onAIOrganize)
  window.dispatchEvent(new CustomEvent('sticky-notes-content-update', {
    detail: { content: content.value }
  }))
})

// keep-alive 切回时重新通知父组件当前内容
onActivated(() => {
  window.dispatchEvent(new CustomEvent('sticky-notes-content-update', {
    detail: { content: content.value }
  }))
})

onUnmounted(() => {
  window.removeEventListener('sticky-notes-save-documents', save)
  window.removeEventListener('sticky-notes-ai-organize', onAIOrganize)
})
</script>

<style scoped>
.quick-note {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.note-input {
  flex: 1;
  width: 100%;
  padding: 8px;
  padding-right: 14px;
  border: none;
  resize: none;
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  background: transparent;
  font-family: inherit;
  scrollbar-gutter: stable;
}

.note-input:focus {
  outline: none;
}

.note-input::-webkit-scrollbar {
  width: 6px;
}

.note-input::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 3px;
}

.note-input::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.note-input::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.bar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 6px;
  padding-top: 6px;
}

.hint {
  font-size: 11px;
  color: #94a3b8;
}

.status {
  font-size: 11px;
  color: #64748b;
  transition: color 0.2s;
}

.status.unsaved {
  color: #f59e0b;
}
</style>
