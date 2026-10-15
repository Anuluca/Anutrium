<script setup lang="ts">
import { getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})
const emit = defineEmits<{ returnHome: [] }>()
const maskId = `porygon-draw-mask-${getCurrentInstance()!.uid}`
const isEntered = ref(false)
const contentRoot = ref<HTMLElement | null>(null)
const composition = ref<HTMLElement | null>(null)
const compositionScale = ref(1)
const isCompact = useMediaQuery('(max-width: 768px)')
// 只缩放完整构图，文字、插画的尺寸与重叠关系仍由原 404 样式决定。
useResizeObserver([contentRoot, composition], () => {
  if (
    (!props.embedded && !isCompact.value) ||
    !contentRoot.value ||
    !composition.value
  )
    return
  const root = contentRoot.value
  const inner = composition.value
  const image = inner.querySelector<HTMLElement>('.porygon')
  compositionScale.value =
    (isCompact.value ? 1 : 0.8) *
    Math.min(
      1,
      (root.clientWidth - (isCompact.value ? 24 : 0)) /
        Math.max(inner.offsetWidth, 1),
      root.clientHeight /
        Math.max(inner.offsetHeight, image?.offsetHeight ?? 0, 1)
    )
})
const outlineRef = ref<SVGGElement | null>(null)
const drawMaskRef = ref<SVGGElement | null>(null)
let entranceTimer: number | null = null

onMounted(() => {
  // 用连续线条遮罩揭示虚线，避免绘制动画改变原来的虚线间隔。
  outlineRef.value
    ?.querySelectorAll<SVGGeometryElement>('path, ellipse')
    .forEach((shape, index) => {
      const maskShape = shape.cloneNode(true) as SVGGeometryElement
      const length = shape.getTotalLength() + 1
      maskShape.setAttribute('stroke', 'white')
      maskShape.setAttribute('stroke-dasharray', `${length} ${length}`)
      maskShape.style.setProperty('--draw-length', String(length))
      maskShape.style.setProperty('--draw-delay', `${index * 45}ms`)
      drawMaskRef.value?.appendChild(maskShape)
    })

  entranceTimer = window.setTimeout(() => {
    entranceTimer = null
    isEntered.value = true
  })
})

onUnmounted(() => {
  if (entranceTimer !== null) window.clearTimeout(entranceTimer)
})
</script>

<template>
  <div
    ref="contentRoot"
    class="not-found-page main-container"
    :style="
      props.embedded || isCompact
        ? { '--not-found-scale': compositionScale }
        : undefined
    "
    :class="{
      'is-entered': isEntered,
      'is-embedded': props.embedded,
      'no-rem': props.embedded || isCompact,
    }"
  >
    <div ref="composition" class="inner">
      <div class="porygon" aria-hidden="true">
        <svg
          viewBox="0 0 394 369"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          :style="{ '--porygon-glow': `url(#${maskId}-glow)` }"
        >
          <defs>
            <filter
              :id="`${maskId}-glow`"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              color-interpolation-filters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <mask
              :id="maskId"
              maskUnits="userSpaceOnUse"
              x="-5"
              y="-5"
              width="404"
              height="379"
            >
              <g
                ref="drawMaskRef"
                class="porygon__draw-mask"
                fill="none"
                stroke="white"
                stroke-width="6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </mask>
          </defs>
          <g
            ref="outlineRef"
            :mask="`url(#${maskId})`"
            stroke="#26b9e5"
            stroke-width="2.5"
            stroke-dasharray="6 5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="#f12b70" d="M224 49 245 5Q250-2 253 6L247 55" />
            <path
              stroke="#f12b70"
              d="M162 85C179 44 230 37 262 64C293 88 290 129 263 148C231 171 183 154 163 124"
            />
            <path
              d="M132 90C147 78 181 83 199 97C209 105 212 115 205 122C191 132 152 118 135 107Q125 98 132 90Z"
            />
            <ellipse
              stroke="#d5ad32"
              cx="248"
              cy="116"
              rx="21"
              ry="32"
              transform="rotate(24 248 116)"
            />
            <ellipse
              stroke="#d5ad32"
              cx="249"
              cy="118"
              rx="13"
              ry="22"
              transform="rotate(24 249 118)"
            />
            <ellipse
              stroke="#d5ad32"
              cx="250"
              cy="119"
              rx="5"
              ry="9"
              transform="rotate(24 250 119)"
            />
            <path
              d="M163 189C149 209 153 245 176 264C193 279 220 276 239 256C260 235 263 205 246 182"
            />
            <path
              stroke="#f12b70"
              d="M165 190C170 167 196 154 217 160C241 166 250 189 240 208C230 229 204 238 184 226C169 219 161 204 165 190Z"
            />
            <ellipse
              cx="80"
              cy="175"
              rx="79"
              ry="29"
              transform="rotate(12 80 175)"
            />
            <ellipse
              cx="322"
              cy="185"
              rx="72"
              ry="29"
              transform="rotate(-10 322 185)"
            />
            <ellipse
              cx="228"
              cy="318"
              rx="16"
              ry="45"
              transform="rotate(-10 228 318)"
            />
          </g>
        </svg>
      </div>
      <div class="show-text">
        <div class="signal-interference" aria-hidden="true" />
        <p>
          <span class="signal-title">
            <span class="signal-code">404</span> SIGNAL LOST
          </span>
        </p>
        <p
          class="last-show-text"
          role="button"
          tabindex="0"
          @click="emit('returnHome')"
          @keydown.enter="emit('returnHome')"
          @keydown.space.prevent="emit('returnHome')"
        >
          -> RETURN TO HOME
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped src="./index.less" />
