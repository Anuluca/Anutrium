import { getImageScale, IMAGE_ZOOM_THRESHOLD } from './mediaPreview'

type Point = { x: number; y: number }
type Transform = Point & { scale: number }
const transforms = new WeakMap<HTMLImageElement, Transform>()

/** 按实际缩放比例归零位移，兼容按钮、滚轮和双指缩放叠加。 */
export const centerUnzoomedImage = (image: HTMLImageElement) => {
  if (getImageScale(image) > IMAGE_ZOOM_THRESHOLD) return
  const transform = transforms.get(image)
  if (transform && (transform.x !== 0 || transform.y !== 0)) {
    transform.x = 0
    transform.y = 0
    image.style.translate = '0px 0px'
  }
}

/** 统一鼠标与触控手势，并在每个动画帧内只提交一次图片位移。 */
export const bindImageViewerGestures = (
  wrapper: HTMLElement,
  onTransform: () => void,
  beforeGesture?: () => void,
  onSwipe?: (direction: -1 | 1) => void
) => {
  let swipe: { start: Point; last: Point; pinched: boolean } | undefined
  let gesture:
    | {
        image: HTMLImageElement
        count: number
        start: Transform
        midpoint: Point
        center: Point
        distance: number
      }
    | undefined
  const midpoint = (touches: TouchList): Point => ({
    x:
      touches.length > 1
        ? (touches[0].clientX + touches[1].clientX) / 2
        : touches[0].clientX,
    y:
      touches.length > 1
        ? (touches[0].clientY + touches[1].clientY) / 2
        : touches[0].clientY,
  })
  const distance = (touches: TouchList) =>
    touches.length > 1
      ? Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        )
      : 0
  const begin = (image: HTMLImageElement, touches: TouchList) => {
    const rect = image.getBoundingClientRect()
    gesture = {
      image,
      count: Math.min(touches.length, 2),
      start: { ...(transforms.get(image) ?? { scale: 1, x: 0, y: 0 }) },
      midpoint: midpoint(touches),
      center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      distance: distance(touches),
    }
  }
  type Geometry = {
    width: number
    height: number
    centerX: number
    centerY: number
    left: number
    right: number
    top: number
    bottom: number
  }
  let geometryCache = new WeakMap<HTMLImageElement, Geometry>()
  const measure = (image: HTMLImageElement) => {
    const cached = geometryCache.get(image)
    if (cached) return cached
    const canvas = image.closest<HTMLElement>('.el-image-viewer__canvas')
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const padding = getComputedStyle(canvas)
    const geometry: Geometry = {
      width: image.offsetWidth,
      height: image.offsetHeight,
      centerX: bounds.left + image.offsetLeft + image.offsetWidth / 2,
      centerY: bounds.top + image.offsetTop + image.offsetHeight / 2,
      left: bounds.left + parseFloat(padding.paddingLeft),
      right: bounds.right - parseFloat(padding.paddingRight),
      top: bounds.top + parseFloat(padding.paddingTop),
      bottom: bounds.bottom - parseFloat(padding.paddingBottom),
    }
    geometryCache.set(image, geometry)
    return geometry
  }
  const clampOffset = (
    offset: number,
    size: number,
    center: number,
    start: number,
    end: number
  ) =>
    size > end - start
      ? Math.min(
          start - center + size / 2,
          Math.max(end - center - size / 2, offset)
        )
      : (start + end) / 2 - center
  const apply = (image: HTMLImageElement, transform: Transform) => {
    const scale = getImageScale(image, transform.scale)
    const bounds = measure(image)
    if (scale <= IMAGE_ZOOM_THRESHOLD) {
      transform.x = 0
      transform.y = 0
    } else if (bounds) {
      // 使用未变换尺寸推算缩放后的边界，避免每次拖动都先写样式再强制测量布局。
      transform.x = clampOffset(
        transform.x,
        bounds.width * scale,
        bounds.centerX,
        bounds.left,
        bounds.right
      )
      transform.y = clampOffset(
        transform.y,
        bounds.height * scale,
        bounds.centerY,
        bounds.top,
        bounds.bottom
      )
    }
    transforms.set(image, transform)
    const scaleValue = String(transform.scale)
    const translateValue = `${transform.x}px ${transform.y}px`
    if (image.style.scale !== scaleValue) image.style.scale = scaleValue
    if (image.style.translate !== translateValue)
      image.style.translate = translateValue
    onTransform()
  }
  let frame = 0
  let pending: { image: HTMLImageElement; transform: Transform } | undefined
  const flushTransform = () => {
    cancelAnimationFrame(frame)
    frame = 0
    const update = pending
    pending = undefined
    if (
      update?.image.isConnected &&
      !wrapper.classList.contains('is-crt-closing')
    )
      apply(update.image, update.transform)
  }
  const scheduleTransform = (image: HTMLImageElement, transform: Transform) => {
    pending = { image, transform }
    if (!frame) frame = requestAnimationFrame(flushTransform)
  }
  const invalidateGeometry = () => {
    geometryCache = new WeakMap()
  }
  let stopMouseDrag: (() => void) | undefined
  const startMouseDrag = (event: MouseEvent) => {
    if (
      event.button !== 0 ||
      !(event.target instanceof HTMLImageElement) ||
      !event.target.classList.contains('el-image-viewer__img') ||
      wrapper.classList.contains('is-crt-closing')
    )
      return
    const image = event.target
    event.preventDefault()
    event.stopImmediatePropagation()
    stopMouseDrag?.()
    if (!image.naturalWidth || getImageScale(image) <= IMAGE_ZOOM_THRESHOLD)
      return
    flushTransform()
    geometryCache.delete(image)
    measure(image)
    beforeGesture?.()
    const start = { ...(transforms.get(image) ?? { scale: 1, x: 0, y: 0 }) }
    const point = { x: event.clientX, y: event.clientY }
    const moveMouse = (event: MouseEvent) => {
      if (!image.isConnected) {
        stopMouseDrag?.()
        return
      }
      scheduleTransform(image, {
        scale: start.scale,
        x: start.x + event.clientX - point.x,
        y: start.y + event.clientY - point.y,
      })
    }
    const stop = () => {
      flushTransform()
      document.removeEventListener('mousemove', moveMouse)
      document.removeEventListener('mouseup', stop)
      stopMouseDrag = undefined
    }
    stopMouseDrag = stop
    document.addEventListener('mousemove', moveMouse)
    document.addEventListener('mouseup', stop)
  }
  const start = (event: TouchEvent) => {
    if (
      !window.matchMedia('(max-width: 768px), (pointer: coarse)').matches ||
      wrapper.classList.contains('is-crt-closing')
    )
      return
    const image =
      gesture?.image ??
      (event.target instanceof Element
        ? event.target.closest<HTMLImageElement>('.el-image-viewer__img')
        : null)
    if (!image?.naturalWidth || !event.touches.length) return
    event.preventDefault()
    event.stopImmediatePropagation()
    flushTransform()
    geometryCache.delete(image)
    measure(image)
    beforeGesture?.()
    if (!gesture)
      swipe = {
        start: midpoint(event.touches),
        last: midpoint(event.touches),
        pinched: event.touches.length > 1,
      }
    else if (swipe && event.touches.length > 1) swipe.pinched = true
    begin(image, event.touches)
  }
  const move = (event: TouchEvent) => {
    if (!gesture || !gesture.image.isConnected || !event.touches.length) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (Math.min(event.touches.length, 2) !== gesture.count) {
      flushTransform()
      begin(gesture.image, event.touches)
      return
    }
    const current = midpoint(event.touches)
    if (swipe) swipe.last = current
    // 未放大的单指手势仅记录切图方向，不平移图片；双指缩放继续生效。
    if (
      gesture.count === 1 &&
      getImageScale(gesture.image, gesture.start.scale) <= IMAGE_ZOOM_THRESHOLD
    )
      return
    const scale =
      gesture.count === 2 && gesture.distance > 0
        ? Math.min(
            6,
            Math.max(
              1,
              (gesture.start.scale * distance(event.touches)) / gesture.distance
            )
          )
        : gesture.start.scale
    const ratio = scale / gesture.start.scale
    scheduleTransform(gesture.image, {
      scale,
      x:
        gesture.start.x +
        current.x -
        gesture.midpoint.x +
        (gesture.center.x - gesture.midpoint.x) * (ratio - 1),
      y:
        gesture.start.y +
        current.y -
        gesture.midpoint.y +
        (gesture.center.y - gesture.midpoint.y) * (ratio - 1),
    })
  }
  const end = (event: TouchEvent) => {
    if (!gesture) return
    event.preventDefault()
    event.stopImmediatePropagation()
    flushTransform()
    if (event.touches.length && gesture.image.isConnected)
      begin(gesture.image, event.touches)
    else {
      const normalSize = getImageScale(gesture.image) <= IMAGE_ZOOM_THRESHOLD
      const dx = swipe ? swipe.last.x - swipe.start.x : 0
      const dy = swipe ? swipe.last.y - swipe.start.y : 0
      const shouldSwitch =
        event.type !== 'touchcancel' &&
        normalSize &&
        swipe &&
        !swipe.pinched &&
        Math.abs(dy) > 48 &&
        Math.abs(dy) > Math.abs(dx) * 1.2
      gesture = undefined
      swipe = undefined
      if (shouldSwitch) onSwipe?.(dy < 0 ? 1 : -1)
    }
  }
  // 鼠标与触控共用位移状态，避免底层组件保留拖动偏移后在再次放大时跳回。
  window.addEventListener('resize', invalidateGeometry)
  wrapper.addEventListener('mousedown', startMouseDrag, true)
  wrapper.addEventListener('touchstart', start, {
    capture: true,
    passive: false,
  })
  wrapper.addEventListener('touchmove', move, { capture: true, passive: false })
  wrapper.addEventListener('touchend', end, { capture: true, passive: false })
  wrapper.addEventListener('touchcancel', end, {
    capture: true,
    passive: false,
  })
  return () => {
    pending = undefined
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', invalidateGeometry)
    stopMouseDrag?.()
    wrapper.removeEventListener('mousedown', startMouseDrag, true)
    gesture = undefined
    wrapper.removeEventListener('touchstart', start, true)
    wrapper.removeEventListener('touchmove', move, true)
    wrapper.removeEventListener('touchend', end, true)
    wrapper.removeEventListener('touchcancel', end, true)
  }
}
