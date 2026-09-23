<template>
  <div
    ref="sectionRef"
    class="home-section-layout scroll-reveal-section"
    :class="{ 'scroll-reveal-ready': isScrollRevealReady }"
    data-sections-nav-item="true"
    :data-section-anchor="sectionAnchorId"
    :data-section-label="sectionLabel"
    :data-section-number="formattedSectionNumber"
    :data-section-title="title"
  >
    <SectionNavigation
      v-if="isClient && isNavigationHost"
      :active-anchor-id="activeAnchorId"
      :is-page-end="isNavigationAtPageEnd"
      :items="navigationItems"
      @select="scrollToSection"
    />

    <aside class="home-section-rail scroll-reveal-title" aria-hidden="true">
      <span class="home-section-rail__num">{{ formattedSectionNumber }}</span>
      <span class="home-section-rail__label">{{ sectionLabel }}</span>
    </aside>

    <div class="home-section-panel">
      <div class="home-section-title-row scroll-reveal-title">
        <h2 :id="sectionAnchorId" class="home-section-title">
          <span class="home-section-title__text">{{ title }}</span>
          <span v-if="shouldShowTitleEn" class="home-section-title__en">
            <span
              v-for="(character, index) in titleEnCharacters"
              :key="`${character}-${index}`"
            >
              {{ character }}
            </span>
          </span>
        </h2>
        <slot v-if="$slots.actions" name="actions" />
      </div>

      <div class="home-section-content scroll-reveal-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import SectionNavigation from '@/components/SectionNavigation/index.vue'
import { useScrollReveal } from '@/composables/useScrollReveal'
import {
  toSectionAnchorSlug,
  useSectionNavigation,
} from '@/composables/useSectionNavigation'

const props = defineProps<{
  sectionNumber: string | number
  title: string
  titleEn?: string
}>()

const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)
const { isReady: isScrollRevealReady } = useScrollReveal({
  rootMargin: '0px 0px -12% 0px',
  target: sectionRef,
  threshold: 0.04,
})

const formattedSectionNumber = computed(() =>
  String(props.sectionNumber).padStart(2, '0')
)
const sectionLabel = computed(() => props.titleEn || props.title)
const shouldShowTitleEn = computed(
  () => locale.value !== 'en' && Boolean(props.titleEn)
)
const titleEnCharacters = computed(() =>
  shouldShowTitleEn.value ? Array.from(props.titleEn || '') : []
)

const sectionAnchorId = computed(
  () =>
    `section-${toSectionAnchorSlug(props.sectionNumber)}-${toSectionAnchorSlug(
      sectionLabel.value
    )}`
)

const {
  activeAnchorId,
  announceNavigationRefresh,
  isClient,
  isNavigationAtPageEnd,
  isNavigationHost,
  navigationItems,
  scrollToSection,
} = useSectionNavigation({
  eventName: 'sections-navigation:refresh',
  itemSelector: '[data-sections-nav-item="true"]',
  sectionRef,
  resolveTarget: (element, anchorId) =>
    element.querySelector<HTMLElement>(`#${anchorId}`),
})

watch(
  () => [props.sectionNumber, props.title, props.titleEn, locale.value],
  announceNavigationRefresh
)
</script>

<style lang="less" scoped>
.home-section-layout {
  position: relative;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: 0.7rem;
  min-height: 100%;

  &::before {
    grid-row: 2;
    grid-column: 1;
    width: 1px;
    height: 100%;
    justify-self: center;
    background: var(--border-color-strong);
    content: '';
  }
}

.home-section-content {
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

.home-section-rail {
  display: grid;
  grid-row: 1 / span 2;
  grid-column: 1;
  grid-template-rows: subgrid;
  min-height: 180px;
}

.home-section-rail__num {
  display: block;
  grid-row: 1;
  align-self: start;
  margin-top: 0.15rem;
  color: transparent;
  font-family: 'Anton', monospace;
  font-size: clamp(1.65rem, 3.3vw, 2.65rem);
  line-height: 0.9;
  text-align: center;
  -webkit-text-stroke: 1px #e23456;
  text-shadow: 0 0 10px rgba(226, 52, 87, 0.27);
}

.home-section-rail__label {
  grid-row: 2;
  align-self: start;
  justify-self: center;
  margin: 0;
  color: rgba(255, 255, 255, 0.25);
  font-family: 'UnboundedSans', monospace;
  font-size: 0.64rem;
  letter-spacing: 0;
  text-transform: uppercase;
  transform: translateX(calc(-50% - 8px));
  writing-mode: vertical-rl;
  -webkit-mask-image: repeating-linear-gradient(
    to right,
    #000 0,
    #000 1px,
    transparent 1px,
    transparent 3px
  );
  mask-image: repeating-linear-gradient(
    to right,
    #000 0,
    #000 1px,
    transparent 1px,
    transparent 3px
  );
}

.home-section-panel {
  display: contents;
  min-width: 0;
}

.home-section-content {
  grid-row: 2;
  grid-column: 2;
  min-width: 0;
}

.home-section-title {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 0.28rem;
  scroll-margin-top: 7rem;
  margin-bottom: 20px;
  padding: 0;
  color: #e23456;
  font-family: 'Anton', 'alibaba-puhuiti';
  font-size: 1.3rem;
  font-weight: 900;
}

.home-section-title__text {
  display: block;
  line-height: 1;
}

.home-section-title__en {
  align-self: center;
  display: flex;
  width: calc(100% - 0.2rem);
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.36);
  font-family: 'UnboundedSans', monospace;
  font-size: 0.34em;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.home-section-title-row {
  display: flex;
  grid-row: 1;
  grid-column: 2;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding-top: 10px;

  .home-section-title {
    flex: 0 1 auto;
    margin-bottom: 0;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-section-layout {
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: 0.8rem;
    row-gap: 0;
  }

  .home-section-rail {
    min-height: 120px;
  }

  .home-section-rail__num {
    margin-top: 0;
    font-size: 2.2rem;
  }

  .home-section-rail__label {
    font-size: 0.48rem;
    letter-spacing: 0;
    transform: translateX(calc(-50% - 7px));
  }

  .home-section-title-row {
    gap: 10px;
    padding-top: 0;
  }

  .home-section-title-row .home-section-title {
    min-width: 0;
    margin-top: -0.04em;
    font-size: 1.35rem;
  }
}

// 横屏手机的宽高比会命中桌面规则，这里仅同步标题头部的移动端几何。
@media screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .home-section-layout {
    column-gap: 0.8rem;
  }

  .home-section-rail__num {
    margin-top: 0;
    font-size: 2.2rem;
  }

  .home-section-title-row {
    padding-top: 0;

    .home-section-title {
      min-width: 0;
      margin-top: -0.04em;
      font-size: 1.35rem;
    }
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .home-section-rail__label {
    transform: translateX(calc(-50% - 7px));
  }
}
</style>
