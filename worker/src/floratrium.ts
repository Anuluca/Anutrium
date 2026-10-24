import {
  createFloraMediaPage,
  FLORA_MEDIA_INDEX_TTL_MS,
  type FloraAlbumId,
  isAlbumMediaKey,
  isMediaAlbumId,
  mediaAlbums,
} from '../../src/utils/floratriumMedia'
import { jsonResponse } from './http'

interface MediaIndex {
  keys: readonly string[]
  expiresAt: number
}
// 仅缓存已完成的键名数据；不跨 Worker 请求共享进行中的 R2 I/O 或响应体。
const indexes = new WeakMap<R2Bucket, Map<FloraAlbumId, MediaIndex>>()
const loadMediaIndex = async (bucket: R2Bucket, pet: FloraAlbumId) => {
  let albums = indexes.get(bucket)
  if (!albums) {
    albums = new Map()
    indexes.set(bucket, albums)
  }
  const cached = albums.get(pet)
  if (cached && cached.expiresAt > Date.now()) return cached.keys
  const keys = await listMediaKeys(bucket, pet)
  albums.set(pet, { keys, expiresAt: Date.now() + FLORA_MEDIA_INDEX_TTL_MS })
  return keys
}
const listMediaKeys = async (bucket: R2Bucket, pet: FloraAlbumId) => {
  const keys: string[] = []
  let cursor: string | undefined
  const seen = new Set<string>()
  // R2 的分页结果已经按键名正序排列，过滤后只需反转，不再重复排序。
  do {
    const result = await bucket.list({
      prefix: mediaAlbums[pet].prefix,
      // Creative 只枚举直属对象，R2 将子目录合并为前缀而不返回其图片。
      ...(!mediaAlbums[pet].recursive ? { delimiter: '/' } : {}),
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    })
    for (const object of result.objects)
      if (isAlbumMediaKey(object.key, pet)) keys.push(object.key)
    if (!result.truncated) break
    if (!result.cursor || seen.has(result.cursor))
      throw new Error('Repeated album cursor')
    seen.add(result.cursor)
    cursor = result.cursor
  } while (cursor)
  return keys.reverse()
}

export const loadFloraMediaPage = async (
  bucket: R2Bucket,
  pet: FloraAlbumId,
  initialCursor?: string,
  complete = false
) => {
  const offset = Number(initialCursor || 0)
  if (
    (initialCursor && !/^\d+$/.test(initialCursor)) ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  )
    throw new Error('Invalid album cursor')
  const keys = await loadMediaIndex(bucket, pet)
  return createFloraMediaPage(
    keys,
    complete && pet === 'flora' ? 0 : offset,
    complete && pet === 'flora'
      ? Math.max(1, keys.length)
      : mediaAlbums[pet].pageSize
  )
}

export const handleFloraMedia = async (url: URL, env: Env) => {
  const pet = url.searchParams.get('pet')
  const cursor = url.searchParams.get('cursor') || undefined
  if (
    !isMediaAlbumId(pet) ||
    (cursor && (!/^\d+$/.test(cursor) || !Number.isSafeInteger(Number(cursor))))
  )
    return jsonResponse({ error: 'Invalid album request' }, 400)
  try {
    return jsonResponse(
      await loadFloraMediaPage(
        env.FLORATRIUM_BUCKET,
        pet,
        cursor,
        url.searchParams.get('collection') === '1'
      ),
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
