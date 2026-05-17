<template>
  <div class="toolbox-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Workspace Tools</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span>{{ t('toolbox.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span class="fav-hint">
          <el-icon style="color: var(--color-orange)"><StarFilled /></el-icon>
          {{ t('toolbox.favHint') }}
        </span>
      </div>
    </div>

    <div class="content-area">
      <div class="toolbox-workspace">
      <div
        class="tool-category"
        v-for="category in allCategories"
        :key="category.name"
      >
        <div class="category-header">
          <ToolIcon class="category-icon" :id="category.name" type="category" />
          <span>{{ category.label }}</span>
          <span class="category-count">{{ category.tools.length }}</span>
        </div>
        <div class="tool-grid">
          <div
            v-for="tool in category.tools"
            :key="tool.id"
            class="tool-card"
            @click="openTool(tool)"
          >
            <div class="tool-icon"><ToolIcon :id="tool.id" :fallback="tool.icon" /></div>
            <div class="tool-name">{{ tool.name }}</div>
            <div
              class="favorite-btn"
              :class="{ starred: isFavorite(tool.id) }"
              @click.stop="toggleFavorite(tool)"
              :title="isFavorite(tool.id) ? t('toolbox.removeFav') : t('toolbox.addFav')"
            >
              <el-icon>
                <StarFilled v-if="isFavorite(tool.id)" />
                <Star v-else />
              </el-icon>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Briefcase, Setting, Star, StarFilled } from '@element-plus/icons-vue'
import { useFavoriteTools } from '@/composables/useFavoriteTools'
import { t } from '@/i18n'
import ToolIcon from '@/components/ToolIcon.vue'

const router = useRouter()
const { toggleFavorite, isFavorite } = useFavoriteTools()

const toolPathMap = {
  'sticky-notes': '/toolbox/sticky-notes',
  'ebook-shelf': '/toolbox/ebook-shelf',
  screenshot: '/toolbox/screenshot',
  'sdk-manager': '/toolbox/sdk-manager',
  'code-formatter': '/toolbox/code-formatter',
  'regex-tester': '/toolbox/regex-tester',
  'hex-converter': '/toolbox/hex-converter',
  crypto: '/toolbox/crypto-tool',
  'git-manager': '/toolbox/git-manager',
  'git-daily-report': '/toolbox/git-daily-report',
  'file-compare': '/toolbox/file-diff',
  'port-manager': '/toolbox/port-manager',
  'ip-lookup': '/toolbox/ip-lookup',
  'dns-lookup': '/toolbox/dns-lookup',
  'speed-test': '/toolbox/speed-test',
  'websocket-test': '/toolbox/websocket-test',
  'api-debug': '/toolbox/api-debug',
  'api-docs-page': '/toolbox/api-docs',
  'mock-service': '/toolbox/mock-service',
  'perf-test': '/toolbox/perf-test',
  'auto-test': '/toolbox/auto-test',
  'redis-client': '/toolbox/redis-client',
  'sqlite-manager': '/toolbox/sqlite-manager',
  'maven-repo': '/toolbox/maven-repo',
  'log-analyzer': '/toolbox/log-analyzer',
  'image-format': '/toolbox/image-format-converter',
  'image-to-base64': '/toolbox/image-to-base64',
  'wallpaper-manager': '/toolbox/wallpaper-manager',
  'hardware-info': '/toolbox/hardware-info',
  'download-manager': '/toolbox/download-manager',
  'ssh-terminal': '/toolbox/ssh-terminal',
  'multi-print': '/toolbox/multi-print',
}

