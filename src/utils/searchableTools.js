/**
 * 全局搜索用的工具元数据。
 * 与 ProductivitySidebar.vue 的 toolPathMap、useFavoriteTools.js 的 toolI18nKeyMap
 * 保持一致 —— 任意一处新增工具后,这三处都要补,否则搜索不到 / 收藏栏不显示。
 *
 * 单独抽到这个文件,避免在 search.js 里硬编码 i18n key、避免循环依赖
 * (Toolbox.vue / Sidebar 都引用 search.js 时不会反向拖入完整组件)。
 */

export const SEARCHABLE_TOOLS = [
  { id: 'sticky-notes',     i18nKey: 'toolbox.tools.stickyNotes',     path: '/toolbox/sticky-notes',          icon: '📌' },
  { id: 'sdk-manager',      i18nKey: 'toolbox.tools.sdkManager',      path: '/toolbox/sdk-manager',           icon: '📦' },
  { id: 'redis-client',     i18nKey: 'toolbox.tools.redisClient',     path: '/toolbox/redis-client',          icon: '🟥' },
  { id: 'port-manager',     i18nKey: 'toolbox.tools.portManager',     path: '/toolbox/port-manager',          icon: '🔌' },
  { id: 'ip-lookup',        i18nKey: 'toolbox.tools.ipLookup',        path: '/toolbox/ip-lookup',             icon: '🌐' },
  { id: 'dns-lookup',       i18nKey: 'toolbox.tools.dnsLookup',       path: '/toolbox/dns-lookup',            icon: '🔍' },
  { id: 'speed-test',       i18nKey: 'toolbox.tools.speedTest',       path: '/toolbox/speed-test',            icon: '⚡' },
  { id: 'websocket-test',   i18nKey: 'toolbox.tools.websocketTest',   path: '/toolbox/websocket-test',        icon: '🔗' },
  { id: 'git-manager',      i18nKey: 'toolbox.tools.gitManager',      path: '/toolbox/git-manager',           icon: '🌿' },
  { id: 'git-daily-report', i18nKey: 'toolbox.tools.gitDailyReport',  path: '/toolbox/git-daily-report',      icon: '📊' },
  { id: 'code-formatter',   i18nKey: 'toolbox.tools.codeFormatter',   path: '/toolbox/code-formatter',        icon: '✨' },
  { id: 'file-compare',     i18nKey: 'toolbox.tools.fileCompare',     path: '/toolbox/file-diff',             icon: '🔀' },
  { id: 'api-debug',        i18nKey: 'toolbox.tools.apiDebug',        path: '/toolbox/api-debug',             icon: '🛠️' },
  { id: 'api-docs-page',    i18nKey: 'toolbox.tools.apiDocsPage',     path: '/toolbox/api-docs',              icon: '📖' },
  { id: 'mock-service',     i18nKey: 'toolbox.tools.mockService',     path: '/toolbox/mock-service',          icon: '🎭' },
  { id: 'perf-test',        i18nKey: 'toolbox.tools.perfTest',        path: '/toolbox/perf-test',             icon: '🚀' },
  { id: 'auto-test',        i18nKey: 'toolbox.tools.autoTest',        path: '/toolbox/auto-test',             icon: '🧪' },
  { id: 'ebook-shelf',      i18nKey: 'toolbox.tools.ebookShelf',      path: '/toolbox/ebook-shelf',           icon: '📚' },
  { id: 'screenshot',       i18nKey: 'toolbox.tools.screenshot',      path: '/toolbox/screenshot',            icon: '📸' },
  { id: 'image-to-base64',  i18nKey: 'toolbox.tools.imageToBase64',   path: '/toolbox/image-to-base64',       icon: '🖼️' },
  { id: 'hex-converter',    i18nKey: 'toolbox.tools.hexConverter',    path: '/toolbox/hex-converter',         icon: '🔢' },
  { id: 'image-format',     i18nKey: 'toolbox.tools.imageFormat',     path: '/toolbox/image-format-converter', icon: '🎨' },
  { id: 'regex-tester',     i18nKey: 'toolbox.tools.regexTester',     path: '/toolbox/regex-tester',          icon: '.*' },
  { id: 'crypto',           i18nKey: 'toolbox.tools.crypto',          path: '/toolbox/crypto-tool',           icon: '🔐' },
  { id: 'sqlite-manager',   i18nKey: 'toolbox.tools.sqliteManager',   path: '/toolbox/sqlite-manager',        icon: '🗄️' },
  { id: 'maven-repo',       i18nKey: 'toolbox.tools.mavenRepo',       path: '/toolbox/maven-repo',            icon: '☕' },
  { id: 'wallpaper-manager', i18nKey: 'toolbox.tools.wallpaperManager', path: '/toolbox/wallpaper-manager',   icon: '🖼️' },
  { id: 'log-analyzer',     i18nKey: 'toolbox.tools.logAnalyzer',     path: '/toolbox/log-analyzer',          icon: '📋' },
  { id: 'hardware-info',    i18nKey: 'toolbox.tools.hardwareInfo',    path: '/toolbox/hardware-info',         icon: '💻' },
  { id: 'download-manager', i18nKey: 'toolbox.tools.downloadManager', path: '/toolbox/download-manager',      icon: '⬇️' },
  { id: 'ssh-terminal',     i18nKey: 'toolbox.tools.sshTerminal',     path: '/toolbox/ssh-terminal',          icon: '🔐' },
  { id: 'multi-print',      i18nKey: 'toolbox.tools.multiPrint',      path: '/toolbox/multi-print',           icon: '🖨️' },
]
