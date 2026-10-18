<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  useDocumentVisibility,
  useElementVisibility,
  usePreferredReducedMotion,
  useResizeObserver,
} from '@vueuse/core'
import { gsap } from 'gsap'

import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import type { FloraMedia } from '@/utils/floratriumMedia'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

const props = defineProps<{ items: FloraMedia[]; title: string }>()
const viewport = ref<HTMLElement | null>(null)
const viewerIndex = ref<number | null>(null)
const readyUrls = ref(new Set<string>())
const visibility = useDocumentVisibility()
const inView = useElementVisibility(viewport)
const reducedMotion = usePreferredReducedMotion()
const urls = computed(() => props.items.map((item) => item.url))
const photos = computed(() =>
  props.items.map((item) => ({
    ...item,
    thumbnail: getCardThumbnailUrl(item.url),
    mobileThumbnail: getCardMobileThumbnailUrl(item.url),
  }))
)
const running = computed(
  () =>
    visibility.value === 'visible' &&
    inView.value &&
    reducedMotion.value !== 'reduce' &&
    viewerIndex.value === null &&
    photos.value.length > 1 &&
    readyUrls.value.size >= photos.value.length
)
const positions = new Map<number, HTMLElement>()
const cards = new Map<number, HTMLElement>()
const animations: Animation[] = []
const itemDuration = 4000
const playhead = { value: 0 }
let target = 0
let tween: gsap.core.Tween | undefined
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let pointerFrame: number | undefined
let bounds: DOMRect | undefined
let pointer: { x: number; y: number } | undefined
let drag:
  | { x: number; y: number; position: number; pointerId: number }
  | undefined
let dragged = false
let geometry = {
  height: 0,
  x: 0,
  y: 0,
  stepX: 0,
  lower: -1.5,
  leftSlot: -1,
  rightSlot: 3,
}
const modulo = (value: number, length: number) =>
  ((value % length) + length) % length
