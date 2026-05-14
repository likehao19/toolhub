<template>
  <nav
    class="productivity-sidebar"
    :class="{ collapsed: isCollapsed }"
    role="navigation"
    :aria-label="t('sidebar.dashboard')"
  >
    <div class="sidebar-header">
      <div v-show="!isCollapsed" class="sidebar-brand">
        <div class="brand-title">ToolHub</div>
        <div class="brand-subtitle">Workspace</div>
      </div>
      <el-button text @click="toggleCollapse" class="collapse-btn" :aria-label="isCollapsed ? '展开侧栏' : '折叠侧栏'">
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
            :class="{ active: isActive('/') }"
            role="link"
            tabindex="0"
            :aria-current="isActive('/') ? 'page' : undefined"
            @click="navigateTo('/')"
            @keydown.enter.prevent="navigateTo('/')"
            @keydown.space.prevent="navigateTo('/')"
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
          role="button"
          tabindex="0"
          :aria-expanded="favoritesExpanded"
          @click="toggleFavorites"
          @keydown.enter.prevent="toggleFavorites"
          @keydown.space.prevent="toggleFavorites"
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
              :content="getToolName(tool)"
              placement="right"
              :disabled="!isCollapsed"
            >
              <div
                class="menu-item"
                :class="{ active: isActive(getToolPath(tool)) }"
                role="link"
                tabindex="0"
                :aria-current="isActive(getToolPath(tool)) ? 'page' : undefined"
                @click="openFavoriteTool(tool)"
                @keydown.enter.prevent="openFavoriteTool(tool)"
                @keydown.space.prevent="openFavoriteTool(tool)"
              >
                <span class="menu-icon-shell menu-icon-shell-emoji">
                  <span class="tool-emoji-icon">{{ tool.icon }}</span>
                </span>
                <span v-show="!isCollapsed" class="menu-label">{{ getToolName(tool) }}</span>
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
              role="link"
              tabindex="0"
              @click="navigateTo('/toolbox')"
              @keydown.enter.prevent="navigateTo('/toolbox')"
              @keydown.space.prevent="navigateTo('/toolbox')"
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
          role="button"
          tabindex="0"
          :aria-expanded="!!sectionExpanded[section.key]"
          @click="toggleSection(section.key)"
          @keydown.enter.prevent="toggleSection(section.key)"
          @keydown.space.prevent="toggleSection(section.key)"
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
              :class="{ active: isActive(item.path) }"
              role="link"
              tabindex="0"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              @click="navigateTo(item.path)"
              @keydown.enter.prevent="navigateTo(item.path)"
              @keydown.space.prevent="navigateTo(item.path)"
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
            :class="{ active: isActive('/toolbox') }"
            role="link"
            tabindex="0"
            :aria-current="isActive('/toolbox') ? 'page' : undefined"
            @click="navigateTo('/toolbox')"
            @keydown.enter.prevent="navigateTo('/toolbox')"
            @keydown.space.prevent="navigateTo('/toolbox')"
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
            :class="{ active: isActive('/settings') }"
            role="link"
            tabindex="0"
            :aria-current="isActive('/settings') ? 'page' : undefined"
            @click="navigateTo('/settings')"
            @keydown.enter.prevent="navigateTo('/settings')"
            @keydown.space.prevent="navigateTo('/settings')"
          >
            <span class="menu-icon-shell">
              <el-icon><Setting /></el-icon>
            </span>
            <span v-show="!isCollapsed" class="menu-label">{{ t('sidebar.settings') }}</span>
          </div>
        </el-tooltip>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, reactive, computed, watch, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Menu, Fold, HomeFilled, Setting, ArrowRight, ArrowDown,
  Document, Lock, Link, List, Calendar, ChatDotRound, ChatLineRound, Briefcase,
  Star, ChatRound, UserFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { useFavoriteTools, getToolName } from '@/composables/useFavoriteTools'

const router = useRouter()
const route = useRoute()

// ---- localStorage 持久化辅助 ----
// 用 try/catch 兜住 storage 不可用 / quota 满 / JSON 损坏 等情况,坏数据不会拖崩组件
const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed'
const STORAGE_KEY_FAV_EXPANDED = 'sidebar-favorites-expanded'
const STORAGE_KEY_SECTIONS = 'sidebar-sections-expanded'

const readBool = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true'
  } catch { return fallback }
}
const writeBool = (key, val) => {
  try { localStorage.setItem(key, String(val)) } catch {}
}
const readJSON = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    const parsed = JSON.parse(v)
    return (parsed && typeof parsed === 'object') ? parsed : fallback
  } catch { return fallback }
}
const writeJSON = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

const isCollapsed = ref(readBool(STORAGE_KEY_COLLAPSED, false))
const currentPath = computed(() => route.path)
const favoritesExpanded = ref(readBool(STORAGE_KEY_FAV_EXPANDED, true))

const { favoriteTools } = useFavoriteTools()

// 切换常用分类展开/收起
const toggleFavorites = () => {
  favoritesExpanded.value = !favoritesExpanded.value
}

// 持久化:三个 UI 状态都写回 localStorage,刷新后保持
watch(isCollapsed, (v) => writeBool(STORAGE_KEY_COLLAPSED, v))
watch(favoritesExpanded, (v) => writeBool(STORAGE_KEY_FAV_EXPANDED, v))

