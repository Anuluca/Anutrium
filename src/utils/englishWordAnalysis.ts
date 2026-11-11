export interface EnglishWordMatch {
  word: string
  count: number
}
export interface EnglishWordAnalysis {
  words: EnglishWordMatch[]
  occurrences: number
}

const wordTokens = /[\p{L}\p{N}\p{M}_’'-]+/gu

/** 保留首次出现顺序；只匹配完整英文词，避免从数字、连字符词或外文中截出子串。 */
export function analyzeEnglishWords(
  content: string,
  dictionary: ReadonlySet<string>
): EnglishWordAnalysis {
  const counts = new Map<string, number>()
  let occurrences = 0
  for (const match of content.matchAll(wordTokens)) {
    const token = match[0]
    if (!/^[A-Za-z]{3,}$/.test(token)) continue
    const word = token.toLowerCase()
    if (!dictionary.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
    occurrences++
  }
  return {
    words: Array.from(counts, ([word, count]) => ({ word, count })),
    occurrences,
  }
}

export interface WordHighlightSegment {
  text: string
  highlighted: boolean
}

/** 与统计使用相同的完整词边界，返回纯文本片段，不拼接可执行 HTML。 */
export function highlightEnglishWords(
  content: string,
  words: readonly string[]
): WordHighlightSegment[] {
  if (!content) return []
  if (!words.length) return [{ text: content, highlighted: false }]
  const recognized = new Set(words)
  const segments: WordHighlightSegment[] = []
  let cursor = 0
  for (const match of content.matchAll(wordTokens)) {
    const token = match[0]
    if (!/^[A-Za-z]{3,}$/.test(token) || !recognized.has(token.toLowerCase()))
      continue
    const index = match.index!
    if (index > cursor)
      segments.push({ text: content.slice(cursor, index), highlighted: false })
    segments.push({ text: token, highlighted: true })
    cursor = index + token.length
  }
  if (cursor < content.length)
    segments.push({ text: content.slice(cursor), highlighted: false })
  return segments
}
