<script setup lang="ts">
import {
  type Component,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useResizeObserver } from '@vueuse/core'

import ScrollViewport from '@/components/ScrollViewport/index.vue'
import type { TempleCategoryId } from '@/config/templeNavigation'
import { useTempleNavigation } from '@/stores/templeNavigation'

import { loadTempleFocusContent } from '../focusContentLoader'

const props = defineProps<{
  category: TempleCategoryId
  expanded: boolean
  resizing: boolean
  detailTarget?: HTMLElement | null
}>()
const navigation = useTempleNavigation()
const emit = defineEmits<{
  (event: 'loading', category: TempleCategoryId): void
  (event: 'ready', category: TempleCategoryId): void
}>()
const component = shallowRef<Component>()
const failed = ref(false)
let loadRevision = 0
const viewport = ref<InstanceType<typeof ScrollViewport> | null>(null)
const archive = ref<{ closeInlineDetail: () => boolean } | null>(null)
defineExpose({
  closeInlineDetail: () => archive.value?.closeInlineDetail() ?? false,
  refreshGeometry: () => viewport.value?.measure(),
})
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
  loadRevision++
  if (viewport.value?.scrollRoot)
    navigation.scrollPositions[props.category] =
      viewport.value.scrollRoot.scrollTop
})
const loadContent = async () => {
  const revision = ++loadRevision
  const category = props.category
  emit('loading', category)
  component.value = undefined
  failed.value = false
  try {
    const loaded = await loadTempleFocusContent(category)
    if (revision !== loadRevision) return
    component.value = loaded
    // 通知父层前完成真实内容挂载和滚动恢复，避免只对空壳播放入场动画。
    await nextTick()
    await restoreScroll()
    if (revision === loadRevision) emit('ready', category)
  } catch (error) {
    if (revision !== loadRevision) return
    console.error('二级菜单内容加载失败', error)
    failed.value = true
    await nextTick()
    if (revision === loadRevision) emit('ready', category)
  }
}
watch(() => props.category, loadContent, { immediate: true })
</script>

<template>
  <ScrollViewport
    ref="viewport"
    class="temple-focus-content"
    :class="{
      'is-expanded': props.expanded,
      'is-placeholder':
        props.category === 'island' || props.category === 'pokeyard',
    }"
    :data-content="props.category"
    edge-progress
  >
    <template #default="{ scrollRoot }">
      <component
        :is="component"
        v-if="component && props.category === 'archive'"
        ref="archive"
        embedded
        :detail-target="props.detailTarget"
        :inline-details="!props.expanded && navigation.selected === 'archive'"
      />
      <component
        :is="component"
        v-else-if="component && props.category === 'flanerie'"
        embedded
        :scroll-root="scrollRoot"
        :resizing="props.resizing"
      />
      <component
        :is="component"
        v-else-if="component"
        embedded
        @return-home="navigation.request(null)"
      />
      <p v-else-if="failed" role="alert">
        内容加载失败，<button type="button" @click="loadContent">重试</button>
      </p>
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
  &.is-placeholder :deep(.scroll-viewport__scroll > div) {
    height: 100%;
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
