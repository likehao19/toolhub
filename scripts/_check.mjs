import { AI_SITES } from '../src/data/ai-sites.js'
const missing = AI_SITES.filter(s => !s.icon_url || s.icon_url.startsWith('data:image/svg+xml'))
console.log(`Letter-fallback (${missing.length}):`)
missing.forEach(s => console.log(`  ${s.name} | ${s.url}`))
