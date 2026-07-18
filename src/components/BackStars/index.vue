<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  addPageScrollEndListener,
  addPageScrollListener,
  supportsPageScrollEnd,
} from '@/utils/pageScroll'

type ZodiacSignId =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'

type ZodiacLayout = 'hero' | 'content'

interface Props {
  theme?: 'light' | 'dark'
  isTextMenu?: boolean
  deepBlack?: boolean
  activeSign?: ZodiacSignId
  layout?: ZodiacLayout
  entryActive?: boolean
}

interface PositionStyle {
  left: string
  top: string
}

interface ZodiacSign {
  id: ZodiacSignId
  glyph: string
  name: string
  code: string
  positionStyle: PositionStyle
  faceStyle: { transform: string }
  degreePositionStyle: PositionStyle
  degreeFaceStyle: { transform: string }
}

interface StarLayer {
  count: number
  pointSize: number
  opacity: number
  seed: number
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'dark',
  isTextMenu: false,
  deepBlack: false,
  activeSign: 'leo',
  layout: 'hero',
  entryActive: true,
})
const STATIC_CHART_SRC = '/images/zodiac-chart-static.svg?v=20260714'
const STAR_HOLE_RADIUS = 0.286
const STAR_OUTER_RADIUS = 0.82
const STAR_LAYERS: StarLayer[] = [
  { count: 52, pointSize: 2.8, opacity: 0.29, seed: 17 },
  { count: 43, pointSize: 4.4, opacity: 0.47, seed: 43 },
  { count: 25, pointSize: 6.6, opacity: 0.72, seed: 89 },
]
const STAR_COUNT = STAR_LAYERS.reduce((total, layer) => total + layer.count, 0)
const STAR_VERTEX_STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT
const STAR_ROTATION_DURATION = 120_000
const STAR_INITIAL_ROTATION = (20 * Math.PI) / 180
const STAR_DESKTOP_FPS = 30
const STAR_MOBILE_FPS = 24
const STAR_VERTEX_SHADER = `
attribute vec2 a_position;
attribute float a_size;
attribute float a_opacity;

uniform vec2 u_resolution;
uniform float u_rotation;
uniform float u_plane_radius;
uniform float u_center_y;
uniform float u_pixel_ratio;

varying float v_opacity;
varying vec2 v_radial_direction;

void main() {
  float cosine = cos(u_rotation);
  float sine = sin(u_rotation);
  vec2 position = vec2(
    a_position.x * cosine - a_position.y * sine,
    a_position.x * sine + a_position.y * cosine
  );

  float upperStretch = smoothstep(0.0, 0.28, -position.y);
  position.x *= mix(1.0, 1.24, upperStretch);
  position.y *= mix(1.0, 1.32, upperStretch);

  vec2 pixelPosition = vec2(
    u_resolution.x * 0.5 + position.x * u_plane_radius,
    u_center_y + position.y * u_plane_radius * 0.5
  );
  vec2 clipPosition = pixelPosition / u_resolution * 2.0 - 1.0;

  gl_Position = vec4(clipPosition.x, -clipPosition.y, 0.0, 1.0);
  gl_PointSize = a_size * u_pixel_ratio;
  float boundaryFade = 1.0 - smoothstep(0.72, 0.82, length(a_position));
  v_opacity = a_opacity * boundaryFade;
  v_radial_direction = normalize(vec2(position.x, -position.y * 0.5));
}
`
const STAR_FRAGMENT_SHADER = `
precision mediump float;

uniform vec3 u_color;
uniform float u_global_opacity;

varying float v_opacity;
varying vec2 v_radial_direction;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  vec2 tangentDirection = vec2(
    -v_radial_direction.y,
    v_radial_direction.x
  );
  float radialDistance = (dot(point, v_radial_direction) - 0.18) / 0.82;
  float tangentDistance = dot(point, tangentDirection) / 0.5;
  float shapeDistanceSquared =
    radialDistance * radialDistance + tangentDistance * tangentDistance;
  if (shapeDistanceSquared > 1.0) discard;

  float edgeAlpha = 1.0 - smoothstep(0.72, 1.0, shapeDistanceSquared);
  gl_FragColor = vec4(u_color, v_opacity * u_global_opacity * edgeAlpha);
}
`

