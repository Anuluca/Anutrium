<template>
  <div class="ease-tool main-container">
    <div class="pt-header">
      <div class="pt-header__tag" @click="handleTagClick">CRAFT</div>
      <h1 class="pt-header__title">缓动工作室</h1>
      <ToolHeaderActions
        tool-id="ease-studio"
        title="缓动工作室"
        description="拖动控制点或调整数值，实时修改并复制 CSS 缓动曲线。"
      />
      <p class="pt-header__sub">
        拖动左侧两个红点，或直接调整下方数值，实时修改缓动曲线。
        右侧会同步预览动画，确认效果后直接复制 CSS。
        <span class="pt-header__motto">// HUAHUA_THE_CAT</span>
      </p>
    </div>

    <div class="pt-grid">
      <div class="pt-panel curve-panel">
        <div class="curve-stage">
          <div class="curve-grid-label curve-grid-label--start">0</div>
          <div class="curve-grid-label curve-grid-label--end">1</div>

          <svg
            ref="svgRef"
            class="curve-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            @pointermove="handlePointerMove"
            @pointerup="stopDrag"
            @pointerleave="stopDrag"
          >
            <defs>
              <linearGradient id="curveGlow" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0%" stop-color="#e8284a" />
                <stop offset="100%" stop-color="#fff7ea" />
              </linearGradient>
            </defs>
            <path class="curve-grid-line" d="M 0 100 L 100 0" />
            <line
              class="curve-handle-line"
              :x1="0"
              :y1="100"
              :x2="pointToSvg(controlA).x"
              :y2="pointToSvg(controlA).y"
            />
            <line
              class="curve-handle-line"
              :x1="100"
              :y1="0"
              :x2="pointToSvg(controlB).x"
              :y2="pointToSvg(controlB).y"
            />
            <path class="curve-path-shadow" :d="curvePath" />
            <path class="curve-path" :d="curvePath" />
            <circle class="curve-anchor" cx="0" cy="100" r="1.6" />
            <circle class="curve-anchor" cx="100" cy="0" r="1.6" />
            <circle
              class="curve-point curve-point--a no-cursor"
              :cx="pointToSvg(controlA).x"
              :cy="pointToSvg(controlA).y"
              r="3"
              @pointerdown.prevent="startDrag('a')"
            />
            <circle
              class="curve-point curve-point--b no-cursor"
              :cx="pointToSvg(controlB).x"
              :cy="pointToSvg(controlB).y"
              r="3"
              @pointerdown.prevent="startDrag('b')"
            />
          </svg>
          <div class="pt-scanlines" />
        </div>

        <div class="control-grid">
          <label
            v-for="control in controls"
            :key="control.key"
            class="control-item"
          >
            <span>{{ control.label }}</span>
            <input
              v-model.number="control.model.value"
              type="range"
              min="0"
              max="1"
              step="0.01"
            />
            <strong>{{ control.model.value.toFixed(2) }}</strong>
          </label>

          <div class="preset-grid">
            <button
              v-for="preset in presets"
              :key="preset.name"
              class="preset-btn"
              :class="{ active: activePreset === preset.name }"
              @click="applyPreset(preset)"
            >
              <span>{{ preset.name }}</span>
            </button>
          </div>

          <div class="duration-control">
            <span>DURATION</span>
            <input
              v-model.number="duration"
              type="range"
              min="300"
              max="3000"
            />
            <strong>{{ duration }}ms</strong>
          </div>
        </div>

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
        <div class="crystal-container">
          <CrystalLogo />
        </div>
      </div>

      <div class="right-panel pt-result-area">
        <div class="pt-panel-title">
          <span>[ 输出结果 ]</span>
          <span>{{ bezierText }}</span>
        </div>

        <div class="preview-area">
          <div class="preview-label">
            <span>ANIMATION_PREVIEW</span>
            <button class="pt-btn pt-btn--mini" @click="replayPreview">
              <span>重播</span>
            </button>
          </div>
          <div class="preview-track">
            <div :key="previewKey" class="preview-orb" :style="previewStyle" />
            <div class="preview-mark preview-mark--start" />
            <div class="preview-mark preview-mark--end" />
          </div>
        </div>

        <div class="pt-code-wrap">
          <div class="pt-code-header">
            <span>@keyframes { CSS_ANIMATION }</span>
            <button class="pt-btn" @click="copyCss">
              <span>{{ copied ? '已复制 !' : '点击复制' }}</span>
            </button>
          </div>
          <pre
            class="pt-code-block"
          ><code class="pt-code-inner">{{ cssCode }}</code></pre>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
      </div>
    </div>

    <div class="footer-wrap">
      <PageFooter :third-party="true" :recommended-tools="recommendedTools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import CrystalLogo from '@/components/CrystalLogo/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import ToolHeaderActions from '@/components/ToolHeaderActions/index.vue'

