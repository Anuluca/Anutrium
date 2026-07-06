<template>
  <ToolPageLayout
    page-class="palette-tool"
    tool-id="palette"
    title="配色提取器"
    description="上传图片以进行高频像素特征提取，自动输出标准前端调色盘。"
    :recommended-tools="recommendedTools"
  >
    <div class="pt-grid">
      <div
        class="pt-panel pt-upload-area"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          class="pt-upload-input"
          @change="handleFileChange"
        />
        <label
          for="file-upload"
          class="pt-upload-label"
          :class="{ 'has-image': previewUrl }"
        >
          <template v-if="previewUrl">
            <img :src="previewUrl" alt="Preview" class="pt-preview-img" />
            <div class="pt-preview-overlay">
              <span>[ 点击或拖拽更换图像 ]</span>
            </div>
          </template>
          <template v-else>
            <div class="pt-upload-icon">▨</div>
            <div class="pt-upload-text"><span>点击或拖拽上传图像</span></div>
            <div class="pt-upload-hint"><span>支持 JPG / PNG / WEBP</span></div>
          </template>
        </label>
        <div class="pt-scanlines" />

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel pt-result-area">
        <div class="pt-panel-title">
          <span>[ 输出结果 ]</span>
        </div>

        <div class="pt-swatches">
          <template v-if="extractedColors.length">
            <div
              class="pt-swatch-controls"
              :style="{
                gridTemplateColumns: `repeat(${extractedColors.length}, minmax(0, 1fr))`,
              }"
            >
              <button
                v-for="color in extractedColors"
                :key="`copy-${color}`"
                class="pt-swatch-copy"
                :class="{ 'is-copied': copiedColor === color }"
                type="button"
                :style="{ '--swatch-color': color }"
                :aria-label="`复制颜色 ${color}`"
                :title="copiedColor === color ? '已复制' : `复制 ${color}`"
                @click="copySingle(color)"
              >
                <span aria-hidden="true">
                  {{ copiedColor === color ? '✓' : '' }}
                </span>
              </button>
            </div>

            <div
              class="pt-swatch-capsule"
              :style="{
                background: paletteGradient,
                boxShadow: paletteShadow,
                gridTemplateColumns: `repeat(${extractedColors.length}, minmax(0, 1fr))`,
              }"
              @pointermove="updatePaletteSheen"
            >
              <div
                v-for="color in extractedColors"
                :key="color"
                class="pt-swatch-segment"
              >
                <span>{{ color }}</span>
              </div>
            </div>
          </template>
          <div v-if="extractedColors.length === 0" class="pt-swatches-empty">
            <span>等待图片数据...</span>
          </div>
        </div>

        <div class="pt-code-wrap">
          <div class="pt-code-header">
            <span>:root { CSS_VARIABLES }</span>
            <button
              class="pt-btn"
              :disabled="extractedColors.length === 0"
              @click="exportCssVariables"
            >
              <span>{{ copied ? '已复制 !' : '点击复制' }}</span>
            </button>
          </div>
          <pre
            class="pt-code-block"
          ><code class="pt-code-inner">{{ cssVariablesText || '// NO DATA\n// 请先上传图片...' }}</code></pre>
          <div class="crystal-container">
            <ToolCrystalLogo tool-id="palette" />
          </div>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import ToolCrystalLogo from '@/components/ToolCrystalLogo/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

const previewUrl = ref<string>('')
const extractedColors = ref<string[]>([])
const isExtracting = ref(false)
const copied = ref(false)
const copiedColor = ref('')
let copiedColorTimer: ReturnType<typeof window.setTimeout> | null = null

const recommendedTools = [
  { label: '配色提取器', path: '/colorPalette' },
  { label: '可视化贝塞尔曲线调整', path: '/easeStudio' },
]

const cssVariablesText = computed(() => {
  if (extractedColors.value.length === 0) return ''
  let text = ':root {\n'
  extractedColors.value.forEach((color, i) => {
    const weight = (i + 1) * 100
    text += `  --color-primary-${weight}: ${color};\n`
  })
  text += '}'
  return text
})

