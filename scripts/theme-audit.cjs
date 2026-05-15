// 主题清理最终统计
const fs = require('fs');
const path = require('path');

let hexTotal = 0, hexFiles = {};
let whiteRgba = 0;
let namedTotal = 0;
let inlineStyleHex = 0;
let importantHardcoded = 0;
let pseudoBg = 0;

const namedHits = {};
const remainingHex = {};

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.claude' || f.name === 'dist' || f.name === '.git') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(vue|css|scss)$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8');
      const rel = path.relative('.', p).replace(/\\/g, '/');

      const hexMatches = s.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      hexTotal += hexMatches.length;
      if (hexMatches.length > 0) hexFiles[rel] = hexMatches.length;
      for (const m of hexMatches) remainingHex[m.toLowerCase()] = (remainingHex[m.toLowerCase()] || 0) + 1;

      const whiteMatches = [...s.matchAll(/rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*([\d.]+))?\s*\)/g)];
      for (const m of whiteMatches) {
        const a = m[1] !== undefined ? parseFloat(m[1]) : 1;
        if (a >= 0.4) whiteRgba++;
      }

      const namedMatches = s.match(/[:,\s]\s*(white|black|gray|grey|red|green|blue|yellow|orange|purple|pink|silver|brown|cyan|magenta|navy|olive|teal|lime|aqua|fuchsia|maroon)\b(?![\s\w-])/gi) || [];
      namedTotal += namedMatches.length;
      for (const m of namedMatches) {
        const k = m.toLowerCase().replace(/[^a-z]/g, '');
        namedHits[k] = (namedHits[k] || 0) + 1;
      }

      if (/\.vue$/.test(f.name)) {
        const lines = s.split('\n');
        lines.forEach(line => {
          if (/(?:^|\s):?style=["'][^"']*#[0-9a-fA-F]{3,8}/.test(line)) inlineStyleHex++;
        });
      }

      const impMatches = s.match(/#[0-9a-fA-F]{3,8}\s*!important/g) || [];
      importantHardcoded += impMatches.length;

      const pseudoMatches = s.match(/:(?:hover|focus|active|focus-within)\s*\{[^}]*?background[^}]*?#[0-9a-fA-F]{3,8}[^}]*?\}/g) || [];
      pseudoBg += pseudoMatches.length;
    }
  }
}
walk('src');
console.log('=== 最终统计 ===');
console.log('总 hex: ' + hexTotal);
console.log('高 alpha 白色 rgba (>=0.4): ' + whiteRgba);
console.log('CSS 命名色: ' + namedTotal);
console.log('Vue inline style hex: ' + inlineStyleHex);
console.log('hex + !important: ' + importantHardcoded);
console.log('伪类背景 hex: ' + pseudoBg);
console.log();
console.log('=== 命名色分布 ===');
Object.entries(namedHits).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + k + ' : ' + n));
console.log();
console.log('=== 剩余 hex TOP 30 ===');
Object.entries(remainingHex).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, n]) => console.log('  ' + k + ' : ' + n));
console.log();
console.log('=== TOP 文件 ===');
Object.entries(hexFiles).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, n]) => console.log('  ' + n + '  ' + k));
