<template>
  <div v-show="active" class="settings-section changelog-section">
    <div class="section-header-row">
      <h3 class="group-title">{{ t('settings.changelog') }}</h3>
      <div class="header-actions">
        <span v-if="currentVersion" class="current-version-tag">
          {{ t('changelog.currentlyOn') }} v{{ currentVersion }}
        </span>
      </div>
    </div>

    <el-card shadow="never" class="changelog-card">
      <div v-if="!html" class="state-block">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ t('changelog.empty') }}</span>
      </div>
      <div v-else class="changelog-body" v-html="html"></div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { getVersion } from '@tauri-apps/api/app'
import { t } from '@/i18n'
import changelogSource from '../../../../CHANGELOG.md?raw'

defineProps({
  active: { type: Boolean, default: false },
})

const currentVersion = ref('')

onMounted(async () => {
  try {
    currentVersion.value = await getVersion()
  } catch {
    // 非 Tauri 环境
  }
})

const html = computed(() => {
  if (!changelogSource) return ''
  try {
    return marked.parse(changelogSource, { breaks: true, gfm: true })
  } catch {
    return String(changelogSource)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
  }
})
</script>

<style scoped>
.changelog-section {
  padding-bottom: 24px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.current-version-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 12px;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  font-size: 12px;
  font-weight: 500;
}

.changelog-card {
  padding: 0;
}

.state-block {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 28px 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.changelog-body {
  padding: 18px 22px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.changelog-body :deep(h1) {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--el-text-color-primary);
}
.changelog-body :deep(h1 + p) {
  color: var(--el-text-color-secondary);
  font-size: 12.5px;
  margin: 4px 0 16px;
}
.changelog-body :deep(h2) {
  font-size: 16px;
  font-weight: 600;
  margin: 22px 0 8px;
  padding-bottom: 4px;
  color: var(--el-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.changelog-body :deep(h3) {
  font-size: 14px;
  font-weight: 600;
  margin: 14px 0 6px;
  color: var(--el-text-color-primary);
}
.changelog-body :deep(hr) {
  border: none;
  border-top: 1px dashed var(--el-border-color-lighter);
  margin: 18px 0;
}
.changelog-body :deep(ul),
.changelog-body :deep(ol) {
  padding-left: 22px;
  margin: 6px 0 10px;
}
.changelog-body :deep(li) {
  margin: 4px 0;
}
.changelog-body :deep(p) {
  margin: 6px 0;
}
.changelog-body :deep(strong) {
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.changelog-body :deep(code) {
  background: var(--el-fill-color);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--el-color-danger);
}
.changelog-body :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}
.changelog-body :deep(a:hover) {
  text-decoration: underline;
}
</style>
