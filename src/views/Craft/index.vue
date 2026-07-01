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
    <div
      class="craft-filter craft-enter craft-enter--filter"
      :class="`craft-filter--${activeCategory}`"
    >
      <div class="craft-tabs" role="tablist" aria-label="Craft categories">
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          class="craft-tab"
          :class="[
            `craft-tab--${tab.value}`,
            { 'craft-tab--active': activeCategory === tab.value },
          ]"
          type="button"
          role="tab"
          :aria-selected="activeCategory === tab.value"
          @click="selectCategory(tab.value)"
        >
          <span class="craft-tab__label">{{ tab.label }}</span>
          <span class="craft-tab__count">{{ categoryCount(tab.value) }}</span>
        </button>
      </div>

      <div class="craft-tag-filter" aria-label="Craft tag filters">
        <button
          class="craft-filter-chip"
          :class="{ 'craft-filter-chip--active': activeTag === null }"
          type="button"
          @click="activeTag = null"
        >
          ALL
        </button>
        <button
          v-for="tag in availableTags"
          :key="tag"
          class="craft-filter-chip"
          :class="{ 'craft-filter-chip--active': activeTag === tag }"
          type="button"
          @click="activeTag = tag"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="tool-list craft-enter craft-enter--list">
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

    <div class="craft-page-footer craft-enter craft-enter--footer">
      <PageFooter cn-title="工具" en-title="CRAFT" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

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

const categoryTabs = computed(() => [
  {
    value: 'work' as const,
    label: locale.value === 'zhCn' ? '工作' : 'WORK',
    mark: 'W',
  },
  {
    value: 'general' as const,
    label: locale.value === 'zhCn' ? '生活' : 'GENERAL',
    mark: 'G',
  },
])

const categoryTools = computed(() => {
  return tools.value.filter((tool) => tool.category === activeCategory.value)
})

const availableTags = computed(() => {
  return Array.from(new Set(categoryTools.value.flatMap((tool) => tool.tags)))
})

const filteredTools = computed(() => {
  if (!activeTag.value) return categoryTools.value
  return categoryTools.value.filter((tool) =>
    tool.tags.includes(activeTag.value as string)
  )
})

const categoryCount = (category: ToolCategory) => {
  return tools.value.filter((tool) => tool.category === category).length
}

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
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@blue: #3c5de8;
@blue-dim: rgba(60, 93, 232, 0.18);
@border2: rgba(255, 255, 255, 0.069);
@text: #ffffff;
@muted: rgb(83, 83, 83);
@mono: 'Anton', monospace;

.craft-page {
  width: 100%;
  color: #fff;
}

.craft-filter {
  --filter-accent: @blue;
  --filter-accent-dim: @blue-dim;
  display: grid;
  grid-template-columns: minmax(320px, 520px) 1fr;
  align-items: end;
  gap: 18px;
  margin: 18px 0 28px;
  margin-bottom: 15px;

  &--general {
    --filter-accent: @red;
    --filter-accent-dim: @red-dim;
  }
}

.craft-enter {
  opacity: 0;
  will-change: opacity, transform;
  animation: craftSectionIn 0.82s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.craft-enter--filter {
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

.tool-list {
  content-visibility: auto;
  contain-intrinsic-size: 940px;
}

.craft-tabs {
  position: relative;
  display: grid;
  width: 400px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 2px;
  background: linear-gradient(90deg, rgba(60, 93, 232, 0.16), transparent 42%),
    linear-gradient(270deg, rgba(232, 52, 86, 0.12), transparent 46%), #090406;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.035),
    0 20px 60px rgba(0, 0, 0, 0.45);

  &::before {
    top: -1px;
    left: -1px;
    border-top: 2px solid @blue;
    border-left: 2px solid @blue;
  }

  &::after {
    right: -1px;
    bottom: -1px;
    border-right: 2px solid @red;
    border-bottom: 2px solid @red;
  }
}

.craft-tab {
  --tab-accent: @blue;
  --tab-accent-dim: @blue-dim;
  position: relative;
  min-height: 40px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: @muted;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 2px;
    background: var(--tab-accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.25s ease;
  }

  &:hover,
  &--active {
    color: #fff;
    border-color: var(--tab-accent);
    border-bottom-color: transparent;
    background: linear-gradient(
      135deg,
      var(--tab-accent-dim),
      rgba(255, 255, 255, 0.02) 58%
    );

    &::before {
      transform: scaleX(1);
    }
  }

  &--general {
    --tab-accent: @red;
    --tab-accent-dim: @red-dim;
  }
}

.craft-tab__label {
  font-family: 'cn-custom';
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.12em;
}

.craft-tab__count {
  font-family: @mono;
  font-size: 14px;
  color: var(--tab-accent);
}

.craft-tag-filter {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
}

.craft-filter-chip {
  font-family: @mono;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: @muted;
  border: 1px solid @border2;
  background: transparent;
  padding: 7px 10px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover,
  &--active {
    color: @text;
    border-color: var(--filter-accent);
    background: var(--filter-accent-dim);
  }
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
  .craft-filter {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .craft-tag-filter {
    justify-content: flex-start;
  }

  .tl-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .craft-tabs {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }

  .craft-tab {
    min-height: 42px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    padding: 9px 10px;
  }

  .craft-tab__label {
    overflow: hidden;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .craft-tab__count {
    font-size: 12px;
  }

  .tl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
