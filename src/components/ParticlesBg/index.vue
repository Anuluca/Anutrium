<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useMotionActivity } from '@/composables/useMotionActivity'

interface Props {
  active?: boolean
  quantity?: number
  color?: string
  refresh?: boolean
  maxFps?: number
  opaque?: boolean
}

interface Particle {
  alpha: number
  phase: number
  textureIndex: number
  velocityX: number
  velocityY: number
  x: number
  y: number
}

interface ParticleTexture {
  canvas: HTMLCanvasElement
  size: number
}

const props = withDefaults(defineProps<Props>(), {
  active: true,
  quantity: 100,
  color: '#ffffff',
  refresh: false,
  maxFps: 60,
  opaque: false,
})

const canvasElement = ref<HTMLCanvasElement | null>(null)
const isIntersecting = ref(true)
const { motionAllowed } = useMotionActivity()
const renderedParticleCount = ref(0)
const motionState = computed(() =>
  props.active && isIntersecting.value && motionAllowed.value
    ? 'running'
    : 'paused'
)

// 尺寸仅由 ResizeObserver 更新，动画帧不读取布局。
let canvasWidth = 1
let canvasHeight = 1
let particles: Particle[] = []
let context: CanvasRenderingContext2D | null = null
let animationFrameId: number | null = null
let frameTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let lastFrameTime = 0
let lastBudgetTime = 0
let particleTextures: ParticleTexture[] = []
let particleTexturePixelRatio = 0
const PARTICLE_RADII = [2.6, 4, 5.8, 8.4] as const
const PARTICLE_DRIFT_SPEED = 0.06

const rebuildParticleTextures = (pixelRatio: number) => {
  if (typeof document === 'undefined') return

  particleTexturePixelRatio = pixelRatio
  particleTextures = PARTICLE_RADII.map((radius) => {
    const size = Math.ceil(radius * 2 + 2)
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = Math.ceil(size * pixelRatio)
    textureCanvas.height = Math.ceil(size * pixelRatio)
    const textureContext = textureCanvas.getContext('2d')

    textureContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    if (textureContext) {
      textureContext.fillStyle = props.color
      textureContext.beginPath()
      textureContext.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
      textureContext.fill()

      // 在缓存纹理中柔化边缘，避免每帧执行模糊滤镜。
      const edgeMask = textureContext.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        radius
      )
      edgeMask.addColorStop(0, 'rgba(0, 0, 0, 1)')
      edgeMask.addColorStop(0.55, 'rgba(0, 0, 0, 1)')
      edgeMask.addColorStop(1, 'rgba(0, 0, 0, 0)')
      textureContext.globalCompositeOperation = 'destination-in'
      textureContext.fillStyle = edgeMask
      textureContext.fillRect(0, 0, size, size)
    }

    return { canvas: textureCanvas, size }
  })
}

const createParticle = (width: number, height: number): Particle => ({
  alpha: 0.16 + Math.random() * 0.52,
  phase: Math.random() * Math.PI * 2,
  textureIndex: Math.floor(Math.random() * PARTICLE_RADII.length),
  velocityX: (Math.random() - 0.5) * PARTICLE_DRIFT_SPEED,
  velocityY: (Math.random() - 0.5) * PARTICLE_DRIFT_SPEED,
  x: Math.random() * width,
  y: Math.random() * height,
})

const resetParticles = () => {
  const canvas = canvasElement.value
  if (!canvas) return

  const width = canvasWidth
  const height = canvasHeight
  particles = Array.from({ length: props.quantity }, () =>
    createParticle(width, height)
  )
  renderedParticleCount.value = particles.length
}

const resizeCanvas = () => {
  const canvas = canvasElement.value
  if (!canvas) return

  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  canvasWidth = width
  canvasHeight = height
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  if (particleTexturePixelRatio !== pixelRatio) {
    rebuildParticleTextures(pixelRatio)
  }
  const backingWidth = Math.round(width * pixelRatio)
  const backingHeight = Math.round(height * pixelRatio)

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth
    canvas.height = backingHeight
    context = canvas.getContext('2d')
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    resetParticles()
  } else if (!context) {
    context = canvas.getContext('2d')
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    resetParticles()
  }
}

