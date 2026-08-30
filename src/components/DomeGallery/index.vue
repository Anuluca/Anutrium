<template>
  <div
    ref="rootRef"
    class="dome-gallery"
    :class="{
      'is-preview-open': preview && previewPhase !== 'closing',
    }"
    :style="{
      '--dome-segments-x': props.segments,
      '--dome-segments-y': props.segments,
    }"
  >
    <main ref="mainRef" class="dome-gallery__main">
      <div class="dome-gallery__stage">
        <div ref="sphereRef" class="dome-gallery__sphere">
          <div
            v-for="item in items"
            :key="`${item.x},${item.y},${item.index}`"
            class="dome-gallery__tile-wrap"
            :style="getTileWrapStyle(item)"
          >
            <button
              class="dome-gallery__tile"
              type="button"
              :aria-label="item.title || 'Open image'"
              @click.stop="handleTileClick(item, $event)"
            >
              <img
                :src="item.src"
                :alt="item.title"
                :draggable="false"
                decoding="async"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="dome-gallery__radial-overlay" aria-hidden="true" />
      <div class="dome-gallery__blur-overlay" aria-hidden="true" />
      <div class="dome-gallery__edge-overlay dome-gallery__edge-overlay--top" />
      <div
        class="dome-gallery__edge-overlay dome-gallery__edge-overlay--bottom"
      />

      <div
        v-if="preview"
        class="dome-gallery__viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="preview.title || 'Image preview'"
        @click="closePreview"
      >
        <div class="dome-gallery__viewer-scrim" aria-hidden="true" />
        <div
          class="dome-gallery__preview-image"
          :style="previewStyle"
          @click.stop
        >
          <img :src="preview.src" :alt="preview.title" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { setSmoothScrollLocked } from '@/utils/smoothScroll'

interface DomeGalleryImage {
  src: string
  title?: string
  alt?: string
}

interface DomeGalleryProps {
  images?: (string | DomeGalleryImage)[]
  fit?: number
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height'
  minRadius?: number
  maxRadius?: number
  padFactor?: number
  overlayBlurColor?: string
  maxVerticalRotationDeg?: number
  dragSensitivity?: number
  segments?: number
  grayscale?: boolean
  openedImageWidth?: string
  openedImageHeight?: string
  autoRotateSpeed?: number
  entranceDelay?: number
  entranceDuration?: number
  entranceRotationDeg?: number
}

interface TileItem {
  index: number
  x: number
  y: number
  sizeX: number
  sizeY: number
  src: string
  title: string
}

interface PreviewRect {
  left: number
  top: number
  width: number
  height: number
}

interface PreviewItem {
  src: string
  title: string
  startRect: PreviewRect
  targetRect: PreviewRect
}

const props = withDefaults(defineProps<DomeGalleryProps>(), {
  images: () => [],
  fit: 0.5,
  fitBasis: 'auto',
  minRadius: 420,
  maxRadius: Infinity,
  padFactor: 0.25,
  overlayBlurColor: 'transparent',
  maxVerticalRotationDeg: 1,
  dragSensitivity: 20,
  segments: 40,
  grayscale: false,
  openedImageWidth: '250px',
  openedImageHeight: '350px',
  autoRotateSpeed: 1.2,
  entranceDelay: 0,
  entranceDuration: 0,
  entranceRotationDeg: 0,
})

const rootRef = ref<HTMLDivElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const sphereRef = ref<HTMLDivElement | null>(null)
const radius = ref(0)
const viewerPad = ref(0)
const openedImage = ref<DomeGalleryImage | null>(null)
const preview = ref<PreviewItem | null>(null)
const previewPhase = ref<'opening' | 'opened' | 'closing'>('opening')

const rotation = { x: 0, y: 0 }
const startRotation = { x: 0, y: 0 }
let startPosition: { x: number; y: number } | null = null
let isDragging = false
let didMove = false
let lastDragEndAt = 0
let inertiaFrame: number | null = null
let autoRotationFrame: number | null = null
let lastAutoRotationTime = 0
let prefersReducedMotion = false
let entranceStartTime = 0
let isEntranceComplete = true
let resizeObserver: ResizeObserver | null = null
let focusedTile: HTMLElement | null = null
let previewCloseTimer: number | null = null
const scrollLockKey = 'dome-gallery-preview'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const wrapAngle = (value: number) => {
  const angle = (((value + 180) % 360) + 360) % 360
  return angle - 180
}

