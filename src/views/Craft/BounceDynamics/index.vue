<template>
  <ToolPageLayout
    back-path="/craft?type=work"
    page-class="bounce-tool"
    tool-id="bounce-dynamics"
    title="弹力球"
    description="调节弹性与重量，生成一颗弹力球自然落体、撞击地面并向右弹跳的实时物理动画。"
    share-description="调节弹性与重量，生成弹力球自然落体与弹跳动画。"
    motto="BOUNCING_BALL"
    :recommended-tools="recommendedTools"
  >
    <div class="pt-grid">
      <div class="pt-panel bounce-stage">
        <div class="stage-readout">
          <span>PHYSICS</span>
          <strong>{{ isRunning ? 'LIVE' : 'PAUSED' }}</strong>
          <em>E {{ restitution.toFixed(2) }}</em>
        </div>

        <div ref="trackRef" class="motion-track">
          <canvas ref="canvasRef" class="physics-canvas" />
          <div class="track-overlay" />
        </div>

        <div class="motion-marks">
          <span>DROP</span>
          <span>IMPACT</span>
          <span>REBOUND</span>
          <span>ROLL OUT</span>
        </div>

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel bounce-controls">
        <div class="pt-panel-title">
          <span>[ 录屏控制 ]</span>
          <span>{{ bounceCount }} HIT</span>
        </div>

        <div class="transport-row">
          <button class="transport-btn" @click="toggleSimulation">
            <span>{{ isRunning ? '暂停' : '播放' }}</span>
          </button>
          <button class="pt-btn" @click="restartSimulation">
            <span>重置</span>
          </button>
        </div>

        <label class="control-item control-item--wide">
          <span>弹性：SOFT / HARD</span>
          <input v-model.number="elasticity" type="range" min="0" max="100" />
          <strong>{{ elasticity }}% · {{ elasticityLabel }}</strong>
        </label>

        <label class="control-item control-item--wide">
          <span>小球重量</span>
          <input
            v-model.number="weight"
            type="range"
            min="0.5"
            max="5"
            step="0.1"
          />
          <strong>{{ weight.toFixed(1) }} KG</strong>
        </label>

        <div class="control-section-title">弹性预设</div>
        <div class="preset-grid">
          <button
            v-for="preset in elasticityPresets"
            :key="preset.id"
            class="preset-btn"
            :class="{ active: elasticity === preset.elasticity }"
            @click="applyPreset(preset.elasticity, preset.weight)"
          >
            <span>{{ preset.label }}</span>
          </button>
        </div>

        <div class="metric-grid">
          <div class="metric-card">
            <span>RESTITUTION</span>
            <strong>{{ restitution.toFixed(2) }}</strong>
          </div>
          <div class="metric-card">
            <span>GRAVITY</span>
            <strong>{{ gravity.toFixed(0) }}</strong>
          </div>
          <div class="metric-card">
            <span>IMPACT</span>
            <strong>{{ impactSpeed.toFixed(0) }}</strong>
          </div>
          <div class="metric-card">
            <span>SQUASH</span>
            <strong>{{ compressionPercent }}%</strong>
          </div>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
        <div class="crystal-container">
          <ToolCrystalLogo tool-id="bounce-dynamics" />
        </div>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ToolCrystalLogo from '@/components/ToolCrystalLogo/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

interface BallState {
  contactTime: number
  r: number
  settleTime: number
  squash: number
  vx: number
  vy: number
  x: number
  y: number
}

