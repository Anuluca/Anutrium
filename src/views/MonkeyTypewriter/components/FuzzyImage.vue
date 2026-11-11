<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    active?: boolean
    src?: string
    text?: string
    font?: string
    color?: string
    letterSpacing?: number
    width: number
    height: number
    baseIntensity?: number
    fuzzRange?: number
    fps?: number
  }>(),
  {
    active: true,
    src: '',
    text: '',
    baseIntensity: 0.07,
    fuzzRange: 30,
    fps: 30,
    font: "900 32px 'alibaba-puhuiti'",
    color: '#e23456',
    letterSpacing: -2.24,
  }
)
const emit = defineEmits<{ (event: 'ready'): void }>()
const canvas = ref<HTMLCanvasElement | null>(null)
let frame = 0
let previous = 0
let loaded = false
let visible = true
let disposed = false
let picture: HTMLImageElement | null = null
let observer: IntersectionObserver | null = null
let motion: MediaQueryList | null = null
let context: CanvasRenderingContext2D | null = null
let source: HTMLCanvasElement | null = null
function draw(fuzzy: boolean) {
  if (!context || !source || !canvas.value) return
  const { width, height } = source
  context.clearRect(0, 0, width, height)
  if (!fuzzy) {
    context.drawImage(source, 0, 0)
    return
  }
  // 与 FuzzyText 相同，每条水平像素行独立随机横移，不叠加旧的彩色切片。
  const ratio = width / props.width
  let start = 0
  let previousOffset = 0
  for (let row = 0; row < height; row++) {
    const offset = Math.round(
      props.baseIntensity * (Math.random() - 0.5) * props.fuzzRange * ratio
    )
    if (row && offset !== previousOffset) {
      const rows = row - start
      context.drawImage(
        source,
        0,
        start,
        width,
        rows,
        previousOffset,
        start,
        width,
        rows
      )
      start = row
    }
    previousOffset = offset
  }
  const rows = height - start
  context.drawImage(
    source,
    0,
    start,
    width,
    rows,
    previousOffset,
    start,
    width,
    rows
  )
}
function tick(now: number) {
  if (disposed) return
  if (now - previous >= 1000 / props.fps) {
    draw(true)
    previous = now
  }
  frame = requestAnimationFrame(tick)
}
function sync() {
  cancelAnimationFrame(frame)
  frame = 0
  if (!loaded || disposed) return
  draw(false)
  if (
    props.active &&
    visible &&
    document.visibilityState === 'visible' &&
    !motion?.matches
  )
    frame = requestAnimationFrame(tick)
}
watch(() => props.active, sync)
onMounted(async () => {
  const target = canvas.value
  if (!target) return
  context = target.getContext('2d')
  if (!context) return
  const ratio = Math.min(devicePixelRatio || 1, 1.5)
  target.width = Math.round(props.width * ratio)
  target.height = Math.round(props.height * ratio)
  source = document.createElement('canvas')
  source.width = target.width
  source.height = target.height
  const sourceContext = source.getContext('2d')
  if (!sourceContext) return
  motion = matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting
    sync()
  })
  observer.observe(target)
  if (props.text) {
    // 字体就绪后把字形绘制到同一离屏画布，复用图片的逐行抖动和生命周期控制。
    try {
      await document.fonts.load(props.font, props.text)
    } catch {
      /* 保留浏览器字体回退 */
    }
    if (disposed) return
    sourceContext.scale(ratio, ratio)
    sourceContext.font = props.font
    sourceContext.fillStyle = props.color
    const glyphs = Array.from(props.text)
    const widths = glyphs.map((glyph) => sourceContext.measureText(glyph).width)
    const total =
      widths.reduce((sum, width) => sum + width, 0) +
      Math.max(0, glyphs.length - 1) * props.letterSpacing
    const metrics = sourceContext.measureText(props.text)
    let x = (props.width - total) / 2
    const y =
      (props.height +
        metrics.actualBoundingBoxAscent -
        metrics.actualBoundingBoxDescent) /
      2
    glyphs.forEach((glyph, index) => {
      sourceContext.fillText(glyph, x, y)
      x += widths[index] + props.letterSpacing
    })
    loaded = true
    sync()
    emit('ready')
    return
  }
  if (!props.src) return
  picture = new Image()
  picture.onload = () => {
    if (disposed || !source || !picture) return
    sourceContext.drawImage(picture, 0, 0, source.width, source.height)
    loaded = true
    sync()
    emit('ready')
  }
  picture.src = props.src
})
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  observer?.disconnect()
  motion?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
  if (picture) picture.onload = null
  source = null
  context = null
})
</script>

<template><canvas ref="canvas" aria-hidden="true" /></template>
