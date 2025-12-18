/**
 * 字体加载工具类
 * 确保所有自定义字体加载完成后再显示页面内容
 */

// 定义需要预加载的字体列表
const FONT_FAMILIES = [
  'cusTitle',
  'cusTitle2', 
  'cusContext',
  'cusPixel',
  'SiYuan'
];

/**
 * 检查单个字体是否已加载
 * @param fontFamily 字体名称
 * @returns Promise<boolean>
 */
function checkFontLoaded(fontFamily: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 使用浏览器原生的字体加载API
    if ('fonts' in document) {
      document.fonts.load(`16px ${fontFamily}`).then(() => {
        resolve(true);
      }).catch(() => {
        console.warn(`字体 ${fontFamily} 加载失败`);
        resolve(false);
      });
    } else {
      // 降级处理：对于不支持Font Loading API的浏览器
      setTimeout(() => resolve(true), 100);
    }
  });
}

/**
 * 等待所有字体加载完成
 * @returns Promise<void>
 */
export async function loadAllFonts(): Promise<void> {
  const fontLoadPromises = FONT_FAMILIES.map(fontFamily => checkFontLoaded(fontFamily));
  try {
    await Promise.all(fontLoadPromises);
    console.log('所有字体加载完成');
  } catch (error) {
    console.error('字体加载过程中出现错误:', error);
  }
}

/**
 * 显示页面内容（字体加载完成后调用）
 */
export function showPageContent(): void {
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.style.visibility = 'visible';
  }
  
  // 移除加载指示器（如果有）
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}