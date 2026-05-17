// 把 toolbox.categories 里所有 label 前缀的 emoji 去掉
const fs = require('fs');

function stripEmojiPrefix(file, blockStartRe) {
  let s = fs.readFileSync(file, 'utf8');
  const lines = s.split('\n');
  let startIdx = -1, endIdx = -1, depth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (startIdx === -1 && blockStartRe.test(lines[i])) {
      startIdx = i;
      depth = 1;
      continue;
    }
    if (startIdx !== -1) {
      depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
      if (depth <= 0) { endIdx = i; break; }
    }
  }
  if (startIdx === -1) return 0;
  let n = 0;
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const m = lines[i].match(/^(\s*\w+\s*:\s*['"])([^'"]+)(['"],?\s*)$/);
    if (!m) continue;
    const val = m[2];
    const stripped = val.replace(/^[\u{1F000}-\u{1FFFF}⌀-⟿⬀-⯿️‍]+\s*/u, '');
    if (stripped !== val) {
      lines[i] = m[1] + stripped + m[3];
      n++;
    }
  }
  fs.writeFileSync(file, lines.join('\n'));
  return n;
}

const z = stripEmojiPrefix('src/i18n/locales/zh-CN.js', /^\s*toolbox:\s*\{/);
console.log('zh-CN cleaned: ' + z);

const e = stripEmojiPrefix('src/i18n/locales/en-US.js', /^\s*toolbox:\s*\{/);
console.log('en-US cleaned: ' + e);
