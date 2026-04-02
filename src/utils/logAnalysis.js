function normalizeLine(line = '') {
  return String(line).replace(/\r$/, '')
}

function detectLevel(line) {
  const upper = line.toUpperCase()
  if (/\bERROR\b/.test(upper)) return 'ERROR'
  if (/\bWARN(?:ING)?\b/.test(upper)) return 'WARN'
  if (/\bINFO\b/.test(upper)) return 'INFO'
  if (/\bDEBUG\b/.test(upper)) return 'DEBUG'
  if (/\bTRACE\b/.test(upper)) return 'TRACE'
  return ''
}

function extractTimestamp(line) {
  const match = line.match(/(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?)/)
  return match?.[1] || ''
}

function isStackTraceLine(line) {
  return /^\s+at\s+.+\(.+\)$/.test(line) || /^\s*\.\.\.\s+\d+\s+more$/.test(line)
}

function isCausedByLine(line) {
  return /^\s*Caused by:/.test(line)
}

function extractExceptionType(line) {
  const causedBy = line.match(/Caused by:\s+([\w.$]+(?:Exception|Error))/)
  if (causedBy) return causedBy[1]

  const direct = line.match(/([\w.$]+(?:Exception|Error))(?:\:|$|\s)/)
  return direct?.[1] || ''
}

function extractHeadline(line) {
  return line.trim().slice(0, 300)
}

function extractMessage(line) {
  const causedBy = line.match(/Caused by:\s+[\w.$]+(?:Exception|Error)\s*:\s*(.+)$/)
  if (causedBy) return causedBy[1].trim()

  const direct = line.match(/[\w.$]+(?:Exception|Error)\s*:\s*(.+)$/)
  return direct?.[1]?.trim() || ''
}

function signatureOf(text) {
  return text
    .replace(/\b\d+\b/g, '#')
    .replace(/0x[0-9a-f]+/gi, '0x#')
    .trim()
}

function extractStackFrames(text) {
  return [...text.matchAll(/\bat\s+([\w.$]+)\.([\w$<>]+)\(([^:()]+)(?::(\d+))?\)/g)].map(match => ({
    fullClassName: match[1],
    methodName: match[2],
    fileName: match[3],
    lineNumber: match[4] ? Number(match[4]) : null,
  }))
}

function extractReferencedClassesFromText(text) {
  const classes = new Set()
  const frames = extractStackFrames(text)
  for (const frame of frames) {
    const fullClass = frame.fullClassName
    classes.add(fullClass)
    const simpleClass = fullClass.split('.').pop()
    if (simpleClass) classes.add(simpleClass)
    const fileName = frame.fileName
    if (fileName?.endsWith('.java')) {
      classes.add(fileName.replace(/\.java$/, ''))
    }
  }
  return Array.from(classes)
}

