/**
 * 字体和图片加载工具类
 * 确保所有自定义字体和 logo 图片加载完成后再显示页面内容
 */

const FONT_FAMILIES = ['enTitle', 'cnTitle', 'Unbounded Sans']

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

  const fontLoadPromises = FONT_FAMILIES.map((fontFamily) => {
    return checkFontLoaded(fontFamily)
  })

  const imageLoadPromises = LOGO_IMAGE_PATHS.map((imagePath) => {
    return loadImage(imagePath)
  })

  try {
    await Promise.all([...fontLoadPromises, ...imageLoadPromises])
    window.fontLoaded = true
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