interface CurvePoint {
  x: number
  y: number
}

interface EasePreset {
  name: string
  points: [number, number, number, number]
}

const router = useRouter()
const svgRef = ref<SVGSVGElement | null>(null)
const copied = ref(false)

const recommendedTools = [
  { label: 'CSS调色盘', path: '/colorPalette' },
  { label: '缓动工作室', path: '/easeStudio' },
]
const previewKey = ref(0)
const duration = ref(1200)
const dragging = ref<'a' | 'b' | null>(null)

const x1 = ref(0.25)
const y1 = ref(0.1)
const x2 = ref(0.25)
const y2 = ref(1)

const presets: EasePreset[] = [
  { name: 'ease', points: [0.25, 0.1, 0.25, 1] },
  { name: 'ease-in', points: [0.42, 0, 1, 1] },
  { name: 'ease-out', points: [0, 0, 0.58, 1] },
  { name: 'ease-in-out', points: [0.42, 0, 0.58, 1] },
  { name: 'sharp', points: [0.7, 0, 0.84, 0] },
  { name: 'snap', points: [0.16, 1, 0.3, 1] },
]

const controls = [
  { key: 'x1', label: 'P1.X', model: x1 },
  { key: 'y1', label: 'P1.Y', model: y1 },
  { key: 'x2', label: 'P2.X', model: x2 },
  { key: 'y2', label: 'P2.Y', model: y2 },
]

const controlA = computed(() => ({ x: x1.value, y: y1.value }))
const controlB = computed(() => ({ x: x2.value, y: y2.value }))

const bezierText = computed(
  () =>
    `cubic-bezier(${formatValue(x1.value)}, ${formatValue(
      y1.value
    )}, ${formatValue(x2.value)}, ${formatValue(y2.value)})`
)

const curvePath = computed(() => {
  const a = pointToSvg(controlA.value)
  const b = pointToSvg(controlB.value)
  return `M 0 100 C ${a.x} ${a.y}, ${b.x} ${b.y}, 100 0`
})

const activePreset = computed(() => {
  const hit = presets.find((preset) => {
    const [px1, py1, px2, py2] = preset.points
    return (
      px1 === x1.value &&
      py1 === y1.value &&
      px2 === x2.value &&
      py2 === y2.value
    )
  })
  return hit?.name || ''
})

const previewStyle = computed(() => ({
  animationDuration: `${duration.value}ms`,
  animationTimingFunction: bezierText.value,
}))

const cssCode = computed(
  () => `.ease-target {
  animation: ease-studio ${duration.value}ms ${bezierText.value} both;
}

@keyframes ease-studio {
  from {
    transform: translateX(0) scale(0.86);
    opacity: 0.45;
  }

  to {
    transform: translateX(320px) scale(1);
    opacity: 1;
  }
}`
)

const pointToSvg = (point: CurvePoint) => ({
  x: point.x * 100,
  y: 100 - point.y * 100,
})

const formatValue = (value: number) => Number(value.toFixed(2)).toString()

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const applyPreset = (preset: EasePreset) => {
  const [nextX1, nextY1, nextX2, nextY2] = preset.points
  x1.value = nextX1
  y1.value = nextY1
  x2.value = nextX2
  y2.value = nextY2
  replayPreview()
}

const startDrag = (point: 'a' | 'b') => {
  dragging.value = point
}

const stopDrag = () => {
  dragging.value = null
}

