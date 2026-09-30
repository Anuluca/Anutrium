<template>
  <div
    ref="videoListRef"
    class="video-list"
    :class="{ 'is-entered': entranceStarted }"
    :style="{ '--video-columns': Math.min(videos.length, 3) }"
  >
    <button
      v-for="(video, index) in videos"
      :key="video.bvid || index"
      class="video-item"
      :style="{ '--video-entry-delay': `${360 + index * 90}ms` }"
      type="button"
      :aria-label="`播放 ${video.title}`"
      @animationstart="handleEntranceHandoff(index, $event)"
      @click="openVideo(video)"
    >
      <div class="video-frame">
        <img
          :src="video.cover"
          :alt="video.title"
          loading="lazy"
          width="1280"
          height="720"
          decoding="async"
        />
        <span class="video-play" aria-hidden="true"><span>▶</span></span>
      </div>
      <strong class="video-title">{{ video.title }}</strong>
    </button>
  </div>

  <Teleport to="body">
    <Transition name="video-modal">
      <div
        v-if="activeVideo"
        class="video-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="activeVideo.title"
        @click.self="closeVideo"
      >
        <div class="video-modal__player">
          <DiamondCloseBtn
            class="video-modal__close"
            title="关闭视频 (ESC)"
            @click="closeVideo"
          />
          <div class="video-modal__stage">
            <iframe
              v-if="activeVideo.embedUrl"
              :src="activeVideo.embedUrl"
              :title="activeVideo.title"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
              scrolling="no"
              frameborder="0"
              class="no-cursor"
              sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts"
            />
            <a
              v-else
              class="video-modal__fallback"
              :href="activeVideo.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              打开视频
            </a>
          </div>

          <div class="video-modal__info">
            <strong class="video-modal__title">{{ activeVideo.title }}</strong>
            <span class="video-modal__bvid">{{ activeVideo.bvid || '' }}</span>
            <a
              class="video-modal__source"
              :href="activeVideo.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`在 Bilibili 打开 ${activeVideo.title}`"
            >
              <span>BILIBILI</span>
              <TopRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { TopRight } from '@element-plus/icons-vue'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'
import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import { useOverlayScrollLock } from '@/composables/useOverlayScrollLock'

interface VideoItem {
  title: string
  cover: string
  bvid?: string
  url: string
  embedUrl?: string
}

const props = defineProps<{
  videos: VideoItem[]
}>()
const emit = defineEmits<{
  (event: 'entranceHandoff'): void
}>()

const videoListRef = ref<HTMLElement | null>(null)
const activeVideo = ref<VideoItem | null>(null)
const entranceStarted = ref(false)
let isVideoListVisible = false
let hasEmittedEntranceHandoff = false

const openVideo = (video: VideoItem) => {
  activeVideo.value = video
}

const closeVideo = () => {
  activeVideo.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && activeVideo.value) closeVideo()
}

const emitEntranceHandoff = () => {
  if (hasEmittedEntranceHandoff) return
  hasEmittedEntranceHandoff = true
  emit('entranceHandoff')
}

const handleEntranceHandoff = (index: number, event: AnimationEvent) => {
  if (
    index !== props.videos.length - 1 ||
    !event.animationName.includes('journey-video-in')
  ) {
    return
  }

  emitEntranceHandoff()
}

const replayEntrance = async () => {
  hasEmittedEntranceHandoff = false
  entranceStarted.value = false
  await nextTick()

  if (isVideoListVisible) {
    entranceStarted.value = true
  }
}

watch(
  () => props.videos,
  () => {
    closeVideo()
    replayEntrance()
  }
)

useOverlayScrollLock('journey-video', () => Boolean(activeVideo.value))

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const { refresh: observeVideoList } = useIntersectionActivation(
  videoListRef,
  ([entry]) => {
    isVideoListVisible = entry?.isIntersecting ?? false
    if (isVideoListVisible && !entranceStarted.value) {
      entranceStarted.value = true
    }
  },
  {
    autoStart: false,
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px',
    onUnsupported: () => {
      isVideoListVisible = true
      entranceStarted.value = true
    },
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  if (prefersReducedMotion()) {
    entranceStarted.value = true
    emitEntranceHandoff()
    return
  }
  observeVideoList()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="less" scoped>
@red: #e23456;
@line: rgba(226, 52, 86, 0.28);
@bg: #050206;

.video-list {
  display: grid;
  grid-template-columns: repeat(var(--video-columns), minmax(0, 300px));
  justify-content: center;
  gap: 50px;
}

.video-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.video-list:not(.is-entered) .video-item {
  opacity: 0;
  filter: brightness(0.55);
  transform: translateY(48px) scale(0.95);
}

.video-list.is-entered .video-item {
  transform-origin: center bottom;
  animation: journey-video-in 0.78s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--video-entry-delay, 0ms);
}

.video-title {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.72);
  font-family: 'alibaba-puhuiti';
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.video-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid rgb(68 68 68 / 28%);
  background: @bg;
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.213);
  transition: border-color 0.25s, box-shadow 0.3s, transform 0.2s;

  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.25s;
  }
}

