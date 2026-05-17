// 找单个 view 文件里 wrapper/page 类的 CSS 块,如果含淡蓝 rgba 就标记
const fs = require('fs');
const path = require('path');
function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.claude', 'dist', '.git'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (/\.vue$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8');
      const lines = s.split('\n');
      let in_w = false, depth = 0, start = 0, accum = '';
      lines.forEach((line, i) => {
        if (!in_w && /^\s*\.[a-z-]*(wrapper|page|shell|view)\b[^{]*\{/.test(line)) {
          in_w = true;
          depth = (line.match(/\{/g)||[]).length - (line.match(/\}/g)||[]).length;
          start = i+1;
          accum = line + '\n';
        } else if (in_w) {
          depth += (line.match(/\{/g)||[]).length - (line.match(/\}/g)||[]).length;
          accum += line + '\n';
          if (depth <= 0) {
            in_w = false;
            const rg = [...accum.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)];
            for (const m of rg) {
              const r = +m[1], g = +m[2], b = +m[3];
              if (r > 200 && g > 200 && b > 220 && b > r + 5) {
                const rel = path.relative('.', p).split(path.sep).join('/');
                out.push(rel + ':' + start + '  ' + accum.split('\n')[0].trim());
                break;
              }
            }
            // pale blue hex
            const hexs = [...accum.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)];
            for (const m of hexs) {
              let h = m[1]; if (h.length === 3) h = h.split('').map(c=>c+c).join('');
              const r = parseInt(h.slice(0,2),16);
              const g = parseInt(h.slice(2,4),16);
              const b = parseInt(h.slice(4,6),16);
              if (r > 200 && g > 200 && b > 220 && b > r + 5) {
                const rel = path.relative('.', p).split(path.sep).join('/');
                out.push(rel + ':' + start + '  ' + accum.split('\n')[0].trim() + '  [hex:' + m[0] + ']');
                break;
              }
            }
          }
        }
      });
    }
  }
  return out;
}
const hits = walk('src/views').concat(walk('src/components'));
console.log('View/component 顶层 wrapper 含淡蓝 (' + hits.length + '):');
hits.slice(0, 60).forEach(h => console.log('  ' + h));
