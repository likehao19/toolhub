<template>
  <div class="doc-layout">
    <div class="doc-body">
      <!-- 左侧导航菜单 -->
      <div class="doc-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <!-- 侧边栏工具栏 -->
        <div class="sidebar-toolbar">
          <el-button text @click="toggleSidebar">
            <el-icon><Menu /></el-icon>
          </el-button>
          <el-button text @click="goToSettings">
            <el-icon><Setting /></el-icon>
          </el-button>
        </div>
        <div class="sidebar-content">
          <div
            v-for="category in categories"
            :key="category.name"
            class="category-group"
          >
            <div class="category-title" @click="category.name ? toggleCategory(category.name) : null">
              <el-icon v-if="category.name">
                <ArrowRight v-if="!category.expanded" />
                <ArrowDown v-else />
              </el-icon>
              <span>{{ category.name }}</span>
            </div>
            <div v-show="category.expanded" class="category-items">
              <div
                v-for="item in category.items"
                :key="item.path"
                class="menu-item"
                :class="{ active: currentPath === item.path }"
                @click="navigateTo(item.path)"
              >
                <span class="item-icon">{{ item.icon }}</span>
                <span class="item-text">{{ item.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="doc-main" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <!-- 侧边栏折叠时显示的展开按钮 -->
        <div v-if="sidebarCollapsed" class="sidebar-toggle-btn" @click="toggleSidebar">
          <el-icon><Menu /></el-icon>
        </div>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Menu, Setting, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import { TAURI_FEATURES } from '@/constants'

const router = useRouter()
const route = useRoute()

const sidebarCollapsed = ref(false)
const currentPath = computed(() => route.path)

// 按分类组织功能
const categories = ref([])

// 初始化分类数据
const initCategories = () => {
  const categoryMap = {}
  
  // 过滤掉 settings 页面，因为要单独放在最下面
  TAURI_FEATURES.filter(feature => feature.path !== '/settings').forEach(feature => {
    if (!categoryMap[feature.category]) {
      categoryMap[feature.category] = {
        name: feature.category,
        items: [],
        expanded: true
      }
    }
    categoryMap[feature.category].items.push({
      icon: feature.icon,
      title: feature.title,
      path: feature.path,
      description: feature.description
    })
  })
  
  categories.value = Object.values(categoryMap)
  
  // 首页放在最上面
  categories.value.unshift({
    name: '',
    items: [
      { icon: '🏠', title: '首页', path: '/' }
    ],
    expanded: true
  })
  
  // 添加其他页面（不包含首页和设置，因为已经单独处理）
  categories.value.push({
    name: '其他',
    items: [
      { icon: 'ℹ️', title: '关于', path: '/about' }
    ],
    expanded: true
  })
  
  // 设置放在最下面
  categories.value.push({
    name: '',
    items: [
      { icon: '⚙️', title: '设置', path: '/settings' }
    ],
    expanded: true
  })
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换分类展开/收起
const toggleCategory = (categoryName) => {
  const category = categories.value.find(c => c.name === categoryName)
  if (category) {
    category.expanded = !category.expanded
  }
}

// 导航到页面
const navigateTo = (path) => {
  if (path) {
    router.push(path)
  }
}

// 前往设置
const goToSettings = () => {
  router.push('/settings')
}

// 监听路由变化，自动展开对应分类
watch(currentPath, (newPath) => {
  categories.value.forEach(category => {
    const hasActiveItem = category.items.some(item => item.path === newPath)
    if (hasActiveItem && !category.expanded) {
      category.expanded = true
    }
  })
})

onMounted(() => {
  initCategories()
})
</script>

<style scoped>
.doc-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px); /* ignore */
  background: #f5f7fa;
  box-sizing: border-box;
  margin-top: 32px; /* ignore */
}

/* ignore */
.doc-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 100%;
  min-height: 0; /* ignore */
}

/* ignore */
.doc-sidebar {
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  overflow: hidden;
  transition: width 0.3s ease;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.doc-sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
}

/* ignore */
.sidebar-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.category-group {
  margin-bottom: 8px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.category-title:not(:has(.el-icon)) {
  cursor: default;
}

.category-title:hover {
  background-color: #f5f7fa;
}

.category-title .el-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.category-items {
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px 10px 48px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.menu-item.active {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #409eff;
}

.item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ignore */
.doc-main {
  flex: 1;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
  position: relative;
}

.doc-main.sidebar-collapsed {
  margin-left: 0;
}

/* ignore */
.sidebar-toggle-btn {
  position: fixed;
  left: 0;
  top: calc(32px + 12px); /* ignore */
  z-index: 1000;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-left: none;
  border-radius: 0 8px 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-toggle-btn:hover {
  background: #f5f7fa;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle-btn .el-icon {
  font-size: 18px;
  color: #606266;
}

/* ignore */
.doc-sidebar::-webkit-scrollbar,
.doc-main::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.doc-sidebar::-webkit-scrollbar-track,
.doc-main::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.doc-sidebar::-webkit-scrollbar-thumb,
.doc-main::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.doc-sidebar::-webkit-scrollbar-thumb:hover,
.doc-main::-webkit-scrollbar-thumb:hover {
  background: #a8abb2;
}

/* ignore */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