const paletteGradient = computed(() => {
  const colors = extractedColors.value
  if (colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]

  const segmentSize = 100 / colors.length
  const transitionSize = Math.min(3, segmentSize * 0.18)
  const stops = colors.flatMap((color, index) => {
    const solidStart = index === 0 ? 0 : index * segmentSize + transitionSize
    const solidEnd =
      index === colors.length - 1
        ? 100
        : (index + 1) * segmentSize - transitionSize
    return [`${color} ${solidStart}%`, `${color} ${solidEnd}%`]
  })

  return `linear-gradient(90deg, ${stops.join(', ')})`
})

const paletteShadow = computed(() => {
  const colors = extractedColors.value
  const shadowColor = colors[Math.floor(colors.length / 2)] ?? 'transparent'
  return `0 10px 24px -10px ${shadowColor}`
})

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processImage(target.files[0])
  }
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer && e.dataTransfer.files[0]) {
    processImage(e.dataTransfer.files[0])
  }
}

const processImage = (file: File) => {
  isExtracting.value = true
  const reader = new FileReader()
  reader.onload = (event) => {
    const src = event.target?.result as string
    previewUrl.value = src
    analyzeColors(src)
  }
  reader.readAsDataURL(file)
}

const analyzeColors = (src: string) => {
  const img = new Image()
  img.src = src
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sampleSize = 64
    canvas.width = sampleSize
    canvas.height = sampleSize
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data
    const colorMap = new Map<string, number>()

    const step = 24
    for (let i = 0; i < imageData.length; i += 4) {
      const r = Math.round(imageData[i] / step) * step
      const g = Math.round(imageData[i + 1] / step) * step
      const b = Math.round(imageData[i + 2] / step) * step
      const a = imageData[i + 3]

      if (
        a < 128 ||
        (r < 20 && g < 20 && b < 20) ||
        (r > 240 && g > 240 && b > 240)
      )
        continue

      const hex = rgbToHex(Math.min(r, 255), Math.min(g, 255), Math.min(b, 255))
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1)
    }

    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1])
    extractedColors.value = sorted.slice(0, 5).map((item) => item[0])
    isExtracting.value = false
  }
}

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (c: number) => {
    const hex = c.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

const copySingle = async (color: string) => {
  try {
    await navigator.clipboard.writeText(color)
    if (copiedColorTimer !== null) {
      window.clearTimeout(copiedColorTimer)
    }
    copiedColor.value = color
    copiedColorTimer = window.setTimeout(() => {
      copiedColor.value = ''
      copiedColorTimer = null
    }, 1200)
  } catch (err) {
    console.error('Copy failed', err)
  }
}

const updatePaletteSheen = (event: PointerEvent) => {
  const capsule = event.currentTarget as HTMLElement
  const bounds = capsule.getBoundingClientRect()
  capsule.style.setProperty(
    '--palette-sheen-x',
    `${event.clientX - bounds.left}px`
  )
  capsule.style.setProperty(
    '--palette-sheen-y',
    `${event.clientY - bounds.top}px`
  )
}

const exportCssVariables = async () => {
  try {
    await navigator.clipboard.writeText(cssVariablesText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Export failed', err)
  }
}

onBeforeUnmount(() => {
  if (copiedColorTimer !== null) {
    window.clearTimeout(copiedColorTimer)
  }
})
</script>

<style lang="less" scoped>
@red: #e8284a;
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

.palette-tool {
  color: @text;
  font-family: 'cn-custom', system-ui, sans-serif;
}

.pt-upload-area {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
}
.pt-result-area {
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
  background: #25252587;
  backdrop-filter: blur(4px);
  padding: 30px;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.right-panel {
  position: relative;
  background: @surface;
  border: 1px solid @border;
  padding: 30px;
  min-height: 600px;
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

.pt-upload-input {
  display: none;
}

.pt-upload-area {
  padding: 0;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.pt-upload-label {
  position: absolute;
  inset: 16px;
  border: 1px dashed @muted;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    border-color: @red;
    background: rgba(232, 40, 74, 0.02);
    .pt-upload-icon {
      color: @red;
    }
  }

  &.has-image {
    border-style: solid;
    border-color: transparent;
  }
}

.pt-upload-icon {
  font-size: 32px;
  color: @muted;
  margin-bottom: 16px;
  transition: color 0.3s;
}

.pt-upload-text span {
  .font-squish(center);
  font-size: 13px;
  font-weight: 700;
}

.pt-upload-hint span {
  .font-squish(center);
  font-size: 11px;
  color: @muted;
  margin-top: 8px;
}

.pt-preview-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: calc(100% - 32px);
  object-fit: contain;
  padding: 10px;
  z-index: 1;
}

.pt-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;

  span {
    .font-squish(center);
    font-size: 12px;
    letter-spacing: 0.1em;
    color: @text;
  }

  .pt-upload-label:hover & {
    opacity: 1;
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

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: @muted;
  margin-bottom: 24px;

  span {
    .font-squish(left);
  }
}

.pt-swatches {
  display: block;
  height: 118px;
  margin-bottom: 30px;
  padding: 4px 0;
  font-family: 'alibaba-puhuiti', sans-serif;

  &-empty {
    width: 100%;
    height: 100%;
    border: 1px solid @border;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.1);

    span {
      .font-squish(center);
      font-size: 11px;
      letter-spacing: 0.1em;
    }
  }
}

.pt-swatch-controls {
  display: grid;
  align-items: center;
  justify-items: center;
  margin-bottom: 12px;
}

.pt-swatch-copy {
  --swatch-color: #e23456;
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  background: var(--swatch-color);
  cursor: pointer;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 10px;
  font-weight: 800;
  transition: transform 0.22s ease, filter 0.22s ease;

  &:hover,
  &:focus-visible {
    outline: none;
    filter: brightness(1.08);
    transform: translateY(-3px) scale(1.06);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    outline-offset: 3px;
  }

  &.is-copied {
    transform: scale(1.08);
  }
}

.pt-swatch-capsule {
  --palette-sheen-x: 50%;
  --palette-sheen-y: 50%;
  position: relative;
  display: grid;
  width: 100%;
  min-height: 42px;
  box-sizing: border-box;
  overflow: hidden;
  border: 2px solid #fff;
  border-radius: 999px;
  color: #fff;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 2;
    border-radius: inherit;
    background: radial-gradient(
        ellipse 30px 20px at var(--palette-sheen-x) var(--palette-sheen-y),
        rgba(255, 252, 241, 0.38),
        rgba(255, 239, 204, 0.2) 42%,
        transparent 78%
      ),
      radial-gradient(
        circle 88px at var(--palette-sheen-x) var(--palette-sheen-y),
        rgba(255, 240, 207, 0.28),
        rgba(194, 220, 255, 0.14) 34%,
        rgba(255, 255, 255, 0.05) 58%,
        transparent 78%
      );
    content: '';
    mix-blend-mode: screen;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }

  &:hover::after {
    opacity: 1;
  }
}

.pt-swatch-segment {
  position: relative;
  z-index: 3;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  text-align: center;

  span {
    overflow: hidden;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(8px, 0.5vw, 11px);
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
    text-overflow: ellipsis;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
    white-space: nowrap;
  }
}

.pt-code-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid @border;
  background: #090406;
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

  &:hover:not(:disabled) {
    border-color: @red;
    color: @red;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.pt-code-block {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: #e23456;
  line-height: 1.6;
  flex: 1;
  overflow-y: auto;

  .pt-code-inner {
    .font-squish(left);
  }
}

.crystal-container {
  position: absolute;
  bottom: 15px;
  right: 22px;
  z-index: 1;
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }
  .pt-panel,
  .right-panel {
    min-height: 450px;
  }
}
</style>
