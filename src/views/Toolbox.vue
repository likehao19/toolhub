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
          <el-icon style="color: #f59e0b"><StarFilled /></el-icon>
          {{ t('toolbox.favHint') }}
        </span>
        <el-button type="primary" size="small" @click="goToSettings">
          <el-icon><Setting /></el-icon>
          {{ t('toolbox.customizeToolbox') }}
        </el-button>
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
            <div class="tool-icon">{{ tool.icon }}</div>
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
}

const allCategories = computed(() => [
  {
    name: 'note',
    label: t('toolbox.categories.note'),
    tools: [
      { id: 'sticky-notes', name: t('toolbox.tools.stickyNotes'), icon: '📌' },
      { id: 'ebook-shelf', name: t('toolbox.tools.ebookShelf'), icon: '📚' },
      { id: 'screenshot', name: t('toolbox.tools.screenshot'), icon: '📸' },
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
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
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
  gap: 3px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb .el-icon {
  font-size: 16px;
  color: var(--accent-blue);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.fav-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 18px 18px;
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.72), rgba(241, 245, 249, 0.62));
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 12px 28px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(18px);
}

.toolbox-workspace {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 18px;
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
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.toolbox-workspace::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

.tool-category {
  margin-bottom: 14px;
  padding: 14px 16px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(248, 250, 252, 0.28));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(14px);
}

.tool-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px 10px;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  user-select: none;
  margin-bottom: 12px;
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.46);
  border: 1px solid rgba(15, 23, 42, 0.05);
  font-variant-numeric: tabular-nums;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(102px, 1fr));
  gap: 10px;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 92px;
  padding: 16px 10px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(244, 247, 251, 0.3));
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 16px;
  cursor: pointer;
  transition: transform var(--transition-normal), border-color var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal);
  user-select: none;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.62) inset;
}

.tool-card:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(240, 246, 255, 0.62));
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.tool-icon {
  font-size: 26px;
  margin-bottom: 8px;
  transition: transform var(--transition-normal), filter var(--transition-normal);
}

.tool-card:hover .tool-icon {
  transform: translateY(-1px) scale(1.03);
  filter: saturate(1.05);
}

.tool-name {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  text-align: center;
  font-weight: var(--font-weight-medium);
  line-height: 1.35;
  transition: color var(--transition-fast);
}

.tool-card:hover .tool-name {
  color: var(--text-primary);
}

.tool-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 38%);
}

.tool-card > * {
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .content-area {
    margin: 12px;
    border-radius: 18px;
  }

  .toolbox-workspace {
    padding: 14px;
  }

  .tool-category {
    padding: 12px 12px 14px;
  }

  .tool-grid {
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 8px;
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
  outline: 2px solid rgba(59, 130, 246, 0.35);
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 38%);
}

/* 收藏按钮 */
.favorite-btn {
  position: absolute;
  bottom: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.25;
  transition: opacity var(--transition-fast), color var(--transition-fast);
  color: var(--text-tertiary);
  z-index: 1;
}

.tool-card:hover .favorite-btn {
  opacity: 0.7;
}

.favorite-btn.starred {
  opacity: 1 !important;
  color: #f59e0b;
}

.favorite-btn:hover {
  opacity: 1 !important;
  color: #f59e0b;
}

.favorite-btn .el-icon {
  font-size: 12px;
}
</style>
