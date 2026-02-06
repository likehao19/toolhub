<template>
  <div class="features-grid">
    <el-card
      v-for="(feature, index) in features"
      :key="index"
      class="feature-card"
      shadow="hover"
    >
      <template #header>
        <div class="card-header">
          <span>{{ feature.title }}</span>
        </div>
      </template>
      <p>{{ feature.description }}</p>
    </el-card>
  </div>
</template>

<script setup>
import { FEATURES } from '@/constants'

const features = FEATURES
</script>

<style scoped>
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.feature-card {
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
}

.card-header {
  font-weight: 600;
  font-size: 0.95rem;
}

.feature-card :deep(.el-card__body) {
  padding: 12px;
  font-size: 0.85rem;
}

.feature-card :deep(.el-card__header) {
  padding: 12px;
}
</style>
