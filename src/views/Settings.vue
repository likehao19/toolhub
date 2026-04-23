<template>
  <div class="settings-page-wrapper">
    <header class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">System Settings</div>
          <div class="breadcrumb">
            <el-icon><Setting /></el-icon>
            <span>{{ t('settings.title') }}</span>
            <span class="breadcrumb-divider">/</span>
            <span>{{ currentMenuName }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span class="save-status" :class="saveStatusClass">{{ saveStatusText }}</span>
        <el-button size="small" @click="handleReset" circle :title="t('settings.reset')" class="toolbar-btn">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button size="small" @click="handleSave" :loading="saving" :disabled="!manualHasChanges" :type="manualHasChanges ? 'primary' : 'default'" circle :title="t('settings.save')" class="toolbar-btn primary-when-active">
          <el-icon><Check /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <aside class="sidebar-left">
        <div class="sidebar-toolbar">
          <div class="sidebar-toolbar-main">
            <span class="sidebar-title">{{ t('settings.title') }}</span>
            <span class="sidebar-subtitle">Preference panes</span>
          </div>
          <span class="sidebar-caption">macOS style</span>
        </div>

        <div class="sidebar-section-label">Navigation</div>

        <div class="menu-list">
          <div
            v-for="menu in menuItems"
            :key="menu.key"
            class="menu-item"
            :class="{ active: activeTab === menu.key }"
            @click="activeTab = menu.key"
          >
            <span class="menu-active-indicator" />
            <span class="menu-icon-shell">
              <el-icon class="menu-icon">
                <component :is="menu.icon" />
              </el-icon>
            </span>
            <span class="menu-copy">
              <span class="menu-name">{{ menu.label }}</span>
              <span class="menu-desc">{{ menu.description }}</span>
            </span>
            <span class="menu-chevron">›</span>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <div v-show="activeTab === 'general'" class="settings-section">
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
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">
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
                <el-select
                  v-model="settings.fontSize"
                  style="width: 140px"
                  @change="handleFontSizeChange"
                >
                  <el-option v-for="size in [12,13,14,15,16,17,18,19,20]" :key="size" :label="`${size}px`" :value="size" />
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.langHint') }}
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 閫氱煡涓庢彁閱?-->
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
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

          <!-- AI 鍔╂墜鎮诞鐞?-->
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
                <div style="margin-left: 10px; color: #909399; font-size: 12px;">
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
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

        <div v-show="activeTab === 'workspace'" class="settings-section">
          <h3 class="group-title">{{ t('settings.workspace') }}</h3>

          <!-- 绗旇璁剧疆 -->
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

          <!-- Markdown 涓婚 -->
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
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  {{ t('settings.previewThemeHint') }}
                </div>
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
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  {{ t('settings.codeThemeHint') }}
                </div>
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
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  {{ t('settings.editorPreviewHint') }}
                </div>
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
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  {{ t('settings.editorCodeHint') }}
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- AI 鏈嶅姟閰嶇疆锛堝 Provider锛?-->
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
                  <el-tag v-if="aiSettings.activeProviderId === prov.id" size="small" type="success" effect="plain">{{ t('settings.activeProvider') }}</el-tag>
                </div>

                <!-- Expanded edit form -->
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
                        <div style="font-size:11px;color:var(--text-quaternary);">
                          {{ t('settings.providerModelPresetHint') }}
                        </div>
                      </div>
                    </el-form-item>
                    <el-form-item :label="t('settings.apiUrl')">
                      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
                        <el-input v-model="prov.baseUrl" :placeholder="t('settings.apiUrlPlaceholder')" style="width:380px;" />
                        <div style="font-size:11px;color:var(--text-quaternary);">
                          {{ prov.provider === 'claude' ? t('settings.claudeProviderHint') : t('settings.compatibleProviderHint') }}
                        </div>
                        <div style="font-size:11px;color:var(--text-quaternary);">
                          {{ t('settings.providerBaseUrlHint') }}
                        </div>
                      </div>
                    </el-form-item>
                    <el-form-item :label="t('settings.apiKey')">
                      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
                        <el-input v-model="prov.apiKey" type="password" show-password :placeholder="t('settings.apiKeyPlaceholder')" style="width:380px;" />
                        <div style="font-size:11px;color:var(--text-quaternary);">
                          {{ t('settings.providerApiKeyHint') }}
                        </div>
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
                              :key="m" :label="m" :value="m"
                            />
                          </el-select>
                          <el-button
                            size="small"
                            @click="refreshProviderModels(prov)"
                            :loading="loadingModelsProvId === prov.id"
                          >{{ t('settings.refreshModels') }}</el-button>
                        </div>
                        <div style="font-size:11px;color:var(--text-quaternary);">{{ t('settings.modelHint') }}</div>
                        <div style="font-size:11px;color:var(--text-quaternary);">{{ t('settings.modelDynamicHint') }}</div>
                        <div v-if="providerModelErrors[prov.id]" style="font-size:11px;color:var(--el-color-warning);">{{ providerModelErrors[prov.id] }}</div>
                      </div>
                    </el-form-item>
                    <el-form-item class="provider-actions-row">
                      <el-button type="primary" size="small" @click="testProviderConnection(prov)" :loading="testingAI && testingProvId === prov.id">
                        {{ t('settings.testConnection') }}
                      </el-button>
                      <el-button size="small" @click="resetProviderDefaults(prov)">
                        {{ t('settings.resetProviderDefaults') }}
                      </el-button>
                      <el-button
                        v-if="aiSettings.activeProviderId !== prov.id"
                        size="small" @click="setActiveProvider(prov.id)"
                      >{{ t('settings.setActive') }}</el-button>
                      <el-button
                        v-if="aiSettings.providers.length > 1"
                        size="small" type="danger" text @click="removeProvider(idx)"
                      >{{ t('settings.deleteProvider') }}</el-button>
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

        <div v-show="activeTab === 'security'" class="settings-section">
          <h3 class="group-title">{{ t('settings.security') }}</h3>

          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">{{ t('settings.systemPrivilegeTitle') }}</div>
            </template>
            <el-form label-width="150px" label-position="left">
              <el-form-item :label="t('settings.sdkEnvScopeTitle')">
                <div class="stacked-control-group">
                  <el-radio-group v-model="systemPrivilege.envScope" @change="handleEnvScopeSettingChange" size="small">
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
                    <el-tag v-if="systemPrivilege.checking" type="info">{{ t('settings.systemPrivilegeChecking') }}</el-tag>
                    <el-tag v-else-if="systemPrivilege.authorized" type="success">{{ t('settings.systemPrivilegeAuthorized') }}</el-tag>
                    <el-tag v-else type="warning">{{ t('settings.systemPrivilegeUnauthorized') }}</el-tag>
                    <el-button size="small" @click="loadSystemPrivilegeStatus" :loading="systemPrivilege.checking">
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

              <el-form-item v-if="systemPrivilege.envScope === 'system' && !systemPrivilege.authorized" :label="t('settings.systemPrivilegeActionTitle')">
                <div style="font-size: 12px; color: #909399;">
                  {{ t('settings.systemPrivilegeActionDesc') }}
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 瀵嗙爜绠＄悊 -->
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.autoLockHint') }}
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="showChangePasswordDialog = true">
                  {{ t('settings.changeMasterPwd') }}
                </el-button>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
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
                    <span class="stats-value">{{ passwordStats.hasMasterPassword ? t('settings.masterPwdSet') : t('settings.masterPwdNotSet') }}</span>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <div v-show="activeTab === 'about'" class="settings-section">
          <h3 class="group-title">{{ t('settings.help') }}</h3>

          <!-- 鍏充簬搴旂敤 -->
          <el-card shadow="never" style="margin-bottom: 20px;" class="about-app-card">
            <template #header>
              <div class="card-header">{{ t('settings.aboutApp') }}</div>
            </template>
            <el-descriptions :column="1" class="about-app-descriptions">
              <el-descriptions-item :label="t('settings.appNameLabel')">{{ t('settings.appName') }}</el-descriptions-item>
              <el-descriptions-item :label="t('settings.version')">v1.0.0</el-descriptions-item>
              <el-descriptions-item :label="t('settings.buildTime')">2026-02-01</el-descriptions-item>
              <el-descriptions-item :label="t('settings.techStack')">Vue 3 + Tauri</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 甯姪涓庢敮鎸?-->
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
              <el-divider />
              <el-form-item class="danger-action-row">
                <el-button type="danger" @click="handleReset">
                  {{ t('settings.resetAppSettings') }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </main>
    </div>

    <!-- 绗旇杩佺Щ杩涘害瀵硅瘽妗?-->
    <el-dialog
      v-model="showMigrationDialog"
      :title="migrateMode === 'move' ? t('settings.migrationDialogMove') : t('settings.migrationDialogCopy')"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div style="text-align: center; padding: 20px 0;">
        <el-progress
          :percentage="migrationProgress"
          :status="migrationProgress === 100 ? 'success' : undefined"
          style="margin-bottom: 20px;"
        />
        <p style="color: #606266; margin-top: 12px;">{{ migrationStatus }}</p>
        <p v-if="migrateMode === 'move'" style="color: #909399; font-size: 12px; margin-top: 8px;">
          {{ migrationProgress < 100 ? t('settings.migrationMovingHint') : t('settings.migrationMoveDone') }}
        </p>
      </div>
    </el-dialog>

    <!-- 淇敼瀵嗙爜瀵硅瘽妗?-->
    <el-dialog v-model="showChangePasswordDialog" :title="t('settings.changePwdTitle')" width="450px">
      <el-alert
        :title="t('settings.changePwdWarning')"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>{{ t('settings.changePwdAlert') }}</p>
      </el-alert>

      <el-form label-width="100px">
        <el-form-item :label="t('settings.oldPassword')">
          <el-input
            v-model="oldPasswordInput"
            type="password"
            :placeholder="t('settings.oldPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('settings.newPassword')">
          <el-input
            v-model="newPasswordInput"
            type="password"
            :placeholder="t('settings.newPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('settings.confirmPassword')">
          <el-input
            v-model="newPasswordConfirm"
            type="password"
            :placeholder="t('settings.confirmPasswordPlaceholder')"
            show-password
            @keyup.enter="changePassword"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showChangePasswordDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="changePassword">{{ t('settings.confirmChange') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Refresh, Setting, Folder, Lock, Bell } from '@element-plus/icons-vue'
import { t, setLocale } from '@/i18n'
import { loadConfig, saveConfig, resetConfig } from '@/utils/tauri/store'
import { fetch } from '@tauri-apps/plugin-http'
import { openPath } from '@tauri-apps/plugin-opener'
import { appDataDir, join } from '@tauri-apps/api/path'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import TauriAutostart from '@/utils/tauri/autostart'
import Database from '@tauri-apps/plugin-sql'
import { hashPassword, verifyPassword, generateSalt } from '@/utils/masterPassword'
import { saveReminderConfig } from '@/utils/reminderService'
import { resolveActiveProvider, PROVIDER_PRESETS, migrateOldAiSettings, generateProviderId } from '@/utils/aiProviders'
import { useAppStore } from '@/store/app'
import { getPrivilegeStatus, ensureSystemPrivilege } from '@/utils/systemPrivilegeManager'
import { getEnvScope, setEnvScope } from '@/utils/sdkManager'
import { applyAnimations, applyAppearance, applyFontFamily, applyFontSize, applyThemeMode } from '@/utils/appearance'
import { useRoute, useRouter } from 'vue-router'

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref('general')
const saving = ref(false)
const autostartLoading = ref(false)
const testingAI = ref(false)
const testingProvId = ref('')
const loadingModelsProvId = ref('')
const editingProviderId = ref('')
const aiTestResult = ref(null)
const providerModelsMap = reactive({})
const providerModelErrors = reactive({})
const originalSettings = ref(null)
const savedAiSettings = ref(null)
const savedAiAssistantSettings = ref(null)
const savedReminderConfig = ref(null)
const savedPasswordSettings = ref(null)
const autoSaving = ref(false)
const initializing = ref(true)

// 鍙嶉鐩稿叧
const feedbackContent = ref('')
const feedbackContact = ref('')
const submittingFeedback = ref(false)

// 鏇存柊鐩稿叧
const checkingUpdate = ref(false)
const updateInfo = ref('')
const hasChanges = ref(false)
const manualHasChanges = ref(false)
const configPath = ref('')
const lastSaved = ref('')

// 鑿滃崟椤?
const menuItems = computed(() => [
  {
    key: 'general',
    label: t('settings.general'),
    description: '窗口、外观、语言与通知',
    icon: Setting
  },
  {
    key: 'workspace',
    label: t('settings.workspace'),
    description: '笔记目录、Markdown 与 AI 配置',
    icon: Folder
  },
  {
    key: 'security',
    label: t('settings.security'),
    description: '系统权限、主密码与保护策略',
    icon: Lock
  },
  {
    key: 'about',
    label: t('settings.help'),
    description: '应用信息、反馈与更新支持',
    icon: Bell
  }
])

// 褰撳墠鑿滃崟鍚嶇О
const currentMenuName = computed(() => {
  const menu = menuItems.value.find(m => m.key === activeTab.value)
  return menu ? menu.label : t('settings.title')
})

const currentMenuDescription = computed(() => {
  const menu = menuItems.value.find(m => m.key === activeTab.value)
  return menu?.description || '闆嗕腑绠＄悊褰撳墠搴旂敤鐨勫叧閿亸濂戒笌鏃ュ父浣跨敤璁剧疆'
})

const saveStatusText = computed(() => {
  if (saving.value || autoSaving.value) return t('settings.statusSaving')
  if (manualHasChanges.value) return t('settings.statusUnsaved')
  if (lastSaved.value) return `${t('settings.statusSaved')} 路 ${lastSaved.value}`
  return t('settings.statusIdle')
})

const saveStatusClass = computed(() => {
  if (saving.value || autoSaving.value) return 'saving'
  if (manualHasChanges.value) return 'unsaved'
  if (lastSaved.value) return 'saved'
  return 'idle'
})

const validTabKeys = computed(() => menuItems.value.map(item => item.key))
const normalizeTab = (tab) => {
  if (typeof tab !== 'string' || !tab) {
    return 'general'
  }
  return validTabKeys.value.includes(tab) ? tab : 'general'
}

let persistAiSettingsTimer = null

const schedulePersistAiSettings = () => {
  if (persistAiSettingsTimer) {
    clearTimeout(persistAiSettingsTimer)
  }
  persistAiSettingsTimer = setTimeout(async () => {
    persistAiSettingsTimer = null
    await persistSettings()
  }, 300)
}

const formatSavedTime = () => new Date().toLocaleTimeString('zh-CN', {
  hour: '2-digit',
  minute: '2-digit'
})

// 璁剧疆鏁版嵁
const settings = reactive({
  closeAction: 'ask',
  autoStart: false,
  language: 'zh-CN',
  theme: 'auto',
  fontSize: 14,
  fontFamily: 'system',
  enableAnimations: true,
  notesStoragePath: '',
  // Markdown 涓婚璁剧疆
  previewTheme: 'mk-cute',
  previewCodeTheme: 'github',
  editorPreviewTheme: 'mk-cute',
  editorCodeTheme: 'github'
})

// AI 璁剧疆
const aiSettings = reactive({
  providers: [],
  activeProviderId: ''
})

// AI 鍔╂墜鎮诞鐞冭缃?
const aiAssistantSettings = reactive({
  enableFloatingBall: false,
  floatingBallMode: 'inApp', // 'inApp' 鎴?'desktop'
  floatingBallStyle: 'circle', // 'circle', 'rounded', 'capsule'
  floatingBallSize: 60
})

// 瀛樺偍缁熻
const storageStats = reactive({
  notesSize: 0,
  databaseSize: 0,
  mediaSize: 0,
  totalSize: 0
})

// 鍔犺浇缁熻鐘舵€?
const loadingStats = ref(false)

// 瀵嗙爜绠＄悊璁剧疆
const passwordSettings = reactive({
  requirePasswordOnStart: true,
  autoLockTime: 15
})

// 瀵嗙爜搴撶粺璁?
const passwordStats = reactive({
  totalPasswords: 0,
  historyCount: 0,
  recycleBinCount: 0,
  hasMasterPassword: false
})

// 淇敼瀵嗙爜鐩稿叧
const showChangePasswordDialog = ref(false)
const oldPasswordInput = ref('')
const newPasswordInput = ref('')
const newPasswordConfirm = ref('')

// 绯荤粺鏉冮檺
const systemPrivilege = reactive({
  authorized: false,
  checking: false,
  authorizing: false,
  envScope: getEnvScope(),
})

// 鎻愰啋璁剧疆
const reminderConfig = reactive({
  position: 'bottomRight',
  positionType: 'screen'
})

// 杩佺Щ杩涘害
const showMigrationDialog = ref(false)
const migrationProgress = ref(0)
const migrationStatus = ref('')
const migrateMode = ref('move') // 'move' 鎴?'copy'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 鍒囨崲璇█
const handleLanguageChange = (lang) => {
  setLocale(lang)
}

const createProviderFromPreset = (providerKey = 'custom') => {
  const preset = PROVIDER_PRESETS[providerKey] || PROVIDER_PRESETS.custom
  return {
    id: generateProviderId(providerKey),
    name: preset.name || 'Custom',
    provider: providerKey,
    baseUrl: preset.baseUrl || '',
    apiKey: '',
    model: preset.models?.[0] || ''
  }
}

const getProviderModelOptions = (prov) => {
  const remoteModels = providerModelsMap[prov.id] || []
  if (remoteModels.length) return remoteModels
  return PROVIDER_PRESETS[prov.provider]?.models || []
}

const fetchProviderModels = async (prov, { silent = true } = {}) => {
  if (!prov?.id) return

  const baseUrl = (prov.baseUrl || '').trim().replace(/\/$/, '')
  if (!baseUrl) {
    providerModelsMap[prov.id] = []
    providerModelErrors[prov.id] = ''
    return
  }

  loadingModelsProvId.value = prov.id
  providerModelErrors[prov.id] = ''

  try {
    const headers = {}
    if (prov.apiKey) {
      const isClaude = prov.provider === 'claude' || /anthropic\.com/i.test(baseUrl)
      if (isClaude) {
        headers['x-api-key'] = prov.apiKey
        headers['anthropic-version'] = '2023-06-01'
      } else {
        headers.Authorization = `Bearer ${prov.apiKey}`
      }
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const rawModels = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data)
          ? data
          : []

    const models = rawModels
      .map(item => typeof item === 'string' ? item : (item?.id || item?.name || item?.model || ''))
      .filter(Boolean)

    providerModelsMap[prov.id] = [...new Set(models)]
    if (!providerModelsMap[prov.id].length) {
      providerModelErrors[prov.id] = t('settings.modelListEmpty')
      if (!silent) {
        ElMessage.warning(t('settings.modelListEmpty'))
      }
    }
  } catch (error) {
    providerModelsMap[prov.id] = []
    providerModelErrors[prov.id] = t('settings.modelListFallback')
    if (!silent) {
      ElMessage.warning(error?.message || t('settings.modelListFallback'))
    }
  } finally {
    if (loadingModelsProvId.value === prov.id) {
      loadingModelsProvId.value = ''
    }
  }
}

const addProvider = async (providerKey) => {
  const provider = createProviderFromPreset(providerKey)
  aiSettings.providers.push(provider)
  providerModelsMap[provider.id] = PROVIDER_PRESETS[provider.provider]?.models || []
  providerModelErrors[provider.id] = ''
  if (!aiSettings.activeProviderId) {
    aiSettings.activeProviderId = provider.id
  }
  editingProviderId.value = provider.id
  aiTestResult.value = null
  testingProvId.value = ''
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

const handleProviderEdit = (prov) => {
  editingProviderId.value = prov.id
  if (!providerModelsMap[prov.id]) {
    providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
  }
}

const refreshProviderModels = async (prov) => {
  await fetchProviderModels(prov, { silent: false })
}

const initProviderModelState = () => {
  aiSettings.providers.forEach((prov) => {
    if (!providerModelsMap[prov.id]) {
      providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
    }
    if (!(prov.id in providerModelErrors)) {
      providerModelErrors[prov.id] = ''
    }
  })
}

const trimProviderModelState = () => {
  const ids = new Set(aiSettings.providers.map(item => item.id))
  Object.keys(providerModelsMap).forEach((id) => {
    if (!ids.has(id)) delete providerModelsMap[id]
  })
  Object.keys(providerModelErrors).forEach((id) => {
    if (!ids.has(id)) delete providerModelErrors[id]
  })
}

watch(
  () => aiSettings.providers.map(item => `${item.id}|${item.provider}|${item.baseUrl}|${item.apiKey}`).join('||'),
  () => {
    initProviderModelState()
    trimProviderModelState()
  },
  { immediate: true }
)

const setActiveProvider = async (providerId) => {
  aiSettings.activeProviderId = providerId
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

const removeProvider = async (index) => {
  const removed = aiSettings.providers[index]
  if (!removed) return
  if (aiSettings.providers.length <= 1) {
    ElMessage.warning(t('settings.atLeastOneProvider'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('settings.confirmDeleteProvider'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  aiSettings.providers.splice(index, 1)
  if (!aiSettings.providers.length) {
    const fallback = createProviderFromPreset('openai')
    aiSettings.providers.push(fallback)
  }
  if (!aiSettings.providers.some(item => item.id === aiSettings.activeProviderId)) {
    aiSettings.activeProviderId = aiSettings.providers[0]?.id || ''
  }
  if (editingProviderId.value === removed.id) {
    editingProviderId.value = aiSettings.providers[0]?.id || ''
  }
  if (loadingModelsProvId.value === removed.id) {
    loadingModelsProvId.value = ''
  }
  if (testingProvId.value === removed.id) {
    testingProvId.value = ''
    aiTestResult.value = null
  }
  manualHasChanges.value = true
  hasChanges.value = true
  await persistSettings()
}

const resetProviderDefaults = (prov) => {
  const preset = PROVIDER_PRESETS[prov.provider] || PROVIDER_PRESETS.custom
  prov.baseUrl = preset.baseUrl || ''
  prov.model = preset.models?.[0] || ''
  if (!prov.name || Object.values(PROVIDER_PRESETS).some(item => item.name === prov.name)) {
    prov.name = preset.name || prov.name
  }
  manualHasChanges.value = true
  hasChanges.value = true
}

const onProviderTypeChange = async (prov) => {
  resetProviderDefaults(prov)
  providerModelsMap[prov.id] = PROVIDER_PRESETS[prov.provider]?.models || []
  providerModelErrors[prov.id] = ''
  await fetchProviderModels(prov)
}

const syncSavedSnapshots = () => {
  originalSettings.value = JSON.parse(JSON.stringify(settings))
  savedAiSettings.value = JSON.parse(JSON.stringify(aiSettings))
  savedAiAssistantSettings.value = JSON.parse(JSON.stringify(aiAssistantSettings))
  savedReminderConfig.value = JSON.parse(JSON.stringify(reminderConfig))
  savedPasswordSettings.value = JSON.parse(JSON.stringify(passwordSettings))
  hasChanges.value = false
  manualHasChanges.value = false
}

const restoreSavedSnapshots = () => {
  if (originalSettings.value) Object.assign(settings, JSON.parse(JSON.stringify(originalSettings.value)))
  if (savedAiSettings.value) Object.assign(aiSettings, JSON.parse(JSON.stringify(savedAiSettings.value)))
  if (savedAiAssistantSettings.value) Object.assign(aiAssistantSettings, JSON.parse(JSON.stringify(savedAiAssistantSettings.value)))
  if (savedReminderConfig.value) Object.assign(reminderConfig, JSON.parse(JSON.stringify(savedReminderConfig.value)))
  if (savedPasswordSettings.value) Object.assign(passwordSettings, JSON.parse(JSON.stringify(savedPasswordSettings.value)))
}

const persistSettings = async ({ silent = true } = {}) => {
  if (initializing.value || saving.value || autoSaving.value) return false

  autoSaving.value = true
  try {
    const config = {
      ...settings,
      aiSettings: { ...aiSettings },
      aiAssistantSettings: { ...aiAssistantSettings }
    }
    await saveConfig(config)

    window.dispatchEvent(new CustomEvent('settings-config-saved', {
      detail: { aiSettings: { ...aiSettings } }
    }))
    window.dispatchEvent(new CustomEvent('ai-config-changed', {
      detail: { aiSettings: { ...aiSettings } }
    }))

    localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))
    const activeProvider = resolveActiveProvider(aiSettings)
    localStorage.setItem('ai_config', JSON.stringify({
      apiKey: activeProvider.apiKey,
      baseURL: activeProvider.baseUrl,
      baseUrl: activeProvider.baseUrl,
      model: activeProvider.model,
      provider: activeProvider.provider || 'custom'
    }))

    window.dispatchEvent(new CustomEvent('ai-floating-ball-settings-changed', {
      detail: aiAssistantSettings
    }))

    if (settings.closeAction) {
      appStore.setCloseAction(settings.closeAction)
    }

    await savePasswordSettings()
    saveReminderConfig(reminderConfig)

    syncSavedSnapshots()
    lastSaved.value = formatSavedTime()

    if (!silent) {
      ElMessage.success(t('settings.saveSuccess'))
    }
    return true
  } catch (error) {
    restoreSavedSnapshots()
    applyAppearance(settings)
    setLocale(settings.language)
    ElMessage.error(`${t('settings.saveFailed')}: ${error?.message || error || 'unknown error'}`)
    return false
  } finally {
    autoSaving.value = false
  }
}

const autoSaveWithSideEffect = async (effect, rollback) => {
  if (typeof effect === 'function') {
    effect()
  }
  const ok = await persistSettings()
  if (!ok && typeof rollback === 'function') {
    rollback()
  }
}

const handleThemeChange = async (theme) => {
  await autoSaveWithSideEffect(() => applyThemeMode(theme))
}

const handleFontFamilyChange = async (family) => {
  await autoSaveWithSideEffect(() => applyFontFamily(family))
}

const handleFontSizeChange = async (size) => {
  await autoSaveWithSideEffect(() => applyFontSize(size))
}

const handleAnimationsChange = async (enabled) => {
  await autoSaveWithSideEffect(() => applyAnimations(enabled))
}

const handleFloatingBallSettingChange = async () => {
  handleFloatingBallChange()
  await persistSettings()
}

const handlePasswordSettingChange = async () => {
  await persistSettings()
}

const handleReminderSettingChange = async () => {
  await persistSettings()
}

const handleCloseActionChange = async () => {
  await persistSettings()
}

const handleMarkdownThemeChange = async () => {
  await persistSettings()
}

const handleEnvScopeSettingChange = async (value) => {
  handleEnvScopeChange(value)
  await persistSettings()
}

const handleLanguageSettingChange = async (lang) => {
  handleLanguageChange(lang)
  await persistSettings()
}

const handleAutoStartToggle = async (enabled) => {
  const previous = !enabled
  autostartLoading.value = true
  try {
    const success = await TauriAutostart.toggleAutostart(enabled)
    if (success) {
      await persistSettings()
    } else {
      settings.autoStart = previous
      ElMessage.error(t('settings.saveFailed'))
    }
  } catch (error) {
    settings.autoStart = previous
    ElMessage.error(t('settings.saveFailed'))
  } finally {
    autostartLoading.value = false
  }
}

const handleSystemPrivilegeAuthorize = async () => {
  await authorizeSystemPrivilege()
}

/**
 * 鍔犺浇閰嶇疆
 */
const loadSettings = async () => {
  try {
    const config = await loadConfig()

    // 鏇存柊璁剧疆
    if (config) {
      Object.assign(settings, config)
      if (config.aiSettings) {
        const migratedAiSettings = migrateOldAiSettings(config.aiSettings)
        Object.assign(aiSettings, migratedAiSettings)
        if (!aiSettings.providers.length) {
          const fallback = createProviderFromPreset('openai')
          aiSettings.providers = [fallback]
          aiSettings.activeProviderId = fallback.id
        }
        editingProviderId.value = aiSettings.activeProviderId || aiSettings.providers[0]?.id || ''
      }
      if (config.aiAssistantSettings) {
        Object.assign(aiAssistantSettings, config.aiAssistantSettings)
      }

      applyAppearance(config)

      // 鍚屾绐楀彛鍏抽棴琛屼负鍒?store
      if (config.closeAction) {
        appStore.setCloseAction(config.closeAction)
      }
    }

    // 妫€鏌ヨ嚜鍔ㄥ惎鍔ㄧ姸鎬?
    try {
      const autostartEnabled = await TauriAutostart.checkAutostart()
      settings.autoStart = autostartEnabled
    } catch (e) { /* ignore */ }

    // 鍔犺浇绗旇瀛樺偍璺緞
    if (!settings.notesStoragePath) {
      const dataDir = await appDataDir()
      settings.notesStoragePath = await join(dataDir, 'notes')

    }

    if (!aiSettings.providers.length) {
      const fallback = createProviderFromPreset('openai')
      aiSettings.providers = [fallback]
      aiSettings.activeProviderId = fallback.id
    }
    if (!editingProviderId.value) {
      editingProviderId.value = aiSettings.activeProviderId || aiSettings.providers[0]?.id || ''
    }
    initProviderModelState()

    // 鍔犺浇瀛樺偍缁熻
    await loadStorageStats()

    // 淇濆瓨鍘熷璁剧疆鐢ㄤ簬姣旇緝
    syncSavedSnapshots()
  } catch (e) { /* ignore */ }
}

/**
 * 澶勭悊鑷姩鍚姩鐘舵€佸彉鍖?
 */
/**
 * 淇濆瓨閰嶇疆
 */
const handleSave = async () => {
  saving.value = true
  try {
    await persistSettings({ silent: false })
    manualHasChanges.value = false
  } finally {
    saving.value = false
  }
}

const handleAutostartChange = handleAutoStartToggle

/**
 * 閫夋嫨绗旇瀛樺偍璺緞
 */
const selectNotesStoragePath = async () => {
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: settings.notesStoragePath
    })

    if (selected && selected !== settings.notesStoragePath) {
      const oldPath = settings.notesStoragePath

      // 璇㈤棶鐢ㄦ埛杩佺Щ妯″紡
      try {
        const { value } = await ElMessageBox.confirm(
          t('settings.migrateModeMsg', { oldPath, newPath: selected }),
          t('settings.migrateModeTitle'),
          {
            confirmButtonText: t('settings.migrateMoveBtn'),
            cancelButtonText: t('settings.migrateCopyBtn'),
            distinguishCancelAndClose: true,
            showClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: false,
            type: 'warning',
            buttonSize: 'default'
          }
        )

        // 鐢ㄦ埛閫夋嫨绉诲姩
        migrateMode.value = 'move'
        await performMigration(oldPath, selected)
      } catch (action) {
        if (action === 'cancel') {
          // 鐢ㄦ埛閫夋嫨澶嶅埗
          migrateMode.value = 'copy'
          await performMigration(oldPath, selected)
        } else if (action === 'close') {
          // 鏄剧ず"浠呮洿鏀硅矾寰?纭
          try {
            await ElMessageBox.confirm(
              t('settings.migrateOnlyPathConfirm'),
              t('settings.migrateOnlyPathTitle'),
              {
                confirmButtonText: t('settings.migrateOnlyPathBtn'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
              }
            )

            // 浠呮洿鏀硅矾寰?
            settings.notesStoragePath = selected
            const { resetNotesDir } = await import('@/utils/notes')
            resetNotesDir()
            await handleSave()
            ElMessage.warning(t('settings.migrateOnlyPathDone'))
          } catch {
            // 鐢ㄦ埛鍙栨秷浜?浠呮洿鏀硅矾寰?
          }
        }
      }
    }
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error(t('settings.selectPathFailed'))
    }
  }
}

/**
 * 鎵ц杩佺Щ鎿嶄綔
 */
const performMigration = async (oldPath, newPath) => {
  showMigrationDialog.value = true
  migrationProgress.value = 0
  migrationStatus.value = t('settings.migratePreparing')

  const previousPath = settings.notesStoragePath

  try {
    const migrationResult = await migrateNotes(oldPath, newPath)
    settings.notesStoragePath = newPath

    const { resetNotesDir } = await import('@/utils/notes')
    resetNotesDir()

    try {
      await handleSave()
    } catch (error) {
      settings.notesStoragePath = previousPath
      resetNotesDir()
      throw error
    }

    if (migrationResult?.cleanupSource) {
      await migrationResult.cleanupSource()
    }

    window.dispatchEvent(new CustomEvent('notes-path-changed', {
      detail: { newPath }
    }))

    migrationStatus.value = migrateMode.value === 'move'
      ? t('settings.migrateDoneMove')
      : t('settings.migrateDoneCopy')

    ElMessage.success({
      message: migrateMode.value === 'move' ? t('settings.migrateSuccessMove') : t('settings.migrateSuccessCopy'),
      duration: 3000
    })

    setTimeout(() => {
      showMigrationDialog.value = false
    }, 2000)
  } catch (error) {
    migrationStatus.value = t('settings.migrateFailed', { msg: error.message })
    ElMessage.error(t('settings.migrateFailed', { msg: error.message }))
  }
}

/**
 * 杩佺Щ绗旇鏂囦欢
 */
const migrateNotes = async (oldPath, newPath) => {
  const { exists, mkdir, copyFile, remove } = await import('@tauri-apps/plugin-fs')
  const { join, sep } = await import('@tauri-apps/api/path')

  migrationStatus.value = t('settings.migrateCheckSource')

  if (!(await exists(oldPath))) {
    throw new Error(t('settings.migrateSourceNotExist'))
  }

  if (!(await exists(newPath))) {
    await mkdir(newPath, { recursive: true })
  }

  migrationStatus.value = t('settings.migrateScanFiles')
  const allFiles = await getAllFiles(oldPath, oldPath)

  if (allFiles.length === 0) {
    migrationProgress.value = 100
    migrationStatus.value = t('settings.migrateNoFiles')
    return { cleanupSource: null }
  }

  let processedFiles = 0
  const copiedFiles = []

  for (const file of allFiles) {
    const relativePath = file.replace(oldPath, '').replace(/^[/\\]/, '')
    const targetPath = await join(newPath, relativePath)

    const targetDir = targetPath.substring(0, targetPath.lastIndexOf(sep()))
    if (!(await exists(targetDir))) {
      await mkdir(targetDir, { recursive: true })
    }

    migrationStatus.value = migrateMode.value === 'move'
      ? t('settings.migrateMoving', { file: relativePath })
      : t('settings.migrateCopying', { file: relativePath })
    await copyFile(file, targetPath)
    copiedFiles.push(file)

    processedFiles++
    migrationProgress.value = Math.round((processedFiles / allFiles.length) * 100)
  }

  if (migrateMode.value === 'move') {
    return {
      cleanupSource: async () => {
        migrationStatus.value = t('settings.migrateCleanSource')
        for (const file of copiedFiles) {
          try {
            await remove(file)
          } catch (e) { /* ignore */ }
        }

        try {
          await removeEmptyDirs(oldPath)
        } catch (e) { /* ignore */ }

        migrationStatus.value = t('settings.migrateMoveComplete', { count: processedFiles })
      }
    }
  }

  migrationStatus.value = t('settings.migrateCopyComplete', { count: processedFiles })
  return { cleanupSource: null }
}

/**
 * 鍒犻櫎绌虹洰褰曪紙閫掑綊锛?
 */
const removeEmptyDirs = async (dir) => {
  const { readDir, remove } = await import('@tauri-apps/plugin-fs')

  try {
    const entries = await readDir(dir)

    // 濡傛灉鐩綍涓虹┖锛屽垹闄ゅ畠
    if (entries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }

    // 閫掑綊澶勭悊瀛愮洰褰?
    for (const entry of entries) {
      if (entry.isDirectory) {
        const { join } = await import('@tauri-apps/api/path')
        const subDir = await join(dir, entry.name)
        await removeEmptyDirs(subDir)
      }
    }

    // 鍐嶆妫€鏌ュ綋鍓嶇洰褰曟槸鍚︿负绌?
    const updatedEntries = await readDir(dir)
    if (updatedEntries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }

    return false
  } catch (error) {

    return false
  }
}

/**
 * 閫掑綊鑾峰彇鎵€鏈夋枃浠?
 */
const getAllFiles = async (dir, baseDir) => {
  const { readDir, stat } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  const files = []

  try {
    const entries = await readDir(dir)

    for (const entry of entries) {
      const fullPath = await join(dir, entry.name)
      const fileStat = await stat(fullPath)

      if (fileStat.isDirectory) {
        // 閫掑綊鑾峰彇瀛愮洰褰曟枃浠?
        const subFiles = await getAllFiles(fullPath, baseDir)
        files.push(...subFiles)
      } else if (fileStat.isFile) {
        files.push(fullPath)
      }
    }
  } catch (e) { /* ignore */ }

  return files
}

/**
 * 娴嬭瘯 AI 杩炴帴
 */
const testProviderConnection = async (provider) => {
  if (!provider?.apiKey || !provider?.baseUrl || !provider?.model) {
    aiTestResult.value = {
      success: false,
      message: t('settings.fillApiFields')
    }
    testingProvId.value = provider?.id || ''
    return
  }

  testingAI.value = true
  testingProvId.value = provider.id
  aiTestResult.value = null

  try {
    let baseUrl = provider.baseUrl.trim()
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const isClaude = provider.provider === 'claude' || /anthropic\.com/i.test(baseUrl)
    const response = await fetch(
      isClaude ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: isClaude
          ? {
              'Content-Type': 'application/json',
              'x-api-key': provider.apiKey,
              'anthropic-version': '2023-06-01'
            }
          : {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.apiKey}`
            },
        body: JSON.stringify(
          isClaude
            ? {
                model: provider.model,
                max_tokens: 16,
                messages: [{ role: 'user', content: 'Hello' }]
              }
            : {
                model: provider.model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
              }
        )
      }
    )

    if (response.ok) {
      const text = await response.text()
      const data = JSON.parse(text)
      const ok = isClaude
        ? Array.isArray(data?.content) && data.content.some(item => item?.text)
        : data?.choices && Array.isArray(data.choices) && data.choices.length > 0
      if (ok) {
        aiTestResult.value = {
          success: true,
          message: t('settings.aiConnectSuccess', { model: provider.model })
        }
      } else {
        throw new Error(t('settings.aiConnectFormatError', { content: text.substring(0, 200) }))
      }
    } else {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    aiTestResult.value = {
      success: false,
      message: error.message || t('settings.aiConnectFail')
    }
  } finally {
    testingAI.value = false
  }
}

/**
 * 鍔犺浇瀛樺偍缁熻
 */
const loadStorageStats = async () => {
  loadingStats.value = true
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
    const { join, appDataDir } = await import('@tauri-apps/api/path')

    // 鍏堟竻闆讹紝閬垮厤閮ㄥ垎澶辫触鏃舵畫鐣欐棫鍊?
    storageStats.notesSize = 0
    storageStats.databaseSize = 0
    storageStats.mediaSize = 0
    storageStats.totalSize = 0

    // 璁＄畻绗旇鏂囦欢澶у皬
    const notesDir = await getNotesDir()
    storageStats.notesSize = await calculateDirectorySize(notesDir)

    // 璁＄畻鏁版嵁搴撴枃浠跺ぇ灏?
    const appDir = await appDataDir()
    const dbPath = await join(appDir, 'productivity.db')
    if (await exists(dbPath)) {
      const dbStat = await stat(dbPath)
      storageStats.databaseSize = dbStat.size || 0
    }

    // 璁＄畻濯掍綋鏂囦欢澶у皬锛坕mages, videos 鏂囦欢澶癸級
    let mediaSize = 0
    const imagesPath = await join(notesDir, 'images')
    if (await exists(imagesPath)) {
      mediaSize += await calculateDirectorySize(imagesPath)
    }

    // 閬嶅巻鎵€鏈夌瑪璁版枃浠跺す锛岃绠楀叾涓殑 images 鍜?videos 瀛愭枃浠跺す
    try {
      const entries = await readDir(notesDir)
      for (const entry of entries) {
        if (entry.isDirectory) {
          const entryPath = await join(notesDir, entry.name)
          const imagesSubPath = await join(entryPath, 'images')
          const videosSubPath = await join(entryPath, 'videos')

          if (await exists(imagesSubPath)) {
            mediaSize += await calculateDirectorySize(imagesSubPath)
          }
          if (await exists(videosSubPath)) {
            mediaSize += await calculateDirectorySize(videosSubPath)
          }
        }
      }
    } catch (e) { /* ignore */ }

    storageStats.mediaSize = mediaSize
    storageStats.totalSize = storageStats.notesSize + storageStats.databaseSize + storageStats.mediaSize

    // ElMessage.success('瀛樺偍缁熻宸叉洿鏂?) // 宸茬Щ闄ゆ彁绀猴紝閬垮厤閲嶅寮瑰嚭
  } catch (error) {
    // 瀹夎鍖呯幆澧冧笅鑷畾涔夎矾寰勩€佹潈闄愭垨鐩綍鐬€佸紓甯镐細瀵艰嚧杩欓噷棰戠箒鎶ラ敊
    // 淇濇寔椤甸潰闈欓粯骞跺睍绀?0锛岄伩鍏嶆瘡娆¤繘鍏ヨ缃〉閮藉脊閿欒鎻愮ず
    storageStats.notesSize = 0
    storageStats.databaseSize = 0
    storageStats.mediaSize = 0
    storageStats.totalSize = 0
  } finally {
    loadingStats.value = false
  }
}

/**
 * 閫掑綊璁＄畻鐩綍澶у皬
 */
const calculateDirectorySize = async (dirPath) => {
  const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  let totalSize = 0

  try {
    if (!(await exists(dirPath))) {
      return 0
    }

    const entries = await readDir(dirPath)

    for (const entry of entries) {
      const entryPath = await join(dirPath, entry.name)

      try {
        const entryStat = await stat(entryPath)

        if (entryStat.isDirectory) {
          // 閫掑綊璁＄畻瀛愮洰褰曞ぇ灏?
          totalSize += await calculateDirectorySize(entryPath)
        } else if (entryStat.isFile) {
          totalSize += entryStat.size || 0
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  return totalSize
}

/**
 * 鏍煎紡鍖栨枃浠跺ぇ灏?
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 鍔犺浇瀵嗙爜璁剧疆
 */
const loadPasswordSettings = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT require_password_on_start FROM master_password LIMIT 1')
    if (result && result.length > 0) {
      passwordSettings.requirePasswordOnStart = result[0].require_password_on_start === 1
    }
  } catch (e) { /* ignore */ }
}

/**
 * 淇濆瓨瀵嗙爜璁剧疆
 */
const savePasswordSettings = async () => {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS master_password (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        require_password_on_start INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    try {
      await db.execute(`
        ALTER TABLE master_password ADD COLUMN require_password_on_start INTEGER DEFAULT 1
      `)
    } catch (e) { /* ignore */ }

    const result = await db.select('SELECT id FROM master_password ORDER BY id ASC LIMIT 1')
    if (result && result.length > 0) {
      await db.execute(
        'UPDATE master_password SET require_password_on_start = ?, updated_at = ? WHERE id = ?',
        [passwordSettings.requirePasswordOnStart ? 1 : 0, now, result[0].id]
      )
    } else {
      // Keep settings persistence independent from whether a master password exists.
      await db.execute(
        'INSERT INTO master_password (password_hash, salt, require_password_on_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        ['', '', passwordSettings.requirePasswordOnStart ? 1 : 0, now, now]
      )
    }
    // 绉婚櫎鍗曠嫭鐨勬垚鍔熸彁绀猴紝鐢?handleSave 缁熶竴鎻愮ず
  } catch (error) {

    throw error // 鎶涘嚭閿欒璁?handleSave 澶勭悊
  }
}

/**
 * 鍔犺浇瀵嗙爜搴撶粺璁?
 */
const loadPasswordStats = async () => {
  try {
    const db = await getDatabase()

    // 缁熻瀵嗙爜鏁伴噺
    const passwords = await db.select('SELECT COUNT(*) as count FROM passwords WHERE is_deleted = 0 OR is_deleted IS NULL')
    passwordStats.totalPasswords = passwords[0]?.count || 0

    // 缁熻鍘嗗彶璁板綍
    const history = await db.select('SELECT COUNT(*) as count FROM password_history')
    passwordStats.historyCount = history[0]?.count || 0

    // 缁熻鍥炴敹绔?
    const recycleBin = await db.select('SELECT COUNT(*) as count FROM password_recycle_bin')
    passwordStats.recycleBinCount = recycleBin[0]?.count || 0

    // 妫€鏌ヤ富瀵嗙爜
    const masterPassword = await db.select('SELECT COUNT(*) as count FROM master_password')
    passwordStats.hasMasterPassword = (masterPassword[0]?.count || 0) > 0
  } catch (e) { /* ignore */ }
}

/**
 * 淇敼涓诲瘑鐮?
 */
const changePassword = async () => {
  if (!oldPasswordInput.value) {
    ElMessage.warning(t('settings.enterOldPwd'))
    return
  }

  if (!newPasswordInput.value || newPasswordInput.value.length < 6) {
    ElMessage.warning(t('settings.newPwdMinLength'))
    return
  }

  if (newPasswordInput.value !== newPasswordConfirm.value) {
    ElMessage.warning(t('settings.newPwdMismatch'))
    return
  }

  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')

    if (!result || result.length === 0) {
      ElMessage.error(t('settings.masterPwdNotFound'))
      return
    }

    // 楠岃瘉鏃у瘑鐮?
    const { password_hash, salt } = result[0]
    const isValid = verifyPassword(oldPasswordInput.value, password_hash, salt)

    if (!isValid) {
      ElMessage.error(t('settings.oldPwdWrong'))
      return
    }

    // 鐢熸垚鏂板瘑鐮佸搱甯?
    const newSalt = generateSalt()
    const newHash = hashPassword(newPasswordInput.value, newSalt)
    const now = new Date().toISOString()

    await db.execute(
      'UPDATE master_password SET password_hash = ?, salt = ?, updated_at = ? WHERE id = 1',
      [newHash, newSalt, now]
    )

    ElMessage.success(t('settings.pwdChangeSuccess'))
    showChangePasswordDialog.value = false
    oldPasswordInput.value = ''
    newPasswordInput.value = ''
    newPasswordConfirm.value = ''
  } catch (error) {

    ElMessage.error(t('settings.pwdChangeFailed'))
  }
}

/**
 * 閲嶇疆閰嶇疆
 */
const handleReset = async () => {
  try {
    await ElMessageBox.confirm(
      t('settings.confirmResetMsg'),
      t('settings.confirmResetTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

    if (persistAiSettingsTimer) {
      clearTimeout(persistAiSettingsTimer)
      persistAiSettingsTimer = null
    }

    initializing.value = true
    await resetConfig()
    localStorage.removeItem('ai_config')
    window.dispatchEvent(new CustomEvent('settings-reset'))
    await loadSettings()
  } catch (error) {
    if (error !== 'cancel') {

    }
  } finally {
    syncSavedSnapshots()
    initializing.value = false
  }
}

/**
 * 鍔犺浇鎻愰啋璁剧疆
 */
/**
 * 鍔犺浇鎻愰啋璁剧疆
 */
const loadReminderSettings = async () => {
  try {
    const config = localStorage.getItem('reminder_config')
    if (config) {
      const parsed = JSON.parse(config)
      Object.assign(reminderConfig, parsed)
    }
  } catch (e) { /* ignore */ }
}


/**
 * 娴嬭瘯閫氱煡
 */
const testNotification = async () => {
  try {
    const CustomNotification = await import('@/utils/tauri/customNotification')
    await CustomNotification.default.showCustomNotification({
      title: t('settings.testNotifTitle'),
      message: t('settings.testNotifMsg', { time: new Date().toLocaleString() }),
      type: 'info',
      duration: 10000,
      position: reminderConfig.position,
      positionType: reminderConfig.positionType
    })
  } catch (error) {
    // 娴嬭瘯閫氱煡鍙戦€佸け璐ラ潤榛樺鐞?
  }
}

/**
 * 鎻愪氦鍙嶉
 */
const submitFeedback = async () => {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning(t('settings.fillFeedback'))
    return
  }

  submittingFeedback.value = true
  try {
    const db = await Database.load('sqlite:app.db')

    // 纭繚鍙嶉琛ㄥ瓨鍦?
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        contact TEXT,
        created_at TEXT NOT NULL
      )
    `)

    const now = new Date().toISOString()
    await db.execute(
      'INSERT INTO feedback (content, contact, created_at) VALUES (?, ?, ?)',
      [feedbackContent.value.trim(), feedbackContact.value.trim(), now]
    )

    ElMessage.success(t('settings.feedbackSuccess'))
    feedbackContent.value = ''
    feedbackContact.value = ''
  } catch (error) {

    ElMessage.error(t('settings.feedbackFailed', { msg: error.message }))
  } finally {
    submittingFeedback.value = false
  }
}

/**
 * 娓呯┖鍙嶉琛ㄥ崟
 */
const clearFeedback = () => {
  feedbackContent.value = ''
  feedbackContact.value = ''
}

/**
 * 澶勭悊鎮诞鐞冨紑鍏冲垏鎹?
 */
const handleFloatingBallToggle = (enabled) => {
  // 淇濆瓨閰嶇疆鍒?localStorage锛堜緵瀹炴椂棰勮浣跨敤锛?
  localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

  // 鍙戦€佸叏灞€浜嬩欢閫氱煡搴旂敤鏇存柊鎮诞鐞冪姸鎬?
  window.dispatchEvent(new CustomEvent('ai-floating-ball-toggle', {
    detail: {
      enabled,
      mode: aiAssistantSettings.floatingBallMode,
      style: aiAssistantSettings.floatingBallStyle,
      size: aiAssistantSettings.floatingBallSize
    }
  }))
}

watch(
  () => [
    settings.closeAction,
    settings.theme,
    settings.fontFamily,
    settings.enableAnimations,
    settings.language,
    reminderConfig.positionType,
    reminderConfig.position,
    aiAssistantSettings.enableFloatingBall,
    aiAssistantSettings.floatingBallMode,
    aiAssistantSettings.floatingBallStyle,
    passwordSettings.requirePasswordOnStart,
    passwordSettings.autoLockTime,
    systemPrivilege.envScope,
  ],
  () => {
    if (initializing.value) {
      return
    }
    if (!autoSaving.value) {
      hasChanges.value = true
    }
  },
  { deep: true }
)

watch(
  () => [
    JSON.stringify(aiSettings.providers),
    aiSettings.activeProviderId,
    settings.fontSize,
  ],
  async (_, oldValue) => {
    if (initializing.value) {
      return
    }
    hasChanges.value = true
    manualHasChanges.value = true
    if (oldValue) {
      schedulePersistAiSettings()
    }
  },
  { deep: true }
)

watch(
  () => [
    settings.notesStoragePath,
  ],
  () => {
    if (initializing.value) {
      return
    }
    hasChanges.value = true
    manualHasChanges.value = true
  }
)

watch(
  () => aiAssistantSettings.floatingBallSize,
  () => {
    if (initializing.value) {
      return
    }
    hasChanges.value = true
    manualHasChanges.value = true
  }
)

watch(
  () => route.query.tab,
  (tab) => {
    const normalizedTab = normalizeTab(tab)
    if (activeTab.value !== normalizedTab) {
      activeTab.value = normalizedTab
      return
    }

    if (tab !== normalizedTab && !(normalizedTab === 'general' && (tab == null || tab === ''))) {
      const nextQuery = { ...route.query }
      if (normalizedTab === 'general') {
        delete nextQuery.tab
      } else {
        nextQuery.tab = normalizedTab
      }
      router.replace({ query: nextQuery })
    }
  },
  { immediate: true }
)

watch(activeTab, (tab) => {
  const normalizedTab = normalizeTab(tab)
  if (tab !== normalizedTab) {
    activeTab.value = normalizedTab
    return
  }

  const nextQuery = { ...route.query }
  if (normalizedTab === 'general') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = normalizedTab
  }
  router.replace({ query: nextQuery })
})

/**
 * 澶勭悊鎮诞鐞冮厤缃彉鍖栵紙浣嶇疆銆佹牱寮忋€佸ぇ灏忥級
 */
const handleFloatingBallChange = () => {
  // 淇濆瓨閰嶇疆鍒?localStorage锛堜緵瀹炴椂棰勮浣跨敤锛?
  localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

  // 鍙戦€佸叏灞€浜嬩欢閫氱煡搴旂敤鏇存柊鎮诞鐞冪姸鎬?
  window.dispatchEvent(new CustomEvent('ai-floating-ball-toggle', {
    detail: {
      enabled: aiAssistantSettings.enableFloatingBall,
      mode: aiAssistantSettings.floatingBallMode,
      style: aiAssistantSettings.floatingBallStyle,
      size: aiAssistantSettings.floatingBallSize
    }
  }))
}

/**
 * 妫€鏌ユ洿鏂?
 */
const checkUpdate = async () => {
  checkingUpdate.value = true
  updateInfo.value = ''

  try {
    // 妯℃嫙妫€鏌ユ洿鏂帮紙瀹為檯搴旇璋冪敤 Tauri 鏇存柊 API锛?
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 杩欓噷鍙互闆嗘垚 Tauri 鐨勬洿鏂板姛鑳?
    // 鐩墠鏄剧ず褰撳墠宸叉槸鏈€鏂扮増鏈?
    updateInfo.value = t('settings.latestVersion')
  } catch (error) {
    updateInfo.value = t('settings.checkUpdateFailed')
  } finally {
    checkingUpdate.value = false
  }
}

const loadSystemPrivilegeStatus = async () => {
  systemPrivilege.checking = true
  try {
    const status = await getPrivilegeStatus()
    systemPrivilege.authorized = status.authorized
  } finally {
    systemPrivilege.checking = false
  }
}

const authorizeSystemPrivilege = async () => {
  systemPrivilege.authorizing = true
  try {
    const status = await ensureSystemPrivilege()
    systemPrivilege.authorized = status.authorized
    ElMessage.success(t('settings.systemPrivilegeAuthorizeSuccess'))
  } catch (error) {
    ElMessage.error(error?.message || t('settings.systemPrivilegeAuthorizeFailed'))
  } finally {
    systemPrivilege.authorizing = false
    await loadSystemPrivilegeStatus()
  }
}

const handleEnvScopeChange = (value) => {
  setEnvScope(value)
  systemPrivilege.envScope = value
}

// 缁勪欢鎸傝浇鏃跺姞杞介厤缃?
onMounted(async () => {
  initializing.value = true
  try {
    await loadSettings() // loadSettings 鍐呴儴宸茬粡璋冪敤浜?loadStorageStats
    await loadPasswordSettings()
    await loadPasswordStats()
    await loadReminderSettings()
    await loadSystemPrivilegeStatus()
    // await loadStorageStats() // 宸插湪 loadSettings 涓皟鐢紝閬垮厤閲嶅

    // 鍔犺浇閰嶇疆璺緞
    try {
      const dataDir = await appDataDir()
      configPath.value = await join(dataDir, 'config.json')
    } catch (e) { /* ignore */ }
  } finally {
    syncSavedSnapshots()
    initializing.value = false
  }
})
</script>

<style scoped>
.settings-page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--text-primary);
  background: #f5f6f8;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 58px;
  padding: 8px 10px;
  background: #fff;
  border: none;
  border-radius: 6px;
  flex-shrink: 0;
}

.header-left {
  min-width: 0;
  flex: 1;
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.page-eyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.breadcrumb :deep(.el-icon) {
  font-size: 15px;
  color: var(--accent-blue);
}

.breadcrumb-divider {
  color: var(--text-quaternary);
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.save-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border: none;
}

.save-status.idle {
  color: var(--text-quaternary);
  background: rgba(255, 255, 255, 0.55);
}

.save-status.saved {
  color: #1f8a52;
  background: rgba(46, 204, 113, 0.12);
}

.save-status.unsaved {
  color: #b26a00;
  background: rgba(255, 179, 71, 0.15);
}

.save-status.saving {
  color: var(--accent-blue);
  background: rgba(10, 132, 255, 0.12);
}

.toolbar-btn {
  border-radius: 6px;
  border: none;
  background: #fff;
  box-shadow: none;
}

.toolbar-btn:hover {
  background: #f8fafc;
}

.main-container {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 5px;
  flex: 1;
  min-height: 0;
  padding: 5px 0 5px 5px;
}

.sidebar-left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: none;
  border-radius: 6px;
  background: #fff;
  box-shadow: none;
}

.sidebar-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: none;
}

