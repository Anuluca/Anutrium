const CRITICAL_FONT_FAMILY = 'UnboundedSans'
const CRITICAL_FONT_SAMPLE = 'ANUTRIUM'
let criticalFontLoadPromise: Promise<boolean> | null = null

/**
 * 在后台加载首屏字体。入口过渡不等待网络，避免冷缓存时延长首屏遮罩。
 * 复用 CSS 中带 unicode-range 的字体面，避免重复注册同名字体破坏 Safari 的字形匹配。
 */
export function loadCriticalFont(): Promise<boolean> {
  if (criticalFontLoadPromise) return criticalFontLoadPromise

  criticalFontLoadPromise = new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(true)
      return
    }

    if (!('fonts' in document)) {
      resolve(true)
      return
    }

    const cssFontFamily = `"${CRITICAL_FONT_FAMILY}"`

    Promise.resolve()
      .then(async () => {
        const loadedFaces = await document.fonts.load(
          `400 16px ${cssFontFamily}`,
          CRITICAL_FONT_SAMPLE
        )
        resolve(
          loadedFaces.length > 0 &&
            document.fonts.check(
              `400 16px ${cssFontFamily}`,
              CRITICAL_FONT_SAMPLE
            )
        )
      })
      .catch(() => {
        console.warn(`字体 ${CRITICAL_FONT_FAMILY} 加载失败`)
        resolve(false)
      })
  })

  return criticalFontLoadPromise
}
