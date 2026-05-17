// 扫所有蓝色系 hex 硬编码
const fs = require('fs');
const path = require('path');
const BLUE_PATTERN = /#(?:f4f8fc|f8fbfe|f8fbff|f7fbff|eef5ff|f1f7ff|edf4fb|f6f9fd|f5f8fb|dfe7f1|cfd9e6|c1d0e2|d5e0ec|d6e0ec|c4d3e5|c8d8ea|b9c9de|d8e2ef|d7e1ee|3b7cf0|245fca|275fcc|2f6fe4|4a78d9|2d5fc9|234ea8|3a72d6|5a8dea|316bd0|4c82e6|66b1ff|d9ecff|ecf5ff|f0f9ff|007aff|1565c0|0288d1|2980b9|3498db|e1e4e8|e0e7ef|e7ecf3|eef2f6|f0f2f5|f4f6fa)\b/gi;
const counts = {};
const fileHits = {};
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.claude' || f.name === 'dist' || f.name === '.git') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(vue|css|scss)$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8');
      const matches = s.match(BLUE_PATTERN) || [];
      if (matches.length > 0) {
        const rel = path.relative('.', p).replace(/\\/g, '/');
        fileHits[rel] = matches.length;
        for (const m of matches) counts[m.toLowerCase()] = (counts[m.toLowerCase()] || 0) + 1;
      }
    }
  }
}
walk('src');
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log('剩余蓝色 hex 总数: ' + total);
console.log('\n按颜色:');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + k + ' : ' + n));
console.log('\n按文件 TOP 15:');
Object.entries(fileHits).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([f, n]) => console.log('  ' + n.toString().padStart(3) + '  ' + f));
