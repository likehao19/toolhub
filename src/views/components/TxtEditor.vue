<template>
  <div class="txt-editor">
    <textarea
      ref="editorRef"
      :value="modelValue"
      class="txt-textarea"
      @keydown="handleKeydown"
      @input="handleInput"
    ></textarea>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const editorRef = ref(null)

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleKeydown = (event) => {
  // Ctrl+S 保存
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    emit('save')
  }
  // Tab 键插入两个空格
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = props.modelValue
    const newText = text.substring(0, start) + '  ' + text.substring(end)
    emit('update:modelValue', newText)
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
      textarea.focus()
    })
  }
}

// 暴露方法供父组件调用
defineExpose({
  focus: () => editorRef.value?.focus()
})
</script>

<style scoped>
.txt-editor {
  flex: 1;
  overflow: hidden;
}

.txt-textarea {
  width: 100%;
  height: 100%;
  padding: 40px 60px;
  border: none;
  outline: none;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.8;
  resize: none;
  background: #fff;
}
</style>
