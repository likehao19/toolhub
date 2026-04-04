<template>
  <div class="toolbox-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Briefcase /></el-icon>
          {{ t('toolbox.title') }}
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
      <div
        class="tool-category"
        v-for="category in allCategories"
        :key="category.name"
      >
        <div class="category-header">
          <span>{{ category.label }}</span>
        </div>
        <div class="tool-grid">
          <div
            v-for="tool in category.tools"
            :key="tool.id"
            class="tool-card"
            :class="{ disabled: !tool.enabled }"
            @click="openTool(tool)"
          >
            <div class="tool-icon">{{ tool.icon }}</div>
            <div class="tool-name">{{ tool.name }}</div>
            <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">{{ t('toolbox.inDev') }}</el-tag>
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
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Briefcase, Setting, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useFavoriteTools } from '@/composables/useFavoriteTools'
import { t } from '@/i18n'

const router = useRouter()
const { toggleFavorite, isFavorite } = useFavoriteTools()

// 笔记工具
const noteTools = computed(() => [
  { id: 'sticky-notes', name: t('toolbox.tools.stickyNotes'), icon: '📌', type: 'window', enabled: true },
  { id: 'ebook-shelf', name: t('toolbox.tools.ebookShelf'), icon: '📚', type: 'page', enabled: true },
  { id: 'whiteboard', name: t('toolbox.tools.whiteboard'), icon: '✏️', type: 'window', enabled: false },
  { id: 'code-snippet', name: t('toolbox.tools.codeSnippet'), icon: '📋', type: 'window', enabled: false },
  { id: 'screenshot', name: t('toolbox.tools.screenshot'), icon: '📸', type: 'page', enabled: true },
  { id: 'markdown-editor', name: t('toolbox.tools.markdownEditor'), icon: '📝', type: 'window', enabled: false },
  { id: 'mind-map', name: t('toolbox.tools.mindMap'), icon: '🧠', type: 'window', enabled: false },
  { id: 'flowchart', name: t('toolbox.tools.flowchart'), icon: '📊', type: 'window', enabled: false },
  { id: 'rich-text', name: t('toolbox.tools.richText'), icon: '📄', type: 'window', enabled: false }
])

// 开发工具
const devTools = computed(() => [
  { id: 'sdk-manager', name: t('toolbox.tools.sdkManager'), icon: '📦', type: 'page', enabled: true },
  { id: 'redis-client', name: t('toolbox.tools.redisClient'), icon: '🔴', type: 'page', enabled: true },
  { id: 'sqlite-manager', name: t('toolbox.tools.sqliteManager'), icon: '🗄️', type: 'page', enabled: true },
  { id: 'maven-repo', name: t('toolbox.tools.mavenRepo'), icon: '☕', type: 'page', enabled: true },
  { id: 'json-formatter', name: t('toolbox.tools.jsonFormatter'), icon: '🔄', type: 'window', enabled: false },
  { id: 'json-diff', name: t('toolbox.tools.jsonDiff'), icon: '🔍', type: 'window', enabled: false },
  { id: 'json-to-ts', name: t('toolbox.tools.jsonToTs'), icon: '📦', type: 'window', enabled: false },
  { id: 'json-to-java', name: t('toolbox.tools.jsonToJava'), icon: '☕', type: 'window', enabled: false },
  { id: 'regex-tester', name: t('toolbox.tools.regexTester'), icon: '🎨', type: 'page', enabled: true },
  { id: 'cron-parser', name: t('toolbox.tools.cronParser'), icon: '⏰', type: 'window', enabled: false },
  { id: 'crypto', name: t('toolbox.tools.crypto'), icon: '🔐', type: 'page', enabled: true },
  { id: 'hash-generator', name: t('toolbox.tools.hashGenerator'), icon: '#️⃣', type: 'window', enabled: false },
  { id: 'url-encoder', name: t('toolbox.tools.urlEncoder'), icon: '🌐', type: 'window', enabled: false },
  { id: 'base64', name: 'Base64', icon: '🔤', type: 'window', enabled: false },
  { id: 'api-tester', name: t('toolbox.tools.apiTester'), icon: '📡', type: 'window', enabled: false },
  { id: 'sql-formatter', name: t('toolbox.tools.sqlFormatter'), icon: '🧪', type: 'window', enabled: false },
  { id: 'sql-generator', name: t('toolbox.tools.sqlGenerator'), icon: '⚡', type: 'window', enabled: false },
  { id: 'timestamp', name: t('toolbox.tools.timestamp'), icon: '🕐', type: 'window', enabled: false },
  { id: 'date-calculator', name: t('toolbox.tools.dateCalculator'), icon: '📅', type: 'window', enabled: false },
  { id: 'diff-checker', name: t('toolbox.tools.diffChecker'), icon: '📊', type: 'window', enabled: false },
  { id: 'uuid-generator', name: t('toolbox.tools.uuidGenerator'), icon: '🎲', type: 'window', enabled: false },
  { id: 'random-data', name: t('toolbox.tools.randomData'), icon: '🎰', type: 'window', enabled: false },
  { id: 'jwt-decoder', name: t('toolbox.tools.jwtDecoder'), icon: '🔓', type: 'window', enabled: false },
  { id: 'xml-formatter', name: t('toolbox.tools.xmlFormatter'), icon: '📋', type: 'window', enabled: false },
  { id: 'yaml-formatter', name: t('toolbox.tools.yamlFormatter'), icon: '📝', type: 'window', enabled: false },
  { id: 'html-encoder', name: t('toolbox.tools.htmlEncoder'), icon: '🌐', type: 'window', enabled: false },
  { id: 'ascii-converter', name: t('toolbox.tools.asciiConverter'), icon: '🔡', type: 'window', enabled: false },
  { id: 'unicode-converter', name: t('toolbox.tools.unicodeConverter'), icon: '🔠', type: 'window', enabled: false }
])

// 编码转换
const encodingTools = computed(() => [
  { id: 'charset-detect', name: t('toolbox.tools.charsetDetect'), icon: '🔍', type: 'window', enabled: false },
  { id: 'charset-convert', name: t('toolbox.tools.charsetConvert'), icon: '🔄', type: 'window', enabled: false },
  { id: 'hex-converter', name: t('toolbox.tools.hexConverter'), icon: '🔢', type: 'window', enabled: false },
  { id: 'morse-code', name: t('toolbox.tools.morseCode'), icon: '📻', type: 'window', enabled: false },
  { id: 'binary-converter', name: t('toolbox.tools.binaryConverter'), icon: '💾', type: 'window', enabled: false },
  { id: 'color-converter', name: t('toolbox.tools.colorConverter'), icon: '🎨', type: 'window', enabled: false }
])