const createSeededRandom = (initialSeed: number) => {
  let seed = initialSeed
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const starVertexData = new Float32Array(STAR_COUNT * 4)
let starVertexOffset = 0

STAR_LAYERS.forEach((layer) => {
  const random = createSeededRandom(layer.seed)

  for (let index = 0; index < layer.count; index += 1) {
    const angle = random() * Math.PI * 2
    const radiusRatio = Math.sqrt(
      STAR_HOLE_RADIUS ** 2 +
        (STAR_OUTER_RADIUS ** 2 - STAR_HOLE_RADIUS ** 2) * random()
    )

    starVertexData[starVertexOffset] = Math.cos(angle) * radiusRatio
    starVertexData[starVertexOffset + 1] = Math.sin(angle) * radiusRatio
    starVertexData[starVertexOffset + 2] = layer.pointSize
    starVertexData[starVertexOffset + 3] = layer.opacity
    starVertexOffset += 4
  }
})

const polarPercent = (radius: number, angle: number): PositionStyle => {
  const radians = (angle * Math.PI) / 180
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  }
}

const zodiacSource = [
  ['aries', '♈︎', 'ARIES', 'ARI'],
  ['taurus', '♉︎', 'TAURUS', 'TAU'],
  ['gemini', '♊︎', 'GEMINI', 'GEM'],
  ['cancer', '♋︎', 'CANCER', 'CNC'],
  ['leo', '♌︎', 'LEO', 'LEO'],
  ['virgo', '♍︎', 'VIRGO', 'VIR'],
  ['libra', '♎︎', 'LIBRA', 'LIB'],
  ['scorpio', '♏︎', 'SCORPIO', 'SCO'],
  ['sagittarius', '♐︎', 'SAGITTARIUS', 'SGR'],
  ['capricorn', '♑︎', 'CAPRICORN', 'CAP'],
  ['aquarius', '♒︎', 'AQUARIUS', 'AQR'],
  ['pisces', '♓︎', 'PISCES', 'PSC'],
] as const

const zodiacSigns: ZodiacSign[] = zodiacSource.map(
  ([id, glyph, name, code], index) => {
    const centerAngle = -105 - index * 30
    const degreeAngle = -90 - index * 30
    return {
      id,
      glyph,
      name,
      code,
      positionStyle: polarPercent(40, centerAngle),
      faceStyle: { transform: `rotate(${centerAngle + 90}deg)` },
      degreePositionStyle: polarPercent(34.9, degreeAngle),
      degreeFaceStyle: { transform: `rotate(${degreeAngle + 90}deg)` },
    }
  }
)

const sectorStyles = Array.from({ length: 12 }, (_, index) => ({
  transform: `translateX(-50%) rotate(${index * 30}deg)`,
}))

const getCanonicalRotation = (signId: ZodiacSignId) => {
  const signIndex = zodiacSigns.findIndex((sign) => sign.id === signId)
  return 15 + Math.max(0, signIndex) * 30
}

const routeRotation = ref(getCanonicalRotation(props.activeSign))
const heroScale = ref(1)
const isChartTransitioning = ref(false)
const isScrollPaused = ref(false)
const isRouteTransitioning = ref(false)
const isEntryComplete = ref(false)
const isHighlightSettled = ref(false)
const activeChartTransitions = new Set<string>()
const SCROLL_IDLE_DELAY = 160
let resizeRafId: number | null = null
let scrollResumeTimer: ReturnType<typeof setTimeout> | null = null
let scrollResumeDeadline = 0
let removeScrollListener: (() => void) | null = null
let removeScrollEndListener: (() => void) | null = null
let usesNativeScrollEnd = false
const starWebglCanvas = ref<HTMLCanvasElement | null>(null)
const isReducedMotion = ref(false)
const isPageVisible = ref(true)
const starTargetFps = ref(STAR_DESKTOP_FPS)
const isStarMotionPaused = computed(
  () =>
    isReducedMotion.value ||
    !isPageVisible.value ||
    isScrollPaused.value ||
    isChartTransitioning.value
)
const starMotionState = computed(() =>
  isStarMotionPaused.value ? 'paused' : 'running'
)

