<template>
  <div v-show="active" class="settings-section about-section">
    <h3 class="group-title">{{ t('settings.help') }}</h3>

    <!-- 关于应用 -->
    <el-card shadow="never" style="margin-bottom: 20px;" class="about-app-card">
      <template #header>
        <div class="card-header">{{ t('settings.aboutApp') }}</div>
      </template>
      <el-descriptions :column="1" class="about-app-descriptions">
        <el-descriptions-item :label="t('settings.appNameLabel')">{{ t('settings.appName') }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.version')">v{{ appVersion }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.buildTime')">{{ buildTime }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.techStack')">Vue 3 + Tauri</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 帮助与支持 -->
    <el-card shadow="never" class="help-support-card">
      <template #header>
        <div class="card-header">{{ t('settings.helpSupport') }}</div>
      </template>
      <el-form label-width="100px" class="help-support-form">
        <el-form-item :label="t('settings.feedbackContent')">
          <el-input
            class="feedback-textarea"
            v-model="feedbackContent"
            type="textarea"
            :rows="6"
            :placeholder="t('settings.feedbackPlaceholder')"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="t('settings.feedbackContact')">
          <el-input
            class="feedback-contact-input"
            v-model="feedbackContact"
            :placeholder="t('settings.feedbackContactPlaceholder')"
          />
        </el-form-item>
        <el-form-item class="feedback-action-row">
          <el-button type="primary" @click="submitFeedback" :loading="submittingFeedback">
            {{ t('settings.submitFeedback') }}
          </el-button>
          <el-button @click="clearFeedback">{{ t('settings.clearBtn') }}</el-button>
        </el-form-item>
        <el-divider />
        <el-form-item :label="t('settings.softwareUpdate')" class="form-item-inline-center">
          <el-button class="check-update-btn" @click="checkUpdate" :loading="checkingUpdate">
            <el-icon><Refresh /></el-icon>
            {{ t('settings.checkUpdate') }}
          </el-button>
          <span v-if="updateInfo" class="update-info">
            {{ updateInfo }}
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getVersion } from '@tauri-apps/api/app'
import { t } from '@/i18n'
import { useSettingsCore } from '@/composables/settings/useSettingsCore'
import { useFeedbackAndUpdate } from '@/composables/settings/useFeedbackAndUpdate'

defineProps({
  active: { type: Boolean, default: true },
})

const appVersion = ref(import.meta.env.VITE_APP_VERSION || '')
const buildTime = import.meta.env.VITE_BUILD_TIME || ''

onMounted(async () => {
  try {
    appVersion.value = await getVersion()
  } catch {
    // 非 Tauri 环境（如纯浏览器预览）保留 fallback
  }
})

const { handleReset } = useSettingsCore()
const {
  feedbackContent,
  feedbackContact,
  submittingFeedback,
  checkingUpdate,
  updateInfo,
  submitFeedback,
  clearFeedback,
  checkUpdate,
} = useFeedbackAndUpdate()
</script>

<style scoped>
/* 共享样式由 Settings.vue 主壳通过 :deep(...) 穿透至本 section；本组件无私有样式 */
</style>
