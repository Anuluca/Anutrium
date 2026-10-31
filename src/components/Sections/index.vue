<template>
  <div
    ref="sectionRef"
    class="home-section-layout scroll-reveal-section"
    :class="{
      'scroll-reveal-ready': isScrollRevealReady,
      'home-section-layout--background': hasBackground,
      'home-section-layout--monochrome': monochrome,
    }"
    data-sections-nav-item="true"
    :data-section-anchor="sectionAnchorId"
    :data-section-label="sectionLabel"
    :data-section-number="formattedSectionNumber"
    :data-section-title="title"
  >
    <SectionNavigation
      v-if="navigation !== false && isClient && isNavigationHost"
      :active-anchor-id="activeAnchorId"
      :is-page-end="isNavigationAtPageEnd"
      :items="navigationItems"
      @select="scrollToSection"
    />

    <aside class="home-section-rail scroll-reveal-title" aria-hidden="true">
      <span class="home-section-rail__num">
        <span class="home-section-rail__prefix">#</span>
        <span class="home-section-rail__value">{{
          formattedSectionNumber.slice(1)
        }}</span>
      </span>
    </aside>

    <div class="home-section-title-row scroll-reveal-title">
      <h2
        :id="sectionAnchorId"
        class="home-section-title"
        :class="{
          'home-section-title--bilingual': shouldShowTitleEn,
          'home-section-title--chinese': hasChineseTitle,
        }"
      >
        <span class="home-section-title__text">{{ title }}</span>
        <span v-if="shouldShowTitleEn" class="home-section-title__en">
          {{ titleEn }}
        </span>
      </h2>
      <div v-if="$slots.actions" class="home-section-actions">
        <slot name="actions" />
      </div>
    </div>

    <div ref="contentRef" class="home-section-content scroll-reveal-content">
      <div ref="contentInnerRef" class="home-section-content__inner">
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
import { useSectionBodyReveal } from '@/composables/useSectionBodyReveal'
import {
  toSectionAnchorSlug,
  useSectionNavigation,
} from '@/composables/useSectionNavigation'

const props = defineProps<{
  sectionNumber: string | number
  title: string
  titleEn?: string
  showEnglishTitle?: boolean
  navigation?: boolean
  reveal?: boolean
  hasBackground?: boolean
  monochrome?: boolean
}>()

const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const contentInnerRef = ref<HTMLElement | null>(null)
const formattedSectionNumber = computed(
  () => `#${String(props.sectionNumber).replace(/^0+(?=\d)/, '')}`
)
const sectionLabel = computed(() => props.titleEn || props.title)
const shouldShowTitleEn = computed(
  () =>
    props.showEnglishTitle === true &&
    locale.value !== 'en' &&
    Boolean(props.titleEn)
)
const hasChineseTitle = computed(() => /[\u3400-\u9fff]/.test(props.title))

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
  enabled: () => props.navigation !== false,
  eventName: 'sections-navigation:refresh',
  itemSelector: '[data-sections-nav-item="true"]',
  sectionRef,
  resolveTarget: (element, anchorId) =>
    element.querySelector<HTMLElement>(`#${anchorId}`),
})

const revealContent = useSectionBodyReveal(contentRef, contentInnerRef, {
  immediate: props.reveal === false,
  onComplete: announceNavigationRefresh,
})
const { isReady: isScrollRevealReady } =
  props.reveal === false
    ? { isReady: ref(false) }
    : useScrollReveal({
        rootMargin: '0px 0px -12% 0px',
        target: sectionRef,
        threshold: 0.04,
        onReveal: revealContent,
      })

watch(
  () => [props.sectionNumber, props.title, props.titleEn, locale.value],
  announceNavigationRefresh
)
</script>

<style lang="less" scoped>
:global(
    section:has(> .home-section-layout:not(.home-section-layout--monochrome))
  ) {
  padding-bottom: 0 !important;
}