const allCategories = computed(() => [
  {
    name: 'note',
    label: t('toolbox.categories.note'),
    tools: [
      { id: 'sticky-notes', name: t('toolbox.tools.stickyNotes'), icon: '📌' },
      { id: 'ebook-shelf', name: t('toolbox.tools.ebookShelf'), icon: '📚' },
      { id: 'screenshot', name: t('toolbox.tools.screenshot'), icon: '📸' },
      { id: 'multi-print', name: t('toolbox.tools.multiPrint'), icon: '🖨️' },
    ]
  },
  {
    name: 'dev',
    label: t('toolbox.categories.dev'),
    tools: [
      { id: 'sdk-manager', name: t('toolbox.tools.sdkManager'), icon: '📦' },
      { id: 'code-formatter', name: t('toolbox.tools.codeFormatter'), icon: '✨' },
      { id: 'regex-tester', name: t('toolbox.tools.regexTester'), icon: '🎨' },
      { id: 'hex-converter', name: t('toolbox.tools.hexConverter'), icon: '🔢' },
      { id: 'crypto', name: t('toolbox.tools.crypto'), icon: '🔐' },
      { id: 'maven-repo', name: t('toolbox.tools.mavenRepo'), icon: '☕' },
    ]
  },
  {
    name: 'git',
    label: t('toolbox.categories.git'),
    tools: [
      { id: 'git-manager', name: t('toolbox.tools.gitManager'), icon: '🔀' },
      { id: 'git-daily-report', name: t('toolbox.tools.gitDailyReport'), icon: '📊' },
      { id: 'file-compare', name: t('toolbox.tools.fileCompare'), icon: '⚖️' },
    ]
  },
  {
    name: 'network',
    label: t('toolbox.categories.network'),
    tools: [
      { id: 'port-manager', name: t('toolbox.tools.portManager'), icon: '🔌' },
      { id: 'ip-lookup', name: t('toolbox.tools.ipLookup'), icon: '📡' },
      { id: 'dns-lookup', name: t('toolbox.tools.dnsLookup'), icon: '🌐' },
      { id: 'speed-test', name: t('toolbox.tools.speedTest'), icon: '⚡' },
      { id: 'websocket-test', name: t('toolbox.tools.websocketTest'), icon: '🔌' },
      { id: 'download-manager', name: t('toolbox.tools.downloadManager'), icon: '⬇️' },
      { id: 'ssh-terminal', name: t('toolbox.tools.sshTerminal'), icon: '🖥️' },
    ]
  },
  {
    name: 'test',
    label: t('toolbox.categories.test'),
    tools: [
      { id: 'api-debug', name: t('toolbox.tools.apiDebug'), icon: '🔗' },
      { id: 'api-docs-page', name: t('toolbox.tools.apiDocsPage'), icon: '📚' },
      { id: 'mock-service', name: t('toolbox.tools.mockService'), icon: '🎭' },
      { id: 'perf-test', name: t('toolbox.tools.perfTest'), icon: '💪' },
      { id: 'auto-test', name: t('toolbox.tools.autoTest'), icon: '✅' },
    ]
  },
  {
    name: 'database',
    label: t('toolbox.categories.database'),
    tools: [
      { id: 'redis-client', name: t('toolbox.tools.redisClient'), icon: '🔴' },
      { id: 'sqlite-manager', name: t('toolbox.tools.sqliteManager'), icon: '🗄️' },
    ]
  },
  {
    name: 'dataAnalysis',
    label: t('toolbox.categories.dataAnalysis'),
    tools: [
      { id: 'log-analyzer', name: t('toolbox.tools.logAnalyzer'), icon: '📜' },
    ]
  },
  {
    name: 'image',
    label: t('toolbox.categories.image'),
    tools: [
      { id: 'image-format', name: t('toolbox.tools.imageFormat'), icon: '🔄' },
      { id: 'image-to-base64', name: t('toolbox.tools.imageToBase64'), icon: '🔤' },
      { id: 'wallpaper-manager', name: t('toolbox.tools.wallpaperManager'), icon: '🖼️' },
    ]
  },
  {
    name: 'system',
    label: t('toolbox.categories.system'),
    tools: [
      { id: 'hardware-info', name: t('toolbox.tools.hardwareInfo'), icon: '🖥️' },
    ]
  },
])

const openTool = (tool) => {
  const path = toolPathMap[tool.id]
  if (path) {
    router.push(path)
  }
}

