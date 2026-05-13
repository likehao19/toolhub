<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>🪟 子窗口管理</span>
      </div>
    </template>
    <div class="store-content">
      <p>创建多个子窗口来浏览不同的网站：</p>
      <div class="input-section">
        <el-input
          v-model="childWindowUrl"
          placeholder="请输入网站URL，例如: https://www.baidu.com"
          clearable
        >
          <template #prepend>URL</template>
        </el-input>
        <el-button
          @click="createChildWindow"
          type="primary"
          :loading="creatingWindow"
          class="create-button"
        >
          🚀 打开新窗口
        </el-button>
      </div>
      <el-divider />
      <div class="tips">
        <p>💡 提示：</p>
        <ul>
          <li>主程序只能启动一次（单实例）</li>
          <li>可以创建多个子窗口</li>
          <li>关闭主窗口会关闭所有子窗口</li>
          <li>子窗口可以独立关闭</li>
        </ul>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { useWindow } from '@/composables'

const { childWindowUrl, creatingWindow, createChildWindow } = useWindow()
</script>

<style scoped>
.card-header {
  font-weight: 600;
}

.store-content {
  padding: 10px 0;
}

.store-content > p {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.input-section {
  margin-top: 16px;
}

.input-section .el-input {
  margin-bottom: 12px;
}

.create-button {
  width: 100%;
}

.tips {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.tips ul {
  padding-left: 20px;
  margin: 8px 0;
}
</style>
