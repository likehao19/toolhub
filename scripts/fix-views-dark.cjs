// 把 views/components 里 hardcoded 浅色 rgba 全部换主题变量
const fs = require('fs');
const path = require('path');

// 浅色 rgba 模式 -> 替换成什么 var
// 规则: 任何 r/g/b 都 > 200 的 rgba(),且不是纯品牌色,统一换 var(--surface-panel-soft)
// 纯白 rgba(255,255,255,a): a >= 0.2 才换 (避免动光晕/阴影里的微透明白)
function isLight(r, g, b) { return r > 200 && g > 200 && b > 200; }

function processFile(p) {
  let s = fs.readFileSync(p, 'utf8');
  const lines = s.split('\n');
  let n = 0;
  const newLines = lines.map((line, idx) => {
    const trim = line.trim();
    if (trim.startsWith('//') || trim.startsWith('*')) return line;
    // 只在 background / gradient / box-shadow 上下文换 (不动 color/border/text)
    if (!/background|gradient/.test(line)) return line;

    return line.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/g, (m, r, g, b, a) => {
      r = +r; g = +g; b = +b;
      const alpha = a !== undefined ? +a : 1;
      if (!isLight(r, g, b)) return m;
      // 纯白 a < 0.2 不换 (高光,不是底色)
      if (r === 255 && g === 255 && b === 255 && alpha < 0.2) return m;
      n++;
      return 'var(--surface-panel-soft)';
    });
  });
  if (n > 0) {
    fs.writeFileSync(p, newLines.join('\n'));
    console.log(p.replace(/\\/g, '/') + ': ' + n);
  }
  return n;
}

function walk(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.claude', 'dist', '.git', 'scripts'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) total += walk(p);
    else if (/\.(vue|css)$/.test(f.name)) total += processFile(p);
  }
  return total;
}
const total = walk('src/views') + walk('src/components');
console.log('TOTAL: ' + total);
