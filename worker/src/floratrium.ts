import {
  FLORA_MEDIA_PAGE_SIZE,
  type FloraMedia,
  type FloraMediaPage,
  getFloraAssetUrl,
  getFloraMediaType,
} from '../../src/utils/floratriumMedia'
import { jsonResponse } from './http'

export const loadFloraMediaPage = async (
  bucket: R2Bucket,
  pet: 'flora' | 'hei',
  initialCursor?: string
): Promise<FloraMediaPage> => {
  const offset = Number(initialCursor || 0)
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error('Invalid album cursor')
  const keys: string[] = []
  let cursor: string | undefined
  const seen = new Set<string>()
  // R2 仅按键名正序列出对象；先读取轻量键名清单，再全局倒序并分页，不下载媒体。
  do {
    const result = await bucket.list({
      prefix: `Floratrium/${pet}/`,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    })
    for (const object of result.objects)
      if (getFloraMediaType(object.key)) keys.push(object.key)
    if (!result.truncated) break
    if (!result.cursor || seen.has(result.cursor))
      throw new Error('Repeated album cursor')
    seen.add(result.cursor)
    cursor = result.cursor
  } while (cursor)
  keys.sort().reverse()
  const items: FloraMedia[] = keys
    .slice(offset, offset + FLORA_MEDIA_PAGE_SIZE)
    .map((key) => ({
      key,
      url: getFloraAssetUrl(key),
      type: getFloraMediaType(key)!,
    }))
  return {
    items,
    nextCursor:
      offset + FLORA_MEDIA_PAGE_SIZE < keys.length
        ? String(offset + FLORA_MEDIA_PAGE_SIZE)
        : null,
    totalPages: Math.max(1, Math.ceil(keys.length / FLORA_MEDIA_PAGE_SIZE)),
  }
}

export const handleFloraMedia = async (url: URL, env: Env) => {
  const pet = url.searchParams.get('pet')
  const cursor = url.searchParams.get('cursor') || undefined
  if (
    (pet !== 'flora' && pet !== 'hei') ||
    (cursor && (!/^\d+$/.test(cursor) || !Number.isSafeInteger(Number(cursor))))
  )
    return jsonResponse({ error: 'Invalid album request' }, 400)
  try {
    return jsonResponse(
      await loadFloraMediaPage(env.FLORATRIUM_BUCKET, pet, cursor),
      200,
      {
        'Cache-Control': 'no-store',
      }
    )
  } catch {
    console.error(JSON.stringify({ event: 'floratrium_list_failed', pet }))
    return jsonResponse({ error: 'Album temporarily unavailable' }, 503, {
      'Cache-Control': 'no-store',
    })
  }
}
