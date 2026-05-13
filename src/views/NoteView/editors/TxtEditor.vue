<template>
  <div class="txt-editor-wrapper">
    <textarea
      v-model="content"
      class="txt-editor"
      :placeholder="placeholder"
      @input="handleInput"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始输入文本内容...'
  }
})

const emit = defineEmits(['update:modelValue'])

const content = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  content.value = newVal
})

const handleInput = () => {
  emit('update:modelValue', content.value)
}
</script>

<style scoped>
.txt-editor-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.txt-editor {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  padding: 20px;
  font-family: "PingFang SC";
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.txt-editor:focus {
  background: var(--el-fill-color-lighter);
}
</style>
