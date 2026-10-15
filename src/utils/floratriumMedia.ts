export type FloraAlbumId = 'flora' | 'hei'
export interface FloraMedia {
  key: string
  url: string
  type: 'image' | 'video'
}
export interface FloraMediaPage {
  items: FloraMedia[]
  nextCursor: string | null
  totalPages?: number
}
export const FLORA_MEDIA_PAGE_SIZE = 28
export const FLORA_MEDIA_INDEX_TTL_MS = 15000
export const FLORA_ASSET_ORIGIN = 'https://assets.anuluca.com'
export const getFloraMediaType = (key: string): FloraMedia['type'] | null => {
  if (
    key
      .split('/')
      .some(
        (part) =>
          part.startsWith('.') ||
          /_(?:originals|transform|failed|原文件)$/i.test(part)
      )
  )
    return null
  if (/\.(?:jpe?g|png|webp|avif|gif)$/i.test(key)) return 'image'
  if (/\.(?:mp4|mov|webm|m4v|ogv)$/i.test(key)) return 'video'
  return null
}
export const getFloraAssetUrl = (key: string) =>
  `${FLORA_ASSET_ORIGIN}/${key.split('/').map(encodeURIComponent).join('/')}`

// keys 由数据源统一过滤并倒序；这里只构建当前页的 URL，不为整个相册分配媒体对象。
export const createFloraMediaPage = (
  keys: readonly string[],
  offset: number
): FloraMediaPage => ({
  items: keys.slice(offset, offset + FLORA_MEDIA_PAGE_SIZE).map((key) => ({
    key,
    url: getFloraAssetUrl(key),
    type: getFloraMediaType(key)!,
  })),
  nextCursor:
    offset + FLORA_MEDIA_PAGE_SIZE < keys.length
      ? String(offset + FLORA_MEDIA_PAGE_SIZE)
      : null,
  totalPages: Math.max(1, Math.ceil(keys.length / FLORA_MEDIA_PAGE_SIZE)),
})

// 文件名中的 YYYYMMDD 是拍摄日期；不使用上传时间，也不让无效日期自动进位。
export const getFloraCaptureDate = (source: string): string | null => {
  const filename = source.split(/[?#]/)[0].split('/').pop() || ''
  const match = /^(\d{4})(\d{2})(\d{2})(?:[_\-.]|$)/.exec(filename)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  )
    return null
  return `${match[1]}-${match[2]}-${match[3]}`
}