interface TrajectoryPoint {
  x: number
  y: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const isRunning = ref(true)
const elasticity = ref(68)
const weight = ref(1.7)
const bounceCount = ref(0)
const impactSpeed = ref(0)
const compressionPercent = ref(0)

const recommendedTools = [
  { label: '配色提取器', path: '/colorPalette' },
  { label: '可视化贝塞尔曲线调整', path: '/easeStudio' },
  { label: '弹力球', path: '/bounceDynamics' },
]

const elasticityPresets = [
  { id: 'soft', label: 'SOFT', elasticity: 26, weight: 3.2 },
  { id: 'balanced', label: 'BALANCED', elasticity: 68, weight: 1.7 },
  { id: 'hard', label: 'HARD', elasticity: 90, weight: 0.9 },
]

const restitution = computed(() => 0.42 + (elasticity.value / 100) * 0.46)
const gravity = computed(() => 1220 + weight.value * 85)
const airDrag = computed(() => 0.996 - Math.min(weight.value, 5) * 0.00045)
const floorDamping = computed(() => 0.989 - Math.min(weight.value, 5) * 0.006)
const softness = computed(() => (100 - elasticity.value) / 100)
const elasticityLabel = computed(() => {
  if (elasticity.value < 42) return 'SOFT'
  if (elasticity.value < 76) return 'BALANCED'
  return 'HARD'
})

let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let lastTime = 0
let width = 0
let height = 0
let floorY = 0
let canvasDpr = 1
let shouldResumeAfterVisible = false
let resizeObserver: ResizeObserver | null = null
let resizeRafId: number | null = null
let initResizeTimer: number | null = null
const trajectoryPoints: TrajectoryPoint[] = []
const maxTrajectoryPoints = 220
const trajectoryMinDistance = 7

const ball: BallState = {
  contactTime: 0,
  r: 34,
  settleTime: 0,
  squash: 0,
  vx: 0,
  vy: 0,
  x: 0,
  y: 0,
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const getRadius = () => {
  const desiredRadius = 31 + weight.value * 2.3
  if (!width || !height) return desiredRadius

  const responsiveLimit = Math.min(width * 0.09, height * 0.11)
  return Math.min(desiredRadius, Math.max(18, responsiveLimit))
}

const clearTrajectory = () => {
  trajectoryPoints.length = 0
}

const recordTrajectoryPoint = () => {
  const lastPoint = trajectoryPoints[trajectoryPoints.length - 1]
  const dx = lastPoint ? ball.x - lastPoint.x : Infinity
  const dy = lastPoint ? ball.y - lastPoint.y : Infinity

  if (!lastPoint || Math.hypot(dx, dy) >= trajectoryMinDistance) {
    trajectoryPoints.push({ x: ball.x, y: ball.y })
  }

  if (trajectoryPoints.length > maxTrajectoryPoints) {
    trajectoryPoints.splice(0, trajectoryPoints.length - maxTrajectoryPoints)
  }
}

const resetBall = () => {
  ball.r = getRadius()
  ball.x = Math.max(ball.r + 18, Math.min(58, width * 0.16))
  ball.y = Math.max(ball.r + 14, Math.min(58, height * 0.18))
  ball.vx = clamp(
    width * 0.38 + elasticity.value * 0.65 - weight.value * 12,
    145,
    330
  )
  ball.vy = 0
  ball.squash = 0
  ball.contactTime = 0
  ball.settleTime = 0
  bounceCount.value = 0
  impactSpeed.value = 0
  compressionPercent.value = 0
  clearTrajectory()
  recordTrajectoryPoint()
  drawFrame()
}

const resizeCanvas = () => {
  const canvas = canvasRef.value
  const track = trackRef.value
  if (!canvas || !track) return

  const rect = track.getBoundingClientRect()
  const nextWidth = Math.max(1, rect.width)
  const nextHeight = Math.max(1, rect.height)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const hasSizeChanged =
    Math.abs(nextWidth - width) > 1 ||
    Math.abs(nextHeight - height) > 1 ||
    dpr !== canvasDpr ||
    !ctx

  if (!hasSizeChanged) {
    drawFrame()
    return
  }

  width = nextWidth
  height = nextHeight
  canvasDpr = dpr
  floorY = height - clamp(height * 0.19, 48, 82)

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  resetBall()
}

const scheduleResizeCanvas = () => {
  if (resizeRafId !== null) cancelAnimationFrame(resizeRafId)
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    resizeCanvas()
  })
}

