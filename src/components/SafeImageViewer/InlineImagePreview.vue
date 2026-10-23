<template>
  <section
    class="inline-image-preview no-rem"
    tabindex="0"
    :aria-label="locale === 'en' ? 'Image preview' : '图片预览'"
    @keydown="handleKeydown"
  >
    <div
      v-if="activeUrl"
      ref="stageRef"
      class="inline-image-preview__stage"
      :class="{ 'is-hover-dimmed': isNavigationHovered }"
      :style="{
        '--inline-media-ratio': mediaAspectRatio,
        '--inline-info-height': `${infoHeight}px`,
      }"
    >
      <button
        class="el-image-viewer__btn el-image-viewer__prev"
        type="button"
        :disabled="activeIndex === 0"
        :class="{ 'is-disabled': activeIndex === 0 }"
        :aria-label="locale === 'en' ? 'Previous image' : '上一张'"
        @click="handleNavigation($event, -1)"
        @pointerenter="handleNavigationEnter"
        @pointerleave="isNavigationHovered = false"
      />
      <div class="inline-image-preview__canvas" :aria-busy="loading">
        <figure class="inline-image-preview__figure">
          <video
            v-if="isVideoUrl(activeUrl)"
            :key="activeUrl"
            ref="videoRef"
            :src="activeUrl"
            :aria-label="activeLabel"
            controls
            playsinline
            preload="metadata"
            @loadedmetadata="handleVideoLoaded"
            @error="handleError"
          />
          <button
            v-else
            class="inline-image-preview__open"
            type="button"
            :aria-label="`${
              locale === 'en' ? 'View original: ' : '查看原图：'
            }${activeLabel}`"
            @click="emit('open', activeIndex)"
          >
            <img
              :key="`${activeUrl}:${retryCount}`"
              :src="activeUrl"
              :alt="activeLabel"
              decoding="async"
              @load="handleImageLoaded"
              @error="handleError"
            />
          </button>
          <div
            v-if="$slots.info"
            ref="infoRef"
            class="inline-image-preview__info"
          >
            <slot name="info" :index="activeIndex" />
          </div>
          <span
            v-if="!loading && !failed && !isVideoUrl(activeUrl)"
            class="safe-image-viewer__corners"
            aria-hidden="true"
          />
        </figure>
        <span v-if="loading" class="inline-image-preview__status" role="status">
          {{ locale === 'en' ? 'Loading…' : '加载中…' }}
        </span>
        <div v-if="failed" class="inline-image-preview__status" role="status">
          {{ locale === 'en' ? 'Unable to load media' : '媒体加载失败' }}
          <button v-if="!isVideoUrl(activeUrl)" type="button" @click="retry">
            {{ locale === 'en' ? 'Retry' : '重试' }}
          </button>
        </div>
      </div>
      <button
        class="el-image-viewer__btn el-image-viewer__next"
        type="button"
        :disabled="activeIndex >= urlList.length - 1"
        :class="{ 'is-disabled': activeIndex >= urlList.length - 1 }"
        :aria-label="locale === 'en' ? 'Next image' : '下一张'"
        @click="handleNavigation($event, 1)"
        @pointerenter="handleNavigationEnter"
        @pointerleave="isNavigationHovered = false"
      />
    </div>
    <div
      ref="thumbnailsRef"
      class="inline-image-preview__thumbnails"
      role="group"
      :aria-label="locale === 'en' ? 'All images' : '全部图片'"
    >
      <button
        v-for="(url, index) in urlList"
        :key="url"
        class="inline-image-preview__thumbnail"
        type="button"
        :aria-current="index === activeIndex ? 'true' : undefined"
        :aria-label="`${locale === 'en' ? 'Select image ' : '选择第 '}${
          index + 1
        }${locale === 'en' ? '' : ' 张：'} ${labels[index] || ''}`"
        @click="select(index)"
      >
        <span v-if="isVideoUrl(url)" class="inline-image-preview__video-label"
          >VIDEO</span
        >
        <img
          v-else
          :src="thumbnails[index]"
          alt=""
          width="128"
          height="96"
          loading="lazy"
          decoding="async"
        />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getCardThumbnailUrl } from '@/utils/imageVariant'
import {
  decorateImageViewerNavigation,
  flashImageViewerNavigation,
  syncImageViewerNavigationCutouts,
} from '@/utils/imageViewerNavigation'

const props = withDefaults(
  defineProps<{
    urlList: string[]
    labels: string[]
    initialIndex?: number
  }>(),
  { initialIndex: 0 }
)
const emit = defineEmits<{
  switch: [index: number]
  open: [index: number]
}>()
const { locale } = useI18n()
const activeIndex = ref(0)
const thumbnails = computed(() => props.urlList.map(getCardThumbnailUrl))
const activeUrl = computed(() => props.urlList[activeIndex.value])
const activeLabel = computed(
  () =>
    props.labels[activeIndex.value] ||
    (locale.value === 'en' ? 'Photo' : '图片')
)
const stageRef = ref<HTMLElement>()
const infoRef = ref<HTMLElement>()
const infoHeight = ref(0)
const mediaAspectRatio = ref(1)
const isNavigationHovered = ref(false)
let navigationObserver: ResizeObserver | undefined
let infoObserver: ResizeObserver | undefined
let isUnmounted = false
const navigationFlashes = new Set<Animation>()
const loading = ref(true)
const failed = ref(false)
const retryCount = ref(0)
const thumbnailsRef = ref<HTMLElement>()
const videoRef = ref<HTMLVideoElement>()
const isVideoUrl = (url: string) =>
  /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i.test(url)

const revealThumbnail = async () => {
  await nextTick()
  const strip = thumbnailsRef.value
  const thumbnail = strip?.children[activeIndex.value] as
    | HTMLElement
    | undefined
  if (!strip || !thumbnail) return
  // 只滚动缩略图条，避免 scrollIntoView 连带移动整个页面。
  const left = thumbnail.offsetLeft
  const right = left + thumbnail.offsetWidth
  if (left < strip.scrollLeft) strip.scrollLeft = left
  else if (right > strip.scrollLeft + strip.clientWidth)
    strip.scrollLeft = right - strip.clientWidth
}

const select = (index: number) => {
  if (index < 0 || index >= props.urlList.length || index === activeIndex.value)
    return
  videoRef.value?.pause()
  activeIndex.value = index
  emit('switch', index)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (
    event.target instanceof HTMLVideoElement ||
    event.target instanceof HTMLInputElement
  )
    return
  let index: number
  if (event.key === 'ArrowLeft') index = activeIndex.value - 1
  else if (event.key === 'ArrowRight') index = activeIndex.value + 1
  else if (event.key === 'Home') index = 0
  else if (event.key === 'End') index = props.urlList.length - 1
  else return
  event.preventDefault()
  event.stopPropagation()
  select(index)
}

const handleError = () => {
  loading.value = false
  failed.value = true
}
const retry = () => {
  failed.value = false
  loading.value = true
  retryCount.value++
}
watch(
  () => [props.initialIndex, props.urlList] as const,
  () => {
    videoRef.value?.pause()
    activeIndex.value = Math.max(
      0,
      Math.min(props.initialIndex, props.urlList.length - 1)
    )
    void revealThumbnail()
  },
  { immediate: true }
)
watch(activeUrl, () => {
  loading.value = true
  failed.value = false
  void revealThumbnail()
})
const handleImageLoaded = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement
  if (image.naturalHeight)
    mediaAspectRatio.value = image.naturalWidth / image.naturalHeight
  loading.value = false
}
const handleVideoLoaded = (event: Event) => {
  const video = event.currentTarget as HTMLVideoElement
  if (video.videoHeight)
    mediaAspectRatio.value = video.videoWidth / video.videoHeight
  loading.value = false
}
const handleNavigation = (event: MouseEvent, direction: number) => {
  const animation = flashImageViewerNavigation(
    event.currentTarget as HTMLElement
  )
  if (animation) {
    navigationFlashes.add(animation)
    void animation.finished
      .catch(() => undefined)
      .finally(() => navigationFlashes.delete(animation))
  }
  select(activeIndex.value + direction)
}
const handleNavigationEnter = (event: PointerEvent) => {
  if (
    event.pointerType === 'touch' ||
    (event.currentTarget as HTMLButtonElement).disabled
  )
    return
  ;(event.currentTarget as HTMLElement).classList.add('has-hovered')
  isNavigationHovered.value = true
}
onMounted(async () => {
  const stage = stageRef.value
  if (!stage) return
  stage
    .querySelectorAll<HTMLElement>(
      '.el-image-viewer__prev, .el-image-viewer__next'
    )
    .forEach(decorateImageViewerNavigation)
  const sync = () => syncImageViewerNavigationCutouts(stage)
  navigationObserver = new ResizeObserver(sync)
  stage
    .querySelectorAll<HTMLElement>(
      '.el-image-viewer__prev, .el-image-viewer__next'
    )
    .forEach((nav) => navigationObserver?.observe(nav))
  sync()
  void document.fonts.load('400 112px Anton', 'PREV NEXT').then(() => {
    if (!isUnmounted) sync()
  })
  if (infoRef.value) {
    infoObserver = new ResizeObserver(() => {
      infoHeight.value = infoRef.value?.offsetHeight || 0
    })
    infoObserver.observe(infoRef.value)
  }
})
onBeforeUnmount(() => {
  isUnmounted = true
  videoRef.value?.pause()
  navigationObserver?.disconnect()
  infoObserver?.disconnect()
  for (const animation of navigationFlashes) animation.cancel()
})
</script>

<style lang="less">
@import '@/assets/style/imageViewerDesktop.less';

.inline-image-preview {
  --viewer-accent: var(--page-theme-color, #e23456);
  min-width: 0;
  width: 100%;
  color: var(--text-color);

  &:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--viewer-accent);
    outline-offset: 3px;
  }
}

// 与全屏 PC 预览使用同一份样式，不套用全屏模块的手机端上下布局。
.inline-image-preview__stage {
  .image-viewer-desktop-decoration();
  --inline-stage-height: clamp(380px, 88vh, 860px);
  --inline-canvas-padding: clamp(36px, 8vh, 88px);
  --inline-image-max-height: max(
    100px,
    calc(
      var(--inline-stage-height) - var(--inline-canvas-padding) -
        var(--inline-canvas-padding) - var(--inline-info-height, 0px)
    )
  );
  position: relative;
  height: var(--inline-stage-height);

  .el-image-viewer__prev,
  .el-image-viewer__next {
    padding: 0;
    cursor: pointer;

    &:disabled {
      opacity: 0.22;
      cursor: default;
    }
  }

  .safe-image-viewer__corners {
    display: block;
    inset: ~'-16PX';
  }

  @media (hover: hover) and (pointer: fine) {
    .el-image-viewer__prev,
    .el-image-viewer__next {
      transition: opacity 200ms ease, background-color 200ms ease,
        scale 280ms cubic-bezier(0.22, 1, 0.36, 1);
      &:hover:not(:disabled) {
        scale: 1.08 1;
      }
    }
    .el-image-viewer__prev {
      transform-origin: left center;
    }
    .el-image-viewer__next {
      transform-origin: right center;
    }
    &.is-hover-dimmed .inline-image-preview__figure {
      filter: brightness(0.5);
    }
    &.is-hover-dimmed .safe-image-viewer__corners {
      opacity: 0;
      animation: viewer-corner-out 200ms ease both;
      &::before {
        animation: none;
      }
    }
  }
}

.inline-image-preview__canvas {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 0;
  padding-block: var(--inline-canvas-padding);
  padding-inline: calc(clamp(116px, 15vw, 212px) + 24px);
}

.inline-image-preview__figure {
  position: relative;
  width: min(
    100%,
    calc(var(--inline-image-max-height) * var(--inline-media-ratio, 1))
  );
  min-width: 0;
  margin: 0;
  transition: filter 300ms ease;

  img,
  video {
    display: block;
    width: 100%;
    height: auto;
    max-height: var(--inline-image-max-height);
    object-fit: contain;
  }
}

.inline-image-preview__info {
  display: flow-root;
}

.inline-image-preview__open {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.no-rem {
  .inline-image-preview__status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font: 13px 'alibaba-puhuiti', sans-serif;
    background: var(--bg-color, #101014);
  }

  .inline-image-preview__thumbnails {
    position: relative;
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 32px 12px 14px;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }

  .inline-image-preview__thumbnail {
    position: relative;
    flex: 0 0 128px;
    height: 96px;
    box-sizing: border-box;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;

    &::after {
      position: absolute;
      inset: -12px;
      z-index: 1;
      content: '';
      color: var(--viewer-accent);
      background: linear-gradient(currentColor 0 0) top left / 12px 1px no-repeat,
        linear-gradient(currentColor 0 0) top left / 1px 12px no-repeat,
        linear-gradient(currentColor 0 0) top right / 12px 1px no-repeat,
        linear-gradient(currentColor 0 0) top right / 1px 12px no-repeat,
        linear-gradient(currentColor 0 0) bottom left / 12px 1px no-repeat,
        linear-gradient(currentColor 0 0) bottom left / 1px 12px no-repeat,
        linear-gradient(currentColor 0 0) bottom right / 12px 1px no-repeat,
        linear-gradient(currentColor 0 0) bottom right / 1px 12px no-repeat;
      opacity: 0;
      pointer-events: none;
      transition: inset 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }

    &:hover,
    &:focus-visible {
      img {
        filter: brightness(1);
      }

      &::after {
        inset: -4px;
        opacity: 1;
      }
    }

    // 有剩余空间时两侧均分，溢出时自动边距归零，保留首尾图片的滚动可达性。
    &:first-child {
      margin-left: auto;
    }
    &:last-child {
      margin-right: auto;
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.6);
      transition: filter 0.24s ease;
    }

    &[aria-current='true'] {
      border-color: var(--viewer-accent);

      img {
        filter: brightness(1);
      }
    }
  }

  .inline-image-preview__video-label {
    font: 14px 'Anton', sans-serif;
  }
}

@media (prefers-reduced-motion: reduce) {
  .inline-image-preview__thumbnail,
  .inline-image-preview__thumbnail img,
  .inline-image-preview__thumbnail::after {
    transition: none;
  }
}
</style>
