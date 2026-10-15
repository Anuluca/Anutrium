type Point = { x: number; y: number }
type Transform = Point & { scale: number }

/** 接管图片触控，避免底层单指拖拽监听将双指手势误判为移动。 */
export const bindImageViewerTouch = (
  wrapper: HTMLElement,
  onTransform: () => void,
  beforeGesture?: () => void,
  onSwipe?: (direction: -1 | 1) => void
) => {
  const transforms = new WeakMap<HTMLImageElement, Transform>()
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
  const apply = (image: HTMLImageElement, transform: Transform) => {
    image.style.scale = String(transform.scale)
    image.style.translate = `${transform.x}px ${transform.y}px`
    const canvas = image.closest<HTMLElement>('.el-image-viewer__canvas')
    if (canvas) {
      const rect = image.getBoundingClientRect()
      const bounds = canvas.getBoundingClientRect()
      const padding = getComputedStyle(canvas)
      const left = bounds.left + parseFloat(padding.paddingLeft)
      const right = bounds.right - parseFloat(padding.paddingRight)
      const top = bounds.top + parseFloat(padding.paddingTop)
      const bottom = bounds.bottom - parseFloat(padding.paddingBottom)
      // 小于可视区域时固定居中；超出后允许平移，但不拖出大片空白。
      transform.x =
        rect.width > right - left
          ? Math.min(
              left - rect.left + transform.x,
              Math.max(right - rect.right + transform.x, transform.x)
            )
          : transform.x + (left + right - rect.left - rect.right) / 2
      transform.y =
        rect.height > bottom - top
          ? Math.min(
              top - rect.top + transform.y,
              Math.max(bottom - rect.bottom + transform.y, transform.y)
            )
          : transform.y + (top + bottom - rect.top - rect.bottom) / 2
      image.style.translate = `${transform.x}px ${transform.y}px`
    }
    transforms.set(image, transform)
    onTransform()
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
      begin(gesture.image, event.touches)
      return
    }
    const current = midpoint(event.touches)
    if (swipe) swipe.last = current
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
    apply(gesture.image, {
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
    if (event.touches.length && gesture.image.isConnected)
      begin(gesture.image, event.touches)
    else {
      const nativeScale = Number(
        /scale\(([^)]+)\)/.exec(gesture.image.style.transform)?.[1] ?? 1
      )
      const normalSize =
        Math.abs(
          (transforms.get(gesture.image)?.scale ?? 1) * nativeScale - 1
        ) < 0.01
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
    gesture = undefined
    wrapper.removeEventListener('touchstart', start, true)
    wrapper.removeEventListener('touchmove', move, true)
    wrapper.removeEventListener('touchend', end, true)
    wrapper.removeEventListener('touchcancel', end, true)
  }
}