interface StarRenderer {
  gl: WebGLRenderingContext
  program: WebGLProgram
  buffer: WebGLBuffer
  rotationUniform: WebGLUniformLocation
  resolutionUniform: WebGLUniformLocation
  planeRadiusUniform: WebGLUniformLocation
  centerYUniform: WebGLUniformLocation
  pixelRatioUniform: WebGLUniformLocation
  colorUniform: WebGLUniformLocation
  globalOpacityUniform: WebGLUniformLocation
}

interface StarViewportMetrics {
  width: number
  height: number
  pixelRatio: number
  planeRadius: number
  centerY: number
}

let starRenderer: StarRenderer | null = null
let starAnimationRafId: number | null = null
let starLastFrameTime: number | null = null
let starNextFrameTime: number | null = null
let starFrameInterval = 1000 / STAR_DESKTOP_FPS
let starRotation = STAR_INITIAL_ROTATION
let reducedMotionQuery: MediaQueryList | null = null
let starViewportMetrics: StarViewportMetrics = {
  width: 1,
  height: 1,
  pixelRatio: 1,
  planeRadius: 1,
  centerY: 1,
}

const compileStarShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
) => {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

const createStarProgram = (gl: WebGLRenderingContext) => {
  const vertexShader = compileStarShader(
    gl,
    gl.VERTEX_SHADER,
    STAR_VERTEX_SHADER
  )
  const fragmentShader = compileStarShader(
    gl,
    gl.FRAGMENT_SHADER,
    STAR_FRAGMENT_SHADER
  )
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader)
    if (fragmentShader) gl.deleteShader(fragmentShader)
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  return program
}

const resizeStarRenderer = () => {
  const canvas = starWebglCanvas.value
  const renderer = starRenderer
  if (!canvas || !renderer) return

  const rect = canvas.getBoundingClientRect()
  const cssWidth = Math.max(1, rect.width)
  const cssHeight = Math.max(1, rect.height)
  const isMobile = cssWidth <= 768
  const targetFps = isMobile ? STAR_MOBILE_FPS : STAR_DESKTOP_FPS
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.25)
  const width = Math.max(1, Math.round(cssWidth * pixelRatio))
  const height = Math.max(1, Math.round(cssHeight * pixelRatio))
  const viewportMax = Math.max(width, height)

  starTargetFps.value = targetFps
  starFrameInterval = 1000 / targetFps

  starViewportMetrics = {
    width,
    height,
    pixelRatio,
    planeRadius: viewportMax * (isMobile ? 0.8316 : 0.756),
    centerY:
      height * (isMobile ? 0.68 : 0.72) +
      viewportMax * (isMobile ? 0.066528 : 0.06048),
  }

  if (canvas.width === width && canvas.height === height) return

  canvas.width = width
  canvas.height = height
  renderer.gl.viewport(0, 0, width, height)
}

const drawStarScene = () => {
  const canvas = starWebglCanvas.value
  const renderer = starRenderer
  if (!canvas || !renderer) return

  const { gl } = renderer
  const { width, height, pixelRatio, planeRadius, centerY } =
    starViewportMetrics
  const color = props.theme === 'light' ? [116, 96, 58] : [211, 190, 145]

  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(renderer.program)
  gl.uniform2f(renderer.resolutionUniform, width, height)
  gl.uniform1f(renderer.rotationUniform, starRotation)
  gl.uniform1f(renderer.planeRadiusUniform, planeRadius)
  gl.uniform1f(renderer.centerYUniform, centerY)
  gl.uniform1f(renderer.pixelRatioUniform, pixelRatio)
  gl.uniform3f(
    renderer.colorUniform,
    color[0] / 255,
    color[1] / 255,
    color[2] / 255
  )
  gl.uniform1f(
    renderer.globalOpacityUniform,
    props.theme === 'light' ? 0.72 : 0.86
  )
  gl.drawArrays(gl.POINTS, 0, STAR_COUNT)
}

