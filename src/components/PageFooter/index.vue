<template>
  <footer
    ref="footerRef"
    class="bottom-text"
    :class="{ 'third-party': thirdParty, 'motion-paused': isMotionPaused }"
    @mousemove="handleLogoMouseMove"
    @mouseleave="handleLogoMouseLeave"
  >
    <div class="tl-marquee" aria-hidden="true">
      <div class="tl-marquee__inner">
        <span v-for="n in 36" :key="n">
          {{ enTitle }} &nbsp;&nbsp; {{ cnTitle }} &nbsp;&nbsp;
        </span>
      </div>
    </div>
    <div class="footer-logo-container">
      <footer class="about-footer">
        <span class="footer-text"
          >&lt; DRIVEN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BY PASSION.
          &gt;</span
        >
      </footer>
      <button
        class="footer-logo-link"
        type="button"
        aria-label="返回首页"
        @click="toPage('/')"
      >
        <Logo
          id="footer-logo"
          :active="true"
          class="footer-logo"
          :class="{ 'logo-hovered': isLogoHovered }"
          :style="logoStyle"
          @mouseenter="isLogoHovered = true"
          @mouseleave="isLogoHovered = false"
        />
      </button>
    </div>
    <div v-if="thirdParty" class="third-party-recommend">
      <a target="_blank" @click="toPage('craft')"> 工具集 </a> |
      &nbsp;&nbsp;&nbsp;热门工具:
      <a
        v-for="tool in displayedRecommendedTools"
        :key="tool.path"
        target="_blank"
        @click="toPage(tool.path)"
      >
        {{ tool.label }}
      </a>
    </div>
    <p>
      The copyright statement for articles and pictures: free to reprint,
      non-commercial, non-derivative, with attribution (
      <span class="lisence" data-magnetic @click="clickLisence">
        Creative Commons 3.0 lisence
      </span>
      ).
    </p>
    <p>Designed & Engineered by Anuluca. © 2026 All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import Logo from '@/components/Logo/index.vue'

const router = useRouter()

interface RecommendedTool {
  label: string
  path: string
}

interface Props {
  thirdParty?: boolean
  cnTitle?: string
  enTitle?: string
  recommendedTools?: RecommendedTool[]
}

const {
  thirdParty = false,
  cnTitle = '路卡庭院',
  enTitle = 'ANUTRIUM',
  recommendedTools,
} = defineProps<Props>()
const isLogoHovered = ref(false)

const defaultRecommendedTools: RecommendedTool[] = [
  { label: 'CSS调色盘', path: '/colorPalette' },
  { label: 'EASE STUDIO', path: '/easeStudio' },
]

const displayedRecommendedTools = computed(() => {
  return recommendedTools?.length ? recommendedTools : defaultRecommendedTools
})
const footerRef = ref<HTMLElement | null>(null)
const isMotionPaused = ref(true)
const isFooterVisible = ref(false)

const currentX = ref(0)
const currentY = ref(0)
const targetX = ref(0)
const targetY = ref(0)

let rafId: number | null = null
let cachedRect: DOMRect | null = null
let observer: IntersectionObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

