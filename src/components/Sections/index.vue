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
    <Teleport v-if="isClient && isNavigationHost" to="body">
      <button
        v-if="isMobileNavigationOpen"
        class="sections-fixed-nav__backdrop"
        type="button"
        :aria-label="
          locale === 'en' ? 'Close section navigation' : '关闭页面导航'
        "
        @click="closeMobileNavigation"
      />
      <nav
        class="sections-fixed-nav"
        :class="{
          'is-mobile-open': isMobileNavigationOpen,
          'is-page-end': isNavigationAtPageEnd,
        }"
        :aria-label="
          locale === 'en' ? 'Page section navigation' : '页面模块导航'
        "
        @keydown.esc="closeMobileNavigation"
      >
        <button
          v-if="!isMobileNavigationOpen"
          class="sections-fixed-nav__toggle"
          type="button"
          :aria-expanded="isMobileNavigationOpen"
          :aria-label="
            locale === 'en' ? 'Toggle section navigation' : '展开页面导航'
          "
          @click="toggleMobileNavigation"
        >
          NAV
        </button>
        <div class="sections-fixed-nav__menu">
          <span class="sections-fixed-nav__line" aria-hidden="true" />
          <button
            v-for="item in navigationItems"
            :key="item.anchorId"
            class="sections-fixed-nav__item"
            :class="{ 'is-active': activeAnchorId === item.anchorId }"
            type="button"
            :aria-label="`${item.number} ${item.title}`"
            :aria-current="
              activeAnchorId === item.anchorId ? 'location' : undefined
            "
            :title="item.title"
            @click="handleSectionNavigation(item, $event)"
          >
            <span class="sections-fixed-nav__marker" aria-hidden="true" />
            <span class="sections-fixed-nav__copy">
              <span class="sections-fixed-nav__num">{{ item.number }}</span>
              <span class="sections-fixed-nav__label">{{ item.title }}</span>
            </span>
          </button>
        </div>
      </nav>
    </Teleport>

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

import { useScrollReveal } from '@/composables/useScrollReveal'
import {
  type SectionNavigationItem,
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
const isMobileNavigationOpen = ref(false)
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

const closeMobileNavigation = () => {
  isMobileNavigationOpen.value = false
}

const toggleMobileNavigation = () => {
  isMobileNavigationOpen.value = !isMobileNavigationOpen.value
}

const handleSectionNavigation = (
  item: SectionNavigationItem,
  event: MouseEvent
) => {
  closeMobileNavigation()
  scrollToSection(item, event)
}

watch(
  () => [props.sectionNumber, props.title, props.titleEn, locale.value],
  announceNavigationRefresh
)

watch(isNavigationAtPageEnd, (isAtPageEnd) => {
  if (isAtPageEnd) closeMobileNavigation()
})
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

.sections-fixed-nav {
  position: fixed;
  top: auto;
  bottom: 80px;
  left: clamp(10px, 1.7vw, 28px);
  z-index: 90;
  display: flex;
  width: clamp(104px, 9vw, 148px);
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  opacity: 0.6;
  transform: none;
  pointer-events: auto;
  transition: opacity 0.25s ease;

  &:hover,
  &:focus-within {
    opacity: 1;
  }

  &::before {
    content: 'NAV';
    position: absolute;
    top: -1rem;
    left: -2px;
    z-index: -1;
    color: rgba(226, 52, 86, 0.06);
    font-family: 'Anton', monospace;
    font-size: 2rem;
    line-height: 1;
    letter-spacing: 0.02em;
    white-space: nowrap;
    pointer-events: none;
  }
}

.sections-fixed-nav__backdrop,
.sections-fixed-nav__toggle {
  display: none;
}

.sections-fixed-nav__menu {
  display: contents;
}

.sections-fixed-nav__line {
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
  transform-origin: center;
  animation: sections-fixed-nav-line-in 0.5s cubic-bezier(0.22, 1, 0.36, 1)
    0.08s both;
}

.sections-fixed-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  grid-template-areas: 'marker copy';
  column-gap: 5px;
  align-items: center;
  min-height: 42px;
  padding: 5px 2px 5px 0;
  border: 0;
  color: var(--text-faint);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.25s ease, transform 0.25s ease;
  animation: sections-fixed-nav-item-in 0.48s cubic-bezier(0.22, 1, 0.36, 1)
    0.18s both;

  &:nth-of-type(2) {
    animation-delay: 0.24s;
  }

  &:nth-of-type(3) {
    animation-delay: 0.3s;
  }

  &:nth-of-type(4) {
    animation-delay: 0.36s;
  }

  &:nth-of-type(5) {
    animation-delay: 0.42s;
  }

  &:hover,
  &:focus-visible,
  &.is-active {
    color: #e23456;
  }

  &:hover:not(.is-active),
  &:focus-visible:not(.is-active) {
    .sections-fixed-nav__copy {
      transform: translateX(3px);
    }
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 3px;
  }

  &.is-active {
    .sections-fixed-nav__marker {
      border-color: #e23456;
      background: #e23456;
      box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.12);
      transform: rotate(45deg) scale(1);
    }

    .sections-fixed-nav__num {
      -webkit-text-stroke-color: #e23456;
    }
  }
}