const stopStarAnimation = () => {
  if (starAnimationRafId !== null) {
    window.cancelAnimationFrame(starAnimationRafId)
    starAnimationRafId = null
  }
  starLastFrameTime = null
  starNextFrameTime = null
}

const renderStarAnimation = (frameTime: number) => {
  starAnimationRafId = null
  if (!starRenderer || isStarMotionPaused.value) {
    starLastFrameTime = null
    return
  }

  if (starNextFrameTime !== null && frameTime + 0.5 < starNextFrameTime) {
    starAnimationRafId = window.requestAnimationFrame(renderStarAnimation)
    return
  }

  const elapsed =
    starLastFrameTime === null
      ? starFrameInterval
      : Math.min(frameTime - starLastFrameTime, 100)
  starLastFrameTime = frameTime
  starNextFrameTime = (starNextFrameTime ?? frameTime) + starFrameInterval
  if (starNextFrameTime <= frameTime) {
    starNextFrameTime = frameTime + starFrameInterval
  }
  starRotation -= (elapsed / STAR_ROTATION_DURATION) * Math.PI * 2
  if (starRotation < -Math.PI * 2) starRotation += Math.PI * 2
  drawStarScene()
  starAnimationRafId = window.requestAnimationFrame(renderStarAnimation)
}

const startStarAnimation = () => {
  drawStarScene()
  if (
    starAnimationRafId === null &&
    starRenderer &&
    !isStarMotionPaused.value
  ) {
    starAnimationRafId = window.requestAnimationFrame(renderStarAnimation)
  }
}

const destroyStarRenderer = () => {
  stopStarAnimation()
  if (!starRenderer) return

  starRenderer.gl.deleteBuffer(starRenderer.buffer)
  starRenderer.gl.deleteProgram(starRenderer.program)
  starRenderer = null
}

const setupStarRenderer = () => {
  const canvas = starWebglCanvas.value
  if (!canvas) return

  destroyStarRenderer()
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  })
  if (!gl) return

  const program = createStarProgram(gl)
  const buffer = gl.createBuffer()
  if (!program || !buffer) {
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    return
  }

  const positionAttribute = gl.getAttribLocation(program, 'a_position')
  const sizeAttribute = gl.getAttribLocation(program, 'a_size')
  const opacityAttribute = gl.getAttribLocation(program, 'a_opacity')
  const rotationUniform = gl.getUniformLocation(program, 'u_rotation')
  const resolutionUniform = gl.getUniformLocation(program, 'u_resolution')
  const planeRadiusUniform = gl.getUniformLocation(program, 'u_plane_radius')
  const centerYUniform = gl.getUniformLocation(program, 'u_center_y')
  const pixelRatioUniform = gl.getUniformLocation(program, 'u_pixel_ratio')
  const colorUniform = gl.getUniformLocation(program, 'u_color')
  const globalOpacityUniform = gl.getUniformLocation(
    program,
    'u_global_opacity'
  )
  if (
    positionAttribute < 0 ||
    sizeAttribute < 0 ||
    opacityAttribute < 0 ||
    !rotationUniform ||
    !resolutionUniform ||
    !planeRadiusUniform ||
    !centerYUniform ||
    !pixelRatioUniform ||
    !colorUniform ||
    !globalOpacityUniform
  ) {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    return
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, starVertexData, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(positionAttribute)
  gl.vertexAttribPointer(
    positionAttribute,
    2,
    gl.FLOAT,
    false,
    STAR_VERTEX_STRIDE,
    0
  )
  gl.enableVertexAttribArray(sizeAttribute)
  gl.vertexAttribPointer(
    sizeAttribute,
    1,
    gl.FLOAT,
    false,
    STAR_VERTEX_STRIDE,
    2 * Float32Array.BYTES_PER_ELEMENT
  )
  gl.enableVertexAttribArray(opacityAttribute)
  gl.vertexAttribPointer(
    opacityAttribute,
    1,
    gl.FLOAT,
    false,
    STAR_VERTEX_STRIDE,
    3 * Float32Array.BYTES_PER_ELEMENT
  )

  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  starRenderer = {
    gl,
    program,
    buffer,
    rotationUniform,
    resolutionUniform,
    planeRadiusUniform,
    centerYUniform,
    pixelRatioUniform,
    colorUniform,
    globalOpacityUniform,
  }
  resizeStarRenderer()
  startStarAnimation()
}

