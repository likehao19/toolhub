// 暗色主题问题诊断
const fs = require('fs');
const path = require('path');

const issues = {
  hardcoded_light_with_important: [],
  hardcoded_white_in_global_css: [],
  no_dark_override_for_wrapper: [],
  hardcoded_dark_color_for_text: [],
};

function walk(dir, files) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.claude', 'dist', '.git', 'scripts'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, files);
    else if (/\.(vue|css)$/.test(f.name)) files.push(p);
  }
}
const files = []; walk('src', files);

for (const file of files) {
  const s = fs.readFileSync(file, 'utf8');
  const lines = s.split('\n');
  lines.forEach((line, i) => {
    const trim = line.trim();
    if (trim.startsWith('//') || trim.startsWith('/*') || trim.startsWith('*')) return;

    // 1) hardcoded light bg with !important (会穿透暗色)
    if (/background[^:]*:[^;]*!important/.test(line)) {
      // 提取 rgba/hex
      const rgba = line.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      const hex = line.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
      let isLight = false, color = '';
      if (rgba) {
        const r = +rgba[1], g = +rgba[2], b = +rgba[3];
        if (r > 180 && g > 180 && b > 180) { isLight = true; color = rgba[0]; }
      }
      if (hex) {
        let h = hex[1]; if (h.length === 3) h = h.split('').map(c=>c+c).join('');
        const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
        if (r > 180 && g > 180 && b > 180) { isLight = true; color = hex[0]; }
      }
      if (isLight) {
        issues.hardcoded_light_with_important.push(file.replace(/\\/g, '/') + ':' + (i+1) + '  [' + color + ']  ' + trim.slice(0, 100));
      }
    }

    // 2) hardcoded text color too dark for dark mode
    if (/color\s*:\s*#(?:0[0-9a-f]|1[0-9a-f]|2[0-9a-f]|3[0-3])/.test(line) && !/--/.test(line)) {
      issues.hardcoded_dark_color_for_text.push(file.replace(/\\/g, '/') + ':' + (i+1) + '  ' + trim.slice(0, 100));
    }
  });
}

console.log('=== 1) 浅色 !important 背景 (暗色下会显示成浅色, 共 ' + issues.hardcoded_light_with_important.length + ') ===');
const byFile1 = {};
issues.hardcoded_light_with_important.forEach(h => {
  const f = h.split(':')[0];
  byFile1[f] = (byFile1[f] || 0) + 1;
});
Object.entries(byFile1).sort((a,b) => b[1]-a[1]).slice(0, 15).forEach(([f,n]) => console.log('  ' + n + '  ' + f));

console.log('\n样本 (前20):');
issues.hardcoded_light_with_important.slice(0, 20).forEach(h => console.log('  ' + h));

console.log('\n=== 2) hardcoded 深色文字 (暗色下不可读, 共 ' + issues.hardcoded_dark_color_for_text.length + ') ===');
const byFile2 = {};
issues.hardcoded_dark_color_for_text.forEach(h => {
  const f = h.split(':')[0];
  byFile2[f] = (byFile2[f] || 0) + 1;
});
Object.entries(byFile2).sort((a,b) => b[1]-a[1]).slice(0, 15).forEach(([f,n]) => console.log('  ' + n + '  ' + f));
