// 蓝色 rgba 检查 - 按文件分组,聚焦背景类
const fs = require('fs');
const path = require('path');
const byFile = {};
const bgLines = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.claude' || f.name === 'dist' || f.name === '.git') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(vue|css|scss)$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8');
      const lines = s.split('\n');
      lines.forEach((line, i) => {
        const rgbaMatches = [...line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)];
        for (const rm of rgbaMatches) {
          const r = +rm[1], g = +rm[2], b = +rm[3];
          if (b > 150 && b > r + 30 && b > g + 10) {
            const rel = path.relative('.', p).replace(/\\/g, '/');
            byFile[rel] = (byFile[rel] || 0) + 1;
            // 重点关注 background/bg/page-transition
            if (/background|bg-|page-|transition|router|view-|app-/.test(line)) {
              bgLines.push(rel + ':' + (i + 1) + ' ' + line.trim().slice(0, 120));
            }
          }
        }
      });
    }
  }
}
walk('src');
const sorted = Object.entries(byFile).sort((a, b) => b[1] - a[1]);
console.log('按文件统计:');
sorted.slice(0, 20).forEach(([f, n]) => console.log('  ' + n + '  ' + f));
console.log('\n背景/transition 相关 (' + bgLines.length + '):');
bgLines.slice(0, 30).forEach(l => console.log('  ' + l));
