// 把硬编码暖色 rgba 换成主题感知变量,修复暗色主题穿透
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/styles/toolbox-unified.css',
  'src/styles/editorial-flat.css',
  'src/styles/design-refresh.css',
  'src/styles/theme-refresh.css',
  'src/styles/common.css',
];

let total = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  let count = 0;

  // 1) gradient 中的暖奶油底层 -> var(--surface-panel-soft)
  s = s.replace(/rgba\(254,\s*248,\s*240,\s*[0-9.]+\)/g, () => { count++; return 'var(--surface-panel-soft)'; });
  // 2) hardcoded 暖奶油 (editorial-flat 用的) -> var(--surface-panel-soft)
  s = s.replace(/rgba\(253,\s*251,\s*246,\s*[0-9.]+\)/g, () => { count++; return 'var(--surface-panel-soft)'; });
  // 3) cool-grey 残留 #f5f5f7 等价 rgba
  s = s.replace(/rgba\(245,\s*245,\s*247,\s*[0-9.]+\)/g, () => { count++; return 'var(--tb-bg)'; });
  s = s.replace(/rgba\(251,\s*251,\s*253,\s*[0-9.]+\)/g, () => { count++; return 'var(--surface-panel-soft)'; });
  // 4) 暖橙 radial highlight -> var(--accent-warm-soft) (light=#fff1e6, dark=rgba(251,146,60,0.14))
  s = s.replace(/rgba\(254,\s*215,\s*170,\s*[0-9.]+\)/g, () => { count++; return 'var(--accent-warm-soft)'; });

  fs.writeFileSync(file, s);
  if (count) console.log(file + ': ' + count);
  total += count;
}
console.log('TOTAL: ' + total);