const updateMotionState = () => {
  isMotionPaused.value =
    !isFooterVisible.value ||
    document.visibilityState === 'hidden' ||
    !!reducedMotionQuery?.matches

  if (isMotionPaused.value && rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const logoStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${currentX.value}deg) rotateY(${currentY.value}deg)`,
  transition: 'color 0.3s ease, filter 0.3s ease',
}))

const updateRotation = () => {
  if (isMotionPaused.value) {
    rafId = null
    return
  }

  currentX.value += (targetX.value - currentX.value) * 0.15
  currentY.value += (targetY.value - currentY.value) * 0.15

  if (
    isLogoHovered.value ||
    Math.abs(currentX.value) > 0.01 ||
    Math.abs(currentY.value) > 0.01
  ) {
    rafId = requestAnimationFrame(updateRotation)
  } else {
    currentX.value = 0
    currentY.value = 0
    rafId = null
  }
}

const handleLogoMouseMove = (e: MouseEvent) => {
  if (isMotionPaused.value) return

  const container = e.currentTarget as HTMLElement

  if (!cachedRect) {
    cachedRect = container.getBoundingClientRect()
  }

  const centerX = cachedRect.left + cachedRect.width / 2
  const centerY = cachedRect.top + cachedRect.height / 2

  const mouseX = e.clientX - centerX
  const mouseY = e.clientY - centerY

  targetY.value = (mouseX / (cachedRect.width / 2)) * 50
  targetX.value = -(mouseY / (cachedRect.height / 2)) * 50

  if (!rafId) {
    rafId = requestAnimationFrame(updateRotation)
  }
}

const handleLogoMouseLeave = () => {
  isLogoHovered.value = false
  cachedRect = null
  targetX.value = 0
  targetY.value = 0

  if (isMotionPaused.value) return

  if (!rafId) {
    rafId = requestAnimationFrame(updateRotation)
  }
}

const clickLisence = () => {
  window.open('https://creativecommons.org/licenses/by-nc-nd/3.0/cn/')
}

const toPage = (page: string) => {
  router.push(page.startsWith('/') ? page : `/${page}`)
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', updateMotionState)
  document.addEventListener('visibilitychange', updateMotionState)

  if ('IntersectionObserver' in window && footerRef.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        isFooterVisible.value = entry.isIntersecting
        updateMotionState()
      },
      { rootMargin: '220px 0px' }
    )
    observer.observe(footerRef.value)
  } else {
    isFooterVisible.value = true
    updateMotionState()
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery?.removeEventListener('change', updateMotionState)
})
</script>

<style lang="less" scoped>
@keyframes marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-16.6666%, 0, 0);
  }
}

.footer-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;

  .about-footer {
    text-align: center;
    position: absolute;
    margin-top: 4px;
  }

  .footer-text {
    font-family: 'anton', monospace;
    font-size: 1.23rem;
    letter-spacing: 4px;
    line-height: 2rem;
    color: #e23456;
    filter: drop-shadow(0 0 10px #e23456);
  }
}

.footer-logo {
  width: 80px;
  height: 100px;
  margin-left: -95px;
  color: var(--text-color);
  transition: color 0.3s ease, filter 0.3s ease;
  cursor: pointer;
  padding: 40px 100px;
  margin-bottom: -10px;

  &.logo-hovered {
    color: #000;
    filter: drop-shadow(0 0 20px #e23456) drop-shadow(0 0 40px #e23456)
      drop-shadow(0 0 60px rgba(226, 52, 86, 0.5));
  }
}

.footer-logo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 1px solid #e23456;
    outline-offset: -36px;
  }
}

.bottom-text {
  padding: 10px 0;
  padding-bottom: 40px;
  color: #e23456;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;

  .tl-marquee {
    margin-top: 20px;
    overflow: hidden;
    border-top: 1px solid rgba(255, 255, 255, 0.159);
    border-bottom: 1px solid rgba(255, 255, 255, 0.159);
    padding: 0 0;
    pointer-events: none;

    &__inner {
      display: flex;
      white-space: nowrap;
      animation: marquee 32s linear infinite reverse;
      will-change: transform;
      font-size: 10px;
      line-height: 12px;
      padding-bottom: 2px;
      color: rgb(88, 88, 88);
      * {
        font-family: 'cn-custom', monospace;
      }
    }
  }

  &.motion-paused {
    .tl-marquee__inner {
      animation-play-state: paused;
    }
  }
  &.third-party {
    zoom: 0.8;
    padding-bottom: 0;
  }
  .third-party-recommend {
    font-family: 'source-han-sans-simplified-c' !important;
    font-weight: 600;
    * {
      font-family: 'source-han-sans-simplified-c' !important;
      font-weight: 600;
    }
    a {
      text-decoration: underline;
      transition: all 0.2s;
      padding: 0 2px;
      padding-bottom: 2px;
      &:before {
        content: '[ ';
        opacity: 0;
      }
      &:after {
        content: ' ]';
        opacity: 0;
      }
      &:hover {
        background-color: #e23456;
        color: #000;
        &::before {
          opacity: 1;
        }
        &::after {
          opacity: 1;
        }
      }
    }
  }

  * {
    font-family: 'anton', sans-serif;
  }

  .lisence {
    text-decoration: underline;
    cursor: pointer;
    transition: all 0.1s;

    &:hover {
      color: #000;
      background-color: #e23456;
    }
  }
}
</style>
