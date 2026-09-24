<template>
  <div
    ref="rootRef"
    class="dome-gallery"
    :data-motion-active="props.active ? 'true' : 'false'"
    :data-segment-count="segmentCount"
    :data-tile-count="items.length"
    :class="{
      'is-preview-open': preview && previewPhase !== 'closing',
    }"
  >
    <main class="dome-gallery__main" @pointerdown.passive="handlePointerDown">
      <div class="dome-gallery__stage">
        <div ref="sphereRef" class="dome-gallery__sphere">
          <div
            class="dome-gallery__auto-rotation"
            :class="{ 'is-paused': isAutoRotationPaused }"
            :style="autoRotationStyle"
          >
            <div
              v-for="item in items"
              :key="`${item.x},${item.y},${item.index}`"
              class="dome-gallery__tile-wrap"
              :style="item.wrapStyle"
            >
              <button
                class="dome-gallery__tile"
                type="button"
                :aria-label="item.title || 'Open image'"
                @click.stop="handleTileClick(item, $event)"
              >
                <img
                  :src="item.thumbnailSrc"
                  :alt="item.title"
                  :draggable="false"
                  decoding="async"
                  loading="lazy"
                  width="200"
                  height="200"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="dome-gallery__radial-overlay" aria-hidden="true" />
      <div
        v-if="props.overlayBlurColor !== 'transparent'"
        class="dome-gallery__blur-overlay"
        aria-hidden="true"
      />
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
          :class="{ 'is-clickable': preview.link }"
          :style="previewStyle"
          :aria-label="
            preview.link ? `Open ${preview.title || 'image'}` : undefined
          "
          :role="preview.link ? 'link' : undefined"
          :tabindex="preview.link ? 0 : undefined"
          @click.stop="handlePreviewImageClick"
          @keydown.enter.prevent.stop="handlePreviewImageClick"
        >
          <img
            :src="preview.src"
            :alt="preview.title"
            loading="eager"
            decoding="async"
          />
          <span v-if="preview.title" class="dome-gallery__preview-caption">
            {{ preview.title }}
          </span>
          <el-icon
            v-if="preview.link"
            class="dome-gallery__preview-link-icon"
            aria-hidden="true"
          >
            <Link />
          </el-icon>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'
import { Link } from '@element-plus/icons-vue'

import { getHomeThumbnailUrl } from '@/utils/imageVariant'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

interface DomeGalleryImage {
  src: string
  title?: string
  alt?: string
  link?: string
}

interface DomeGalleryProps {
  active?: boolean
  images?: (string | DomeGalleryImage)[]
  fit?: number
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height'
  minRadius?: number
  maxRadius?: number
  overlayBlurColor?: string
  maxVerticalRotationDeg?: number
  dragSensitivity?: number
  segments?: number
  compactSegments?: number
  grayscale?: boolean
  openedImageWidth?: string
  openedImageHeight?: string
  autoRotateSpeed?: number
  entranceDelay?: number
  entranceDuration?: number
  entranceRotationSpeed?: number
  previewViewportCentered?: boolean
}

interface TileItem {
  index: number
  x: number
  y: number
  sizeX: number
  sizeY: number
  src: string
  thumbnailSrc: string
  title: string
  link?: string
  wrapStyle: CSSProperties
}

interface TileCoordinate {
  x: number
  y: number
  sizeX: number
  sizeY: number
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
  link?: string
  startRect: PreviewRect
  targetRect: PreviewRect
}

const props = withDefaults(defineProps<DomeGalleryProps>(), {
  active: true,
  images: () => [],
  fit: 0.5,
  fitBasis: 'auto',
  minRadius: 420,
  maxRadius: Infinity,
  overlayBlurColor: 'transparent',
  maxVerticalRotationDeg: 1,
  dragSensitivity: 20,
  segments: 34,
  compactSegments: 28,
  grayscale: false,
  openedImageWidth: '250px',
  openedImageHeight: '350px',
  autoRotateSpeed: 1.2,
  entranceDelay: 0,
  entranceDuration: 0,
  entranceRotationSpeed: 0,
  previewViewportCentered: false,
})
const router = useRouter()

