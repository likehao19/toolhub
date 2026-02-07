<template>
  <div class="productivity-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <el-button text @click="toggleCollapse" class="collapse-btn">
        <el-icon><Menu v-if="isCollapsed" /><Fold v-else /></el-icon>
      </el-button>
    </div>

    <div class="sidebar-content">
      <!-- 首页 -->
      <div class="menu-section">
        <el-tooltip
          :content="'工作台'"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item"
            :class="{ active: currentPath === '/' }"
            @click="navigateTo('/')"
          >
            <el-icon style="color: #ff6b6b;"><HomeFilled /></el-icon>
            <span v-show="!isCollapsed">工作台</span>
          </div>
        </el-tooltip>
      </div>

      <!-- 分割线 - 仅折叠时显示 -->
      <div v-if="isCollapsed" class="section-divider"></div>

      <!-- 功能模块 -->
      <div class="menu-section" v-for="(section, index) in menuSections" :key="section.name">
        <!-- 分割线 - 仅折叠时显示 -->
        <div v-if="isCollapsed && index > 0" class="section-divider"></div>
        
        <div
          v-show="!isCollapsed"
          class="section-header"
          @click="toggleSection(section.name)"
        >
          <el-icon>
            <ArrowRight v-if="!section.expanded" />
            <ArrowDown v-else />
          </el-icon>
          <span>{{ section.name }}</span>
        </div>
        <div class="section-items" v-show="section.expanded || isCollapsed">
          <el-tooltip
            v-for="item in section.items"
            :key="item.path"
            :content="item.title"
            placement="right"
            :disabled="!isCollapsed"
          >
            <div
              class="menu-item"
              :class="{ active: currentPath === item.path && !item.isWindow }"
              @click="navigateTo(item.path, item)"
            >
              <el-icon :style="{ color: item.color }"><component :is="item.icon" /></el-icon>
              <span v-show="!isCollapsed">{{ item.title }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>

      <!-- 设置分割线 - 仅折叠时显示 -->
      <div v-if="isCollapsed" class="section-divider"></div>
      
      <!-- 工具箱 -->
      <div class="menu-section menu-section-bottom">
        <el-tooltip
          :content="'工具箱'"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item toolbox-btn"
            :class="{ active: currentPath === '/toolbox' }"
            @click="navigateTo('/toolbox')"
          >
            <el-icon style="color: #ff9800;"><Briefcase /></el-icon>
            <span v-show="!isCollapsed">工具箱</span>
            <el-badge v-show="!isCollapsed" :value="enabledToolsCount" class="tools-badge" />
          </div>
        </el-tooltip>
      </div>
      
      <!-- 设置 -->
      <div class="menu-section">
        <el-tooltip
          :content="'系统设置'"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item"
            :class="{ active: currentPath === '/settings' }"
            @click="navigateTo('/settings')"
          >
            <el-icon style="color: #606266;"><Setting /></el-icon>
            <span v-show="!isCollapsed">系统设置</span>
          </div>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Menu, Fold, HomeFilled, Setting, ArrowRight, ArrowDown,
  Document, Lock, Link, List, Calendar, ChatDotRound, ChatLineRound, Briefcase
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const isCollapsed = ref(false)
const currentPath = computed(() => route.path)

// 启用的工具数量（从配置读取）
const enabledToolsCount = computed(() => {
  // TODO: 从配置文件读取启用的工具数量
  return 5
})

// 菜单结构 - 使用 ref 以支持深度响应式，图标用 markRaw 避免不必要的响应式转换
const menuSections = ref([
  {
    name: '知识管理',
    expanded: true,
    items: [
      { title: '文档中心', path: '/notes', icon: markRaw(Document), color: '#409eff' },
      { title: '凭据管理', path: '/passwords', icon: markRaw(Lock), color: '#f56c6c' },
      { title: '资源收藏', path: '/bookmarks', icon: markRaw(Link), color: '#e6a23c' }
    ]
  },
  {
    name: '智能助理',
    expanded: true,
    items: [
      { title: '智能对话', path: '/ai-conversation', icon: markRaw(ChatLineRound), color: '#909399' },
      { title: 'AI 问答', path: '/ai-chat', icon: markRaw(ChatDotRound), color: '#67c23a' }
    ]
  },
  {
    name: '协作效率',
    expanded: true,
    items: [
      { title: '任务清单', path: '/todos', icon: markRaw(List), color: '#9c27b0' },
      { title: '日程规划', path: '/calendar', icon: markRaw(Calendar), color: '#ff9800' }
    ]
  }
])

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 切换分类展开/收起
const toggleSection = (sectionName) => {
  const section = menuSections.value.find(s => s.name === sectionName)
  if (section) {
    section.expanded = !section.expanded
  }
}

// 导航
const navigateTo = async (path, item) => {
  if (!path) return
  
  // 如果是独立窗口（如便签）
  if (item?.isWindow) {
    try {
      const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
      
      const allWindows = await getAllWebviewWindows()
      const stickyWindow = allWindows.find(w => w.label === 'sticky-notes')
      
      if (stickyWindow) {
        await stickyWindow.show()
        await stickyWindow.setFocus()
      }
    } catch (error) {
      // ignore
    }
  } else {
    // 普通路由导航
    router.push(path)
  }
}

// 监听路由变化，自动展开对应分类
watch(currentPath, (newPath) => {
  menuSections.value.forEach(section => {
    const hasActiveItem = section.items.some(item => item.path === newPath)
    if (hasActiveItem && !section.expanded) {
      section.expanded = true
    }
  })
})
</script>

<style scoped>
.productivity-sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.productivity-sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #e4e7ed;
}

.collapse-btn {
  width: 100%;
  justify-content: flex-start;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}

.menu-section {
  margin-bottom: 8px;
}

.menu-section-bottom {
  margin-top: auto;
  margin-bottom: 0;
  padding-bottom: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.section-header:hover {
  background: #f5f7fa;
}

.section-header .el-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.section-items {
  padding: 4px 0;
}

.section-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 8px 12px;
}

.productivity-sidebar.collapsed .section-divider {
  margin: 8px 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 40px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  border-radius: 6px;
  margin: 2px 8px;
}

.menu-item:hover {
  background: #edf2f7;
  color: #409eff;
}

.menu-item.active {
  background: #e6f4ff !important;
  color: #3498db !important;
  font-weight: 600;
}

.menu-item .el-icon {
  font-size: 18px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.menu-item:hover .el-icon {
  transform: scale(1.1);
}

.menu-item.active .el-icon {
  transform: scale(1.15);
}

.menu-item span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.productivity-sidebar.collapsed .menu-item span,
.productivity-sidebar.collapsed .section-header span {
  display: none;
}

.productivity-sidebar.collapsed .menu-item {
  padding: 10px;
  justify-content: center;
  margin: 2px 6px;
  gap: 0;
}

.productivity-sidebar.collapsed .section-header {
  display: none;
}

.productivity-sidebar.collapsed .collapse-btn {
  justify-content: center;
  padding: 0;
}

.productivity-sidebar.collapsed .sidebar-header {
  padding: 0;
}

/* 折叠状态下的首页菜单项 */
.productivity-sidebar.collapsed .menu-section:first-child .menu-item {
  margin-top: 4px;
}

/* 工具箱按钮 */
.toolbox-btn {
  position: relative;
}

.tools-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.tools-badge :deep(.el-badge__content) {
  background-color: #ff9800;
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
}

/* 滚动条样式 */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #a8abb2;
}
</style>

