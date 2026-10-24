<script setup lang="ts">
import {
  type Component,
  computed,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useResizeObserver } from '@vueuse/core'

import FooterSocialLinkBar from '@/components/FooterSocialLinkBar/index.vue'
import NotFoundContent from '@/components/NotFoundContent/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
import { sectionFadeOnlyKey } from '@/composables/useSectionBodyReveal'
import type { TempleCategoryId } from '@/config/templeNavigation'
import { useTempleNavigation } from '@/stores/templeNavigation'

import { useTempleSectionScroll } from '../composables/useTempleSectionScroll'
import { loadTempleFocusContent } from '../focusContentLoader'

const props = defineProps<{
  category: TempleCategoryId
  expanded: boolean
  resizing: boolean
  detailTarget?: HTMLElement | null
}>()
const navigation = useTempleNavigation()
const { locale } = useI18n()
const loadErrorTitle = computed(() =>
  locale.value === 'en' ? 'RESOURCE LOAD FAILED' : '资源获取失败'
)
const emit = defineEmits<{
  (event: 'loading', category: TempleCategoryId): void
  (event: 'ready', category: TempleCategoryId): void
  (event: 'footer-target', target: HTMLElement | null): void
}>()
const footerTarget = ref<HTMLElement | null>(null)
watch(footerTarget, (target) => emit('footer-target', target), {
  flush: 'post',
})
const component = shallowRef<Component>()
const failed = ref(false)
let loadRevision = 0
const viewport = ref<InstanceType<typeof ScrollViewport> | null>(null)
const archive = ref<{ closeInlineDetail: () => boolean } | null>(null)
defineExpose({
  getScrollRoot: () => viewport.value?.scrollRoot,
  closeInlineDetail: () => archive.value?.closeInlineDetail() ?? false,
  refreshGeometry: () => viewport.value?.measure(),
})
const hasSectionTarget = useTempleSectionScroll({
  root: () => viewport.value?.scrollRoot,
  category: () => props.category,
  ready: () => !!component.value && !failed.value,
  resizing: () => props.resizing,
})
const fadeOnly = computed(
  () =>
    hasSectionTarget.value ||
    (navigation.scrollPositions[props.category] ?? 0) > 0
)
provide(sectionFadeOnlyKey, fadeOnly)
let scrollRestored = false
const restoreScroll = async () => {
  if (hasSectionTarget.value) {
    scrollRestored = true
    return
  }
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
  emit('footer-target', null)
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
      'is-placeholder': props.category === 'pokeyard',
      'is-failed': failed,
      'is-scroll-targeted': fadeOnly,
    }"
    :data-content="props.category"
    edge-progress
  >
    <template #default="{ scrollRoot }">
      <component
        :is="component"
        v-if="component && ['archive', 'island'].includes(props.category)"
        ref="archive"
        embedded
        :detail-target="props.detailTarget"
        :inline-details="
          !props.expanded && navigation.selected === props.category
        "
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
      <NotFoundContent
        v-else-if="failed"
        class="resource-load-error"
        embedded
        code=""
        :title="loadErrorTitle"
        :style="locale === 'en' ? { '--error-title-size': '60px' } : undefined"
        action-label="RETRY"
        role="alert"
        :aria-label="loadErrorTitle"
        @return-home="loadContent"
      >
        <template #after-action>
          <div class="resource-load-error__contact no-rem">
            <span>CONTACT ME：</span>
            <FooterSocialLinkBar
              :types="['WECHAT', 'MAIL']"
              :show-platforms="false"
            />
          </div>
        </template>
      </NotFoundContent>
      <div
        v-if="
          component &&
          ['archive', 'flanerie', 'island'].includes(props.category)
        "
        ref="footerTarget"
        class="temple-module-footer"
      />
    </template>
  </ScrollViewport>
</template>

<style lang="less" scoped>
.temple-focus-content {
  color: var(--text-color);
  container-type: inline-size;
  box-sizing: border-box;
  padding-top: var(--temple-menu-header-gap);
  :deep(.scroll-viewport__scroll) {
    padding-right: 0;
  }
  &.is-placeholder :deep(.scroll-viewport__scroll > div),
  &.is-failed :deep(.scroll-viewport__scroll > div) {
    height: 100%;
  }
  :deep(.is-embedded .works-grid),
  :deep(.is-embedded .misc-grid),
  :deep(.is-embedded .vlog-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  &.is-scroll-targeted {
    :deep(.home-section-content),
    :deep(.tool-list) {
      content-visibility: visible;
    }
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

.resource-load-error__contact.no-rem {
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 72px;
  font-size: 29px;
  line-height: 1.4;
  white-space: nowrap;

  :deep(.footer-social-links) {
    justify-content: flex-start;
    margin: 0;
    padding: 0;
  }

  :deep(.footer-social-links__item) {
    width: auto;
    height: 56px;
    padding: 0 12px;
    grid-template-columns: 32px minmax(0, 0fr);
    color: var(--text-color);
  }

  :deep(.footer-social-links__icon) {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
  }

  :deep(.footer-social-links__label) {
    font-size: 22px;
  }

  @media (hover: hover) and (pointer: fine) {
    :deep(.footer-social-links__item:hover),
    :deep(.footer-social-links__item:focus-visible) {
      grid-template-columns: 32px minmax(0, 1fr);
      color: var(--page-theme-color);
    }
  }
}
</style>
