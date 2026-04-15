/**
 * Git 管理工具 API 封装
 * 通过 Tauri shell 调用 git 命令
 */

import { executeCommand } from './tauri/shell'
import { platform } from '@tauri-apps/plugin-os'

let _platform = null
async function getPlatform() {
  if (!_platform) {
    const detected = await platform()
    const normalized = String(detected || '').toLowerCase()
    _platform = normalized === 'windows' ? 'win32' : normalized
  }
  return _platform
}

/**
 * 检查目录是否为 git 仓库
 */
export async function isGitRepo(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'rev-parse', '--is-inside-work-tree'])
  return result.code === 0 && result.stdout.trim() === 'true'
}

/**
 * 扫描本地所有 git 仓库（跨平台）
 * Windows: PowerShell Get-ChildItem
 * macOS/Linux: find 命令
 */
export async function discoverRepos() {
  const os = await getPlatform()
  return os === 'win32' ? discoverReposWindows() : discoverReposUnix()
}

async function discoverReposWindows() {
  const found = new Set()

  const homeResult = await executeCommand('cmd.exe', ['/c', 'echo', '%USERPROFILE%'])
  const home = (homeResult.stdout || '').trim()

  const driveResult = await executeCommand('powershell.exe', [
    '-NoProfile', '-Command',
    "(Get-PSDrive -PSProvider FileSystem).Name -join ','"
  ])
  const driveLetters = (driveResult.stdout || '').trim().split(',').filter(Boolean)
  const drives = driveLetters.length ? driveLetters.map(d => d + ':') : ['C:', 'D:']

  await Promise.all(drives.map(async (drive) => {
    const scanRoot = (drive === 'C:' && home) ? home : drive + '\\'
    try {
      const result = await executeCommand('powershell.exe', [
        '-NoProfile', '-Command',
        `Get-ChildItem -Path '${scanRoot}' -Filter '.git' -Directory -Recurse -Depth 6 -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.Parent.FullName }`
      ])
      ;(result.stdout || '').split('\n').forEach(line => {
        const p = line.trim()
        if (p && /^[A-Z]:\\/.test(p)) found.add(p)
      })
    } catch { /* 盘符不可访问 */ }
  }))

  return filterRepos(found)
}

async function discoverReposUnix() {
  const found = new Set()

  // 获取用户主目录
  const homeResult = await executeCommand('sh', ['-c', 'echo $HOME'])
  const home = (homeResult.stdout || '').trim() || '/root'

  const scanRoots = [home]

  // 尝试扫描常见项目目录（如 /opt, /var/www 等）
  const extraDirs = ['/opt', '/var/www', '/srv']
  for (const dir of extraDirs) {
    try {
      const check = await executeCommand('sh', ['-c', `test -d '${dir}' && echo ok`])
      if (check.code === 0 && (check.stdout || '').includes('ok')) scanRoots.push(dir)
    } catch { /* ignore */ }
  }

  await Promise.all(scanRoots.map(async (root) => {
    try {
      const result = await executeCommand('find', [
        root, '-maxdepth', '7', '-name', '.git', '-type', 'd',
        '-not', '-path', '*/node_modules/*',
        '-not', '-path', '*/.cache/*'
      ])
      ;(result.stdout || '').split('\n').forEach(line => {
        const p = line.trim()
        if (p && p.endsWith('/.git')) {
          // 取 .git 的父目录
          found.add(p.replace(/\/\.git$/, ''))
        }
      })
    } catch { /* 目录不可访问 */ }
  }))

  return filterRepos(found)
}

function filterRepos(found) {
  const excludePatterns = [
    /[/\\]node_modules[/\\]/i,
    /[/\\]\.pnpm/i,
    /[/\\]\.cache[/\\]/i,
    /[/\\]\.cargo[/\\]registry/i,
    /[/\\]\.rustup[/\\]/i,
    /[/\\]\$Recycle/i,
  ]
  return [...found].filter(p => !excludePatterns.some(re => re.test(p))).sort()
}

/**
 * 获取工作区状态（porcelain v1 格式）
 * 返回解析后的文件状态数组
 *
 * core.quotePath=false → 中文文件名原样输出，不转义为 \xxx 八进制
 */
export async function getStatus(repoPath) {
  const result = await executeCommand('git', [
    '-C', repoPath,
    '-c', 'core.quotePath=false',
    'status', '--porcelain'
  ])
  if (result.code !== 0) throw new Error(result.stderr)

  const files = []
  const lines = result.stdout.split('\n').filter(Boolean)
  for (const line of lines) {
    const staged = line[0]    // index status
    const unstaged = line[1]  // worktree status
    let filePath = line.substring(3)

    // 去掉 git 可能包裹的引号（如路径含空格时）
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1)
    }
    filePath = filePath.trim()

    // 处理重命名
    let oldPath = null
    let displayPath = filePath
    if (filePath.includes(' -> ')) {
      const parts = filePath.split(' -> ')
      oldPath = parts[0]
      displayPath = parts[1]
    }

    files.push({
      path: displayPath,
      oldPath,
      staged,
      unstaged,
      status: getFileStatus(staged, unstaged),
      isStaged: staged !== ' ' && staged !== '?',
      isUntracked: staged === '?' && unstaged === '?'
    })
  }
  return files
}