function buildKeywordMatcher(keyword) {
  const value = String(keyword || '').trim()
  if (!value) return null
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectHighlightTerms(block, keyword = '') {
  const terms = new Set()
  if (keyword?.trim()) terms.add(keyword.trim())
  if (block.exceptionType) terms.add(block.exceptionType)
  if (block.rootCauseLine) terms.add(block.rootCauseLine.trim())

  ;(block.stackFrames || []).forEach(frame => {
    if (frame.fullClassName) terms.add(frame.fullClassName)
    const simpleClass = frame.fullClassName?.split('.').pop()
    if (simpleClass) terms.add(simpleClass)
    if (frame.methodName) terms.add(frame.methodName)
    if (frame.fileName) terms.add(frame.fileName)
  })

  return Array.from(terms)
    .filter(Boolean)
    .filter(term => term.length >= 2)
    .sort((a, b) => b.length - a.length)
}

export function highlightLogText(block, keyword = '') {
  let html = escapeHtml(block.rawText || '')
  const terms = collectHighlightTerms(block, keyword)

  terms.forEach(term => {
    const pattern = new RegExp(escapeRegExp(escapeHtml(term)), 'gi')
    html = html.replace(pattern, '<mark class="log-hl">$&</mark>')
  })

  html = html.replace(/(Caused by:)/g, '<mark class="log-hl cause">$1</mark>')
  html = html.replace(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/g, '<mark class="log-hl level">$1</mark>')
  html = html.replace(/\b([\w.$]+(?:Exception|Error))\b/g, '<mark class="log-hl exception">$1</mark>')

  return html
}

export function parseLogFile(content, fileName = '') {
  const lines = String(content || '').split(/\n/).map(normalizeLine)
  const blocks = []
  let current = null

  const pushCurrent = () => {
    if (!current) return
    const rawText = current.lines.join('\n').trimEnd()
    const firstLine = current.lines[0] || ''
    const lastCausedBy = [...current.lines].reverse().find(isCausedByLine) || ''
    const exceptionType = extractExceptionType(lastCausedBy || firstLine)
    const rootCauseLine = lastCausedBy || current.lines.find(line => extractExceptionType(line)) || ''
    const headline = extractHeadline(rootCauseLine || firstLine)
    const level = current.level || detectLevel(rawText) || (exceptionType ? 'ERROR' : '')
    const stackFrames = extractStackFrames(rawText)
    const stackTrace = current.lines.filter(isStackTraceLine).join('\n')
    const referencedClasses = extractReferencedClassesFromText(rawText)

    blocks.push({
      id: `${fileName || 'log'}-${blocks.length + 1}`,
      startLine: current.startLine,
      endLine: current.endLine,
      level,
      timestamp: current.timestamp,
      headline,
      exceptionType,
      message: extractMessage(rootCauseLine || firstLine),
      hasException: Boolean(exceptionType),
      hasStackTrace: Boolean(stackTrace),
      rootCauseLine,
      stackTrace,
      stackFrames,
      referencedClasses,
      rawText,
      signature: signatureOf(headline || rawText.slice(0, 240)),
      lines: [...current.lines],
    })
    current = null
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1
    const timestamp = extractTimestamp(line)
    const level = detectLevel(line)
    const startsNewBlock = Boolean(timestamp || level || (!current && line.trim()))

    if (!current) {
      current = {
        startLine: lineNo,
        endLine: lineNo,
        lines: [line],
        timestamp,
        level,
        hasException: Boolean(extractExceptionType(line)),
      }
      return
    }

    const attachToCurrent = isStackTraceLine(line) || isCausedByLine(line) || (!timestamp && !level && current.hasException)

    if (startsNewBlock && !attachToCurrent) {
      pushCurrent()
      current = {
        startLine: lineNo,
        endLine: lineNo,
        lines: [line],
        timestamp,
        level,
        hasException: Boolean(extractExceptionType(line)),
      }
      return
    }

    current.lines.push(line)
    current.endLine = lineNo
    current.hasException = current.hasException || Boolean(extractExceptionType(line))
  })

  pushCurrent()

  const exceptionCounts = {}
  const signatureCounts = {}
  blocks.forEach(block => {
    if (block.exceptionType) {
      exceptionCounts[block.exceptionType] = (exceptionCounts[block.exceptionType] || 0) + 1
    }
    signatureCounts[block.signature] = (signatureCounts[block.signature] || 0) + 1
  })

  const rootCauseCandidates = blocks
    .filter(block => block.rootCauseLine || block.exceptionType)
    .sort((a, b) => {
      const scoreA = (a.rootCauseLine ? 3 : 0) + (a.stackFrames.length ? 2 : 0) + (a.level === 'ERROR' ? 1 : 0)
      const scoreB = (b.rootCauseLine ? 3 : 0) + (b.stackFrames.length ? 2 : 0) + (b.level === 'ERROR' ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 20)

  return {
    fileName,
    totalLines: lines.length,
    blocks,
    exceptionCounts,
    signatureCounts,
    referencedClasses: Array.from(new Set(blocks.flatMap(block => block.referencedClasses))),
    stackFrames: blocks.flatMap(block => block.stackFrames),
    rootCauseCandidates,
  }
}

export function filterLogBlocks(parsed, options = {}) {
  const mode = options.mode || 'issues'
  const matcher = buildKeywordMatcher(options.keyword)

  return (parsed?.blocks || []).filter(block => {
    const matchesKeyword = !matcher || matcher.test(block.rawText)
    if (!matchesKeyword) return false

    if (mode === 'all') return true
    if (mode === 'error') return block.level === 'ERROR' || block.hasException
    if (mode === 'warn') return block.level === 'WARN'
    if (mode === 'exception') return block.hasException
    if (mode === 'stacktrace') return block.hasStackTrace
    return block.level === 'ERROR' || block.level === 'WARN' || block.hasException || block.hasStackTrace
  })
}

export function summarizeLogAnalysis(parsed) {
  const blocks = parsed?.blocks || []
  const errors = blocks.filter(block => block.level === 'ERROR' || block.hasException).length
  const warnings = blocks.filter(block => block.level === 'WARN').length
  const stackTraces = blocks.filter(block => block.hasStackTrace).length
  const topExceptions = Object.entries(parsed?.exceptionCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const frequentBlocks = Object.entries(parsed?.signatureCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([signature, count]) => ({ signature, count }))

  return {
    totalLines: parsed?.totalLines || 0,
    totalBlocks: blocks.length,
    errors,
    warnings,
    stackTraces,
    topExceptions,
    frequentBlocks,
    rootCauseCandidates: (parsed?.rootCauseCandidates || []).slice(0, 5),
  }
}

export function extractReferencedClasses(parsed) {
  return parsed?.referencedClasses || []
}

export function extractRelevantStackFrames(parsed, limit = 30) {
  return (parsed?.stackFrames || []).slice(0, limit)
}

export function buildLogAiPayload(parsed, selectedSourceContexts = [], options = {}) {
  const blocks = filterLogBlocks(parsed, {
    mode: options.mode || 'issues',
    keyword: options.keyword || '',
  }).slice(0, options.maxBlocks || 20)

  return {
    fileName: parsed?.fileName || '',
    summary: summarizeLogAnalysis(parsed),
    keyword: options.keyword || '',
    mode: options.mode || 'issues',
    referencedClasses: extractReferencedClasses(parsed).slice(0, 50),
    stackFrames: extractRelevantStackFrames(parsed, 20),
    keyBlocks: blocks.map(block => ({
      startLine: block.startLine,
      endLine: block.endLine,
      level: block.level,
      headline: block.headline,
      exceptionType: block.exceptionType,
      rootCauseLine: block.rootCauseLine,
      stackFrames: block.stackFrames.slice(0, 10),
      rawText: block.rawText.slice(0, 4000),
    })),
    sourceContexts: selectedSourceContexts.slice(0, options.maxSources || 8),
  }
}
