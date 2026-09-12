<template>
  <div class="home-flanerie-copy" :class="{ 'is-active': active }">
    <div class="home-flanerie-map-viewport">
      <TravelMap
        class="home-flanerie-map"
        mode="background"
        :vlogs="vlogs"
        @select="emit('select', $event)"
      />
    </div>

    <div class="home-flanerie-heading">
      <ScrollSectionTitle
        class="home-flanerie-title"
        :color="color"
        :title="title"
      />
      <p class="home-flanerie-subtitle">{{ subtitle }}</p>
      <BounceCards
        class="home-flanerie-bounce-cards"
        :items="journeys"
        container-width="min(46rem, 88vw)"
        container-height="clamp(8rem, 15vw, 12rem)"
        card-width="clamp(8.75rem, 14vw, 12.75rem)"
        :animation-delay="0.28"
        :animation-stagger="0.09"
        ease-type="elastic.out(1, 0.55)"
        :transform-styles="journeyTransforms"
        :hover-push-distance="36"
        :enable-hover="true"
        :entrance-active="active"
        content-align="flex-start"
      >
        <template #default="{ item }">
          <VlogCard
            class="home-flanerie-journey-card"
            :vlog="item as JourneyItem"
            :interactive="true"
            :hover-effects="false"
            compact
            @select="emit('select', item.id)"
          />
        </template>
      </BounceCards>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import BounceCards from '@/components/BounceCards/index.vue'
import ScrollSectionTitle from '@/components/ScrollSectionTitle/index.vue'
import TravelMap from '@/components/TravelMap/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import { homeFlanerieJourneyCardConfig } from '@/config/homeFlanerieJourneyCards'
import { getHomeImageVariantUrl } from '@/utils/imageVariant'

import type { JourneyItem } from '@/types/flanerie'

const props = withDefaults(
  defineProps<{
    active?: boolean
    color?: string
    subtitle: string
    title: string
    vlogs: JourneyItem[]
  }>(),
  {
    active: false,
    color: '#8a2c1b',
  }
)

const emit = defineEmits<{
  select: [vlogId: string]
}>()

const usesMobileLayout = useMediaQuery('(max-width: 768px)')
const configuredJourneys = computed(() => {
  const journeyById = new Map(
    props.vlogs.map((journey) => [journey.id, journey])
  )

  return homeFlanerieJourneyCardConfig.flatMap((config) => {
    const journey = journeyById.get(config.id)
    return journey ? [{ config, journey }] : []
  })
})
const journeys = computed(() =>
  configuredJourneys.value.map(({ journey }) => ({
    ...journey,
    img: getHomeImageVariantUrl(journey.img, 'journey-thumb'),
    img2: journey.img2
      ? getHomeImageVariantUrl(journey.img2, 'journey-thumb')
      : undefined,
  }))
)
const journeyTransforms = computed(() =>
  configuredJourneys.value.map(({ config }) =>
    usesMobileLayout.value ? config.mobileTransform : config.transform
  )
)
</script>

<style scoped lang="less">
.home-flanerie-copy {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.38) 0%,
      rgba(0, 0, 0, 0.2) 14%,
      transparent 30%
    );
    content: '';
    pointer-events: none;
  }

  &.is-active .home-flanerie-subtitle {
    animation: homeFlanerieTextEnter 0.7s ease-out 0.55s both;
  }
}

.home-flanerie-map-viewport {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 10%,
    rgba(0, 0, 0, 0.42) 22%,
    #000 42%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 10%,
    rgba(0, 0, 0, 0.42) 22%,
    #000 42%
  );
}

.home-flanerie-map {
  position: absolute;
  inset: 0;
}

.home-flanerie-heading {
  position: absolute;
  top: calc(50% + clamp(0.75rem, 2dvh, 1.5rem));
  left: calc(50% - clamp(4rem, 10vw, 10rem) - clamp(2.25rem, 4.5vw, 4.5rem));
  z-index: 2;
  display: flex;
  max-width: min(80vw, 76rem);
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.home-flanerie-title {
  position: relative;
  top: auto;
  left: auto;
  transform: none;
}

.home-flanerie-subtitle {
  width: max-content;
  max-width: 100%;
  margin: clamp(1.5rem, 4dvh, 3.25rem) 0 0;
  padding: 0.08em 0;
  color: #fff;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(1.8rem, 3.5vw, 3.4rem);
  font-weight: 900;
  line-height: 1.2;
  text-shadow: 0 0.08em 0.24em rgba(0, 0, 0, 0.72);
}

.home-flanerie-bounce-cards {
  position: absolute;
  top: calc(100% - clamp(0.7rem, 1.2dvh, 1rem));
  left: 0.25rem;
  z-index: 1;
  pointer-events: auto;
}

.home-flanerie-journey-card {
  box-shadow: 0 0.35rem 0.9rem rgba(0, 0, 0, 0.42);
}

@media (max-width: 768px) {
  .home-flanerie-heading {
    top: clamp(7rem, 16dvh, 8.25rem);
    right: 1rem;
    left: 1rem;
    width: auto;
    max-width: none;
    align-items: flex-start;
    text-align: left;
    transform: none;
  }

  .home-flanerie-subtitle {
    margin-top: 0.75rem;
  }

  .home-flanerie-bounce-cards {
    --bounce-card-width: clamp(8.75rem, 40vw, 10.5rem) !important;

    top: calc(100% + 1.5rem);
    left: 0.5rem;
    align-items: flex-start;
    transform: none;
  }
}

@media (max-aspect-ratio: 1) {
  .home-flanerie-subtitle {
    font-size: clamp(1.55rem, 7vw, 2.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-flanerie-copy.is-active .home-flanerie-subtitle {
    animation-duration: 0.01ms;
    animation-delay: 0s;
  }
}

@keyframes homeFlanerieTextEnter {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
