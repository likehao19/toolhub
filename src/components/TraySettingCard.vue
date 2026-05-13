<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>系统托盘演示</span>
      </div>
    </template>
    <div class="store-content">
      <p>系统托盘功能已启用，您可以：</p>
      <ul class="feature-list">
        <li>单击托盘图标切换窗口显示/隐藏</li>
        <li>右键托盘图标打开菜单</li>
        <li>点击关闭按钮时会弹出确认对话框</li>
      </ul>

      <el-divider />

      <div class="settings-section">
        <h4>关闭行为设置</h4>
        <el-radio-group :model-value="closeAction" @change="changeCloseAction">
          <el-radio value="ask">每次询问</el-radio>
          <el-radio value="minimize">最小化到托盘</el-radio>
          <el-radio value="exit">直接退出</el-radio>
        </el-radio-group>
        <p class="current-setting">
          当前设置: <el-tag size="small">{{ getCloseActionText(closeAction) }}</el-tag>
        </p>
      </div>

      <el-divider />

      <div class="store-actions">
        <el-button @click="hideToTray" type="warning">📥 最小化到托盘</el-button>
        <el-button @click="showWindow" type="success">📤 显示窗口</el-button>
        <el-button @click="resetSettings" type="info">🔄 重置设置</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { useSettings } from '@/composables'
import { useWindow } from '@/composables'

const {
  closeAction,
  changeCloseAction,
  resetSettings,
  getCloseActionText,
} = useSettings()

const { hideToTray, showWindow } = useWindow()
</script>

<style scoped>
.card-header {
  font-weight: 600;
}

.store-content {
  padding: 10px 0;
}

.store-content p {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.feature-list {
  padding-left: 20px;
  margin: 10px 0;
}

.settings-section {
  padding: 16px 0;
}

.settings-section h4 {
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 1rem;
}

.settings-section .el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-setting {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.store-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
