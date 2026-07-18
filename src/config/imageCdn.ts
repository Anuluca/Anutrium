interface CloudflareImagePreset {
  width: number
  height: number
  fit: 'scale-down'
  quality: number
  format: 'auto'
}

export const CLOUDFLARE_IMAGE_PRESETS: Record<
  'travelCard',
  CloudflareImagePreset
> = {
  travelCard: {
    width: 960,
    height: 690,
    fit: 'scale-down',
    quality: 72,
    format: 'auto',
  },
}

const CLOUDFLARE_IMAGE_ORIGINS = new Set(['https://assets.anuluca.com'])

const createCloudflareImageUrl = (
  source: string,
  preset: CloudflareImagePreset
) => {
  if (source.includes('/cdn-cgi/image/')) return source

  try {
    const sourceUrl = new URL(source)
    if (!CLOUDFLARE_IMAGE_ORIGINS.has(sourceUrl.origin)) return source

    const options = [
      `width=${preset.width}`,
      `height=${preset.height}`,
      `fit=${preset.fit}`,
      `quality=${preset.quality}`,
      `format=${preset.format}`,
    ].join(',')

    return `${sourceUrl.origin}/cdn-cgi/image/${options}${sourceUrl.pathname}${sourceUrl.search}`
  } catch {
    return source
  }
}

export const getTravelCardThumbnailUrl = (source: string) =>
  createCloudflareImageUrl(source, CLOUDFLARE_IMAGE_PRESETS.travelCard)

export const getCloudflareImageSourceUrl = (source: string) => {
  try {
    const sourceUrl = new URL(source)
    const transformPrefix = '/cdn-cgi/image/'
    const transformStart = sourceUrl.pathname.indexOf(transformPrefix)
    if (transformStart < 0) return source

    const transformedPath = sourceUrl.pathname.slice(
      transformStart + transformPrefix.length
    )
    const sourcePathStart = transformedPath.indexOf('/')
    if (sourcePathStart < 0) return source

    return `${sourceUrl.origin}${transformedPath.slice(sourcePathStart)}${
      sourceUrl.search
    }`
  } catch {
    return source
  }
}