function getFileStatus(staged, unstaged) {
  if (staged === '?' && unstaged === '?') return 'untracked'
  if (staged === 'A') return 'added'
  if (staged === 'D' || unstaged === 'D') return 'deleted'
  if (staged === 'R') return 'renamed'
  if (staged === 'M' || unstaged === 'M') return 'modified'
  if (staged === 'C') return 'copied'
  return 'unknown'
}

/**
 * 检查仓库是否有至少一个提交
 */
export async function hasCommits(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'rev-parse', 'HEAD'])
  return result.code === 0
}

/**
 * 获取当前分支名
 */
export async function getCurrentBranch(repoPath) {
  // 先尝试正常方式
  const result = await executeCommand('git', ['-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.code === 0) return result.stdout.trim()
  // 空仓库：从 symbolic-ref 读取
  const sym = await executeCommand('git', ['-C', repoPath, 'symbolic-ref', '--short', 'HEAD'])
  if (sym.code === 0) return sym.stdout.trim()
  return 'main'
}

/**
 * 获取所有本地分支
 */
export async function getBranches(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'branch', '--format=%(refname:short)'])
  if (result.code !== 0) return []
  return result.stdout.split('\n').filter(Boolean).map(b => b.trim())
}

/**
 * 获取远程领先/落后状态
 * @returns {{ ahead: number, behind: number }} 或 null（无上游分支或空仓库）
 */
export async function getRemoteStatus(repoPath) {
  if (!(await hasCommits(repoPath))) return null
  const result = await executeCommand('git', ['-C', repoPath, 'rev-list', '--left-right', '--count', 'HEAD...@{u}'])
  if (result.code !== 0) return null
  const parts = result.stdout.trim().split(/\s+/)
  return { ahead: parseInt(parts[0]) || 0, behind: parseInt(parts[1]) || 0 }
}

/**
 * 暂存文件
 */
export async function stageFiles(repoPath, files) {
  const result = await executeCommand('git', ['-C', repoPath, 'add', '--', ...files])
  if (result.code !== 0) throw new Error(result.stderr)
  return true
}

/**
 * 取消暂存文件（兼容空仓库）
 */
export async function unstageFiles(repoPath, files) {
  if (await hasCommits(repoPath)) {
    const result = await executeCommand('git', ['-C', repoPath, 'restore', '--staged', '--', ...files])
    if (result.code !== 0) throw new Error(result.stderr)
  } else {
    // 空仓库没有 HEAD，用 rm --cached
    const result = await executeCommand('git', ['-C', repoPath, 'rm', '--cached', '--', ...files])
    if (result.code !== 0) throw new Error(result.stderr)
  }
  return true
}

/**
 * 暂存所有文件
 */
export async function stageAll(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'add', '-A'])
  if (result.code !== 0) throw new Error(result.stderr)
  return true
}

/**
 * 取消暂存所有文件（兼容空仓库）
 */
export async function unstageAll(repoPath) {
  if (await hasCommits(repoPath)) {
    const result = await executeCommand('git', ['-C', repoPath, 'reset', 'HEAD'])
    if (result.code !== 0) throw new Error(result.stderr)
  } else {
    const result = await executeCommand('git', ['-C', repoPath, 'rm', '--cached', '-r', '.'])
    if (result.code !== 0) throw new Error(result.stderr)
  }
  return true
}

/**
 * 提交
 */
export async function commit(repoPath, message) {
  const result = await executeCommand('git', ['-C', repoPath, 'commit', '-m', message])
  if (result.code !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout
}

/**
 * 推送
 */
export async function push(repoPath, remote = 'origin', branch = '') {
  const args = ['-C', repoPath, 'push', remote]
  if (branch) args.push(branch)
  const result = await executeCommand('git', args)
  if (result.code !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout || result.stderr
}

/**
 * 拉取
 */
export async function pull(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'pull'])
  if (result.code !== 0) throw new Error(result.stderr || result.stdout)
  return result.stdout || result.stderr
}

/**
 * 获取文件 diff（对比指定引用）
 * @param {boolean} staged - true=已暂存的diff, false=未暂存的diff
 */
export async function getFileDiff(repoPath, file, staged = false) {
  const args = ['-C', repoPath, '-c', 'core.quotePath=false', 'diff']
  if (staged) args.push('--cached')
  args.push('--', file)
  const result = await executeCommand('git', args)
  if (result.code !== 0) throw new Error(result.stderr)
  return result.stdout
}

