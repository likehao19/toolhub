function normalizeContent(content = '') {
  return String(content || '').replace(/\r/g, '')
}

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

function buildSourceKey(source = {}) {
  if (source.path) return String(source.path)
  if (source.fullClassName) return String(source.fullClassName)
  return [source.packageName, source.fileName].filter(Boolean).join(':') || source.fileName || source.className || ''
}

export function parseJavaSourceMeta(content, fileName = '') {
  const text = normalizeContent(content)
  const packageName = text.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1] || ''
  const className = text.match(/\b(class|interface|enum|record)\s+([A-Za-z_]\w*)/)?.[2] || fileName.replace(/\.java$/i, '')
  const methodMatches = [...text.matchAll(/(?:public|protected|private|static|final|synchronized|abstract|native|default|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g)]
  const methods = methodMatches.slice(0, 100).map(match => match[1])

  return {
    fileName,
    packageName,
    className,
    fullClassName: packageName && className ? `${packageName}.${className}` : className,
    methods,
    content: text,
  }
}

function normalizeSourceRecord(source = {}) {
  const methods = Array.isArray(source.methods) ? source.methods : []
  return {
    ...source,
    methods,
    sourceKey: buildSourceKey(source),
  }
}

function isFrameRelevantToSource(frame, source) {
  return frame.fullClassName === source.fullClassName ||
    frame.fullClassName?.endsWith(`.${source.className}`) ||
    frame.fileName === source.fileName
}

function scoreSourceMatch(sourceInput, referencedClasses, stackFrames = []) {
  const source = normalizeSourceRecord(sourceInput)
  let score = 0
  const refs = referencedClasses || []
  const relevantFrames = stackFrames.filter(frame => isFrameRelevantToSource(frame, source))

  refs.forEach(ref => {
    if (!ref) return
    if (source.fullClassName && ref === source.fullClassName) score += 16
    else if (source.className && ref === source.className) score += 9
    else if (source.fileName && ref === source.fileName.replace(/\.java$/i, '')) score += 6
    else if (source.fullClassName && ref.endsWith(`.${source.className}`)) score += 4
  })

  relevantFrames.forEach(frame => {
    if (source.fullClassName && frame.fullClassName === source.fullClassName) score += 22
    else if (source.className && frame.fullClassName?.endsWith(`.${source.className}`)) score += 11

    if (frame.fileName && source.fileName === frame.fileName) score += 6
    if (frame.methodName && source.methods.includes(frame.methodName)) score += 3
    if (frame.lineNumber) score += 5
  })

  if (relevantFrames.length) {
    score += Math.min(relevantFrames.length, 3) * 2
  }

  return score
}