// 文件处理
const fileTools = computed(() => [
  { id: 'file-hash', name: t('toolbox.tools.fileHash'), icon: '🔐', type: 'window', enabled: false },
  { id: 'file-merge', name: t('toolbox.tools.fileMerge'), icon: '📎', type: 'window', enabled: false },
  { id: 'file-split', name: t('toolbox.tools.fileSplit'), icon: '✂️', type: 'window', enabled: false },
  { id: 'file-rename', name: t('toolbox.tools.fileRename'), icon: '📝', type: 'window', enabled: false },
  { id: 'duplicate-finder', name: t('toolbox.tools.duplicateFinder'), icon: '🔎', type: 'window', enabled: false },
  { id: 'file-compare', name: t('toolbox.tools.fileCompare'), icon: '⚖️', type: 'page', enabled: true },
  { id: 'csv-parser', name: t('toolbox.tools.csvParser'), icon: '📊', type: 'window', enabled: false },
  { id: 'excel-viewer', name: t('toolbox.tools.excelViewer'), icon: '📈', type: 'window', enabled: false },
  { id: 'pdf-tool', name: t('toolbox.tools.pdfTool'), icon: '📕', type: 'window', enabled: false },
  { id: 'zip-tool', name: t('toolbox.tools.zipTool'), icon: '📦', type: 'window', enabled: false }
])

// 图片工具
const imageTools = computed(() => [
  { id: 'image-compress', name: t('toolbox.tools.imageCompress'), icon: '🗜️', type: 'window', enabled: false },
  { id: 'image-resize', name: t('toolbox.tools.imageResize'), icon: '📏', type: 'window', enabled: false },
  { id: 'image-crop', name: t('toolbox.tools.imageCrop'), icon: '✂️', type: 'window', enabled: false },
  { id: 'image-format', name: t('toolbox.tools.imageFormat'), icon: '🔄', type: 'page', enabled: true },
  { id: 'wallpaper-manager', name: t('toolbox.tools.wallpaperManager'), icon: '🖼️', type: 'page', enabled: true },
  { id: 'image-watermark', name: t('toolbox.tools.imageWatermark'), icon: '💧', type: 'window', enabled: false },
  { id: 'icon-generator', name: t('toolbox.tools.iconGenerator'), icon: '🎨', type: 'window', enabled: false },
  { id: 'sprite-sheet', name: t('toolbox.tools.spriteSheet'), icon: '🖼️', type: 'window', enabled: false },
  { id: 'image-to-base64', name: t('toolbox.tools.imageToBase64'), icon: '🔤', type: 'page', enabled: true }
])

// 实用工具
const utilityTools = computed(() => [
  { id: 'calculator', name: t('toolbox.tools.calculator'), icon: '🧮', type: 'window', enabled: false },
  { id: 'scientific-calc', name: t('toolbox.tools.scientificCalc'), icon: '🔬', type: 'window', enabled: false },
  { id: 'programmer-calc', name: t('toolbox.tools.programmerCalc'), icon: '💻', type: 'window', enabled: false },
  { id: 'pomodoro', name: t('toolbox.tools.pomodoro'), icon: '⏱️', type: 'window', enabled: false },
  { id: 'stopwatch', name: t('toolbox.tools.stopwatch'), icon: '⏰', type: 'window', enabled: false },
  { id: 'countdown', name: t('toolbox.tools.countdown'), icon: '⏳', type: 'window', enabled: false },
  { id: 'unit-converter', name: t('toolbox.tools.unitConverter'), icon: '📐', type: 'window', enabled: false },
  { id: 'currency-converter', name: t('toolbox.tools.currencyConverter'), icon: '💱', type: 'window', enabled: false },
  { id: 'color-picker', name: t('toolbox.tools.colorPicker'), icon: '🎨', type: 'window', enabled: false },
  { id: 'ruler', name: t('toolbox.tools.ruler'), icon: '📏', type: 'window', enabled: false },
  { id: 'screen-recorder', name: t('toolbox.tools.screenRecorder'), icon: '📹', type: 'window', enabled: false },
  { id: 'qrcode-generator', name: t('toolbox.tools.qrcodeGenerator'), icon: '📱', type: 'window', enabled: false },
  { id: 'qrcode-scanner', name: t('toolbox.tools.qrcodeScanner'), icon: '📲', type: 'window', enabled: false },
  { id: 'barcode-generator', name: t('toolbox.tools.barcodeGenerator'), icon: '🏷️', type: 'window', enabled: false }
])

// Git工具
const gitTools = computed(() => [
  { id: 'git-manager', name: t('toolbox.tools.gitManager'), icon: '🔀', type: 'page', enabled: true },
  { id: 'git-daily-report', name: t('toolbox.tools.gitDailyReport'), icon: '📊', type: 'page', enabled: true },
  { id: 'git-graph', name: t('toolbox.tools.gitGraph'), icon: '🌳', type: 'window', enabled: false },
  { id: 'git-diff', name: t('toolbox.tools.gitDiff'), icon: '🔄', type: 'window', enabled: false },
  { id: 'git-ignore', name: t('toolbox.tools.gitIgnore'), icon: '🚫', type: 'window', enabled: false },
  { id: 'commit-msg', name: t('toolbox.tools.commitMsg'), icon: '📝', type: 'window', enabled: false },
  { id: 'changelog', name: t('toolbox.tools.changelog'), icon: '📋', type: 'window', enabled: false }
])

// 数据库工具
const databaseTools = computed(() => [
  { id: 'sql-client', name: t('toolbox.tools.sqlClient'), icon: '🗄️', type: 'window', enabled: false },
  { id: 'redis-client', name: t('toolbox.tools.redisClient'), icon: '🔴', type: 'window', enabled: false },
  { id: 'mongodb-client', name: t('toolbox.tools.mongodbClient'), icon: '🍃', type: 'window', enabled: false },
  { id: 'db-compare', name: t('toolbox.tools.dbCompare'), icon: '⚖️', type: 'window', enabled: false },
  { id: 'er-diagram', name: t('toolbox.tools.erDiagram'), icon: '📊', type: 'window', enabled: false },
  { id: 'data-generator', name: t('toolbox.tools.dataGenerator'), icon: '🎲', type: 'window', enabled: false }
])

