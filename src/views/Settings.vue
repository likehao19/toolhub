<template>
  <div class="settings-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon style="margin-right: 8px;"><Setting /></el-icon>
          {{ t('settings.title') }} / {{ currentMenuName }}
        </div>
      </div>
      <div class="header-actions">
        <span class="save-status" :class="saveStatusClass">{{ saveStatusText }}</span>
        <!-- 操作按钮组 -->
        <el-button size="small" @click="handleSave" :loading="saving" :disabled="!manualHasChanges" :type="manualHasChanges ? 'primary' : 'default'" circle :title="t('settings.save')">
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button size="small" @click="handleReset" circle :title="t('settings.reset')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧菜单栏 -->
      <aside class="sidebar-left">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">{{ t('settings.title') }}</span>
        </div>

        <div class="menu-list">
          <div
            v-for="menu in menuItems"
            :key="menu.key"
            class="menu-item"
            :class="{ active: activeTab === menu.key }"
            @click="activeTab = menu.key"
          >
            <el-icon class="menu-icon">
              <component :is="menu.icon" />
            </el-icon>
            <span class="menu-name">{{ menu.label }}</span>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content-area">
        <!-- 通用设置 -->
        <div v-show="activeTab === 'general'" class="settings-section">
          <h3 class="section-title">{{ t('settings.general') }}</h3>

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

              <el-form-item :label="t('settings.fontSize')">
                <el-slider
                  v-model="settings.fontSize"
                  :min="12"
                  :max="20"
                  :step="1"
                  show-stops
                  style="width: 300px"
                  @change="applyFontSize"
                />
                <span style="margin-left: 10px">{{ settings.fontSize }}px</span>
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

          <!-- 通知与提醒 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">{{ t('settings.notifications') }}</div>
            </template>
            <el-alert
              :title="t('settings.notifDesc')"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              <p style="margin: 8px 0;">📋 {{ t('settings.notifTodoHint') }}</p>
              <p style="margin: 8px 0;">📅 {{ t('settings.notifCalendarHint') }}</p>
              <p style="margin: 8px 0;">{{ t('settings.notifOnlyDisplay') }}</p>
            </el-alert>
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

        <!-- 工作空间 -->
        <div v-show="activeTab === 'workspace'" class="settings-section">
          <h3 class="section-title">{{ t('settings.workspace') }}</h3>

          <!-- 笔记设置 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">{{ t('settings.notesSettings') }}</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-form-item :label="t('settings.storagePath')">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <el-input v-model="settings.notesStoragePath" readonly style="flex: 1;" />
                  <el-button @click="selectNotesStoragePath">{{ t('settings.changeBtn') }}</el-button>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  {{ t('settings.storagePathHint') }}
                </div>
              </el-form-item>

              <el-form-item :label="t('settings.storageUsage')">
                <el-descriptions :column="1" border>
                  <el-descriptions-item :label="t('settings.notesSize')">
                    {{ formatFileSize(storageStats.notesSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.databaseSize')">
                    {{ formatFileSize(storageStats.databaseSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.mediaSize')">
                    {{ formatFileSize(storageStats.mediaSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.totalSize')">
                    {{ formatFileSize(storageStats.totalSize) }}
                  </el-descriptions-item>
                </el-descriptions>
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
                <el-select v-model="settings.previewTheme" style="width: 300px">
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
                <el-select v-model="settings.previewCodeTheme" style="width: 300px">
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
                <el-select v-model="settings.editorPreviewTheme" style="width: 300px">
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
                <el-select v-model="settings.editorCodeTheme" style="width: 300px">
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

          <!-- AI 助手配置 -->
          <el-card shadow="never">
            <template #header>
              <div class="card-header">{{ t('settings.aiConfig') }}</div>
            </template>
            <el-form :model="aiSettings" label-width="140px" label-position="left">
              <el-form-item :label="t('settings.apiUrl')">
                <el-input
                  v-model="aiSettings.baseUrl"
                  :placeholder="t('settings.apiUrlPlaceholder')"
                  style="width: 400px;"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.apiUrlHint') }}
                </div>
              </el-form-item>

              <el-form-item :label="t('settings.apiKey')">
                <el-input
                  v-model="aiSettings.apiKey"
                  type="password"
                  show-password
                  :placeholder="t('settings.apiKeyPlaceholder')"
                  style="width: 400px;"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  OpenAI 兼容接口地址，支持第三方服务（如 DeepSeek、通义千问等）
                </div>
              </el-form-item>

              <el-form-item :label="t('settings.model')">
                <el-input
                  v-model="aiSettings.model"
                  :placeholder="t('settings.modelPlaceholder')"
                  style="width: 400px;"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.modelHint') }}
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="testAIConnection" :loading="testingAI">
                  {{ t('settings.testConnection') }}
                </el-button>
              </el-form-item>

              <el-alert
                v-if="aiTestResult"
                :title="aiTestResult.success ? t('settings.connectSuccess') : t('settings.connectFailed')"
                :type="aiTestResult.success ? 'success' : 'error'"
                :description="aiTestResult.message"
                :closable="false"
                style="margin-top: 16px;"
              />
            </el-form>
          </el-card>
        </div>

        <!-- 安全与数据 -->
        <div v-show="activeTab === 'security'" class="settings-section">
          <h3 class="section-title">{{ t('settings.security') }}</h3>

          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">{{ t('settings.systemPrivilegeTitle') }}</div>
            </template>
            <el-form label-width="150px" label-position="left">
              <el-form-item :label="t('settings.sdkEnvScopeTitle')">
                <el-radio-group v-model="systemPrivilege.envScope" @change="handleEnvScopeSettingChange" size="small">
                  <el-radio value="system">{{ t('settings.sdkEnvScopeSystem') }}</el-radio>
                  <el-radio value="user">{{ t('settings.sdkEnvScopeUser') }}</el-radio>
                </el-radio-group>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.sdkEnvScopeDesc') }}
                </div>
              </el-form-item>

              <el-form-item :label="t('settings.systemPrivilegeStatus')">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
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
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.systemPrivilegeHint') }}
                </div>
                <div v-if="systemPrivilege.envScope === 'system'" style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.systemPrivilegeScopeHint') }}
                </div>
                <div v-else style="font-size: 12px; color: #909399; margin-top: 4px;">
                  {{ t('settings.sdkEnvScopeUserHint') }}
                </div>
              </el-form-item>

              <el-form-item v-if="systemPrivilege.envScope === 'system' && !systemPrivilege.authorized" :label="t('settings.systemPrivilegeActionTitle')">
                <div style="font-size: 12px; color: #909399;">
                  {{ t('settings.systemPrivilegeActionDesc') }}
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 密码管理 -->
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
                <el-descriptions :column="1" border>
                  <el-descriptions-item :label="t('settings.pwdCount')">
                    {{ passwordStats.totalPasswords }} {{ t('common.unit') }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.historyCount')">
                    {{ passwordStats.historyCount }} {{ t('common.entries') }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.recycleBin')">
                    {{ passwordStats.recycleBinCount }} {{ t('common.unit') }}
                  </el-descriptions-item>
                  <el-descriptions-item :label="t('settings.masterPwdStatus')">
                    {{ passwordStats.hasMasterPassword ? t('settings.masterPwdSet') : t('settings.masterPwdNotSet') }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 帮助与反馈 -->
        <div v-show="activeTab === 'about'" class="settings-section">
          <h3 class="section-title">{{ t('settings.help') }}</h3>

          <!-- 关于应用 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">{{ t('settings.aboutApp') }}</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item :label="t('settings.appNameLabel')">{{ t('settings.appName') }}</el-descriptions-item>
              <el-descriptions-item :label="t('settings.version')">v1.0.0</el-descriptions-item>
              <el-descriptions-item :label="t('settings.buildTime')">2026-02-01</el-descriptions-item>
              <el-descriptions-item :label="t('settings.techStack')">Vue 3 + Tauri</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 帮助与支持 -->
          <el-card shadow="never">
            <template #header>
              <div class="card-header">{{ t('settings.helpSupport') }}</div>
            </template>
            <el-form label-width="100px">
              <el-form-item :label="t('settings.feedbackContent')">
                <el-input
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
                  v-model="feedbackContact"
                  :placeholder="t('settings.feedbackContactPlaceholder')"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitFeedback" :loading="submittingFeedback">
                  {{ t('settings.submitFeedback') }}
                </el-button>
                <el-button @click="clearFeedback">{{ t('settings.clearBtn') }}</el-button>
              </el-form-item>
              <el-divider />
              <el-form-item :label="t('settings.softwareUpdate')">
                <el-button @click="checkUpdate" :loading="checkingUpdate">
                  <el-icon><Refresh /></el-icon>
                  {{ t('settings.checkUpdate') }}
                </el-button>
                <span v-if="updateInfo" style="margin-left: 12px; color: #67c23a;">
                  {{ updateInfo }}
                </span>
              </el-form-item>
              <el-divider />
              <el-form-item>
                <el-button type="danger" @click="handleReset">
                  {{ t('settings.resetAppSettings') }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </main>
    </div>

    <!-- 笔记迁移进度对话框 -->
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

    <!-- 修改密码对话框 -->
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
import { Check, Refresh, Setting, Brush, Folder, Lock, Bell } from '@element-plus/icons-vue'
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
import { useAppStore } from '@/store/app'
import { getPrivilegeStatus, ensureSystemPrivilege } from '@/utils/systemPrivilegeManager'
import { getEnvScope, setEnvScope } from '@/utils/sdkManager'
import { useRoute, useRouter } from 'vue-router'

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref('general')
const saving = ref(false)
const autostartLoading = ref(false)
const testingAI = ref(false)
const aiTestResult = ref(null)
const originalSettings = ref(null)
const savedAiSettings = ref(null)
const savedAiAssistantSettings = ref(null)
const savedReminderConfig = ref(null)
const savedPasswordSettings = ref(null)
const autoSaving = ref(false)

// 反馈相关
const feedbackContent = ref('')
const feedbackContact = ref('')
const submittingFeedback = ref(false)

// 更新相关
const checkingUpdate = ref(false)
const updateInfo = ref('')
const hasChanges = ref(false)
const manualHasChanges = ref(false)
const configPath = ref('')
const lastSaved = ref('')

// 菜单项
const menuItems = computed(() => [
  { key: 'general', label: t('settings.general'), icon: Setting },
  { key: 'workspace', label: t('settings.workspace'), icon: Folder },
  { key: 'security', label: t('settings.security'), icon: Lock },
  { key: 'about', label: t('settings.help'), icon: Bell }
])

// 当前菜单名称
const currentMenuName = computed(() => {
  const menu = menuItems.value.find(m => m.key === activeTab.value)
  return menu ? menu.label : t('settings.title')
})

const saveStatusText = computed(() => {
  if (saving.value || autoSaving.value) return t('settings.statusSaving')
  if (manualHasChanges.value) return t('settings.statusUnsaved')
  if (lastSaved.value) return `${t('settings.statusSaved')} · ${lastSaved.value}`
  return t('settings.statusIdle')
})

const saveStatusClass = computed(() => {
  if (saving.value || autoSaving.value) return 'saving'
  if (manualHasChanges.value) return 'unsaved'
  if (lastSaved.value) return 'saved'
  return 'idle'
})

const formatSavedTime = () => new Date().toLocaleTimeString('zh-CN', {
  hour: '2-digit',
  minute: '2-digit'
})

// 设置数据
const settings = reactive({
  closeAction: 'ask',
  autoStart: false,
  language: 'zh-CN',
  theme: 'auto',
  fontSize: 14,
  fontFamily: 'system',
  enableAnimations: true,
  notesStoragePath: '',
  // Markdown 主题设置
  previewTheme: 'mk-cute',
  previewCodeTheme: 'github',
  editorPreviewTheme: 'mk-cute',
  editorCodeTheme: 'github'
})

// AI 设置
const aiSettings = reactive({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo'
})

// AI 助手悬浮球设置
const aiAssistantSettings = reactive({
  enableFloatingBall: false,
  floatingBallMode: 'inApp', // 'inApp' 或 'desktop'
  floatingBallStyle: 'circle', // 'circle', 'rounded', 'capsule'
  floatingBallSize: 60
})

// 存储统计
const storageStats = reactive({
  notesSize: 0,
  databaseSize: 0,
  mediaSize: 0,
  totalSize: 0
})

// 加载统计状态
const loadingStats = ref(false)

// 密码管理设置
const passwordSettings = reactive({
  requirePasswordOnStart: true,
  autoLockTime: 15
})

// 密码库统计
const passwordStats = reactive({
  totalPasswords: 0,
  historyCount: 0,
  recycleBinCount: 0,
  hasMasterPassword: false
})

// 修改密码相关
const showChangePasswordDialog = ref(false)
const oldPasswordInput = ref('')
const newPasswordInput = ref('')
const newPasswordConfirm = ref('')

// 系统权限
const systemPrivilege = reactive({
  authorized: false,
  checking: false,
  authorizing: false,
  envScope: getEnvScope(),
})

// 提醒设置
const reminderConfig = reactive({
  position: 'bottomRight',
  positionType: 'screen'
})

// 迁移进度
const showMigrationDialog = ref(false)
const migrationProgress = ref(0)
const migrationStatus = ref('')
const migrateMode = ref('move') // 'move' 或 'copy'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 应用主题
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme-setting', theme)
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// 应用字体大小
const applyFontSize = (size) => {
  const base = Number(size) || 14
  const root = document.documentElement
  root.style.setProperty('--font-size-caption2', `${base - 3}px`)
  root.style.setProperty('--font-size-caption',  `${base - 2}px`)
  root.style.setProperty('--font-size-footnote', `${base - 1}px`)
  root.style.setProperty('--font-size-body',     `${base}px`)
  root.style.setProperty('--font-size-callout',  `${base + 1}px`)
  root.style.setProperty('--font-size-headline', `${base + 2}px`)
  root.style.setProperty('--font-size-title3',   `${base + 4}px`)
  root.style.setProperty('--font-size-title2',   `${base + 8}px`)
  root.style.setProperty('--font-size-title1',   `${base + 12}px`)
  root.style.setProperty('--font-size-large',    `${base + 18}px`)
}

// 应用字体家族
const applyFontFamily = (family) => {
  const root = document.documentElement
  if (!family || family === 'system') {
    root.style.removeProperty('--font-family')
  } else {
    root.style.setProperty('--font-family', `"${family}", "PingFang SC", sans-serif`)
  }
}

// 应用动画设置
const applyAnimations = (enabled) => {
  if (enabled) {
    document.documentElement.classList.remove('no-animations')
  } else {
    document.documentElement.classList.add('no-animations')
  }
}

// 切换语言
const handleLanguageChange = (lang) => {
  setLocale(lang)
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
  if (saving.value || autoSaving.value) return false

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
    localStorage.setItem('ai_config', JSON.stringify({
      apiKey: aiSettings.apiKey,
      baseURL: aiSettings.baseUrl,
      model: aiSettings.model
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
    applyTheme(settings.theme)
    applyFontSize(settings.fontSize)
    applyFontFamily(settings.fontFamily)
    applyAnimations(settings.enableAnimations)
    setLocale(settings.language)
    ElMessage.error(t('settings.saveFailed'))
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
  await autoSaveWithSideEffect(() => applyTheme(theme))
}

const handleFontFamilyChange = async (family) => {
  await autoSaveWithSideEffect(() => applyFontFamily(family))
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
 * 加载配置
 */
const loadSettings = async () => {
  try {
    const config = await loadConfig()

    // 更新设置
    if (config) {
      Object.assign(settings, config)
      if (config.aiSettings) {
        Object.assign(aiSettings, config.aiSettings)
      }
      if (config.aiAssistantSettings) {
        Object.assign(aiAssistantSettings, config.aiAssistantSettings)
      }

      applyAnimations(config.enableAnimations !== false)

      // 同步窗口关闭行为到 store
      if (config.closeAction) {
        appStore.setCloseAction(config.closeAction)
      }
    }

    // 检查自动启动状态
    try {
      const autostartEnabled = await TauriAutostart.checkAutostart()
      settings.autoStart = autostartEnabled
    } catch (e) { /* ignore */ }

    // 加载笔记存储路径
    if (!settings.notesStoragePath) {
      const dataDir = await appDataDir()
      settings.notesStoragePath = await join(dataDir, 'notes')

    }

    // 加载存储统计
    await loadStorageStats()

    // 保存原始设置用于比较
    syncSavedSnapshots()
  } catch (e) { /* ignore */ }
}

/**
 * 处理自动启动状态变化
 */
/**
 * 保存配置
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
 * 选择笔记存储路径
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

      // 询问用户迁移模式
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

        // 用户选择移动
        migrateMode.value = 'move'
        await performMigration(oldPath, selected)
      } catch (action) {
        if (action === 'cancel') {
          // 用户选择复制
          migrateMode.value = 'copy'
          await performMigration(oldPath, selected)
        } else if (action === 'close') {
          // 显示"仅更改路径"确认
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

            // 仅更改路径
            settings.notesStoragePath = selected
            const { resetNotesDir } = await import('@/utils/notes')
            resetNotesDir()
            await handleSave()
            ElMessage.warning(t('settings.migrateOnlyPathDone'))
          } catch {
            // 用户取消了"仅更改路径"
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
 * 执行迁移操作
 */
const performMigration = async (oldPath, newPath) => {
  showMigrationDialog.value = true
  migrationProgress.value = 0
  migrationStatus.value = t('settings.migratePreparing')

  try {
    await migrateNotes(oldPath, newPath)
    settings.notesStoragePath = newPath

    // 重置笔记目录缓存
    const { resetNotesDir } = await import('@/utils/notes')
    resetNotesDir()

    // 自动保存配置
    await handleSave()

    // 触发全局事件，通知其他组件笔记路径已更改
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
 * 迁移笔记文件
 */
const migrateNotes = async (oldPath, newPath) => {
  const { readDir, exists, mkdir, copyFile, remove } = await import('@tauri-apps/plugin-fs')
  const { join, sep } = await import('@tauri-apps/api/path')

  migrationStatus.value = t('settings.migrateCheckSource')

  // 检查旧路径是否存在
  if (!(await exists(oldPath))) {
    throw new Error(t('settings.migrateSourceNotExist'))
  }

  // 确保新路径存在
  if (!(await exists(newPath))) {
    await mkdir(newPath, { recursive: true })
  }

  // 获取所有文件列表
  migrationStatus.value = t('settings.migrateScanFiles')
  const allFiles = await getAllFiles(oldPath, oldPath)

  if (allFiles.length === 0) {
    migrationProgress.value = 100
    migrationStatus.value = t('settings.migrateNoFiles')
    return
  }

  // 复制文件
  let processedFiles = 0
  const copiedFiles = []

  for (const file of allFiles) {
    const relativePath = file.replace(oldPath, '').replace(/^[/\\]/, '')
    const targetPath = await join(newPath, relativePath)

    // 确保目标目录存在
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf(sep()))
    if (!(await exists(targetDir))) {
      await mkdir(targetDir, { recursive: true })
    }

    // 复制文件
    migrationStatus.value = migrateMode.value === 'move'
      ? t('settings.migrateMoving', { file: relativePath })
      : t('settings.migrateCopying', { file: relativePath })
    await copyFile(file, targetPath)
    copiedFiles.push(file)

    processedFiles++
    migrationProgress.value = Math.round((processedFiles / allFiles.length) * 100)
  }

  // 如果是移动模式，删除源文件
  if (migrateMode.value === 'move') {
    migrationStatus.value = t('settings.migrateCleanSource')

    // 删除所有已复制的文件
    for (const file of copiedFiles) {
      try {
        await remove(file)
      } catch (e) { /* ignore */ }
    }

    // 尝试删除空目录（从深层到浅层）
    try {
      await removeEmptyDirs(oldPath)
    } catch (e) { /* ignore */ }

    migrationStatus.value = t('settings.migrateMoveComplete', { count: processedFiles })
  } else {
    migrationStatus.value = t('settings.migrateCopyComplete', { count: processedFiles })
  }
}

/**
 * 删除空目录（递归）
 */
const removeEmptyDirs = async (dir) => {
  const { readDir, remove } = await import('@tauri-apps/plugin-fs')

  try {
    const entries = await readDir(dir)

    // 如果目录为空，删除它
    if (entries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }

    // 递归处理子目录
    for (const entry of entries) {
      if (entry.isDirectory) {
        const { join } = await import('@tauri-apps/api/path')
        const subDir = await join(dir, entry.name)
        await removeEmptyDirs(subDir)
      }
    }

    // 再次检查当前目录是否为空
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
 * 递归获取所有文件
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
        // 递归获取子目录文件
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
 * 测试 AI 连接
 */
const testAIConnection = async () => {
  if (!aiSettings.apiKey || !aiSettings.baseUrl || !aiSettings.model) {
    aiTestResult.value = {
      success: false,
      message: t('settings.fillApiFields')
    }
    return
  }

  if (!aiSettings.baseUrl) {
    ElMessage.warning('请先输入 API 地址')
    return
  }

  if (!aiSettings.model) {
    ElMessage.warning('请先输入模型名称')
    return
  }

  testingAI.value = true
  aiTestResult.value = null

  try {
    let baseUrl = aiSettings.baseUrl.trim()
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSettings.apiKey}`
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })

    if (response.ok) {
      const text = await response.text()
      const data = JSON.parse(text)
      if (data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        aiTestResult.value = {
          success: true,
          message: t('settings.aiConnectSuccess', { model: aiSettings.model })
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
 * 加载存储统计
 */
const loadStorageStats = async () => {
  loadingStats.value = true
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
    const { join, appDataDir } = await import('@tauri-apps/api/path')

    // 计算笔记文件大小
    const notesDir = await getNotesDir()
    storageStats.notesSize = await calculateDirectorySize(notesDir)

    // 计算数据库文件大小
    const appDir = await appDataDir()
    const dbPath = await join(appDir, 'productivity.db')
    if (await exists(dbPath)) {
      const dbStat = await stat(dbPath)
      storageStats.databaseSize = dbStat.size || 0
    } else {
      storageStats.databaseSize = 0
    }

    // 计算媒体文件大小（images, videos 文件夹）
    let mediaSize = 0
    const imagesPath = await join(notesDir, 'images')
    if (await exists(imagesPath)) {
      mediaSize += await calculateDirectorySize(imagesPath)
    }

    // 遍历所有笔记文件夹，计算其中的 images 和 videos 子文件夹
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

    // ElMessage.success('存储统计已更新') // 已移除提示，避免重复弹出
  } catch (error) {
    ElMessage.error(t('settings.loadStatsFailed', { msg: error.message }))
  } finally {
    loadingStats.value = false
  }
}

/**
 * 递归计算目录大小
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
          // 递归计算子目录大小
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
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 加载密码设置
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
 * 保存密码设置
 */
const savePasswordSettings = async () => {
  try {
    const db = await getDatabase()
    await db.execute(
      'UPDATE master_password SET require_password_on_start = ? WHERE id = 1',
      [passwordSettings.requirePasswordOnStart ? 1 : 0]
    )
    // 移除单独的成功提示，由 handleSave 统一提示
  } catch (error) {

    throw error // 抛出错误让 handleSave 处理
  }
}

/**
 * 加载密码库统计
 */
const loadPasswordStats = async () => {
  try {
    const db = await getDatabase()

    // 统计密码数量
    const passwords = await db.select('SELECT COUNT(*) as count FROM passwords WHERE is_deleted = 0 OR is_deleted IS NULL')
    passwordStats.totalPasswords = passwords[0]?.count || 0

    // 统计历史记录
    const history = await db.select('SELECT COUNT(*) as count FROM password_history')
    passwordStats.historyCount = history[0]?.count || 0

    // 统计回收站
    const recycleBin = await db.select('SELECT COUNT(*) as count FROM password_recycle_bin')
    passwordStats.recycleBinCount = recycleBin[0]?.count || 0

    // 检查主密码
    const masterPassword = await db.select('SELECT COUNT(*) as count FROM master_password')
    passwordStats.hasMasterPassword = (masterPassword[0]?.count || 0) > 0
  } catch (e) { /* ignore */ }
}

/**
 * 修改主密码
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

    // 验证旧密码
    const { password_hash, salt } = result[0]
    const isValid = verifyPassword(oldPasswordInput.value, password_hash, salt)

    if (!isValid) {
      ElMessage.error(t('settings.oldPwdWrong'))
      return
    }

    // 生成新密码哈希
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
 * 重置配置
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

    await resetConfig()
    window.dispatchEvent(new CustomEvent('settings-reset'))
    await loadSettings()
  } catch (error) {
    if (error !== 'cancel') {

    }
  }
}

/**
 * 加载提醒设置
 */
/**
 * 加载提醒设置
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
 * 测试通知
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
    // 测试通知发送失败静默处理
  }
}

/**
 * 提交反馈
 */
const submitFeedback = async () => {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning(t('settings.fillFeedback'))
    return
  }

  submittingFeedback.value = true
  try {
    const db = await Database.load('sqlite:app.db')

    // 确保反馈表存在
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
 * 清空反馈表单
 */
const clearFeedback = () => {
  feedbackContent.value = ''
  feedbackContact.value = ''
}

/**
 * 处理悬浮球开关切换
 */
const handleFloatingBallToggle = (enabled) => {
  // 保存配置到 localStorage（供实时预览使用）
  localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

  // 发送全局事件通知应用更新悬浮球状态
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
    if (!autoSaving.value) {
      hasChanges.value = true
    }
  },
  { deep: true }
)

watch(
  () => [
    aiSettings.baseUrl,
    aiSettings.apiKey,
    aiSettings.model,
    settings.fontSize,
  ],
  () => {
    hasChanges.value = true
    manualHasChanges.value = true
  },
  { deep: true }
)

watch(
  () => [
    settings.notesStoragePath,
  ],
  () => {
    hasChanges.value = true
    manualHasChanges.value = true
  }
)

watch(
  () => aiAssistantSettings.floatingBallSize,
  () => {
    hasChanges.value = true
    manualHasChanges.value = true
  }
)

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && tab) {
      activeTab.value = tab
    }
  },
  { immediate: true }
)

watch(activeTab, (tab) => {
  const nextQuery = { ...route.query }
  if (tab === 'general') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = tab
  }
  router.replace({ query: nextQuery })
})

/**
 * 处理悬浮球配置变化（位置、样式、大小）
 */
const handleFloatingBallChange = () => {
  // 保存配置到 localStorage（供实时预览使用）
  localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

  // 发送全局事件通知应用更新悬浮球状态
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
 * 检查更新
 */
const checkUpdate = async () => {
  checkingUpdate.value = true
  updateInfo.value = ''

  try {
    // 模拟检查更新（实际应该调用 Tauri 更新 API）
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 这里可以集成 Tauri 的更新功能
    // 目前显示当前已是最新版本
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

// 组件挂载时加载配置
onMounted(async () => {
  await loadSettings() // loadSettings 内部已经调用了 loadStorageStats
  await loadPasswordSettings()
  await loadPasswordStats()
  await loadReminderSettings()
  await loadSystemPrivilegeStatus()
  // await loadStorageStats() // 已在 loadSettings 中调用，避免重复

  // 加载配置路径
  try {
    const dataDir = await appDataDir()
    configPath.value = await join(dataDir, 'config.json')
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.settings-page-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-family);
  color: var(--text-primary);
  background-color: var(--bg-grouped);
  height: 100%;
  width: 100%;
}

/* 顶部导航 */
.header {
  height: 50px;
  background-color: var(--bg-primary);
  border-bottom: 0.5px solid var(--border-color-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.breadcrumb {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.save-status {
  font-size: 12px;
  transition: color var(--transition-fast);
  user-select: none;
}

.save-status.idle {
  color: var(--text-quaternary);
}

.save-status.saved {
  color: #67c23a;
}

.save-status.unsaved {
  color: #e6a23c;
  font-weight: 500;
}

.save-status.saving {
  color: var(--accent-blue);
}

/* 主容器 */
.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* 左侧设置菜单 */
.sidebar-left {
  width: 200px;
  min-width: 200px;
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-right: 0.5px solid var(--border-color);
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
  padding: var(--space-sm);
}

.sidebar-toolbar {
  padding: var(--space-sm) var(--space-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-xs);
  margin: 0;
  min-height: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 10px;
  margin: 1px 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  font-size: var(--font-size-footnote);
  color: var(--text-primary);
  position: relative;
}

.menu-item:hover {
  background-color: var(--bg-tertiary);
}

.menu-item.active {
  background-color: var(--accent-blue-bg);
  color: var(--accent-blue);
  font-weight: var(--font-weight-medium);
}

.menu-icon {
  font-size: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.menu-item.active .menu-icon {
  color: var(--accent-blue);
}

.menu-name {
  flex: 1;
  font-size: var(--font-size-footnote);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧内容区域 */
.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bg-grouped);
  padding: var(--space-xl);
}

/* 设置区块 */
.settings-section {
  max-width: 680px;
  margin: 0 auto;
}

.section-title {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-xl);
}

/* 设置分组卡片 */
.settings-section :deep(.el-card) {
  border-radius: var(--radius-lg);
  border: 0.5px solid var(--border-color);
  box-shadow: none;
}

.card-header {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

/* 表单行 */
.settings-section :deep(.el-form-item) {
  margin-bottom: var(--space-lg);
  border-bottom: 0.5px solid var(--divider);
  padding-bottom: var(--space-lg);
}

.settings-section :deep(.el-form-item:last-child) {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
</style>
