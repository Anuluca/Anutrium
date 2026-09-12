const R2_ASSET_ORIGIN = 'https://assets.anuluca.com'

export type HomeImageVariant =
  | 'home-thumb'
  | 'journey-thumb'
  | 'project-thumb'

/**
 * 标记由 Cloudflare Images 转换流处理的首页缩略图。
 * 原图继续保留在 R2；非本站资源保持原样，避免影响外部图片。
 */
export const getHomeImageVariantUrl = (
  source: string,
  variant: HomeImageVariant
) => {
  try {
    const url = new URL(source)
    if (url.origin !== R2_ASSET_ORIGIN) return source

    url.searchParams.set('image', variant)
    return url.toString()
  } catch {
    return source
  }
}

export const getHomeThumbnailUrl = (source: string) =>
  getHomeImageVariantUrl(source, 'home-thumb')
