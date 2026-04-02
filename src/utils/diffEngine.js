import { diffLines, diffChars, createPatch } from 'diff'

/**
 * Compute line-level diff between two texts.
 * Adjacent removed+added blocks are paired as "modified" for char-level highlighting.
 *
 * Every block carries both leftStart/leftEnd and rightStart/rightEnd:
 *  - For removed:  rightStart === rightEnd (insertion point in right text)
 *  - For added:    leftStart === leftEnd (insertion point in left text)
 *  - For modified: both sides have their actual ranges
 */
export function computeDiff(leftText, rightText) {
  if (leftText === rightText) return []

  const changes = diffLines(leftText, rightText)
  const raw = []
  let leftLine = 0
  let rightLine = 0

  for (const change of changes) {
    const text = change.value
    const lineCount = change.count ?? text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

    if (change.added) {
      raw.push({
        type: 'added',
        leftStart: leftLine,
        leftEnd: leftLine,         // no lines on left side
        rightStart: rightLine,
        rightEnd: rightLine + lineCount,
        lines: splitLines(text),
      })
      rightLine += lineCount
    } else if (change.removed) {
      raw.push({
        type: 'removed',
        leftStart: leftLine,
        leftEnd: leftLine + lineCount,
        rightStart: rightLine,
        rightEnd: rightLine,       // no lines on right side
        lines: splitLines(text),
      })
      leftLine += lineCount
    } else {
      // equal — only advance line counters; push sentinel to prevent false pairing
      raw.push({ type: 'equal' })
      leftLine += lineCount
      rightLine += lineCount
    }
  }

  // Pair adjacent removed+added as "modified"
  const result = []
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].type === 'equal') continue
    if (raw[i].type === 'removed' && i + 1 < raw.length && raw[i + 1].type === 'added') {
      result.push({
        type: 'modified',
        leftStart: raw[i].leftStart,
        leftEnd: raw[i].leftEnd,
        leftLines: raw[i].lines,
        rightStart: raw[i + 1].rightStart,
        rightEnd: raw[i + 1].rightEnd,
        rightLines: raw[i + 1].lines,
      })
      i++
    } else {
      result.push(raw[i])
    }
  }

  return result
}

/**
 * Compute character-level diff between two strings.
 * Returns array of { type: 'equal'|'added'|'removed', value: string }
 */
export function computeCharDiff(oldStr, newStr) {
  return diffChars(oldStr, newStr).map(p => ({
    type: p.added ? 'added' : p.removed ? 'removed' : 'equal',
    value: p.value,
  }))
}

/**
 * Export as unified diff patch text.
 */
export function exportPatch(leftName, rightName, leftText, rightText) {
  return createPatch(
    leftName || 'original',
    leftText,
    rightText,
    leftName || 'original',
    rightName || 'modified',
    { context: 3 }
  )
}

/**
 * Apply a merge: replace lines in the target text using a diff block.
 * direction: 'left-to-right' copies left→right, 'right-to-left' copies right→left.
 * Returns the new text for the target side.
 */
export function mergeBlock(block, leftText, rightText, direction) {
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')

  if (direction === 'left-to-right') {
    // Replace right-side range with left-side content
    const sourceLines = block.type === 'removed'
      ? block.lines
      : block.type === 'modified'
      ? block.leftLines
      : []
    rightLines.splice(block.rightStart, block.rightEnd - block.rightStart, ...sourceLines)
    return rightLines.join('\n')
  } else {
    // Replace left-side range with right-side content
    const sourceLines = block.type === 'added'
      ? block.lines
      : block.type === 'modified'
      ? block.rightLines
      : []
    leftLines.splice(block.leftStart, block.leftEnd - block.leftStart, ...sourceLines)
    return leftLines.join('\n')
  }
}

function splitLines(text) {
  const s = text.endsWith('\n') ? text.slice(0, -1) : text
  return s.split('\n')
}
