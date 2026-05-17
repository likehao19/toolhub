// 找真正的淡蓝色: 浅色 rgb/rgba/hex, 蓝色调
// 同时找 fade/transition/loading/mask/overlay 相关的背景规则
const fs = require('fs');
const path = require('path');

const palBlueHex = /#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})\b/g;
const rgbaRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/g;

function isPaleBlueHex(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r > 200 && g > 200 && b > 220 && b > r + 5 && b >= g;
}
function isPaleBlueRgba(r, g, b, a) {
  if (a !== undefined && +a < 0.05) return false;
  return r > 180 && g > 190 && b > 220 && b > r + 5 && b >= g;
}

const hits = [];
const transitionHits = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.claude', 'dist', '.git'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(vue|css|scss)$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8');
      const lines = s.split('\n');
      lines.forEach((line, i) => {
        // 淡蓝 hex
        const hex = [...line.matchAll(palBlueHex)];
        for (const m of hex) if (isPaleBlueHex(m[0])) {
          hits.push(path.relative('.', p).replace(/\\/g, '/') + ':' + (i+1) + '  ' + m[0] + '  ' + line.trim().slice(0, 110));
        }
        // 淡蓝 rgba
        const rg = [...line.matchAll(rgbaRe)];
        for (const m of rg) {
          const r = +m[1], g = +m[2], b = +m[3], a = m[4];
          if (isPaleBlueRgba(r, g, b, a)) {
            hits.push(path.relative('.', p).replace(/\\/g, '/') + ':' + (i+1) + '  ' + m[0] + '  ' + line.trim().slice(0, 110));
          }
        }
        // transition/fade/loading/mask/overlay 相关含 background 的行
        if (/(fade-enter|fade-leave|view-enter|view-leave|transition\b|el-loading|loading-mask|page-mask|el-overlay|overlay\b|skeleton|placeholder).*background|background.*(fade-enter|fade-leave|view-enter|view-leave|el-loading|loading-mask|overlay)/i.test(line)) {
          transitionHits.push(path.relative('.', p).replace(/\\/g, '/') + ':' + (i+1) + '  ' + line.trim().slice(0, 130));
        }
      });
    }
  }
}
walk('src');

console.log('=== 淡蓝色命中 (' + hits.length + ') ===');
hits.slice(0, 50).forEach(h => console.log('  ' + h));
console.log('\n=== transition/loading 相关 background (' + transitionHits.length + ') ===');
transitionHits.slice(0, 40).forEach(h => console.log('  ' + h));
