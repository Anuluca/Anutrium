/**
 * 字体和图片加载工具类
 * 确保所有自定义字体和 logo 图片加载完成后再显示页面内容
 */

const CRITICAL_FONT_FAMILY = 'cn-custom'
const CRITICAL_FONT_URL = 'https://assets.anuluca.com/fonts/unboundedsans.ttf'
const FONT_FAMILIES = ['enTitle', 'cnTitle', CRITICAL_FONT_FAMILY]
let criticalFontLoadPromise: Promise<boolean> | null = null

const LOGO_IMAGE_PATHS = [
  '/assets/logo.jpg',
  '/assets/logo_horizon.jpg',
  '/assets/logo_horizon_black.jpg',
  '/assets/logo_black.jpg',
]

/**
 * 检查单个字体是否已加载
 * @param fontFamily 字体名称
 * @param progressCallback 进度回调函数
 * @returns Promise<boolean>
 */
function checkFontLoaded(
  fontFamily: string,
  progressCallback?: (loaded: boolean) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    if ('fonts' in document) {
      const cssFontFamily = fontFamily.includes(' ')
        ? `"${fontFamily}"`
        : fontFamily

      document.fonts
        .load(`16px ${cssFontFamily}`)
        .then(() => {
          if (progressCallback) progressCallback(true)
          resolve(true)
        })
        .catch(() => {
          console.warn(`字体 ${fontFamily} 加载失败`)
          if (progressCallback) progressCallback(false)
          resolve(false)
        })
    } else {
      setTimeout(() => {
        if (progressCallback) progressCallback(true)
        resolve(true)
      }, 100)
    }
  })
}

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
      window.fontLoaded = loaded
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

/**
 * 加载单个图片
 * @param imagePath 图片路径
 * @param progressCallback 进度回调函数
 * @returns Promise<boolean>
 */
function loadImage(
  imagePath: string,
  progressCallback?: (loaded: boolean) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      if (progressCallback) progressCallback(true)
      resolve(true)
    }

    img.onerror = () => {
      console.warn(`图片 ${imagePath} 加载失败`)
      if (progressCallback) progressCallback(false)
      resolve(false)
    }

    img.src = imagePath + '?t=' + new Date().getTime()
  })
}

/**
 * 等待所有字体和图片加载完成
 * @returns Promise<void>
 */
export async function loadAllFonts(): Promise<void> {
  window.fontLoaded = false

  const fontLoadPromises = FONT_FAMILIES.map((fontFamily) =>
    fontFamily === CRITICAL_FONT_FAMILY
      ? loadCriticalFont()
      : checkFontLoaded(fontFamily)
  )

  const imageLoadPromises = LOGO_IMAGE_PATHS.map((imagePath) => {
    return loadImage(imagePath)
  })

  try {
    const results = await Promise.all([
      ...fontLoadPromises,
      ...imageLoadPromises,
    ])
    window.fontLoaded = results.every(Boolean)
    console.log('所有字体和图片加载完成')
  } catch (error) {
    console.error('资源加载过程中出现错误:', error)
  }
}

/**
 * 显示页面内容（字体和图片加载完成后调用）
 */
export function showPageContent(): void {
  const loadingIndicator = document.getElementById('loading-indicator')
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none'
  }
}
