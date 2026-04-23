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
  background:
    radial-gradient(circle at 18% 0%, #f3f7ff 0%, transparent 38%),
    radial-gradient(circle at 85% 8%, #f8fafc 0%, transparent 34%),
    #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e8edf4;
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
  color: #94a3b8;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.breadcrumb .el-icon {
  font-size: 18px;
  color: #2563eb;
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
  color: #64748b;
}

.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 16px 16px;
  background: #f8fafd;
  border: 1px solid #e6ecf3;
  border-radius: 18px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
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
  border: 1px solid #e7edf4;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
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
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  user-select: none;
  margin-bottom: 10px;
  border-bottom: 1px dashed #e8edf4;
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
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-variant-numeric: tabular-nums;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 98px;
  padding: 16px 10px 14px;
  background: #ffffff;
  border: 1px solid #e7edf4;
  border-radius: 12px;
  cursor: pointer;
  transition: transform var(--transition-normal), border-color var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal);
  user-select: none;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.04);
}

.tool-card:hover {
  transform: translateY(-2px);
  background: #fbfdff;
  border-color: #d7e3f6;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.1);
}

.tool-icon {
  font-size: 28px;
  margin-bottom: 9px;
  transition: transform var(--transition-normal), filter var(--transition-normal);
}

.tool-card:hover .tool-icon {
  transform: translateY(-1px) scale(1.03);
  filter: saturate(1.08);
}

.tool-name {
  font-size: 12px;
  color: #475569;
  text-align: center;
  font-weight: 600;
  line-height: 1.3;
  transition: color var(--transition-fast);
}

.tool-card:hover .tool-name {
  color: #0f172a;
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
  outline: 2px solid rgba(37, 99, 235, 0.32);
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
  position: absolute;
  bottom: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.22;
  transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
  color: #94a3b8;
  z-index: 1;
}

.tool-card:hover .favorite-btn {
  opacity: 0.78;
  background: #f8fafc;
}

.favorite-btn.starred {
  opacity: 1 !important;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.09);
}

.favorite-btn:hover {
  opacity: 1 !important;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.11);
}

.favorite-btn .el-icon {
  font-size: 12px;
}

:deep(.header-actions .el-button) {
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.16);
}
</style>
