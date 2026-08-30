<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  quantity?: number
  ease?: number
  staticity?: number
  color?: string
  refresh?: boolean
}

interface Particle {
  alpha: number
  phase: number
  radius: number
  velocityX: number
  velocityY: number
  x: number
  y: number
}

const props = withDefaults(defineProps<Props>(), {
  quantity: 100,
  ease: 100,
  staticity: 10,
  color: '#ffffff',
  refresh: false,
})

const canvasElement = ref<HTMLCanvasElement | null>(null)
const isIntersecting = ref(true)
const isPageVisible = ref(true)
const isReducedMotion = ref(false)
const renderedParticleCount = ref(0)
const motionState = computed(() =>
  isIntersecting.value && isPageVisible.value && !isReducedMotion.value
    ? 'running'
    : 'paused'
)

let particles: Particle[] = []
let context: CanvasRenderingContext2D | null = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null
let lastFrameTime = 0
let pointerX: number | null = null
let pointerY: number | null = null
let pointerOffsetX = 0
let pointerOffsetY = 0

const createParticle = (width: number, height: number): Particle => ({
  alpha: 0.16 + Math.random() * 0.52,
  phase: Math.random() * Math.PI * 2,
  radius: 0.6 + Math.random() * 1.65,
  velocityX: (Math.random() - 0.5) * 0.06,
  velocityY: (Math.random() - 0.5) * 0.06,
  x: Math.random() * width,
  y: Math.random() * height,
})

const resetParticles = () => {
  const canvas = canvasElement.value
  if (!canvas) return

  const width = canvas.clientWidth
  const height = canvas.clientHeight
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
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
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

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const elapsed = Math.min(32, Math.max(0, frameTime - lastFrameTime))
  const ease = Math.max(1, props.ease)
  const staticity = Math.max(1, props.staticity)
  const targetOffsetX =
    pointerX === null ? 0 : (pointerX - width / 2) / staticity
  const targetOffsetY =
    pointerY === null ? 0 : (pointerY - height / 2) / staticity

  if (shouldMove) {
    pointerOffsetX += (targetOffsetX - pointerOffsetX) / ease
    pointerOffsetY += (targetOffsetY - pointerOffsetY) / ease
  }

  context.clearRect(0, 0, width, height)
  context.fillStyle = props.color

  for (const particle of particles) {
    if (shouldMove) {
      particle.x += particle.velocityX * elapsed
      particle.y += particle.velocityY * elapsed
      if (particle.x < -4) particle.x = width + 4
      if (particle.x > width + 4) particle.x = -4
      if (particle.y < -4) particle.y = height + 4
      if (particle.y > height + 4) particle.y = -4
    }

    const flicker = 0.72 + Math.sin(frameTime * 0.0008 + particle.phase) * 0.28

    context.globalAlpha = particle.alpha * flicker
    context.beginPath()
    context.arc(
      particle.x + pointerOffsetX,
      particle.y + pointerOffsetY,
      particle.radius,
      0,
      Math.PI * 2
    )
    context.fill()
  }

  context.globalAlpha = 1
}

const stopAnimation = () => {
  if (animationFrameId === null) return
  window.cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

const animate = (frameTime: number) => {
  animationFrameId = null
  if (motionState.value !== 'running') return

  drawParticles(frameTime, true)
  lastFrameTime = frameTime
  animationFrameId = window.requestAnimationFrame(animate)
}

const syncAnimation = () => {
  stopAnimation()
  lastFrameTime = performance.now()

  if (motionState.value === 'running') {
    animationFrameId = window.requestAnimationFrame(animate)
  } else {
    drawParticles(lastFrameTime, false)
  }
}

const handlePointerMove = (event: PointerEvent) => {
  pointerX = event.clientX
  pointerY = event.clientY
}

const handlePointerLeave = () => {
  pointerX = null
  pointerY = null
}

const handleVisibilityChange = () => {
  isPageVisible.value = !document.hidden
}

const handleReducedMotionChange = (event: MediaQueryListEvent) => {
  isReducedMotion.value = event.matches
}

watch(motionState, syncAnimation)
watch(
  () => [props.quantity, props.refresh],
  () => {
    resetParticles()
    syncAnimation()
  }
)
watch(
  () => props.color,
  () => drawParticles(performance.now(), false)
)

onMounted(() => {
  const canvas = canvasElement.value
  if (!canvas) return

  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', handlePointerLeave)

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
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pointermove', handlePointerMove)
  document.documentElement.removeEventListener(
    'pointerleave',
    handlePointerLeave
  )
})
</script>

<template>
  <canvas
    ref="canvasElement"
    class="particles-bg"
    data-renderer="canvas-2d"
    :data-motion-state="motionState"
    :data-particle-count="renderedParticleCount"
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