.sections-fixed-nav__marker {
  grid-area: marker;
  justify-self: center;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(226, 52, 86, 0.56);
  background: var(--bg-color);
  transform: rotate(45deg) scale(0.72);
  transition: border-color 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease;
}

.sections-fixed-nav__copy {
  grid-area: copy;
  display: flex;
  align-items: center;
  height: 1.18rem;
  min-width: 0;
  transition: transform 0.25s ease;
}

.sections-fixed-nav__num {
  display: inline-flex;
  width: 1.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: transparent;
  font-family: 'Anton', monospace;
  font-size: clamp(0.72rem, 1vw, 0.92rem);
  line-height: 1;
  -webkit-text-stroke: 1px var(--text-faint);
  transition: color 0.25s ease, transform 0.25s ease,
    -webkit-text-stroke-color 0.25s ease;
}

.sections-fixed-nav__label {
  min-width: 0;
  max-width: 108px;
  margin-top: 4px;
  overflow: hidden;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media screen and (min-aspect-ratio: @ratio-threshold) {
  .sections-fixed-nav {
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

      .sections-fixed-nav__copy {
        max-width: 132px;
        opacity: 1;
      }
    }
  }

  .sections-fixed-nav__copy {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease,
      transform 0.25s ease;
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

  .sections-fixed-nav {
    left: 20px;
    width: 84px;
    box-sizing: border-box;
    gap: 2px;
    padding: 8px 4px;
    // border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-color) 12%, transparent);
    opacity: 1;
    border-radius: 10px;
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

  .sections-fixed-nav__line {
    left: 9px;
  }

  .sections-fixed-nav__item {
    grid-template-columns: 11px auto;
    grid-template-areas: 'marker copy';
    min-height: 34px;
    padding: 3px 0;

    &:hover:not(.is-active),
    &:focus-visible:not(.is-active) {
      .sections-fixed-nav__copy {
        transform: translateX(1px);
      }
    }
  }

  .sections-fixed-nav__marker {
    width: 6px;
    height: 6px;
  }

  .sections-fixed-nav__num {
    font-size: 0.72rem;
  }

  .sections-fixed-nav__label {
    display: none;
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

  .sections-fixed-nav__backdrop {
    position: fixed;
    inset: 0;
    z-index: 89;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: radial-gradient(
      circle at left bottom,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.72) 28%,
      rgba(0, 0, 0, 0.38) 52%,
      rgba(0, 0, 0, 0.14) 72%,
      transparent 92%
    );
    -webkit-backdrop-filter: blur(calc(1px * 4));
    backdrop-filter: blur(calc(1px * 4));
    cursor: default;
    animation: sections-fixed-nav-backdrop-in 0.2s ease-out both;
  }

  .sections-fixed-nav {
    bottom: calc(env(safe-area-inset-bottom) + 72 * 1px);
    left: 20px;
    z-index: 90;
    width: 0;
    height: 0;
    gap: 0;
    padding: 0;
    overflow: visible;
    border-radius: 0;
    background: transparent;
    opacity: 1;
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s;

    &::before {
      display: block;
      top: -1.4rem;
      z-index: 1;
      color: rgba(226, 52, 86, 0.5);
      font-size: 1.4rem;
      opacity: 1;
      visibility: visible;
      transition: opacity 0.18s ease, visibility 0s;
    }

    &:hover,
    &:focus-within {
      width: 0;

      .sections-fixed-nav__copy {
        max-width: 0;
        opacity: 0;
      }
    }

    &.is-mobile-open,
    &.is-mobile-open:hover,
    &.is-mobile-open:focus-within {
      width: 0;
      background: transparent;

      &::before {
        visibility: hidden;
        opacity: 0;
      }

      .sections-fixed-nav__menu {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
        transition-delay: 0s, 0s, 0s;
      }

      .sections-fixed-nav__line {
        visibility: visible;
        opacity: 1;
        transform: scaleY(1);
        transition-delay: 0.06s;
      }

      .sections-fixed-nav__item {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
        transition-delay: 0.1s, 0.1s, 0s, 0s;

        &:nth-of-type(2) {
          transition-delay: 0.15s, 0.15s, 0s, 0s;
        }

        &:nth-of-type(3) {
          transition-delay: 0.2s, 0.2s, 0s, 0s;
        }
      }

      .sections-fixed-nav__copy {
        max-width: 267px;
        overflow: visible;
        opacity: 1;
      }

      .sections-fixed-nav__label {
        display: block;
      }
    }

    &.is-page-end {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease,
        visibility 0s linear 0.2s;
    }
  }

  .sections-fixed-nav__toggle {
    position: absolute;
    top: calc(-1.4rem - 8px);
    left: -10px;
    z-index: 2;
    display: block;
    width: 78px;
    height: 52px;
    padding: 0;
    border: 0;
    color: transparent;
    background: transparent;
    font-size: 0;
    cursor: pointer;
  }

  .sections-fixed-nav__menu {
    position: absolute;
    bottom: 0;
    left: -2px;
    display: flex;
    width: min(320px, calc(100vw - 40px));
    box-sizing: border-box;
    flex-direction: column;
    gap: 4px;
    padding: 15px 7px;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transform: translateY(10px) scale(0.9);
    transform-origin: left bottom;
    transition: opacity 0.28s ease,
      transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.28s;
  }

  .sections-fixed-nav__line {
    top: 36px;
    bottom: 36px;
    left: 16px;
    visibility: hidden;
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
    animation: none;
    transition: opacity 0.28s ease,
      transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.28s;
  }

  .sections-fixed-nav__item {
    display: grid;
    grid-template-columns: 23px minmax(0, 1fr);
    min-height: 60px;
    padding: 5px 4px 5px 0;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transform: translateX(-10px);
    animation: none;
    transition: opacity 0.3s ease,
      transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.3s,
      color 0.25s ease;
  }

  .sections-fixed-nav__marker {
    position: relative;
    left: -1px;
    width: 11px;
    height: 11px;
  }

  .sections-fixed-nav__copy {
    height: 2.09rem;
  }

  .sections-fixed-nav__num {
    width: 2.23rem;
    font-size: 1.35rem;
  }

  .sections-fixed-nav__label {
    max-width: 224px;
    font-size: 0.81rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sections-fixed-nav,
  .sections-fixed-nav__line,
  .sections-fixed-nav__item,
  .sections-fixed-nav__marker,
  .sections-fixed-nav__copy,
  .sections-fixed-nav__num,
  .sections-fixed-nav__label {
    transition: none;
    animation: none;
  }
}

@keyframes sections-fixed-nav-line-in {
  from {
    opacity: 0;
    transform: scaleY(0);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes sections-fixed-nav-item-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes sections-fixed-nav-backdrop-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
