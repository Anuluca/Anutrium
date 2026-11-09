<template>
  <div
    v-if="!failed"
    ref="backgroundElement"
    class="note-modal-background no-rem"
    :class="{ 'is-loaded': imageLoaded, 'is-switch-entrance': switchEntrance }"
    :style="{
      '--note-background-height': `${normalHeight}px`,
      '--note-cover-overscan': `${coverOverscan}px`,
      '--note-cover-final-offset': `${FINAL_OFFSET_Y * 100}%`,
      '--note-cover-entry-state': switching ? 'paused' : 'running',
    }"
    aria-hidden="true"
  >
    <picture>
      <source media="(max-width: 768px)" :srcset="mobileThumbnail" />
      <img
        ref="imageElement"
        :src="thumbnail"
        alt=""
        decoding="async"
        @load="imageLoaded = true"
        @error="failed = true"
      />
    </picture>
    <div ref="revealWindowElement" class="note-cover-reveal-window">
      <picture ref="revealPictureElement">
        <source media="(max-width: 768px)" :srcset="mobileThumbnail" />
        <img
          ref="revealImageElement"
          class="note-cover-reveal"
          :src="thumbnail"
          alt=""
          decoding="async"
        />
      </picture>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import gsap from 'gsap'

import { useFrameTask } from '@/composables/useFrameTask'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'


const props = defineProps<{
  image: string
  height: number
  phase: string
  overscan: number
  switching?: boolean
}>()
const thumbnail = computed(() => getCardThumbnailUrl(props.image))
const mobileThumbnail = computed(() => getCardMobileThumbnailUrl(props.image))
// 保留本次入场标记，导航结束时不因状态清除而重启动画。
const switchEntrance = !!props.switching
const BACKGROUND_HEIGHT_RATIO = 1.35
const INTRO_CENTER_Y = 0.55
const INTRO_IMAGE_SCALE = 1.15
const INTRO_MIN_HEIGHT = (2 * INTRO_CENTER_Y * 100) / INTRO_IMAGE_SCALE
const normalHeight = computed(() => props.height * BACKGROUND_HEIGHT_RATIO)
const FINAL_OFFSET_Y = 0.1
const coverOverscan = computed(
  () => props.overscan + normalHeight.value * FINAL_OFFSET_Y
)
const failed = ref(false)
const imageLoaded = ref(false)
const backgroundElement = ref<HTMLElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
watch(
  imageElement,
  (image) => {
    imageLoaded.value = !!image?.complete && image.naturalWidth > 0
  },
  { flush: 'post' }
)
const revealImageElement = ref<HTMLImageElement | null>(null)
const revealWindowElement = ref<HTMLElement | null>(null)
const revealPictureElement = ref<HTMLElement | null>(null)
let modalElement: HTMLElement | null = null
let pointer: { x: number; y: number } | null = null
let revealGeometry: { frame: DOMRect; width: number; height: number } | null =
  null
