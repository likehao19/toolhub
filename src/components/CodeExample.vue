<template>
  <div class="code-example">
    <div class="example-header">
      <span class="example-title">{{ title }}</span>
      <el-button text size="small" @click="toggleCode">
        <el-icon><DocumentCopy v-if="!showCode" /><Hide v-else /></el-icon>
        {{ showCode ? '隐藏代码' : '显示代码' }}
      </el-button>
    </div>
    
    <div class="example-demo">
      <slot name="demo"></slot>
    </div>
    
    <transition name="slide-fade">
      <div v-show="showCode" class="example-code">
        <div class="code-header">
          <span class="code-lang">{{ language }}</span>
          <el-button text size="small" @click="copyCode">
            <el-icon><DocumentCopy /></el-icon>
            复制代码
          </el-button>
        </div>
        <pre class="code-content"><code>{{ code }}</code></pre>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Hide } from '@element-plus/icons-vue'

const props = defineProps({
  title: {
    type: String,
    default: '示例'
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'vue'
  },
  defaultShowCode: {
    type: Boolean,
    default: false
  }
})

const showCode = ref(props.defaultShowCode)

const toggleCode = () => {
  showCode.value = !showCode.value
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    ElMessage.success('代码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.code-example {
  margin: 28px 0;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.code-example:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-bottom: 1px solid #e4e7ed;
}

.example-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.example-demo {
  padding: 28px;
  background: #ffffff;
}

.example-code {
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.code-lang {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
  text-transform: uppercase;
}

.code-content {
  margin: 0;
  padding: 24px;
  background: #fafbfc;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
  border-top: 1px solid #e4e7ed;
}

.code-content code {
  display: block;
  white-space: pre;
  word-wrap: normal;
}

/* ignore */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>