// 点击常用工具
const openFavoriteTool = (tool) => {
  const path = getToolPath(tool)
  if (path) {
    router.push(path)
  } else {
    ElMessage.info(`${getToolName(tool)} - ${t('common.comingSoon')}`)
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
  'multi-print': '/toolbox/multi-print',
}

const getToolPath = (tool) => toolPathMap[tool.id] ?? null

// 工具箱里实际可用的工具数量(基于路由派生,不再硬编码 5)
// TODO 未来若有 per-tool enable/disable 开关,这里改成读取启用列表的长度
const enabledToolsCount = computed(() => Object.keys(toolPathMap).length)

// 菜单结构:每次 t() 重算保证语言切换时即时更新;图标用 markRaw 避免被 Vue 包成响应式
const menuSections = computed(() => [
  {
    name: t('sidebar.knowledge'),
    key: 'knowledge',
    items: [
      { title: t('sidebar.documents'), path: '/notes', icon: markRaw(Document) },
      { title: t('sidebar.credentials'), path: '/passwords', icon: markRaw(Lock) },
      { title: t('sidebar.bookmarks'), path: '/bookmarks', icon: markRaw(Link) }
    ]
  },
  {
    name: t('sidebar.ai'),
    key: 'ai',
    items: [
      { title: t('sidebar.aiConversation'), path: '/ai-conversation', icon: markRaw(ChatLineRound) },
      { title: t('sidebar.aiChat'), path: '/ai-chat', icon: markRaw(ChatDotRound) },
      { title: t('sidebar.agentTeam'), path: '/agent-team', icon: markRaw(UserFilled) },
      { title: t('sidebar.chat'), path: '/chat', icon: markRaw(ChatRound) }
    ]
  },
  {
    name: t('sidebar.efficiency'),
    key: 'efficiency',
    items: [
      { title: t('sidebar.todos'), path: '/todos', icon: markRaw(List) },
      { title: t('sidebar.calendar'), path: '/calendar', icon: markRaw(Calendar) }
    ]
  }
])

// 分类展开状态:从 localStorage 恢复,默认全部展开
const sectionExpanded = reactive(
  readJSON(STORAGE_KEY_SECTIONS, { knowledge: true, ai: true, efficiency: true })
)
// 兜底:如果 storage 里有的 key 现在已经被删,或新增的 key 没有,补默认值
;['knowledge', 'ai', 'efficiency'].forEach(k => {
  if (typeof sectionExpanded[k] !== 'boolean') sectionExpanded[k] = true
})
watch(sectionExpanded, (v) => writeJSON(STORAGE_KEY_SECTIONS, v), { deep: true })

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 切换分类展开/收起
const toggleSection = (key) => {
  sectionExpanded[key] = !sectionExpanded[key]
}

// active 判断:支持子路由前缀匹配。
//   '/' 仅精确匹配根路径(否则任何路径都会是 dashboard active)
//   其他路径:相等 OR 当前路径以 path+'/' 开头(比如 /toolbox 匹配 /toolbox/ssh-terminal)
const isActive = (path) => {
  if (!path) return false
  const cur = currentPath.value
  if (path === '/') return cur === '/'
  return cur === path || cur.startsWith(path + '/')
}

// 导航
const navigateTo = (path) => {
  if (!path) return
  router.push(path)
}
</script>

<style scoped>
.productivity-sidebar {
  width: var(--sidebar-width);
  background:
    radial-gradient(circle at -4% -5%, color-mix(in srgb, var(--accent-blue-bg) 72%, transparent 28%), transparent 38%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-panel) 90%, white 10%), color-mix(in srgb, var(--surface-panel-soft) 88%, transparent 12%));
  border-right: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-smooth), background var(--transition-smooth);
  flex-shrink: 0;
  box-shadow: inset -1px 0 0 var(--surface-muted);
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
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--divider);
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
  border-radius: 12px;
  justify-content: center;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-panel-soft) 82%, transparent 18%);
  border: 1px solid var(--divider);
  transition: all var(--transition-fast);
}

.collapse-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
  transform: var(--interactive-lift);
  box-shadow: var(--shadow-sm);
}

/* 顶部固定区域 — 不参与滚动 */
.sidebar-top {
  flex-shrink: 0;
  padding: 8px 0 6px;
  border-bottom: 1px solid var(--divider);
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
  border-top: 1px solid var(--divider);
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-panel-soft) 74%, transparent 26%), color-mix(in srgb, var(--surface-panel) 88%, transparent 12%));
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
  color: color-mix(in srgb, var(--text-tertiary) 88%, var(--el-text-color-primary) 12%);
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
  min-height: 38px;
  padding: 8px 12px 8px 14px;
  margin: 1px 10px;
  font-size: 13px;
  font-weight: 500;
  color: color-mix(in srgb, var(--text-primary) 88%, transparent 12%);
  border-radius: 11px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
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
  border-radius: 8px;
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
  background: color-mix(in srgb, var(--accent-blue-bg) 46%, transparent 54%);
  border-color: color-mix(in srgb, var(--accent-blue) 26%, transparent 74%);
  box-shadow: var(--shadow-sm);
  transform: var(--interactive-lift);
}

.menu-item:hover .el-icon {
  color: rgba(60, 40, 20, 0.92);
}

.menu-item:hover .menu-icon-shell {
  background: color-mix(in srgb, var(--accent-blue-bg) 56%, transparent 44%);
}

/* 选中态 */
.menu-item.active {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-blue-bg) 78%, white 22%), color-mix(in srgb, var(--accent-blue-bg) 92%, transparent 8%));
  color: color-mix(in srgb, var(--accent-blue) 84%, var(--el-text-color-primary) 16%);
  font-weight: 600;
  border-color: color-mix(in srgb, var(--accent-blue) 32%, transparent 68%);
  box-shadow: 0 8px 14px rgba(194, 65, 12, 0.16);
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fb923c, #c2410c);
}

.menu-item.active .el-icon {
  color: var(--accent-blue);
}

.menu-item.active .menu-icon-shell {
  background: color-mix(in srgb, var(--accent-blue-bg) 82%, transparent 18%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-blue) 24%, transparent 76%);
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