.sidebar-toolbar-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.sidebar-subtitle {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-tertiary);
}

.sidebar-caption {
  font-size: 10px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-quaternary);
  background: #f8fafc;
  border: none;
}

.sidebar-section-label {
  padding: 8px 10px 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.menu-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
}

.menu-item {
  position: relative;
  display: grid;
  grid-template-columns: 2px 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
  padding: 6px 8px 6px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
  border: none;
}

.menu-item:hover {
  background: #f8fafc;
}

.menu-item.active {
  background: #eff6ff;
  box-shadow: none;
}

.menu-active-indicator {
  width: 2px;
  height: 20px;
  border-radius: 999px;
  background: transparent;
}

.menu-item.active .menu-active-indicator {
  background: var(--accent-blue);
}

.menu-icon-shell {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  background: #f8fafc;
  border: none;
}

.menu-icon {
  font-size: 13px;
  color: var(--text-secondary);
}

.menu-item.active .menu-icon {
  color: var(--accent-blue);
}

.menu-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.menu-name {
  font-size: 12px;
  line-height: 1.2;
  font-weight: 500;
  color: var(--text-primary);
}

.menu-desc {
  font-size: 10px;
  line-height: 1.3;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-chevron {
  align-self: center;
  font-size: 14px;
  line-height: 1;
  color: var(--text-quaternary);
  opacity: 0.7;
}

.menu-item.active .menu-chevron {
  color: var(--accent-blue);
  opacity: 1;
}

.content-area {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  border: none !important;
  border-radius: 6px 0 0 6px;
  background: #fff;
  box-shadow: none !important;
}

.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.settings-section {
  padding: 6px 8px;
}

.group-title {
  margin: 0 0 6px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.settings-section :deep(.el-card) {
  margin-bottom: 0 !important;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}

.settings-section :deep(.el-card + .el-card) {
  margin-top: 10px !important;
  padding-top: 10px;
  border-top: 1px solid #dfe5ee;
}

.settings-section :deep(.el-card__header) {
  padding: 6px 10px 8px;
  border-bottom: none;
  background: transparent;
}

.settings-section :deep(.el-card__body) {
  padding: 0 10px 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-section :deep(.el-form-item) {
  margin-bottom: 0;
  padding: 7px 0;
  border-bottom: none;
  align-items: center;
}

.settings-section :deep(.el-form-item__label) {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding-right: 6px;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-section :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: var(--text-secondary);
}

.settings-section :deep(.el-radio-group) {
  gap: 6px;
  flex-wrap: wrap;
}

.settings-section :deep(.el-radio) {
  min-height: 28px;
  margin-right: 8px;
  padding: 0 2px;
  border: none;
  background: transparent;
  box-shadow: none;
}

.settings-section :deep(.el-radio__label) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-section :deep(.el-radio.is-checked .el-radio__label) {
  color: var(--accent-blue);
}

.inline-control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.inline-control-row.wrap {
  flex-wrap: wrap;
}

.fill-control {
  flex: 1;
  min-width: 0;
}

.stacked-control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.form-hint-block {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-tertiary);
}

.form-hint-block.compact {
  margin-top: 0;
}

.settings-section :deep(.el-form) {
  --settings-label-width: 132px;
}

.settings-section :deep(.el-form--label-left .el-form-item) {
  display: grid;
  grid-template-columns: minmax(104px, var(--settings-label-width)) minmax(0, 1fr);
  column-gap: 8px;
}

.settings-section :deep(.el-form--label-left .el-form-item__label) {
  width: auto !important;
  justify-content: flex-start;
}

.settings-section :deep(.el-form--label-left .el-form-item__content) {
  min-width: 0;
  margin-left: 0 !important;
}

.settings-section :deep(.el-form-item:last-child) {
  padding-bottom: 7px;
}

.settings-section :deep(.inline-control-row),
.settings-section :deep(.stacked-control-group),
.settings-section :deep(.form-hint-block),
.settings-section :deep(.feedback-textarea),
.settings-section :deep(.stats-list),
.settings-section :deep(.provider-actions-row .el-form-item__content) {
  align-self: stretch;
}

.settings-section :deep(.stacked-control-group),
.settings-section :deep(.form-hint-block),
.settings-section :deep(.form-hint-block.compact) {
  align-items: flex-start;
}

.settings-section :deep(.el-form-item__content > *) {
  max-width: 100%;
}

.settings-section :deep(.el-switch + span),
.settings-section :deep(.el-radio-group + div),
.settings-section :deep(.el-select + div),
.settings-section :deep(.el-button + div) {
  flex-basis: 100%;
}

.settings-section :deep(.el-input),
.settings-section :deep(.el-select),
.settings-section :deep(.el-slider),
.settings-section :deep(.el-textarea),
.settings-section :deep(.el-radio-group),
.settings-section :deep(.el-descriptions) {
  max-width: 100%;
}

.settings-section :deep(.el-form-item__content .el-input[style*='width: 300px']),
.settings-section :deep(.el-form-item__content .el-select[style*='width: 300px']) {
  width: min(320px, 100%) !important;
}

.settings-section :deep(.el-form-item__content .el-input[style*='width: 380px']) {
  width: min(420px, 100%) !important;
}

.settings-section :deep(.el-form-item__content .el-select[style*='width: 280px']) {
  width: min(300px, 100%) !important;
}

.settings-section :deep(.el-form-item__content .el-select[style*='width: 200px']),
.settings-section :deep(.el-form-item__content .el-input[style*='width: 200px']),
.settings-section :deep(.el-form-item__content .el-slider[style*='width: 200px']) {
  width: min(240px, 100%) !important;
}

.settings-section :deep(.el-form-item__content .el-slider[style*='width: 300px']) {
  width: min(320px, 100%) !important;
}

@media (max-width: 960px) {
  .settings-section :deep(.el-form--label-left .el-form-item) {
    grid-template-columns: 1fr;
    row-gap: 8px;
  }

  .settings-section :deep(.el-form--label-left .el-form-item__label) {
    padding-right: 0;
  }
}

.settings-section :deep(.el-switch) {
  --el-switch-on-color: var(--accent-blue);
}

.settings-section :deep(.el-input__wrapper),
.settings-section :deep(.el-select__wrapper),
.settings-section :deep(.el-textarea__inner) {
  border-radius: 6px;
  box-shadow: none;
  border: none !important;
  background: #f7f8fa;
}

/* keep slider handle visible and centered in default state */
.settings-section :deep(.el-slider__button-wrapper) {
  opacity: 1 !important;
  visibility: visible !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  margin-top: 0 !important;
}

.settings-section :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent-blue);
  background: #fff;
  box-shadow: none;
}

