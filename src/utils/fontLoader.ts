/**
 * 字体加载工具类
 * 确保所有自定义字体加载完成后再显示页面内容
 */

// 定义需要预加载的字体列表
const FONT_FAMILIES = [
  'cusTitle',
  'cusTitle2', 
  'cusContext',
];

// 进度相关元素
let progressBar: HTMLElement | null = null;
let progressText: HTMLElement | null = null;

// 初始化进度条元素引用
function initProgressElements(): void {
  progressBar = document.getElementById('progress-bar');
  progressText = document.getElementById('progress-text');
}


/**
 * 检查单个字体是否已加载
 * @param fontFamily 字体名称
 * @param progressCallback 进度回调函数
 * @returns Promise<boolean>
 */
function checkFontLoaded(fontFamily: string, progressCallback?: (loaded: boolean) => void): Promise<boolean> {
  return new Promise((resolve) => {
    // 使用浏览器原生的字体加载API
    if ('fonts' in document) {
      document.fonts.load(`16px ${fontFamily}`).then(() => {
        if (progressCallback) progressCallback(true);
        resolve(true);
      }).catch(() => {
        console.warn(`字体 ${fontFamily} 加载失败`);
        if (progressCallback) progressCallback(false);
        resolve(false);
      });
    } else {
      // 降级处理：对于不支持Font Loading API的浏览器
      setTimeout(() => {
        if (progressCallback) progressCallback(true);
        resolve(true);
      }, 100);
    }
  });
}

/**
 * 等待所有字体加载完成
 * @returns Promise<void>
 */
export async function loadAllFonts(): Promise<void> {
  initProgressElements();
  window.fontLoaded = false;
  
  const totalFonts = FONT_FAMILIES.length;
  let loadedFonts = 0;
  
  const updateProgressUI = () => {
    const progress = (loadedFonts / totalFonts) * 100;
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  };
  
  const fontLoadPromises = FONT_FAMILIES.map((fontFamily, index) => {
    return checkFontLoaded(fontFamily, (success) => {
      loadedFonts++;
      updateProgressUI();
    });
  });
  
  try {
    await Promise.all(fontLoadPromises);
    window.fontLoaded = true;
    console.log('所有字体加载完成');
  } catch (error) {
    console.error('字体加载过程中出现错误:', error);
  }
}

/**
 * 显示页面内容（字体加载完成后调用）
 */
export function showPageContent(): void {
  // 移除加载指示器（如果有）
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}