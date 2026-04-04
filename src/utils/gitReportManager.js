/**
 * Git 日报生成工具 API 封装
 * 扫描 git 提交记录，生成结构化日报，支持 AI 优化
 */

import { executeCommand } from './tauri/shell'
import { callAI, checkAIConfig } from './ai/api'

// Commit message 前缀分类规则
const COMMIT_CATEGORIES = [
  { prefixes: ['feat', 'feature'], label: '新功能', icon: '✨', en: 'New Features' },
  { prefixes: ['fix', 'bugfix', 'hotfix'], label: 'Bug 修复', icon: '🐛', en: 'Bug Fixes' },
  { prefixes: ['docs', 'doc'], label: '文档更新', icon: '📝', en: 'Documentation' },
  { prefixes: ['style'], label: '样式调整', icon: '💄', en: 'Styles' },
  { prefixes: ['refactor'], label: '代码重构', icon: '♻️', en: 'Refactoring' },
  { prefixes: ['perf'], label: '性能优化', icon: '⚡', en: 'Performance' },
  { prefixes: ['test', 'tests'], label: '测试相关', icon: '✅', en: 'Tests' },
  { prefixes: ['chore', 'build'], label: '工程化/构建', icon: '🔧', en: 'Chores' },
  { prefixes: ['ci'], label: 'CI/CD', icon: '👷', en: 'CI/CD' },
  { prefixes: ['revert'], label: '回退', icon: '⏪', en: 'Reverts' }
]

const OTHER_CATEGORY = { label: '其他工作', icon: '📌', en: 'Others' }

/**
 * 获取指定时间范围内的提交记录
 */
export async function getCommits(repoPath, { since, until, author } = {}) {
  // 用 %x00 (NUL) 做字段分隔，%x01 做记录分隔，避免 commit message 含 | 导致解析错误
  const SEP = '%x00'
  const REC_SEP = '%x01'
  const args = ['-C', repoPath, 'log', `--format=%H${SEP}%h${SEP}%s${SEP}%an${SEP}%ae${SEP}%ai${REC_SEP}`]
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (author) args.push(`--author=${author}`)

  const result = await executeCommand('git', args)
  if (result.code !== 0) return []

  return result.stdout.split('\x01').filter(s => s.trim()).map(record => {
    const [hash, shortHash, subject, authorName, email, date] = record.trim().split('\x00')
    const category = classifyCommit(subject || '')
    return { hash, shortHash, subject: subject || '', author: authorName, email, date, category }
  })
}

/**
 * 获取提交统计（文件变更、新增/删除行数）
 */
export async function getStats(repoPath, { since, until, author } = {}) {
  const args = ['-C', repoPath, 'log', '--shortstat', '--format=']
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (author) args.push(`--author=${author}`)

  const result = await executeCommand('git', args)
  if (result.code !== 0) return { filesChanged: 0, insertions: 0, deletions: 0 }

  let filesChanged = 0, insertions = 0, deletions = 0
  const lines = result.stdout.split('\n').filter(Boolean)
  for (const line of lines) {
    const fileMatch = line.match(/(\d+) files? changed/)
    const insertMatch = line.match(/(\d+) insertions?\(\+\)/)
    const deleteMatch = line.match(/(\d+) deletions?\(-\)/)
    if (fileMatch) filesChanged += parseInt(fileMatch[1])
    if (insertMatch) insertions += parseInt(insertMatch[1])
    if (deleteMatch) deletions += parseInt(deleteMatch[1])
  }

  return { filesChanged, insertions, deletions }
}

/**
 * 获取仓库所有作者
 */
export async function getAuthors(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'log', '--format=%an', '--all'])
  if (result.code !== 0) return []
  return [...new Set(result.stdout.split('\n').filter(Boolean))]
}

/**
 * 获取当前 git 用户
 */
export async function getCurrentUser(repoPath) {
  const result = await executeCommand('git', ['-C', repoPath, 'config', 'user.name'])
  if (result.code !== 0) return ''
  return result.stdout.trim()
}

/**
 * 根据 commit message 前缀分类
 */
function classifyCommit(subject) {
  const lower = subject.toLowerCase().trim()
  for (const cat of COMMIT_CATEGORIES) {
    for (const prefix of cat.prefixes) {
      if (lower.startsWith(prefix + ':') || lower.startsWith(prefix + '(')) {
        return { label: cat.label, icon: cat.icon }
      }
    }
  }
  return { label: OTHER_CATEGORY.label, icon: OTHER_CATEGORY.icon }
}

/**
 * 将提交按分类分组
 */
