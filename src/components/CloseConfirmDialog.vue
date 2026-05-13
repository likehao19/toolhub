<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('closeConfirm.title')"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="close-dialog-content">
      <div class="icon-wrapper">
        <el-icon :size="48" color="var(--accent-blue)">
          <QuestionFilled />
        </el-icon>
      </div>
      <p class="message">{{ t('closeConfirm.message') }}</p>
      <el-checkbox v-model="rememberChoice" class="remember-checkbox">
        {{ t('closeConfirm.remember') }}
      </el-checkbox>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleAction('minimize')" type="primary">
          {{ t('closeConfirm.minimizeToTray') }}
        </el-button>
        <el-button @click="handleAction('exit')" type="danger">
          {{ t('closeConfirm.exitApp') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { t } from '@/i18n'

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
  color: var(--text-primary);
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