export function matchSourceFilesByStackTrace(sourceFiles, referencedClasses, stackFrames = []) {
  return [...(sourceFiles || [])]
    .map(source => {
      const normalized = normalizeSourceRecord(source)
      return {
        ...normalized,
        matchScore: scoreSourceMatch(normalized, referencedClasses, stackFrames),
      }
    })
    .filter(source => source.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
}

function buildSnippet(lines, lineIndex, before = 6, after = 18, maxLength = 2200) {
  const start = Math.max(0, lineIndex - before)
  const end = Math.min(lines.length, lineIndex + after)
  const snippet = lines.slice(start, end).join('\n').slice(0, maxLength)
  return {
    snippet,
    snippetMeta: {
      startLine: start + 1,
      endLine: Math.min(end, start + snippet.split('\n').length),
      focusLine: lineIndex + 1,
      reason: 'line-match',
    },
  }
}

function findMethodLineIndex(lines, methodName) {
  if (!methodName) return -1
  const pattern = new RegExp(`\\b${escapeRegExp(methodName)}\\s*\\(`)
  return lines.findIndex(line => pattern.test(line))
}

function extractSnippetByFrames(sourceInput, stackFrames = [], maxLength = 2200) {
  const source = normalizeSourceRecord(sourceInput)
  const lines = source.content.split('\n')
  const relevantFrames = stackFrames.filter(frame => isFrameRelevantToSource(frame, source))

  if (!relevantFrames.length) {
    return null
  }

  for (const frame of relevantFrames.slice(0, 3)) {
    let lineIndex = -1
    let reason = 'stack-frame'

    if (frame.lineNumber) {
      lineIndex = Math.max(0, Math.min(lines.length - 1, frame.lineNumber - 1))
    }

    if (lineIndex === -1 && frame.methodName) {
      lineIndex = findMethodLineIndex(lines, frame.methodName)
      reason = 'stack-method'
    }

    if (lineIndex === -1) continue

    const result = buildSnippet(lines, lineIndex, 6, 18, maxLength)
    return {
      snippet: `// ${frame.methodName || source.className}${frame.lineNumber ? ` @ line ${frame.lineNumber}` : ''}\n${result.snippet}`,
      snippetMeta: {
        ...result.snippetMeta,
        reason,
      },
    }
  }

  return null
}

function collectCandidateMethods(source, stackFrames = [], extraTerms = []) {
  const methods = []
  stackFrames.forEach(frame => {
    if (isFrameRelevantToSource(frame, source) && frame.methodName) methods.push(frame.methodName)
  })
  extraTerms.forEach(term => {
    if (term && source.methods.includes(term)) methods.push(term)
  })
  return Array.from(new Set(methods))
}

function extractSnippetByMethods(sourceInput, stackFrames = [], extraTerms = [], maxLength = 2200) {
  const source = normalizeSourceRecord(sourceInput)
  const frameSnippet = extractSnippetByFrames(source, stackFrames, maxLength)
  if (frameSnippet) return frameSnippet

  const lines = source.content.split('\n')
  const candidateMethods = collectCandidateMethods(source, stackFrames, extraTerms)

  for (const methodName of candidateMethods.slice(0, 3)) {
    const lineIndex = findMethodLineIndex(lines, methodName)
    if (lineIndex === -1) continue

    const result = buildSnippet(lines, lineIndex, 5, 20, maxLength)
    return {
      snippet: result.snippet,
      snippetMeta: {
        ...result.snippetMeta,
        reason: 'method-match',
      },
    }
  }

  return {
    snippet: source.content.slice(0, maxLength),
    snippetMeta: {
      startLine: 1,
      endLine: Math.min(lines.length, source.content.slice(0, maxLength).split('\n').length),
      focusLine: 1,
      reason: 'file-head',
    },
  }
}

export function highlightSourceSnippet(snippet = '', context = {}) {
  let html = escapeHtml(snippet)
  const terms = new Set()

  if (context.className) terms.add(context.className)
  if (context.fullClassName) {
    terms.add(context.fullClassName)
    const short = context.fullClassName.split('.').pop()
    if (short) terms.add(short)
  }

  ;(context.methods || []).forEach(method => terms.add(method))
  ;(context.extraTerms || []).forEach(term => terms.add(term))

  Array.from(terms)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach(term => {
      const pattern = new RegExp(escapeRegExp(escapeHtml(term)), 'gi')
      html = html.replace(pattern, '<mark class="source-hl">$&</mark>')
    })

  html = html.replace(/\b([A-Z][\w$]*(?:Exception|Error))\b/g, '<mark class="source-hl source-exception">$1</mark>')
  return html
}

export function buildSourceSnippets(sourceFiles, referencedClasses, options = {}) {
  const maxFiles = options.maxFiles || 6
  const maxLength = options.maxLength || 2200
  const stackFrames = options.stackFrames || []
  const extraTerms = options.extraTerms || []
  const matched = matchSourceFilesByStackTrace(sourceFiles, referencedClasses, stackFrames).slice(0, maxFiles)

  return matched.map(source => {
    const { snippet, snippetMeta } = extractSnippetByMethods(source, stackFrames, extraTerms, maxLength)
    return {
      sourceKey: source.sourceKey,
      path: source.path || '',
      fileName: source.fileName,
      packageName: source.packageName,
      className: source.className,
      fullClassName: source.fullClassName,
      methods: source.methods.slice(0, 20),
      matchScore: source.matchScore,
      snippet,
      snippetMeta,
      highlightedSnippet: highlightSourceSnippet(snippet, {
        className: source.className,
        fullClassName: source.fullClassName,
        methods: source.methods.slice(0, 20),
        extraTerms,
      }),
    }
  })
}