export function groupByCategory(commits) {
  const groups = new Map()
  for (const c of commits) {
    const key = c.category.label
    if (!groups.has(key)) {
      groups.set(key, { label: c.category.label, icon: c.category.icon, commits: [] })
    }
    groups.get(key).commits.push(c)
  }
  // 按分类规则顺序排序
  const order = COMMIT_CATEGORIES.map(c => c.label)
  const sorted = []
  for (const label of order) {
    if (groups.has(label)) sorted.push(groups.get(label))
  }
  if (groups.has(OTHER_CATEGORY.label)) sorted.push(groups.get(OTHER_CATEGORY.label))
  return sorted
}

/**
 * 生成 Markdown 格式日报
 */
export function generateReport(commits, stats, { date, repoNames = [] } = {}) {
  const dateStr = date || new Date().toISOString().slice(0, 10)
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(dateStr).getDay()]

  let md = `# 工作日报 — ${dateStr}（周${weekday}）\n\n`

  // 概览
  md += `## 📊 概览\n`
  md += `- 提交次数：${commits.length} 次\n`
  if (repoNames.length) {
    md += `- 涉及仓库：${repoNames.join(', ')}\n`
  }
  md += `- 代码变更：+${stats.insertions} / -${stats.deletions} 行，${stats.filesChanged} 个文件\n\n`

  // 按分类列出
  const groups = groupByCategory(commits)
  for (const group of groups) {
    md += `## ${group.icon} ${group.label}\n`
    for (const c of group.commits) {
      const time = c.date ? c.date.substring(11, 16) : ''
      const prefix = c.repoName ? `[${c.repoName}] ` : ''
      // 去掉 conventional commit 前缀
      const msg = c.subject.replace(/^\w+(\(.+?\))?:\s*/, '')
      md += `- ${prefix}${msg}${time ? '  (' + time + ')' : ''}\n`
    }
    md += '\n'
  }

  return md.trimEnd() + '\n'
}

/**
 * 多仓库聚合扫描
 */
export async function aggregateRepos(repoPaths, options = {}) {
  const allCommits = []
  const repoNames = []
  let totalStats = { filesChanged: 0, insertions: 0, deletions: 0 }

  const results = await Promise.all(
    repoPaths.map(async (repoPath) => {
      const name = repoPath.split(/[/\\]/).pop()
      const [commits, stats] = await Promise.all([
        getCommits(repoPath, options),
        getStats(repoPath, options)
      ])
      return { name, commits, stats }
    })
  )

  for (const r of results) {
    repoNames.push(r.name)
    for (const c of r.commits) {
      c.repoName = r.name
    }
    allCommits.push(...r.commits)
    totalStats.filesChanged += r.stats.filesChanged
    totalStats.insertions += r.stats.insertions
    totalStats.deletions += r.stats.deletions
  }

  // 按时间排序（预解析时间戳避免重复创建 Date）
  allCommits.sort((a, b) => {
    if (a._ts === undefined) a._ts = new Date(a.date).getTime()
    if (b._ts === undefined) b._ts = new Date(b.date).getTime()
    return b._ts - a._ts
  })

  return { commits: allCommits, stats: totalStats, repoNames }
}

/**
 * 使用 AI 优化日报内容
 * @param {string} rawReport - 原始 Markdown 日报
 * @returns {Promise<string>} AI 优化后的日报
 */
export async function optimizeWithAI(rawReport) {
  if (!(await checkAIConfig())) {
    throw new Error('请先在系统设置中配置 AI API')
  }

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的工作日报优化助手。请根据用户提供的 Git 提交记录生成的原始日报，进行以下优化：
1. 润色语言，使描述更加清晰专业
2. 合并相似的提交为一条简洁的描述
3. 按重要性排序（新功能 > Bug修复 > 重构 > 其他）
4. 补充"明日计划"章节（根据今日工作推测，标注为建议）
5. 保持 Markdown 格式不变
6. 保持简洁，不要添加过多修饰
请直接输出优化后的日报内容，不需要解释。`
    },
    {
      role: 'user',
      content: `请优化以下工作日报：\n\n${rawReport}`
    }
  ]

  return await callAI(messages, { temperature: 0.5, maxTokens: 3000 })
}

/**
 * 使用 AI 生成周报摘要
 */
export async function generateWeeklySummary(dailyReports) {
  if (!(await checkAIConfig())) {
    throw new Error('请先在系统设置中配置 AI API')
  }

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的工作周报生成助手。请根据本周多天的日报内容，生成一份精炼的周报。要求：
1. 提炼关键成果，不要逐天罗列
2. 分为"本周完成"、"进行中"、"下周计划"三个章节
3. 保持 Markdown 格式
4. 简洁专业`
    },
    {
      role: 'user',
      content: `请根据以下日报生成周报：\n\n${dailyReports}`
    }
  ]

  return await callAI(messages, { temperature: 0.5, maxTokens: 3000 })
}

export { COMMIT_CATEGORIES, OTHER_CATEGORY }