const handlePointerMove = (event: PointerEvent) => {
  if (!dragging.value || !svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  const nextX = clamp((event.clientX - rect.left) / rect.width)
  const nextY = clamp(1 - (event.clientY - rect.top) / rect.height)

  if (dragging.value === 'a') {
    x1.value = Number(nextX.toFixed(2))
    y1.value = Number(nextY.toFixed(2))
  } else {
    x2.value = Number(nextX.toFixed(2))
    y2.value = Number(nextY.toFixed(2))
  }
}

const replayPreview = () => {
  previewKey.value += 1
}

const copyCss = async () => {
  try {
    await navigator.clipboard.writeText(cssCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Copy failed', err)
  }
}

const handleTagClick = () => {
  router.push('/craft')
}
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@bg: #0d0608;
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);
@mono: 'alibaba-puhuiti', monospace;

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

.ease-tool {
  color: @text;
  font-family: 'cn-custom', system-ui, sans-serif;
}

.pt-header {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.curve-panel {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
}
.pt-result-area {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s both;
}
.footer-wrap {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s both;
}

.pt-header {
  margin-bottom: 20px;
  border-bottom: 1px solid @border;
  padding-bottom: 20px;

  &__tag {
    .font-squish(left);
    font-size: 11px;
    color: #3276fe;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;

    &::before {
      content: '// ';
    }

    &:hover {
      color: @red;
      margin-left: -4px;
      animation: glitch-text 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;

      &::before {
        content: '<< ';
        color: @red;
      }
    }
  }

  &__title {
    font-size: 42px;
    font-family: 'cn-custom';
    letter-spacing: 0.05em;
    margin: 0 0 12px;
  }

  &__sub {
    font-size: 13px;
    color: @muted;
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__motto {
    font-family: @mono;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.15);
  }
}

@keyframes glitch-text {
  0% {
    opacity: 0;
    transform: scaleX(0.9) skew(-10deg);
    text-shadow: 2px 0 0 rgba(255, 0, 0, 0.5), -2px 0 0 rgba(0, 0, 255, 0.5);
  }
  20% {
    opacity: 1;
    transform: scaleX(0.9) skew(10deg) translateX(2px);
  }
  40% {
    transform: scaleX(0.9) skew(-5deg) translateX(-1px);
    text-shadow: -1px 0 0 rgba(255, 0, 0, 0.5);
  }
  60% {
    transform: scaleX(0.9) skew(0deg);
    text-shadow: none;
  }
  100% {
    opacity: 1;
    transform: scaleX(0.9);
  }
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
}

.right-panel {
  position: relative;
  background: @surface;
  border: 1px solid @border;
  padding: 30px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.corner,
.corner-img {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
  z-index: 5;

  &--tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid @red;
    border-left: 2px solid @red;
  }
  &--tr {
    top: -1px;
    right: -1px;
    border-top: 2px solid @red;
    border-right: 2px solid @red;
  }
  &--bl {
    bottom: -1px;
    left: -1px;
    border-bottom: 2px solid @red;
    border-left: 2px solid @red;
  }
  &--br {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid @red;
    border-right: 2px solid @red;
  }

  &.corner-img {
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
}

.curve-panel {
  position: relative;
  overflow: hidden;
  flex-direction: row;
  gap: 24px;
  align-items: flex-start;
}

.es-hero-mark {
  position: absolute;
  right: 24px;
  bottom: 98px;
  font-family: 'Anton', sans-serif;
  font-size: clamp(90px, 14vw, 210px);
  line-height: 0.85;
  color: rgba(232, 40, 74, 0.08);
  pointer-events: none;
}

.curve-stage {
  position: relative;
  flex: 0 0 clamp(550px, 50%, 320px);
  aspect-ratio: 1 / 1;
  min-height: 0;
  border: 1px solid @border;
  background: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    radial-gradient(circle at 68% 24%, rgba(232, 40, 74, 0.22), transparent 30%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
  padding: 24px;
}

.curve-svg {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;
  touch-action: none;
}

.curve-grid-line,
.curve-handle-line {
  vector-effect: non-scaling-stroke;
}

.curve-grid-line {
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.curve-handle-line {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-width: 1;
}

.curve-path-shadow {
  fill: none;
  stroke: rgba(232, 40, 74, 0.28);
  stroke-width: 8;
  vector-effect: non-scaling-stroke;
}

.curve-path {
  fill: none;
  stroke: url(#curveGlow);
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
}

.curve-anchor,
.curve-point {
  vector-effect: non-scaling-stroke;
}

.curve-anchor {
  fill: @text;
}

.curve-point {
  fill: @red;
  stroke: @text;
  stroke-width: 1.5;
  cursor: grab !important;

  &:active {
    cursor: grabbing;
  }
}

.curve-grid-label {
  position: absolute;
  z-index: 3;
  font-family: 'Anton', sans-serif;
  font-size: 38px;
  color: rgba(255, 255, 255, 0.08);

  &--start {
    left: 22px;
    bottom: 12px;
  }

  &--end {
    right: 22px;
    top: 12px;
  }
}

.pt-scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.01) 1px,
    transparent 1px
  );
  background-size: 100% 4px;
  pointer-events: none;
}

.control-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr;
  flex: 0 0 620px;
  gap: 12px;
  align-content: start;
}

.control-item {
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.74);
  padding: 12px;
  display: grid;
  gap: 8px;

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

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: @muted;
  margin-bottom: 24px;

  span {
    .font-squish(left);
  }
}

.preview-area {
  border: 1px solid @border;
  background: radial-gradient(
      circle at 50% 50%,
      rgba(232, 40, 74, 0.12),
      transparent 52%
    ),
    #090406;
  padding: 18px;
  margin-bottom: 18px;
}

.preview-label,
.duration-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: @muted;

  span,
  strong {
    .font-squish(left);
    font-size: 11px;
  }
}

