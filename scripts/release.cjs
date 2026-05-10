#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REMOTES = [
  { name: 'origin', branch: 'toolhub-dev-style', noProxy: true },  // gitee
  { name: 'github', branch: 'main', noProxy: false },               // github
];

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf8' }).toString().trim();
}

function shTry(cmd) {
  try { return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).toString().trim(); }
  catch { return null; }
}

function bump(version, kind) {
  const [maj, min, pat] = version.split('.').map(Number);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }

const pkgPath = path.resolve(__dirname, '../package.json');
const tauriPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
const pkg = readJSON(pkgPath);
const tauri = readJSON(tauriPath);

const arg = process.argv[2] || 'patch';
let next;
if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg)) {
  next = arg;
} else if (['patch', 'minor', 'major'].includes(arg)) {
  next = bump(pkg.version, arg);
} else {
  console.error(`Usage: npm run release [-- patch|minor|major|<x.y.z>]`);
  process.exit(1);
}

const tag = `v${next}`;
console.log(`\n  ${pkg.version} -> ${next}  (tag: ${tag})\n`);

const status = shTry('git status --porcelain') || '';
const dirty = status.split('\n').filter(l => l && !/\.claude\/worktrees\//.test(l));
if (dirty.length) {
  console.error('Uncommitted changes detected. Commit or stash first:\n' + dirty.join('\n'));
  process.exit(1);
}

if (shTry(`git rev-parse ${tag}`)) {
  console.error(`Tag ${tag} already exists.`);
  process.exit(1);
}

pkg.version = next;
tauri.version = next;
writeJSON(pkgPath, pkg);
writeJSON(tauriPath, tauri);

sh(`git add package.json src-tauri/tauri.conf.json`);
sh(`git commit -m "chore: release ${tag}"`);

const localBranch = sh('git rev-parse --abbrev-ref HEAD', { silent: true });
for (const r of REMOTES) {
  console.log(`\n--- push commits to ${r.name}/${r.branch} ---`);
  const proxyOverride = r.noProxy ? '-c http.proxy= -c https.proxy= ' : '';
  sh(`git ${proxyOverride}push ${r.name} ${localBranch}:${r.branch}`);
}

sh(`git tag ${tag}`);
for (const r of REMOTES) {
  console.log(`\n--- push tag ${tag} to ${r.name} ---`);
  const proxyOverride = r.noProxy ? '-c http.proxy= -c https.proxy= ' : '';
  sh(`git ${proxyOverride}push ${r.name} ${tag}`);
}

console.log(`\nDone. Watch: https://github.com/likehao19/toolhub/actions`);
console.log(`Release: https://github.com/likehao19/toolhub/releases/tag/${tag}`);
