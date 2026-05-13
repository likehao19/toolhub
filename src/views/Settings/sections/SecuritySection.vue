<template>
  <div v-show="active" class="settings-section">
    <h3 class="group-title">{{ t('settings.security') }}</h3>

    <!-- 系统权限 / SDK 环境变量作用域 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.systemPrivilegeTitle') }}</div>
      </template>
      <el-form label-width="150px" label-position="left">
        <el-form-item :label="t('settings.sdkEnvScopeTitle')">
          <div class="stacked-control-group">
            <el-radio-group
              v-model="systemPrivilege.envScope"
              @change="handleEnvScopeSettingChange"
              size="small"
            >
              <el-radio value="system">{{ t('settings.sdkEnvScopeSystem') }}</el-radio>
              <el-radio value="user">{{ t('settings.sdkEnvScopeUser') }}</el-radio>
            </el-radio-group>
            <div class="form-hint-block compact">
              {{ t('settings.sdkEnvScopeDesc') }}
            </div>
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.systemPrivilegeStatus')">
          <div class="stacked-control-group">
            <div class="inline-control-row wrap">
              <el-tag v-if="systemPrivilege.checking" type="info">
                {{ t('settings.systemPrivilegeChecking') }}
              </el-tag>
              <el-tag v-else-if="systemPrivilege.authorized" type="success">
                {{ t('settings.systemPrivilegeAuthorized') }}
              </el-tag>
              <el-tag v-else type="warning">
                {{ t('settings.systemPrivilegeUnauthorized') }}
              </el-tag>
              <el-button
                size="small"
                @click="loadSystemPrivilegeStatus"
                :loading="systemPrivilege.checking"
              >
                {{ t('settings.systemPrivilegeRefresh') }}
              </el-button>
              <el-button
                v-if="systemPrivilege.envScope === 'system' && !systemPrivilege.authorized"
                size="small"
                type="primary"
                @click="handleSystemPrivilegeAuthorize"
                :loading="systemPrivilege.authorizing"
              >
                {{ t('settings.systemPrivilegeAuthorize') }}
              </el-button>
            </div>
            <div class="form-hint-block compact">
              {{ t('settings.systemPrivilegeHint') }}
            </div>
            <div v-if="systemPrivilege.envScope === 'system'" class="form-hint-block compact">
              {{ t('settings.systemPrivilegeScopeHint') }}
            </div>
            <div v-else class="form-hint-block compact">
              {{ t('settings.sdkEnvScopeUserHint') }}
            </div>
          </div>
        </el-form-item>

        <el-form-item
          v-if="systemPrivilege.envScope === 'system' && !systemPrivilege.authorized"
          :label="t('settings.systemPrivilegeActionTitle')"
        >
          <div style="font-size: 12px; color: var(--el-text-color-secondary);">
            {{ t('settings.systemPrivilegeActionDesc') }}
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 主密码管理 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.passwordMgmt') }}</div>
      </template>
      <el-form label-width="150px" label-position="left">
        <el-form-item :label="t('settings.requirePwdOnStart')">
          <el-switch
            v-model="passwordSettings.requirePasswordOnStart"
            :active-text="t('common.on')"
            :inactive-text="t('common.off')"
            @change="handlePasswordSettingChange"
          />
          <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
            {{ t('settings.requirePwdHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.autoLockTime')">
          <el-select
            v-model="passwordSettings.autoLockTime"
            style="width: 200px;"
            @change="handlePasswordSettingChange"
          >
            <el-option :label="t('common.time.min5')" :value="5" />
            <el-option :label="t('common.time.min10')" :value="10" />
            <el-option :label="t('common.time.min15')" :value="15" />
            <el-option :label="t('common.time.min30')" :value="30" />
            <el-option :label="t('common.never')" :value="0" />
          </el-select>
          <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
            {{ t('settings.autoLockHint') }}
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="showChangePasswordDialog = true">
            {{ t('settings.changeMasterPwd') }}
          </el-button>
          <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
            {{ t('settings.changeMasterPwdHint') }}
          </div>
        </el-form-item>

        <el-divider />

        <el-form-item :label="t('settings.vaultStatus')">
          <div class="stats-list">
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.pwdCount') }}</span>
              <span class="stats-value">{{ passwordStats.totalPasswords }} {{ t('common.unit') }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.historyCount') }}</span>
              <span class="stats-value">{{ passwordStats.historyCount }} {{ t('common.entries') }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.recycleBin') }}</span>
              <span class="stats-value">{{ passwordStats.recycleBinCount }} {{ t('common.unit') }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.masterPwdStatus') }}</span>
              <span class="stats-value">
                {{ passwordStats.hasMasterPassword ? t('settings.masterPwdSet') : t('settings.masterPwdNotSet') }}
              </span>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { useSettingsCore } from '@/composables/settings/useSettingsCore'
import { useSystemPrivilege } from '@/composables/settings/useSystemPrivilege'
import { usePasswordSettings } from '@/composables/settings/usePasswordSettings'

defineProps({
  active: { type: Boolean, default: true },
})

const { handleEnvScopeSettingChange, handlePasswordSettingChange } = useSettingsCore()
const {
  systemPrivilege,
  loadSystemPrivilegeStatus,
  handleSystemPrivilegeAuthorize,
} = useSystemPrivilege()
const {
  passwordSettings,
  passwordStats,
  showChangePasswordDialog,
} = usePasswordSettings()
</script>

<style scoped>
/* 共享样式由 Settings.vue 主壳通过 :deep(...) 穿透至本 section；本组件无私有样式 */
</style>
