<template>
  <div class="about-page">
    <div class="about-view">
      <el-page-header @back="goBack">
      <template #content>
        <span class="page-title">关于项目</span>
      </template>
    </el-page-header>

    <div class="content-section">
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span>📖 项目信息</span>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">
            Vue3 + Vite5 + Tauri2 桌面应用框架
          </el-descriptions-item>
          <el-descriptions-item label="版本">0.1.0</el-descriptions-item>
          <el-descriptions-item label="技术栈">
            Vue 3 + Vite + Tauri 2 + Element Plus
          </el-descriptions-item>
          <el-descriptions-item label="特性">
            路由管理、状态管理、自动导入、Tauri API 封装
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="features-card">
        <template #header>
          <div class="card-header">
            <span>✨ 核心功能</span>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="item in features"
            :key="item.title"
            :timestamp="item.category"
            placement="top"
          >
            <el-card>
              <h4>{{ item.title }}</h4>
              <p>{{ item.description }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <div class="actions">
        <el-button type="primary" @click="goBack">返回首页</el-button>
        <el-button @click="showInfo">显示应用信息</el-button>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const features = [
  {
    category: '前端框架',
    title: 'Vue Router 4',
    description: '现代化的路由管理系统，支持动态路由和路由守卫'
  },
  {
    category: '状态管理',
    title: 'Pinia',
    description: '轻量级状态管理，支持 TypeScript 和状态持久化'
  },
  {
    category: 'UI 组件库',
    title: 'Element Plus',
    description: '完整的 Vue 3 组件库，按需自动导入优化体积'
  },
  {
    category: '开发体验',
    title: '自动导入',
    description: 'Vue API 和组件自动导入，大幅提升开发效率'
  },
  {
    category: '原生能力',
    title: 'Tauri API 封装',
    description: '完整封装 Tauri 原生 API，提供简洁的 JavaScript 接口'
  },
  {
    category: '桌面特性',
    title: '窗口控制',
    description: '自定义标题栏、系统托盘、启动动画等桌面应用特性'
  }
]

const goBack = () => {
  router.push('/')
}

const showInfo = () => {
  ElMessageBox.alert(
    '这是一个功能完整的 Vue3 + Tauri 桌面应用开发模板，包含了企业级应用所需的核心功能和最佳实践。',
    '应用信息',
    {
      confirmButtonText: '确定',
      type: 'info'
    }
  )
}
</script>

<style scoped>
.about-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
}

.about-view {
  padding: 24px;
  padding-top: 56px; /* ignore */
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
}

.info-card {
  margin-bottom: 24px;
}

.features-card {
  margin-bottom: 24px;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}

.el-timeline-item h4 {
  margin: 0 0 8px 0;
  color: #409eff;
}

.el-timeline-item p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.actions {
  text-align: center;
  margin-top: 32px;
}

.actions .el-button {
  margin: 0 12px;
}
</style>