const handleStarContextLost = (event: Event) => {
  event.preventDefault()
  stopStarAnimation()
  starRenderer = null
}

const handleStarContextRestored = () => {
  if (props.entryActive) setupStarRenderer()
}

const handleReducedMotionChange = (event: MediaQueryListEvent) => {
  isReducedMotion.value = event.matches
}

const handleVisibilityChange = () => {
  isPageVisible.value = !document.hidden
}

watch(
  () => props.activeSign,
  (signId, previousSignId) => {
    if (signId === previousSignId) return

    isHighlightSettled.value = false
    isRouteTransitioning.value = !isReducedMotion.value

    const target = getCanonicalRotation(signId)
    const delta = ((((target - routeRotation.value) % 360) + 540) % 360) - 180
    routeRotation.value += delta
  }
)

watch(isStarMotionPaused, (isPaused) => {
  if (isPaused) {
    stopStarAnimation()
    drawStarScene()
  } else {
    startStarAnimation()
  }
})

watch(
  () => props.theme,
  () => drawStarScene()
)

watch(
  () => props.entryActive,
  (isActive) => {
    if (!isActive) {
      destroyStarRenderer()
      return
    }

    if (!starRenderer) setupStarRenderer()
  }
)

const stageStyle = computed(() => ({
  '--hero-scale': heroScale.value,
  '--route-rotation': `${routeRotation.value}deg`,
}))

const updateHeroScale = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isMobile = viewportWidth <= 768
  const heightRatio = isMobile ? 0.67 : 0.72
  const horizontalGap = isMobile ? 44 : 72
  const heroSize = Math.min(
    viewportHeight * heightRatio,
    viewportWidth - horizontalGap
  )

  heroScale.value = Math.max(0.1, heroSize / viewportWidth)
}

const scheduleHeroScaleUpdate = () => {
  if (resizeRafId !== null) return
  resizeRafId = window.requestAnimationFrame(() => {
    resizeRafId = null
    updateHeroScale()
    resizeStarRenderer()
    drawStarScene()
  })
}

const resumeMotionAfterScroll = () => {
  const remainingDelay = scrollResumeDeadline - Date.now()
  if (remainingDelay > 0) {
    scrollResumeTimer = setTimeout(resumeMotionAfterScroll, remainingDelay)
    return
  }

  scrollResumeTimer = null
  isScrollPaused.value = false
}

const handlePageScroll = () => {
  if (!isScrollPaused.value) isScrollPaused.value = true

  scrollResumeDeadline = Date.now() + SCROLL_IDLE_DELAY
  if (!scrollResumeTimer) {
    scrollResumeTimer = setTimeout(resumeMotionAfterScroll, SCROLL_IDLE_DELAY)
  }
}

const handlePageScrollEnd = () => {
  if (scrollResumeTimer) clearTimeout(scrollResumeTimer)
  scrollResumeTimer = null
  isScrollPaused.value = false
}

const getChartTransitionKey = (event: TransitionEvent) => {
  if (event.propertyName !== 'transform') return null
  const target = event.target
  if (!(target instanceof HTMLElement)) return null
  if (target.classList.contains('zodiac-stage')) return 'stage'
  if (target.classList.contains('zodiac-html-wheel')) return 'wheel'
  return null
}

const handleChartTransitionStart = (event: TransitionEvent) => {
  const key = getChartTransitionKey(event)
  if (!key) return
  activeChartTransitions.add(key)
  isChartTransitioning.value = true
  if (key === 'wheel' && !isReducedMotion.value) {
    isRouteTransitioning.value = true
  }
}

const handleChartTransitionEnd = (event: TransitionEvent) => {
  const key = getChartTransitionKey(event)
  if (!key) return
  activeChartTransitions.delete(key)
  isChartTransitioning.value = activeChartTransitions.size > 0
  if (key === 'wheel') isRouteTransitioning.value = false
}

