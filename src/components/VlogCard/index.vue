<template>
  <div
    class="shared-vlog-card"
    :class="{
      'is-map-target': active,
      'has-detail': interactive,
      'is-en': locale === 'en',
      'is-base-loaded': isBaseLoaded,
      'is-hover-loaded': isHoverLoaded,
      'has-media-stats': hasMediaStats,
      'is-activity': vlog.category === 'activity',
      'is-compact': compact,
      'has-hover-effects': hoverEffects,
    }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="selectVlog"
    @focusin="handleTitleHover"
    @keydown.enter.prevent="selectVlog"
    @keydown.space.prevent="selectVlog"
    @mouseenter="handleTitleHover"
  >
    <div class="vlog-img-wrap">
      <div
        v-if="!isBaseLoaded"
        class="vlog-image-placeholder"
        aria-hidden="true"
      />
      <img
        class="vlog-img vlog-img--base"
        :src="cardImage"
        :alt="vlog.title"
        decoding="async"
        @load="isBaseLoaded = true"
      />
      <img
        v-if="hoverEffects && hoverImage"
        class="vlog-img vlog-img--hover"
        :src="hoverImage"
        alt=""
        aria-hidden="true"
        decoding="async"
        @load="isHoverLoaded = true"
      />
    </div>
    <div class="vlog-info">
      <h4 class="vlog-title" :class="{ 'is-split': splitTitle }">
        <template v-if="splitTitle">
          <ShuffleText
            v-if="hoverEffects"
            ref="prefixShuffleRef"
            class="vlog-title-prefix"
            :text="splitTitle.prefix"
            shuffle-direction="right"
            :trigger-on-hover="false"
          />
          <span v-else class="vlog-title-prefix">{{ splitTitle.prefix }}</span>
          <ShuffleText
            v-if="hoverEffects"
            ref="restShuffleRef"
            class="vlog-title-rest"
            :text="splitTitle.rest"
            shuffle-direction="down"
            :trigger-on-hover="false"
          />
          <span v-else class="vlog-title-rest">{{ splitTitle.rest }}</span>
        </template>
        <ShuffleText
          v-else-if="hoverEffects"
          ref="titleShuffleRef"
          :text="vlog.title"
          :shuffle-direction="vlog.category === 'activity' ? 'right' : 'down'"
          :trigger-on-hover="false"
        />
        <span v-else>{{ vlog.title }}</span>
      </h4>
      <span class="vlog-date">{{ vlog.date }}</span>
      <div v-if="hasMediaStats" class="vlog-media-stats">
        <span v-if="videoCount" :aria-label="`${videoCount} videos`">
          <el-icon><VideoCamera /></el-icon>
          <b>×{{ videoCount }}</b>
        </span>
        <span v-if="photoCount" :aria-label="`${photoCount} photos`">
          <el-icon><Picture /></el-icon>
          <b>×{{ photoCount }}</b>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Picture, VideoCamera } from '@element-plus/icons-vue'

import ShuffleText from '@/components/ShuffleText/index.vue'
import { getCardThumbnailUrl } from '@/utils/imageVariant'

import type { JourneyItem } from '@/types/flanerie'

interface ShuffleTextExpose {
  play: () => void
}

const props = withDefaults(
  defineProps<{
    vlog: JourneyItem
    active?: boolean
    interactive?: boolean
    compact?: boolean
    hoverEffects?: boolean
  }>(),
  {
    active: false,
    interactive: false,
    compact: false,
    hoverEffects: true,
  }
)

const emit = defineEmits<{
  (event: 'select', vlog: JourneyItem): void
}>()

const { locale } = useI18n()
const isBaseLoaded = ref(false)
const isHoverLoaded = ref(false)
const prefixShuffleRef = ref<ShuffleTextExpose | null>(null)
const restShuffleRef = ref<ShuffleTextExpose | null>(null)
const titleShuffleRef = ref<ShuffleTextExpose | null>(null)
const cardImage = computed(() => getCardThumbnailUrl(props.vlog.img))
const hoverImage = computed(() => {
  const image = props.vlog.img2
  return image && image !== props.vlog.img ? getCardThumbnailUrl(image) : null
})
const photoCount = computed(() => props.vlog.photos?.length ?? 0)
const videoCount = computed(() => props.vlog.videos?.length ?? 0)
const hasMediaStats = computed(
  () => photoCount.value > 0 || videoCount.value > 0
)
const splitTitle = computed(() => {
  const title = props.vlog.title
  const separatorIndex = title.indexOf('·')

  if (props.vlog.category === 'activity' || separatorIndex < 1) {
    return null
  }

  return {
    prefix: title.slice(0, separatorIndex),
    rest: title.slice(separatorIndex + 1),
  }
})

