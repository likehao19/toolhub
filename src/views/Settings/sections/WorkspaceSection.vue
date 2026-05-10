<template>
  <div v-show="active" class="settings-section">
    <h3 class="group-title">{{ t('settings.workspace') }}</h3>

    <!-- 笔记设置 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.notesSettings') }}</div>
      </template>
      <el-form :model="settings" label-width="140px" label-position="left">
        <el-form-item :label="t('settings.storagePath')">
          <div class="inline-control-row">
            <el-input v-model="settings.notesStoragePath" readonly class="fill-control" />
            <el-button @click="selectNotesStoragePath">{{ t('settings.changeBtn') }}</el-button>
          </div>
          <div class="form-hint-block">
            {{ t('settings.storagePathHint') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('settings.storageUsage')">
          <div class="stats-list">
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.notesSize') }}</span>
              <span class="stats-value">{{ formatFileSize(storageStats.notesSize) }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.databaseSize') }}</span>
              <span class="stats-value">{{ formatFileSize(storageStats.databaseSize) }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.mediaSize') }}</span>
              <span class="stats-value">{{ formatFileSize(storageStats.mediaSize) }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">{{ t('settings.totalSize') }}</span>
              <span class="stats-value">{{ formatFileSize(storageStats.totalSize) }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Markdown 主题 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">{{ t('settings.markdownTheme') }}</div>
      </template>
      <el-form :model="settings" label-width="140px" label-position="left">
        <el-divider content-position="left">{{ t('settings.previewMode') }}</el-divider>
        <el-form-item :label="t('settings.previewTheme')">
          <el-select v-model="settings.previewTheme" style="width: 300px" @change="handleMarkdownThemeChange">
            <el-option label="Default" value="default" />
            <el-option label="GitHub" value="github" />
            <el-option label="VuePress" value="vuepress" />
            <el-option label="MK Cute" value="mk-cute" />
            <el-option label="Smart Blue" value="smart-blue" />
            <el-option label="Cyanosis" value="cyanosis" />
          </el-select>
          <div class="control-hint">{{ t('settings.previewThemeHint') }}</div>
        </el-form-item>

        <el-form-item :label="t('settings.codeTheme')">
          <el-select v-model="settings.previewCodeTheme" style="width: 300px" @change="handleMarkdownThemeChange">
            <el-option label="Atom" value="atom" />
            <el-option label="A11y" value="a11y" />
            <el-option label="GitHub" value="github" />
            <el-option label="Gradient" value="gradient" />
            <el-option label="Kimbie" value="kimbie" />
            <el-option label="Paraiso" value="paraiso" />
            <el-option label="Qt Creator" value="qtcreator" />
            <el-option label="Stack Overflow" value="stackoverflow" />
          </el-select>
          <div class="control-hint">{{ t('settings.codeThemeHint') }}</div>
        </el-form-item>

        <el-divider content-position="left">{{ t('settings.editMode') }}</el-divider>
        <el-form-item :label="t('settings.previewTheme')">
          <el-select v-model="settings.editorPreviewTheme" style="width: 300px" @change="handleMarkdownThemeChange">
            <el-option label="Default" value="default" />
            <el-option label="GitHub" value="github" />
            <el-option label="VuePress" value="vuepress" />
            <el-option label="MK Cute" value="mk-cute" />
            <el-option label="Smart Blue" value="smart-blue" />
            <el-option label="Cyanosis" value="cyanosis" />
          </el-select>
          <div class="control-hint">{{ t('settings.editorPreviewHint') }}</div>
        </el-form-item>

        <el-form-item :label="t('settings.codeTheme')">
          <el-select v-model="settings.editorCodeTheme" style="width: 300px" @change="handleMarkdownThemeChange">
            <el-option label="Atom" value="atom" />
            <el-option label="A11y" value="a11y" />
            <el-option label="GitHub" value="github" />
            <el-option label="Gradient" value="gradient" />
            <el-option label="Kimbie" value="kimbie" />
            <el-option label="Paraiso" value="paraiso" />
            <el-option label="Qt Creator" value="qtcreator" />
            <el-option label="Stack Overflow" value="stackoverflow" />
          </el-select>
          <div class="control-hint">{{ t('settings.editorCodeHint') }}</div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- AI 服务配置（多 Provider） -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <span>{{ t('settings.aiProviders') }}</span>
          <el-dropdown trigger="click" @command="addProvider">
            <el-button size="small" type="primary">+ {{ t('settings.addProvider') }}</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="(preset, key) in PROVIDER_PRESETS" :key="key" :command="key">
                  {{ preset.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>

      <div style="margin-bottom:12px;font-size:12px;color:var(--text-quaternary);">
        {{ t('settings.activeProviderUsageHint') }}
      </div>

      <div v-if="!aiSettings.providers?.length" style="text-align:center;padding:24px;color:var(--text-quaternary);font-size:13px;">
        {{ t('settings.noProviders') }}
      </div>

      <div v-else class="ai-provider-list">
        <div
          v-for="(prov, idx) in aiSettings.providers"
          :key="prov.id"
          class="ai-provider-item"
          :class="{ active: editingProviderId === prov.id }"
        >
          <div class="ai-provider-row" @click="handleProviderEdit(prov)">
            <span class="ai-prov-dot" :class="{ 'is-active': aiSettings.activeProviderId === prov.id }" />
            <span class="ai-prov-name">{{ prov.name || prov.provider }}</span>
            <span class="ai-prov-model">{{ prov.model }}</span>
            <el-tag v-if="aiSettings.activeProviderId === prov.id" size="small" type="success" effect="plain">
              {{ t('settings.activeProvider') }}
            </el-tag>
          </div>

          <!-- 展开编辑表单 -->
          <div v-if="editingProviderId === prov.id" class="ai-provider-form" @click.stop>
            <el-form label-width="100px" label-position="left" size="small">
              <el-form-item :label="t('settings.providerName')">
                <el-input v-model="prov.name" style="width:280px;" />
              </el-form-item>
              <el-form-item :label="t('settings.providerType')">
                <div style="display:flex;flex-direction:column;gap:6px;">
                  <el-select v-model="prov.provider" style="width:280px;" @change="onProviderTypeChange(prov)">
                    <el-option v-for="(preset, key) in PROVIDER_PRESETS" :key="key" :label="preset.name" :value="key" />
                  </el-select>
                  <div class="control-hint-sm">{{ t('settings.providerModelPresetHint') }}</div>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.apiUrl')">
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
                  <el-input v-model="prov.baseUrl" :placeholder="t('settings.apiUrlPlaceholder')" style="width:380px;" />
                  <div class="control-hint-sm">
                    {{ prov.provider === 'claude' ? t('settings.claudeProviderHint') : t('settings.compatibleProviderHint') }}
                  </div>
                  <div class="control-hint-sm">{{ t('settings.providerBaseUrlHint') }}</div>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.apiKey')">
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
                  <el-input
                    v-model="prov.apiKey"
                    type="password"
                    show-password
                    :placeholder="t('settings.apiKeyPlaceholder')"
                    style="width:380px;"
                  />
                  <div class="control-hint-sm">{{ t('settings.providerApiKeyHint') }}</div>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.model')">
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
                  <div style="display:flex;gap:8px;align-items:flex-start;">
                    <el-select
                      v-model="prov.model"
                      filterable
                      allow-create
                      default-first-option
                      :placeholder="t('settings.modelPlaceholder')"
                      style="width:280px;"
                    >
                      <el-option
                        v-for="m in getProviderModelOptions(prov)"
                        :key="m"
                        :label="m"
                        :value="m"
                      />
                    </el-select>
                    <el-button
                      size="small"
                      @click="refreshProviderModels(prov)"
                      :loading="loadingModelsProvId === prov.id"
                    >
                      {{ t('settings.refreshModels') }}
                    </el-button>
                  </div>
                  <div class="control-hint-sm">{{ t('settings.modelHint') }}</div>
                  <div class="control-hint-sm">{{ t('settings.modelDynamicHint') }}</div>
                  <div v-if="providerModelErrors[prov.id]" style="font-size:11px;color:var(--el-color-warning);">
                    {{ providerModelErrors[prov.id] }}
                  </div>
                </div>
              </el-form-item>
              <el-form-item class="provider-actions-row">
                <el-button
                  type="primary"
                  size="small"
                  @click="testProviderConnection(prov)"
                  :loading="testingAI && testingProvId === prov.id"
                >
                  {{ t('settings.testConnection') }}
                </el-button>
                <el-button size="small" @click="resetProviderDefaults(prov)">
                  {{ t('settings.resetProviderDefaults') }}
                </el-button>
                <el-button
                  v-if="aiSettings.activeProviderId !== prov.id"
                  size="small"
                  @click="setActiveProvider(prov.id)"
                >
                  {{ t('settings.setActive') }}
                </el-button>
                <el-button
                  v-if="aiSettings.providers.length > 1"
                  size="small"
                  type="danger"
                  text
                  @click="removeProvider(idx)"
                >
                  {{ t('settings.deleteProvider') }}
                </el-button>
              </el-form-item>
            </el-form>

            <el-alert
              v-if="aiTestResult && testingProvId === prov.id"
              :title="aiTestResult.success ? t('settings.connectSuccess') : t('settings.connectFailed')"
              :type="aiTestResult.success ? 'success' : 'error'"
              :description="aiTestResult.message"
              :closable="false"
              style="margin-top:8px;"
            />
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { PROVIDER_PRESETS } from '@/utils/aiProviders'
import { useSettingsCore } from '@/composables/settings/useSettingsCore'
import { useNotesMigration } from '@/composables/settings/useNotesMigration'
import { useStorageStats } from '@/composables/settings/useStorageStats'
import { useAiConfig } from '@/composables/settings/useAiConfig'

defineProps({
  active: { type: Boolean, default: true },
})

const { settings, handleMarkdownThemeChange } = useSettingsCore()
const { selectNotesStoragePath } = useNotesMigration()
const { storageStats, formatFileSize } = useStorageStats()
const {
  aiSettings,
  editingProviderId,
  testingAI,
  testingProvId,
  loadingModelsProvId,
  aiTestResult,
  providerModelErrors,
  getProviderModelOptions,
  addProvider,
  handleProviderEdit,
  refreshProviderModels,
  setActiveProvider,
  removeProvider,
  resetProviderDefaults,
  onProviderTypeChange,
  testProviderConnection,
} = useAiConfig()
</script>

<style scoped>
/* 共享样式由 Settings.vue 主壳通过 :deep(...) 穿透至本 section；本组件无私有样式 */
</style>
