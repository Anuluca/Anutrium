<template>
  <div class="craft-page main-container">
    <PageHeader
      header-label="[MENTOR_NV42]"
      title-en="CRAFT"
      title-cn="工具"
      :meta-item="t('craft.metaItem')"
      primary-color="#3B69F4"
      mobile-tall
    />
    <div class="craft-filter craft-enter craft-enter--filter">
      <CollectionTabs
        aria-label="Craft categories"
        :items="categoryTabs"
        :model-value="activeCategory"
        size="small"
        @update:model-value="selectCategoryTab"
      />
    </div>

    <div class="craft-workspace craft-enter craft-enter--list">
      <FilterRail
        :accent-color="activeCategory === 'work' ? '#3c5de8' : '#e8284a'"
        aria-label="Craft tag filters"
        :items="toolFilterItems"
        :model-value="activeTag || 'all'"
        :show-avatar="false"
        @update:model-value="selectToolFilter"
      />

      <div class="tool-list">
        <div class="tl-grid">
          <ToolCard
            v-for="(tool, i) in filteredTools"
            :key="`${activeCategory}-${activeTag || 'all'}-${tool.id}`"
            class="craft-tool-card"
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

    <div class="craft-page-footer craft-enter craft-enter--footer">
      <PageFooter cn-title="工具" en-title="CRAFT" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import CollectionTabs, {
  type CollectionTabItem,
} from '@/components/CollectionTabs/index.vue'
import FilterRail, {
  type FilterRailItem,
} from '@/components/FilterRail/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import { trackToolClick } from '@/utils/analytics'

const { locale, t, tm } = useI18n()
const route = useRoute()
const router = useRouter()
const activeCategory = ref<ToolCategory>('work')
const activeTag = ref<string | null>(null)

type ToolCategory = 'work' | 'general'
const toolCategories: ToolCategory[] = ['work', 'general']

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

const tools = computed<NormalizedTool[]>(() => {
  return (tm('craft.dynamic.tools') as Tool[]).map((tool) => ({
    ...tool,
    category: tool.category || 'work',
    tags: tool.tags?.length ? tool.tags : tool.tag ? [tool.tag] : [],
  }))
})

const categoryTabs = computed<CollectionTabItem[]>(() =>
  toolCategories.map((category) => ({
    id: category,
    title:
      category === 'work'
        ? locale.value === 'zhCn'
          ? '工作'
          : 'WORK'
        : locale.value === 'zhCn'
        ? '生活'
        : 'GENERAL',
    subtitle:
      locale.value === 'zhCn'
        ? category === 'work'
          ? 'WORK'
          : 'GENERAL'
        : undefined,
    count: tools.value.filter((tool) => tool.category === category).length,
    accentColor: category === 'work' ? '#3c5de8' : '#e8284a',
    coverUrl: tools.value.find((tool) => tool.category === category)?.img,
  }))
)

const categoryTools = computed(() => {
  return tools.value.filter((tool) => tool.category === activeCategory.value)
})

const availableTags = computed(() => {
  return Array.from(new Set(categoryTools.value.flatMap((tool) => tool.tags)))
})

const toolFilterItems = computed<FilterRailItem[]>(() => [
  {
    id: 'all',
    title: 'ALL',
    count: categoryTools.value.length,
  },
  ...availableTags.value.map((tag) => ({
    id: tag,
    title: tag,
    count: categoryTools.value.filter((tool) => tool.tags.includes(tag)).length,
  })),
])

const filteredTools = computed(() => {
  if (!activeTag.value) return categoryTools.value
  return categoryTools.value.filter((tool) =>
    tool.tags.includes(activeTag.value as string)
  )
})

const normalizeCategory = (value: unknown): ToolCategory => {
  return toolCategories.includes(value as ToolCategory)
    ? (value as ToolCategory)
    : 'work'
}

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
</script>

<style lang="less" scoped>
@muted: rgb(83, 83, 83);
@mono: 'Anton', monospace;

.craft-page {
  width: 100%;
  color: #fff;
}

.craft-filter {
  margin: 18px 0 15px;
}

.craft-enter {
  opacity: 0;
  will-change: opacity, transform;
  animation: craftSectionIn 0.82s cubic-bezier(0.16, 1, 0.3, 1) both;
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

.craft-enter--footer {
  animation-delay: 0.34s;
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

.craft-workspace {
  display: grid;
  grid-template-columns: 172px minmax(0, 1fr);
  align-items: start;
  column-gap: clamp(18px, 2.5vw, 34px);
}

.tool-list {
  width: 100%;
  position: relative;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

@media (max-width: 900px) {
  .craft-workspace {
    display: block;
  }

  .tl-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .tl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
