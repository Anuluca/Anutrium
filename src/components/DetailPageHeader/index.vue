<template>
  <header
    class="detail-page-header no-cursor"
    @mouseenter="startCrosshairTracking"
    @mousemove="queueCrosshairUpdate"
    @mouseleave="stopCrosshairTracking"
  >
    <button class="detail-page-header__back" type="button" @click="goBack">
      <span>{{ backLabel }}</span>
    </button>
    <h1>{{ title }}</h1>
    <div class="detail-page-header__crosshair" aria-hidden="true" />
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  backLabel: string
  backPath: string
  title: string
}>()

const router = useRouter()
let crosshairFrame: number | null = null
let crosshairTarget: HTMLElement | null = null
let crosshairClientX = 0
let crosshairClientY = 0

const renderCrosshair = () => {
  crosshairFrame = null
  if (!crosshairTarget) return

  const bounds = crosshairTarget.getBoundingClientRect()
  crosshairTarget.style.setProperty(
    '--detail-header-cross-x',
    `${crosshairClientX - bounds.left}px`
  )
  crosshairTarget.style.setProperty(
    '--detail-header-cross-y',
    `${crosshairClientY - bounds.top}px`
  )
}

const queueCrosshairUpdate = (event: MouseEvent) => {
  crosshairTarget = event.currentTarget as HTMLElement
  crosshairClientX = event.clientX
  crosshairClientY = event.clientY

  if (crosshairFrame === null) {
    crosshairFrame = window.requestAnimationFrame(renderCrosshair)
  }
}

const startCrosshairTracking = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  target.classList.add('is-crosshair-active')
  queueCrosshairUpdate(event)
}

const stopCrosshairTracking = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  target.classList.remove('is-crosshair-active')
  crosshairTarget = null

  if (crosshairFrame !== null) {
    window.cancelAnimationFrame(crosshairFrame)
    crosshairFrame = null
  }
}

const goBack = () => {
  const previousPath = window.history.state?.back
  const expectedPath = router.resolve(props.backPath).fullPath

  if (
    typeof previousPath === 'string' &&
    router.resolve(previousPath).fullPath === expectedPath
  ) {
    router.back()
    return
  }

  router.push(props.backPath)
}

onBeforeUnmount(() => {
  if (crosshairFrame !== null) {
    window.cancelAnimationFrame(crosshairFrame)
  }
})
</script>

<style lang="less" scoped>
.detail-page-header {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: clamp(64px, 7vw, 108px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  margin: 30px 0 0;
  padding: clamp(10px, 1.2vw, 16px) clamp(14px, 2.5vw, 32px);
  border-radius: 2px;
  background-color: #000;
  box-shadow: inset 0 0 0 1px rgba(226, 52, 86, 0.12);
  opacity: 0;
  animation: detailHeaderCrtOn 0.58s cubic-bezier(0.19, 1, 0.22, 1) 0.44s both;

  &::before,
  &::after {
    position: absolute;
    inset: 0;
    content: '';
    pointer-events: none;
  }

  &::before {
    z-index: 0;
    background: linear-gradient(
        rgba(226, 52, 86, 0.08),
        rgba(226, 52, 86, 0.02)
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.16) 0,
        rgba(255, 255, 255, 0.16) 1px,
        transparent 1px,
        transparent 5px
      );
    mix-blend-mode: screen;
    opacity: 0.42;
  }

  &::after {
    z-index: 8;
    background: linear-gradient(
      to bottom,
      transparent 47%,
      rgba(255, 255, 255, 0.92) 50%,
      transparent 53%
    );
    opacity: 0;
    mix-blend-mode: screen;
    animation: detailHeaderCrtFlash 0.58s linear 0.44s both;
  }

  &__back {
    position: relative;
    z-index: 6;
    display: inline-block;
    margin: 0;
    padding: 0;
    border: 0;
    color: #3276fe;
    background: transparent;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 17px;
    letter-spacing: 0.1em;
    transform: scaleX(0.9);
    transform-origin: left;
    cursor: pointer;
    transition: color 0.2s ease, transform 0.2s ease;
    user-select: none;

    &::before {
      content: '// ';
    }

    &:hover {
      color: #e8284a;
      transform: translateX(-4px) scaleX(0.9);

      &::before {
        color: #e8284a;
        content: '<< ';
      }
    }
  }

  h1 {
    position: relative;
    z-index: 3;
    margin: 0;
    color: #e23456;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(1.1rem, 2.6vw, 2.3rem);
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.05;
    overflow-wrap: anywhere;
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 2px,
      transparent 2px 3px
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 2px,
      transparent 2px 3px
    );
    text-shadow: 0 0 18px rgba(226, 52, 86, 0.2);
    transition: text-shadow 0.25s ease;
  }

  &:hover h1 {
    text-shadow: 0 0 24px rgba(226, 52, 86, 0.43),
      0 0 60px rgba(226, 52, 86, 0.36);
  }

  &__crosshair {
    position: absolute;
    inset: 0;
    z-index: 5;
    opacity: 0;
    pointer-events: none;

    &::before,
    &::after {
      position: absolute;
      content: '';
      background: #e23456;
    }

    &::before {
      top: 0;
      bottom: 0;
      left: var(--detail-header-cross-x);
      width: 1px;
      transform: translateX(-0.5px);
    }

    &::after {
      top: var(--detail-header-cross-y);
      right: 0;
      left: 0;
      height: 1px;
      transform: translateY(-0.5px);
    }
  }

  &.is-crosshair-active &__crosshair {
    opacity: 1;
  }
}

@keyframes detailHeaderCrtOn {
  0% {
    opacity: 0;
    clip-path: inset(49.7% 50%);
    filter: brightness(7) contrast(2);
  }

  44% {
    opacity: 1;
    clip-path: inset(49.7% 0);
    filter: brightness(4) contrast(1.5);
  }

  58% {
    clip-path: inset(45% 0);
    filter: brightness(1.8) contrast(1.25);
  }

  100% {
    opacity: 1;
    clip-path: inset(0);
    filter: brightness(1) contrast(1);
  }
}

@keyframes detailHeaderCrtFlash {
  0%,
  37% {
    opacity: 0;
  }

  44% {
    opacity: 0.95;
  }

  58% {
    opacity: 0.28;
  }

  100% {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .detail-page-header {
    aspect-ratio: 6 / 1;
    min-height: 0;
    margin: 0;
    padding: clamp(10px, 3vw, 16px) clamp(20px, 6vw, 32px);

    &__back {
      font-size: 13px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-page-header {
    opacity: 1;
    clip-path: none;
    filter: none;
    animation: none;

    &::after {
      animation: none;
    }
  }
}
</style>