.settings-section :deep(.el-slider__runway) {
  margin: 10px 0;
}

/* feedback area tuning */
.settings-section :deep(.help-support-card .el-card__body) {
  padding-top: 6px;
}

.settings-section :deep(.help-support-form .el-form-item__label) {
  align-items: center;
  min-height: 30px;
}

.settings-section :deep(.feedback-textarea) {
  width: min(780px, 100%) !important;
}

.settings-section :deep(.feedback-textarea .el-textarea__inner) {
  min-height: 132px;
  line-height: 1.5;
  resize: none !important;
}

.settings-section :deep(.feedback-contact-input) {
  width: min(520px, 100%) !important;
}

.settings-section :deep(.feedback-action-row .el-form-item__content) {
  align-items: center !important;
  gap: 6px;
}

/* inline control rows that need vertical centering */
.settings-section :deep(.form-item-inline-center .el-form-item__content) {
  align-items: center !important;
  gap: 6px;
}

.settings-section :deep(.check-update-btn) {
  height: 28px;
  padding: 0 10px;
}

.settings-section :deep(.check-update-btn .el-icon) {
  margin-right: 6px;
  display: inline-flex;
  align-items: center;
}

.settings-section :deep(.update-info) {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  margin-left: 8px;
  color: #16a34a;
  line-height: 1;
}

