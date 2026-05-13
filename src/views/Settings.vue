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
        <el-button
          size="small"
          @click="handleSave"
          :loading="saving"
          :disabled="!manualHasChanges"
          :type="manualHasChanges ? 'primary' : 'default'"
          circle
          :title="t('settings.save')"
          class="toolbar-btn primary-when-active"
        >
          <el-icon><Check /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <aside class="sidebar-left">
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
        <GeneralSection :active="activeTab === 'general'" />
        <WorkspaceSection :active="activeTab === 'workspace'" />
        <SecuritySection :active="activeTab === 'security'" />
        <AboutSection :active="activeTab === 'about'" />
      </main>
    </div>

    <!-- 笔记迁移进度对话框（state 由 useNotesMigration 单例持有；未触发时不显示） -->
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
        <p style="color: var(--el-text-color-regular); margin-top: 12px;">{{ migrationStatus }}</p>
        <p v-if="migrateMode === 'move'" style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 8px;">
          {{ migrationProgress < 100 ? t('settings.migrationMovingHint') : t('settings.migrationMoveDone') }}
        </p>
      </div>
    </el-dialog>

    <!-- 修改主密码对话框（state 由 usePasswordSettings 单例持有） -->
    <el-dialog v-model="showChangePasswordDialog" :title="t('settings.changePwdTitle')" width="450px">
      <el-alert :title="t('settings.changePwdWarning')" type="warning" :closable="false" style="margin-bottom: 20px;">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Refresh, Setting, Folder, Lock, Bell } from '@element-plus/icons-vue'
import { t } from '@/i18n'

import { useSettingsCore } from '@/composables/settings/useSettingsCore'
import { useNotesMigration } from '@/composables/settings/useNotesMigration'
import { usePasswordSettings } from '@/composables/settings/usePasswordSettings'

import GeneralSection from './Settings/sections/GeneralSection.vue'
import WorkspaceSection from './Settings/sections/WorkspaceSection.vue'
import SecuritySection from './Settings/sections/SecuritySection.vue'
import AboutSection from './Settings/sections/AboutSection.vue'

const route = useRoute()
const router = useRouter()

const {
  saving,
  manualHasChanges,
  saveStatusText,
  saveStatusClass,
  handleSave,
  handleReset,
  bootstrap,
  setupCoreWatches,
} = useSettingsCore()

// 迁移 / 改密 dialog state（保留在主壳，供未实现的 Workspace/Security tab 之外的入口用）
const {
  showMigrationDialog,
  migrationProgress,
  migrationStatus,
  migrateMode,
} = useNotesMigration()

const {
  showChangePasswordDialog,
  oldPasswordInput,
  newPasswordInput,
  newPasswordConfirm,
  changePassword,
} = usePasswordSettings()

// ---- 菜单 / 当前 tab ----
const activeTab = ref('general')

const menuItems = computed(() => [
  { key: 'general', label: t('settings.general'), description: '窗口、外观、语言与通知', icon: Setting },
  { key: 'workspace', label: t('settings.workspace'), description: '笔记目录、Markdown 与 AI 配置', icon: Folder },
  { key: 'security', label: t('settings.security'), description: '系统权限、主密码与保护策略', icon: Lock },
  { key: 'about', label: t('settings.help'), description: '应用信息、反馈与更新支持', icon: Bell },
])

const currentMenuName = computed(() => {
  const menu = menuItems.value.find((m) => m.key === activeTab.value)
  return menu ? menu.label : t('settings.title')
})

const validTabKeys = computed(() => menuItems.value.map((item) => item.key))
const normalizeTab = (tab) => {
  if (typeof tab !== 'string' || !tab) return 'general'
  return validTabKeys.value.includes(tab) ? tab : 'general'
}

// ---- 启动：拉配置 + 挂 watcher ----
onMounted(async () => {
  await bootstrap()
  setupCoreWatches({ activeTab, normalizeTab, route, router })
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
  background:
    radial-gradient(circle at 18% 0%, var(--accent-warm-soft) 0%, transparent 38%),
    radial-gradient(circle at 85% 8%, var(--bg-secondary) 0%, transparent 34%),
    var(--surface-page);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 62px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border: none;
  border-bottom: 1px solid var(--divider);
  border-radius: 0;
  flex-shrink: 0;
  box-sizing: border-box;
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.breadcrumb :deep(.el-icon) {
  font-size: 18px;
  color: var(--accent-blue);
}

.breadcrumb-divider {
  color: var(--text-quaternary);
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  background: rgba(194, 65, 12, 0.12);
}

.toolbar-btn {
  border-radius: 6px;
  border: none;
  background: var(--bg-primary);
  box-shadow: none;
}

.toolbar-btn:hover {
  background: var(--bg-secondary);
}

.main-container {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 0;
  flex: 1;
  min-height: 0;
  margin: 14px 16px 16px;
  background: var(--bg-secondary);
  border: 1px solid #e6ecf3;
  border-radius: 18px;
  box-shadow: 0 8px 22px rgba(60, 40, 20, 0.05);
  overflow: hidden;
}

.sidebar-left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: none;
  border-right: 1px solid var(--divider);
  border-radius: 0;
  background: var(--bg-primary);
  box-shadow: none;
}

.menu-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 6px;
}

