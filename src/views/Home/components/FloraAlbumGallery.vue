<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useResizeObserver } from '@vueuse/core'

import MediaGallery from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import { petAlbums } from '@/locales/dynamic/petAlbums'
import { flashActionButton } from '@/utils/flashActionButton'
import { getFloraCaptureDate } from '@/utils/floratriumMedia'
import { createScanlineMask } from '@/utils/scanlineMask'

import { useFloraAlbum } from '../composables/useFloraAlbum'
import FloraAlbumStrip from './FloraAlbumStrip.vue'

const props = defineProps<{ petId: string; title: string; mobile?: boolean }>()
const decorationFilterId = `flora-decoration-tint-${getCurrentInstance()?.uid}`
const emit = defineEmits<{
  (event: 'expanded-change', expanded: boolean): void
}>()
const { t } = useI18n({
  useScope: 'local',
  messages: {
    zhCn: {
      previous: '上一页',
      next: '下一页',
      loading: '加载中',
      error: '相册暂不可用',
      retry: '重试',
      empty: '暂无图片或视频',
      unknownDate: '日期未知',
      page: '第 {page} 页',
    },
    en: {
      previous: 'Previous',
      next: 'Next',
      loading: 'Loading',
      error: 'Album unavailable',
      retry: 'Retry',
      empty: 'No photos or videos',
      unknownDate: 'Unknown date',
      page: 'Page {page}',
    },
  },
})
const expanded = ref(false)
const hasToggled = ref(false)
watch(expanded, () => {
  hasToggled.value = true
  emit('expanded-change', expanded.value)
})
const viewport = ref<HTMLElement | null>(null)
const titleElement = ref<HTMLElement | null>(null)
const titleSpace = ref(76)
useResizeObserver(titleElement, () => {
  titleSpace.value = Math.max(
    props.mobile ? 40 : 76,
    (titleElement.value?.offsetHeight || 0) + (props.mobile ? 12 : 20)
  )
})
const album = computed(() => petAlbums[props.petId])
const overflowMask = createScanlineMask({
  seed: 'flora-album-overflow',
  lines: 8,
  solidFrom: 0.9,
  irregularity: 0.65,
})
const {
  allItems,
  loading,
  error,
  pageCursors,
  pageIndex,
  totalPages,
  refresh,
  goToPage: loadPage,
  changePage: loadAdjacentPage,
} = useFloraAlbum(() => props.petId, expanded, cancelPageMedia)
function cancelPageMedia() {
  // 先释放旧页的图片候选源和视频连接，避免资源继续占用新页下载队列。
  viewport.value
    ?.querySelectorAll('picture source')
    .forEach((source) => source.removeAttribute('srcset'))
  viewport.value?.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('srcset')
    image.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
  })
  viewport.value?.querySelectorAll('video').forEach((video) => {
    video.pause()
    video.removeAttribute('data-video-src')
    video.removeAttribute('src')
    video.load()
  })
}
const resetScroll = async () => {
  await nextTick()
  viewport.value?.scrollTo({ top: 0 })
}
const changePage = async (direction: -1 | 1) => {
  if (await loadAdjacentPage(direction)) await resetScroll()
}
const goToPage = async (target: number, event?: MouseEvent) => {
  if (event?.currentTarget instanceof HTMLButtonElement)
    flashActionButton(event.currentTarget)
  if (await loadPage(target)) await resetScroll()
}
let clickFlash: Animation | undefined
const toggle = (event: MouseEvent) => {
  clickFlash = flashActionButton(event.currentTarget as HTMLButtonElement)
  expanded.value = !expanded.value
}
const toggleFromSurface = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return
  // 照片和现有按钮继续执行各自操作；非交互空白区域切换相册展开状态。
  if (event.target.closest('button, a, input, video, [role="button"]')) return
  expanded.value = !expanded.value
}
const closeExpanded = () => {
  if (!expanded.value) return false
  expanded.value = false
  return true
}
defineExpose({ closeExpanded })
onBeforeUnmount(() => {
  clickFlash?.cancel()
})
</script>

