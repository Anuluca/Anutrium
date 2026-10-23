export const mediaAlbums = {
  lucarioCard: {
    prefix: 'Creative/design/lucarioCard/',
    pageSize: 28,
    imagesOnly: true,
    recursive: false,
  },
  ironvalientCard: {
    prefix: 'Creative/design/ironvalientCard/',
    pageSize: 28,
    imagesOnly: true,
    recursive: false,
  },
  trainerCards: {
    prefix: 'Creative/design/trainerCards/',
    pageSize: 28,
    imagesOnly: true,
    recursive: false,
  },
  appleMusicCover: {
    prefix: 'Creative/design/appleMusicCover/',
    pageSize: 28,
    imagesOnly: true,
    recursive: false,
  },
  flora: {
    prefix: 'Floratrium/flora/',
    pageSize: 28,
    imagesOnly: false,
    recursive: true,
  },
  hei: {
    prefix: 'Floratrium/hei/',
    pageSize: 28,
    imagesOnly: false,
    recursive: true,
  },
  photography: {
    prefix: 'Creative/Photography/',
    pageSize: 15,
    imagesOnly: true,
    recursive: false,
  },
  illustrationProcess: {
    prefix: 'Creative/illustration/prgress/',
    pageSize: 15,
    imagesOnly: true,
    recursive: false,
  },
  illustration: {
    prefix: 'Creative/illustration/',
    pageSize: 15,
    imagesOnly: true,
    recursive: false,
  },
} as const
export type FloraAlbumId = keyof typeof mediaAlbums
export const isMediaAlbumId = (value: string | null): value is FloraAlbumId =>
  value !== null && Object.prototype.hasOwnProperty.call(mediaAlbums, value)
export interface FloraMedia {
  key: string
  url: string
  type: 'image' | 'video'
}
export interface FloraMediaPage {
  items: FloraMedia[]
  nextCursor: string | null
  totalPages?: number
  totalItems?: number
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
// 开发索引与 R2 索引共用目录边界、直属文件和媒体类型规则。
export const isAlbumMediaKey = (
  key: string,
  albumId: FloraAlbumId
): boolean => {
  const album = mediaAlbums[albumId]
  if (
    !key.startsWith(album.prefix) ||
    (albumId === 'flora' && key.startsWith(`${album.prefix}friends/`)) ||
    (!album.recursive && key.slice(album.prefix.length).includes('/'))
  )
    return false
  const type = getFloraMediaType(key)
  return type !== null && (!album.imagesOnly || type === 'image')
}
export const getFloraAssetUrl = (key: string) =>
  `${FLORA_ASSET_ORIGIN}/${key.split('/').map(encodeURIComponent).join('/')}`

// keys 由数据源统一过滤并倒序；这里只构建当前页的 URL，不为整个相册分配媒体对象。
export const createFloraMediaPage = (
  keys: readonly string[],
  offset: number,
  pageSize = FLORA_MEDIA_PAGE_SIZE
): FloraMediaPage => ({
  items: keys.slice(offset, offset + pageSize).map((key) => ({
    key,
    url: getFloraAssetUrl(key),
    type: getFloraMediaType(key)!,
  })),
  nextCursor:
    offset + pageSize < keys.length ? String(offset + pageSize) : null,
  totalPages: Math.max(1, Math.ceil(keys.length / pageSize)),
  totalItems: keys.length,
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
