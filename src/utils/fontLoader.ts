const CRITICAL_FONT_FAMILY = 'UnboundedSans'
const CRITICAL_FONT_URL =
  'https://assets.anuluca.com/fonts/unboundedsans-latin.woff2?v=20260913'
let criticalFontLoadPromise: Promise<boolean> | null = null

/**
 * 在后台加载首屏字体。入口过渡不等待网络，避免冷缓存时延长首屏遮罩。
 */
export function loadCriticalFont(): Promise<boolean> {
  if (criticalFontLoadPromise) return criticalFontLoadPromise

  criticalFontLoadPromise = new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(true)
      return
    }

    const markLoaded = (loaded: boolean) => {
      resolve(loaded)
    }

    if (!('fonts' in document)) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.href = CRITICAL_FONT_URL
      link.crossOrigin = 'anonymous'
      link.onload = () => markLoaded(true)
      link.onerror = () => {
        console.warn(`字体 ${CRITICAL_FONT_FAMILY} 加载失败`)
        markLoaded(false)
      }
      document.head.appendChild(link)
      return
    }

    const cssFontFamily = `"${CRITICAL_FONT_FAMILY}"`

    Promise.resolve()
      .then(async () => {
        if (typeof FontFace !== 'undefined') {
          const fontFace = new FontFace(
            CRITICAL_FONT_FAMILY,
            `url("${CRITICAL_FONT_URL}") format("woff2")`,
            {
              display: 'swap',
              style: 'normal',
              weight: '400 900',
            }
          )

          await fontFace.load()
          document.fonts.add(fontFace)
        }

        await document.fonts.load(`16px ${cssFontFamily}`)
        markLoaded(true)
      })
      .catch(() => {
        console.warn(`字体 ${CRITICAL_FONT_FAMILY} 加载失败`)
        markLoaded(false)
      })
  })

  return criticalFontLoadPromise
}
