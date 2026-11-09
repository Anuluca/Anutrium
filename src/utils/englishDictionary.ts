import dictionaryUrl from '@/assets/wordlists/english-words.txt?url'

let dictionaryPromise: Promise<ReadonlySet<string>> | null = null

/** 独立静态资源按页面加载，成功后跨组件复用；失败不缓存，允许用户重试。 */
export function loadEnglishDictionary(): Promise<ReadonlySet<string>> {
  if (dictionaryPromise) return dictionaryPromise
  dictionaryPromise = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(dictionaryUrl, { signal: controller.signal })
      if (!response.ok) throw new Error('dictionary_unavailable')
      const words = (await response.text())
        .split(/\r?\n/)
        .filter((word) => /^[a-z]{3,}$/.test(word))
      // 防止静态托管的 HTML 回退页被当作成功加载的词表。
      if (words.length < 1000) throw new Error('dictionary_invalid')
      return new Set(words)
    } finally {
      clearTimeout(timeout)
    }
  })().catch((error) => {
    dictionaryPromise = null
    throw error
  })
  return dictionaryPromise
}