const selectVlog = () => {
  if (!props.interactive) return
  emit('select', props.vlog)
}

const shuffleTitle = () => {
  prefixShuffleRef.value?.play()
  restShuffleRef.value?.play()
  titleShuffleRef.value?.play()
}

const handleTitleHover = () => {
  if (!props.hoverEffects) return
  shuffleTitle()
}

watch(cardImage, () => (isBaseLoaded.value = false))
watch(hoverImage, () => (isHoverLoaded.value = false))
</script>

<style lang="less" scoped>
.shared-vlog-card {
  --postcard-gap: clamp(0.375rem, 0.65vw, 0.625rem);
  --postcard-padding: clamp(0.375rem, 0.65vw, 0.625rem);
  --postcard-side-width: clamp(2.8rem, 12%, 3.4rem);

  position: relative;
  display: grid;
  width: 100%;
  max-width: 580px;
  min-width: 0;
  padding: var(--postcard-padding);
  grid-template-columns: minmax(0, 1fr) var(--postcard-side-width);
  gap: var(--postcard-gap);
  overflow: hidden;
  box-sizing: border-box;
  background: #e8e8e8;
  color: #111;
  cursor: default;
  isolation: isolate;

  &.has-detail {
    cursor: pointer;
  }

  &.is-map-target {
    outline: 2px solid #e23456;
    outline-offset: -2px;
  }

  &.has-detail:focus-visible {
    outline: 2px solid #e23456;
    outline-offset: 3px;
  }

  &.has-hover-effects:hover {
    .vlog-img {
      transform: scale(1.05);
    }
  }

  &.has-hover-effects.is-hover-loaded:hover,
  &.has-hover-effects.is-hover-loaded.is-map-target {
    .vlog-img--base {
      opacity: 0;
    }

    .vlog-img--hover {
      opacity: 1;
    }
  }
}

.vlog-img-wrap {
  position: relative;
  z-index: 1;
  min-width: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 4px;
  background: #eee;
}

.vlog-img {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.28s ease,
    transform 0.42s cubic-bezier(0.22, 0.72, 0.24, 1);
}

.vlog-img--hover {
  z-index: 2;
}

.shared-vlog-card.is-base-loaded .vlog-img--base {
  opacity: 1;
}

.vlog-image-placeholder {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #eee;
}

.vlog-info {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  min-height: 0;
  align-items: flex-end;
  flex-direction: column;
  justify-content: flex-start;
  gap: clamp(0.25rem, 0.5vw, 0.45rem);
  overflow: visible;
  color: #111;
  opacity: 1;
}