.settings-section :deep(.danger-action-row .el-form-item__content) {
  align-items: center !important;
  padding-top: 2px;
}

/* about app block refinement */
.settings-section :deep(.about-app-card .el-card__body) {
  padding-top: 6px;
}

.settings-section :deep(.about-app-descriptions) {
  width: min(760px, 100%);
}

.settings-section :deep(.about-app-descriptions .el-descriptions__table) {
  border-radius: 6px;
  overflow: hidden;
}

.settings-section :deep(.about-app-descriptions .el-descriptions__label) {
  width: 130px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border-color: transparent !important;
}

.settings-section :deep(.about-app-descriptions .el-descriptions__content) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  border-color: transparent !important;
}

.settings-section :deep(.about-app-descriptions .el-descriptions__cell) {
  padding-top: 8px;
  padding-bottom: 8px;
}

.settings-section :deep(.el-descriptions) {
  width: 100%;
}

.settings-section :deep(.el-descriptions__table) {
  border-radius: 0;
  overflow: hidden;
}

.settings-section :deep(.el-descriptions__label),
.settings-section :deep(.el-descriptions__content) {
  padding-top: 8px;
  padding-bottom: 8px;
  border-color: transparent !important;
}

/* storage/vault status list */
.stats-list {
  width: 100%;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #e7edf5;
}

