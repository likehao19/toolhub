// 批量替换所有蓝色系硬编码 -> 项目变量
const fs = require('fs');
const path = require('path');
const RULES = {
  // 淡蓝背景 -> surface
  '#f4f8fc': 'var(--bg-secondary)',
  '#f8fbfe': 'var(--surface-panel-soft)',
  '#f8fbff': 'var(--surface-panel-soft)',
  '#f7fbff': 'var(--surface-panel-soft)',
  '#f5f8fb': 'var(--surface-panel-soft)',
  '#f6f9fd': 'var(--surface-panel-soft)',
  '#edf4fb': 'var(--bg-secondary)',
  '#f0f2f5': 'var(--el-fill-color-light)',
  '#f4f6fa': 'var(--el-fill-color-light)',
  '#eef2f6': 'var(--el-fill-color-light)',
  '#e7ecf3': 'var(--el-fill-color-light)',
  '#e0e7ef': 'var(--el-fill-color-light)',
  // 蓝灰边框 -> border-color
  '#dfe7f1': 'var(--border-color)',
  '#cfd9e6': 'var(--border-color-strong)',
  '#c1d0e2': 'var(--border-color-strong)',
  '#d5e0ec': 'var(--border-color)',
  '#d6e0ec': 'var(--border-color)',
  '#d7e1ee': 'var(--border-color)',
  '#d8e2ef': 'var(--border-color)',
  '#c4d3e5': 'var(--border-color-strong)',
  '#c8d8ea': 'var(--border-color-strong)',
  '#b9c9de': 'var(--border-color-strong)',
  '#e1e4e8': 'var(--el-border-color-light)',
  // 蓝色品牌色 -> accent-blue (项目暖橙)
  '#3b7cf0': 'var(--accent-blue)',
  '#245fca': 'var(--accent-blue)',
  '#275fcc': 'var(--accent-blue)',
  '#2f6fe4': 'var(--accent-blue)',
  '#4a78d9': 'var(--accent-blue)',
  '#2d5fc9': 'var(--accent-blue)',
  '#234ea8': 'var(--accent-blue-active)',
  '#3a72d6': 'var(--accent-blue)',
  '#5a8dea': 'var(--accent-blue-hover)',
  '#316bd0': 'var(--accent-blue)',
  '#4c82e6': 'var(--accent-blue)',
  '#007aff': 'var(--accent-blue)',
  // EP 浅蓝 -> EP 变量
  '#66b1ff': 'var(--el-color-primary-light-3)',
  '#d9ecff': 'var(--el-color-primary-light-9)',
};
let filesChanged = 0, totalReplaced = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.claude' || f.name === 'dist' || f.name === '.git') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(vue|css|scss)$/.test(f.name)) {
      const orig = fs.readFileSync(p, 'utf8');
      let s = orig;
      for (const [hex, varRef] of Object.entries(RULES)) {
        const re = new RegExp(hex.replace('#', '#'), 'gi');
        const matches = s.match(re) || [];
        if (matches.length > 0) {
          totalReplaced += matches.length;
          s = s.replace(re, varRef);
        }
      }
      if (s !== orig) {
        fs.writeFileSync(p, s);
        filesChanged++;
      }
    }
  }
}
walk('src');
console.log('Files updated: ' + filesChanged);
console.log('Replacements: ' + totalReplaced);
