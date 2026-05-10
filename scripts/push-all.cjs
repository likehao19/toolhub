#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('child_process');

const TARGETS = [
  { remote: 'origin', branch: 'toolhub-dev-style', label: 'gitee' },
  { remote: 'github', branch: 'main', label: 'github' },
];

function sh(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

const localBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
console.log(`\nLocal branch: ${localBranch}\n`);

const extraArgs = process.argv.slice(2).join(' ');
const results = [];

for (const t of TARGETS) {
  console.log(`--- pushing to ${t.label} (${t.remote}/${t.branch}) ---`);
  const ok = sh(`git push ${extraArgs} ${t.remote} ${localBranch}:${t.branch}`);
  results.push({ ...t, ok });
  console.log('');
}

console.log('Summary:');
for (const r of results) {
  console.log(`  ${r.ok ? 'OK ' : 'FAIL'}  ${r.label.padEnd(8)} ${r.remote}/${r.branch}`);
}

if (results.some(r => !r.ok)) process.exit(1);