// 效率工具
const efficiencyTools = computed(() => [
  { id: 'kanban', name: t('toolbox.tools.kanban'), icon: '📊', type: 'page', enabled: false },
  { id: 'time-tracker', name: t('toolbox.tools.timeTracker'), icon: '📈', type: 'page', enabled: false },
  { id: 'habit-tracker', name: t('toolbox.tools.habitTracker'), icon: '✅', type: 'page', enabled: false },
  { id: 'focus-mode', name: t('toolbox.tools.focusMode'), icon: '🎯', type: 'window', enabled: false },
  { id: 'break-reminder', name: t('toolbox.tools.breakReminder'), icon: '☕', type: 'window', enabled: false },
  { id: 'quick-launcher', name: t('toolbox.tools.quickLauncher'), icon: '🚀', type: 'window', enabled: false },
  { id: 'workflow-automation', name: t('toolbox.tools.workflowAutomation'), icon: '⚙️', type: 'window', enabled: false },
  { id: 'template-manager', name: t('toolbox.tools.templateManager'), icon: '📋', type: 'window', enabled: false },
  { id: 'goal-tracker', name: t('toolbox.tools.goalTracker'), icon: '🎯', type: 'window', enabled: false },
  { id: 'project-timer', name: t('toolbox.tools.projectTimer'), icon: '⏱️', type: 'window', enabled: false },
  { id: 'meeting-notes', name: t('toolbox.tools.meetingNotes'), icon: '📝', type: 'window', enabled: false },
  { id: 'daily-report', name: t('toolbox.tools.dailyReport'), icon: '📊', type: 'window', enabled: false },
  { id: 'okr-manager', name: t('toolbox.tools.okrManager'), icon: '🎯', type: 'window', enabled: false },
  { id: 'sprint-planner', name: t('toolbox.tools.sprintPlanner'), icon: '⚡', type: 'window', enabled: false },
  { id: 'retrospective', name: t('toolbox.tools.retrospective'), icon: '🔄', type: 'window', enabled: false },
  { id: 'eisenhower-matrix', name: t('toolbox.tools.eisenhowerMatrix'), icon: '📐', type: 'window', enabled: false },
  { id: 'gtd-tool', name: t('toolbox.tools.gtdTool'), icon: '✅', type: 'window', enabled: false },
  { id: 'brainstorm', name: t('toolbox.tools.brainstorm'), icon: '💡', type: 'window', enabled: false }
])

// 网络工具
const networkTools = computed(() => [
  { id: 'port-manager', name: t('toolbox.tools.portManager'), icon: '🔌', type: 'page', enabled: true },
  { id: 'port-checker', name: t('toolbox.tools.portChecker'), icon: '🌍', type: 'window', enabled: false },
  { id: 'port-scanner', name: t('toolbox.tools.portScanner'), icon: '🔍', type: 'window', enabled: false },
  { id: 'ip-lookup', name: t('toolbox.tools.ipLookup'), icon: '📡', type: 'window', enabled: false },
  { id: 'dns-lookup', name: t('toolbox.tools.dnsLookup'), icon: '🌐', type: 'window', enabled: false },
  { id: 'whois', name: t('toolbox.tools.whois'), icon: '🔎', type: 'window', enabled: false },
  { id: 'url-shortener', name: t('toolbox.tools.urlShortener'), icon: '🔗', type: 'window', enabled: false },
  { id: 'ping-test', name: t('toolbox.tools.pingTest'), icon: '📶', type: 'window', enabled: false },
  { id: 'traceroute', name: t('toolbox.tools.traceroute'), icon: '🛤️', type: 'window', enabled: false },
  { id: 'speed-test', name: t('toolbox.tools.speedTest'), icon: '⚡', type: 'window', enabled: false },
  { id: 'websocket-test', name: t('toolbox.tools.websocketTest'), icon: '🔌', type: 'window', enabled: false },
  { id: 'http-headers', name: t('toolbox.tools.httpHeaders'), icon: '📋', type: 'window', enabled: false }
])

// 前端工具
const frontendTools = computed(() => [
  { id: 'css-generator', name: t('toolbox.tools.cssGenerator'), icon: '🎨', type: 'window', enabled: false },
  { id: 'gradient-generator', name: t('toolbox.tools.gradientGenerator'), icon: '🌈', type: 'window', enabled: false },
  { id: 'shadow-generator', name: t('toolbox.tools.shadowGenerator'), icon: '🌑', type: 'window', enabled: false },
  { id: 'flexbox-generator', name: 'Flexbox', icon: '📦', type: 'window', enabled: false },
  { id: 'grid-generator', name: t('toolbox.tools.gridGenerator'), icon: '🔲', type: 'window', enabled: false },
  { id: 'svg-editor', name: t('toolbox.tools.svgEditor'), icon: '🖼️', type: 'window', enabled: false },
  { id: 'html-formatter', name: t('toolbox.tools.htmlFormatter'), icon: '📄', type: 'window', enabled: false },
  { id: 'css-minify', name: t('toolbox.tools.cssMinify'), icon: '📦', type: 'window', enabled: false },
  { id: 'js-minify', name: t('toolbox.tools.jsMinify'), icon: '📦', type: 'window', enabled: false },
  { id: 'html-escape', name: t('toolbox.tools.htmlEscape'), icon: '🔐', type: 'window', enabled: false }
])

// 后端工具
const backendTools = computed(() => [
  { id: 'maven-helper', name: t('toolbox.tools.mavenHelper'), icon: '🔧', type: 'window', enabled: false },
  { id: 'gradle-helper', name: t('toolbox.tools.gradleHelper'), icon: '🐘', type: 'window', enabled: false },
  { id: 'lombok-helper', name: t('toolbox.tools.lombokHelper'), icon: '☕', type: 'window', enabled: false },
  { id: 'mybatis-generator', name: t('toolbox.tools.mybatisGenerator'), icon: '🗄️', type: 'window', enabled: false },
  { id: 'swagger-parser', name: t('toolbox.tools.swaggerParser'), icon: '📖', type: 'window', enabled: false },
  { id: 'openapi-generator', name: t('toolbox.tools.openapiGenerator'), icon: '🎯', type: 'window', enabled: false },
  { id: 'pom-analyzer', name: t('toolbox.tools.pomAnalyzer'), icon: '📋', type: 'window', enabled: false }
])

