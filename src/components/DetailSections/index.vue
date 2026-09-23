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
    <SectionNavigation
      v-if="isClient && isNavigationHost"
      :active-anchor-id="activeAnchorId"
      :is-page-end="isNavigationAtPageEnd"
      :items="navigationItems"
      legacy-class="detail-sections-nav"
      @select="scrollToSection"
    />

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
import SectionNavigation from '@/components/SectionNavigation/index.vue'
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
</style>
