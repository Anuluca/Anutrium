<template>
  <div
    ref="contentRoot"
    class="craft-content"
    :class="{ 'is-embedded': embedded, 'is-expanded': expanded }"
  >
    <div class="craft-controls craft-enter craft-enter--filter">
      <div class="craft-filter" :data-category="activeCategory">
        <CollectionTabs
          aria-label="Craft categories"
          :items="categoryTabs"
          :model-value="activeCategory"
          size="small"
          variant="text"
          @update:model-value="selectCategoryTab"
        />
      </div>

      <FilterRail
        horizontal
        :accent-color="activeCategory === 'work' ? '#3c5de8' : '#e8284a'"
        aria-label="Craft tag filters"
        :items="toolFilterItems"
        :model-value="activeTag || 'all'"
        :show-avatar="false"
        @update:model-value="selectToolFilter"
      />
    </div>

    <div class="craft-workspace craft-enter craft-enter--list">
      <div class="tool-list">
        <div class="tl-grid">
          <ToolCard
            v-for="(tool, i) in filteredTools"
            :key="`${activeCategory}-${activeTag || 'all'}-${tool.id}`"
            class="craft-tool-card"
            :data-craft-tool="tool.id"
            :tool="tool"
            :index="i"
            :total="filteredTools.length"
            :style="{ '--delay': `${0.24 + i * 0.06}s` }"
            @select="openTool(tool)"
            @tag-select="activeTag = $event"
          />
        </div>
        <div v-if="filteredTools.length === 0" class="tl-empty">
          NO MATCHED TOOLS
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMutationObserver } from '@vueuse/core'

import CollectionTabs, {
  type CollectionTabItem,
} from '@/components/CollectionTabs/index.vue'
import FilterRail, {
  type FilterRailItem,
} from '@/components/FilterRail/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import { useScrollReveal } from '@/composables/useScrollReveal'
import { useCraftNavigation } from '@/stores/craftNavigation'
import { trackToolClick } from '@/utils/analytics'

defineProps<{ embedded?: boolean; expanded?: boolean }>()

const contentRoot = ref<HTMLElement | null>(null)
const revealTarget = ref<HTMLElement | null>(null)
const { refresh: observeEntrance } = useScrollReveal({
  target: revealTarget,
  rootMargin: '0px',
  threshold: 0,
})
const activateEntrance = () => {
  const root = contentRoot.value
  if (!root || revealTarget.value) return
  const menu = root.closest('.temple-menu')
  // 场景聚焦前面板仍在排版，避免将隐藏阶段的临时位置判为已进入可视区。
  if (menu && !menu.classList.contains('is-visible')) return
  revealTarget.value = root
  observeEntrance()
  stopMenuObserver()
}
const { stop: stopMenuObserver } = useMutationObserver(
  () => contentRoot.value?.closest('.temple-menu'),
  activateEntrance,
  { attributes: true, attributeFilter: ['class'] }
)
watch(contentRoot, activateEntrance, { flush: 'post' })
const craftNavigation = useCraftNavigation()
const { locale, tm } = useI18n()
const route = useRoute()
const router = useRouter()
const activeCategory = ref<ToolCategory>('work')
const activeTag = ref<string | null>(null)

type ToolCategory = 'work' | 'general'
const toolCategories: ToolCategory[] = ['work', 'general']
const toolCategorySet = new Set<ToolCategory>(toolCategories)

const normalizeCategory = (value: unknown): ToolCategory =>
  toolCategorySet.has(value as ToolCategory) ? (value as ToolCategory) : 'work'

interface Tool {
  id: string
  title: string
  sub: string
  tag?: string
  tags?: string[]
  category?: ToolCategory
  icon: string
  img?: string
  statusLabel: string
  link: string
}

interface NormalizedTool extends Omit<Tool, 'category' | 'tags'> {
  category: ToolCategory
  tags: string[]
}

interface ToolCategoryBucket {
  coverUrl?: string
  tagCounts: Map<string, number>
  tools: NormalizedTool[]
}

const tools = computed<NormalizedTool[]>(() => {
  return (tm('craft.dynamic.tools') as Tool[]).map((tool) => ({
    ...tool,
    category: normalizeCategory(tool.category),
    tags: tool.tags?.length ? tool.tags : tool.tag ? [tool.tag] : [],
  }))
})

const categoryBuckets = computed(() => {
  const buckets = new Map<ToolCategory, ToolCategoryBucket>(
    toolCategories.map((category) => [
      category,
      { tools: [], tagCounts: new Map<string, number>() },
    ])
  )

  for (const tool of tools.value) {
    const bucket = buckets.get(tool.category)
    if (!bucket) continue

    bucket.tools.push(tool)
    bucket.coverUrl ||= tool.img
    for (const tag of tool.tags) {
      bucket.tagCounts.set(tag, (bucket.tagCounts.get(tag) ?? 0) + 1)
    }
  }

  return buckets
})

const categoryTabs = computed<CollectionTabItem[]>(() =>
  toolCategories.map((category) => {
    const bucket = categoryBuckets.value.get(category)

    return {
      id: category,
      title:
        category === 'work'
          ? locale.value === 'zhCn'
            ? '工作'
            : 'WORK'
          : locale.value === 'zhCn'
          ? '生活'
          : 'GENERAL',
      count: bucket?.tools.length ?? 0,
      accentColor: category === 'work' ? '#3c5de8' : '#e8284a',
      coverUrl: bucket?.coverUrl,
    }
  })
)

const activeCategoryBucket = computed(
  () => categoryBuckets.value.get(activeCategory.value)!
)