.preview-track {
  position: relative;
  height: 60px;
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.preview-orb {
  position: absolute;
  top: 15px;
  left: 0;
  width: 30px;
  height: 30px;
  background: @red;
  box-shadow: 0 0 24px rgba(232, 40, 74, 0.65);
  animation-name: previewMove;
  animation-fill-mode: both;
}

.preview-mark {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.14);

  &--start {
    left: 14px;
  }

  &--end {
    right: 14px;
  }
}

@keyframes previewMove {
  from {
    transform: translateX(0) scale(0.86);
    opacity: 0.45;
  }
  to {
    transform: translateX(calc(min(320px, 100vw - 170px))) scale(1);
    opacity: 1;
  }
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preset-btn {
  background: transparent;
  border: 1px solid @border;
  color: @muted;
  padding: 6px 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  span {
    .font-squish(left);
    font-size: 14px;
  }

  &:hover,
  &.active {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }
}

.duration-control {
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.55);
  padding: 12px;
  margin-bottom: 18px;
}

.pt-code-wrap {
  display: flex;
  flex-direction: column;
  border: 1px solid @border;
  background: #090406;
  height: 400px;
}

.pt-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid @border;
  color: @muted;

  > span {
    .font-squish(left);
    font-size: 11px;
  }
}

.pt-btn {
  background: transparent;
  border: 1px solid @border;
  color: @text;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    .font-squish(center);
    font-size: 10px;
  }

  &:hover {
    border-color: @red;
    color: @red;
  }

  &--mini {
    padding: 3px 10px;
  }
}

.pt-code-block {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: #e23456;
  line-height: 1.6;
  overflow-y: auto;

  .pt-code-inner {
    .font-squish(left);
  }
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }

  .pt-panel,
  .right-panel {
    min-height: 450px;
  }

  .curve-panel {
    flex-direction: column;
  }

  .curve-stage {
    flex: none;
    width: 100%;
    aspect-ratio: auto;
    min-height: 330px;
  }

  .curve-svg {
    min-height: 280px;
  }

  .control-grid {
    flex: none;
    grid-template-columns: repeat(2, 1fr);
  }

  .pt-header__sub {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

.crystal-container {
  position: absolute;
  bottom: 22px;
  right: 30px;
  z-index: 45;
}

@media (max-width: 600px) {
  .pt-header__title {
    font-size: 32px;
  }

  .curve-stage {
    width: auto;
    min-height: 330px;
    padding: 24px;
  }

  .curve-svg {
    min-height: 280px;
  }

  .control-grid,
  .preset-grid {
    width: auto;
  }
}
</style>