// 测试工具
const testTools = computed(() => [
  { id: 'api-debug', name: t('toolbox.tools.apiDebug'), icon: '🔗', type: 'page', enabled: true },
  { id: 'api-docs-page', name: t('toolbox.tools.apiDocsPage'), icon: '📚', type: 'page', enabled: true },
  { id: 'mock-service', name: t('toolbox.tools.mockService'), icon: '🎭', type: 'page', enabled: true },
  { id: 'perf-test', name: t('toolbox.tools.perfTest'), icon: '💪', type: 'page', enabled: true },
  { id: 'auto-test', name: t('toolbox.tools.autoTest'), icon: '✅', type: 'page', enabled: true },
])

// 运维工具
const devopsTools = computed(() => [
  { id: 'log-viewer', name: t('toolbox.tools.logViewer'), icon: '📜', type: 'window', enabled: false },
  { id: 'log-parser', name: t('toolbox.tools.logParser'), icon: '🔍', type: 'window', enabled: false },
  { id: 'docker-manager', name: t('toolbox.tools.dockerManager'), icon: '🐋', type: 'window', enabled: false },
  { id: 'k8s-helper', name: t('toolbox.tools.k8sHelper'), icon: '☸️', type: 'window', enabled: false },
  { id: 'nginx-config', name: t('toolbox.tools.nginxConfig'), icon: '🌐', type: 'window', enabled: false },
  { id: 'cron-monitor', name: t('toolbox.tools.cronMonitor'), icon: '⏰', type: 'window', enabled: false },
  { id: 'system-monitor', name: t('toolbox.tools.systemMonitor'), icon: '📊', type: 'window', enabled: false },
  { id: 'process-monitor', name: t('toolbox.tools.processMonitor'), icon: '⚙️', type: 'window', enabled: false }
])

// 安全工具
const securityTools = computed(() => [
  { id: 'password-generator', name: t('toolbox.tools.passwordGenerator'), icon: '🔐', type: 'window', enabled: false },
  { id: 'password-strength', name: t('toolbox.tools.passwordStrength'), icon: '🔒', type: 'window', enabled: false },
  { id: 'rsa-tool', name: t('toolbox.tools.rsaTool'), icon: '🔑', type: 'window', enabled: false },
  { id: 'aes-tool', name: t('toolbox.tools.aesTool'), icon: '🔐', type: 'window', enabled: false },
  { id: 'certificate-viewer', name: t('toolbox.tools.certificateViewer'), icon: '📜', type: 'window', enabled: false }
])

// 文档工具
const documentTools = computed(() => [
  { id: 'api-doc', name: t('toolbox.tools.apiDoc'), icon: '📚', type: 'window', enabled: false },
  { id: 'markdown-toc', name: t('toolbox.tools.markdownToc'), icon: '📑', type: 'window', enabled: false },
  { id: 'readme-generator', name: t('toolbox.tools.readmeGenerator'), icon: '📄', type: 'window', enabled: false },
  { id: 'changelog-generator', name: t('toolbox.tools.changelogGenerator'), icon: '📝', type: 'window', enabled: false }
])

// 学习工具
const learningTools = computed(() => [
  { id: 'doc-search', name: t('toolbox.tools.docSearch'), icon: '📖', type: 'window', enabled: false },
  { id: 'code-generator', name: t('toolbox.tools.codeGenerator'), icon: '💡', type: 'window', enabled: false },
  { id: 'flashcard', name: t('toolbox.tools.flashcard'), icon: '🎓', type: 'window', enabled: false },
  { id: 'algorithm', name: t('toolbox.tools.algorithm'), icon: '🧬', type: 'window', enabled: false },
  { id: 'sql-practice', name: t('toolbox.tools.sqlPractice'), icon: '🎯', type: 'window', enabled: false },
  { id: 'regex-practice', name: t('toolbox.tools.regexPractice'), icon: '🎨', type: 'window', enabled: false },
  { id: 'typing-practice', name: t('toolbox.tools.typingPractice'), icon: '⌨️', type: 'window', enabled: false }
])

// 办公工具
const officeTools = computed(() => [
  { id: 'word-counter', name: t('toolbox.tools.wordCounter'), icon: '🔢', type: 'window', enabled: false },
  { id: 'text-formatter', name: t('toolbox.tools.textFormatter'), icon: '📝', type: 'window', enabled: false },
  { id: 'case-converter', name: t('toolbox.tools.caseConverter'), icon: '🔤', type: 'window', enabled: false },
  { id: 'invoice-generator', name: t('toolbox.tools.invoiceGenerator'), icon: '🧾', type: 'window', enabled: false },
  { id: 'expense-tracker', name: t('toolbox.tools.expenseTracker'), icon: '💰', type: 'window', enabled: false },
  { id: 'contract-template', name: t('toolbox.tools.contractTemplate'), icon: '📄', type: 'window', enabled: false },
  { id: 'letter-generator', name: t('toolbox.tools.letterGenerator'), icon: '✉️', type: 'window', enabled: false },
  { id: 'presentation-timer', name: t('toolbox.tools.presentationTimer'), icon: '⏱️', type: 'window', enabled: false },
  { id: 'signature-tool', name: t('toolbox.tools.signatureTool'), icon: '✍️', type: 'window', enabled: false },
  { id: 'pdf-merger', name: t('toolbox.tools.pdfMerger'), icon: '📑', type: 'window', enabled: false }
])

// 设计工具
const designTools = computed(() => [
  { id: 'mockup-tool', name: t('toolbox.tools.mockupTool'), icon: '🎨', type: 'window', enabled: false },
  { id: 'wireframe', name: t('toolbox.tools.wireframe'), icon: '📐', type: 'window', enabled: false },
  { id: 'color-palette', name: t('toolbox.tools.colorPalette'), icon: '🎨', type: 'window', enabled: false },
  { id: 'font-tester', name: t('toolbox.tools.fontTester'), icon: '🔤', type: 'window', enabled: false },
  { id: 'icon-library', name: t('toolbox.tools.iconLibrary'), icon: '🎯', type: 'window', enabled: false },
  { id: 'logo-maker', name: t('toolbox.tools.logoMaker'), icon: '🎨', type: 'window', enabled: false },
  { id: 'gradient-library', name: t('toolbox.tools.gradientLibrary'), icon: '🌈', type: 'window', enabled: false },
  { id: 'design-token', name: t('toolbox.tools.designToken'), icon: '🎨', type: 'window', enabled: false },
  { id: 'ui-patterns', name: t('toolbox.tools.uiPatterns'), icon: '📦', type: 'window', enabled: false },
  { id: 'responsive-preview', name: t('toolbox.tools.responsivePreview'), icon: '📱', type: 'window', enabled: false }
])