.vlog-title {
  max-height: calc(100% - 1.4rem);
  margin: 0;
  color: #111;
  font-family: 'cn-custom', sans-serif;
  font-size: clamp(1.5rem, 2.5vw, 2.2rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.1em;
  text-overflow: ellipsis;
  white-space: nowrap;
  writing-mode: vertical-rl;
  text-orientation: upright;
}

.shared-vlog-card:not(.is-activity) .vlog-title {
  padding-inline-end: 0.14em;
  margin-inline-end: -0.14em;
  letter-spacing: -0.16em;
}

.shared-vlog-card:not(.is-activity) .vlog-title.is-split {
  display: flex;
  padding-inline-end: 0;
  margin-inline-end: 0;
  align-items: flex-end;
  flex-direction: column;
  writing-mode: horizontal-tb;

  .vlog-title-prefix {
    flex: none;
    font-size: 0.5em;
    letter-spacing: 0;
    line-height: 1.4;
    white-space: nowrap;
  }

  .vlog-title-rest {
    min-height: 0;
    padding-inline-end: 0.14em;
    margin-inline-end: -0.14em;
    letter-spacing: -0.16em;
    text-overflow: ellipsis;
    white-space: nowrap;
    writing-mode: vertical-rl;
    text-orientation: upright;
  }
}

.vlog-date {
  flex: none;
  color: rgba(17, 17, 17, 0.5);
  font-family: 'cn-custom', sans-serif;
  font-size: clamp(0.46rem, 0.62vw, 0.58rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.shared-vlog-card:not(.is-activity) .vlog-date {
  font-size: clamp(0.52rem, 0.7vw, 0.64rem);
}

.vlog-media-stats {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  width: max-content;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  color: rgba(17, 17, 17, 0.62);
  font-family: 'cn-custom', sans-serif;
  font-size: clamp(0.32rem, 0.42vw, 0.39rem);
  font-weight: 400;
  line-height: 1;

  > span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.08rem;
  }

  .el-icon {
    font-size: 1.15em;
  }

  b {
    font-family: 'alibaba-puhuiti', sans-serif;
    font-weight: 400;
  }
}

.shared-vlog-card.is-activity {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(2.65rem, auto);
  row-gap: clamp(0.1rem, 0.2vw, 0.18rem);

  .vlog-img-wrap {
    grid-column: 1;
    grid-row: 1;
  }

  .vlog-info {
    display: grid;
    min-height: 2.65rem;
    grid-column: 1;
    grid-row: 2;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: end;
    gap: clamp(0.45rem, 1vw, 0.8rem);
  }

  .vlog-title,
  &.has-media-stats .vlog-title {
    max-width: 100%;
    max-height: none;
    align-self: end;
    grid-column: 1;
    grid-row: 1 / 3;
    overflow-wrap: anywhere;
    font-size: clamp(1.08rem, 1.7vw, 1.5rem);
    line-height: 1.05;
    text-overflow: ellipsis;
    white-space: normal;
    writing-mode: horizontal-tb;
    text-orientation: mixed;
  }

  .vlog-date {
    align-self: end;
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
    writing-mode: horizontal-tb;
    text-orientation: mixed;
  }

  .vlog-media-stats {
    position: static;
    align-self: end;
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.18rem;
  }
}

.shared-vlog-card.is-en {
  .vlog-title {
    font-family: 'Anton', sans-serif;
    font-weight: 400;
    letter-spacing: -0.03em;
    text-orientation: mixed;
  }

  .vlog-date {
    font-family: 'Anton', sans-serif;
    font-weight: 400;
    letter-spacing: 0.02em;
  }
}

.shared-vlog-card.is-en:not(.is-activity) .vlog-title {
  letter-spacing: -0.07em;
}

.shared-vlog-card.is-en:not(.is-activity) .vlog-title.is-split {
  .vlog-title-rest {
    letter-spacing: -0.07em;
    text-orientation: mixed;
  }
}

@media (max-width: 768px) {
  .shared-vlog-card {
    --postcard-gap: 0.3rem;
    --postcard-padding: 0.3rem;
    --postcard-side-width: clamp(2.5rem, 18%, 3rem);
  }

  .vlog-title {
    max-height: calc(100% - 1.15rem);
    font-size: clamp(1.75rem, 7.2vw, 2.15rem);
  }

  .vlog-date {
    font-size: clamp(0.4rem, 1.8vw, 0.5rem);
  }

  .shared-vlog-card:not(.is-activity) .vlog-date {
    font-size: clamp(0.46rem, 2vw, 0.55rem);
  }

  .shared-vlog-card.is-activity {
    grid-template-rows: auto minmax(2.2rem, auto);
    row-gap: 0.1rem;

    .vlog-info {
      min-height: 2.2rem;
      gap: 0.35rem;
    }

    .vlog-title,
    &.has-media-stats .vlog-title {
      font-size: clamp(1.29rem, 5.55vw, 1.52rem);
    }
  }
}

.shared-vlog-card.is-compact {
  --postcard-gap: 2.5%;
  --postcard-padding: 2.5%;
  --postcard-side-width: 23%;

  container-type: inline-size;

  .vlog-info {
    gap: 2cqw;
  }

  .vlog-title {
    max-height: calc(100% - 10cqw);
    font-size: 13cqw;
  }

  .vlog-date,
  &:not(.is-activity) .vlog-date {
    font-size: 4.2cqw;
  }

  .vlog-media-stats {
    gap: 2.2cqw;
    font-size: 3.2cqw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vlog-img {
    transition-duration: 0.01ms;
  }
}
</style>
