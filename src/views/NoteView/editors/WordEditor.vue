<template>
  <div class="word-editor-wrapper">
    <div 
      ref="editorRef"
      class="word-editor-content"
      contenteditable="true"
      @input="handleInput"
      v-html="content"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '<p></p>'
  }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = ref(null)
const content = ref(props.modelValue)

watch(() => props.modelValue, async (newVal) => {
  if (newVal !== content.value) {
    content.value = newVal
    await nextTick()
    if (editorRef.value) {
      editorRef.value.innerHTML = newVal
    }
  }
})

const handleInput = () => {
  if (editorRef.value) {
    const html = editorRef.value.innerHTML
    content.value = html
    emit('update:modelValue', html)
  }
}

defineExpose({
  getContent: () => editorRef.value?.innerHTML || '',
  setContent: (html) => {
    if (editorRef.value) {
      editorRef.value.innerHTML = html
      content.value = html
    }
  }
})
</script>

<style scoped>
.word-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--el-fill-color-light);
  padding: 20px;
}

.word-editor-content {
  background: var(--bg-primary);
  min-height: 100%;
  padding: 40px 60px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  outline: none;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.word-editor-content:focus {
  box-shadow: 0 0 15px rgba(64, 158, 255, 0.3);
}

/* ignore */
.word-editor-content :deep(p) {
  margin: 0 0 12px 0;
}

.word-editor-content :deep(h1),
.word-editor-content :deep(h2),
.word-editor-content :deep(h3),
.word-editor-content :deep(h4),
.word-editor-content :deep(h5),
.word-editor-content :deep(h6) {
  margin: 16px 0 12px 0;
  font-weight: 600;
}

.word-editor-content :deep(ul),
.word-editor-content :deep(ol) {
  margin: 12px 0;
  padding-left: 40px;
}

.word-editor-content :deep(table) {
  border-collapse: collapse;
  margin: 12px 0;
}

.word-editor-content :deep(table td),
.word-editor-content :deep(table th) {
  border: 1px solid #ddd;
  padding: 8px;
}

.word-editor-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