// 数据分析
const dataAnalysisTools = computed(() => [
  { id: 'chart-generator', name: t('toolbox.tools.chartGenerator'), icon: '📊', type: 'window', enabled: false },
  { id: 'data-visualization', name: t('toolbox.tools.dataVisualization'), icon: '📈', type: 'window', enabled: false },
  { id: 'pivot-table', name: t('toolbox.tools.pivotTable'), icon: '🔄', type: 'window', enabled: false },
  { id: 'sql-analyzer', name: t('toolbox.tools.sqlAnalyzer'), icon: '🔍', type: 'window', enabled: false },
  { id: 'log-analyzer', name: t('toolbox.tools.logAnalyzer'), icon: '📜', type: 'page', enabled: true },
  { id: 'json-analyzer', name: t('toolbox.tools.jsonAnalyzer'), icon: '📋', type: 'window', enabled: false },
  { id: 'csv-analyzer', name: t('toolbox.tools.csvAnalyzer'), icon: '📊', type: 'window', enabled: false },
  { id: 'statistics-tool', name: t('toolbox.tools.statisticsTool'), icon: '📐', type: 'window', enabled: false },
  { id: 'data-cleaner', name: t('toolbox.tools.dataCleaner'), icon: '🧹', type: 'window', enabled: false },
  { id: 'data-export', name: t('toolbox.tools.dataExport'), icon: '📤', type: 'window', enabled: false }
])

// 音视频工具
const mediaTools = computed(() => [
  { id: 'audio-converter', name: t('toolbox.tools.audioConverter'), icon: '🎵', type: 'window', enabled: false },
  { id: 'video-converter', name: t('toolbox.tools.videoConverter'), icon: '🎬', type: 'window', enabled: false },
  { id: 'audio-trim', name: t('toolbox.tools.audioTrim'), icon: '✂️', type: 'window', enabled: false },
  { id: 'video-trim', name: t('toolbox.tools.videoTrim'), icon: '🎞️', type: 'window', enabled: false },
  { id: 'gif-maker', name: t('toolbox.tools.gifMaker'), icon: '🎬', type: 'window', enabled: false },
  { id: 'subtitle-tool', name: t('toolbox.tools.subtitleTool'), icon: '📝', type: 'window', enabled: false },
  { id: 'audio-merger', name: t('toolbox.tools.audioMerger'), icon: '🎵', type: 'window', enabled: false },
  { id: 'video-merger', name: t('toolbox.tools.videoMerger'), icon: '🎬', type: 'window', enabled: false },
  { id: 'screen-capture', name: t('toolbox.tools.screenCapture'), icon: '📹', type: 'window', enabled: false },
  { id: 'audio-recorder', name: t('toolbox.tools.audioRecorder'), icon: '🎤', type: 'window', enabled: false }
])

// 系统工具
const systemTools = computed(() => [
  { id: 'disk-cleaner', name: t('toolbox.tools.diskCleaner'), icon: '🧹', type: 'window', enabled: false },
  { id: 'hardware-info', name: t('toolbox.tools.hardwareInfo'), icon: '🖥️', type: 'page', enabled: true },
  { id: 'disk-analyzer', name: t('toolbox.tools.diskAnalyzer'), icon: '💾', type: 'window', enabled: false },
  { id: 'registry-cleaner', name: t('toolbox.tools.registryCleaner'), icon: '🔧', type: 'window', enabled: false },
  { id: 'startup-manager', name: t('toolbox.tools.startupManager'), icon: '🚀', type: 'window', enabled: false },
  { id: 'service-manager', name: t('toolbox.tools.serviceManager'), icon: '⚙️', type: 'window', enabled: false },
  { id: 'env-variable', name: t('toolbox.tools.envVariable'), icon: '🔧', type: 'window', enabled: false },
  { id: 'hosts-editor', name: t('toolbox.tools.hostsEditor'), icon: '🌐', type: 'window', enabled: false },
  { id: 'task-scheduler', name: t('toolbox.tools.taskScheduler'), icon: '⏰', type: 'window', enabled: false },
  { id: 'clipboard-manager', name: t('toolbox.tools.clipboardManager'), icon: '📋', type: 'window', enabled: false },
  { id: 'window-manager', name: t('toolbox.tools.windowManager'), icon: '🪟', type: 'window', enabled: false }
])

// 浏览器工具
const browserTools = computed(() => [
  { id: 'bookmark-manager', name: t('toolbox.tools.bookmarkManager'), icon: '🔖', type: 'window', enabled: false },
  { id: 'cookie-manager', name: t('toolbox.tools.cookieManager'), icon: '🍪', type: 'window', enabled: false },
  { id: 'cache-cleaner', name: t('toolbox.tools.cacheCleaner'), icon: '🧹', type: 'window', enabled: false },
  { id: 'user-agent', name: 'UserAgent', icon: '🌐', type: 'window', enabled: false },
  { id: 'web-scraper', name: t('toolbox.tools.webScraper'), icon: '🕷️', type: 'window', enabled: false },
  { id: 'seo-analyzer', name: t('toolbox.tools.seoAnalyzer'), icon: '📊', type: 'window', enabled: false },
  { id: 'page-speed', name: t('toolbox.tools.pageSpeed'), icon: '⚡', type: 'window', enabled: false },
  { id: 'lighthouse', name: 'Lighthouse', icon: '💡', type: 'window', enabled: false }
])

// 代码质量
const codeQualityTools = computed(() => [
  { id: 'code-formatter', name: t('toolbox.tools.codeFormatter'), icon: '✨', type: 'page', enabled: true },
  { id: 'code-lint', name: t('toolbox.tools.codeLint'), icon: '🔍', type: 'window', enabled: false },
  { id: 'code-review', name: t('toolbox.tools.codeReview'), icon: '👀', type: 'window', enabled: false },
  { id: 'complexity-analyzer', name: t('toolbox.tools.complexityAnalyzer'), icon: '📊', type: 'window', enabled: false },
  { id: 'duplicate-detector', name: t('toolbox.tools.duplicateDetector'), icon: '🔎', type: 'window', enabled: false },
  { id: 'dependency-checker', name: t('toolbox.tools.dependencyChecker'), icon: '📦', type: 'window', enabled: false },
  { id: 'security-scanner', name: t('toolbox.tools.securityScanner'), icon: '🔐', type: 'window', enabled: false },
  { id: 'test-coverage', name: t('toolbox.tools.testCoverage'), icon: '📈', type: 'window', enabled: false },
  { id: 'code-metrics', name: t('toolbox.tools.codeMetrics'), icon: '📊', type: 'window', enabled: false }
])

