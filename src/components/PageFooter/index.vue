<template>
  <footer
    class="bottom-text"
    :class="{ 'third-party': thirdParty }"
    @mousemove="handleLogoMouseMove"
    @mouseleave="handleLogoMouseLeave"
  >
    <!-- 底部装饰跑马灯 -->
    <div class="tl-marquee" aria-hidden="true">
      <div class="tl-marquee__inner">
        <span v-for="n in 36" :key="n">
          {{ enTitle }} &nbsp;&nbsp; {{ cnTitle }} &nbsp;&nbsp;
        </span>
      </div>
    </div>
    <div class="footer-logo-container">
      <Logo
        id="footer-logo"
        :active="true"
        class="footer-logo"
        :class="{ 'logo-hovered': isLogoHovered }"
        :style="logoStyle"
        @mouseenter="isLogoHovered = true"
        @mouseleave="isLogoHovered = false"
      />
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
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import Logo from '@/components/Logo/index.vue'

const router = useRouter()
// 1. 显式定义 Props 的 TypeScript 接口
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

// 🌟 2. 直接解构并赋默认值（Vue 3.5+ 自动保持响应式，且默认值绝对生效）
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

// 视觉物理缓动状态
const currentX = ref(0)
const currentY = ref(0)
const targetX = ref(0)
const targetY = ref(0)

let rafId: number | null = null
let cachedRect: DOMRect | null = null

const logoStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${currentX.value}deg) rotateY(${currentY.value}deg)`,
  transition: 'color 0.3s ease, filter 0.3s ease', // 移除了 transform 的 css transition 避免与 rAf 冲突
}))

// 缓动核心算法
const updateRotation = () => {
  // 0.15 的内插值赋予极其丝滑的跟手阻尼感
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
  const container = e.currentTarget as HTMLElement

  // 缓存边界数据，避免高频触发 Reflow
  if (!cachedRect) {
    cachedRect = container.getBoundingClientRect()
  }

  const centerX = cachedRect.left + cachedRect.width / 2
  const centerY = cachedRect.top + cachedRect.height / 2

  const mouseX = e.clientX - centerX
  const mouseY = e.clientY - centerY

  // 计算目标倾斜角度
  targetY.value = (mouseX / (cachedRect.width / 2)) * 50
  targetX.value = -(mouseY / (cachedRect.height / 2)) * 50

  if (!rafId) {
    rafId = requestAnimationFrame(updateRotation)
  }
}

const handleLogoMouseLeave = () => {
  isLogoHovered.value = false
  cachedRect = null // 离开时清空缓存
  targetX.value = 0
  targetY.value = 0

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

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style lang="less" scoped>
@keyframes marquee {
  from {
    transform: translateX(0); /* 从最左侧满字状态开始 */
  }
  to {
    transform: translateX(
      -16.6666%
    ); /* 🌟 100% / 6个块 = 精准向左滚动移动一格，随即无缝复位 */
  }
}

.footer-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
}

.footer-logo {
  width: 80px;
  height: 100px;
  color: var(--text-color);
  transition: color 0.3s ease, filter 0.3s ease;
  cursor: pointer;
  padding: 40px 100px;

  &.logo-hovered {
    color: #000;
    filter: drop-shadow(0 0 20px #e23456) drop-shadow(0 0 40px #e23456)
      drop-shadow(0 0 60px rgba(226, 52, 86, 0.5));
  }
}

.bottom-text {
  padding: 10px 0;
  padding-bottom: 50px;
  color: #e23456;
  font-size: 13px;
  line-height: 24px;
  text-align: center;
  letter-spacing: 0.2px;
  margin-top: 40px;

  // ─── 跑马灯 ──────────────────────────────────────────────────────────────────
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
      animation: marquee 18s linear infinite reverse;
      font-size: 10px;
      line-height: 12px;
      padding-bottom: 2px;
      color: rgb(88, 88, 88);
      * {
        font-family: 'Unbounded Sans', monospace;
      }
    }
  }
  &.third-party {
    zoom: 0.8;
    padding-bottom: 0;
    .footer-logo {
      zoom: 0.8;
    }
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