.stats-row:last-child {
  border-bottom: none;
}

.stats-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stats-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
}

.settings-section :deep(.el-divider) {
  margin: 6px 0;
}

.settings-section :deep(.el-divider__text) {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.settings-section :deep(.el-alert) {
  border-radius: 8px;
  margin-bottom: 10px !important;
}

.ai-provider-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-provider-item {
  border-radius: 6px;
  border: none;
  background: #fff;
  overflow: hidden;
}

.ai-provider-item.active {
  background: #eff6ff;
}

.ai-provider-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
}

.ai-provider-form {
  padding: 0 8px 6px;
  border-top: none;
}

.settings-section :deep(.provider-actions-row .el-form-item__content) {
  display: flex;
  flex-wrap: wrap !important;
  align-items: center;
  gap: 6px;
  overflow: visible;
}

.settings-section :deep(.provider-actions-row.el-form-item) {
  grid-template-columns: minmax(0, 1fr) !important;
}

.settings-section :deep(.provider-actions-row .el-form-item__content) {
  margin-left: 0 !important;
}

.settings-section :deep(.provider-actions-row .el-button) {
  white-space: nowrap;
}

.ai-prov-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-quaternary);
  flex-shrink: 0;
}

.ai-prov-dot.is-active {
  background: var(--accent-blue);
  box-shadow: none;
}

.ai-prov-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.ai-prov-model {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-tertiary);
}

@media (max-width: 1100px) {
  .main-container {
    grid-template-columns: 250px minmax(0, 1fr);
    padding: 5px 0 5px 5px;
  }

  .section-title {
    font-size: 24px;
  }
}

@media (max-width: 820px) {
  .main-container {
    grid-template-columns: 1fr;
    gap: 5px;
    padding: 5px;
  }

  .sidebar-left {
    border-right: none;
    border-radius: 6px;
  }

  .content-area {
    border-radius: 6px;
  }
}

@media (max-width: 640px) {
  .header {
    min-height: 56px;
    padding: 8px;
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .settings-section-header,
  .settings-section {
    padding-left: 8px;
    padding-right: 8px;
  }

  .settings-section :deep(.el-form-item) {
    display: block;
  }

  .settings-section :deep(.el-form-item__label) {
    margin-bottom: 8px;
  }

  .settings-section :deep(.el-form-item__content) {
    width: 100%;
  }
}
</style>