const updatePhysics = (dt: number) => {
  const radius = getRadius()
  ball.r += (radius - ball.r) * Math.min(1, dt * 8)

  ball.vy += gravity.value * dt
  ball.vx *= Math.pow(airDrag.value, dt * 60)
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  const bottom = ball.y + ball.r
  if (bottom >= floorY) {
    const impact = Math.abs(ball.vy)
    ball.y = floorY - ball.r

    if (impact > 95) {
      bounceCount.value += 1
      impactSpeed.value = impact
      const compression = clamp(
        (impact / 1450) * (0.18 + softness.value * 0.38 + weight.value * 0.055),
        0.1,
        0.58
      )
      ball.squash = Math.max(ball.squash, compression)
      ball.contactTime = 0.18
      compressionPercent.value = Math.round(compression * 100)
    }

    ball.vy = -impact * restitution.value
    ball.vx *= floorDamping.value

    if (Math.abs(ball.vy) < 96) {
      ball.vy = 0
      ball.contactTime = 0
      ball.squash = 0
      compressionPercent.value = 0
      ball.settleTime += dt
    }
  } else {
    ball.settleTime = 0
  }

  ball.contactTime = Math.max(0, ball.contactTime - dt)
  ball.squash += (0 - ball.squash) * Math.min(1, dt * 6)
  recordTrajectoryPoint()

  if (ball.x > width + ball.r * 2 || ball.settleTime > 0.9) {
    resetBall()
  }
}

const drawBackground = (context: CanvasRenderingContext2D) => {
  const driftX = (performance.now() * 0.006) % 40
  const driftY = (performance.now() * 0.004) % 40

  context.clearRect(0, 0, width, height)
  context.save()
  context.globalAlpha = 0.9
  context.fillStyle = '#090406'
  context.fillRect(0, 0, width, height)

  context.strokeStyle = 'rgba(255,255,255,0.045)'
  context.lineWidth = 1
  for (let x = -40 + driftX; x <= width + 40; x += 40) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = -40 + driftY; y <= height + 40; y += 40) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  const glow = context.createLinearGradient(0, 0, 0, height)
  glow.addColorStop(0, 'rgba(232,40,74,0.1)')
  glow.addColorStop(0.45, 'rgba(232,40,74,0.015)')
  glow.addColorStop(1, 'rgba(232,40,74,0.06)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)
  context.restore()
}

const drawFloor = (context: CanvasRenderingContext2D) => {
  context.save()
  context.strokeStyle = '#e8284a'
  context.shadowColor = 'rgba(232,40,74,0.55)'
  context.shadowBlur = 18
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(32, floorY + 1)
  context.lineTo(width - 32, floorY + 1)
  context.stroke()
  context.restore()
}

