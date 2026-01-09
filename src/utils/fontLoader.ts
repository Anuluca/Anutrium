/**
 * 字体和图片加载工具类
 * 确保所有自定义字体和 logo 图片加载完成后再显示页面内容
 */

// 定义需要预加载的字体列表
const FONT_FAMILIES = ['Dela Gothic One', 'cnTitle', 'cnArtTitle']

// logo 图片路径列表
const LOGO_IMAGE_PATHS = [
  '/src/assets/img/logo/logo.png',
  '/src/assets/img/logo/logo_black.png',
]

// 进度相关元素
let progressBar: HTMLElement | null = null
let progressText: HTMLElement | null = null

// 初始化进度条元素引用
function initProgressElements(): void {
  progressBar = document.getElementById('progress-bar')
  progressText = document.getElementById('progress-text')
}

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
    // 使用浏览器原生的字体加载API
    if ('fonts' in document) {
      document.fonts
        .load(`16px ${fontFamily}`)
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
      // 降级处理：对于不支持Font Loading API的浏览器
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

    // 添加时间戳防止缓存问题
    img.src = imagePath + '?t=' + new Date().getTime()
  })
}

/**
 * 等待所有字体和图片加载完成
 * @returns Promise<void>
 */
export async function loadAllFonts(): Promise<void> {
  initProgressElements()
  window.fontLoaded = false

  // 计算总资源数量（字体 + 图片）
  const totalResources = FONT_FAMILIES.length + LOGO_IMAGE_PATHS.length
  let loadedResources = 0

  const updateProgressUI = () => {
    const progress = (loadedResources / totalResources) * 100
    if (progressBar) {
      progressBar.style.width = `${progress}%`
    }
    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`
    }
  }

  // 创建字体加载 Promise 数组
  const fontLoadPromises = FONT_FAMILIES.map((fontFamily) => {
    return checkFontLoaded(fontFamily, (_) => {
      loadedResources++
      updateProgressUI()
    })
  })

  // 创建图片加载 Promise 数组
  const imageLoadPromises = LOGO_IMAGE_PATHS.map((imagePath) => {
    return loadImage(imagePath, (_) => {
      loadedResources++
      updateProgressUI()
    })
  })

  try {
    // 等待字体和图片都加载完成
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
  // 移除加载指示器（如果有）
  const loadingIndicator = document.getElementById('loading-indicator')
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none'
  }
}