.menu-item {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
  border: none;
}

.menu-item:hover {
  background: var(--bg-secondary);
}

.menu-item.active {
  background: var(--accent-warm-soft);
  box-shadow: none;
}

.menu-active-indicator {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 20px;
  border-radius: 999px;
  background: transparent;
  pointer-events: none;
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
  background: var(--bg-secondary);
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
  border-radius: 0;
  background: var(--bg-primary);
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

/* ============================================================
 * Section 共享样式（穿透 4 个 section 子组件）
 * 来源：原 Settings.vue 单文件版的 element-plus 微调
 * ============================================================ */

.settings-section {
  padding: 6px 8px;
}

.settings-section :deep(.group-title) {
  margin: 0 0 6px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.settings-section :deep(.card-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

/* element-plus 卡片：去边框 / 去阴影 / 透明背景
   注意：全局 theme-refresh.css 与 editorial-flat.css 用 !important 给 .app-content .el-card / .el-card__header
   加了 border-bottom，这里必须用 !important 才能覆盖。 */
.settings-section :deep(.el-card) {
  margin-bottom: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: hidden;
}

.settings-section :deep(.el-card + .el-card) {
  margin-top: 18px !important;
}

.settings-section :deep(.el-card__header) {
  padding: 6px 10px 8px !important;
  border-bottom: none !important;
  background: transparent !important;
}

.settings-section :deep(.el-card__body) {
  padding: 0 10px 4px !important;
  background: transparent !important;
}

/* form-item 紧凑布局：单行 28px */
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

/* 关键：label-left form 用 grid 让 label 列宽固定、content 自适应 */
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

/* 一些 helper 列允许 stretch */
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

/* 收拢内联 width 规则：把模板里写的 px 宽度限制成 min(target, 100%) */
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

/* radio 紧凑 */
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

/* 输入框灰底 */
.settings-section :deep(.el-switch) {
  --el-switch-on-color: var(--accent-blue);
}

/* 输入框灰底
   注意：design-refresh.css 用 !important 给 .app-content .el-input__wrapper 设 box-shadow: none，
   把 element-plus 默认的 inset 1px 边框抹掉了；这里用 .settings-page-wrapper .settings-section
   提高 specificity（5 个 class），并用 inset box-shadow 重新画 1px 灰边框 + hover/focus 状态。 */
.settings-page-wrapper .settings-section :deep(.el-input__wrapper),
.settings-page-wrapper .settings-section :deep(.el-select__wrapper),
.settings-page-wrapper .settings-section :deep(.el-textarea__inner) {
  border-radius: 6px;
  border: none !important;
  background: #f7f8fa !important;
  box-shadow: 0 0 0 1px var(--divider, var(--el-border-color)) inset !important;
  transition: box-shadow var(--transition-fast);
}

.settings-page-wrapper .settings-section :deep(.el-input__wrapper:hover),
.settings-page-wrapper .settings-section :deep(.el-select__wrapper:hover),
.settings-page-wrapper .settings-section :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--text-quaternary, var(--el-text-color-placeholder)) inset !important;
}

.settings-page-wrapper .settings-section :deep(.el-input__wrapper.is-focus),
.settings-page-wrapper .settings-section :deep(.el-select__wrapper.is-focused),
.settings-page-wrapper .settings-section :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--accent-blue, var(--accent-blue)) inset !important;
}

/* 统一紧凑高度：filterable 的 el-select 在默认尺寸下 wrapper 会被 input + tag + placeholder 撑高，
   这里强制 min-height + padding，让所有 input/select 视觉一致。 */
.settings-page-wrapper .settings-section :deep(.el-input__wrapper),
.settings-page-wrapper .settings-section :deep(.el-select__wrapper) {
  min-height: 28px !important;
  padding: 0 10px !important;
}

