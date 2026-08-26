<template>
  <section
    :id="sectionAnchorId"
    ref="sectionRef"
    class="detail-section"
    data-detail-sections-nav-item="true"
    :data-section-anchor="sectionAnchorId"
    :data-section-number="formattedSectionNumber"
    :data-section-title="title"
  >
    <Teleport v-if="isClient && isNavigationHost" to="body">
      <nav
        class="detail-sections-nav"
        :class="{ 'is-page-end': isNavigationAtPageEnd }"
        :aria-label="
          locale === 'en' ? 'Page section navigation' : '页面模块导航'
        "
      >
        <span class="detail-sections-nav__line" aria-hidden="true" />
        <button
          v-for="item in navigationItems"
          :key="item.anchorId"
          class="detail-sections-nav__item"
          :class="{ 'is-active': activeAnchorId === item.anchorId }"
          type="button"
          :aria-label="`${item.number} ${item.title}`"
          :aria-current="
            activeAnchorId === item.anchorId ? 'location' : undefined
          "
          :title="item.title"
          @click="scrollToSection(item, $event)"
        >
          <span class="detail-sections-nav__marker" aria-hidden="true" />
          <span class="detail-sections-nav__copy">
            <span class="detail-sections-nav__number">{{ item.number }}</span>
            <span class="detail-sections-nav__label">{{ item.title }}</span>
          </span>
        </button>
      </nav>
    </Teleport>

    <DetailSectionHeader>
      <template #number>{{ formattedSectionNumber }}</template>
      <template #title>{{ title }}</template>
      <template v-if="itemCount !== undefined" #meta>
        <span>{{ itemCount }}</span>
        <span>{{ itemLabel }}</span>
      </template>
    </DetailSectionHeader>

    <div class="detail-section__content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DetailSectionHeader from '@/components/DetailSectionHeader/index.vue'
import {
  toSectionAnchorSlug,
  useSectionNavigation,
} from '@/composables/useSectionNavigation'

const props = withDefaults(
  defineProps<{
    sectionNumber: string | number
    title: string
    itemCount?: number
    itemLabel?: string
  }>(),
  {
    itemCount: undefined,
    itemLabel: 'ITEMS',
  }
)

const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)

const formattedSectionNumber = computed(() =>
  String(props.sectionNumber).padStart(2, '0')
)

const sectionAnchorId = computed(
  () =>
    `detail-section-${toSectionAnchorSlug(
      props.sectionNumber
    )}-${toSectionAnchorSlug(props.title)}`
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
  eventName: 'detail-sections-navigation:refresh',
  itemSelector: '[data-detail-sections-nav-item="true"]',
  sectionRef,
  scrollDuration: 260,
})

const scrollIntoView = (options?: ScrollIntoViewOptions) => {
  sectionRef.value?.scrollIntoView(options)
}

defineExpose({ scrollIntoView })

watch(
  () => [props.sectionNumber, props.title, props.itemCount, locale.value],
  announceNavigationRefresh
)
</script>

<style lang="less" scoped>
.detail-section {
  scroll-margin-top: 7rem;
}

.detail-sections-nav {
  position: fixed;
  bottom: 80px;
  left: clamp(10px, 1.7vw, 28px);
  z-index: 90;
  display: flex;
  width: clamp(104px, 9vw, 148px);
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  opacity: 0.6;
  transition: opacity 0.25s ease;

  &:hover,
  &:focus-within {
    opacity: 1;
  }

  &::before {
    position: absolute;
    top: -1rem;
    left: -2px;
    z-index: -1;
    color: rgba(226, 52, 86, 0.16);
    content: 'NAV';
    font-family: 'anton', monospace;
    font-size: 2rem;
    line-height: 1;
    pointer-events: none;
  }
}

.detail-sections-nav__line {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 6px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(226, 52, 86, 0.38) 14%,
    rgba(226, 52, 86, 0.38) 86%,
    transparent
  );
  pointer-events: none;
}

.detail-sections-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  column-gap: 5px;
  align-items: center;
  min-height: 42px;
  padding: 5px 2px 5px 0;
  border: 0;
  color: var(--text-faint);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible,
  &.is-active {
    color: #e23456;
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 3px;
  }

  &.is-active .detail-sections-nav__marker {
    border-color: #e23456;
    background: #e23456;
    box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.12);
    transform: rotate(45deg) scale(1);
  }
}

.detail-sections-nav__marker {
  justify-self: center;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(226, 52, 86, 0.56);
  background: var(--bg-color);
  transform: rotate(45deg) scale(0.72);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease,
    transform 0.2s ease;
}

.detail-sections-nav__copy {
  display: flex;
  min-width: 0;
  align-items: center;
}

.detail-sections-nav__number {
  width: 1.25rem;
  flex: 0 0 auto;
  color: inherit;
  font-family: 'cn-custom', monospace;
  font-size: 0.64rem;
  text-align: center;
}

.detail-sections-nav__label {
  min-width: 0;
  margin-left: 4px;
  margin-top: 2px;
  overflow: hidden;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.42rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 901px) {
  .detail-sections-nav {
    width: 20px;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;

    &::before {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover,
    &:focus-within {
      width: clamp(104px, 9vw, 148px);

      &::before {
        opacity: 1;
      }

      .detail-sections-nav__copy {
        max-width: 132px;
        opacity: 1;
      }
    }
  }

  .detail-sections-nav__copy {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
  }
}

@media (max-width: 900px) {
  .detail-sections-nav {
    left: 20px;
    width: 34px;
    box-sizing: border-box;
    padding: 8px 4px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg-color) 12%, transparent);
    opacity: 1;
    backdrop-filter: blur(4px);
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s;

    &.is-page-end {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease,
        visibility 0s linear 0.2s;
    }
  }

  .detail-sections-nav__line {
    left: 9px;
  }

  .detail-sections-nav__item {
    grid-template-columns: 11px;
    min-height: 34px;
    padding: 3px 0;
  }

  .detail-sections-nav__marker {
    width: 6px;
    height: 6px;
  }

  .detail-sections-nav__copy {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-sections-nav,
  .detail-sections-nav__item,
  .detail-sections-nav__marker {
    transition: none;
  }
}
</style>
