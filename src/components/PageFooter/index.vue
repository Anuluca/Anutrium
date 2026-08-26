<template>
  <div v-bind="attrs" class="page-footer-anchor" aria-hidden="true" />
  <Teleport v-if="isFooterPortalReady" to="#page-footer-portal">
    <footer
      ref="footerRef"
      class="bottom-text"
      :class="{ 'motion-paused': isMotionPaused }"
      :style="footerStyle"
      @mouseenter="handleLogoMouseEnter"
      @mousemove="handleLogoMouseMove"
      @mouseleave="handleLogoMouseLeave"
    >
      <div class="tl-marquee" aria-hidden="true">
        <div class="tl-marquee__inner">
          <span v-for="n in 36" :key="n">
            ANUTRIUM &nbsp;&nbsp; 路卡庭院 &nbsp;&nbsp;
          </span>
        </div>
      </div>
      <div class="page-footer-sticky-clip">
        <div class="page-footer-sticky-layer">
          <div ref="footerPanelRef" class="page-footer-panel">
            <div class="page-footer-content">
              <span
                class="page-footer-content__edge page-footer-content__edge--left"
                aria-hidden="true"
              />
              <span
                class="page-footer-content__edge page-footer-content__edge--right"
                aria-hidden="true"
              />
              <div class="footer-logo-container">
                <footer class="about-footer">
                  <span class="footer-text"
                    >&lt; DRIVEN
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BY PASSION.
                    &gt;</span
                  >
                </footer>
                <button
                  class="footer-logo-link"
                  type="button"
                  aria-label="返回首页"
                  @click="toHome"
                >
                  <Logo
                    id="footer-logo"
                    :active="true"
                    class="footer-logo"
                    :class="{ 'logo-hovered': isLogoHovered }"
                    :style="logoStyle"
                  />
                </button>
              </div>
              <p class="footer-license">
                The copyright statement for articles and pictures: free to
                reprint, non-commercial, non-derivative, with attribution (
                <a
                  class="license"
                  data-magnetic
                  href="https://creativecommons.org/licenses/by-nc-nd/3.0/cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Creative Commons 3.0 license
                </a>
                ).
              </p>
              <FooterSocialLinks />
              <p class="footer-copyright">
                Designed & Engineered by Anuluca. © 2018-2026 Anuluca. All
                rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useAttrs } from 'vue'
import { useRouter } from 'vue-router'

import FooterSocialLinks from '@/components/FooterSocialLinks/index.vue'
import Logo from '@/components/Logo/index.vue'

const router = useRouter()
const attrs = useAttrs()

defineOptions({ inheritAttrs: false })

const isLogoHovered = ref(false)
const isFooterPortalReady = ref(false)
const footerRef = ref<HTMLElement | null>(null)
const footerPanelRef = ref<HTMLElement | null>(null)
const footerPanelHeight = ref(0)
const footerWidth = ref(0)
const footerComOffset = ref(0)
const isMotionPaused = ref(true)
const isFooterVisible = ref(false)

const footerStyle = computed(() => ({
  '--footer-com-offset': `${footerComOffset.value}px`,
  ...(footerPanelHeight.value > 0 && {
    '--page-footer-height': `${footerPanelHeight.value}px`,
  }),
  ...(footerWidth.value > 0 && {
    '--page-footer-width': `${footerWidth.value}px`,
  }),
}))

const currentX = ref(0)
const currentY = ref(0)
const targetX = ref(0)
const targetY = ref(0)

let rafId: number | null = null
let sizeSyncFrame: number | null = null
let cachedRect: DOMRect | null = null
let footerComElement: HTMLElement | null = null
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let footerComObserver: MutationObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

