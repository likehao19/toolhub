<template>
  <div v-show="active" class="settings-section">
    <h3 class="group-title">{{ t('settings.general') }}</h3>

    <!-- 窗口与启动 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.windowStartup') }}</div>
      </template>
      <el-form :model="settings" label-width="140px" label-position="left">
        <el-form-item :label="t('settings.closeAction')">
          <el-radio-group v-model="settings.closeAction" @change="handleCloseActionChange">
            <el-radio :value="'ask'">{{ t('settings.closeAsk') }}</el-radio>
            <el-radio :value="'minimize'">{{ t('settings.closeMinimize') }}</el-radio>
            <el-radio :value="'exit'">{{ t('settings.closeExit') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('settings.autoStart')">
          <el-switch
            v-model="settings.autoStart"
            @change="handleAutoStartToggle"
            :loading="autostartLoading"
          />
          <span style="margin-left: 10px; color: var(--el-text-color-secondary); font-size: 12px;">
            {{ t('settings.autoStartHint') }}
          </span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 外观与主题 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.appearance') }}</div>
      </template>
      <el-form :model="settings" label-width="140px" label-position="left">
        <el-form-item :label="t('settings.themeMode')">
          <el-radio-group v-model="settings.theme" @change="handleThemeChange">
            <el-radio :value="'light'">{{ t('settings.themeLight') }}</el-radio>
            <el-radio :value="'dark'">{{ t('settings.themeDark') }}</el-radio>
            <el-radio :value="'auto'">{{ t('settings.themeAuto') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('settings.fontSize')" class="form-item-inline-center">
          <el-select v-model="settings.fontSize" style="width: 140px" @change="handleFontSizeChange">
            <el-option v-for="size in [12, 13, 14, 15, 16, 17, 18, 19, 20]" :key="size" :label="`${size}px`" :value="size" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('settings.fontFamily')">
          <el-select v-model="settings.fontFamily" style="width: 300px" @change="handleFontFamilyChange">
            <el-option :label="t('settings.fontSystem')" value="system" />
            <el-option label="微软雅黑" value="Microsoft YaHei" />
            <el-option label="宋体" value="SimSun" />
            <el-option label="Arial" value="Arial" />
            <el-option label="Consolas" value="Consolas" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('settings.enableAnimations')">
          <el-switch v-model="settings.enableAnimations" @change="handleAnimationsChange" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 头部样式预览(仅开发模式可见,打包后自动隐藏) -->
    <el-card v-if="isDev" shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">头部样式预览 (仅开发)</div>
      </template>
      <el-form label-width="140px" label-position="left">
        <el-form-item label="头部样式">
          <el-radio-group v-model="headerStyleOverride">
            <el-radio value="auto">自动 (按系统)</el-radio>
            <el-radio value="windows">Windows</el-radio>
            <el-radio value="mac">macOS</el-radio>
          </el-radio-group>
          <div class="control-hint">
            仅用于在 Windows 上预览 macOS 头部样式; 打包发布后此项不会显示。
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 语言与区域 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.language') }}</div>
      </template>
      <el-form :model="settings" label-width="140px" label-position="left">
        <el-form-item :label="t('settings.langLabel')">
          <el-select v-model="settings.language" style="width: 200px" @change="handleLanguageSettingChange">
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
          <div class="control-hint">
            {{ t('settings.langHint') }}
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 通知与提醒 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.notifications') }}</div>
      </template>
      <el-form :model="reminderConfig" label-width="120px" label-position="left">
        <el-form-item :label="t('settings.positionType')">
          <el-radio-group v-model="reminderConfig.positionType" @change="handleReminderSettingChange">
            <el-radio value="window">{{ t('settings.positionWindow') }}</el-radio>
            <el-radio value="screen">{{ t('settings.positionScreen') }}</el-radio>
          </el-radio-group>
          <div class="control-hint">
            {{ t('settings.positionTypeHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.displayPosition')">
          <el-select v-model="reminderConfig.position" style="width: 200px;" @change="handleReminderSettingChange">
            <el-option :label="t('settings.posTopRight')" value="topRight" />
            <el-option :label="t('settings.posTopLeft')" value="topLeft" />
            <el-option :label="t('settings.posTopCenter')" value="topCenter" />
            <el-option :label="t('settings.posBottomRight')" value="bottomRight" />
            <el-option :label="t('settings.posBottomLeft')" value="bottomLeft" />
            <el-option :label="t('settings.posBottomCenter')" value="bottomCenter" />
            <el-option :label="t('settings.posRightCenter')" value="rightCenter" />
            <el-option :label="t('settings.posLeftCenter')" value="leftCenter" />
            <el-option :label="t('settings.posCenter')" value="center" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button @click="testNotification">
            {{ t('settings.testNotification') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- AI 助手悬浮球 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">{{ t('settings.aiFloatingBall') }}</div>
      </template>
      <el-form :model="aiAssistantSettings" label-width="140px" label-position="left">
        <el-form-item :label="t('settings.enableBall')">
          <el-switch
            v-model="aiAssistantSettings.enableFloatingBall"
            @change="handleFloatingBallSettingChange"
          />
          <div style="margin-left: 10px; color: var(--el-text-color-secondary); font-size: 12px;">
            <div>{{ t('settings.enableBallHint') }}</div>
            <div style="margin-top: 4px;">{{ t('settings.enableBallShortcut') }}</div>
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.ballPosition')" v-if="aiAssistantSettings.enableFloatingBall">
          <el-radio-group
            v-model="aiAssistantSettings.floatingBallMode"
            @change="handleFloatingBallSettingChange"
          >
            <el-radio value="inApp">{{ t('settings.ballInApp') }}</el-radio>
            <el-radio value="desktop">{{ t('settings.ballDesktop') }}</el-radio>
          </el-radio-group>
          <div class="control-hint">
            {{ t('settings.ballPositionHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.ballStyle')" v-if="aiAssistantSettings.enableFloatingBall">
          <el-select
            v-model="aiAssistantSettings.floatingBallStyle"
            style="width: 200px;"
            @change="handleFloatingBallSettingChange"
          >
            <el-option :label="t('settings.ballCircle')" value="circle" />
            <el-option :label="t('settings.ballRounded')" value="rounded" />
            <el-option :label="t('settings.ballCapsule')" value="capsule" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('settings.ballSize')" v-if="aiAssistantSettings.enableFloatingBall">
          <el-slider
            v-model="aiAssistantSettings.floatingBallSize"
            :min="40"
            :max="80"
            :step="5"
            style="width: 200px"
            @change="handleFloatingBallSettingChange"
          />
          <span style="margin-left: 10px">{{ aiAssistantSettings.floatingBallSize }}px</span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { useSettingsCore } from '@/composables/settings/useSettingsCore'
import { useReminderSettings } from '@/composables/settings/useReminderSettings'
import { useAiAssistant } from '@/composables/settings/useAiAssistant'
import { headerStyleOverride, isDev } from '@/composables/useHeaderStyle'

defineProps({
  active: { type: Boolean, default: true },
})

const {
  settings,
  autostartLoading,
  handleCloseActionChange,
  handleAutoStartToggle,
  handleThemeChange,
  handleFontSizeChange,
  handleFontFamilyChange,
  handleAnimationsChange,
  handleLanguageSettingChange,
  handleReminderSettingChange,
  handleFloatingBallSettingChange,
} = useSettingsCore()

const { reminderConfig, testNotification } = useReminderSettings()
const { aiAssistantSettings } = useAiAssistant()
</script>

<style scoped>
/* 共享样式由 Settings.vue 主壳通过 :deep(...) 穿透至本 section；本组件无私有样式 */
</style>
