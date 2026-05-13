<template>
  <div class="home-page">
    <!-- 欢迎区域 -->
    <div class="hero-section">
      <h1 class="hero-title">
        <span class="hero-icon">⚡</span>
        Tauri Components
      </h1>
      <p class="hero-subtitle">Vue3 + Tauri2 + Vite 桌面应用组件库</p>
      <p class="hero-description">
        一个功能完整、开箱即用的现代桌面应用开发框架，提供丰富的 Tauri API 封装和组件示例
      </p>
      <div class="hero-badges">
        <el-tag type="primary" size="large">Vue 3.5</el-tag>
        <el-tag type="success" size="large">Tauri 2</el-tag>
        <el-tag type="warning" size="large">Vite 6</el-tag>
        <el-tag type="info" size="large">Element Plus</el-tag>
        <el-tag type="danger" size="large">Pinia</el-tag>
      </div>
    </div>

    <!-- 快速开始 -->
    <section class="section">
      <h2 class="section-title">🚀 快速开始</h2>
      <el-card shadow="hover" class="section-card">
        <el-steps :active="0" finish-status="success" align-center>
          <el-step title="安装依赖" description="npm install" />
          <el-step title="启动开发" description="npm run tauri dev" />
          <el-step title="构建应用" description="npm run tauri build" />
        </el-steps>
      </el-card>
    </section>

    <!-- 功能分类 -->
    <section class="section">
      <h2 class="section-title">📦 组件分类</h2>
      <div class="categories-grid">
        <el-card
          v-for="category in categories"
          :key="category.name"
          shadow="hover"
          class="category-card"
          @click="scrollToCategory(category.name)"
        >
          <div class="category-icon">{{ category.icon }}</div>
          <div class="category-name">{{ category.name }}</div>
          <div class="category-count">{{ category.count }} 个组件</div>
        </el-card>
      </div>
    </section>

    <!-- 核心特性 -->
    <section class="section">
      <h2 class="section-title">✨ 核心特性</h2>
      <div class="features-grid">
        <el-card
          v-for="feature in features"
          :key="feature.title"
          shadow="hover"
          class="feature-card"
        >
          <div class="feature-icon">{{ feature.icon }}</div>
          <div class="feature-title">{{ feature.title }}</div>
          <div class="feature-desc">{{ feature.description }}</div>
        </el-card>
      </div>
    </section>

    <!-- 组件列表 -->
    <section
      v-for="category in categories"
      :key="category.name"
      :id="`category-${category.name}`"
      class="section"
    >
      <h2 class="section-title">
        <span class="section-icon">{{ category.icon }}</span>
        {{ category.name }}
      </h2>
      <div class="components-grid">
        <el-card
          v-for="component in category.components"
          :key="component.path"
          shadow="hover"
          class="component-card"
          @click="navigateTo(component.path)"
        >
          <div class="component-header">
            <span class="component-icon">{{ component.icon }}</span>
            <span class="component-title">{{ component.title }}</span>
          </div>
          <div class="component-desc">{{ component.description }}</div>
          <div class="component-footer">
            <el-button text type="primary" size="small">
              查看文档
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { TAURI_FEATURES } from '@/constants'

const router = useRouter()

// 按分类组织组件
const categories = computed(() => {
  const categoryMap = {}
  
  TAURI_FEATURES.forEach(feature => {
    if (!categoryMap[feature.category]) {
      categoryMap[feature.category] = {
        name: feature.category,
        icon: getCategoryIcon(feature.category),
        components: []
      }
    }
    categoryMap[feature.category].components.push(feature)
  })
  
  return Object.values(categoryMap).map(cat => ({
    ...cat,
    count: cat.components.length
  }))
})

// 获取分类图标
const getCategoryIcon = (category) => {
  const iconMap = {
    '文件系统': '📁',
    '系统交互': '🖱️',
    '系统信息': '💻',
    '数据存储': '💾',
    '网络通信': '🌐',
    '其他': '📦'
  }
  return iconMap[category] || '📦'
}

// 核心特性
const features = [
  {
    icon: '🚀',
    title: 'Vue Router 4',
    description: '现代化路由管理，支持动态路由和路由守卫'
  },
  {
    icon: '📦',
    title: 'Pinia 状态管理',
    description: '轻量级状态管理库，支持状态持久化'
  },
  {
    icon: '🎨',
    title: 'Element Plus',
    description: '完整的 UI 组件库，按需自动导入'
  },
  {
    icon: '⚡',
    title: '自动导入',
    description: 'Vue API 和组件自动导入，无需手动 import'
  },
  {
    icon: '🖥️',
    title: 'Tauri API 封装',
    description: 'JavaScript 工具类封装所有 Tauri 原生 API'
  },
  {
    icon: '🪟',
    title: '窗口控制',
    description: '自定义标题栏和完整的窗口控制功能'
  }
]

// 导航到组件页面
const navigateTo = (path) => {
  if (path) {
    router.push(path)
  }
}

// 滚动到分类
const scrollToCategory = (categoryName) => {
  const element = document.getElementById(`category-${categoryName}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100%;
  background: var(--surface-page);
  padding: 0;
}

/* ignore */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  padding: 80px 40px;
  text-align: center;
}

.hero-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #ffffff;
}

.hero-icon {
  font-size: 56px;
}

.hero-subtitle {
  font-size: 24px;
  font-weight: 500;
  margin: 0 0 16px 0;
  opacity: 0.95;
}

.hero-description {
  font-size: 16px;
  margin: 0 0 32px 0;
  opacity: 0.9;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.hero-badges {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ignore */
.section {
  padding: 60px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 32px 0;
}

.section-icon {
  font-size: 32px;
}

.section-card {
  margin-top: 24px;
}

/* ignore */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.category-card {
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.category-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.category-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.category-count {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* ignore */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.feature-card {
  text-align: center;
  padding: 24px;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.feature-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

/* ignore */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.component-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.component-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.component-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.component-icon {
  font-size: 24px;
}

.component-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.component-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin-bottom: 16px;
}

.component-footer {
  display: flex;
  justify-content: flex-end;
}
</style>