const syncStickyFooterSize = () => {
  if (footerPanelRef.value) {
    // scrollHeight 不受路由入场 transform 缩放影响。
    const computedHeight = Number.parseFloat(
      window.getComputedStyle(footerPanelRef.value).height
    )
    footerPanelHeight.value = Math.max(
      footerPanelRef.value.scrollHeight,
      Math.ceil(Number.isFinite(computedHeight) ? computedHeight : 0)
    )
  }

  if (footerRef.value) {
    footerWidth.value = Number.parseFloat(
      window.getComputedStyle(footerRef.value).width
    )
  }

  if (
    !footerComElement ||
    window.getComputedStyle(footerComElement).display === 'none'
  ) {
    footerComOffset.value = 0
    return
  }

  const footerComRect = footerComElement.getBoundingClientRect()
  footerComOffset.value =
    footerComRect.height +
    Math.max(0, window.innerHeight - footerComRect.bottom)
}

const scheduleStickyFooterSizeSync = () => {
  if (sizeSyncFrame !== null) return

  sizeSyncFrame = window.requestAnimationFrame(() => {
    sizeSyncFrame = null
    syncStickyFooterSize()
  })
}

const updateMotionState = () => {
  isMotionPaused.value =
    !isFooterVisible.value ||
    document.visibilityState === 'hidden' ||
    !!reducedMotionQuery?.matches

  if (isMotionPaused.value && rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (isMotionPaused.value) {
    currentX.value = 0
    currentY.value = 0
    targetX.value = 0
    targetY.value = 0
  }
}

const logoStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${currentX.value}deg) rotateY(${currentY.value}deg)`,
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

const handleLogoMouseEnter = (e: MouseEvent) => {
  isLogoHovered.value = true
  cachedRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
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

const toHome = () => router.push('/')

onMounted(() => {
  isFooterPortalReady.value = true
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', updateMotionState)
  document.addEventListener('visibilitychange', updateMotionState)
  window.addEventListener('resize', scheduleStickyFooterSizeSync, {
    passive: true,
  })

  nextTick(() => {
    footerComElement = document.querySelector<HTMLElement>('.footer-com')

    if (footerComElement) {
      footerComObserver = new MutationObserver(scheduleStickyFooterSizeSync)
      footerComObserver.observe(footerComElement, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      })
    }

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(scheduleStickyFooterSizeSync)
      if (footerRef.value) resizeObserver.observe(footerRef.value)
      if (footerPanelRef.value) resizeObserver.observe(footerPanelRef.value)
      if (footerComElement) resizeObserver.observe(footerComElement)
    }

    if ('IntersectionObserver' in window && footerRef.value) {
      observer = new IntersectionObserver(
        ([entry]) => {
          isFooterVisible.value = entry.isIntersecting
          updateMotionState()
        },
        { threshold: 0.08 }
      )
      observer.observe(footerRef.value)
    } else {
      isFooterVisible.value = true
      updateMotionState()
    }

    scheduleStickyFooterSizeSync()
  })
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (sizeSyncFrame !== null) cancelAnimationFrame(sizeSyncFrame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  footerComObserver?.disconnect()
  document.removeEventListener('visibilitychange', updateMotionState)
  window.removeEventListener('resize', scheduleStickyFooterSizeSync)
  reducedMotionQuery?.removeEventListener('change', updateMotionState)
})
</script>

<style lang="less" scoped>
:global(.main-container:has(.page-footer-anchor)) {
  overflow-x: visible;
  padding-bottom: 0 !important;
}

:global(#page-footer-portal > .bottom-text:not(:last-child)) {
  display: none;
}

@keyframes marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-16.6666%, 0, 0);
  }
}

.page-footer-anchor {
  display: block;
  flex: 0 0 auto;
  width: 100%;
  height: 0;
  min-height: 0;
}

.footer-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: -8px;
  perspective: 1000px;
  transform: translateY(-7px);

  .about-footer {
    text-align: center;
    position: absolute;
    margin-top: 4px;
  }

  .footer-text {
    font-family: 'anton', monospace;
    font-size: 1.107rem;
    letter-spacing: 0;
    line-height: 1.8rem;
    color: #e23456;
    filter: drop-shadow(0 0 10px #e23456);
  }
}

.footer-logo {
  position: relative;
  left: 12px;
  width: 72px;
  height: 90px;
  margin-left: -85.5px;
  color: var(--text-color);
  transition: color 0.3s ease, filter 0.3s ease;
  cursor: pointer;
  padding: 36px 90px;
  margin-bottom: -9px;

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
  --footer-com-offset: 26px;
  --page-footer-marquee-gap: 48px;
  --page-footer-surface-background: radial-gradient(
      35% 80% at 30% 0%,
      rgba(255, 255, 255, 0.08),
      transparent 100%
    ),
    rgba(0, 0, 0, 0.62);

  position: relative;
  isolation: isolate;
  height: auto;
  padding: var(--page-footer-marquee-gap) 0 0;
  clip-path: inset(0 -100vw);
  color: #e23456;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;

  > .page-footer-sticky-clip {
    position: relative;
    height: calc(var(--page-footer-height, 156px) + var(--footer-com-offset));
    clip-path: inset(0 -100vw);
  }

  .page-footer-sticky-layer {
    position: fixed;
    right: 50%;
    bottom: var(--footer-com-offset);
    z-index: 1;
    isolation: isolate;
    width: var(--page-footer-width, 100vw);
    height: var(--page-footer-height, 156px);
    transform: translateX(50%);

    &::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 50%;
      z-index: 0;
      width: 100vw;
      background: var(--page-footer-surface-background);
      transform: translateX(-50%);
      pointer-events: none;
    }
  }

  .page-footer-panel {
    position: sticky;
    top: calc(100dvh - var(--page-footer-height, 156px));
    z-index: 1;
    width: 100%;
    max-width: none;
    margin: 0;
    box-sizing: border-box;
    overflow: visible;
    background: transparent;
  }

  .tl-marquee {
    position: relative;
    z-index: 2;
    width: 100vw;
    margin-top: 0;
    margin-left: calc(50% - 50vw);
    box-sizing: border-box;
    overflow: hidden;
    border-top: 1px solid rgba(128, 128, 128, 0.26);
    border-bottom: 1px solid rgba(128, 128, 128, 0.26);
    background: var(--page-footer-surface-background);
    box-shadow: 0 14px 24px rgba(0, 0, 0, 0.72);
    padding: 0;
    pointer-events: none;

    &__inner {
      display: flex;
      min-width: 121vw;
      white-space: nowrap;
      animation: marquee 32s linear infinite reverse;
      will-change: transform;
      font-size: 10px;
      line-height: 12px;
      padding-bottom: 2px;
      color: #606060;

      span {
        flex: 1 0 auto;
        font-family: 'cn-custom', monospace;
      }
    }
  }

  .page-footer-content {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    padding-bottom: 0;
    color: #a52b43;
    background: transparent;
  }

  .page-footer-content__edge {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 2;
    width: 1px;
    background: rgba(128, 128, 128, 0.4);
    pointer-events: none;

    &--left {
      left: 0;
    }

    &--right {
      right: 0;
    }
  }

  .footer-copyright {
    position: relative;
    margin: 0;
    padding: 13px 16px 17px;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 50%;
      width: 100vw;
      height: 1px;
      background: rgba(128, 128, 128, 0.26);
      transform: translateX(50%);
      pointer-events: none;
    }
  }

  &.motion-paused {
    .tl-marquee__inner {
      animation-play-state: paused;
      will-change: auto;
    }
  }
  .footer-license {
    margin: 0;
    padding-bottom: 12px;
  }

  * {
    font-family: 'anton', sans-serif;
  }

  .license {
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.1s, background-color 0.1s;

    &:hover {
      color: #000;
      background-color: #e23456;
    }
  }
}

@media screen and (max-aspect-ratio: 1) {
  .bottom-text {
    --footer-com-offset: 0px;
  }
}
</style>