const categoryTools = computed(() => activeCategoryBucket.value.tools)

const toolFilterItems = computed<FilterRailItem[]>(() => [
  {
    id: 'all',
    title: 'ALL',
    count: categoryTools.value.length,
  },
  ...Array.from(activeCategoryBucket.value.tagCounts, ([tag, count]) => ({
    id: tag,
    title: tag,
    count,
  })),
])

const filteredTools = computed(() => {
  if (!activeTag.value) return categoryTools.value
  return categoryTools.value.filter((tool) =>
    tool.tags.includes(activeTag.value as string)
  )
})

const selectCategory = (category: ToolCategory) => {
  if (route.query.type === category) return
  activeTag.value = null
  router.push({
    path: route.path,
    query: {
      ...route.query,
      type: category,
    },
  })
}

const selectCategoryTab = (category: string) => {
  selectCategory(normalizeCategory(category))
}

const selectToolFilter = (filterId: string) => {
  activeTag.value = filterId === 'all' ? null : filterId
}

const openTool = (tool: NormalizedTool) => {
  const root = contentRoot.value?.closest<HTMLElement>(
    '.scroll-viewport__scroll'
  )
  const card = contentRoot.value?.querySelector<HTMLElement>(
    `[data-craft-tool="${tool.id}"]`
  )
  const transform = card ? getComputedStyle(card).transform : 'none'
  const translateY =
    transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
  craftNavigation.origin = {
    path: route.fullPath,
    toolId: tool.id,
    tag: activeTag.value,
    offset:
      root && card
        ? card.getBoundingClientRect().top -
          root.getBoundingClientRect().top -
          translateY
        : 0,
  }
  craftNavigation.restoring = false
  trackToolClick({
    id: tool.id,
    title: tool.title,
    source: 'craft',
  })
  router.push(tool.link)
}

watch(
  () => route.query.type,
  (type) => {
    const nextCategory = normalizeCategory(Array.isArray(type) ? type[0] : type)
    if (activeCategory.value !== nextCategory) {
      activeCategory.value = nextCategory
      activeTag.value = null
    }
  },
  { immediate: true }
)
if (
  craftNavigation.restoring &&
  craftNavigation.origin?.path === route.fullPath
) {
  activeTag.value = craftNavigation.origin.tag
  craftNavigation.restoring = false
}
</script>

<style lang="less" scoped>
@muted: rgb(83, 83, 83);
@mono: 'Anton', monospace;

.craft-content {
  --craft-entry-play-state: paused;
  width: 100%;
  color: #fff;

  &.is-revealed {
    --craft-entry-play-state: running;
  }
}

.craft-controls {
  position: relative;
  margin-bottom: 8px;

  :deep(.collection-tabs),
  :deep(.filter-rail) {
    position: relative;
    z-index: 1;
  }
}

.craft-filter {
  --craft-tab-inset: 6px;
  position: relative;
  margin: 0;

  &::before,
  &::after {
    position: absolute;
    inset: 0;
    content: '';
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
  }

  &::before {
    background: linear-gradient(to right, rgba(60, 93, 232, 0.22), transparent);
  }

  &::after {
    background: linear-gradient(to left, rgba(232, 40, 74, 0.22), transparent);
  }

  &[data-category='work']::before,
  &[data-category='general']::after {
    opacity: 1;
  }

  :deep(.collection-tabs--text .collection-tab) {
    padding-block: var(--craft-tab-inset);
    transition: opacity 0.3s ease, padding 0.3s ease;

    &.is-active:first-child {
      padding-left: 16px;
    }

    &.is-active:last-child {
      padding-right: 16px;
    }

    &:last-child {
      justify-content: flex-end;
    }
  }

  :deep(.collection-tab__copy strong) {
    font-size: calc(var(--collection-tab-title-size) * 2);
  }

  :deep(.collection-tab:not(.is-active) .collection-tab__copy strong) {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px currentColor;
  }

  :deep(.collection-tabs--text .collection-tab .collection-tab__count) {
    margin-left: calc(-12px - 0.22em);
    font-size: calc(var(--collection-tab-title-size) * 1.3);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
    transform: translateY(-0.06em);
  }
}

.craft-enter {
  opacity: 0;
  will-change: opacity, transform;
  animation: craftSectionIn 0.82s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-play-state: var(--craft-entry-play-state);
}

.craft-enter--filter {
  transform-origin: center top;
  animation-name: craftFilterIn;
  animation-duration: 0.5s;
  animation-delay: 0.06s;
}

.craft-enter--list {
  animation-delay: 0.16s;
}

@keyframes craftSectionIn {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes craftFilterIn {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0) rotateX(-8deg);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateX(0);
  }
}

.tool-list {
  content-visibility: auto;
  contain-intrinsic-size: 940px;
}

.tool-list {
  width: 100%;
  position: relative;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px 20px;
  margin-left: 2px;
  margin-right: 2px;
  margin-top: 20px;
  margin-bottom: 2px;
  position: relative;
}

.tl-empty {
  padding: 48px 0 20px;
  color: @muted;
  font-family: @mono;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-align: center;
}

.craft-content.is-embedded .tl-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.craft-content.is-embedded.is-expanded .tl-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .tl-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .tl-grid,
  .craft-content.is-embedded .tl-grid,
  .craft-content.is-embedded.is-expanded .tl-grid {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-aspect-ratio: 1) {
  .tl-grid,
  .craft-content.is-embedded .tl-grid,
  .craft-content.is-embedded.is-expanded .tl-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
