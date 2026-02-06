<template>
  <div class="skeleton-loader" v-if="loading">
    <!-- 列表骨架屏 -->
    <div v-if="type === 'list'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-item">
        <div class="skeleton-avatar" v-if="showAvatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line" :style="{ width: titleWidth }"></div>
          <div class="skeleton-line" :style="{ width: contentWidth }"></div>
        </div>
      </div>
    </div>

    <!-- 卡片骨架屏 -->
    <div v-else-if="type === 'card'" class="skeleton-cards">
      <div v-for="i in count" :key="i" class="skeleton-card">
        <div class="skeleton-line" :style="{ width: '60%' }"></div>
        <div class="skeleton-line" :style="{ width: '80%' }"></div>
        <div class="skeleton-line" :style="{ width: '40%' }"></div>
      </div>
    </div>

    <!-- 表格骨架屏 -->
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div v-for="i in rows" :key="i" class="skeleton-row">
        <div v-for="j in columns" :key="j" class="skeleton-cell"></div>
      </div>
    </div>

    <!-- 文本骨架屏 -->
    <div v-else class="skeleton-text">
      <div v-for="i in count" :key="i" class="skeleton-line" :style="{ width: lineWidths[i - 1] || '100%' }"></div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: true },
  type: { type: String, default: 'text' }, // list, card, table, text
  count: { type: Number, default: 3 },
  rows: { type: Number, default: 5 },
  columns: { type: Number, default: 4 },
  showAvatar: { type: Boolean, default: false },
  titleWidth: { type: String, default: '60%' },
  contentWidth: { type: String, default: '80%' },
  lineWidths: { type: Array, default: () => ['100%', '90%', '95%', '85%'] }
})
</script>

<style scoped>
.skeleton-loader {
  padding: 16px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--el-skeleton-color);
  margin-right: 12px;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 16px;
  background: var(--el-skeleton-color);
  border-radius: 4px;
  margin-bottom: 8px;
  animation: skeleton-loading 1.4s ease-in-out infinite;
}

.skeleton-line:last-child {
  margin-bottom: 0;
}

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.skeleton-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.skeleton-table {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

.skeleton-row {
  display: flex;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.skeleton-row:last-child {
  border-bottom: none;
}

.skeleton-cell {
  flex: 1;
  height: 48px;
  background: var(--el-skeleton-color);
  border-right: 1px solid var(--el-border-color-lighter);
  animation: skeleton-loading 1.4s ease-in-out infinite;
}

.skeleton-cell:last-child {
  border-right: none;
}

.skeleton-text {
  padding: 8px 0;
}

@keyframes skeleton-loading {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
</style>