const drawShadow = (context: CanvasRenderingContext2D) => {
  const distance = clamp(floorY - (ball.y + ball.r), 0, 280)
  const near = 1 - distance / 280
  const shadowW = ball.r * (1.15 + near * 1.1)
  const shadowH = ball.r * (0.12 + near * 0.12)

  context.save()
  context.globalAlpha = 0.18 + near * 0.34
  context.filter = 'blur(8px)'
  context.fillStyle = 'rgba(0,0,0,0.8)'
  context.beginPath()
  context.ellipse(ball.x, floorY + 15, shadowW, shadowH, 0, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

const drawTrajectory = (context: CanvasRenderingContext2D) => {
  if (trajectoryPoints.length < 2) return

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (let i = 1; i < trajectoryPoints.length; i += 1) {
    const prev = trajectoryPoints[i - 1]
    const current = trajectoryPoints[i]
    const progress = i / (trajectoryPoints.length - 1)

    context.strokeStyle = `rgba(232, 40, 74, ${0.08 + progress * 0.34})`
    context.lineWidth = 1 + progress * 2.2
    context.beginPath()
    context.moveTo(prev.x, prev.y)
    context.lineTo(current.x, current.y)
    context.stroke()
  }

  context.fillStyle = 'rgba(232, 40, 74, 0.7)'
  for (let i = 0; i < trajectoryPoints.length; i += 18) {
    const point = trajectoryPoints[i]
    context.beginPath()
    context.arc(point.x, point.y, 2, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

const drawBall = (context: CanvasRenderingContext2D) => {
  const contactRatio = clamp(ball.contactTime / 0.18, 0, 1)
  const contactSquash =
    ball.contactTime > 0 && ball.squash > 0.01
      ? ball.squash * (0.7 + contactRatio * 0.3)
      : 0
  const isRolling = ball.y + ball.r >= floorY - 1 && Math.abs(ball.vy) < 120
  const fallStretch =
    contactSquash > 0 || isRolling
      ? 0
      : clamp(Math.abs(ball.vy) / 1700, 0, 0.24)
  const scaleX = isRolling
    ? 1
    : clamp(1 + contactSquash * 1.18 - fallStretch * 0.18, 0.82, 1.72)
  const scaleY = isRolling
    ? 1
    : clamp(1 - contactSquash * 0.92 + fallStretch * 0.68, 0.46, 1.28)
  const yOffset = contactSquash > 0 ? ball.r * (1 - scaleY) : 0

  context.save()
  context.translate(ball.x, ball.y + yOffset)
  context.scale(scaleX, scaleY)

  const gradient = context.createRadialGradient(
    -ball.r * 0.32,
    -ball.r * 0.38,
    ball.r * 0.08,
    0,
    0,
    ball.r
  )
  gradient.addColorStop(0, '#ff6f85')
  gradient.addColorStop(0.45, '#e8284a')
  gradient.addColorStop(0.78, '#9f142a')
  gradient.addColorStop(1, '#4c0612')

  context.fillStyle = gradient
  context.beginPath()
  context.arc(0, 0, ball.r, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

const drawFrame = () => {
  if (!ctx || !width || !height) return
  drawBackground(ctx)
  drawTrajectory(ctx)
  drawFloor(ctx)
  drawShadow(ctx)
  drawBall(ctx)
}

const frame = (now: number) => {
  if (!isRunning.value) return
  const dt = Math.min((now - lastTime) / 1000 || 0, 1 / 30)
  lastTime = now
  updatePhysics(dt)
  drawFrame()
  rafId = requestAnimationFrame(frame)
}

const startSimulation = () => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  isRunning.value = true
  lastTime = performance.now()
  rafId = requestAnimationFrame(frame)
}

const pauseSimulation = () => {
  isRunning.value = false
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  drawFrame()
}

const toggleSimulation = () => {
  if (isRunning.value) {
    pauseSimulation()
  } else {
    startSimulation()
  }
}

const restartSimulation = () => {
  resetBall()
  if (isRunning.value) startSimulation()
}

const applyPreset = (nextElasticity: number, nextWeight: number) => {
  elasticity.value = nextElasticity
  weight.value = nextWeight
  restartSimulation()
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    shouldResumeAfterVisible = isRunning.value
    pauseSimulation()
    return
  }

  if (shouldResumeAfterVisible) {
    shouldResumeAfterVisible = false
    startSimulation()
  }
}

watch([elasticity, weight], () => {
  restartSimulation()
})

onMounted(async () => {
  await nextTick()
  scheduleResizeCanvas()
  requestAnimationFrame(scheduleResizeCanvas)
  initResizeTimer = window.setTimeout(scheduleResizeCanvas, 160)

  if (trackRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleResizeCanvas)
    resizeObserver.observe(trackRef.value)
  }

  window.addEventListener('resize', scheduleResizeCanvas)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  startSimulation()
})

onBeforeUnmount(() => {
  pauseSimulation()
  if (resizeRafId !== null) cancelAnimationFrame(resizeRafId)
  if (initResizeTimer !== null) clearTimeout(initResizeTimer)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleResizeCanvas)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);

.font-squish(@origin: center) {
  font-family: 'STSong', serif;
  display: inline-block;
  transform: scaleX(0.9);
  transform-origin: @origin;
}

@keyframes tacticalIn {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.bounce-tool {
  width: 100%;
  color: @text;
  font-family: 'cn-custom', system-ui, sans-serif;
}

.bounce-stage {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
}

.right-panel {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s both;
}

.pt-grid {
  display: grid;
  grid-template-columns: 5fr 2fr;
  gap: 30px 0;
  align-items: stretch;
}

.pt-panel {
  position: relative;
  background: linear-gradient(150deg, #25252587 0%, rgba(68, 5, 18, 0.35) 100%);
  backdrop-filter: blur(4px);
  padding: 30px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel {
  position: relative;
  background: @surface;
  border: 1px solid @border;
  padding: 30px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bounce-stage {
  min-height: 560px;
}

.stage-readout {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-family: 'cn-custom', monospace;

  span,
  em {
    .font-squish(left);
    color: @muted;
    font-size: 11px;
    font-style: normal;
  }

  strong {
    color: @red;
    font-family: 'Anton', sans-serif;
    font-size: 34px;
    letter-spacing: 0.12em;
  }
}

.motion-track {
  position: relative;
  height: 430px;
  margin-top: 34px;
  border: 1px solid @border;
  background: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    radial-gradient(circle at 68% 24%, rgba(232, 40, 74, 0.22), transparent 30%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
  overflow: hidden;
}

.physics-canvas,
.track-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.physics-canvas {
  z-index: 1;
}

.track-overlay {
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.01) 1px,
    transparent 1px
  );
  background-size: 100% 4px;
  animation: trackScanDrift 9s linear infinite;
  box-shadow: inset 0 0 0 1px rgba(232, 40, 74, 0.08),
    inset 0 -80px 90px rgba(232, 40, 74, 0.07);
}

@keyframes trackScanDrift {
  from {
    background-position: 0 0;
  }

  to {
    background-position: 0 24px;
  }
}

.motion-marks {
  display: flex;
  justify-content: space-between;
  color: @muted;
  font-size: 10px;
  letter-spacing: 0.16em;
  margin-top: 16px;

  span {
    .font-squish(left);
  }
}

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: @muted;
  font-size: 12px;
  margin-bottom: 24px;

  span {
    .font-squish(left);
  }
}

.transport-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.transport-btn,
.pt-btn,
.preset-btn {
  border: 1px solid @border;
  background: transparent;
  color: @text;
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    .font-squish(center);
  }

  &:hover {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }
}

.transport-btn {
  min-height: 44px;
  color: @red;
  background: @red-dim;

  span {
    font-size: 14px;
  }
}

.pt-btn {
  min-height: 44px;

  span {
    font-size: 11px;
  }
}

.control-item {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.74);
  padding: 12px;

  span,
  strong {
    .font-squish(left);
    font-size: 11px;
  }

  span {
    color: @muted;
  }

  strong {
    color: @text;
  }
}

input[type='range'] {
  width: 100%;
  accent-color: @red;
}

.control-section-title {
  .font-squish(left);
  color: @muted;
  font-size: 10px;
  letter-spacing: 0.16em;
  margin: 18px 0 10px;
  margin-top: 0;
}

.preset-grid,
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preset-btn {
  min-height: 36px;
  color: @muted;
  padding: 6px 12px;
  text-align: left;

  span {
    .font-squish(left);
    font-size: 14px;
  }

  &.active,
  &:hover {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }
}

.metric-grid {
  grid-template-columns: repeat(2, 1fr);
  margin-top: 20px;
}

.metric-card {
  border: 1px solid @border;
  background: #090406;
  padding: 12px;

  span {
    display: block;
    .font-squish(left);
    color: @muted;
    font-size: 9px;
    letter-spacing: 0.14em;
    margin-bottom: 8px;
  }

  strong {
    color: @text;
    font-family: 'Anton', sans-serif;
    font-size: 26px;
    letter-spacing: 0.04em;
  }
}

.corner,
.corner-img {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
  z-index: 5;
}

.corner--tl {
  top: -1px;
  left: -1px;
  border-top: 2px solid @red;
  border-left: 2px solid @red;
}

.corner--tr {
  top: -1px;
  right: -1px;
  border-top: 2px solid @red;
  border-right: 2px solid @red;
}

.corner--bl {
  bottom: -1px;
  left: -1px;
  border-bottom: 2px solid @red;
  border-left: 2px solid @red;
}

.corner--br {
  right: -1px;
  bottom: -1px;
  border-right: 2px solid @red;
  border-bottom: 2px solid @red;
}

.corner-img {
  &.corner--tl {
    top: 10px;
    left: 10px;
    border-color: #50505076;
  }
  &.corner--tr {
    top: 10px;
    right: 10px;
    border-color: #50505076;
  }
  &.corner--bl {
    bottom: 10px;
    left: 10px;
    border-color: #50505076;
  }
  &.corner--br {
    bottom: 10px;
    right: 10px;
    border-color: #50505076;
  }
}

.crystal-container {
  position: absolute;
  bottom: 16px;
  right: 30px;
  z-index: 45;
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }

  .bounce-stage {
    min-height: 520px;
  }

  .motion-track {
    height: 360px;
  }
}

@media (max-width: 600px) {
  .motion-track {
    height: min(320px, 78vw);
    min-height: 250px;
    margin-top: 24px;
  }

  .bounce-stage {
    min-height: 430px;
    padding: 20px;
  }
}
</style>