// API工具
const apiTools = computed(() => [
  { id: 'api-docs', name: t('toolbox.tools.apiDocs'), icon: '📚', type: 'window', enabled: false },
  { id: 'api-client', name: t('toolbox.tools.apiClient'), icon: '🔌', type: 'window', enabled: false },
  { id: 'graphql-client', name: t('toolbox.tools.graphqlClient'), icon: '📡', type: 'window', enabled: false },
  { id: 'rest-client', name: t('toolbox.tools.restClient'), icon: '🌐', type: 'window', enabled: false },
  { id: 'soap-client', name: t('toolbox.tools.soapClient'), icon: '🧼', type: 'window', enabled: false },
  { id: 'webhook-tester', name: t('toolbox.tools.webhookTester'), icon: '🔗', type: 'window', enabled: false },
  { id: 'api-monitor', name: t('toolbox.tools.apiMonitor'), icon: '📊', type: 'window', enabled: false },
  { id: 'api-versioning', name: t('toolbox.tools.apiVersioning'), icon: '🔢', type: 'window', enabled: false }
])

// 移动开发
const mobileDevTools = computed(() => [
  { id: 'app-icon-generator', name: t('toolbox.tools.appIconGenerator'), icon: '📱', type: 'window', enabled: false },
  { id: 'splash-generator', name: t('toolbox.tools.splashGenerator'), icon: '🎨', type: 'window', enabled: false },
  { id: 'device-preview', name: t('toolbox.tools.devicePreview'), icon: '📱', type: 'window', enabled: false },
  { id: 'android-tools', name: t('toolbox.tools.androidTools'), icon: '🤖', type: 'window', enabled: false },
  { id: 'ios-tools', name: t('toolbox.tools.iosTools'), icon: '🍎', type: 'window', enabled: false },
  { id: 'react-native-helper', name: t('toolbox.tools.reactNativeHelper'), icon: '⚛️', type: 'window', enabled: false },
  { id: 'flutter-helper', name: t('toolbox.tools.flutterHelper'), icon: '🦋', type: 'window', enabled: false }
])

// 性能优化
const performanceTools = computed(() => [
  { id: 'bundle-analyzer', name: t('toolbox.tools.bundleAnalyzer'), icon: '📦', type: 'window', enabled: false },
  { id: 'memory-profiler', name: t('toolbox.tools.memoryProfiler'), icon: '💾', type: 'window', enabled: false },
  { id: 'cpu-profiler', name: t('toolbox.tools.cpuProfiler'), icon: '⚡', type: 'window', enabled: false },
  { id: 'network-profiler', name: t('toolbox.tools.networkProfiler'), icon: '🌐', type: 'window', enabled: false },
  { id: 'lighthouse-audit', name: t('toolbox.tools.lighthouseAudit'), icon: '💡', type: 'window', enabled: false },
  { id: 'image-optimizer', name: t('toolbox.tools.imageOptimizer'), icon: '🖼️', type: 'window', enabled: false },
  { id: 'code-splitter', name: t('toolbox.tools.codeSplitter'), icon: '✂️', type: 'window', enabled: false },
  { id: 'lazy-loading', name: t('toolbox.tools.lazyLoading'), icon: '⏳', type: 'window', enabled: false }
])

// 项目管理
const projectManagementTools = computed(() => [
  { id: 'project-init', name: t('toolbox.tools.projectInit'), icon: '🚀', type: 'window', enabled: false },
  { id: 'scaffolding', name: t('toolbox.tools.scaffolding'), icon: '🏗️', type: 'window', enabled: false },
  { id: 'dependency-manager', name: t('toolbox.tools.dependencyManager'), icon: '📦', type: 'window', enabled: false },
  { id: 'changelog-manager', name: t('toolbox.tools.changelogManager'), icon: '📝', type: 'window', enabled: false },
  { id: 'release-notes', name: t('toolbox.tools.releaseNotes'), icon: '📋', type: 'window', enabled: false },
  { id: 'milestone-tracker', name: t('toolbox.tools.milestoneTracker'), icon: '🏁', type: 'window', enabled: false },
  { id: 'gantt-chart', name: t('toolbox.tools.ganttChart'), icon: '📊', type: 'window', enabled: false },
  { id: 'resource-planner', name: t('toolbox.tools.resourcePlanner'), icon: '📅', type: 'window', enabled: false }
])

// 协作通讯
const collaborationTools = computed(() => [
  { id: 'team-chat', name: t('toolbox.tools.teamChat'), icon: '💬', type: 'window', enabled: false },
  { id: 'video-meeting', name: t('toolbox.tools.videoMeeting'), icon: '📹', type: 'window', enabled: false },
  { id: 'screen-share', name: t('toolbox.tools.screenShare'), icon: '🖥️', type: 'window', enabled: false },
  { id: 'whiteboard-collab', name: t('toolbox.tools.whiteboardCollab'), icon: '🎨', type: 'window', enabled: false },
  { id: 'code-review-tool', name: t('toolbox.tools.codeReviewTool'), icon: '👥', type: 'window', enabled: false },
  { id: 'pair-programming', name: t('toolbox.tools.pairProgramming'), icon: '👥', type: 'window', enabled: false },
  { id: 'knowledge-base', name: t('toolbox.tools.knowledgeBase'), icon: '📚', type: 'window', enabled: false }
])

// 云服务工具
const cloudTools = computed(() => [
  { id: 'aws-helper', name: t('toolbox.tools.awsHelper'), icon: '☁️', type: 'window', enabled: false },
  { id: 'azure-helper', name: t('toolbox.tools.azureHelper'), icon: '☁️', type: 'window', enabled: false },
  { id: 'gcp-helper', name: t('toolbox.tools.gcpHelper'), icon: '☁️', type: 'window', enabled: false },
  { id: 'aliyun-helper', name: t('toolbox.tools.aliyunHelper'), icon: '☁️', type: 'window', enabled: false },
  { id: 'tencent-cloud', name: t('toolbox.tools.tencentCloud'), icon: '☁️', type: 'window', enabled: false },
  { id: 's3-manager', name: t('toolbox.tools.s3Manager'), icon: '📦', type: 'window', enabled: false },
  { id: 'oss-manager', name: t('toolbox.tools.ossManager'), icon: '📦', type: 'window', enabled: false },
  { id: 'serverless-helper', name: 'Serverless', icon: '⚡', type: 'window', enabled: false }
])

