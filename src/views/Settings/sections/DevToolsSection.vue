<template>
  <div v-show="active" class="settings-section dev-tools-section">
    <h3 class="group-title">
      {{ t('settings.devTools') }}
      <el-tag size="small" type="warning" effect="plain" class="dev-tag">DEV</el-tag>
    </h3>
    <p class="section-hint">{{ t('devTools.intro') }}</p>

    <!-- 头部样式预览 -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">{{ t('devTools.headerPreview') }}</div>
      </template>
      <el-form label-width="140px" label-position="left">
        <el-form-item :label="t('devTools.headerStyle')">
          <el-radio-group v-model="headerStyleOverride">
            <el-radio value="auto">{{ t('devTools.headerAuto') }}</el-radio>
            <el-radio value="windows">Windows</el-radio>
            <el-radio value="mac">macOS</el-radio>
          </el-radio-group>
          <div class="control-hint">
            {{ t('devTools.headerHint') }}
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 运行日志（内嵌模式，隐藏其自带的 group-title） -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">{{ t('settings.appLog') }}</div>
      </template>
      <div class="embedded-app-log">
        <AppLogSection :active="active" :embedded="true" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { headerStyleOverride } from '@/composables/useHeaderStyle'
import AppLogSection from './AppLogSection.vue'

defineProps({
  active: { type: Boolean, default: false },
})
</script>

<style scoped>
.dev-tools-section {
  padding-bottom: 24px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dev-tag {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.section-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.block-card {
  margin-bottom: 16px;
}

.card-header {
  font-size: 14px;
  font-weight: 600;
}

.control-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 嵌入模式下：让 AppLogSection 紧凑一些 */
.embedded-app-log :deep(.app-log-section) {
  padding-bottom: 0;
}
.embedded-app-log :deep(.header-block) {
  margin-bottom: 8px;
}
</style>