const duration = () => photos.value.length * itemDuration
const maxSlot = () => photos.value.length + geometry.lower
const currentPosition = () => {
  const time = Number(animations[0]?.currentTime || 0)
  return time / itemDuration - maxSlot()
}
const syncPlayback = () => {
  for (const animation of animations) {
    if (running.value && !tween && !drag) animation.play()
    else animation.pause()
  }
}
const updateMagnet = () => {
  const position = currentPosition()
  const { x, y, stepX } = geometry
  for (const [index, card] of cards) {
    let scale = 1
    if (pointer && reducedMotion.value !== 'reduce') {
      const relative =
        maxSlot() -
        modulo((maxSlot() - index + position) * itemDuration, duration()) /
          itemDuration
      // 水平队列没有纵深缩放，直接计算中心，避免逐张读取 DOM 几何。
      const distance = Math.hypot(
        pointer.x - (x + relative * stepX),
        pointer.y - y
      )
      scale += Math.max(0, 1 - distance / 240) ** 2 * 0.4
    }
    card.style.setProperty('--magnet-scale', String(scale))
  }
}
const seek = (position: number) => {
  playhead.value = position
  const total = duration()
  if (!total) return
  animations.forEach((animation, index) => {
    animation.currentTime = modulo(
      (maxSlot() - index + position) * itemDuration,
      total
    )
  })
  updateMagnet()
}
const moveBy = (amount: number) => {
  if (!animations.length || reducedMotion.value === 'reduce') return
  if (!tween) {
    playhead.value = currentPosition()
    target = playhead.value
  }
  target += amount
  tween?.kill()
  animations.forEach((animation) => animation.pause())
  tween = gsap.to(playhead, {
    value: target,
    duration: 0.65,
    ease: 'power3.out',
    onUpdate: () => seek(playhead.value),
    onComplete: () => {
      tween = undefined
      syncPlayback()
    },
  })
}
const rebuild = () => {
  if (!viewport.value) return
  const position = animations.length ? currentPosition() : 0
  tween?.kill()
  tween = undefined
  animations.splice(0).forEach((animation) => animation.cancel())
  bounds = viewport.value.getBoundingClientRect()
  const width = viewport.value.clientWidth
  const height = viewport.value.clientHeight
  const cardHeight = Math.min(height * 0.92, 320, width * 0.86)
  const cardWidth = Math.min(cardHeight * 0.75, width * 0.46)
  const x = width * 0.36
  // 预留左右边距，窄视窗也保留至少两个照片位；悬停放大仍可溢出容器。
  const edgeInset = cardWidth * 0.46 + Math.min(24, Math.max(8, width * 0.03))
  const stepX = Math.min(
    cardWidth * 0.68,
    Math.max(1, (width - 2 * edgeInset) / 2.2)
  )
  // 左侧延后 0.4 个照片位退场，让下一张先接上；已允许溢出，不在容器内部提前消失。
  const leftSlot = (edgeInset - x) / stepX - 0.4
  const rightSlot = (width - edgeInset - x) / stepX
  geometry = {
    height,
    x,
    y: height * 0.5,
    stepX,
    lower: leftSlot - 1,
    leftSlot,
    rightSlot,
  }
  viewport.value.style.setProperty('--card-width', `${cardWidth}px`)
  viewport.value.style.setProperty('--card-height', `${cardHeight}px`)
  viewport.value.style.setProperty('--surfer-x', `${geometry.x}px`)
  viewport.value.style.setProperty('--surfer-y', `${geometry.y}px`)
  if (reducedMotion.value === 'reduce' || photos.value.length < 2) return
  // 每张卡片只有一个原生合成动画；首尾在视口外渐隐后循环，无复制照片、逐帧 Vue 更新或长页面占位。
  for (const [index, element] of positions) {
    const upper = maxSlot()
    const lower = geometry.lower
    const fade = Math.min(0.55, (rightSlot - leftSlot) / 3)
    const exitFade = Math.min(0.4, fade)
    const samples = [
      ...new Set([
        upper,
        rightSlot,
        rightSlot - fade,
        leftSlot + exitFade,
        leftSlot,
        lower,
      ]),
    ]
      .filter((relative) => relative >= lower && relative <= upper)
      .sort((a, b) => b - a)
    const keyframes = samples.map((relative) => ({
      offset: (upper - relative) / photos.value.length,
      zIndex: Math.round((upper - relative) * 100),
      visibility:
        relative <= leftSlot || relative >= rightSlot ? 'hidden' : 'visible',
      transform: `translate3d(${relative * geometry.stepX}px, 0px, 0px)`,
      opacity: Math.max(
        0,
        Math.min(
          1,
          (rightSlot - relative) / fade,
          (relative - leftSlot) / exitFade
        )
      ),
    }))
    const animation = element.animate(keyframes, {
      duration: duration(),
      iterations: Infinity,
      easing: 'linear',
    })
    animation.pause()
    animations[index] = animation
  }
  seek(position)
  syncPlayback()
}
useResizeObserver(viewport, () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(rebuild, 100)
})
watch(running, syncPlayback)
watch(reducedMotion, rebuild)
watch(
  () => props.items,
  async () => {
    viewerIndex.value = null
    readyUrls.value = new Set()
    await nextTick()
    rebuild()
  }
)
const markReady = (url: string) => {
  if (urls.value.includes(url)) readyUrls.value.add(url)
}
const onWheel = (event: WheelEvent) => {
  if (reducedMotion.value === 'reduce') return
  event.preventDefault()
  event.stopPropagation()
  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY
  moveBy(
    (delta *
      (event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
        ? geometry.height
        : 1)) /
      600
  )
}
const onPointerEnter = () => {
  bounds = viewport.value?.getBoundingClientRect()
}
const onPointerMove = (event: PointerEvent) => {
  if (drag) {
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 7) dragged = true
    if (dragged) {
      viewport.value?.setPointerCapture(event.pointerId)
      seek(drag.position - (Math.abs(dx) > Math.abs(dy) ? dx : dy) / 220)
    }
    return
  }
  if (event.pointerType === 'touch' || !bounds) return
  pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  if (pointerFrame !== undefined) return
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = undefined
    updateMagnet()
  })
}
const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0 || reducedMotion.value === 'reduce') return
  tween?.kill()
  tween = undefined
  animations.forEach((animation) => animation.pause())
  dragged = false
  drag = {
    x: event.clientX,
    y: event.clientY,
    position: currentPosition(),
    pointerId: event.pointerId,
  }
}
const endDrag = () => {
  drag = undefined
  syncPlayback()
}
const onPointerLeave = () => {
  pointer = undefined
  updateMagnet()
  if (!drag) syncPlayback()
}
const onClick = (event: MouseEvent) => {
  if (dragged) {
    event.preventDefault()
    event.stopImmediatePropagation()
    dragged = false
  }
}
const onKeydown = (event: KeyboardEvent) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key))
    return
  if (reducedMotion.value === 'reduce') return
  event.preventDefault()
  event.stopPropagation()
  moveBy(event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1)
}
onMounted(() => nextTick(rebuild))
onBeforeUnmount(() => {
  tween?.kill()
  clearTimeout(resizeTimer)
  if (pointerFrame !== undefined) cancelAnimationFrame(pointerFrame)
  // Vue 的卸载钩子早于离场动画结束；先固化位置，取消原生动画时照片才不会跳回原点。
  for (const element of positions.values()) {
    const style = getComputedStyle(element)
    element.style.transform = style.transform
    element.style.opacity = style.opacity
    element.style.zIndex = style.zIndex
  }
  animations.forEach((animation) => animation.cancel())
})
</script>

