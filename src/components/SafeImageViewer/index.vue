<template>
  <InlineImagePreview
    v-if="inline"
    :url-list="urlList"
    :labels="labels"
    :titles="titles"
    :initial-index="initialIndex"
    @switch="emit('switch', $event)"
    @open="emit('open', $event)"
  >
    <template v-if="$slots.info" #info="scope">
      <slot name="info" v-bind="scope" />
    </template>
  </InlineImagePreview>
  <ElImageViewer
    v-else
    :url-list="viewerUrls"
    :initial-index="initialIndex"
    :z-index="zIndex"
    :infinite="false"
    :hide-on-click-modal="hideOnClickModal"
    :teleported="teleported"
    @close="handleClose"
    @switch="handleSwitch"
  >
    <OverlayBackgroundTitle
      v-if="backgroundTitle && !activeVideo"
      class="safe-image-viewer__background-title"
      :title="backgroundTitle"
      :active="!closing"
    />
    <div
      v-if="isImageLoading && !activeVideo"
      ref="loadingPlaceholder"
      class="safe-image-viewer__placeholder"
      role="status"
      aria-busy="true"
      :aria-label="locale === 'en' ? 'Loading image' : '图片加载中'"
    />
    <div v-if="activeVideo" class="safe-image-viewer__video-stage">
      <video
        :key="activeVideo"
        ref="videoPlayer"
        :src="activeVideo"
        :aria-label="locale === 'en' ? 'Video preview' : '视频预览'"
        controls
        autoplay
        muted
        playsinline
        preload="metadata"
        @keydown="handleVideoKeydown"
      />
    </div>
    <div ref="corners" class="safe-image-viewer__corners" aria-hidden="true" />
    <template #toolbar="{ actions, reset }">
      <div v-if="$slots.info && !activeVideo" class="safe-image-viewer__info">
        <slot name="info" :index="activeIndex" />
      </div>
      <div class="safe-image-viewer__tools">
        <button
          v-for="tool in activeVideo ? [] : tools"
          :key="tool.action"
          type="button"
          class="safe-image-viewer__tool"
          :class="{ 'is-fit-toggle': tool.action === 'reset' }"
          :aria-label="tool.label"
          @click="
            onToolClick($event, () =>
              tool.action === 'reset' ? reset() : actions(tool.action)
            )
          "
        >
          <ElIcon><component :is="tool.icon" /></ElIcon>
        </button>
      </div>
    </template>
  </ElImageViewer>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FullScreen,
  RefreshLeft,
  RefreshRight,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
import { ElIcon, ElImageViewer } from 'element-plus'

import OverlayBackgroundTitle from '@/components/OverlayBackgroundTitle/index.vue'
import { useOverlayScrollLock } from '@/composables/useOverlayScrollLock'
import { flashActionButton } from '@/utils/flashActionButton'
import {
  decorateImageViewerNavigation,
  flashImageViewerNavigation,
  syncImageViewerNavigationCutouts,
} from '@/utils/imageViewerNavigation'
import { bindImageViewerTouch } from '@/utils/imageViewerTouch'

import InlineImagePreview from './InlineImagePreview.vue'

import 'element-plus/theme-chalk/dark/css-vars.css'

import 'element-plus/es/components/image-viewer/style/css'

const props = withDefaults(
  defineProps<{
    hideOnClickModal?: boolean
    initialIndex?: number
    teleported?: boolean
    urlList: string[]
    zIndex?: number
    inline?: boolean
    labels?: string[]
    titles?: string[]
  }>(),
  {
    hideOnClickModal: true,
    initialIndex: 0,
    teleported: true,
    zIndex: 10010,
    inline: false,
    labels: () => [],
    titles: () => [],
  }
)

const emit = defineEmits<{
  close: []
  switch: [index: number]
  open: [index: number]
}>()
const { locale } = useI18n()
const ACTION_FLASH_DURATION = 180
const onToolClick = (event: MouseEvent, action: () => void) => {
  flashActionButton(event.currentTarget as HTMLElement, ACTION_FLASH_DURATION)
  action()
}
const corners = ref<HTMLElement | null>(null)
let cornerStyle: CSSProperties = { display: 'none' }
let decoratedImage: HTMLImageElement | null = null
let wrapper: HTMLElement | null = null
let image: HTMLImageElement | null = null
let mutationObserver: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let navigationObserver: ResizeObserver | undefined
let unbindTouch: (() => void) | undefined
const activeIndex = ref(props.initialIndex)
const closing = ref(false)
const backgroundTitle = computed(() => props.titles[activeIndex.value]?.trim())
const videoPlayer = ref<HTMLVideoElement | null>(null)
const isImageLoading = ref(true)
const loadingPlaceholder = ref<HTMLElement | null>(null)
const isVideoUrl = (url: string) =>
  /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i.test(url)