.video-item:hover .video-frame,
.video-item:focus-visible .video-frame {
  border-color: @red;

  img {
    filter: brightness(0.82) saturate(1.08);
  }

  .video-play {
    color: @red;
    border-color: @red;
  }
}

.video-item:hover .video-title,
.video-item:focus-visible .video-title {
  color: @red;
}

.video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  color: #fff;
  background: rgba(5, 2, 6, 0.68);
  font-size: 1.05rem;
  line-height: 1;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 22px rgba(176, 176, 176, 0.42);

  span {
    padding-top: 3px;
    padding-left: 5px;
  }
}

.video-modal {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(0, 0, 0, 0.86);
}

.video-modal__player {
  position: relative;
  width: 70%;
  background: transparent;
  transform-origin: center center;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 999;
    background: rgba(255, 255, 255, 0.62);
    content: '';
    opacity: 0;
    mix-blend-mode: screen;
    pointer-events: none;
  }
}

.video-modal__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
}

.video-modal__info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  min-height: 34px;
  padding: 5px 24px 6px;
  color: #fff;
  background: #000;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.52rem;
  line-height: 1.25;

  > * {
    min-width: 0;
  }
}

.video-modal__title {
  overflow: hidden;
  padding-right: 20px;
  color: @red;
  font-family: 'UnboundedSans', 'Courier New', monospace;
  font-size: 0.68rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-modal__bvid {
  padding: 0 24px 0 12px;
  background: linear-gradient(rgba(117, 18, 38, 0.9), rgba(117, 18, 38, 0.9))
    right center / 8px 1px no-repeat;
  font-family: 'UnboundedSans', 'Courier New', monospace;
  white-space: nowrap;
}

.video-modal__source {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-left: 16px;
  color: #fff;
  font-family: 'UnboundedSans', 'Courier New', monospace;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;

  svg {
    width: 15px;
    height: 15px;
    color: @red;
  }

  &:hover,
  &:focus-visible {
    color: @red;
  }
}

.video-modal-enter-active {
  transition: opacity 0.46s ease;

  .video-modal__player {
    animation: anutriumCrtOn 0.46s cubic-bezier(0.19, 1, 0.22, 1) forwards;

    &::after {
      animation: anutriumCrtFlashOn 0.46s linear forwards;
    }
  }
}

.video-modal-leave-active {
  transition: opacity 0.42s ease;

  .video-modal__player {
    animation: anutriumCrtOff 0.42s cubic-bezier(0.2, 1, 0.22, 1) forwards;

    &::after {
      animation: anutriumCrtFlashOff 0.42s linear forwards;
    }
  }
}

.video-modal-enter-from,
.video-modal-leave-to {
  opacity: 0;
}

.video-modal__player > .video-modal__close {
  top: -52px;
  right: 0;
}

.video-modal__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
}

@keyframes journey-video-in {
  from {
    opacity: 0;
    filter: brightness(0.55);
    transform: translateY(48px) scale(0.95);
  }

  to {
    opacity: 1;
    filter: brightness(1);
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .video-list {
    grid-template-columns: 1fr;
  }

  .video-modal {
    padding: 16px;
  }

  .video-modal__player {
    width: 100%;
  }

  .video-modal__info {
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 26px;
    padding: 3px 12px 4px;
    font-size: 0.8rem;
  }

  .video-modal__title {
    font-size: 1.04rem;
  }

  .video-modal__bvid {
    display: none;
  }

  .video-modal__source {
    padding-left: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .video-list:not(.is-entered) .video-item {
    opacity: 1;
    filter: none;
    transform: none;
  }

  .video-list.is-entered .video-item {
    animation: none;
  }
}
</style>
