<template>
  <div class="productivity-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div v-show="!isCollapsed" class="sidebar-brand">
        <div class="brand-title">ToolHub</div>
        <div class="brand-subtitle">Workspace</div>
      </div>
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
            class="menu-item menu-item-dashboard"
            :class="{ active: currentPath === '/' }"
            @click="navigateTo('/')"
          >
            <span class="menu-icon-shell">
              <el-icon><HomeFilled /></el-icon>
            </span>
            <span v-show="!isCollapsed" class="menu-label">{{ t('sidebar.dashboard') }}</span>
          </div>
        </el-tooltip>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 常用工具 -->
      <div class="menu-section">
        <div
          v-show="!isCollapsed"
          class="section-header section-header-static"
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
                <span class="menu-icon-shell menu-icon-shell-emoji">
                  <span class="tool-emoji-icon">{{ tool.icon }}</span>
                </span>
                <span v-show="!isCollapsed" class="menu-label">{{ tool.name }}</span>
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
              <span class="menu-icon-shell">
                <el-icon><Star /></el-icon>
              </span>
              <span class="menu-label">{{ t('sidebar.addFavorite') }}</span>
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
              <span class="menu-icon-shell">
                <el-icon><component :is="item.icon" /></el-icon>
              </span>
              <span v-show="!isCollapsed" class="menu-label">{{ item.title }}</span>
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
            class="menu-item toolbox-btn footer-entry"
            :class="{ active: currentPath === '/toolbox' }"
            @click="navigateTo('/toolbox')"
          >
            <span class="menu-icon-shell">
              <el-icon><Briefcase /></el-icon>
            </span>
            <span v-show="!isCollapsed" class="menu-label">{{ t('sidebar.toolbox') }}</span>
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
            class="menu-item footer-entry"
            :class="{ active: currentPath === '/settings' }"
            @click="navigateTo('/settings')"
          >
            <span class="menu-icon-shell">
              <el-icon><Setting /></el-icon>
            </span>
            <span v-show="!isCollapsed" class="menu-label">{{ t('sidebar.settings') }}</span>
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
  'ip-lookup': '/toolbox/ip-lookup',
  'dns-lookup': '/toolbox/dns-lookup',
  'speed-test': '/toolbox/speed-test',
  'websocket-test': '/toolbox/websocket-test',
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
  'hex-converter': '/toolbox/hex-converter',
  'image-format': '/toolbox/image-format-converter',
  'regex-tester': '/toolbox/regex-tester',
  'crypto': '/toolbox/crypto-tool',
  'sqlite-manager': '/toolbox/sqlite-manager',
  'maven-repo': '/toolbox/maven-repo',
  'wallpaper-manager': '/toolbox/wallpaper-manager',
  'log-analyzer': '/toolbox/log-analyzer',
  'hardware-info': '/toolbox/hardware-info',
  'download-manager': '/toolbox/download-manager',
  'ssh-terminal': '/toolbox/ssh-terminal',
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
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.9), transparent 32%),
    linear-gradient(180deg, rgba(249, 250, 252, 0.985), rgba(243, 246, 249, 0.98));
  border-right: 1px solid rgba(15, 23, 42, 0.07);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-smooth), background var(--transition-smooth);
  flex-shrink: 0;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.72);
}

.productivity-sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-header {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.045);
}

.sidebar-brand {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
}

.brand-title {
  font-size: 14px;
  line-height: 1.2;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.brand-subtitle {
  font-size: 11px;
  line-height: 1.2;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 10px;
  justify-content: center;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.82);
  color: var(--text-primary);
}

/* 顶部固定区域 — 不参与滚动 */
.sidebar-top {
  flex-shrink: 0;
  padding: 8px 0 6px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.045);
}

.sidebar-top .menu-section {
  margin-bottom: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 12px;
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
  background: rgba(148, 163, 184, 0.55);
}

.menu-section {
  margin-bottom: 8px;
}

/* 底部固定区域 — 不参与滚动 */
.sidebar-footer {
  flex-shrink: 0;
  padding: 10px 0 12px;
  border-top: 1px solid rgba(15, 23, 42, 0.045);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.68), rgba(243, 246, 249, 0.92));
}