const drawParticles = (frameTime: number, shouldMove: boolean) => {
  const canvas = canvasElement.value
  if (!canvas || !context) return

  const width = canvasWidth
  const height = canvasHeight
  const elapsed = Math.min(32, Math.max(0, frameTime - lastFrameTime))

  context.clearRect(0, 0, width, height)

  for (const particle of particles) {
    if (shouldMove) {
      particle.x += particle.velocityX * elapsed
      particle.y += particle.velocityY * elapsed
      if (particle.x < -10) particle.x = width + 10
      if (particle.x > width + 10) particle.x = -10
      if (particle.y < -10) particle.y = height + 10
      if (particle.y > height + 10) particle.y = -10
    }

    const flicker = 0.72 + Math.sin(frameTime * 0.0008 + particle.phase) * 0.28
    const texture = particleTextures[particle.textureIndex]
    if (!texture) continue

    context.globalAlpha = props.opaque ? 1 : particle.alpha * flicker
    context.drawImage(
      texture.canvas,
      particle.x - texture.size / 2,
      particle.y - texture.size / 2,
      texture.size,
      texture.size
    )
  }

  context.globalAlpha = 1
}

const stopAnimation = () => {
  if (frameTimer !== null) clearTimeout(frameTimer)
  frameTimer = null
  if (animationFrameId === null) return
  window.cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

const animate = (frameTime: number) => {
  animationFrameId = null
  if (motionState.value !== 'running') return

  // 高刷新率屏幕也遵守 maxFps，避免标称 60 帧实际每秒重绘 120/165 次全屏画布。
  const interval = 1000 / Math.max(1, props.maxFps)
  const elapsed = frameTime - lastBudgetTime
  if (props.maxFps >= 60 && elapsed < interval) {
    animationFrameId = window.requestAnimationFrame(animate)
    return
  }

  drawParticles(frameTime, true)
  lastFrameTime = frameTime
  lastBudgetTime =
    props.maxFps >= 60 ? frameTime - (elapsed % interval) : frameTime
  if (props.maxFps < 60) {
    frameTimer = setTimeout(() => {
      frameTimer = null
      animationFrameId = window.requestAnimationFrame(animate)
    }, 1000 / Math.max(1, props.maxFps))
  } else {
    animationFrameId = window.requestAnimationFrame(animate)
  }
}

const syncAnimation = () => {
  stopAnimation()
  lastFrameTime = performance.now()
  lastBudgetTime = lastFrameTime

  if (motionState.value === 'running') {
    animationFrameId = window.requestAnimationFrame(animate)
  } else {
    drawParticles(lastFrameTime, false)
  }
}

watch([motionState, () => props.maxFps], syncAnimation)
watch(
  () => [props.quantity, props.refresh],
  () => {
    resetParticles()
    syncAnimation()
  }
)
watch(
  () => [props.color, props.opaque],
  () => {
    rebuildParticleTextures(Math.min(window.devicePixelRatio || 1, 1.5))
    drawParticles(performance.now(), false)
  }
)

onMounted(() => {
  const canvas = canvasElement.value
  if (!canvas) return

  resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
    syncAnimation()
  })
  resizeObserver.observe(canvas)

  intersectionObserver = new IntersectionObserver(([entry]) => {
    isIntersecting.value = entry.isIntersecting
  })
  intersectionObserver.observe(canvas)

  resizeCanvas()
  syncAnimation()
})

onUnmounted(() => {
  stopAnimation()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
})
</script>

<template>
  <canvas
    ref="canvasElement"
    class="particles-bg"
    data-renderer="canvas-2d"
    :data-motion-state="motionState"
    :data-particle-count="renderedParticleCount"
    :data-max-fps="props.maxFps"
  />
</template>

<style scoped>
.particles-bg {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
