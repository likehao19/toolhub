function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectHighlightTerms(block = {}, keyword = '') {
  const terms = new Set()
  if (keyword?.trim()) terms.add(keyword.trim())
  if (block.exceptionType) terms.add(block.exceptionType)
  if (block.rootCauseLine) terms.add(block.rootCauseLine.trim())

  ;(block.stackFrames || []).forEach(frame => {
    if (frame.fullClassName) terms.add(frame.fullClassName)
    const shortClassName = frame.fullClassName?.split('.').pop()
    if (shortClassName) terms.add(shortClassName)
    if (frame.methodName) terms.add(frame.methodName)
    if (frame.fileName) terms.add(frame.fileName)
  })

  return Array.from(terms)
    .filter(Boolean)
    .filter(term => term.length >= 2)
    .sort((a, b) => b.length - a.length)
}

function uniqueStackFrames(frames = []) {
  const seen = new Set()
  return frames.filter(frame => {
    const key = [frame.fullClassName, frame.methodName, frame.fileName, frame.lineNumber].join(':')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function collectReferencedClasses(summary = {}, blockDetails = []) {
  const values = new Set(summary.referencedClasses || [])
  blockDetails.forEach(detail => {
    ;(detail?.summary?.referencedClasses || []).forEach(name => values.add(name))
  })
  return Array.from(values)
}

function collectStackFrames(summary = {}, blockDetails = []) {
  const detailFrames = blockDetails.flatMap(detail => detail?.summary?.stackFrames || [])
  if (detailFrames.length) {
    return uniqueStackFrames(detailFrames)
  }
  return uniqueStackFrames(summary.relevantStackFrames || [])
}

export function highlightLogText(block = {}, keyword = '') {
  let html = escapeHtml(block.rawText || '')
  const placeholders = []

  function protect(markup) {
    const index = placeholders.length
    placeholders.push(markup)
    return `\x00HL${index}\x00`
  }

  html = html.replace(/\b([\w.$]+(?:Exception|Error))\b/g, match => protect(`<mark class="log-hl exception">${match}</mark>`))
  html = html.replace(/(Caused by:)/g, match => protect(`<mark class="log-hl cause">${match}</mark>`))
  html = html.replace(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/g, match => protect(`<mark class="log-hl level">${match}</mark>`))

  collectHighlightTerms(block, keyword).forEach(term => {
    const pattern = new RegExp(escapeRegExp(escapeHtml(term)), 'gi')
    html = html.replace(pattern, match => protect(`<mark class="log-hl">${match}</mark>`))
  })

  let result = html
  for (let i = placeholders.length - 1; i >= 0; i--) {
    result = result.replace(`\x00HL${i}\x00`, placeholders[i])
  }
  return result
}

export function buildLogAiPayload(summary = {}, blockDetails = [], selectedSourceContexts = [], options = {}) {
  const maxBlocks = options.maxBlocks || 8
  const normalizedDetails = (blockDetails || [])
    .filter(Boolean)
    .slice(0, maxBlocks)

  return {
    fileName: summary.fileName || '',
    summary: {
      totalLines: summary.totalLines || 0,
      totalBlocks: summary.totalBlocks || 0,
      errors: summary.errors || 0,
      warnings: summary.warnings || 0,
      stackTraces: summary.stackTraces || 0,
      topExceptions: summary.topExceptions || [],
      frequentBlocks: summary.frequentBlocks || [],
      rootCauseCandidates: (summary.rootCauseCandidates || []).slice(0, 5),
      meta: summary.meta || {},
    },
    keyword: options.keyword || '',
    mode: options.mode || 'issues',
    referencedClasses: collectReferencedClasses(summary, normalizedDetails).slice(0, 50),
    stackFrames: collectStackFrames(summary, normalizedDetails).slice(0, 20),
    keyBlocks: normalizedDetails.map(detail => ({
      startLine: detail.summary?.startLine || 0,
      endLine: detail.summary?.endLine || 0,
      level: detail.summary?.level || '',
      headline: detail.summary?.headline || '',
      exceptionType: detail.summary?.exceptionType || '',
      rootCauseLine: detail.summary?.rootCauseLine || '',
      stackFrames: (detail.summary?.stackFrames || []).slice(0, 10),
      rawText: String(detail.rawText || '').slice(0, 4000),
      rootCauseScore: detail.summary?.rootCauseScore || 0,
    })),
    sourceContexts: selectedSourceContexts.slice(0, options.maxSources || 8),
    analysisMeta: summary.meta || {},
  }
}
