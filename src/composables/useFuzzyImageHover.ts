import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** 将封面按扫描行水平扰动；仅精确指针悬停期间绘制，不读取跨域图片像素。 */
export function useFuzzyImageHover(root: Ref<HTMLElement | null>) {
  let media: MediaQueryList | undefined
  let active: HTMLElement | null = null
  let image: HTMLImageElement | null = null
  let canvas: HTMLCanvasElement | null = null
  let source: HTMLCanvasElement | null = null
  let observer: ResizeObserver | undefined
  let frame = 0
  let lastTime = 0
  let host: HTMLElement | null = null

  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
    observer?.disconnect()
    image?.removeEventListener('load', prepare)
    canvas?.remove()
    active = null
    image = null
    canvas = null
    source = null
  }

  const draw = (time: number) => {
    if (!canvas || !source) return
    if (time - lastTime >= 1000 / 30) {
      lastTime = time
      const context = canvas.getContext('2d')
      if (!context) return
      const { width, height } = canvas
      context.clearRect(0, 0, width, height)
      const range = Math.min(15, width * 0.035)
      for (let y = 0; y < height; y += 2) {
        const stripHeight = Math.min(2, height - y)
        const offset = Math.round((Math.random() - 0.5) * range)
        context.drawImage(
          source,
          0,
          y,
          width,
          stripHeight,
          offset,
          y,
          width,
          stripHeight
        )
      }
    }
    frame = requestAnimationFrame(draw)
  }

  function prepare() {
    if (!active || !image?.naturalWidth || !canvas) return
    const width = Math.min(640, Math.round(active.clientWidth))
    const height = Math.round(
      (width * active.clientHeight) / active.clientWidth
    )
    if (!width || !height) return
    canvas.width = width
    canvas.height = height
    source = document.createElement('canvas')
    source.width = width
    source.height = height
    const context = source.getContext('2d')
    if (!context) return
    // 与原图的 object-fit: cover 保持相同裁剪，避免悬停时构图跳动。
    const scale = Math.max(
      width / image.naturalWidth,
      height / image.naturalHeight
    )
    const cropWidth = width / scale
    const cropHeight = height / scale
    context.drawImage(
      image,
      (image.naturalWidth - cropWidth) / 2,
      (image.naturalHeight - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height
    )
    if (!frame) {
      lastTime = 0
      frame = requestAnimationFrame(draw)
    }
  }

  const enter = (event: PointerEvent) => {
    if (!media?.matches || event.pointerType === 'touch') return
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.video-frame')
        : null
    if (!target || !host?.contains(target) || target === active) return
    stop()
    const targetImage = target.querySelector('img')
    if (!targetImage) return
    active = target
    image = targetImage
    canvas = document.createElement('canvas')
    canvas.className = 'video-fuzzy'
    canvas.setAttribute('aria-hidden', 'true')
    target.appendChild(canvas)
    image.addEventListener('load', prepare, { once: true })
    observer = new ResizeObserver(prepare)
    observer.observe(target)
    prepare()
  }

  const leave = (event: PointerEvent) => {
    if (
      active &&
      !(
        event.relatedTarget instanceof Node &&
        active.contains(event.relatedTarget)
      )
    )
      stop()
  }
  const handleMediaChange = () => {
    if (!media?.matches) stop()
  }
  const handleVisibility = () => {
    if (document.hidden) stop()
  }

  onMounted(() => {
    host = root.value
    media = window.matchMedia(
      '(min-width: 769px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    )
    host?.addEventListener('pointerover', enter)
    host?.addEventListener('pointerout', leave)
    media.addEventListener('change', handleMediaChange)
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onBeforeUnmount(() => {
    stop()
    host?.removeEventListener('pointerover', enter)
    host?.removeEventListener('pointerout', leave)
    media?.removeEventListener('change', handleMediaChange)
    window.removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', handleVisibility)
  })
}
