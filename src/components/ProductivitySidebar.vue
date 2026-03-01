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
            <el-icon><HomeFilled /></el-icon>
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
              <el-icon><component :is="item.icon" /></el-icon>
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
            <el-icon><Briefcase /></el-icon>
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
            <el-icon><Setting /></el-icon>
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
      { title: '文档中心', path: '/notes', icon: markRaw(Document) },
      { title: '凭据管理', path: '/passwords', icon: markRaw(Lock) },
      { title: '资源收藏', path: '/bookmarks', icon: markRaw(Link) }
    ]
  },
  {
    name: '智能助理',
    expanded: true,
    items: [
      { title: '智能对话', path: '/ai-conversation', icon: markRaw(ChatLineRound) },
      { title: 'AI 问答', path: '/ai-chat', icon: markRaw(ChatDotRound) }
    ]
  },
  {
    name: '协作效率',
    expanded: true,
    items: [
      { title: '任务清单', path: '/todos', icon: markRaw(List) },
      { title: '日程规划', path: '/calendar', icon: markRaw(Calendar) }
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
  width: var(--sidebar-width);
  background: var(--bg-primary);
  border-right: 0.5px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-smooth);
  flex-shrink: 0;
}

.productivity-sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-header {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
}

.collapse-btn {
  width: 100%;
  justify-content: flex-start;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) 0;
  display: flex;
  flex-direction: column;
}

/* 滚动条 — 隐藏式 */
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}
.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-content::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}
.sidebar-content:hover::-webkit-scrollbar-thumb {
  background: var(--text-quaternary);
}

.menu-section {
  margin-bottom: var(--space-sm);
}

/* 底部固定区域 */
.menu-section-bottom {
  margin-top: auto;
  margin-bottom: 0;
  padding-top: var(--space-sm);
  border-top: 0.5px solid var(--border-color);
}

/* 分组标题 — macOS Settings 风格 */
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 18px 16px 6px 16px;
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  cursor: pointer;
  user-select: none;
}

.section-header .el-icon {
  font-size: 12px;
}

.section-items {
  padding: 2px 0;
}

.section-divider {
  height: 0.5px;
  background: var(--border-color);
  margin: var(--space-sm) var(--space-md);
}

.productivity-sidebar.collapsed .section-divider {
  margin: var(--space-sm);
}

/* 菜单项 */
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px 7px 20px;
  margin: 1px 8px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

/* 图标统一单色 */
.menu-item .el-icon {
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

/* Hover 态 */
.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item:hover .el-icon {
  color: var(--text-primary);
}

/* 选中态 — 系统蓝 */
.menu-item.active {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
  font-weight: var(--font-weight-medium);
}

.menu-item.active .el-icon {
  color: var(--accent-blue);
}

.menu-item span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 折叠状态 */
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

.productivity-sidebar.collapsed .menu-section:first-child .menu-item {
  margin-top: var(--space-xs);
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
  background-color: var(--text-tertiary);
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 8px;
}
</style>

