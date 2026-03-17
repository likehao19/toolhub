/**
 * 抓取 ai.md 中所有 AI 网站的 favicon，转 base64 输出到 src/data/ai-sites.js
 * 用法: node scripts/fetch-ai-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CATEGORIES = [
  { id: 'general',    name: '通用AI' },
  { id: 'coding',     name: 'AI 编程' },
  { id: 'writing',    name: 'AI 写作' },
  { id: 'image',      name: 'AI 绘图' },
  { id: 'video',      name: 'AI 视频' },
  { id: 'audio',      name: 'AI 音频' },
  { id: 'office',     name: 'AI 办公' },
  { id: 'automation', name: 'AI 效率' },
]

const SITES = [
  // 1. 通用AI
  { name: 'ChatGPT',    url: 'https://chat.openai.com',       category: 'general' },
  { name: 'Claude',     url: 'https://claude.ai',             category: 'general' },
  { name: 'Gemini',     url: 'https://gemini.google.com',     category: 'general' },
  { name: 'Copilot',    url: 'https://copilot.microsoft.com', category: 'general' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai',     category: 'general' },
  { name: 'Grok',       url: 'https://grok.x.ai',            category: 'general' },
  { name: 'Poe',        url: 'https://poe.com',               category: 'general' },
  { name: 'Meta AI',    url: 'https://ai.meta.com',           category: 'general' },
  { name: 'DeepSeek',   url: 'https://chat.deepseek.com',     category: 'general' },
  { name: 'Kimi',       url: 'https://kimi.moonshot.cn',      category: 'general' },
  { name: '豆包',       url: 'https://www.doubao.com',        category: 'general' },
  { name: '通义千问',   url: 'https://tongyi.aliyun.com',     category: 'general' },
  { name: '文心一言',   url: 'https://yiyan.baidu.com',       category: 'general' },
  { name: '腾讯元宝',   url: 'https://yuanbao.tencent.com',   category: 'general' },
  { name: '智谱清言',   url: 'https://chatglm.cn',            category: 'general' },

  // 2. AI 编程
  { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', category: 'coding' },
  { name: 'Cursor',         url: 'https://cursor.sh',                   category: 'coding' },
  { name: 'Codeium',        url: 'https://codeium.com',                 category: 'coding' },
  { name: 'Replit',          url: 'https://replit.com',                  category: 'coding' },
  { name: 'Blackbox AI',    url: 'https://www.blackbox.ai',             category: 'coding' },
  { name: 'Tabnine',        url: 'https://www.tabnine.com',             category: 'coding' },
  { name: 'v0',             url: 'https://v0.dev',                      category: 'coding' },
  { name: 'Sourcegraph Cody', url: 'https://sourcegraph.com/cody',     category: 'coding' },
  { name: 'MarsCode',       url: 'https://www.marscode.com',            category: 'coding' },

  // 3. AI 写作
  { name: 'Jasper',     url: 'https://www.jasper.ai',             category: 'writing' },
  { name: 'Copy.ai',    url: 'https://www.copy.ai',               category: 'writing' },
  { name: 'Writesonic', url: 'https://writesonic.com',             category: 'writing' },
  { name: 'Rytr',       url: 'https://rytr.me',                    category: 'writing' },
  { name: 'Notion AI',  url: 'https://www.notion.so/product/ai',   category: 'writing' },
  { name: 'Grammarly',  url: 'https://www.grammarly.com',          category: 'writing' },
  { name: 'QuillBot',   url: 'https://quillbot.com',               category: 'writing' },
  { name: '秘塔写作猫', url: 'https://xiezuocat.com',              category: 'writing' },
  { name: 'Effidit',    url: 'https://effidit.qq.com',             category: 'writing' },

  // 4. AI 图像
  { name: 'Midjourney',    url: 'https://www.midjourney.com',          category: 'image' },
  { name: 'DALL·E',        url: 'https://openai.com/dall-e',           category: 'image' },
  { name: 'Stable Diffusion', url: 'https://stability.ai',            category: 'image' },
  { name: 'Leonardo AI',   url: 'https://leonardo.ai',                 category: 'image' },
  { name: 'Adobe Firefly', url: 'https://firefly.adobe.com',           category: 'image' },
  { name: 'Playground',    url: 'https://playgroundai.com',             category: 'image' },
  { name: 'Ideogram',      url: 'https://ideogram.ai',                 category: 'image' },
  { name: 'Dreamina',      url: 'https://dreamina.capcut.com',          category: 'image' },
  { name: '通义万相',      url: 'https://tongyi.aliyun.com/wanxiang',   category: 'image' },

  // 5. AI 视频
  { name: 'Runway',   url: 'https://runwayml.com',          category: 'video' },
  { name: 'Pika',     url: 'https://pika.art',              category: 'video' },
  { name: 'Synthesia', url: 'https://www.synthesia.io',     category: 'video' },
  { name: 'HeyGen',   url: 'https://www.heygen.com',        category: 'video' },
  { name: 'Pictory',  url: 'https://pictory.ai',            category: 'video' },
  { name: 'Hailuo AI', url: 'https://hailuoai.com',         category: 'video' },
  { name: '混元视频',  url: 'https://hunyuan.tencent.com',   category: 'video' },

  // 6. AI 音频
  { name: 'ElevenLabs', url: 'https://elevenlabs.io',       category: 'audio' },
  { name: 'Murf AI',    url: 'https://murf.ai',             category: 'audio' },
  { name: 'Descript',   url: 'https://www.descript.com',     category: 'audio' },
  { name: 'Suno',       url: 'https://suno.ai',             category: 'audio' },
  { name: 'Udio',       url: 'https://udio.com',            category: 'audio' },
  { name: 'Fish Audio', url: 'https://fish.audio',          category: 'audio' },

  // 7. AI 办公
  { name: 'Canva',       url: 'https://www.canva.com',       category: 'office' },
  { name: 'Gamma',       url: 'https://gamma.app',           category: 'office' },
  { name: 'Tome',        url: 'https://tome.app',            category: 'office' },
  { name: 'Beautiful.ai', url: 'https://www.beautiful.ai',   category: 'office' },
  { name: '博思AIPPT',   url: 'https://aippt.cn',            category: 'office' },

  // 8. AI 效率
  { name: 'Zapier',     url: 'https://zapier.com',           category: 'automation' },
  { name: 'Make',       url: 'https://www.make.com',         category: 'automation' },
  { name: 'Mem',        url: 'https://mem.ai',               category: 'automation' },
  { name: 'Otter.ai',   url: 'https://otter.ai',             category: 'automation' },
  { name: 'Fireflies',  url: 'https://fireflies.ai',         category: 'automation' },
]

async function tryFetch(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    redirect: 'follow',
  })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 50) return null
  const ct = res.headers.get('content-type') || 'image/x-icon'
  const mime = ct.split(';')[0].trim()
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function fetchIcon(siteUrl) {
  const origin = new URL(siteUrl).origin
  const hostname = new URL(siteUrl).hostname

  // Phase 1: 直接 favicon
  const directPaths = [
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/favicon.svg`,
  ]
  for (const url of directPaths) {
    try { const r = await tryFetch(url); if (r) return r } catch {}
  }

  // Phase 2: 解析 HTML <link rel="icon">
  try {
    const res = await fetch(origin, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
      redirect: 'follow',
    })
    if (res.ok) {
      const html = await res.text()
      // match <link rel="icon" href="..."> or <link rel="shortcut icon" href="...">
      const m = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
        || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i)
      if (m) {
        let iconUrl = m[1]
        if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl
        else if (iconUrl.startsWith('/')) iconUrl = origin + iconUrl
        else if (!iconUrl.startsWith('http')) iconUrl = origin + '/' + iconUrl
        const r = await tryFetch(iconUrl)
        if (r) return r
      }
    }
  } catch {}

  // Phase 3: Google favicon service (用 hostname)
  try {
    const r = await tryFetch(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`)
    if (r) return r
  } catch {}

  return ''
}

// 并发限制
async function pool(items, fn, concurrency = 6) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

async function main() {
  console.log(`Fetching icons for ${SITES.length} sites...`)

  const results = await pool(SITES, async (site, i) => {
    process.stdout.write(`[${i + 1}/${SITES.length}] ${site.name}...`)
    const icon = await fetchIcon(site.url)
    console.log(icon ? ' OK' : ' MISS')
    return { ...site, icon_url: icon }
  }, 8)

  const ok = results.filter(r => r.icon_url).length
  console.log(`\nDone: ${ok}/${SITES.length} icons fetched`)

  const output = `// Auto-generated by scripts/fetch-ai-icons.mjs — DO NOT EDIT
export const AI_CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)}

export const AI_SITES = ${JSON.stringify(results, null, 2)}
`

  const outPath = path.resolve(__dirname, '../src/data/ai-sites.js')
  fs.writeFileSync(outPath, output, 'utf-8')
  console.log(`Written to ${outPath}`)
}

main().catch(console.error)
