<template>
  <el-dialog
    v-model="dialogVisible"
    title="确认关闭"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="close-dialog-content">
      <div class="icon-wrapper">
        <el-icon :size="48" color="#409eff">
          <QuestionFilled />
        </el-icon>
      </div>
      <p class="message">您想要如何关闭窗口？</p>
      <el-checkbox v-model="rememberChoice" class="remember-checkbox">
        记住我的选择，下次不再询问
      </el-checkbox>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleAction('minimize')" type="primary">
          📥 最小化到托盘
        </el-button>
        <el-button @click="handleAction('exit')" type="danger">
          ❌ 完全退出
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const dialogVisible = ref(false)
const rememberChoice = ref(false)

const emit = defineEmits(['confirm'])

// 显示对话框
const show = () => {
  dialogVisible.value = true
  rememberChoice.value = false
}

// 处理用户选择
const handleAction = (action) => {
  dialogVisible.value = false
  emit('confirm', {
    action,
    remember: rememberChoice.value
  })
}

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
.close-dialog-content {
  text-align: center;
  padding: 20px 0;
}

.icon-wrapper {
  margin-bottom: 20px;
}

.message {
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
  line-height: 1.6;
}

.remember-checkbox {
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.dialog-footer .el-button {
  min-width: 140px;
}
</style>