const activeVideo = computed(() => {
  const url = props.urlList[activeIndex.value]
  return url && isVideoUrl(url) ? url : null
})
// 图片组件继续负责导航；视频使用独立播放器，避免把视频 URL 当作图片请求。
const videoPlaceholder =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'
const viewerUrls = computed(() =>
  props.urlList.map((url) => (isVideoUrl(url) ? videoPlaceholder : url))
)
const handleVideoKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') event.stopPropagation()
}
let requestedDirection = 0
let switchVersion = 0
let outgoingImage: HTMLImageElement | null = null
const switchAnimations = new Set<Animation>()
const navigationFlashes = new Map<HTMLElement, Animation>()
const flashNavigation = (nav: HTMLElement) => {
  if (nav.classList.contains('is-disabled')) return
  const fill = nav.querySelector<HTMLElement>('.safe-image-viewer__nav-fill')
  if (!fill) return
  navigationFlashes.get(fill)?.cancel()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const animation = flashImageViewerNavigation(nav)
  if (!animation) return
  navigationFlashes.set(fill, animation)
  const clear = () => {
    if (navigationFlashes.get(fill) === animation)
      navigationFlashes.delete(fill)
  }
  animation.onfinish = clear
  animation.oncancel = clear
}
const clearSwitchAnimations = () => {
  for (const animation of switchAnimations) animation.cancel()
  switchAnimations.clear()
  outgoingImage?.remove()
  outgoingImage = null
}
const recordSwitchDirection = (event: Event) => {
  if (event instanceof KeyboardEvent) {
    if (event.key === 'ArrowLeft') requestedDirection = -1
    if (event.key === 'ArrowRight') requestedDirection = 1
  } else if (event.target instanceof Element) {
    const nav = event.target.closest<HTMLElement>(
      '.el-image-viewer__prev, .el-image-viewer__next'
    )
    if (nav) {
      requestedDirection = nav.classList.contains('el-image-viewer__prev')
        ? -1
        : 1
      flashNavigation(nav)
    }
  }
}
const handleSwitch = async (index: number) => {
  wrapper?.classList.remove('is-image-zoomed')
  wrapper?.classList.remove('is-hover-dimmed')
  const version = ++switchVersion
  const direction =
    requestedDirection ||
    (index === (activeIndex.value + 1) % props.urlList.length ? 1 : -1)
  requestedDirection = 0
  videoPlayer.value?.pause()
  activeIndex.value = index
  emit('switch', index)
  isImageLoading.value = !activeVideo.value
  void nextTick(syncCorners)
  clearSwitchAnimations()
  if (activeVideo.value) {
    syncCorners()
    return
  }
  if (!wrapper || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const oldImage = wrapper.querySelector<HTMLImageElement>(
    '.el-image-viewer__img'
  )
  if (oldImage?.naturalWidth) {
    outgoingImage = oldImage.cloneNode() as HTMLImageElement
    outgoingImage.className = 'safe-image-viewer__outgoing-image'
    outgoingImage.setAttribute('aria-hidden', 'true')
    Object.assign(outgoingImage.style, {
      position: 'absolute',
      left: `${oldImage.offsetLeft}px`,
      top: `${oldImage.offsetTop}px`,
      width: `${oldImage.offsetWidth}px`,
      height: `${oldImage.offsetHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      pointerEvents: 'none',
      transform: getComputedStyle(oldImage).transform,
    })
    oldImage.parentElement?.append(outgoingImage)
  }
  await nextTick()
  const incoming = wrapper?.querySelector<HTMLImageElement>(
    '.el-image-viewer__img'
  )
  if (!incoming) return
  if (
    version !== switchVersion ||
    !wrapper?.isConnected ||
    closeTimer !== undefined
  )
    return
  syncCorners()
  const target = isImageLoading.value ? loadingPlaceholder.value : incoming
  if (!target) return
  const vertical = window.matchMedia('(max-width: 768px)').matches
  const distance =
    Math.min(vertical ? target.offsetHeight : target.offsetWidth, 160) *
    direction
  const offset = (value: number) => (vertical ? `0 ${value}px` : `${value}px 0`)
  // 使用独立 translate 动画，避免覆盖缩放、旋转、拖动使用的 transform。
  const animate = (element: HTMLElement, frames: Keyframe[]) => {
    const animation = element.animate(frames, {
      duration: 380,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    })
    switchAnimations.add(animation)
    return animation.finished
      .catch(() => {})
      .finally(() => {
        animation.cancel()
        switchAnimations.delete(animation)
      })
  }
  const previous = outgoingImage
  if (previous)
    void animate(previous, [
      { translate: '0 0', opacity: 1 },
      { translate: offset(-distance), opacity: 0 },
    ]).then(() => previous.remove())
  if (!isImageLoading.value && corners.value)
    void animate(corners.value, [
      { translate: offset(distance), opacity: 0 },
      { translate: '0 0', opacity: 1 },
    ])
  // 加载时先让占位层入场，图片加载完成后直接显示。
  void animate(target, [
    { translate: offset(distance), opacity: 0 },
    { translate: '0 0', opacity: 1 },
  ])
}
const syncNavigationCutouts = () => {
  if (wrapper) syncImageViewerNavigationCutouts(wrapper)
}

let closeTimer: ReturnType<typeof setTimeout> | undefined
const handleClose = () => {
  if (closeTimer !== undefined) return
  closing.value = true
  videoPlayer.value?.pause()
  ++switchVersion
  clearSwitchAnimations()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('close')
    return
  }
  // 等电视机关机动画结束后再卸载，期间继续保留背景滚动锁。
  wrapper?.classList.add('is-crt-closing')
  closeTimer = setTimeout(() => emit('close'), 450)
}
const markNavigationHovered = (event: PointerEvent) => {
  if (
    event.pointerType === 'touch' ||
    !window.matchMedia(
      '(min-width: 769px) and (hover: hover) and (pointer: fine)'
    ).matches
  )
    return
  if (!(event.target instanceof Element)) return
  const nav = event.target.closest(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )
  if (!nav) return
  nav.classList.add('has-hovered')
  if (event.relatedTarget instanceof Node && nav.contains(event.relatedTarget))
    return
  wrapper?.classList.add('is-hover-dimmed')
}
const clearNavigationHover = (event: PointerEvent) => {
  if (!(event.target instanceof Element)) return
  const nav = event.target.closest(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )
  if (
    nav &&
    !(event.relatedTarget instanceof Node && nav.contains(event.relatedTarget))
  )
    wrapper?.classList.remove('is-hover-dimmed')
}
const syncCorners = () => {
  if (activeVideo.value) {
    isImageLoading.value = false
    if (corners.value) corners.value.style.display = 'none'
    return
  }
  const current =
    wrapper?.querySelector<HTMLImageElement>('.el-image-viewer__img') ?? null
  // complete 在加载成功和失败时都会变为 true，错误状态交还原有预览组件。
  isImageLoading.value = !current || !current.complete
  if (current !== image) {
    resizeObserver?.disconnect()
    image = current
    if (image) resizeObserver?.observe(image)
  }
  if (!image?.naturalWidth) {
    wrapper?.classList.remove('is-image-zoomed')
    if (corners.value) corners.value.style.display = 'none'
    cornerStyle = { display: 'none' }
    return
  }
  // 底栏按未缩放图片及两侧各 16px 的四角装饰对齐，缩放、拖动时保持操作位置稳定。
  wrapper?.style.setProperty(
    '--viewer-info-bar-width',
    `${image.offsetWidth + 32}px`
  )
  const nativeScale = Number(
    /scale\(([^)]+)\)/.exec(image.style.transform)?.[1] ?? 1
  )
  wrapper?.classList.toggle(
    'is-image-zoomed',
    nativeScale * Number(image.style.scale || 1) > 1.01
  )
  if (decoratedImage !== image) {
    decoratedImage = image
    // 装饰层独立播放动画，不触发图片预览组件重新渲染。
    for (const animation of corners.value?.getAnimations() ?? [])
      if ((animation as CSSAnimation).animationName === 'viewer-corner-in')
        animation.currentTime = 0
  }
  // 使用未变换的布局尺寸，并复制图片变换，使装饰同步旋转、缩放和拖动。
  const nextStyle: CSSProperties = {
    display: 'block',
    left: `${image.offsetLeft - 16}px`,
    top: `${image.offsetTop - 16}px`,
    width: `${image.offsetWidth + 32}px`,
    height: `${image.offsetHeight + 32}px`,
    transform: image.style.transform,
    scale: image.style.scale,
    translate: image.style.translate,
    transition: image.style.transition,
  }
  // 装饰尺寸直接写入独立 DOM；观察图片变换不会再引发 Vue 组件渲染。
  if (
    Object.keys(nextStyle).some(
      (key) =>
        nextStyle[key as keyof CSSProperties] !==
        cornerStyle[key as keyof CSSProperties]
    ) ||
    Object.keys(nextStyle).length !== Object.keys(cornerStyle).length
  ) {
    if (corners.value) Object.assign(corners.value.style, nextStyle)
    cornerStyle = nextStyle
  }
}
onMounted(async () => {
  await nextTick()
  wrapper =
    corners.value?.closest<HTMLElement>('.el-image-viewer__wrapper') ?? null
  if (!wrapper) return
  unbindTouch = bindImageViewerTouch(
    wrapper,
    syncCorners,
    clearSwitchAnimations,
    (direction) => {
      const nav = wrapper?.querySelector<HTMLElement>(
        direction === 1 ? '.el-image-viewer__next' : '.el-image-viewer__prev'
      )
      if (nav && !nav.classList.contains('is-disabled')) nav.click()
    }
  )
  for (const nav of wrapper.querySelectorAll<HTMLElement>(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )) {
    decorateImageViewerNavigation(nav)
  }
  void document.fonts.load('400 112px Anton', 'PREV NEXT').then(() => {
    if (!wrapper?.isConnected) return
    syncNavigationCutouts()
    navigationObserver = new ResizeObserver(syncNavigationCutouts)
    wrapper
      .querySelectorAll('.el-image-viewer__prev, .el-image-viewer__next')
      .forEach((nav) => navigationObserver?.observe(nav))
  })
  resizeObserver = new ResizeObserver(syncCorners)
  mutationObserver = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.target instanceof HTMLImageElement ||
          (record.type === 'childList' &&
            record.target instanceof Element &&
            record.target.classList.contains('el-image-viewer__canvas'))
      )
    )
      syncCorners()
  })
  mutationObserver.observe(wrapper, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'src'],
  })
  wrapper.addEventListener('load', syncCorners, true)
  wrapper.addEventListener('error', syncCorners, true)
  wrapper.addEventListener('pointerover', markNavigationHovered)
  wrapper.addEventListener('pointerout', clearNavigationHover)
  wrapper.addEventListener('click', recordSwitchDirection, true)
  document.addEventListener('keydown', recordSwitchDirection, true)
  window.addEventListener('resize', syncCorners)
  syncCorners()
})
onBeforeUnmount(() => {
  videoPlayer.value?.pause()
  for (const animation of navigationFlashes.values()) animation.cancel()
  navigationFlashes.clear()
  unbindTouch?.()
  ++switchVersion
  clearSwitchAnimations()
  clearTimeout(closeTimer)
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  navigationObserver?.disconnect()
  wrapper?.removeEventListener('load', syncCorners, true)
  wrapper?.removeEventListener('error', syncCorners, true)
  wrapper?.removeEventListener('pointerover', markNavigationHovered)
  wrapper?.removeEventListener('pointerout', clearNavigationHover)
  wrapper?.removeEventListener('click', recordSwitchDirection, true)
  document.removeEventListener('keydown', recordSwitchDirection, true)
  window.removeEventListener('resize', syncCorners)
})
const tools = computed(
  () =>
    [
      {
        action: 'zoomOut',
        icon: ZoomOut,
        label: locale.value === 'en' ? 'Zoom out' : '缩小',
      },
      {
        action: 'zoomIn',
        icon: ZoomIn,
        label: locale.value === 'en' ? 'Zoom in' : '放大',
      },
      {
        action: 'reset',
        icon: FullScreen,
        label: locale.value === 'en' ? 'Toggle image fit' : '切换图片适配',
      },
      {
        action: 'anticlockwise',
        icon: RefreshLeft,
        label: locale.value === 'en' ? 'Rotate left' : '向左旋转',
      },
      {
        action: 'clockwise',
        icon: RefreshRight,
        label: locale.value === 'en' ? 'Rotate right' : '向右旋转',
      },
    ] as const
)

useOverlayScrollLock('safe-image-viewer', () => !props.inline)
</script>

<style lang="less">
.el-image-viewer__wrapper {
  .safe-image-viewer__background-title {
    z-index: 0;
  }

  .el-image-viewer__canvas {
    position: relative;
    z-index: 1;
    pointer-events: none;

    .el-image-viewer__img {
      pointer-events: auto;
    }
  }
}

.el-image-viewer__wrapper
  .el-image-viewer__actions:has(.safe-image-viewer__tools) {
  background: transparent;
}

.safe-image-viewer__tools {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  background: rgb(11 8 12 / 84%);
}

.el-image-viewer__wrapper
  .el-image-viewer__actions:has(.safe-image-viewer__info) {
  width: min(var(--viewer-info-bar-width, 100vw), 100vw);
  box-sizing: border-box;
  container-type: inline-size;

  .el-image-viewer__actions__inner {
    align-items: stretch;
    gap: ~'8PX';
  }

  .safe-image-viewer__tool {
    flex-shrink: 1;
    min-width: 0;
  }

  @media (max-width: 768px) {
    width: 100%;

    .safe-image-viewer__tools {
      flex: 0 0 40%;
      max-width: ~'176PX';
      align-items: center;
    }

    .safe-image-viewer__tool {
      flex: 1 1 0;
      width: 0;
      height: min(10cqi, ~'44PX');
      font-size: min(6cqi, ~'22PX');
    }
  }
}

.el-image-viewer__wrapper .safe-image-viewer__info {
  display: flex;
  align-items: center;
  flex: 1 0 20%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  text-align: left;
  background: rgb(16 14 17 / 86%);

  > * {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .photo-info__inner {
      grid-template-columns: minmax(0, 1fr);
      gap: ~'4PX';
      padding: ~'6PX 10PX 6PX 18PX';
      font-size: ~'13PX';
    }

    .photo-info__inner > .photo-info__meta {
      justify-content: flex-start;
    }
  }
}

.el-image-viewer__wrapper .el-image-viewer__btn.is-disabled {
  display: none;
}

@media (max-width: 768px) {
  .el-image-viewer__wrapper .safe-image-viewer__corners,
  .inline-image-preview .safe-image-viewer__corners {
    visibility: hidden;
  }
}

.safe-image-viewer__placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(72vw, 960px);
  height: min(66vh, 640px);
  transform: translate(-50%, -50%);
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 6%) 25%,
    rgb(255 255 255 / 12%) 50%,
    rgb(255 255 255 / 6%) 75%
  );
  background-size: 200% 100%;
  animation: viewer-placeholder-shimmer 1.5s ease-in-out infinite;
  pointer-events: none;
}
.el-image-viewer__wrapper:has(.safe-image-viewer__placeholder) {
  .el-image-viewer__img,
  .safe-image-viewer__corners {
    visibility: hidden;
  }
}
@keyframes viewer-placeholder-shimmer {
  from {
    background-position: -200% 0;
  }
  to {
    background-position: 200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .safe-image-viewer__placeholder {
    animation: none;
  }
}
@media (max-width: 768px) {
  .safe-image-viewer__placeholder {
    width: calc(100% - 64px);
    height: min(60vh, 440px);
  }
}

.el-image-viewer__wrapper:has(.safe-image-viewer__video-stage) {
  .el-image-viewer__canvas,
  .el-image-viewer__actions {
    visibility: hidden;
    pointer-events: none;
  }
}
.safe-image-viewer__video-stage {
  position: absolute;
  inset: clamp(48px, 8vh, 88px) clamp(48px, 10vw, 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  video {
    display: block;
    max-width: 100%;
    max-height: 100%;
    background: #000;
    pointer-events: auto;
  }
}
.el-image-viewer__wrapper.is-crt-closing .safe-image-viewer__video-stage {
  pointer-events: none;
  video {
    pointer-events: none;
    animation: anutriumCrtOff 420ms cubic-bezier(0.2, 1, 0.22, 1) both;
  }
}
@media (prefers-reduced-motion: reduce) {
  .el-image-viewer__wrapper.is-crt-closing
    .safe-image-viewer__video-stage
    video {
    animation: none;
  }
}
@media (max-width: 768px) {
  .safe-image-viewer__video-stage {
    inset: 80px 16px;
  }
}
</style>
