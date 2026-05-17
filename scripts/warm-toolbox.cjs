// 把 toolbox-unified.css 里的冷蓝 rgba 全部换成暖奶油同亮度等价
// 规则:
//   r>200 g>200 b>220 b>r+5  =>  pale cool white  =>  rgba(254, 248, 240, a)
//   r=219..225, g 在 230..240, b 248..255  =>  cool blue radial highlight  =>  rgba(254, 215, 170, a)
//   r=220, g=252, b=231  =>  cool green radial  =>  rgba(254, 215, 170, a)
const fs = require('fs');
const files = ['src/styles/toolbox-unified.css', 'src/styles/design-refresh.css', 'src/styles/editorial-flat.css', 'src/styles/common.css'];
let coolTotal = 0, hlTotal = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  let coolHits = 0, highlightHits = 0;
  s = s.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g, (m, r, g, b, a) => {
    r = +r; g = +g; b = +b;
    if ((r >= 215 && r <= 225 && g >= 230 && b >= 248 && b > r + 20) ||
        (r === 220 && g === 252 && b === 231)) {
      highlightHits++;
      return `rgba(254, 215, 170, ${a})`;
    }
    if (r > 200 && g > 200 && b > 220 && b > r + 3) {
      coolHits++;
      return `rgba(254, 248, 240, ${a})`;
    }
    return m;
  });
  fs.writeFileSync(file, s);
  coolTotal += coolHits; hlTotal += highlightHits;
  console.log(file + ': cool=' + coolHits + ' highlight=' + highlightHits);
}
console.log('TOTAL: cool=' + coolTotal + ' highlight=' + hlTotal);
