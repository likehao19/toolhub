<template>
  <div class="word-editor">
    <div
      ref="editorRef"
      contenteditable="true"
      class="word-content"
      v-html="modelValue"
      @input="handleInput"
      @paste="handlePaste"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '<p></p>'
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const editorRef = ref(null)

const handleInput = () => {
  if (editorRef.value) {
    emit('update:modelValue', editorRef.value.innerHTML)
  }
}

const handlePaste = (event) => {
  // 允许默认粘贴行为
}

// 格式化文本
const formatText = (command, value = null) => {
  if (!editorRef.value) return
  document.execCommand(command, false, value)
  editorRef.value.focus()
  handleInput()
}

// 暴露方法供父组件调用
defineExpose({
  focus: () => editorRef.value?.focus(),
  formatText
})
</script>

<style scoped>
.word-editor {
  flex: 1;
  overflow: hidden;
}

.word-content {
  flex: 1;
  padding: 40px 60px;
  overflow-y: auto;
  line-height: 1.8;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  outline: none;
  min-height: 100%;
}

.word-content:focus {
  outline: none;
}
</style>
