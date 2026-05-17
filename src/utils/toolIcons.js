// Lucide-style line icons for toolbox tools.
// All icons: 24x24 viewBox, fill=none, stroke=currentColor, strokeWidth=1.5
// Replace the previous emoji icons with clean, professional line icons.
export const TOOL_ICONS = {
  // ===== 笔记 / 内容 =====
  'sticky-notes': `
    <path d="M19 5v9l-5 5H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"/>
    <path d="M14 19v-5h5"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="13" x2="13" y2="13"/>`,
  'ebook-shelf': `
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="8" y1="6" x2="16" y2="6"/>`,
  'screenshot': `
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3.5"/>`,
  'multi-print': `
    <path d="M6 9V2h12v7"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8" rx="1"/>`,

  // ===== 开发 =====
  'sdk-manager': `
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>`,
  'code-formatter': `
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>`,
  'regex-tester': `
    <line x1="17" y1="3" x2="17" y2="13"/>
    <line x1="13" y1="5" x2="21" y2="11"/>
    <line x1="21" y1="5" x2="13" y2="11"/>
    <circle cx="6" cy="18" r="2"/>
    <line x1="3" y1="21" x2="21" y2="21"/>`,
  'hex-converter': `
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>`,
  'crypto': `
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    <circle cx="12" cy="16" r="1.2" fill="currentColor"/>`,
  'maven-repo': `
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="5"/>
    <line x1="10" y1="2" x2="10" y2="5"/>
    <line x1="14" y1="2" x2="14" y2="5"/>`,

  // ===== Git =====
  'git-manager': `
    <circle cx="6" cy="6" r="2.5"/>
    <circle cx="6" cy="18" r="2.5"/>
    <circle cx="18" cy="12" r="2.5"/>
    <path d="M6 8.5v7"/>
    <path d="M8 6h6a4 4 0 0 1 4 4v0"/>`,
  'git-daily-report': `
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="12" y1="20" x2="12" y2="8"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="3" y1="20" x2="21" y2="20"/>`,
  'file-compare': `
    <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>`,

  // ===== 网络 =====
  'port-manager': `
    <path d="M9 2v6"/>
    <path d="M15 2v6"/>
    <path d="M6 8h12l-1.2 8.4A4 4 0 0 1 12.84 20H11.16a4 4 0 0 1-3.96-3.6L6 8z"/>
    <line x1="12" y1="20" x2="12" y2="22"/>`,
  'ip-lookup': `
    <circle cx="12" cy="12" r="9"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <path d="M12 3a14 14 0 0 1 0 18"/>
    <path d="M12 3a14 14 0 0 0 0 18"/>`,
  'dns-lookup': `
    <circle cx="12" cy="12" r="9"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <path d="M12 3a13 13 0 0 1 0 18"/>
    <path d="M12 3a13 13 0 0 0 0 18"/>`,
  'speed-test': `
    <path d="M12 14L18 8"/>
    <path d="M3 12a9 9 0 0 1 18 0"/>
    <circle cx="12" cy="14" r="1.5" fill="currentColor"/>
    <path d="M3 19h18"/>`,
  'websocket-test': `
    <polyline points="7 8 3 12 7 16"/>
    <polyline points="17 8 21 12 17 16"/>
    <line x1="14" y1="4" x2="10" y2="20"/>`,
  'download-manager': `
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>`,
  'ssh-terminal': `
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="6 9 9 12 6 15"/>
    <line x1="12" y1="15" x2="17" y2="15"/>`,

  // ===== 测试 / API =====
  'api-debug': `
    <path d="M10 13a5 5 0 0 0 7.07.54l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/>
    <path d="M14 11a5 5 0 0 0-7.07-.54l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>`,
  'api-docs-page': `
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  'mock-service': `
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <circle cx="7" cy="7" r="0.8" fill="currentColor"/>
    <circle cx="10" cy="7" r="0.8" fill="currentColor"/>
    <line x1="7" y1="14" x2="13" y2="14"/>
    <line x1="7" y1="17" x2="11" y2="17"/>`,
  'perf-test': `
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  'auto-test': `
    <path d="M9 11l3 3L20 6"/>
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>`,

  // ===== 数据库 =====
  'redis-client': `
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>`,
  'sqlite-manager': `
    <ellipse cx="12" cy="6" rx="9" ry="3"/>
    <path d="M3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>`,

  // ===== 数据分析 =====
  'log-analyzer': `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="14" y2="17"/>`,

  // ===== 图像 =====
  'image-format': `
    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 14 16 9 5 20"/>
    <polyline points="14 18 17 21 21 17"/>`,
  'image-to-base64': `
    <rect x="3" y="3" width="18" height="13" rx="2"/>
    <circle cx="9" cy="9" r="1.5"/>
    <path d="M21 12l-5-5L7 16"/>
    <line x1="6" y1="20" x2="18" y2="20"/>
    <line x1="9" y1="20" x2="9" y2="22"/>
    <line x1="15" y1="20" x2="15" y2="22"/>`,
  'wallpaper-manager': `
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-5-5L5 21"/>`,

  // ===== 系统 =====
  'hardware-info': `
    <rect x="5" y="5" width="14" height="14" rx="1"/>
    <rect x="9" y="9" width="6" height="6"/>
    <line x1="9" y1="2" x2="9" y2="5"/>
    <line x1="15" y1="2" x2="15" y2="5"/>
    <line x1="9" y1="19" x2="9" y2="22"/>
    <line x1="15" y1="19" x2="15" y2="22"/>
    <line x1="19" y1="9" x2="22" y2="9"/>
    <line x1="19" y1="15" x2="22" y2="15"/>
    <line x1="2" y1="9" x2="5" y2="9"/>
    <line x1="2" y1="15" x2="5" y2="15"/>`,
}