const normalizeImage = (image: string | DomeGalleryImage): DomeGalleryImage =>
  typeof image === 'string' ? { src: image } : image

const items = computed<TileItem[]>(() => {
  const xColumns = Array.from(
    { length: props.segments },
    (_, index) => -37 + index * 2
  )
  const evenRows = [-4, -2, 0, 2, 4]
  const oddRows = [-3, -1, 1, 3, 5]
  const coordinates = xColumns.flatMap((x, column) => {
    const rows = column % 2 === 0 ? evenRows : oddRows
    return rows.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }))
  })
  const imagePool = props.images?.map(normalizeImage) ?? []

  if (!imagePool.length) return []

  return coordinates.map((coordinate, index) => {
    const image = imagePool[index % imagePool.length]
    return {
      ...coordinate,
      index,
      src: image.src,
      title: image.title || image.alt || '',
    }
  })
})

const getTileWrapStyle = (item: TileItem) => {
  const unit = 360 / props.segments / 2
  const tileWidth = (Math.PI * radius.value) / props.segments
  const tileHeight = tileWidth

  return {
    width: `${tileWidth * item.sizeX}px`,
    height: `${tileHeight * item.sizeY}px`,
    transform: `rotateY(${unit * (item.x + (item.sizeX - 1) / 2)}deg) rotateX(${
      unit * (item.y - (item.sizeY - 1) / 2)
    }deg) translateZ(${radius.value}px)`,
  }
}

const parseLength = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const previewStyle = computed(() => {
  if (!preview.value) return {}
  const rect =
    previewPhase.value === 'opening'
      ? preview.value.startRect
      : preview.value.targetRect

  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    opacity: previewPhase.value === 'opened' ? 1 : 0,
  }
})

const applySphereTransform = () => {
  if (!sphereRef.value) return
  sphereRef.value.style.transform = `translateZ(${-radius.value}px) rotateX(${
    rotation.x
  }deg) rotateY(${rotation.y}deg)`
}

const startAutoRotation = () => {
  if (autoRotationFrame !== null) return

  const step = (timestamp: number) => {
    const elapsed = Math.min(100, timestamp - lastAutoRotationTime)
    lastAutoRotationTime = timestamp

    if (
      !prefersReducedMotion &&
      !isDragging &&
      !preview.value &&
      inertiaFrame === null &&
      elapsed > 0
    ) {
      if (!isEntranceComplete) {
        if (timestamp >= entranceStartTime) {
          const progress = clamp(
            (timestamp - entranceStartTime) /
              Math.max(1, props.entranceDuration),
            0,
            1
          )
          const easedProgress = 1 - Math.pow(1 - progress, 3)
          rotation.y = -props.entranceRotationDeg * (1 - easedProgress)
          isEntranceComplete = progress >= 1
        }
      } else {
        rotation.y = wrapAngle(
          rotation.y + (props.autoRotateSpeed * elapsed) / 1000
        )
      }
      applySphereTransform()
    }

    autoRotationFrame = window.requestAnimationFrame(step)
  }

  lastAutoRotationTime = performance.now()
  autoRotationFrame = window.requestAnimationFrame(step)
}

const stopAutoRotation = () => {
  if (autoRotationFrame === null) return
  window.cancelAnimationFrame(autoRotationFrame)
  autoRotationFrame = null
}

const syncRadius = () => {
  const root = rootRef.value
  if (!root) return

  const bounds = root.getBoundingClientRect()
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  const minDimension = Math.min(width, height)
  const aspect = width / height
  let basis = minDimension

  if (props.fitBasis === 'width') basis = width
  else if (props.fitBasis === 'height') basis = height
  else if (props.fitBasis === 'max') basis = Math.max(width, height)
  else if (props.fitBasis === 'auto' && aspect >= 1.3) basis = width

  radius.value = clamp(
    Math.min(basis * props.fit, height * 1.35),
    props.minRadius,
    props.maxRadius
  )
  viewerPad.value = Math.max(8, Math.round(minDimension * props.padFactor))
  root.style.setProperty('--dome-radius', `${radius.value}px`)
  root.style.setProperty('--dome-viewer-pad', `${viewerPad.value}px`)
  root.style.setProperty('--dome-overlay-color', props.overlayBlurColor)
  root.style.setProperty(
    '--dome-image-filter',
    props.grayscale ? 'grayscale(1)' : 'none'
  )
  applySphereTransform()
}