const { schedule: scheduleReveal } = useFrameTask(() => {
  const revealWindow = revealWindowElement.value
  const picture = revealPictureElement.value
  const background = backgroundElement.value
  if (!revealWindow || !picture || !background) return
  if (!pointer) {
    revealWindow.classList.remove('is-active')
    return
  }
  const geometry = revealGeometry ?? {
    frame: background.getBoundingClientRect(),
    width: background.offsetWidth,
    height: background.offsetHeight,
  }
  const { frame, width, height } = geometry
  if (!revealGeometry) {
    // 稳定后拖动只更新合成位移，入场时仍跟随背景尺寸。
    if (
      props.phase === 'ready' &&
      !background
        .getAnimations()
        .some((animation) => animation.playState === 'running')
    ) {
      revealGeometry = geometry
    }
  }
  if (
    !frame.width ||
    !frame.height ||
    pointer.x < frame.left ||
    pointer.x > frame.right ||
    pointer.y < frame.top ||
    pointer.y > frame.bottom
  ) {
    revealWindow.classList.remove('is-active')
    return
  }
  const x = ((pointer.x - frame.left) * width) / frame.width - 180
  const y = ((pointer.y - frame.top) * height) / frame.height - 180
  // 遮罩随指针移动，内部图片反向平移，与底图保持对齐。
  picture.style.transform = `translate3d(${-x}px, ${-y}px, 0)`
  revealWindow.style.transform = `translate3d(${x}px, ${y}px, 0)`
  revealWindow.classList.add('is-active')
})
const moveReveal = (event: PointerEvent) => {
  if (event.type === 'pointermove' && (!pointer || event.buttons === 0)) return
  pointer = { x: event.clientX, y: event.clientY }
  scheduleReveal()
}
const hideReveal = () => {
  revealGeometry = null
  pointer = null
  scheduleReveal()
}
onMounted(() => {
  modalElement = backgroundElement.value?.closest('.note-detail-modal') ?? null
  modalElement?.addEventListener('pointermove', moveReveal, { passive: true })
  modalElement?.addEventListener('pointerdown', moveReveal, { passive: true })
  modalElement?.addEventListener('pointerleave', hideReveal, { passive: true })
  modalElement?.addEventListener('pointerup', hideReveal, { passive: true })
  modalElement?.addEventListener('pointercancel', hideReveal, { passive: true })
})
onBeforeUnmount(() => {
  modalElement?.removeEventListener('pointermove', moveReveal)
  modalElement?.removeEventListener('pointerdown', moveReveal)
  modalElement?.removeEventListener('pointerleave', hideReveal)
  modalElement?.removeEventListener('pointerup', hideReveal)
  modalElement?.removeEventListener('pointercancel', hideReveal)
})
useResizeObserver(backgroundElement, () => {
  revealGeometry = null
  if (pointer) scheduleReveal()
})
defineExpose({
  setScrollShift(shift: number) {
    const value = `${shift}px`
    imageElement.value?.style.setProperty('--note-cover-shift', value)
    revealImageElement.value?.style.setProperty('--note-cover-shift', value)
    if (pointer) hideReveal()
  },
})
const motionPhase = computed(() =>
  ['moving', 'ready'].includes(props.phase) ? props.phase : 'intro'
)
watch(
  [motionPhase, backgroundElement, imageElement, revealImageElement],
  ([phase, background, image, reveal], _, onCleanup) => {
    if (
      !background ||
      !image ||
      phase === 'ready' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const pictures = reveal ? [image, reveal] : [image]
    const context = gsap.context(() => {
      // 入场图片覆盖偏移后的整个窗口，且裁切尺寸不小于归位尺寸。
      gsap.set(background, {
        height: '100%',
      })
      gsap.set(pictures, {
        height: 'auto',
        minHeight: `max(${INTRO_MIN_HEIGHT}%, calc(min(var(--note-background-height), 100%) + 2 * var(--note-cover-overscan)))`,
        top: `${INTRO_CENTER_Y * 100}%`,
        yPercent: -50,
        scale: INTRO_IMAGE_SCALE,
        transformOrigin: '50% 50%',
        objectPosition: '50% 50%',
      })
      if (phase !== 'moving') return
      const imageHeight = image.offsetHeight || background.clientHeight
      const top = background.clientHeight * INTRO_CENTER_Y - imageHeight / 2
      gsap.set(pictures, {
        height: imageHeight,
        minHeight: 0,
        top,
        yPercent: 0,
      })
      const finalHeight = Math.min(
        normalHeight.value,
        (background.offsetParent as HTMLElement)?.clientHeight ??
          normalHeight.value
      )
      // 与标题回到顶部使用相同时长、缓动，结束后恢复 CSS 控制的最终布局。
      gsap.to(background, {
        height: finalHeight,
        duration: 1.6,
        ease: 'power3.inOut',
      })
      gsap.to(pictures, {
        scale: 1,
        height: finalHeight + coverOverscan.value * 2,
        top: -coverOverscan.value + finalHeight * FINAL_OFFSET_Y,
        objectPosition: '50% 45%',
        duration: 1.6,
        ease: 'power3.inOut',
      })
    }, background)
    onCleanup(() => context.revert())
  },
  { flush: 'post', immediate: true }
)
</script>

<style lang="less" scoped>
// 背景独立定位在弹窗内，可延伸至标题下方，不影响正文排版。
.note-modal-background.no-rem {
  position: absolute;
  inset: 0 0 auto;
  height: min(var(--note-background-height), 100%);
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  isolation: isolate;
  container-type: size;
  opacity: 0;
  &.is-loaded {
    opacity: 1;
    animation: noteCoverFadeIn 1.2s ease-out both;
    &.is-switch-entrance {
      animation-name: noteCoverSwitchIn;
      animation-play-state: var(--note-cover-entry-state, running);
    }
  }
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 55%,
    rgba(0, 0, 0, 0.75) 72%,
    rgba(0, 0, 0, 0.25) 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 55%,
    rgba(0, 0, 0, 0.75) 72%,
    rgba(0, 0, 0, 0.25) 90%,
    transparent 100%
  );
  picture {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  img {
    position: absolute;
    top: calc(
      0px - var(--note-cover-overscan) + var(--note-cover-final-offset)
    );
    left: 0;
    display: block;
    width: 100%;
    height: calc(100% + var(--note-cover-overscan) * 2);
    object-fit: cover;
    object-position: center 45%;

    transform: translate3d(0, var(--note-cover-shift, 0px), 0);
  }
  img.note-cover-reveal {
    filter: none;
  }
  .note-cover-reveal-window {
    position: absolute;
    inset: 0 auto auto 0;
    width: 360px;
    height: 360px;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
    will-change: transform, opacity;
    transition: opacity 0.8s ease-out, visibility 0s linear 0.8s;
    &.is-active {
      opacity: 1;
      visibility: visible;
      transition-delay: 0s;
    }
    picture {
      width: 100cqw;
      height: 100cqh;
      will-change: transform;
    }
    mask-image: radial-gradient(circle 180px, #000 15%, transparent 100%);
    -webkit-mask-image: radial-gradient(
      circle 180px,
      #000 15%,
      transparent 100%
    );
  }
  &::after {
    position: absolute;
    inset: 0;
    content: '';
    background: rgba(0, 0, 0, 0.65);
  }
}
@keyframes noteCoverFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes noteCoverSwitchIn {
  from {
    opacity: 0;
    transform: scale(1.15);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .note-modal-background.no-rem {
    &.is-loaded,
    &.is-loaded.is-switch-entrance {
      animation: none;
    }
    .note-cover-reveal-window {
      transition: none;
    }
    img {
      transform: none;
      transition: none;
    }
  }
}
</style>