const rootRef = ref<HTMLDivElement | null>(null)
const sphereRef = ref<HTMLDivElement | null>(null)
const radius = ref(0)
const preview = ref<PreviewItem | null>(null)
const previewPhase = ref<'opening' | 'opened' | 'closing'>('opening')
const isCompactDensity = ref(
  typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)')
      .matches
)
const isDragActive = ref(false)
const isInertiaActive = ref(false)
const isAutoRotationPaused = computed(
  () =>
    !props.active ||
    prefersReducedMotion.value ||
    isDragActive.value ||
    isInertiaActive.value ||
    !!preview.value
)
const autoRotationStyle = computed(() => ({
  '--dome-auto-rotation-delay': `${props.entranceDelay}ms`,
  '--dome-entry-rotation-duration': `${Math.max(0, props.entranceDuration)}ms`,
  '--dome-entry-rotation': `${
    ((props.entranceRotationSpeed + props.autoRotateSpeed) / 2) *
    (Math.max(0, props.entranceDuration) / 1000)
  }deg`,
  '--dome-auto-rotation-duration': `${Math.max(
    1,
    360 / Math.max(0.01, Math.abs(props.autoRotateSpeed))
  )}s`,
}))

const rotation = { x: 0, y: 0 }
const startRotation = { x: 0, y: 0 }
let startPosition: { x: number; y: number } | null = null
let isDragging = false
let didMove = false
let lastDragEndAt = 0
let inertiaFrame: number | null = null
const prefersReducedMotion = ref(false)
let dragFrame: number | null = null
let pendingDragPosition: { x: number; y: number } | null = null
let resizeObserver: ResizeObserver | null = null
let compactDensityQuery: MediaQueryList | null = null
let focusedTile: HTMLElement | null = null
let previewCloseTimer: number | null = null
let areDragListenersActive = false
let isPreviewKeyListenerActive = false
let activePointerId: number | null = null
const scrollLockKey = 'dome-gallery-preview'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const wrapAngle = (value: number) => {
  const angle = (((value + 180) % 360) + 360) % 360
  return angle - 180
}

const normalizeImage = (image: string | DomeGalleryImage): DomeGalleryImage =>
  typeof image === 'string' ? { src: image } : image
const normalizedImagePool = computed(() =>
  props.images.map(normalizeImage).map((image) => ({
    ...image,
    thumbnailSrc: getHomeThumbnailUrl(image.src),
  }))
)

const segmentCount = computed(() => {
  const regularSegments = Number.isFinite(props.segments)
    ? Math.floor(props.segments)
    : 34
  const compactSegments = Number.isFinite(props.compactSegments)
    ? Math.floor(props.compactSegments)
    : 28
  const configuredSegments = isCompactDensity.value
    ? Math.min(regularSegments, compactSegments)
    : regularSegments

  return Math.max(8, configuredSegments)
})

const tileCoordinates = computed<TileCoordinate[]>(() => {
  const segments = segmentCount.value
  const xColumns = Array.from(
    { length: segments },
    (_, index) => -(segments - 3) + index * 2
  )
  const evenRows = isCompactDensity.value ? [-2, 0, 2] : [-3, -1, 1, 3]
  const oddRows = isCompactDensity.value ? [-1, 1, 3] : [-2, 0, 2]
  return xColumns.flatMap((x, column) => {
    const rows = column % 2 === 0 ? evenRows : oddRows
    return rows.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }))
  })
})

const items = computed<TileItem[]>(() => {
  const segments = segmentCount.value
  const imagePool = normalizedImagePool.value

  if (!imagePool.length) return []

  const unit = 360 / segments / 2
  const tileUnit = (Math.PI * radius.value) / segments
  return tileCoordinates.value.map((coordinate, index) => {
    const image = imagePool[index % imagePool.length]
    return {
      ...coordinate,
      index,
      src: image.src,
      thumbnailSrc: image.thumbnailSrc,
      title: image.title || image.alt || '',
      link: image.link,
      wrapStyle: {
        width: `${tileUnit * coordinate.sizeX}px`,
        height: `${tileUnit * coordinate.sizeY}px`,
        transform: `rotateY(${
          unit * (coordinate.x + (coordinate.sizeX - 1) / 2)
        }deg) rotateX(${
          unit * (coordinate.y - (coordinate.sizeY - 1) / 2)
        }deg) translateZ(${radius.value}px)`,
      },
    }
  })
})