.home-section-layout {
  --section-number-font-size: 2.05rem;
  position: relative;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: 0.7rem;
  row-gap: 20px;
  min-height: 100%;

  &--monochrome {
    --section-background-color: var(--section-monochrome-color, #b5b5b5);
  }

  &--background {
    box-sizing: border-box;
    padding: clamp(12px, 2vw, 24px);
    background-color: color-mix(
      in srgb,
      var(--section-background-color, var(--page-theme-color, #e23456)) 4%,
      transparent
    );
    background-image: repeating-linear-gradient(
      to bottom,
      var(--scanline-color) 0,
      var(--scanline-color) 1px,
      transparent 1px,
      transparent 4px
    );
  }
}

.home-section-content {
  grid-row: 2;
  grid-column: 1 / -1;
  min-width: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

.home-section-content__inner {
  display: flow-root;
}

.home-section-rail {
  display: flex;
  grid-row: 1;
  grid-column: 1;
  align-items: center;
}

.home-section-rail__num {
  display: block;
  opacity: 0.7;
  color: var(--section-accent-color, var(--page-theme-color, #e23456));
  font-family: 'Anton', monospace;
  font-size: var(--section-number-font-size);
  line-height: 0.875;
  text-align: center;
  text-shadow: 0 0 10px
    color-mix(
      in srgb,
      var(--section-accent-color, var(--page-theme-color, #e23456)) 27%,
      transparent
    );
}

.home-section-rail__prefix {
  display: inline-block;
  font-size: 1.1em;
  line-height: 1;
  mask-image: linear-gradient(to right, rgb(0 0 0 / 60%) 50%, rgb(0 0 0 / 30%));
  -webkit-mask-image: linear-gradient(
    to right,
    rgb(0 0 0 / 60%) 50%,
    rgb(0 0 0 / 30%)
  );
}

.home-section-rail__value {
  display: inline-block;
  transform: translateX(-0.1em);
}

.home-section-title {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  scroll-margin-top: 7rem;
  margin: 0;
  padding: 0;
  color: var(--section-accent-color, var(--page-theme-color, #e23456));
  font-family: 'Anton', 'alibaba-puhuiti';
  font-size: 1.3rem;
  font-weight: 900;
}

.home-section-title__text {
  display: block;
  line-height: 1;
  text-align: center;
}

.home-section-title--chinese .home-section-title__text {
  letter-spacing: -0.04em;
  transform: scaleX(0.92);
  transform-origin: center;
}

.home-section-title--bilingual.home-section-title--chinese
  .home-section-title__text {
  transform: scale(0.92, 1.08);
  transform-origin: top center;
}

.home-section-title--bilingual .home-section-title__text {
  mask-image: linear-gradient(to bottom, #000 35%, rgb(0 0 0 / 30%) 100%);
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 35%,
    rgb(0 0 0 / 30%) 100%
  );
}

.home-section-title__en {
  align-self: center;
  display: block;
  width: max-content;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.36);
  font-family: 'UnboundedSans', monospace;
  font-size: 0.34em;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
}

.home-section-title-row {
  display: grid;
  grid-row: 1;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 20px;
  margin-bottom: 0;
  padding-top: 0;

  .home-section-title {
    grid-column: 2;
    margin-bottom: 0;
    justify-self: center;
    align-self: center;
  }
}

.home-section-actions {
  grid-column: 3;
  justify-self: end;
  align-self: stretch;
  display: flex;
  align-items: center;
  transform: translateY(-2px);
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-section-layout {
    --section-number-font-size: 2.1rem;
    column-gap: 0.8rem;
  }
  .home-section-title-row {
    gap: 10px;
  }

  .home-section-title-row .home-section-title {
    min-width: 0;
    margin-top: -0.04em;
    font-size: 1.35rem;
  }

  .home-section-actions {
    transform: translateY(-6px);
  }
}

// 横屏手机的宽高比会命中桌面规则，这里仅同步标题头部的移动端几何。
@media screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .home-section-layout {
    --section-number-font-size: 2.1rem;
    column-gap: 0.8rem;
  }
  .home-section-title-row {
    .home-section-title {
      min-width: 0;
      margin-top: -0.04em;
      font-size: 1.35rem;
    }
  }

  .home-section-actions {
    transform: translateY(-6px);
  }
}

.home-section-title-row
  .home-section-title:not(.home-section-title--bilingual) {
  font-size: 1.78rem;
  transform: translateY(-0.08em);
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .home-section-title-row
    .home-section-title:not(.home-section-title--bilingual) {
    font-size: 1.83rem;
  }
}
</style>