const goToSettings = () => {
  router.push('/settings?tab=workspace')
}
</script>

<style scoped>
.toolbox-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 0%, var(--accent-warm-soft) 0%, transparent 38%),
    radial-gradient(circle at 85% 8%, var(--bg-secondary) 0%, transparent 34%),
    var(--surface-page);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: var(--surface-panel);
  border-bottom: 1px solid var(--divider);
  min-height: 62px;
  box-sizing: border-box;
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.breadcrumb .el-icon {
  font-size: 18px;
  color: var(--accent-blue);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fav-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 16px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: 0 8px 22px rgba(60, 40, 20, 0.05);
}

.toolbox-workspace {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 16px;
  scrollbar-gutter: stable;
}

.toolbox-workspace::-webkit-scrollbar {
  width: 6px;
}

.toolbox-workspace::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.toolbox-workspace::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.52);
  border-radius: 999px;
}

.toolbox-workspace::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.62);
}

.tool-category {
  margin-bottom: 12px;
  padding: 14px 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--divider);
  background: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(60, 40, 20, 0.03);
}

.tool-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-regular);
  user-select: none;
  margin-bottom: 10px;
  border-bottom: 1px dashed var(--divider);
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--surface-panel-soft);
  border: 1px solid var(--border-color);
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.category-icon {
  font-size: 16px;
  color: var(--accent-warm);
  flex-shrink: 0;
  display: flex;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px;
  background: var(--bg-primary);
  border: 1px solid var(--divider);
  border-radius: 8px;
  cursor: pointer;
  transition: transform var(--transition-normal), border-color var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal);
  user-select: none;
  box-shadow: 0 1px 3px rgba(60, 40, 20, 0.04);
}

.tool-card:hover {
  background: var(--accent-warm-soft);
  border-color: color-mix(in srgb, var(--accent-blue) 28%, var(--divider) 72%);
  box-shadow: 0 4px 10px rgba(194, 65, 12, 0.08);
}

.tool-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition-normal);
}

.tool-card:hover .tool-icon {
  transform: scale(1.06);
}

.tool-name {
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;
  font-weight: 500;
  line-height: 1.3;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);
}

.tool-card:hover .tool-name {
  color: var(--text-primary);
}

.tool-card::after {
  content: none;
}

.tool-card > * {
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
    min-height: 56px;
  }

  .breadcrumb {
    font-size: 16px;
  }

  .fav-hint {
    display: none;
  }

  .content-area {
    margin: 10px;
    border-radius: 14px;
  }

  .toolbox-workspace {
    padding: 12px;
  }

  .tool-category {
    padding: 12px;
  }

  .tool-grid {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 8px;
  }

  .tool-card {
    min-height: 92px;
    padding: 12px 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-card,
  .tool-icon,
  .tool-name {
    transition: none;
  }
}

.tool-card:focus-visible {
  outline: 2px solid rgba(194, 65, 12, 0.32);
  outline-offset: 2px;
}

.tool-card:active {
  transform: translateY(0);
}

.tool-card:active .tool-icon {
  transform: scale(0.98);
}

.tool-card:active .tool-name {
  color: var(--text-primary);
}

.tool-card:active::after {
  content: none;
}

/* 收藏按钮 */
.favorite-btn {
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.22;
  transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
  color: var(--text-quaternary);
}

.tool-card:hover .favorite-btn {
  opacity: 0.78;
  background: var(--surface-hover);
}

.favorite-btn.starred {
  opacity: 1 !important;
  color: var(--color-orange);
  background: rgba(245, 158, 11, 0.09);
}

.favorite-btn:hover {
  opacity: 1 !important;
  color: var(--color-orange);
  background: rgba(245, 158, 11, 0.11);
}

.favorite-btn .el-icon {
  font-size: 12px;
}

:deep(.header-actions .el-button) {
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 6px 12px rgba(194, 65, 12, 0.16);
}
</style>
