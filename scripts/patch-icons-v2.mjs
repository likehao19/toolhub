/**
 * 针对性补抓：用已知 CDN 路径 + 顺序请求 + 解析 HTML
 * 用法: node scripts/patch-icons-v2.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 已知可用的图标 CDN 路径（绕过 Cloudflare）
const KNOWN = {
  'ChatGPT':         ['https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg'],
  'Gemini':          ['https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'],
  'Copilot':         ['https://copilot.microsoft.com/sa/simg/favicon-cplt.ico', 'https://www.bing.com/sa/simg/favicon-2x.ico'],
  'Perplexity':      ['https://www.perplexity.ai/favicon.svg', 'https://framerusercontent.com/images/OLcYSyFGFGSafGDcGqcOjqYYc.png'],
  'Grok':            ['https://x.ai/favicon.ico'],
  'Poe':             ['https://psc2.cf2.poecdn.net/favicon.ico'],
  'Meta AI':         ['https://static.xx.fbcdn.net/rsrc.php/yo/r/iRmz9lCMBD2.ico', 'https://ai.meta.com/favicon.ico'],
  'Blackbox AI':     ['https://www.blackbox.ai/favicon.ico'],
  'Sourcegraph Cody':['https://sourcegraph.com/.assets/img/sourcegraph-mark.svg', 'https://sourcegraph.com/favicon.ico'],
  'Writesonic':      ['https://writesonic.com/favicon.ico'],
  'Effidit':         ['https://effidit.qq.com/favicon.ico', 'https://effidit.qq.com/static/favicon.ico'],
  'Midjourney':      ['https://www.midjourney.com/apple-touch-icon.png', 'https://www.midjourney.com/favicon.ico'],
  'Leonardo AI':     ['https://leonardo.ai/favicon.ico', 'https://app.leonardo.ai/favicon.ico'],
  'Playground':      ['https://playgroundai.com/favicon.ico'],
  'Ideogram':        ['https://ideogram.ai/favicon.ico'],
  'Pika':            ['https://pika.art/favicon.ico'],
  'HeyGen':          ['https://www.heygen.com/favicon.ico'],
  'ElevenLabs':      ['https://elevenlabs.io/favicon.ico'],
  'Descript':        ['https://www.descript.com/favicon.ico', 'https://assets-global.website-files.com/5f996b0e72ff6a2035ef2eec/60b3aaef0a4c8e7978c67a26_favicon-32x32.png'],
  'Suno':            ['https://suno.com/favicon.ico', 'https://suno.ai/favicon.ico'],
  'Fish Audio':      ['https://fish.audio/favicon.ico'],
  'Gamma':           ['https://gamma.app/favicon.ico'],
  'Tome':            ['https://tome.app/favicon.ico'],
}

async function tryFetch(url) {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    clearTimeout(tid)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 50) return null
    const ct = res.headers.get('content-type') || 'image/x-icon'
    const mime = ct.split(';')[0].trim()
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

// 解析 HTML 中的 icon 链接
async function fetchFromHTML(origin) {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(origin, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    clearTimeout(tid)
    if (!res.ok) return null
    const html = await res.text()
    // 匹配各种 icon link 标签
    const patterns = [
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+\.(?:ico|png|svg))["']/i,
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m) {
        let iconUrl = m[1]
        if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl
        else if (iconUrl.startsWith('/')) iconUrl = origin + iconUrl
        else if (!iconUrl.startsWith('http')) iconUrl = origin + '/' + iconUrl
        const result = await tryFetch(iconUrl)
        if (result) return result
      }
    }
  } catch {}
  return null
}

async function main() {
  const dataPath = path.resolve(__dirname, '../src/data/ai-sites.js')
  const mod = await import('file://' + dataPath.replace(/\\/g, '/'))
  const sites = [...mod.AI_SITES]  // shallow copy array
  const categories = mod.AI_CATEGORIES

  // 找出需要补抓的（字母 SVG fallback 或空）
  const isLetterFallback = (s) => {
    if (!s.icon_url) return true
    if (!s.icon_url.startsWith('data:image/svg+xml;base64,')) return false
    try {
      const decoded = Buffer.from(s.icon_url.split(',')[1], 'base64').toString('utf-8')
      return decoded.includes('viewBox="0 0 64 64"')
    } catch { return false }
  }
  const toFix = sites.filter(isLetterFallback)
  console.log(`Need to fix: ${toFix.length} sites\n`)

  let fixed = 0
  for (const site of toFix) {
    process.stdout.write(`${site.name}...`)
    const knownUrls = KNOWN[site.name] || []
    const origin = new URL(site.url).origin

    let result = null

    // 1) 已知 CDN 路径
    for (const u of knownUrls) {
      result = await tryFetch(u)
      if (result) { console.log(' OK (known)'); break }
    }

    // 2) 通用 favicon 路径
    if (!result) {
      for (const p of ['/favicon.ico', '/favicon.png', '/favicon.svg', '/apple-touch-icon.png']) {
        result = await tryFetch(origin + p)
        if (result) { console.log(' OK (direct)'); break }
      }
    }

    // 3) 解析 HTML
    if (!result) {
      result = await fetchFromHTML(origin)
      if (result) console.log(' OK (html)')
    }

    // 4) Google favicon
    if (!result) {
      const hostname = new URL(site.url).hostname
      result = await tryFetch(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`)
      if (result) console.log(' OK (google)')
    }

    if (result) {
      site.icon_url = result
      fixed++
    } else {
      console.log(' MISS')
    }
  }

  console.log(`\nFixed: ${fixed}/${toFix.length}`)

  // 写回
  const output = `// Auto-generated by scripts/fetch-ai-icons.mjs — DO NOT EDIT
export const AI_CATEGORIES = ${JSON.stringify(categories, null, 2)}

export const AI_SITES = ${JSON.stringify(sites, null, 2)}
`
  fs.writeFileSync(dataPath, output, 'utf-8')
  console.log('Written to ' + dataPath)

  const still = sites.filter(isLetterFallback)
  if (still.length) {
    console.log(`\nStill missing (${still.length}):`)
    still.forEach(s => console.log('  ' + s.name))
  } else {
    console.log('\nAll icons fetched!')
  }
}

main().catch(console.error)