export function hasToolIcon(id) {
  return !!TOOL_ICONS[id]
}

// ===== 分类图标 (Toolbox category headers) =====
// Same conventions: 24x24 viewBox, fill=none, stroke=currentColor, strokeWidth=1.5
export const CATEGORY_ICONS = {
  note: `
    <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3z"/>
    <line x1="8" y1="9" x2="14" y2="9"/>
    <line x1="8" y1="13" x2="12" y2="13"/>`,
  dev: `
    <path d="M14 3l-4 18"/>
    <polyline points="8 7 3 12 8 17"/>
    <polyline points="16 7 21 12 16 17"/>`,
  git: `
    <circle cx="6" cy="4" r="2"/>
    <circle cx="6" cy="20" r="2"/>
    <circle cx="18" cy="12" r="2"/>
    <path d="M6 6v12"/>
    <path d="M8 12h8"/>
    <path d="M6 10a6 6 0 0 0 6-6"/>`,
  network: `
    <path d="M2 9.5a16 16 0 0 1 20 0"/>
    <path d="M5 13a11 11 0 0 1 14 0"/>
    <path d="M8.5 16.5a6 6 0 0 1 7 0"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>`,
  test: `
    <rect x="8" y="6" width="8" height="14" rx="4"/>
    <line x1="3" y1="10" x2="8" y2="10"/>
    <line x1="16" y1="10" x2="21" y2="10"/>
    <line x1="3" y1="15" x2="8" y2="15"/>
    <line x1="16" y1="15" x2="21" y2="15"/>
    <line x1="6" y1="5" x2="9" y2="2"/>
    <line x1="18" y1="5" x2="15" y2="2"/>
    <line x1="12" y1="11" x2="12" y2="16"/>`,
  database: `
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>`,
  dataAnalysis: `
    <path d="M3 3v17a1 1 0 0 0 1 1h17"/>
    <path d="M7 14l4-4 4 4 5-5"/>
    <circle cx="11" cy="10" r="1" fill="currentColor"/>
    <circle cx="15" cy="14" r="1" fill="currentColor"/>
    <circle cx="20" cy="9" r="1" fill="currentColor"/>`,
  image: `
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-5-5L5 21"/>`,
  system: `
    <rect x="3" y="3" width="18" height="13" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="16" x2="12" y2="21"/>`,
}

export function hasCategoryIcon(id) {
  return !!CATEGORY_ICONS[id]
}

// ===== 工具 -> 分类映射,用于上色 =====
export const TOOL_CATEGORY = {
  // note
  'sticky-notes': 'note', 'ebook-shelf': 'note', 'screenshot': 'note', 'multi-print': 'note',
  // dev
  'sdk-manager': 'dev', 'code-formatter': 'dev', 'regex-tester': 'dev', 'hex-converter': 'dev',
  'crypto': 'dev', 'maven-repo': 'dev',
  // git
  'git-manager': 'git', 'git-daily-report': 'git', 'file-compare': 'git',
  // network
  'port-manager': 'network', 'ip-lookup': 'network', 'dns-lookup': 'network',
  'speed-test': 'network', 'websocket-test': 'network', 'download-manager': 'network',
  'ssh-terminal': 'network',
  // test
  'api-debug': 'test', 'api-docs-page': 'test', 'mock-service': 'test',
  'perf-test': 'test', 'auto-test': 'test',
  // database
  'redis-client': 'database', 'sqlite-manager': 'database',
  // dataAnalysis
  'log-analyzer': 'dataAnalysis',
  // image
  'image-format': 'image', 'image-to-base64': 'image', 'wallpaper-manager': 'image',
  // system
  'hardware-info': 'system',
}

export function getCategoryOf(id) {
  return TOOL_CATEGORY[id] || null
}