const parseLength = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const getRenderedScale = (renderedSize: number, layoutSize: number) => {
  const scale = renderedSize / Math.max(1, layoutSize)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

const getPreviewGeometry = (
  root: HTMLElement,
  tile: HTMLElement,
  width: number,
  height: number
) => {
  const rootRect = root.getBoundingClientRect()
  const tileRect = tile.getBoundingClientRect()

  if (!props.previewViewportCentered) {
    return {
      startRect: {
        left: tileRect.left - rootRect.left,
        top: tileRect.top - rootRect.top,
        width: tileRect.width,
        height: tileRect.height,
      },
      targetRect: {
        left: Math.max(0, (rootRect.width - width) / 2),
        top: Math.max(0, (rootRect.height - height) / 2),
        width,
        height,
      },
    }
  }

  const scaleX = getRenderedScale(rootRect.width, root.clientWidth)
  const scaleY = getRenderedScale(rootRect.height, root.clientHeight)

  return {
    startRect: {
      left: (tileRect.left - rootRect.left) / scaleX,
      top: (tileRect.top - rootRect.top) / scaleY,
      width: tileRect.width / scaleX,
      height: tileRect.height / scaleY,
    },
    targetRect: {
      left: (window.innerWidth / 2 - rootRect.left - width / 2) / scaleX,
      top: (window.innerHeight / 2 - rootRect.top - height / 2) / scaleY,
      width: width / scaleX,
      height: height / scaleY,
    },
  }
}

const previewStyle = computed(() => {
  if (!preview.value) return {}
  const rect =
    previewPhase.value === 'opened'
      ? preview.value.targetRect
      : preview.value.startRect

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

const syncRadius = () => {
  const root = rootRef.value
  if (!root) return

  const width = Math.max(1, root.clientWidth)
  const height = Math.max(1, root.clientHeight)
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
  root.style.setProperty('--dome-radius', `${radius.value}px`)
  root.style.setProperty('--dome-overlay-color', props.overlayBlurColor)
  root.style.setProperty(
    '--dome-grayscale-filter',
    props.grayscale ? 'grayscale(1)' : ''
  )
  applySphereTransform()
}

const stopInertia = () => {
  if (inertiaFrame === null) return
  window.cancelAnimationFrame(inertiaFrame)
  inertiaFrame = null
  isInertiaActive.value = false
}

const startInertia = (velocityX: number, velocityY: number) => {
  stopInertia()
  isInertiaActive.value = true
  let x = clamp(velocityX, -1.4, 1.4) * 80
  let y = clamp(velocityY, -1.4, 1.4) * 80
  let frames = 0

  const step = () => {
    x *= 0.965
    y *= 0.965
    if ((Math.abs(x) < 0.02 && Math.abs(y) < 0.02) || frames++ > 240) {
      inertiaFrame = null
      isInertiaActive.value = false
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
  if (!props.active || preview.value || isDragging) return
  stopInertia()
  isDragging = true
  isDragActive.value = true
  activePointerId = event.pointerId
  didMove = false
  startRotation.x = rotation.x
  startRotation.y = rotation.y
  startPosition = getPointerPosition(event)
  setDragListenersActive(true)
}

const handlePointerMove = (event: PointerEvent) => {
  if (
    !isDragging ||
    activePointerId !== event.pointerId ||
    !startPosition ||
    preview.value
  ) {
    return
  }

  pendingDragPosition = getPointerPosition(event)
  if (dragFrame !== null) return
  dragFrame = window.requestAnimationFrame(() => {
    dragFrame = null
    const position = pendingDragPosition
    if (!position || !startPosition || !isDragging) return
    pendingDragPosition = null
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
  })
}

const handlePointerEnd = (event: PointerEvent) => {
  if (activePointerId !== event.pointerId) return
  if (!isDragging) {
    activePointerId = null
    startPosition = null
    setDragListenersActive(false)
    return
  }
  isDragging = false
  isDragActive.value = false
  if (dragFrame !== null) window.cancelAnimationFrame(dragFrame)
  dragFrame = null
  pendingDragPosition = null

  if (didMove && startPosition) {
    lastDragEndAt = performance.now()

    if (event.type !== 'pointercancel' && !prefersReducedMotion.value) {
      const position = getPointerPosition(event)
      const velocityX =
        ((position.x - startPosition.x) / props.dragSensitivity) * 0.02
      const velocityY =
        ((position.y - startPosition.y) / props.dragSensitivity) * 0.02
      startInertia(velocityX, velocityY)
    }
  }

  didMove = false
  startPosition = null
  activePointerId = null
  setDragListenersActive(false)
}

const setDragListenersActive = (active: boolean) => {
  if (areDragListenersActive === active) return
  areDragListenersActive = active

  if (active) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
    return
  }

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerEnd)
  window.removeEventListener('pointercancel', handlePointerEnd)
}

const resetDragInteraction = () => {
  stopInertia()
  if (dragFrame !== null) window.cancelAnimationFrame(dragFrame)
  dragFrame = null
  pendingDragPosition = null
  activePointerId = null
  startPosition = null
  isDragging = false
  didMove = false
  isDragActive.value = false
  setDragListenersActive(false)
}

const openPreview = (item: TileItem, tile: HTMLElement) => {
  const root = rootRef.value
  if (!root || preview.value) return

  const width = parseLength(props.openedImageWidth, 250)
  const height = parseLength(props.openedImageHeight, 350)
  const { startRect, targetRect } = getPreviewGeometry(
    root,
    tile,
    width,
    height
  )

  focusedTile = tile
  focusedTile.style.visibility = 'hidden'
  previewPhase.value = 'opening'
  preview.value = {
    src: item.src,
    title: item.title,
    link: item.link,
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

const handlePreviewImageClick = () => {
  const link = preview.value?.link?.trim()
  if (!link) return

  let url: URL
  try {
    const normalizedLink = /^www\.anuluca\.com(?:\/|$)/i.test(link)
      ? `https://${link}`
      : link
    url = new URL(normalizedLink, window.location.origin)
  } catch {
    return
  }

  if (url.hostname === 'www.anuluca.com') {
    void router.push(`${url.pathname}${url.search}${url.hash}`)
    return
  }

  window.open(url.toString(), '_blank', 'noopener,noreferrer')
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
    setSmoothScrollLocked(scrollLockKey, false)
  }, 320)
}

const handlePreviewKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closePreview()
}

const setPreviewKeyListenerActive = (active: boolean) => {
  if (isPreviewKeyListenerActive === active) return
  isPreviewKeyListenerActive = active
  if (active) window.addEventListener('keydown', handlePreviewKeydown)
  else window.removeEventListener('keydown', handlePreviewKeydown)
}

const handleCompactDensityChange = (event: MediaQueryListEvent) => {
  isCompactDensity.value = event.matches
}

onMounted(() => {
  const root = rootRef.value
  if (!root) return

  resizeObserver = new ResizeObserver(syncRadius)
  resizeObserver.observe(root)
  compactDensityQuery = window.matchMedia(
    '(max-width: 768px), (hover: none) and (pointer: coarse)'
  )
  isCompactDensity.value = compactDensityQuery.matches
  compactDensityQuery.addEventListener('change', handleCompactDensityChange)
  prefersReducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  syncRadius()
})

onUnmounted(() => {
  resetDragInteraction()
  if (previewCloseTimer !== null) window.clearTimeout(previewCloseTimer)
  focusedTile?.style.removeProperty('visibility')
  setSmoothScrollLocked(scrollLockKey, false)
  resizeObserver?.disconnect()
  compactDensityQuery?.removeEventListener('change', handleCompactDensityChange)
  setPreviewKeyListenerActive(false)
})

watch(preview, (value) => setPreviewKeyListenerActive(!!value))

watch(
  () => props.active,
  (active) => {
    if (!active) resetDragInteraction()
  }
)

watch(
  () => [
    props.fit,
    props.fitBasis,
    props.minRadius,
    props.maxRadius,
    props.overlayBlurColor,
    props.grayscale,
  ],
  syncRadius
)
</script>

<style src="./index.less" lang="less" scoped />