<template>
  <div
    class="flora-album-strip no-rem"
    :class="{
      'is-running': running,
      'is-reduced-motion': reducedMotion === 'reduce',
    }"
  >
    <div
      ref="viewport"
      class="flora-album-strip__viewport"
      data-lenis-prevent
      role="region"
      :aria-label="title"
      tabindex="0"
      @wheel="onWheel"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @click.capture="onClick"
      @keydown="onKeydown"
    >
      <div class="flora-album-strip__track flora-album-strip__group">
        <div
          v-for="(item, index) in photos"
          :key="item.url"
          :ref="(element) => element ? positions.set(index, element as HTMLElement) : positions.delete(index)"
          class="flora-album-strip__position"
        >
          <button
            :ref="(element) => element ? cards.set(index, element as HTMLElement) : cards.delete(index)"
            class="flora-album-strip__photo"
            type="button"
            :aria-label="`${title} ${index + 1}`"
            @click.stop="viewerIndex = index"
          >
            <picture>
              <source
                media="(max-width: 768px)"
                :srcset="item.mobileThumbnail"
              />
              <img
                :src="item.thumbnail"
                :alt="`${title} ${index + 1}`"
                decoding="async"
                draggable="false"
                @load="markReady(item.url)"
                @error="markReady(item.url)"
              />
            </picture>
          </button>
        </div>
      </div>
    </div>
    <SafeImageViewer
      v-if="viewerIndex !== null"
      :url-list="urls"
      :initial-index="viewerIndex"
      @close="viewerIndex = null"
    />
  </div>
</template>

<style scoped lang="less">
.flora-album-strip.no-rem {
  position: relative;
  z-index: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 20px;

  .flora-album-strip__viewport {
    position: relative;
    height: 100%;
    overflow: visible;
    touch-action: none;
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
    &:focus-visible {
      outline: 1px solid currentColor;
      outline-offset: -2px;
    }
  }
  .flora-album-strip__track {
    position: absolute;
    left: var(--surfer-x, 36%);
    top: var(--surfer-y, 50%);
    width: 0;
    height: 0;
  }
  .flora-album-strip__position {
    position: absolute;
    width: 0;
    height: 0;
    transform-style: preserve-3d;
    will-change: transform, opacity;
  }
  .flora-album-strip__photo {
    position: relative;
    display: block;
    width: var(--card-width, 180px);
    height: var(--card-height, 240px);
    padding: 0;
    border: 0;
    background: #151515;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
    cursor: zoom-in;
    // 每张照片独立透视，保留三维倾斜，避免整排产生近大远小。
    transform: translate(-50%, -50%) perspective(1400px) rotateY(-35deg)
      scale(var(--magnet-scale, 1));
    transform-origin: center;
    backface-visibility: hidden;
    transition: transform 400ms cubic-bezier(0.22, 1.2, 0.36, 1);
    &:focus-visible {
      outline: 2px solid #fffff4 !important;
      outline-offset: 4px;
    }
  }
  picture,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
  img {
    object-fit: cover;
    filter: brightness(0.85);
    transition: filter 300ms ease;
    user-select: none;
  }
  .flora-album-strip__photo:hover img,
  .flora-album-strip__photo:focus-visible img {
    filter: brightness(1);
  }

  &.is-reduced-motion {
    .flora-album-strip__viewport {
      overflow-x: auto;
      touch-action: pan-x;
      cursor: auto;
      perspective: none !important;
    }
    .flora-album-strip__track {
      position: relative;
      top: auto;
      left: auto;
      display: flex;
      gap: 12px;
      width: max-content;
      height: 100%;
      align-items: center;
    }
    .flora-album-strip__position {
      position: relative;
      flex: none;
      width: var(--card-width);
      height: 90%;
      will-change: auto;
    }
    .flora-album-strip__photo {
      width: 100%;
      height: 100%;
      transform: none;
      transition: none;
    }
    img {
      transition: none;
    }
  }
}
</style>
