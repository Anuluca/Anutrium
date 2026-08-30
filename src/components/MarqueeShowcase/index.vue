<template>
  <div
    ref="marqueeElement"
    class="marquee-wrapper"
    :class="{
      'is-ready': isMarqueeReady,
      'is-flat': flat,
      'motion-paused': isMotionPaused,
    }"
  >
    <div class="marquee-3d-container">
      <div
        class="marquee-track"
        :style="{ '--marquee-distance': marqueeDistance }"
      >
        <div
          v-for="groupIndex in groupCount"
          :key="groupIndex"
          ref="groupElements"
          class="marquee-content"
          :aria-hidden="groupIndex === 1 ? undefined : 'true'"
        >
          <span
            v-for="item in marqueeItems"
            :key="item.label"
            :class="item.outline ? 'text-stroke' : 'text-solid'"
          >
            {{ item.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

withDefaults(
  defineProps<{
    flat?: boolean
  }>(),
  {
    flat: false,
  }
)

const marqueeElement = ref<HTMLElement | null>(null)
const groupElements = ref<HTMLElement[]>([])
const isMotionPaused = ref(false)
const isMarqueeReady = ref(false)
const marqueeDistance = ref('0px')
const groupCount = ref(2)
const marqueeItems = [
  { label: 'WEB-ENGEERING', outline: false },
  { label: 'VLOG', outline: true },
  { label: 'GAME', outline: false },
  { label: 'POKEMON', outline: true },
  { label: 'FRONTEND', outline: false },
  { label: 'LIVE', outline: true },
] as const

let isMounted = false
let isVisible = true
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

const updateMarqueeDistance = () => {
  const contentWidth = groupElements.value[0]?.offsetWidth ?? 0
  if (contentWidth <= 0) return

  const viewportWidth = marqueeElement.value?.clientWidth ?? 0
  groupCount.value = Math.max(2, Math.ceil(viewportWidth / contentWidth) + 1)
  marqueeDistance.value = `${-contentWidth}px`
  isMarqueeReady.value = true
}

const updateMotionState = () => {
  isMotionPaused.value =
    !isVisible ||
    document.visibilityState === 'hidden' ||
    reducedMotionQuery?.matches === true
}

onMounted(async () => {
  isMounted = true
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', updateMotionState)
  document.addEventListener('visibilitychange', updateMotionState)

  if ('IntersectionObserver' in window && marqueeElement.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        updateMotionState()
      },
      { threshold: 0.01 }
    )
    observer.observe(marqueeElement.value)
  }

  await document.fonts.ready
  if (!isMounted) return
  updateMarqueeDistance()
  const contentElement = groupElements.value[0]
  if ('ResizeObserver' in window && contentElement && marqueeElement.value) {
    resizeObserver = new ResizeObserver(updateMarqueeDistance)
    resizeObserver.observe(contentElement)
    resizeObserver.observe(marqueeElement.value)
  }

  updateMotionState()
})

onUnmounted(() => {
  isMounted = false
  observer?.disconnect()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery?.removeEventListener('change', updateMotionState)
})
</script>

<style lang="less" scoped>
.marquee-wrapper {
  opacity: 0;
  z-index: -2;
  width: 100%;
  overflow: hidden;
  background: transparent;

  padding: 80px 0;
  padding-top: 0;

  pointer-events: auto;
  user-select: none;

  perspective: 1000px;
  transform: translateY(72px) scale(1.16);
  transform-origin: center bottom;
  animation: marqueeWrapperIn 1.1s cubic-bezier(0.23, 1, 0.32, 1) 0.95s forwards;

  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );
  mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );

  &.is-ready .marquee-track {
    animation: marqueeScroll 25s linear infinite;
  }

  &.is-flat {
    .marquee-3d-container {
      transform: rotateX(0deg);
      opacity: 0.72;
    }
  }

  &:hover .marquee-track,
  &.motion-paused .marquee-track {
    animation-play-state: paused;
  }
}

.marquee-3d-container {
  width: 100%;
  transform: rotateX(48deg);
  transform-style: preserve-3d;
  transition: transform 0.36s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.marquee-track {
  display: flex;
  white-space: nowrap;
  width: max-content;
  transform: translate3d(0, 0, 0);
  transform-style: preserve-3d;
  will-change: transform;
}

.marquee-content {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 60px;
  padding-right: 60px;
}

.marquee-content span {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 64px;
  text-transform: uppercase;
  line-height: 1;

  text-shadow: 0 15px 25px rgba(0, 0, 0, 0.1);
}

.text-solid,
.text-stroke {
  color: #e23456;
}

.text-stroke {
  color: transparent;
  -webkit-text-stroke: 2px #e23456;
}

@keyframes marqueeScroll {
  0% {
    transform: translate3d(var(--marquee-distance), 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes marqueeWrapperIn {
  from {
    opacity: 0;
    transform: translateY(72px) scale(1.16);
  }
  to {
    opacity: 0.42;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee-3d-container {
    transition-duration: 0.01ms;
  }
}
</style>
