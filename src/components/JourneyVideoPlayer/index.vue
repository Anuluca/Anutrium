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
        <img :src="video.cover" :alt="video.title" loading="lazy" />
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
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'

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
let videoListObserver: IntersectionObserver | null = null
let isVideoListVisible = false
let hasEmittedEntranceHandoff = false

const openVideo = (video: VideoItem) => {
  activeVideo.value = video
  document.body.classList.add('video-modal-open')
}

const closeVideo = () => {
  activeVideo.value = null
  if (typeof document !== 'undefined') {
    document.body.classList.remove('video-modal-open')
  }
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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    entranceStarted.value = true
    emitEntranceHandoff()
    return
  }

  if (!('IntersectionObserver' in window)) {
    isVideoListVisible = true
    entranceStarted.value = true
    return
  }

  videoListObserver = new IntersectionObserver(
    ([entry]) => {
      isVideoListVisible = entry.isIntersecting

      if (entry.isIntersecting && !entranceStarted.value) {
        entranceStarted.value = true
      }
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px',
    }
  )

  if (videoListRef.value) {
    videoListObserver.observe(videoListRef.value)
  }
})

onBeforeUnmount(() => {
  videoListObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('video-modal-open')
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
  filter: blur(10px) brightness(0.55);
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
  transform: scale(1.025);
  box-shadow: 0 0 10px rgba(226, 52, 86, 0.48), 0 0 32px rgba(226, 52, 86, 0.28),
    inset 0 0 22px rgba(226, 52, 86, 0.12), 8px 10px 0 rgba(0, 0, 0, 0.213);

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
  box-shadow: 0 0 22px rgba(226, 52, 86, 0.42);

  span {
    padding-top: 3px;
    padding-left: 5px;
  }
}

:global(body.video-modal-open) {
  overflow: hidden;
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
  backdrop-filter: blur(8px);
  transition: opacity 0.24s ease;
}

.video-modal__player {
  position: relative;
  width: 70%;
  aspect-ratio: 16 / 9;
  background: #000;
  box-shadow: 0 0 60px rgba(226, 52, 86, 0.2);
  transition: opacity 0.24s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
}

.video-modal-enter-from,
.video-modal-leave-to {
  opacity: 0;

  .video-modal__player {
    opacity: 0;
    transform: translateY(18px) scale(0.96);
  }
}

.video-modal-leave-active .video-modal__player {
  transition-duration: 0.18s;
  transition-timing-function: ease-in;
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
    filter: blur(10px) brightness(0.55);
    transform: translateY(48px) scale(0.95);
  }

  to {
    opacity: 1;
    filter: blur(0) brightness(1);
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
