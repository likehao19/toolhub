<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Pinia Store 演示</span>
      </div>
    </template>
    <div class="store-content">
      <p>
        当前主题:
        <el-tag :type="theme === 'dark' ? 'info' : 'success'">{{ theme }}</el-tag>
      </p>
      <p>
        侧边栏状态:
        <el-tag :type="sidebarCollapsed ? 'warning' : 'success'">
          {{ sidebarCollapsed ? '已折叠' : '已展开' }}
        </el-tag>
      </p>
      <div class="store-actions">
        <el-button @click="toggleTheme" type="primary">
          {{ theme === 'dark' ? '☀️ 切换到亮色' : '🌙 切换到暗色' }}
        </el-button>
        <el-button @click="toggleSidebar" type="success">
          {{ sidebarCollapsed ? '📖 展开侧边栏' : '📕 折叠侧边栏' }}
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { useSettings } from '@/composables'

const { theme, sidebarCollapsed, toggleTheme, toggleSidebar } = useSettings()
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

.store-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
