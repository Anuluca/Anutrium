<template>
  <div class="home-flanerie-copy" :class="{ 'is-active': active }">
    <div class="home-flanerie-map-viewport">
      <TravelMap class="home-flanerie-map" mode="background" :active="active" />
    </div>

    <div class="home-flanerie-heading">
      <BlurReveal
        :active="active"
        class="home-flanerie-subtitle"
        :delay="0"
        tag="p"
      >
        {{ subtitle }}
      </BlurReveal>
      <ThemeActionButton
        class="home-flanerie-more"
        :color="color"
        label="MORE FLANERIES"
        to="/flanerie"
      />
      <BounceCards
        class="home-flanerie-bounce-cards"
        :items="journeys"
        container-width="min(46rem, 88vw)"
        container-height="var(--home-flanerie-gallery-height)"
        card-width="clamp(8.75rem, 14vw, 12.75rem)"
        :animation-delay="0"
        :animation-stagger="0.09"
        ease-type="elastic.out(1, 0.55)"
        :transform-styles="journeyTransforms"
        :hover-push-distance="36"
        :enable-hover="true"
        :entrance-active="active"
        content-align="center"
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
import { computed, defineAsyncComponent } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import BlurReveal from '@/components/BlurReveal/index.vue'
import BounceCards from '@/components/BounceCards/index.vue'
import ThemeActionButton from '@/components/ThemeActionButton/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import { homeFlanerieJourneyCardConfig } from '@/config/homeFlanerieJourneyCards'

import type { JourneyItem } from '@/types/flanerie'

const TravelMap = defineAsyncComponent(
  () => import('@/components/TravelMap/index.vue')
)

const props = withDefaults(
  defineProps<{
    active?: boolean
    color?: string
    subtitle: string
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
  configuredJourneys.value.map(({ journey }) => journey)
)
const journeyTransforms = computed(() =>
  configuredJourneys.value.map(({ config }) =>
    usesMobileLayout.value ? config.mobileTransform : config.transform
  )
)
</script>

<style scoped lang="less">
.home-flanerie-copy {
  --home-flanerie-gallery-height: clamp(8rem, 15vw, 12rem);

  position: absolute;
  inset: 0;
  width: auto;
  height: auto;

  &.is-active .home-flanerie-more {
    animation: homeFlanerieTextEnter 0.7s ease-out both;
  }
}

.home-flanerie-map-viewport {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.home-flanerie-map {
  position: absolute;
  inset: 0;
}

.home-flanerie-heading {
  position: absolute;
  top: calc(50% + 3dvh);
  left: 50%;
  z-index: 2;
  display: flex;
  width: min(90vw, 76rem);
  max-width: min(90vw, 76rem);
  flex-direction: column;
  align-items: center;
  text-align: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.home-flanerie-subtitle {
  width: max-content;
  max-width: 100%;
  margin: 0;
  padding: 0.08em 0;
  color: #fff;
  font-family: 'UnboundedSans', sans-serif;
  font-size: clamp(2rem, 3.8vw, 3.6rem);
  font-weight: 400;
  line-height: 1.2;
  opacity: 0;
  text-shadow: 0 0.08em 0.24em rgba(0, 0, 0, 0.72);
}

.home-flanerie-more {
  align-self: center;
  margin-top: 0;
  margin-bottom: clamp(0.5rem, 1.1dvh, 0.75rem);
  opacity: 0;
}

.home-flanerie-bounce-cards {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  align-self: center;
  translate: 0 clamp(2.25rem, 6dvh, 3.75rem);
  scale: 1.5;
  transform-origin: center;
  pointer-events: auto;
}

.home-flanerie-journey-card {
  box-shadow: 0 0.35rem 0.9rem rgba(0, 0, 0, 0.42);
}

@media (max-width: 768px) {
  .home-flanerie-copy {
    --home-flanerie-gallery-height: clamp(17rem, 76vw, 20rem);
  }

  .home-flanerie-heading {
    top: calc(50% - 3dvh);
    right: auto;
    left: 50%;
    width: calc(100% - 2rem);
    max-width: none;
    align-items: center;
    text-align: center;
    transform: translate(-50%, -50%);
  }

  .home-flanerie-subtitle {
    margin-top: 0.75rem;
    translate: 0 1.5dvh;
  }

  .home-flanerie-more {
    translate: 0 1.5dvh;
  }

  .home-flanerie-bounce-cards {
    --bounce-card-width: clamp(8.75rem, 40vw, 10.5rem) !important;

    align-items: center;
    translate: 0 clamp(1.25rem, 3dvh, 2rem);
    scale: 1;
  }
}

@media (max-aspect-ratio: 1) {
  .home-flanerie-subtitle {
    font-size: clamp(1.7rem, 7.5vw, 2.75rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-flanerie-copy.is-active .home-flanerie-more {
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
