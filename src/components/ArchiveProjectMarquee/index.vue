<template>
  <div
    class="archive-project-marquee"
    :class="{
      'archive-project-marquee--paused': paused,
      'archive-project-marquee--entrance-active': entranceActive,
    }"
  >
    <div
      v-for="row in projectRows"
      :key="row.id"
      class="archive-project-marquee__row"
      :class="`archive-project-marquee__row--${row.id}`"
    >
      <div
        class="archive-project-marquee__track"
        :style="{ '--archive-project-marquee-loop': `${-100 / repeatCount}%` }"
      >
        <div
          v-for="copyIndex in repeatCount"
          :key="`${row.id}-${copyIndex}`"
          class="archive-project-marquee__group"
          :aria-hidden="copyIndex > 1"
        >
          <template
            v-for="project in row.projects"
            :key="`${copyIndex}-${project.id}`"
          >
            <WorkCard
              v-if="copyIndex === 1"
              class="archive-project-marquee__card"
              :work="project"
              image-loading="eager"
              @select="selectProject"
            />
            <div
              v-else
              class="archive-project-marquee__card archive-project-marquee__card--clone"
              aria-hidden="true"
            >
              <picture>
                <source
                  media="(max-width: 768px)"
                  :srcset="getCardMobileThumbnailUrl(project.img)"
                />
                <img
                  :src="getCardThumbnailUrl(project.img)"
                  alt=""
                  loading="eager"
                  decoding="async"
                  width="768"
                  height="576"
                />
              </picture>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import WorkCard from '@/components/WorkCard/index.vue'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

import type { WorkCardItem } from '@/types/archive'

export interface ArchiveProjectMarqueeItem extends WorkCardItem {
  img: string
}

interface Props {
  projects: ArchiveProjectMarqueeItem[]
  paused?: boolean
  entranceActive?: boolean
  repeat?: number
}

const props = withDefaults(defineProps<Props>(), {
  paused: false,
  entranceActive: false,
  repeat: 2,
})
const emit = defineEmits<{ select: [project: ArchiveProjectMarqueeItem] }>()
const selectProject = (project: WorkCardItem) => {
  emit('select', project as ArchiveProjectMarqueeItem)
}

const repeatCount = computed(() =>
  Math.max(2, Number.isFinite(props.repeat) ? Math.floor(props.repeat) : 2)
)

const projectRows = computed(() => {
  const top: ArchiveProjectMarqueeItem[] = []
  const bottom: ArchiveProjectMarqueeItem[] = []

  props.projects.forEach((project, index) => {
    const row = index % 2 === 0 ? top : bottom
    row.push(project)
  })

  return [
    { id: 'top', projects: top },
    { id: 'bottom', projects: bottom.length > 0 ? bottom : top },
  ] as const
})
</script>

<style scoped lang="less">
.archive-project-marquee {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  contain: layout paint;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 5%,
    #000 32%,
    #000 68%,
    transparent 95%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 5%,
    #000 32%,
    #000 68%,
    transparent 95%,
    transparent 100%
  );
}

.archive-project-marquee__row {
  position: absolute;
  left: -3vw;
  width: 106vw;
  overflow: hidden;
  pointer-events: auto;
  transform: scale(1.08);
  transform-origin: center;

  &--top {
    top: clamp(5rem, 17dvh, 12rem);
  }

  &--bottom {
    right: -3vw;
    bottom: clamp(4rem, 14.5dvh, 9.5rem);
    left: auto;
  }
}

.archive-project-marquee__track {
  display: flex;
  width: max-content;
  animation: archive-project-marquee-scroll 84s linear infinite;
}

.archive-project-marquee__row--bottom .archive-project-marquee__track {
  animation-direction: reverse;
}

.archive-project-marquee__group {
  display: flex;
  flex: none;
  gap: clamp(0.5rem, 1vw, 1rem);
  padding-right: clamp(0.5rem, 1vw, 1rem);
}

.archive-project-marquee__card {
  flex: 0 0 clamp(9rem, 16vw, 17rem);
  aspect-ratio: 16 / 10;
}

.archive-project-marquee__card--clone {
  overflow: hidden;
  background: #0d0d0e;
  box-shadow: 0 0.35rem 0.9rem rgba(0, 0, 0, 0.22);
  pointer-events: none;

  picture,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  img {
    object-fit: cover;
    filter: brightness(0.62);
  }
}

.archive-project-marquee:not(.archive-project-marquee--paused)
  .archive-project-marquee__track {
  will-change: transform;
}

.archive-project-marquee--paused .archive-project-marquee__track {
  animation-play-state: paused;
  will-change: auto;
}

.archive-project-marquee--entrance-active {
  .archive-project-marquee__row {
    animation: archive-project-marquee-enter-from-right 1.2s
      cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
  }

  .archive-project-marquee__row--bottom {
    animation-name: archive-project-marquee-enter-from-left;
  }
}

@keyframes archive-project-marquee-scroll {
  to {
    transform: translate3d(var(--archive-project-marquee-loop), 0, 0);
  }
}

@keyframes archive-project-marquee-enter-from-right {
  from {
    opacity: 0;
    translate: 32vw 0;
  }

  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes archive-project-marquee-enter-from-left {
  from {
    opacity: 0;
    translate: -32vw 0;
  }

  to {
    opacity: 1;
    translate: 0 0;
  }
}

@media (max-width: 768px) {
  .archive-project-marquee__row--top {
    top: 19dvh;
  }

  .archive-project-marquee__row--bottom {
    bottom: 15.5dvh;
  }

  .archive-project-marquee__card {
    flex-basis: clamp(8rem, 46vw, 12rem);
  }
}

@media screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .archive-project-marquee {
    translate: 0 -1dvh;
  }

  .archive-project-marquee__row {
    left: -12vw;
    width: 124vw;
    overflow: visible;
    rotate: 45deg;
  }

  .archive-project-marquee__row--top {
    top: 23dvh;
  }

  .archive-project-marquee__row--bottom {
    right: auto;
    bottom: 19.5dvh;
    left: -12vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .archive-project-marquee__track {
    animation-play-state: paused;
  }

  .archive-project-marquee--entrance-active .archive-project-marquee__row {
    animation-duration: 0.01ms;
    animation-delay: 0s;
  }
}
</style>
