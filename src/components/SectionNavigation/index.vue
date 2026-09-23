<template>
  <Teleport to="body">
    <button
      v-if="isMobileOpen"
      class="sections-fixed-nav__backdrop"
      type="button"
      :aria-label="
        locale === 'en' ? 'Close section navigation' : '关闭页面导航'
      "
      @click="closeMobileNavigation"
    />
    <nav
      :class="[
        'sections-fixed-nav',
        legacyClass,
        {
          'is-mobile-open': isMobileOpen,
          'is-page-end': isPageEnd,
        },
      ]"
      :aria-label="locale === 'en' ? 'Page section navigation' : '页面模块导航'"
      @keydown.esc="closeMobileNavigation"
    >
      <button
        v-if="!isMobileOpen"
        class="sections-fixed-nav__toggle"
        type="button"
        :aria-expanded="isMobileOpen"
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
          v-for="item in items"
          :key="item.anchorId"
          class="sections-fixed-nav__item"
          :class="{ 'is-active': activeAnchorId === item.anchorId }"
          type="button"
          :aria-label="`${item.number} ${item.title}`"
          :aria-current="
            activeAnchorId === item.anchorId ? 'location' : undefined
          "
          :title="item.title"
          @click="selectItem(item, $event)"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SectionNavigationItem } from '@/composables/useSectionNavigation'

const props = withDefaults(
  defineProps<{
    activeAnchorId: string
    isPageEnd: boolean
    items: SectionNavigationItem[]
    legacyClass?: string
  }>(),
  {
    legacyClass: '',
  }
)

const emit = defineEmits<{
  select: [item: SectionNavigationItem, event: MouseEvent]
}>()

const { locale } = useI18n()
const isMobileOpen = ref(false)

const closeMobileNavigation = () => {
  isMobileOpen.value = false
}

const toggleMobileNavigation = () => {
  isMobileOpen.value = !isMobileOpen.value
}

const selectItem = (item: SectionNavigationItem, event: MouseEvent) => {
  closeMobileNavigation()
  emit('select', item, event)
}

watch(
  () => props.isPageEnd,
  (isPageEnd) => {
    if (isPageEnd) closeMobileNavigation()
  }
)
</script>

<style scoped lang="less" src="./index.less" />