.sidebar-footer .menu-section {
  margin-bottom: 0;
  padding: 0 10px;
}

.sidebar-footer .menu-section + .menu-section {
  margin-top: 4px;
}

.sidebar-footer .menu-section:last-child {
  padding-bottom: 0;
}

/* 分组标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  user-select: none;
}

.section-header .el-icon {
  font-size: 11px;
  color: var(--text-quaternary);
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.section-header:hover {
  color: var(--text-secondary);
}

.section-header:hover .el-icon {
  color: var(--text-secondary);
}

.section-header.section-header-static {
  padding-top: 6px;
}

.section-items {
  padding: 1px 0;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.28), rgba(148, 163, 184, 0));
  margin: 8px 14px;
}

.productivity-sidebar.collapsed .section-divider {
  margin: 8px 8px;
}

/* 菜单项 */
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 7px 12px 7px 14px;
  margin: 1px 10px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.88);
  border-radius: 11px;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
  position: relative;
}

.menu-item-dashboard {
  background: transparent;
  box-shadow: none;
}

.menu-icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  border-radius: 7px;
  background: transparent;
  box-shadow: none;
}

.menu-icon-shell-emoji {
  background: transparent;
}

/* 图标统一单色 */
.menu-item .el-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  font-size: 15px;
  color: rgba(71, 85, 105, 0.9);
  flex-shrink: 0;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

/* Hover 态 */
.menu-item:hover {
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
}

.menu-item:hover .el-icon {
  color: rgba(15, 23, 42, 0.92);
}

.menu-item:hover .menu-icon-shell {
  background: rgba(15, 23, 42, 0.028);
}

/* 选中态 */
.menu-item.active {
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.86), rgba(229, 238, 252, 0.82));
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.14);
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, #60a5fa, #2563eb);
}

.menu-item.active .el-icon {
  color: #2563eb;
}

.menu-item.active .menu-icon-shell {
  background: rgba(37, 99, 235, 0.05);
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.08);
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 折叠状态 */
.productivity-sidebar.collapsed .menu-label,
.productivity-sidebar.collapsed .section-header span,
.productivity-sidebar.collapsed .sidebar-brand,
.productivity-sidebar.collapsed .tools-badge {
  display: none;
}

.productivity-sidebar.collapsed .menu-item {
  padding: 9px;
  justify-content: center;
  margin: 2px 8px;
  gap: 0;
  border-radius: 11px;
}

.productivity-sidebar.collapsed .menu-icon-shell {
  width: 24px;
  height: 24px;
  min-width: 24px;
}

.productivity-sidebar.collapsed .menu-item.active::before {
  left: 50%;
  top: auto;
  bottom: 4px;
  width: 14px;
  height: 3px;
  transform: translateX(-50%);
}

.productivity-sidebar.collapsed .section-header {
  display: none;
}

.productivity-sidebar.collapsed .collapse-btn {
  margin: 0 auto;
}

.productivity-sidebar.collapsed .sidebar-header {
  padding: 10px 0 8px;
  justify-content: center;
}

.productivity-sidebar.collapsed .sidebar-top {
  padding-top: 8px;
}

.productivity-sidebar.collapsed .sidebar-footer .menu-section {
  padding: 0;
}

/* 工具 emoji 图标 */
.tool-emoji-icon {
  font-size: 15px;
  width: 16px;
  min-width: 16px;
  text-align: center;
  flex: none !important;
  flex-shrink: 0;
  line-height: 1;
}

/* 折叠时 emoji 图标保持显示 */
.productivity-sidebar.collapsed .menu-item .tool-emoji-icon {
  display: inline !important;
}

/* 常用工具空状态 */
.favorites-empty-item {
  opacity: 0.68;
}

/* 工具箱按钮 */
.toolbox-btn {
  position: relative;
}

.footer-entry {
  margin-left: 0;
  margin-right: 0;
  background: transparent;
  box-shadow: none;
}

.tools-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.tools-badge :deep(.el-badge__content) {
  background: rgba(100, 116, 139, 0.12);
  color: rgba(71, 85, 105, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.22);
  font-size: 10px;
  font-weight: 600;
  height: 18px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  box-shadow: none;
}
</style>

