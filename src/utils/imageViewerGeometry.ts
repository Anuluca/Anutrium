import type { CSSProperties } from 'vue'

import { centerUnzoomedImage } from './imageViewerGestures'
import { getImageScale, IMAGE_ZOOM_THRESHOLD } from './mediaPreview'

/** 隔离第三方预览 DOM 的测量与装饰同步，避免拖动时反复触发组件渲染。 */
export const createImageViewerGeometry = (
  wrapper: HTMLElement,
  corners: HTMLElement,
  isVideo: () => boolean,
  setLoading: (loading: boolean) => void
) => {
  const canvas = wrapper.querySelector<HTMLElement>('.el-image-viewer__canvas')
  let image: HTMLImageElement | null = null
  let decoratedImage: HTMLImageElement | null = null
  let frame = 0
  let disposed = false
  let previousStyle: CSSProperties = {}
  let previousImageStyle: string | null = null

  const hideCorners = () => {
    if (corners.style.display !== 'none') corners.style.display = 'none'
    previousStyle.display = 'none'
  }
  const setZoomed = (zoomed: boolean) => {
    if (wrapper.classList.contains('is-image-zoomed') !== zoomed)
      wrapper.classList.toggle('is-image-zoomed', zoomed)
  }
  const sync = () => {
    if (disposed) return
    cancelAnimationFrame(frame)
    frame = 0
    const video = isVideo()
    const current = video
      ? null
      : canvas?.querySelector<HTMLImageElement>('.el-image-viewer__img') ?? null
    if (current !== image) {
      if (image) resizeObserver.unobserve(image)
      imageObserver.disconnect()
      image = current
      if (image) {
        resizeObserver.observe(image)
        imageObserver.observe(image, {
          attributes: true,
          attributeFilter: ['style', 'src'],
        })
      }
    }
    setLoading(!video && (!image || !image.complete))
    if (!image?.naturalWidth) {
      previousImageStyle = image?.getAttribute('style') ?? null
      setZoomed(false)
      hideCorners()
      return
    }

    centerUnzoomedImage(image)
    const width = image.offsetWidth
    const height = image.offsetHeight
    const left = image.offsetLeft
    const top = image.offsetTop
    const barWidth = `${width + 32}px`
    if (wrapper.style.getPropertyValue('--viewer-info-bar-width') !== barWidth)
      wrapper.style.setProperty('--viewer-info-bar-width', barWidth)
    setZoomed(getImageScale(image) > IMAGE_ZOOM_THRESHOLD)

    if (decoratedImage !== image) {
      decoratedImage = image
      for (const animation of corners.getAnimations())
        if ((animation as CSSAnimation).animationName === 'viewer-corner-in')
          animation.currentTime = 0
    }
    const nextStyle: CSSProperties = {
      display: 'block',
      left: `${left - 16}px`,
      top: `${top - 16}px`,
      width: `${width + 32}px`,
      height: `${height + 32}px`,
      transform: image.style.transform,
      scale: image.style.scale,
      translate: image.style.translate,
      transition: image.style.transition,
    }
    for (const key of Object.keys(nextStyle) as (keyof CSSProperties)[])
      if (nextStyle[key] !== previousStyle[key])
        Object.assign(corners.style, { [key]: nextStyle[key] })
    previousStyle = nextStyle
    previousImageStyle = image.getAttribute('style')
  }
  const schedule = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(sync)
  }
  const resizeObserver = new ResizeObserver(schedule)
  const imageObserver = new MutationObserver((records) => {
    if (
      records.some((record) => record.attributeName === 'src') ||
      image?.getAttribute('style') !== previousImageStyle
    )
      schedule()
  })
  const canvasObserver = new MutationObserver(schedule)
  if (canvas) {
    resizeObserver.observe(canvas)
    canvasObserver.observe(canvas, { childList: true })
    canvas.addEventListener('load', schedule, true)
    canvas.addEventListener('error', schedule, true)
  }
  sync()
  return {
    sync,
    dispose: () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      imageObserver.disconnect()
      canvasObserver.disconnect()
      canvas?.removeEventListener('load', schedule, true)
      canvas?.removeEventListener('error', schedule, true)
    },
  }
}