/**
 * 获取文件从 HEAD 到工作区的完整 diff（包含暂存+未暂存的所有变更）
 * 适用于 IDEA 风格的统一"更改"视图，AM/MM 等双状态文件也能看到完整改动
 */
export async function getFileDiffFull(repoPath, file) {
  // 优先对比 HEAD → 工作区（完整变更）
  if (await hasCommits(repoPath)) {
    const result = await executeCommand('git', [
      '-C', repoPath, '-c', 'core.quotePath=false',
      'diff', 'HEAD', '--', file
    ])
    if (result.code === 0 && result.stdout) return result.stdout
  }
  // 空仓库或新增文件不在 HEAD 中 → fallback 到 --cached
  const fallback = await executeCommand('git', [
    '-C', repoPath, '-c', 'core.quotePath=false',
    'diff', '--cached', '--', file
  ])
  if (fallback.code === 0 && fallback.stdout) return fallback.stdout
  // 最后尝试无参 diff（未暂存变更）
  const last = await executeCommand('git', [
    '-C', repoPath, '-c', 'core.quotePath=false',
    'diff', '--', file
  ])
  return last.stdout || ''
}

/**
 * 获取未跟踪文件内容（作为 diff 展示，跨平台）
 */
export async function getUntrackedFileContent(repoPath, file) {
  const os = await getPlatform()
  if (os === 'win32') {
    const fullPath = `${repoPath}\\${file.replace(/\//g, '\\')}`
    const safePath = fullPath.replace(/'/g, "''")
    const result = await executeCommand('powershell.exe', [
      '-NoProfile', '-Command',
      `Get-Content -Path '${safePath}' -Raw -Encoding UTF8 -ErrorAction SilentlyContinue`
    ])
    return result.stdout || ''
  } else {
    const fullPath = `${repoPath}/${file}`
    const result = await executeCommand('cat', [fullPath])
    return result.stdout || ''
  }
}

/**
 * Stash 保存
 */
export async function stash(repoPath, message = '') {
  const args = ['-C', repoPath, 'stash', 'push']
  if (message) args.push('-m', message)
  const result = await executeCommand('git', args)
  if (result.code !== 0) throw new Error(result.stderr)
  return result.stdout
}

/**
 * Stash 恢复
 */
export async function stashPop(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'stash', 'pop'])
  if (result.code !== 0) throw new Error(result.stderr)
  return result.stdout
}

/**
 * Stash 列表
 */
export async function stashList(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'stash', 'list'])
  if (result.code !== 0) throw new Error(result.stderr)
  return result.stdout.split('\n').filter(Boolean)
}

/**
 * 获取提交日志
 */
export async function getLog(repoPath, count = 50) {
  if (!(await hasCommits(repoPath))) return []
  const SEP = '%x00'
  const REC_SEP = '%x01'
  const result = await executeCommand('git', [
    '-C', repoPath,
    '-c', 'core.quotePath=false',
    'log',
    `-${count}`,
    `--format=%H${SEP}%h${SEP}%s${SEP}%an${SEP}%ai${SEP}%D${REC_SEP}`
  ])
  if (result.code !== 0) return []

  return result.stdout.split('\x01').filter(s => s.trim()).map(record => {
    const [hash, shortHash, subject, author, date, refs] = record.trim().split('\x00')
    return { hash, shortHash, subject, author, date, refs: refs || '' }
  })
}

/**
 * 切换分支
 */
export async function checkoutBranch(repoPath, branch) {
  const result = await executeCommand('git', ['-C', repoPath, 'checkout', branch])
  if (result.code !== 0) throw new Error(result.stderr)
  return true
}

/**
 * 创建并切换新分支
 */
export async function createBranch(repoPath, branch) {
  const result = await executeCommand('git', ['-C', repoPath, 'checkout', '-b', branch])
  if (result.code !== 0) throw new Error(result.stderr)
  return true
}

/**
 * 删除分支
 */
export async function deleteBranch(repoPath, branch) {
  const result = await executeCommand('git', ['-C', repoPath, 'branch', '-d', branch])
  if (result.code !== 0) throw new Error(result.stderr)
  return true
}

/**
 * 获取远程列表
 */
export async function getRemotes(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'remote', '-v'])
  if (result.code !== 0) return []
  const remotes = new Map()
  result.stdout.split('\n').filter(Boolean).forEach(line => {
    const [name, url] = line.split(/\s+/)
    remotes.set(name, url)
  })
  return Array.from(remotes, ([name, url]) => ({ name, url }))
}

/**
 * 获取仓库根目录
 */
export async function getRepoRoot(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'rev-parse', '--show-toplevel'])
  if (result.code !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}
