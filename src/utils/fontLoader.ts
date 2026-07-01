const CRITICAL_FONT_FAMILY = 'cn-custom'
const CRITICAL_FONT_URL = 'https://assets.anuluca.com/fonts/unboundedsans.ttf'
let criticalFontLoadPromise: Promise<boolean> | null = null

/**
 * 加载首屏关键字体。入口过渡会等待这个 Promise 完成后再退出。
 * 使用 FontFace API 明确触发 unboundedsans.ttf 下载，避免仅依赖 CSS 首次使用时机。
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
      link.type = 'font/ttf'
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
            `url("${CRITICAL_FONT_URL}") format("truetype")`,
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
