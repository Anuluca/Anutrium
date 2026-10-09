<script setup lang="ts">
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { scrollPageTo } from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

import './index.less'

const router = useRouter()

const isEntered = ref(false)
const outlineRef = ref<SVGGElement | null>(null)
const drawMaskRef = ref<SVGGElement | null>(null)
let entranceTimer: number | null = null

onBeforeMount(() => {
  document.documentElement.classList.add('not-found-no-scroll')
  document.body.classList.add('not-found-no-scroll')
  setSmoothScrollLocked('not-found', true)
})

onMounted(() => {
  scrollPageTo({ top: 0, behavior: 'auto' })

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
  setSmoothScrollLocked('not-found', false)
  document.documentElement.classList.remove('not-found-no-scroll')
  document.body.classList.remove('not-found-no-scroll')
})
</script>

<template>
  <div
    class="not-found-page main-container"
    :class="{ 'is-entered': isEntered }"
  >
    <div class="inner">
      <div class="porygon" aria-hidden="true">
        <svg
          viewBox="0 0 394 369"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask
              id="porygon-draw-mask"
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
            mask="url(#porygon-draw-mask)"
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
        <p><span>404</span> NOT FOUND</p>
        <p
          class="last-show-text"
          role="button"
          tabindex="0"
          @click="router.push('/')"
          @keydown.enter="router.push('/')"
          @keydown.space.prevent="router.push('/')"
        >
          -> RETURN TO HOME
        </p>
      </div>
    </div>
  </div>
</template>
