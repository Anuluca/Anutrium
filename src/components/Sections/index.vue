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
      v-if="navigation !== false && isClient && isNavigationHost"
      :active-anchor-id="activeAnchorId"
      :is-page-end="isNavigationAtPageEnd"
      :items="navigationItems"
      @select="scrollToSection"
    />

    <aside class="home-section-rail scroll-reveal-title" aria-hidden="true">
      <span class="home-section-rail__num">{{ formattedSectionNumber }}</span>
    </aside>

    <div class="home-section-panel">
      <div class="home-section-title-row scroll-reveal-title">
        <h2 :id="sectionAnchorId" class="home-section-title">
          <span class="home-section-title__text">{{ title }}</span>
          <span v-if="shouldShowTitleEn" class="home-section-title__en">
            {{ titleEn }}
          </span>
        </h2>
        <div v-if="$slots.actions" class="home-section-actions">
          <slot name="actions" />
        </div>
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
  navigation?: boolean
  reveal?: boolean
}>()

const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)
const { isReady: isScrollRevealReady } =
  props.reveal === false
    ? { isReady: ref(false) }
    : useScrollReveal({
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

watch(
  () => [props.sectionNumber, props.title, props.titleEn, locale.value],
  announceNavigationRefresh
)
</script>

<style lang="less" scoped>
.home-section-layout {
  --section-heading-height: 2.02rem;
  --section-number-font-size: 2.2rem;

  position: relative;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: 0.7rem;
  row-gap: 20px;
  min-height: 100%;
}

.home-section-content {
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

.home-section-rail {
  display: flex;
  grid-row: 1;
  grid-column: 1;
  align-items: center;
}

.home-section-rail__num {
  display: block;
  color: transparent;
  font-family: 'Anton', monospace;
  font-size: var(--section-number-font-size);
  line-height: 0.875;
  text-align: center;
  -webkit-text-stroke: 1px #e23456;
  text-shadow: 0 0 10px rgba(226, 52, 87, 0.27);
}

.home-section-panel {
  display: contents;
  min-width: 0;
}

.home-section-content {
  grid-row: 2;
  grid-column: 1 / -1;
  min-width: 0;
}

.home-section-title {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex-direction: column;
  align-items: center;
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
  text-align: center;
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
  align-items: center;
  gap: 20px;
  margin-bottom: 0;
  padding-top: 0;

  .home-section-title {
    grid-column: 2;
    margin-bottom: 0;
    justify-self: center;
  }
}

.home-section-actions {
  grid-column: 3;
  justify-self: end;
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-section-layout {
    --section-heading-height: 2.09rem;
    --section-number-font-size: 2.25rem;

    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: 0.8rem;
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
    --section-heading-height: 2.09rem;
    --section-number-font-size: 2.25rem;

    column-gap: 0.8rem;
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
</style>