const stopInertia = () => {
  if (inertiaFrame === null) return
  window.cancelAnimationFrame(inertiaFrame)
  inertiaFrame = null
}

const startInertia = (velocityX: number, velocityY: number) => {
  stopInertia()
  let x = clamp(velocityX, -1.4, 1.4) * 80
  let y = clamp(velocityY, -1.4, 1.4) * 80
  let frames = 0

  const step = () => {
    x *= 0.965
    y *= 0.965
    if ((Math.abs(x) < 0.02 && Math.abs(y) < 0.02) || frames++ > 240) {
      inertiaFrame = null
      return
    }

    rotation.x = clamp(
      rotation.x - y / 200,
      -props.maxVerticalRotationDeg,
      props.maxVerticalRotationDeg
    )
    rotation.y = wrapAngle(rotation.y + x / 200)
    applySphereTransform()
    inertiaFrame = window.requestAnimationFrame(step)
  }

  inertiaFrame = window.requestAnimationFrame(step)
}

const getPointerPosition = (event: PointerEvent) => ({
  x: event.clientX,
  y: event.clientY,
})

const handlePointerDown = (event: PointerEvent) => {
  if (openedImage.value) return
  stopInertia()
  isDragging = true
  didMove = false
  startRotation.x = rotation.x
  startRotation.y = rotation.y
  startPosition = getPointerPosition(event)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging || !startPosition || openedImage.value) return

  const position = getPointerPosition(event)
  const deltaX = position.x - startPosition.x
  const deltaY = position.y - startPosition.y
  if (!didMove && deltaX * deltaX + deltaY * deltaY > 16) didMove = true

  rotation.x = clamp(
    startRotation.x - deltaY / props.dragSensitivity,
    -props.maxVerticalRotationDeg,
    props.maxVerticalRotationDeg
  )
  rotation.y = wrapAngle(startRotation.y + deltaX / props.dragSensitivity)
  applySphereTransform()
}

const handlePointerEnd = (event: PointerEvent) => {
  if (!isDragging) return
  isDragging = false

  if (didMove && startPosition) {
    const position = getPointerPosition(event)
    const velocityX =
      ((position.x - startPosition.x) / props.dragSensitivity) * 0.02
    const velocityY =
      ((position.y - startPosition.y) / props.dragSensitivity) * 0.02
    startInertia(velocityX, velocityY)
    lastDragEndAt = performance.now()
  }

  didMove = false
  startPosition = null
}

const openPreview = (item: TileItem, tile: HTMLElement) => {
  const root = rootRef.value
  if (!root || preview.value) return

  const rootRect = root.getBoundingClientRect()
  const tileRect = tile.getBoundingClientRect()
  const width = parseLength(props.openedImageWidth, 250)
  const height = parseLength(props.openedImageHeight, 350)
  const startRect = {
    left: tileRect.left - rootRect.left,
    top: tileRect.top - rootRect.top,
    width: tileRect.width,
    height: tileRect.height,
  }
  const targetRect = {
    left: Math.max(0, (rootRect.width - width) / 2),
    top: Math.max(0, (rootRect.height - height) / 2),
    width,
    height,
  }

  focusedTile = tile
  focusedTile.style.visibility = 'hidden'
  openedImage.value = item
  previewPhase.value = 'opening'
  preview.value = {
    src: item.src,
    title: item.title,
    startRect,
    targetRect,
  }
  setSmoothScrollLocked(scrollLockKey, true)

  void nextTick(() => {
    window.requestAnimationFrame(() => {
      if (preview.value) previewPhase.value = 'opened'
    })
  })
}

const handleTileClick = (item: TileItem, event: MouseEvent) => {
  if (performance.now() - lastDragEndAt < 100) {
    event.preventDefault()
    return
  }

  event.preventDefault()
  openPreview(item, event.currentTarget as HTMLElement)
}

const closePreview = () => {
  if (!preview.value || previewPhase.value === 'closing') return
  previewPhase.value = 'closing'

  if (previewCloseTimer !== null) window.clearTimeout(previewCloseTimer)
  previewCloseTimer = window.setTimeout(() => {
    previewCloseTimer = null
    focusedTile?.style.removeProperty('visibility')
    focusedTile = null
    preview.value = null
    openedImage.value = null
    setSmoothScrollLocked(scrollLockKey, false)
  }, 320)
}

const handlePreviewKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closePreview()
}

