<template>
  <div class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <h3 v-if="!collapsed">菜单</h3>
      <div v-if="!collapsed" style="font-size: 10px; color: #999; margin-top: 4px;">{{ route.path }}</div>
    </div>
    <div class="sidebar-content">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item"
        :class="{ active: isActive(item.path) }"
        @click="handleMenuClick(item)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span v-if="!collapsed" class="text">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { MENU_ITEMS } from '@/constants'

defineProps({
  /** 是否折叠 */
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const route = useRoute()
const menuItems = MENU_ITEMS

/**
 * 判断菜单项是否激活
 * @param {string} path - 菜单路径
 */
const isActive = (path) => {
  return route.path === path
}

/**
 * 处理菜单点击
 * @param {Object} item - 菜单项
 */
const handleMenuClick = (item) => {
  if (item.path) {
    router.push(item.path)
  }
}
</script>

<style scoped>
.sidebar {
  width: 180px;
  height: 100vh;
  background-color: #ffffff;
  padding-top: 52px;
  transition: width 0.3s ease;
  overflow: hidden;
  border-right: 1px solid #e0e0e0;
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  width: 50px;
}

.sidebar-header {
  padding: 10px;
  text-align: center;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 8px;
}

.sidebar-content {
  padding: 6px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
  font-size: 0.9rem;
  position: relative;
}

.menu-item:hover {
  background-color: #edf2f7;
}

.menu-item.active {
  background-color: #e6f4ff !important;
  color: #3498db !important;
  font-weight: 600;
}

.menu-item.active .icon {
  color: #3498db;
}

.menu-item .icon {
  font-size: 1.2rem;
  min-width: 24px;
}

.menu-item .text {
  margin-left: 10px;
  white-space: nowrap;
}
</style>
