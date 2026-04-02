function normalizeContent(content = '') {
  return String(content || '').replace(/\r/g, '')
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

function scoreSourceMatch(source, referencedClasses, stackFrames = []) {
  let score = 0
  const refs = referencedClasses || []
  refs.forEach(ref => {
    if (!ref) return
    if (source.fullClassName && ref === source.fullClassName) score += 12
    if (source.className && ref === source.className) score += 7
    if (source.fileName && ref === source.fileName.replace(/\.java$/i, '')) score += 5
    if (source.fullClassName && ref.endsWith(`.${source.className}`)) score += 4
  })

  stackFrames.forEach(frame => {
    if (source.fullClassName && frame.fullClassName === source.fullClassName) score += 20
    if (source.className && frame.fullClassName?.endsWith(`.${source.className}`)) score += 10
    if (frame.fileName && source.fileName === frame.fileName) score += 8
    if (frame.methodName && source.methods.includes(frame.methodName)) score += 6
    if (frame.lineNumber) score += 3
  })

  return score
}

export function matchSourceFilesByStackTrace(sourceFiles, referencedClasses, stackFrames = []) {
  return [...(sourceFiles || [])]
    .map(source => ({ ...source, matchScore: scoreSourceMatch(source, referencedClasses, stackFrames) }))
    .filter(source => source.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
}

function extractSnippetByFrames(source, stackFrames = [], maxLength = 2200) {
  const lines = source.content.split('\n')
  const relevantFrames = stackFrames.filter(frame =>
    frame.fullClassName === source.fullClassName ||
    frame.fullClassName?.endsWith(`.${source.className}`) ||
    frame.fileName === source.fileName,
  )

  if (!relevantFrames.length) {
    return null
  }

  const snippets = []
  relevantFrames.slice(0, 3).forEach(frame => {
    let lineIndex = -1

    if (frame.lineNumber) {
      lineIndex = Math.max(0, Math.min(lines.length - 1, frame.lineNumber - 1))
    }

    if (lineIndex === -1 && frame.methodName) {
      lineIndex = lines.findIndex(line => new RegExp(`\\b${frame.methodName}\\s*\\(`).test(line))
    }

    if (lineIndex === -1) return

    const start = Math.max(0, lineIndex - 6)
    const end = Math.min(lines.length, lineIndex + 18)
    const header = `// ${frame.methodName || source.className}${frame.lineNumber ? ` @ line ${frame.lineNumber}` : ''}`
    snippets.push(`${header}\n${lines.slice(start, end).join('\n')}`)
  })

  return snippets.join('\n\n---\n\n').slice(0, maxLength)
}

function extractSnippetByMethods(source, referencedClasses, stackFrames = [], maxLength = 2200) {
  const frameSnippet = extractSnippetByFrames(source, stackFrames, maxLength)
  if (frameSnippet) return frameSnippet

  const lines = source.content.split('\n')
  const text = source.content
  const matchedMethods = []
  const stackRefs = referencedClasses || []

  stackRefs.forEach(ref => {
    const simple = ref.split('.').pop()
    if (simple && source.methods.includes(simple)) matchedMethods.push(simple)
  })

  if (!matchedMethods.length) {
    return text.slice(0, maxLength)
  }

  const snippets = []
  matchedMethods.slice(0, 3).forEach(methodName => {
    const lineIndex = lines.findIndex(line => new RegExp(`\\b${methodName}\\s*\\(`).test(line))
    if (lineIndex === -1) return
    const start = Math.max(0, lineIndex - 5)
    const end = Math.min(lines.length, lineIndex + 20)
    snippets.push(lines.slice(start, end).join('\n'))
  })

  return snippets.join('\n\n---\n\n').slice(0, maxLength)
}

export function buildSourceSnippets(sourceFiles, referencedClasses, options = {}) {
  const maxFiles = options.maxFiles || 6
  const maxLength = options.maxLength || 2200
  const stackFrames = options.stackFrames || []
  const matched = matchSourceFilesByStackTrace(sourceFiles, referencedClasses, stackFrames).slice(0, maxFiles)

  return matched.map(source => ({
    fileName: source.fileName,
    packageName: source.packageName,
    className: source.className,
    fullClassName: source.fullClassName,
    methods: source.methods.slice(0, 20),
    matchScore: source.matchScore,
    snippet: extractSnippetByMethods(source, referencedClasses, stackFrames, maxLength),
  }))
}