/* size="small" 的 el-form / el-input / el-select（如 ai-provider-form 内部）更紧凑 */
.settings-page-wrapper .settings-section :deep(.el-form--small .el-input__wrapper),
.settings-page-wrapper .settings-section :deep(.el-form--small .el-select__wrapper),
.settings-page-wrapper .settings-section :deep(.el-input--small .el-input__wrapper),
.settings-page-wrapper .settings-section :deep(.el-select--small .el-select__wrapper) {
  min-height: 26px !important;
  padding: 0 8px !important;
}

/* select 内部 input / placeholder 行高对齐 wrapper
   注意：filterable 的 el-select 多渲染一个真实 <input class="el-select__input">，
   user-agent 默认给 input 加 height/padding/margin，会撑高 wrapper。
   显式压成 0 让 wrapper 的 min-height 真正生效，与普通 el-select（无 filterable）等高。 */
.settings-page-wrapper .settings-section :deep(.el-select__placeholder),
.settings-page-wrapper .settings-section :deep(.el-select__input),
.settings-page-wrapper .settings-section :deep(.el-input__inner) {
  font-size: 12px;
  line-height: 1.4;
}

.settings-page-wrapper .settings-section :deep(.el-select__input) {
  height: 22px !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 22px !important;
  font-size: 12px !important;
}

/* size="small" 下 input 跟随 element-plus 默认 20px（避免和默认 default 28px 撑出差异） */
.settings-page-wrapper .settings-section :deep(.el-form--small .el-select__input),
.settings-page-wrapper .settings-section :deep(.el-select--small .el-select__input) {
  height: 20px !important;
  line-height: 20px !important;
}

.settings-page-wrapper .settings-section :deep(.el-select__input-wrapper) {
  min-height: 0 !important;
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
}

.settings-page-wrapper .settings-section :deep(.el-select__selection) {
  min-height: 0 !important;
  padding: 0 !important;
}

/* slider 圆点居中、可见 */
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
  background: var(--bg-primary);
  box-shadow: none;
}

.settings-section :deep(.el-slider__runway) {
  margin: 10px 0;
}

/* divider / alert / descriptions */
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

/* 共享 helper 类（写在子组件 template 里） */
.settings-section :deep(.inline-control-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.settings-section :deep(.inline-control-row.wrap) {
  flex-wrap: wrap;
}

.settings-section :deep(.fill-control) {
  flex: 1;
  min-width: 0;
}

.settings-section :deep(.stacked-control-group) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.settings-section :deep(.form-hint-block) {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-tertiary);
}

.settings-section :deep(.form-hint-block.compact) {
  margin-top: 0;
}

.settings-section :deep(.control-hint) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.settings-section :deep(.control-hint-sm) {
  font-size: 11px;
  color: var(--text-quaternary);
}

.settings-section :deep(.stats-list) {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.settings-section :deep(.stats-row) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 8px;
  padding: 2px 8px;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #eef0f3;
  transition: background var(--transition-fast);
}

.settings-section :deep(.stats-row:hover) {
  background: #f7f8fa;
}

.settings-section :deep(.stats-row:last-child) {
  border-bottom: none;
}

.settings-section :deep(.stats-label) {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.settings-section :deep(.stats-value) {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

/* About / 反馈 / 更新 专属 */
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

/* AI provider 列表（WorkspaceSection） */
.settings-section :deep(.ai-provider-list) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-section :deep(.ai-provider-item) {
  border-radius: 6px;
  border: none;
  background: var(--bg-primary);
  overflow: hidden;
}

.settings-section :deep(.ai-provider-item.active) {
  background: var(--accent-warm-soft);
}

.settings-section :deep(.ai-provider-row) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
}

.settings-section :deep(.ai-provider-form) {
  padding: 0 8px 6px;
  border-top: none;
}

.settings-section :deep(.ai-prov-dot) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-quaternary);
  flex-shrink: 0;
}

.settings-section :deep(.ai-prov-dot.is-active) {
  background: var(--accent-blue);
  box-shadow: none;
}

.settings-section :deep(.ai-prov-name) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-section :deep(.ai-prov-model) {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-tertiary);
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

@media (max-width: 960px) {
  .settings-section :deep(.el-form--label-left .el-form-item) {
    grid-template-columns: 1fr;
    row-gap: 8px;
  }

  .settings-section :deep(.el-form--label-left .el-form-item__label) {
    padding-right: 0;
  }
}

@media (max-width: 1100px) {
  .main-container {
    grid-template-columns: 250px minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .main-container {
    grid-template-columns: 1fr;
  }

  .sidebar-left {
    border-right: none;
    border-bottom: 1px solid var(--divider);
    border-radius: 0;
    max-height: 240px;
  }

  .content-area {
    border-radius: 0;
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
}
</style>
