import { createScanlineMask } from '@/utils/scanlineMask'

const maskSignatures = new WeakMap<HTMLElement, string>()

export const decorateImageViewerNavigation = (nav: HTMLElement) => {
  if (nav.querySelector('.safe-image-viewer__nav-surface')) return
  const fill = document.createElement('span')
  fill.className = 'safe-image-viewer__nav-fill'
  fill.setAttribute('aria-hidden', 'true')
  const scanlineOptions = {
    seed: nav.classList.contains('el-image-viewer__prev')
      ? 'flora-number-viewer-prev'
      : 'flora-number-viewer-next',
    lines: 32,
    solidFrom: 1,
    topCoverage: 0.3,
    bottomCoverage: 0.94,
    irregularity: 0.65,
    gapOpacity: 0.4,
  }
  fill.style.setProperty(
    '--viewer-nav-scanlines',
    createScanlineMask({ ...scanlineOptions, direction: 'to right' })
  )
  fill.style.setProperty(
    '--viewer-nav-scanlines-mobile',
    createScanlineMask({ ...scanlineOptions, direction: 'to bottom' })
  )
  const surface = document.createElement('span')
  surface.className = 'safe-image-viewer__nav-surface'
  surface.setAttribute('aria-hidden', 'true')
  surface.append(fill)
  nav.append(surface)
  const label = document.createElement('span')
  label.className = 'safe-image-viewer__nav-label'
  label.setAttribute('aria-hidden', 'true')
  label.textContent = nav.classList.contains('el-image-viewer__prev')
    ? 'PREV'
    : 'NEXT'
  nav.append(label)
}

const syncImageViewerNavigationCutouts = (
  wrapper: HTMLElement,
  force = false
) => {
  if (!wrapper.isConnected) return
  for (const surface of wrapper.querySelectorAll<HTMLElement>(
    '.safe-image-viewer__nav-surface'
  )) {
    const nav = surface.parentElement!
    const label = nav.querySelector<HTMLElement>(
      '.safe-image-viewer__nav-label'
    )!
    const width = nav.clientWidth
    const height = nav.clientHeight
    if (!width || !height) continue
    const style = getComputedStyle(label)
    const size = parseFloat(style.fontSize)
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const text = label.textContent ?? ''
    const signature = `${width}:${height}:${size}:${ratio}:${style.writingMode}:${text}`
    if (!force && maskSignatures.get(surface) === signature) continue
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * ratio)
    canvas.height = Math.ceil(height * ratio)
    const context = canvas.getContext('2d')
    if (!context) continue
    context.scale(ratio, ratio)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    // 完全扣除字形；扫描线空隙的透明度由独立遮罩控制。
    context.globalCompositeOperation = 'destination-out'
    context.globalAlpha = 1
    context.font = `400 ${size}px Anton`
    context.textAlign = 'center'
    const drawText = (text: string, y: number) => {
      const metrics = context.measureText(text)
      context.fillText(
        text,
        width / 2,
        y +
          (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
            2
      )
    }
    if (style.writingMode === 'horizontal-tb') {
      drawText(text, height / 2)
    } else {
      Array.from(text).forEach((character, index) =>
        drawText(
          character,
          height / 2 + (index - (text.length - 1) / 2) * size * 1.08
        )
      )
    }
    const mask = `url("${canvas.toDataURL()}")`
    surface.style.maskImage = mask
    surface.style.webkitMaskImage = mask
    maskSignatures.set(surface, signature)
  }
}

/** 两种预览共用生命周期；尺寸未变时复用遮罩，同一帧只绘制一次。 */
export const bindImageViewerNavigation = (root: HTMLElement) => {
  let disposed = false
  let frame = 0
  const sync = () => {
    if (frame || disposed) return
    frame = requestAnimationFrame(() => {
      frame = 0
      syncImageViewerNavigationCutouts(root)
    })
  }
  const observer = new ResizeObserver(sync)
  for (const nav of root.querySelectorAll<HTMLElement>(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )) {
    decorateImageViewerNavigation(nav)
    observer.observe(nav)
  }
  sync()
  void document.fonts
    .load('400 112px Anton', 'PREV NEXT')
    .then(() => {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = 0
      // 字体加载后的字形与回退字体不同，需要刷新相同尺寸的遮罩。
      syncImageViewerNavigationCutouts(root, true)
    })
    .catch(() => undefined)
  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
  }
}

/** 两种预览共用导航填充闪烁，扫描线与镂空文字保持不变。 */
export const flashImageViewerNavigation = (nav: HTMLElement) => {
  if (nav.classList.contains('is-disabled') || nav.matches(':disabled')) return
  const fill = nav.querySelector<HTMLElement>('.safe-image-viewer__nav-fill')
  if (!fill || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const background = getComputedStyle(fill).backgroundImage
  // 只闪烁带扫描线和文字镂空的填充层，保留按钮原有轮廓。
  const animation = fill.animate(
    [
      { background: '#1dcba9', offset: 0 },
      { background, offset: 0.25 },
      { background: '#1dcba9', offset: 0.5 },
      { background, offset: 0.75 },
      { background, offset: 1 },
    ].map((frame) => ({ ...frame, easing: 'steps(1, end)' })),
    { duration: 180 }
  )
  return animation
}