onMounted(() => {
  const root = rootRef.value
  const main = mainRef.value
  if (!root || !main) return

  resizeObserver = new ResizeObserver(syncRadius)
  resizeObserver.observe(root)
  main.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerup', handlePointerEnd)
  window.addEventListener('pointercancel', handlePointerEnd)
  window.addEventListener('keydown', handlePreviewKeydown)
  prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  entranceStartTime = performance.now() + props.entranceDelay
  isEntranceComplete =
    prefersReducedMotion ||
    props.entranceRotationDeg === 0 ||
    props.entranceDuration === 0
  if (!isEntranceComplete) rotation.y = -props.entranceRotationDeg
  syncRadius()
  startAutoRotation()
})

onUnmounted(() => {
  stopInertia()
  stopAutoRotation()
  if (previewCloseTimer !== null) window.clearTimeout(previewCloseTimer)
  focusedTile?.style.removeProperty('visibility')
  setSmoothScrollLocked(scrollLockKey, false)
  resizeObserver?.disconnect()
  const main = mainRef.value
  main?.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerEnd)
  window.removeEventListener('pointercancel', handlePointerEnd)
  window.removeEventListener('keydown', handlePreviewKeydown)
})

watch(() => props, syncRadius, { deep: true })
</script>

<style lang="less" scoped>
.dome-gallery {
  --dome-segments-x: 35;
  --dome-segments-y: 35;
  --dome-radius: 420px;
  --dome-viewer-pad: 24px;
  --dome-overlay-color: transparent;
  --dome-image-filter: none;

  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #fff;
}

.dome-gallery__main {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
}

.dome-gallery__stage {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  perspective: calc(var(--dome-radius) * 2);
  perspective-origin: 50% 50%;
  contain: layout paint size;
  transition: filter 320ms ease;
}

.dome-gallery.is-preview-open .dome-gallery__stage {
  filter: brightness(0.72) blur(7px);
}

.dome-gallery__sphere {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.dome-gallery__tile-wrap {
  position: absolute;
  top: -999px;
  right: -999px;
  bottom: -999px;
  left: -999px;
  margin: auto;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  transition: transform 300ms ease;
}

.dome-gallery__tile {
  position: absolute;
  inset: 10px;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: var(--bg-color, #000);
  overflow: hidden;
  transform: translateZ(0);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px solid #e23456;
    outline-offset: 3px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.4;
    filter: contrast(0.72) saturate(0.52) var(--dome-image-filter);
    pointer-events: none;
    backface-visibility: hidden;
    transition: filter 240ms ease, opacity 240ms ease, transform 240ms ease;
  }

  &:hover img,
  &:focus-visible img {
    opacity: 0.8;
    filter: none;
    transform: scale(1.04);
  }
}

.dome-gallery__radial-overlay,
.dome-gallery__blur-overlay,
.dome-gallery__edge-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.dome-gallery__viewer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: auto;
}

.dome-gallery__viewer-scrim {
  position: absolute;
  inset: 0;
  background: transparent;
  cursor: zoom-out;
}

.dome-gallery__preview-image {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  border-radius: 30px;
  background: var(--bg-color, #000);
  transform-origin: top left;
  transition: left 300ms ease, top 300ms ease, width 300ms ease,
    height 300ms ease, opacity 300ms ease;
  will-change: left, top, width, height, opacity;
  pointer-events: auto;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 1;
    filter: none;
  }
}

.dome-gallery__radial-overlay {
  background: radial-gradient(
    circle,
    rgba(235, 235, 235, 0) 65%,
    var(--dome-overlay-color) 100%
  );
}

.dome-gallery__blur-overlay {
  -webkit-mask-image: radial-gradient(
    circle,
    rgba(235, 235, 235, 0) 70%,
    var(--dome-overlay-color) 90%
  );
  mask-image: radial-gradient(
    circle,
    rgba(235, 235, 235, 0) 70%,
    var(--dome-overlay-color) 90%
  );
  backdrop-filter: blur(3px);
}

.dome-gallery__edge-overlay {
  z-index: 5;
  height: 96px;
  inset: 0 0 auto;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--dome-overlay-color)
  );

  &--top {
    transform: rotate(180deg);
  }

  &--bottom {
    top: auto;
  }
}

@media (max-width: 768px) {
  .dome-gallery__tile {
    inset: 7px;
  }

  .dome-gallery__edge-overlay {
    height: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dome-gallery__tile-wrap,
  .dome-gallery__tile img {
    transition-duration: 0.01ms;
  }
}
</style>