<template>
  <section
    class="flora-album-gallery no-rem"
    :class="{
      'is-expanded': expanded,
      'is-clickable': true,
      'has-toggled': hasToggled,
      'flora-album-gallery--mobile': mobile,
    }"
    :style="{
      '--album-overflow-mask': overflowMask,
      '--album-title-space': `${titleSpace}px`,
    }"
    :aria-label="title"
    @click.stop="toggleFromSurface"
  >
    <div
      :key="String(expanded)"
      class="flora-album-gallery__background"
      aria-hidden="true"
    >
      <span
        v-for="blade in 12"
        :key="blade"
        :style="{ '--blade-index': blade - 1 }"
      />
    </div>
    <h2 ref="titleElement" class="flora-album-gallery__title">
      <button
        type="button"
        :aria-expanded="expanded"
        @click.stop="expanded = !expanded"
      >
        {{ title }}
      </button>
    </h2>
    <Transition name="album-mode" mode="out-in">
      <FloraAlbumStrip
        v-if="!expanded"
        key="selected"
        :items="album.defaults"
        :title="title"
      />
      <div
        v-else
        key="all"
        ref="viewport"
        class="flora-album-gallery__viewport"
        data-lenis-nested-scroll
      >
        <p
          v-if="loading && !allItems.length"
          class="flora-album-gallery__notice"
          role="status"
        >
          {{ t('loading') }}
        </p>
        <p
          v-else-if="error && !allItems.length"
          class="flora-album-gallery__notice"
          role="alert"
        >
          {{ t('error') }}
          <button type="button" @click="refresh()">{{ t('retry') }}</button>
        </p>
        <p v-else-if="!allItems.length" class="flora-album-gallery__notice">
          {{ t('empty') }}
        </p>
        <MediaGallery
          v-else
          :columns="4"
          :items="allItems"
          :get-media-label="() => title"
          preserve-image-colors
        >
          <template #info="{ item }">
            <MediaPhotoInfo
              :item="{
                time: getFloraCaptureDate(item.url) || t('unknownDate'),
              }"
              :time-divider-padding="0"
            />
          </template>
        </MediaGallery>
      </div>
    </Transition>
    <svg width="0" height="0" aria-hidden="true" style="position: absolute">
      <defs>
        <filter :id="decorationFilterId" color-interpolation-filters="sRGB">
          <feFlood
            style="flood-color: var(--flora-theme-color)"
            flood-opacity="0.35"
          />
          <feComposite in2="SourceAlpha" operator="in" result="tint" />
          <feBlend in="tint" in2="SourceGraphic" mode="color" />
        </filter>
      </defs>
    </svg>
    <img
      v-if="petId === 'huahua'"
      class="flora-album-gallery__decoration"
      :style="{ filter: `url(#${decorationFilterId})` }"
      src="https://assets.anuluca.com/Floratrium/decorations/flora-corner-v1.avif"
      width="480"
      height="223"
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable="false"
    />
    <button
      class="flora-album-gallery__expand"
      type="button"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <span>{{ expanded ? 'COLLAPSE' : 'EXPAND' }}</span>
    </button>
    <footer v-if="expanded" class="flora-album-gallery__footer">
      <nav class="flora-album-gallery__pagination" aria-label="相册分页">
        <button
          type="button"
          :aria-label="t('previous')"
          :disabled="pageIndex === 0"
          @click="changePage(-1)"
        >
          <span
            class="flora-album-gallery__page-arrow is-previous"
            aria-hidden="true"
          />
        </button>
        <div class="flora-album-gallery__page-numbers">
          <button
            v-for="page in totalPages ?? pageCursors.length"
            :key="page"
            type="button"
            :aria-label="t('page', { page })"
            :aria-current="page === pageIndex + 1 ? 'page' : undefined"
            :disabled="page > pageCursors.length"
            @click="goToPage(page, $event)"
          >
            {{ page }}
          </button>
        </div>
        <button
          type="button"
          :aria-label="t('next')"
          :disabled="!pageCursors[pageIndex + 1]"
          @click="changePage(1)"
        >
          <span class="flora-album-gallery__page-arrow" aria-hidden="true" />
        </button>
      </nav>
    </footer>
  </section>
</template>