// 金融工具
const financeTools = computed(() => [
  { id: 'tax-calculator', name: t('toolbox.tools.taxCalculator'), icon: '💰', type: 'window', enabled: false },
  { id: 'salary-calculator', name: t('toolbox.tools.salaryCalculator'), icon: '💵', type: 'window', enabled: false },
  { id: 'loan-calculator', name: t('toolbox.tools.loanCalculator'), icon: '🏦', type: 'window', enabled: false },
  { id: 'investment-calculator', name: t('toolbox.tools.investmentCalculator'), icon: '📈', type: 'window', enabled: false },
  { id: 'budget-planner', name: t('toolbox.tools.budgetPlanner'), icon: '💼', type: 'window', enabled: false },
  { id: 'expense-analyzer', name: t('toolbox.tools.expenseAnalyzer'), icon: '📊', type: 'window', enabled: false },
  { id: 'invoice-maker', name: t('toolbox.tools.invoiceMaker'), icon: '🧾', type: 'window', enabled: false }
])

// 生活工具
const lifeTools = computed(() => [
  { id: 'calendar-planner', name: t('toolbox.tools.calendarPlanner'), icon: '📅', type: 'window', enabled: false },
  { id: 'reminder-tool', name: t('toolbox.tools.reminderTool'), icon: '⏰', type: 'window', enabled: false },
  { id: 'shopping-list', name: t('toolbox.tools.shoppingList'), icon: '🛒', type: 'window', enabled: false },
  { id: 'recipe-manager', name: t('toolbox.tools.recipeManager'), icon: '🍳', type: 'window', enabled: false },
  { id: 'workout-planner', name: t('toolbox.tools.workoutPlanner'), icon: '💪', type: 'window', enabled: false },
  { id: 'water-reminder', name: t('toolbox.tools.waterReminder'), icon: '💧', type: 'window', enabled: false },
  { id: 'sleep-tracker', name: t('toolbox.tools.sleepTracker'), icon: '😴', type: 'window', enabled: false },
  { id: 'mood-tracker', name: t('toolbox.tools.moodTracker'), icon: '😊', type: 'window', enabled: false }
])

// 教育工具
const educationTools = computed(() => [
  { id: 'quiz-maker', name: t('toolbox.tools.quizMaker'), icon: '📝', type: 'window', enabled: false },
  { id: 'exam-timer', name: t('toolbox.tools.examTimer'), icon: '⏱️', type: 'window', enabled: false },
  { id: 'grade-calculator', name: t('toolbox.tools.gradeCalculator'), icon: '📊', type: 'window', enabled: false },
  { id: 'study-planner', name: t('toolbox.tools.studyPlanner'), icon: '📚', type: 'window', enabled: false },
  { id: 'vocabulary-trainer', name: t('toolbox.tools.vocabularyTrainer'), icon: '📖', type: 'window', enabled: false },
  { id: 'flashcard-maker', name: t('toolbox.tools.flashcardMaker'), icon: '🎴', type: 'window', enabled: false },
  { id: 'citation-generator', name: t('toolbox.tools.citationGenerator'), icon: '📄', type: 'window', enabled: false }
])

// 游戏辅助
const gamingTools = computed(() => [
  { id: 'fps-counter', name: t('toolbox.tools.fpsCounter'), icon: '🎮', type: 'window', enabled: false },
  { id: 'game-overlay', name: t('toolbox.tools.gameOverlay'), icon: '🎯', type: 'window', enabled: false },
  { id: 'macro-recorder', name: t('toolbox.tools.macroRecorder'), icon: '🎬', type: 'window', enabled: false },
  { id: 'controller-mapper', name: t('toolbox.tools.controllerMapper'), icon: '🎮', type: 'window', enabled: false }
])

// AI助手工具
const aiAssistantTools = computed(() => [
  { id: 'code-completion', name: t('toolbox.tools.codeCompletion'), icon: '🤖', type: 'window', enabled: false },
  { id: 'code-explanation', name: t('toolbox.tools.codeExplanation'), icon: '💡', type: 'window', enabled: false },
  { id: 'bug-finder', name: t('toolbox.tools.bugFinder'), icon: '🐛', type: 'window', enabled: false },
  { id: 'refactor-suggestion', name: t('toolbox.tools.refactorSuggestion'), icon: '🔄', type: 'window', enabled: false },
  { id: 'test-generator', name: t('toolbox.tools.testGenerator'), icon: '🧪', type: 'window', enabled: false },
  { id: 'doc-generator', name: t('toolbox.tools.docGenerator'), icon: '📚', type: 'window', enabled: false },
  { id: 'comment-generator', name: t('toolbox.tools.commentGenerator'), icon: '💬', type: 'window', enabled: false },
  { id: 'sql-gen', name: t('toolbox.tools.sqlGen'), icon: '🗄️', type: 'window', enabled: false },
  { id: 'regex-generator', name: t('toolbox.tools.regexGenerator'), icon: '🎨', type: 'window', enabled: false }
])

