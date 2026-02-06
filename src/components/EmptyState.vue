<template>
  <div class="empty-state">
    <div class="empty-icon">
      <slot name="icon">
        <span class="icon-emoji">{{ icon }}</span>
      </slot>
    </div>
    <div class="empty-title">{{ title }}</div>
    <div class="empty-description" v-if="description">{{ description }}</div>
    <div class="empty-actions" v-if="$slots.actions || actionText">
      <slot name="actions">
        <el-button v-if="actionText" type="primary" @click="$emit('action')">
          {{ actionText }}
        </el-button>
      </slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 300px;
}

.empty-icon {
  margin-bottom: 24px;
}

.icon-emoji {
  font-size: 80px;
  opacity: 0.6;
  display: block;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.empty-description {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 24px;
  max-width: 400px;
  line-height: 1.6;
}

.empty-actions {
  margin-top: 8px;
}
</style>

