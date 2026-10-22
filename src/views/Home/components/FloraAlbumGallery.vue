<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  inject,
  nextTick,
  type Ref,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading, Picture } from '@element-plus/icons-vue'

import MediaGallery from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import { petAlbums } from '@/locales/dynamic/petAlbums'
import { flashActionButton } from '@/utils/flashActionButton'
import { getFloraCaptureDate } from '@/utils/floratriumMedia'

import { useFloraAlbum } from '../composables/useFloraAlbum'
import { useFloraMediaPanel } from '../composables/useFloraMediaPanel'
import FloraAlbumStrip from './FloraAlbumStrip.vue'
import FloraExpandButton from './FloraExpandButton.vue'

const props = defineProps<{ petId: string; title: string; mobile?: boolean }>()
const decorationFilterId = `flora-decoration-tint-${getCurrentInstance()?.uid}`
const decorationTarget = inject<Ref<HTMLElement | null>>(
  'flora-decoration-target',
  ref(null)
)
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
const {
  expanded,
  hasToggled,
  overflowMask,
  toggle,
  toggleFromSurface,
  closeExpanded,
} = useFloraMediaPanel(
  () => props.mobile,
  (value) => emit('expanded-change', value)
)
const viewport = ref<HTMLElement | null>(null)
const album = computed(() => petAlbums[props.petId])
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
defineExpose({ closeExpanded })
</script>

<template>
  <section
    class="flora-album-gallery flora-media-panel no-rem"
    :class="{
      'is-expanded': expanded,
      'is-clickable': true,
      'has-toggled': hasToggled,
      'flora-album-gallery--mobile': mobile,
    }"
    :style="{
      '--album-overflow-mask': overflowMask,
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
    <h2 class="flora-album-gallery__title">
      <button
        type="button"
        :aria-expanded="expanded"
        @click.stop="expanded = !expanded"
      >
        <Picture aria-hidden="true" focusable="false" />
        <span>{{ title }}</span>
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
        <div
          v-if="loading && !allItems.length"
          class="flora-album-gallery__loading"
          role="status"
          :aria-label="t('loading')"
        >
          <el-icon :size="28" class="is-loading" aria-hidden="true">
            <Loading />
          </el-icon>
        </div>
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
    <Teleport
      :to="decorationTarget || 'body'"
      :disabled="!mobile || !decorationTarget"
    >
      <img
        v-if="petId === 'huahua'"
        class="flora-album-gallery__decoration no-rem"
        :style="{
          filter: `url(#${decorationFilterId}) drop-shadow(0 5px 8px rgb(0 0 0 / 85%))`,
        }"
        src="https://assets.anuluca.com/Floratrium/decorations/flora-corner-v1.avif"
        width="480"
        height="223"
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable="false"
      />
    </Teleport>
    <FloraExpandButton
      class="flora-album-gallery__expand"
      icon-class="flora-album-gallery__expand-icon"
      :expanded="expanded"
      :mobile="mobile"
      @click="toggle"
    />
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
@import '../styles/floraMedia.less';
.flora-album-gallery__decoration.no-rem {
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
.flora-album-gallery.no-rem {
  .flora-media-panel();
  display: flex;
  flex-direction: column;
  --album-background: var(--flora-theme-color);
  animation: album-fade-in 450ms ease;

  &.is-expanded {
    .flora-album-gallery__background {
      opacity: 0.4;
    }
    &::before {
      background: color-mix(in srgb, var(--flora-theme-color) 40%, transparent);
    }
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
    .flora-media-title();
    max-width: 100%;
    z-index: 2;
    pointer-events: auto;
    transition: opacity 200ms ease;
    button {
      .flora-media-title-content();
      padding: 0;
      font: inherit;
      text-align: left;
      &:disabled {
        opacity: 1;
      }
    }
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
      transparent 0 var(--flora-background-scanline-gap, 1px),
      #000 var(--flora-background-scanline-gap, 1px)
        var(--flora-background-scanline-period, 4px)
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-background-scanline-gap, 1px),
      #000 var(--flora-background-scanline-gap, 1px)
        var(--flora-background-scanline-period, 4px)
    );
    pointer-events: none;
    span {
      margin-bottom: -1px;
      background: var(--album-background);
      transition: background-color 850ms ease;
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
  button:where(:not(.flora-expand-button)) {
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
  .flora-album-gallery__loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--flora-theme-color);
  }
  .flora-album-gallery__notice {
    padding: 16px;
    margin: 0;
    font-size: 14px;
  }
  &.flora-album-gallery--mobile {
    --album-toggle-width: 80px;
    --album-toggle-right: 8px;

    :deep(.flora-album-strip.no-rem) {
      width: 100%;
      padding: 6px 8px;
    }

    :deep(.media-gallery__card) {
      --media-gallery-max-height: clamp(180px, 52vw, 270px);
    }

    &.is-expanded {
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
      transition: none;
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
