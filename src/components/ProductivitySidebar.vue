<template>
  <div class="productivity-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <el-button text @click="toggleCollapse" class="collapse-btn">
        <el-icon><Menu v-if="isCollapsed" /><Fold v-else /></el-icon>
      </el-button>
    </div>

    <!-- 工作台 — 固定顶部 -->
    <div class="sidebar-top">
      <div class="menu-section">
        <el-tooltip
          :content="t('sidebar.dashboard')"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item"
            :class="{ active: currentPath === '/' }"
            @click="navigateTo('/')"
          >
            <el-icon><HomeFilled /></el-icon>
            <span v-show="!isCollapsed">{{ t('sidebar.dashboard') }}</span>
          </div>
        </el-tooltip>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 常用工具 -->
      <div class="menu-section">
        <div v-if="isCollapsed" class="section-divider"></div>
        <div
          v-show="!isCollapsed"
          class="section-header"
          @click="toggleFavorites"
        >
          <el-icon>
            <ArrowRight v-if="!favoritesExpanded" />
            <ArrowDown v-else />
          </el-icon>
          <span>{{ t('sidebar.favorites') }}</span>
        </div>
        <div class="section-items" v-show="favoritesExpanded || isCollapsed">
          <!-- 有收藏时显示列表 -->
          <template v-if="favoriteTools.length > 0">
            <el-tooltip
              v-for="tool in favoriteTools"
              :key="tool.id"
              :content="tool.name"
              placement="right"
              :disabled="!isCollapsed"
            >
              <div
                class="menu-item"
                :class="{ active: currentPath === getToolPath(tool) }"
                @click="openFavoriteTool(tool)"
              >
                <span class="tool-emoji-icon">{{ tool.icon }}</span>
                <span v-show="!isCollapsed">{{ tool.name }}</span>
              </div>
            </el-tooltip>
          </template>
          <!-- 空状态：与普通菜单项完全一致的样式 -->
          <el-tooltip
            v-else
            :content="t('sidebar.goToolbox')"
            placement="right"
            :disabled="!isCollapsed"
          >
            <div
              v-show="!isCollapsed"
              class="menu-item favorites-empty-item"
              @click="navigateTo('/toolbox')"
            >
              <el-icon><Star /></el-icon>
              <span>{{ t('sidebar.addFavorite') }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>

      <!-- 分割线 - 仅折叠时显示 -->
      <div v-if="isCollapsed" class="section-divider"></div>

      <!-- 功能模块 -->
      <div class="menu-section" v-for="(section, index) in menuSections" :key="section.key">
        <!-- 分割线 - 仅折叠时显示 -->
        <div v-if="isCollapsed && index > 0" class="section-divider"></div>

        <div
          v-show="!isCollapsed"
          class="section-header"
          @click="toggleSection(section.key)"
        >
          <el-icon>
            <ArrowRight v-if="!sectionExpanded[section.key]" />
            <ArrowDown v-else />
          </el-icon>
          <span>{{ section.name }}</span>
        </div>
        <div class="section-items" v-show="sectionExpanded[section.key] || isCollapsed">
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

    </div>

    <!-- 底部固定区域 —— 不参与滚动 -->
    <div class="sidebar-footer">
      <!-- 工具箱 -->
      <div class="menu-section">
        <el-tooltip
          :content="t('sidebar.toolbox')"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item toolbox-btn"
            :class="{ active: currentPath === '/toolbox' }"
            @click="navigateTo('/toolbox')"
          >
            <el-icon><Briefcase /></el-icon>
            <span v-show="!isCollapsed">{{ t('sidebar.toolbox') }}</span>
            <el-badge v-show="!isCollapsed" :value="enabledToolsCount" class="tools-badge" />
          </div>
        </el-tooltip>
      </div>

      <!-- 设置 -->
      <div class="menu-section">
        <el-tooltip
          :content="t('sidebar.settings')"
          placement="right"
          :disabled="!isCollapsed"
        >
          <div
            class="menu-item"
            :class="{ active: currentPath === '/settings' }"
            @click="navigateTo('/settings')"
          >
            <el-icon><Setting /></el-icon>
            <span v-show="!isCollapsed">{{ t('sidebar.settings') }}</span>
          </div>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Menu, Fold, HomeFilled, Setting, ArrowRight, ArrowDown,
  Document, Lock, Link, List, Calendar, ChatDotRound, ChatLineRound, Briefcase,
  Star, ChatRound
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { useFavoriteTools } from '@/composables/useFavoriteTools'

const router = useRouter()
const route = useRoute()

const isCollapsed = ref(false)
const currentPath = computed(() => route.path)
const favoritesExpanded = ref(true)

const { favoriteTools } = useFavoriteTools()

// 切换常用分类展开/收起
const toggleFavorites = () => {
  favoritesExpanded.value = !favoritesExpanded.value
}

// 点击常用工具
const openFavoriteTool = (tool) => {
  const path = getToolPath(tool)
  if (path) {
    router.push(path)
  } else {
    ElMessage.info(`${tool.name} - ${t('common.comingSoon')}`)
  }
}

// 工具对应的路由路径，没有独立页面的返回 null（不参与 active 判断）
const toolPathMap = {
  'sticky-notes': '/toolbox/sticky-notes',
  'sdk-manager': '/toolbox/sdk-manager',
  'redis-client': '/toolbox/redis-client',
  'port-manager': '/toolbox/port-manager',
  'git-manager': '/toolbox/git-manager',
  'git-daily-report': '/toolbox/git-daily-report',
  'code-formatter': '/toolbox/code-formatter',
  'file-compare': '/toolbox/file-diff',
  'api-debug': '/toolbox/api-debug',
  'api-docs-page': '/toolbox/api-docs',
  'mock-service': '/toolbox/mock-service',
  'perf-test': '/toolbox/perf-test',
  'auto-test': '/toolbox/auto-test',
  'ebook-shelf': '/toolbox/ebook-shelf',
  'screenshot': '/toolbox/screenshot',
  'image-to-base64': '/toolbox/image-to-base64',
  'image-format': '/toolbox/image-format-converter',
  'regex-tester': '/toolbox/regex-tester',
  'crypto': '/toolbox/crypto-tool',
  'sqlite-manager': '/toolbox/sqlite-manager',
  'maven-repo': '/toolbox/maven-repo',
  'wallpaper-manager': '/toolbox/wallpaper-manager',
  'log-analyzer': '/toolbox/log-analyzer',
}

const getToolPath = (tool) => toolPathMap[tool.id] ?? null

// 启用的工具数量（从配置读取）
const enabledToolsCount = computed(() => {
  // TODO: 从配置文件读取启用的工具数量
  return 5
})

// 菜单结构 - 使用 ref 以支持深度响应式，图标用 markRaw 避免不必要的响应式转换
const menuSections = computed(() => [
  {
    name: t('sidebar.knowledge'),
    key: 'knowledge',
    expanded: true,
    items: [
      { title: t('sidebar.documents'), path: '/notes', icon: markRaw(Document) },
      { title: t('sidebar.credentials'), path: '/passwords', icon: markRaw(Lock) },
      { title: t('sidebar.bookmarks'), path: '/bookmarks', icon: markRaw(Link) }
    ]
  },
  {
    name: t('sidebar.ai'),
    key: 'ai',
    expanded: true,
    items: [
      { title: t('sidebar.aiConversation'), path: '/ai-conversation', icon: markRaw(ChatLineRound) },
      { title: t('sidebar.aiChat'), path: '/ai-chat', icon: markRaw(ChatDotRound) },
      { title: t('sidebar.chat'), path: '/chat', icon: markRaw(ChatRound) }
    ]
  },
  {
    name: t('sidebar.efficiency'),
    key: 'efficiency',
    expanded: true,
    items: [
      { title: t('sidebar.todos'), path: '/todos', icon: markRaw(List) },
      { title: t('sidebar.calendar'), path: '/calendar', icon: markRaw(Calendar) }
    ]
  }
])

// 分类展开状态
const sectionExpanded = reactive({ knowledge: true, ai: true, efficiency: true })

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 切换分类展开/收起
const toggleSection = (key) => {
  sectionExpanded[key] = !sectionExpanded[key]
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
    if (hasActiveItem && !sectionExpanded[section.key]) {
      sectionExpanded[section.key] = true
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

/* 顶部固定区域 — 不参与滚动 */
.sidebar-top {
  flex-shrink: 0;
  padding-bottom: var(--space-xs);
  border-bottom: 0.5px solid var(--border-color);
}

.sidebar-top .menu-section {
  margin-bottom: 0;
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

/* 底部固定区域 — 不参与滚动 */
.sidebar-footer {
  flex-shrink: 0;
  padding-top: var(--space-sm);
  border-top: 0.5px solid var(--border-color);
}

.sidebar-footer .menu-section {
  margin-bottom: 0;
}

.sidebar-footer .menu-section:last-child {
  padding-bottom: var(--space-sm);
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

/* 工具 emoji 图标 — 覆盖 .menu-item span 的 flex:1，保持和 el-icon 一致的固定宽度 */
.tool-emoji-icon {
  font-size: 15px;
  width: 16px;
  min-width: 16px;
  text-align: center;
  flex: none !important;   /* 不参与 flex 伸缩，与 el-icon 对齐 */
  flex-shrink: 0;
  line-height: 1;
}

/* 折叠时 emoji 图标保持显示（不被 .collapsed .menu-item span 规则隐藏） */
.productivity-sidebar.collapsed .menu-item .tool-emoji-icon {
  display: inline !important;
}

/* 常用工具空状态 — 与普通菜单项结构一致，仅颜色更淡 */
.favorites-empty-item {
  opacity: 0.5;
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