const handleTriangleAnimationEnd = () => {
  isEntryComplete.value = true
  isHighlightSettled.value = true
}

const containerClass = computed(() => [
  'star-container',
  props.theme,
  {
    'menu-hidden': props.isTextMenu,
    'is-deep-black': props.deepBlack,
    'is-content-layout': props.layout === 'content',
    'is-motion-paused': isStarMotionPaused.value,
    'is-chart-transitioning': isChartTransitioning.value,
    'is-route-transitioning': isRouteTransitioning.value,
    'is-entry-ready': props.entryActive,
    'is-entry-complete': isEntryComplete.value,
    'is-highlight-settled': isHighlightSettled.value,
  },
])

onMounted(() => {
  updateHeroScale()
  isPageVisible.value = !document.hidden
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  starWebglCanvas.value?.addEventListener(
    'webglcontextlost',
    handleStarContextLost
  )
  starWebglCanvas.value?.addEventListener(
    'webglcontextrestored',
    handleStarContextRestored
  )
  if (props.entryActive) setupStarRenderer()
  usesNativeScrollEnd = supportsPageScrollEnd()
  removeScrollListener = addPageScrollListener(handlePageScroll)
  if (usesNativeScrollEnd) {
    removeScrollEndListener = addPageScrollEndListener(handlePageScrollEnd)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('resize', scheduleHeroScaleUpdate, { passive: true })
})

onUnmounted(() => {
  activeChartTransitions.clear()
  starWebglCanvas.value?.removeEventListener(
    'webglcontextlost',
    handleStarContextLost
  )
  starWebglCanvas.value?.removeEventListener(
    'webglcontextrestored',
    handleStarContextRestored
  )
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  destroyStarRenderer()
  removeScrollListener?.()
  removeScrollEndListener?.()
  if (scrollResumeTimer) clearTimeout(scrollResumeTimer)
  window.removeEventListener('resize', scheduleHeroScaleUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
})
</script>

<template>
  <div :class="containerClass" aria-hidden="true">
    <div class="star-viewport">
      <canvas
        ref="starWebglCanvas"
        class="star-field"
        data-renderer="webgl"
        :data-star-count="STAR_COUNT"
        :data-motion-state="starMotionState"
        :data-target-fps="starTargetFps"
      />
    </div>

    <div class="zodiac-triangle-stage">
      <span class="zodiac-triangle-geometry">
        <span
          class="zodiac-active-triangle"
          @animationend="handleTriangleAnimationEnd"
        />
      </span>
    </div>

    <div
      class="zodiac-stage"
      :style="stageStyle"
      @transitionrun="handleChartTransitionStart"
      @transitionend="handleChartTransitionEnd"
      @transitioncancel="handleChartTransitionEnd"
    >
      <img
        class="zodiac-static-art"
        :src="STATIC_CHART_SRC"
        alt=""
        draggable="false"
        decoding="async"
        fetchpriority="high"
      />

      <div class="zodiac-html-wheel">
        <span
          v-for="(style, index) in sectorStyles"
          :key="`sector-${index}`"
          class="zodiac-sector-line"
          :style="style"
        />

        <div
          v-for="(sign, index) in zodiacSigns"
          :key="`degree-${sign.id}`"
          class="zodiac-degree-position"
          :style="sign.degreePositionStyle"
        >
          <span class="zodiac-degree" :style="sign.degreeFaceStyle">
            {{ String(index * 30).padStart(3, '0') }}°
          </span>
        </div>

        <div
          v-for="(sign, index) in zodiacSigns"
          :key="sign.id"
          class="zodiac-sign-position"
          :style="sign.positionStyle"
        >
          <div
            class="zodiac-sign-face"
            :class="{ 'is-active': sign.id === props.activeSign }"
            :style="sign.faceStyle"
          >
            <span class="zodiac-glyph">{{ sign.glyph }}</span>
            <span class="zodiac-name">{{ sign.name }}</span>
            <span class="zodiac-code">
              {{ sign.code }} · {{ String(index + 1).padStart(2, '0') }}
            </span>
          </div>
        </div>
      </div>

      <span class="zodiac-diamond-frame" />
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