// 所有分类
const allCategories = computed(() => [
  { name: 'note', label: t('toolbox.categories.note'), tools: noteTools.value },
  { name: 'dev', label: t('toolbox.categories.dev'), tools: devTools.value },
  { name: 'utility', label: t('toolbox.categories.utility'), tools: utilityTools.value },
  { name: 'efficiency', label: t('toolbox.categories.efficiency'), tools: efficiencyTools.value },
  { name: 'network', label: t('toolbox.categories.network'), tools: networkTools.value },
  { name: 'encoding', label: t('toolbox.categories.encoding'), tools: encodingTools.value },
  { name: 'file', label: t('toolbox.categories.file'), tools: fileTools.value },
  { name: 'image', label: t('toolbox.categories.image'), tools: imageTools.value },
  { name: 'git', label: t('toolbox.categories.git'), tools: gitTools.value },
  { name: 'database', label: t('toolbox.categories.database'), tools: databaseTools.value },
  { name: 'frontend', label: t('toolbox.categories.frontend'), tools: frontendTools.value },
  { name: 'backend', label: t('toolbox.categories.backend'), tools: backendTools.value },
  { name: 'test', label: t('toolbox.categories.test'), tools: testTools.value },
  { name: 'devops', label: t('toolbox.categories.devops'), tools: devopsTools.value },
  { name: 'security', label: t('toolbox.categories.security'), tools: securityTools.value },
  { name: 'document', label: t('toolbox.categories.document'), tools: documentTools.value },
  { name: 'learning', label: t('toolbox.categories.learning'), tools: learningTools.value },
  { name: 'office', label: t('toolbox.categories.office'), tools: officeTools.value },
  { name: 'design', label: t('toolbox.categories.design'), tools: designTools.value },
  { name: 'dataAnalysis', label: t('toolbox.categories.dataAnalysis'), tools: dataAnalysisTools.value },
  { name: 'media', label: t('toolbox.categories.media'), tools: mediaTools.value },
  { name: 'system', label: t('toolbox.categories.system'), tools: systemTools.value },
  { name: 'browser', label: t('toolbox.categories.browser'), tools: browserTools.value },
  { name: 'codeQuality', label: t('toolbox.categories.codeQuality'), tools: codeQualityTools.value },
  { name: 'api', label: t('toolbox.categories.api'), tools: apiTools.value },
  { name: 'mobileDev', label: t('toolbox.categories.mobileDev'), tools: mobileDevTools.value },
  { name: 'performance', label: t('toolbox.categories.performance'), tools: performanceTools.value },
  { name: 'projectManagement', label: t('toolbox.categories.projectManagement'), tools: projectManagementTools.value },
  { name: 'collaboration', label: t('toolbox.categories.collaboration'), tools: collaborationTools.value },
  { name: 'cloud', label: t('toolbox.categories.cloud'), tools: cloudTools.value },
  { name: 'finance', label: t('toolbox.categories.finance'), tools: financeTools.value },
  { name: 'life', label: t('toolbox.categories.life'), tools: lifeTools.value },
  { name: 'education', label: t('toolbox.categories.education'), tools: educationTools.value },
  { name: 'gaming', label: t('toolbox.categories.gaming'), tools: gamingTools.value },
  { name: 'aiAssistant', label: t('toolbox.categories.aiAssistant'), tools: aiAssistantTools.value },
])

// 打开工具
const openTool = async (tool) => {
  if (!tool.enabled) {
    ElMessage.info(`${tool.name} ${t('toolbox.comingSoon')}`)
    return
  }

  if (tool.id === 'sticky-notes') {
    router.push('/toolbox/sticky-notes')
    return
  }

  if (tool.id === 'sdk-manager') {
    router.push('/toolbox/sdk-manager')
    return
  }

  if (tool.id === 'redis-client') {
    router.push('/toolbox/redis-client')
    return
  }

  if (tool.id === 'port-manager') {
    router.push('/toolbox/port-manager')
    return
  }

  if (tool.id === 'git-manager') {
    router.push('/toolbox/git-manager')
    return
  }

  if (tool.id === 'git-daily-report') {
    router.push('/toolbox/git-daily-report')
    return
  }

  if (tool.id === 'code-formatter') {
    router.push('/toolbox/code-formatter')
    return
  }

  if (tool.id === 'file-compare') {
    router.push('/toolbox/file-diff')
    return
  }

  if (tool.id === 'api-debug') { router.push('/toolbox/api-debug'); return }
  if (tool.id === 'api-docs-page') { router.push('/toolbox/api-docs'); return }
  if (tool.id === 'mock-service') { router.push('/toolbox/mock-service'); return }
  if (tool.id === 'perf-test') { router.push('/toolbox/perf-test'); return }
  if (tool.id === 'auto-test') { router.push('/toolbox/auto-test'); return }

  if (tool.id === 'ebook-shelf') {
    router.push('/toolbox/ebook-shelf')
    return
  }

  if (tool.id === 'screenshot') {
    router.push('/toolbox/screenshot')
    return
  }

  if (tool.id === 'image-to-base64') {
    router.push('/toolbox/image-to-base64')
    return
  }

  if (tool.id === 'image-format') {
    router.push('/toolbox/image-format-converter')
    return
  }

  if (tool.id === 'regex-tester') {
    router.push('/toolbox/regex-tester')
    return
  }

  if (tool.id === 'crypto') {
    router.push('/toolbox/crypto-tool')
    return
  }

  if (tool.id === 'sqlite-manager') {
    router.push('/toolbox/sqlite-manager')
    return
  }

  if (tool.id === 'maven-repo') {
    router.push('/toolbox/maven-repo')
    return
  }

  if (tool.id === 'wallpaper-manager') {
    router.push('/toolbox/wallpaper-manager')
    return
  }

  if (tool.id === 'log-analyzer') {
    router.push('/toolbox/log-analyzer')
    return
  }

  if (tool.id === 'hardware-info') {
    router.push('/toolbox/hardware-info')
    return
  }

  // TODO: 其他工具的打开逻辑
}

// 去设置页面
const goToSettings = () => {
  router.push('/settings?tab=toolbox')
}
</script>

<style scoped>
.toolbox-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.breadcrumb .el-icon {
  font-size: 18px;
  color: var(--text-secondary);
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
  overflow-y: auto;
  padding: var(--space-2xl);
  scrollbar-gutter: stable;
}

/* 美化滚动条 */
.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--text-quaternary);
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.tool-category {
  margin-bottom: 24px;
}

.tool-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 10px 0;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  user-select: none;
  margin-bottom: var(--space-lg);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
  gap: var(--space-lg);
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg) var(--space-sm);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  user-select: none;
}

.tool-card:hover {
  border-color: transparent;
  background: var(--bg-tertiary);
}

.tool-card.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-card.disabled:hover {
  border-color: transparent;
  background: transparent;
}

.tool-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.tool-name {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  text-align: center;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  transition: color var(--transition-fast);
}

.tool-card:hover .tool-name {
  color: var(--accent-blue);
}

.tool-card.disabled .tool-name {
  color: var(--text-tertiary);
}

.dev-tag {
  position: absolute;
  top: var(--radius-xs);
  right: var(--radius-xs);
  font-size: 9px;
  padding: 1px 4px;
  height: 16px;
  line-height: 14px;
  border-radius: 2px;
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
