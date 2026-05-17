// 全项目 hardcoded 浅色 hex 边框/背景 -> 主题变量
const fs = require('fs');
const path = require('path');

// 浅色 hex: 三通道都 > 200
function isLightHex(h) {
  let v = h.slice(1).toLowerCase();
  if (v.length === 3) v = v.split('').map(c => c + c).join('');
  if (v.length !== 6) return false;
  const r = parseInt(v.slice(0,2),16), g = parseInt(v.slice(2,4),16), b = parseInt(v.slice(4,6),16);
  return r > 200 && g > 200 && b > 200;
}

const hits = [];
function processFile(p) {
  let s = fs.readFileSync(p, 'utf8');
  const lines = s.split('\n');
  let n = 0;
  const newLines = lines.map((line, idx) => {
    const trim = line.trim();
    if (trim.startsWith('//') || trim.startsWith('*')) return line;

    // 只在 background / border / box-shadow / outline / gradient 上下文
    if (!/background|border|box-shadow|outline|gradient/.test(line)) return line;
    // 跳过 transition / animation 含的属性名 (不是颜色)
    if (/^\s*transition\s*:/.test(line) || /^\s*animation\s*:/.test(line)) return line;

    return line.replace(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g, (m, hex) => {
      if (!isLightHex(m)) return m;
      n++;
      hits.push(p.replace(/\\/g, '/') + ':' + (idx+1) + '  [' + m + ']');
      // 根据上下文决定换什么 var
      if (/border(?!-radius|-style|-width|-collapse|-spacing|-image)/.test(line)) {
        return 'var(--border-color)';
      }
      if (/background|gradient/.test(line)) {
        return 'var(--surface-panel-soft)';
      }
      if (/box-shadow|outline/.test(line)) {
        return 'var(--divider)';
      }
      return 'var(--surface-panel-soft)';
    });
  });
  if (n > 0) fs.writeFileSync(p, newLines.join('\n'));
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

const total = walk('src');
console.log('TOTAL: ' + total);
const byFile = {};
hits.forEach(h => { const f = h.split(':')[0]; byFile[f] = (byFile[f]||0)+1; });
Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([f,n]) => console.log('  ' + n + '  ' + f));
console.log('\n样本前 15:');
hits.slice(0, 15).forEach(h => console.log('  ' + h));