<style scoped lang="less">
.flora-album-gallery.no-rem {
  position: absolute;
  right: var(--flora-content-inset);
  bottom: var(--flora-content-inset);
  left: var(--flora-content-inset);
  height: clamp(240px, 34vh, 320px);
  display: flex;
  flex-direction: column;
  --album-background: var(--flora-theme-color);
  isolation: isolate;
  color: #fffff4;
  pointer-events: auto;
  transition: height 850ms cubic-bezier(0.22, 1, 0.36, 1);
  animation: album-fade-in 450ms ease both;

  &.is-expanded {
    .flora-album-gallery__background {
      opacity: 0.4;
    }
    &::before {
      background: color-mix(in srgb, var(--flora-theme-color) 40%, transparent);
    }
    right: var(--flora-content-inset);
    left: var(--flora-content-inset);
    height: calc(
      100% - 2 * var(--flora-content-inset) - clamp(36px, 8cqw, 88px) -
        var(--album-title-space)
    );

    .flora-album-gallery__title {
      max-width: 100%;
    }
  }
  &::before {
    position: absolute;
    top: -32px;
    right: 0;
    left: 0;
    height: 32px;
    transition: background-color 850ms ease, opacity 200ms ease;
    background: color-mix(in srgb, var(--flora-theme-color) 60%, transparent);
    -webkit-mask-image: var(--album-overflow-mask);
    mask-image: var(--album-overflow-mask);
    content: '';
    pointer-events: none;
  }
  .album-mode-enter-active {
    transition: opacity 420ms ease,
      transform 550ms cubic-bezier(0.22, 1, 0.36, 1), clip-path 550ms ease;
  }
  .album-mode-leave-active {
    pointer-events: none;
    transition: opacity 350ms 150ms ease, transform 500ms ease,
      clip-path 500ms ease;
    :deep(.flora-album-strip__photo) {
      transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }
  .album-mode-leave-to :deep(.flora-album-strip__photo) {
    transform: translate(-50%, -50%) perspective(1400px) rotateY(0deg)
      scale(1.08);
  }
  .album-mode-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.94);
    clip-path: inset(15% 0 0 0);
  }
  .album-mode-leave-to {
    opacity: 0;
    transform: translateY(-24px) scale(1.1);
    clip-path: inset(0 0 15% 0);
  }
  &:not(.is-expanded) {
    .album-mode-enter-from {
      transform: translateY(-16px) scale(1.04);
      clip-path: inset(0 0 15% 0);
    }
    .album-mode-leave-to {
      transform: translateY(16px) scale(0.94);
      clip-path: inset(15% 0 0 0);
    }
  }
  .flora-album-gallery__viewport {
    position: relative;
    z-index: 0;
    min-height: 0;
    flex: 1;
    padding-top: 12px;
    padding-inline: 30px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  &.is-expanded:not(.flora-album-gallery--mobile)
    .flora-album-gallery__viewport {
    margin-top: 20px;
  }
  @media (max-width: 900px) {
    .flora-album-gallery__viewport {
      padding-inline: 35px;
    }
    &.is-expanded .flora-album-gallery__footer {
      padding-bottom: 76px;
    }
  }
  .flora-album-gallery__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px;
  }
  .flora-album-gallery__title {
    -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
    position: absolute;
    bottom: calc(100% - 4px);
    left: 0;
    max-width: 100%;
    margin: 0;
    z-index: 2;
    pointer-events: auto;
    transition: opacity 200ms ease;
    font: 400 72px / 1.2 'UnboundedSans', sans-serif;
    button {
      padding: 0;
      font: inherit;
      text-align: left;
      &:disabled {
        opacity: 1;
      }
    }
  }
  .flora-album-gallery__decoration {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 2;
    width: clamp(140px, 28%, 240px);
    height: auto;
    transform: translate(12%, 66%);
    clip-path: inset(0 0 0 10%);
    pointer-events: none;
    user-select: none;
    opacity: 1;
    transition: opacity 300ms ease, visibility 0s;
  }
  .flora-album-gallery__background {
    position: absolute;
    inset: 0;
    z-index: -1;
    display: grid;
    grid-template-rows: repeat(12, minmax(0, 1fr));
    opacity: 0.6;
    transition: opacity 200ms ease;
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 1px,
      #000 1px 4px
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 1px,
      #000 1px 4px
    );
    pointer-events: none;
    span {
      margin-bottom: -1px;
      background: var(--album-background);
      transform-origin: center bottom;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(
        :has(
            button:hover,
            a:hover,
            input:hover,
            video:hover,
            [role='button']:hover
          )
      ) {
      &::before {
        opacity: 0.8;
      }
      .flora-album-gallery__background {
        opacity: 0.48;
      }
      &.is-expanded .flora-album-gallery__background {
        opacity: 0.32;
      }
    }
    .flora-album-gallery__title:hover {
      opacity: 0.8;
    }
  }
  &.has-toggled .flora-album-gallery__background span {
    animation: album-blade-close 600ms ease both;
    animation-delay: calc((11 - var(--blade-index)) * 24ms);
  }
  &.is-expanded .flora-album-gallery__background span {
    transform-origin: center top;
    animation-name: album-blade-open;
    animation-delay: calc(var(--blade-index) * 24ms);
  }
  .flora-album-gallery__page-numbers {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    button[aria-current='page'] {
      background: #fffff4;
      color: #000;
    }
  }
  .flora-album-gallery__pagination {
    display: flex;
    align-items: center;
    gap: 8px;
    button:hover {
      background: #e23456;
      color: #000;
    }
  }
  .flora-album-gallery__page-arrow {
    display: inline-block;
    width: 0.8em;
    height: 0.8em;
    background: currentColor;
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    vertical-align: middle;
    &.is-previous {
      transform: rotate(180deg);
    }
  }
  &:not(.flora-album-gallery--mobile) .flora-album-gallery__pagination {
    gap: 12px;
    button {
      padding: 6px 9px;
      font-size: 18px;
    }
  }
  button {
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: inherit;
    font: 700 14px / 1.4 'alibaba-puhuiti', sans-serif;
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:focus-visible {
      outline: 1px solid currentColor !important;
      outline-offset: 2px;
    }
  }
  button.flora-album-gallery__expand {
    position: absolute;
    bottom: 12px;
    right: 42px;
    z-index: 3;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    overflow: visible;
    background: #000;
    color: #fff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    font: 400 36px / 1 'Anton', sans-serif;
    letter-spacing: 0;
    &::before {
      position: absolute;
      top: 0;
      right: 100%;
      bottom: 0;
      width: 24px;
      background: inherit;
      -webkit-mask-image: linear-gradient(to right, transparent, #000);
      mask-image: linear-gradient(to right, transparent, #000);
      pointer-events: none;
      content: '';
    }
    &:hover,
    &:focus-visible {
      background: #e23456;
      color: #000;
      box-shadow: 0 4px 14px rgba(226, 52, 86, 0.5);
    }

    span {
      flex-shrink: 0;
      font-family: inherit;
      font-weight: inherit;
      font-style: inherit;
      white-space: nowrap;
    }
  }
  .flora-album-gallery__notice {
    padding: 16px;
    margin: 0;
    font-size: 14px;
  }
  &.flora-album-gallery--mobile {
    --album-inline-inset: calc(var(--flora-content-inset) + 1px);
    --album-toggle-width: 80px;
    --album-toggle-right: 8px;

    left: var(--album-inline-inset);
    right: var(--album-inline-inset);
    bottom: calc(var(--flora-content-inset) + 1px);
    height: clamp(120px, 17vh, 160px);
    transition: height 850ms cubic-bezier(0.22, 1, 0.36, 1),
      bottom 850ms cubic-bezier(0.22, 1, 0.36, 1);

    .flora-album-gallery__title {
      font-size: 44px;
      bottom: 100%;
    }

    :deep(.flora-album-strip.no-rem) {
      width: 100%;
      padding: 6px 8px;
    }

    :deep(.media-gallery__card) {
      --media-gallery-max-height: clamp(180px, 52vw, 270px);
    }

    button.flora-album-gallery__expand {
      right: var(--album-toggle-right);
      bottom: 8px;
      width: var(--album-toggle-width);
      height: 30px;
      box-sizing: border-box;
      padding: 6px 8px;
      font-size: 18px;

      &:hover,
      &:focus-visible {
        background: #000;
        color: #fff;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        animation: none;
      }
    }

    &.is-expanded {
      z-index: 5;
      .flora-album-gallery__decoration {
        opacity: 0;
        visibility: hidden;
        transition: opacity 300ms ease, visibility 0s 300ms;
      }
      bottom: calc(0px - var(--flora-footer-offset) - var(--flora-bottom-gap));
      height: 100dvh;

      .flora-album-gallery__viewport {
        margin-top: 20px;
        padding: 8px;
      }

      .flora-album-gallery__footer {
        justify-content: flex-start;
        padding: 8px
          calc(var(--album-toggle-right) + var(--album-toggle-width) + 8px) 8px
          8px;
      }

      .flora-album-gallery__pagination {
        min-height: 30px;
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .album-mode-enter-active,
    .album-mode-leave-active {
      transition: none;
      :deep(.flora-album-strip__photo) {
        transition: none;
      }
    }

    &.flora-album-gallery--mobile {
      transition: none;

      .flora-album-gallery__background span {
        animation: none;
      }

      button.flora-album-gallery__expand {
        transition: none;
      }
    }

    transition: none;
    animation: none;
    .flora-album-gallery__background span {
      animation: none;
    }
    &::before {
      transition: none;
    }
    button.flora-album-gallery__expand {
      transition: none;
    }
    button.flora-album-gallery__expand:hover,
    button.flora-album-gallery__expand:focus-visible {
      animation: none;
    }
  }
}
@keyframes album-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes album-blade-open {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}
@keyframes album-blade-close {
  0% {
    transform: scaleY(1);
  }
  35% {
    transform: scaleY(0.15);
  }
  100% {
    transform: scaleY(1);
  }
}
</style>
