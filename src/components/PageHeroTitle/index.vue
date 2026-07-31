<template>
  <div
    ref="titleContainer"
    class="page-hero-title"
    :style="{ '--page-hero-title-color': titleColor }"
  >
    <h1>
      <span ref="titleText" class="page-hero-title__text" :aria-label="title">
        <span
          v-for="(character, index) in titleCharacters"
          :key="`${character}-${index}`"
          class="page-hero-title__char"
          :class="`is-moving-${characterDirections[index] || 'up'}`"
          aria-hidden="true"
          @pointerleave="randomizeCharacterDirection(index)"
        >
          <span class="page-hero-title__char-current">{{ character }}</span>
          <span class="page-hero-title__char-incoming">{{ character }}</span>
        </span>
      </span>
    </h1>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() =>
  String(route.meta.titleEn || route.name || '').toUpperCase()
)
const titleCharacters = computed(() =>
  Array.from(title.value, (character) =>
    character === ' ' ? '\u00a0' : character
  )
)
const moveDirections = ['up', 'down', 'left', 'right'] as const
type MoveDirection = (typeof moveDirections)[number]
const characterDirections = ref<MoveDirection[]>([])
const themeColors: Record<string, string> = {
  ARCHIVE: '#2f7548',
  FLANERIE: '#8a2c1b',
  CRAFT: '#244392',
  ABOUT: '#3d2875',
}
const titleColor = computed(
  () => themeColors[String(route.name)] || 'var(--text-color)'
)
const titleContainer = ref<HTMLElement | null>(null)
const titleText = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const getRandomDirection = (
  currentDirection?: MoveDirection
): MoveDirection => {
  if (!currentDirection) {
    return moveDirections[Math.floor(Math.random() * moveDirections.length)]
  }

  const currentIndex = moveDirections.indexOf(currentDirection)
  const nextOffset = 1 + Math.floor(Math.random() * (moveDirections.length - 1))

  return moveDirections[(currentIndex + nextOffset) % moveDirections.length]
}

const randomizeCharacterDirection = (index: number) => {
  characterDirections.value[index] = getRandomDirection(
    characterDirections.value[index]
  )
}

const prepareCharacterDirections = () => {
  characterDirections.value = titleCharacters.value.map(() =>
    getRandomDirection()
  )
}

const fitTitleToRow = () => {
  if (!titleContainer.value || !titleText.value) return

  const availableWidth = titleContainer.value.clientWidth - 1
  const naturalWidth = titleText.value.scrollWidth
  if (!availableWidth || !naturalWidth) return

  titleText.value.style.setProperty(
    '--page-hero-title-scale',
    String(availableWidth / naturalWidth)
  )
}

watch(title, () => {
  prepareCharacterDirections()
  nextTick(fitTitleToRow)
})

onMounted(() => {
  prepareCharacterDirections()
  resizeObserver = new ResizeObserver(fitTitleToRow)
  if (titleContainer.value) resizeObserver.observe(titleContainer.value)

  nextTick(fitTitleToRow)
  document.fonts?.ready.then(fitTitleToRow)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<style lang="less" scoped>
.page-hero-title {
  width: 100%;
  overflow: hidden;
  margin: 0 0 clamp(24px, 2.5vw, 40px);
  padding: 0;
  color: var(--page-hero-title-color);
  pointer-events: none;

  h1 {
    width: 100%;
    margin: 0;
    font-family: 'cn-custom', sans-serif;
    font-size: clamp(3.25rem, 11vw, 14rem);
    font-weight: 900;
    letter-spacing: 0;
    line-height: 0.82;
    white-space: nowrap;
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0%,
      rgba(0, 0, 0, 0.55) 30%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      #000 0%,
      rgba(0, 0, 0, 0.55) 30%,
      transparent 100%
    );
  }

  .page-hero-title__text {
    display: inline-flex;
    width: max-content;
    transform: scaleX(var(--page-hero-title-scale, 1));
    transform-origin: left center;
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 4px,
      transparent 4px 6px
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 4px,
      transparent 4px 6px
    );
  }

  .page-hero-title__char {
    --exit-x: 0;
    --exit-y: 0;
    --enter-x: 0;
    --enter-y: 0;

    position: relative;
    display: inline-block;
    overflow: hidden;
    pointer-events: auto;

    > span {
      display: block;
    }

    &:hover > span {
      transition: transform 0.3s ease-in-out;
      will-change: transform;
    }

    .page-hero-title__char-current {
      transform: translate(0);
    }

    .page-hero-title__char-incoming {
      position: absolute;
      inset: 0;
      transform: translate(var(--enter-x), var(--enter-y));
    }

    &.is-moving-up {
      --exit-y: -105%;
      --enter-y: 105%;
    }

    &.is-moving-down {
      --exit-y: 105%;
      --enter-y: -105%;
    }

    &.is-moving-left {
      --exit-x: -105%;
      --enter-x: 105%;
    }

    &.is-moving-right {
      --exit-x: 105%;
      --enter-x: -105%;
    }

    &:hover .page-hero-title__char-current {
      transform: translate(var(--exit-x), var(--exit-y));
    }

    &:hover .page-hero-title__char-incoming {
      transform: translate(0);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-hero-title .page-hero-title__char:hover {
    .page-hero-title__char-current {
      transform: translate(0);
    }

    .page-hero-title__char-incoming {
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .page-hero-title h1 {
    font-size: 11vw;
  }
}
</style>
