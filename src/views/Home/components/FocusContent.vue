<script setup lang="ts">
import {
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
import { useResizeObserver } from '@vueuse/core'

import ScrollViewport from '@/components/ScrollViewport/index.vue'
import type { TempleCategoryId } from '@/config/templeNavigation'
import { useTempleNavigation } from '@/stores/templeNavigation'

const props = defineProps<{
  category: TempleCategoryId
  expanded: boolean
  resizing: boolean
  detailTarget?: HTMLElement | null
}>()
const navigation = useTempleNavigation()
const viewport = ref<InstanceType<typeof ScrollViewport> | null>(null)
let scrollRestored = false
const restoreScroll = async () => {
  const root = viewport.value?.scrollRoot
  const saved = navigation.scrollPositions[props.category]
  if (!root || saved === undefined || scrollRestored) return
  await nextTick()
  // 异步列表挂载后再恢复；提前赋值会被浏览器裁成零。
  if (root.scrollHeight - root.clientHeight < saved) return
  root.scrollTop = saved
  scrollRestored = true
}
watch(() => viewport.value?.scrollRoot, restoreScroll)
useResizeObserver(
  () =>
    viewport.value?.scrollRoot?.firstElementChild as HTMLElement | undefined,
  restoreScroll
)
onBeforeUnmount(() => {
  if (viewport.value?.scrollRoot)
    navigation.scrollPositions[props.category] =
      viewport.value.scrollRoot.scrollTop
})
// 聚焦结束后才挂载内容，避免默认场景承担列表与地图的渲染开销。
const ArchiveContent = defineAsyncComponent(
  () => import('@/views/Archive/ArchiveContent.vue')
)
const JourneyContent = defineAsyncComponent(
  () => import('@/views/Flânerie/JourneyContent.vue')
)
</script>

<template>
  <ScrollViewport
    ref="viewport"
    class="temple-focus-content"
    :class="{ 'is-expanded': props.expanded }"
    :data-content="props.category"
    edge-progress
  >
    <template #default="{ scrollRoot }">
      <ArchiveContent
        v-if="props.category === 'archive'"
        embedded
        :detail-target="props.detailTarget"
        :inline-details="!props.expanded && navigation.selected === 'archive'"
      />
      <JourneyContent
        v-else-if="props.category === 'flanerie'"
        embedded
        :scroll-root="scrollRoot"
        :resizing="props.resizing"
      />
    </template>
  </ScrollViewport>
</template>

<style lang="less" scoped>
.temple-focus-content {
  color: #fff;
  container-type: inline-size;
  box-sizing: border-box;
  padding-top: var(--temple-menu-header-gap);
  :deep(.scroll-viewport__scroll) {
    padding-right: 0;
  }
  :deep(.is-embedded .works-grid),
  :deep(.is-embedded .misc-grid),
  :deep(.is-embedded .vlog-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  &:not(.is-expanded) :deep(.availability-github) {
    top: 50%;
    width: 56%;
    max-width: none;
  }
  @media (max-width: 768px) {
    &:not(.is-expanded) :deep(.availability-github) {
      width: 88%;
    }
  }
  &.is-expanded {
    :deep(.is-embedded .works-grid),
    :deep(.is-embedded .misc-grid),
    :deep(.is-embedded .vlog-grid) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  :deep(.home-section-title) {
    color: var(--page-theme-color);
  }
  :deep(.home-section-rail__num) {
    -webkit-text-stroke-color: var(--page-theme-color);
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--page-theme-color) 27%, transparent);
  }
  :deep(.section-count strong) {
    color: color-mix(in srgb, var(--page-theme-color) 58%, transparent);
  }
}
</style>
