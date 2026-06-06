<template>
  <div class="craft-page main-container">
    <PageHeader
      header-label="[MENTOR_NV42]"
      title-en="CRAFT"
      title-cn="工具"
      :meta-item="t('craft.metaItem')"
      primary-color="#3B69F4"
    />
    <div class="craft-filter" :class="`craft-filter--${activeCategory}`">
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

    <div class="tool-list">
      <div class="tl-grid">
        <ToolCard
          v-for="(tool, i) in filteredTools"
          :key="tool.id"
          :tool="tool"
          :index="i"
          :total="filteredTools.length"
          @select="router.push(tool.link)"
          @tag-select="activeTag = $event"
        />
      </div>
      <div v-if="filteredTools.length === 0" class="tl-empty">
        NO MATCHED TOOLS
      </div>
    </div>

    <PageFooter cn-title="工具" en-title="CRAFT" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'

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
@red-glow: rgba(232, 40, 74, 0.06);
@blue: #3c5de8;
@blue-dim: rgba(60, 93, 232, 0.18);
@blue-glow: rgba(60, 93, 232, 0.08);
@bg: #0d0608;
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.159);
@border2: rgba(255, 255, 255, 0.069);
@text: #ffffff;
@muted: rgb(83, 83, 83);
@faint: rgb(88, 88, 88);
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

  &--general {
    --filter-accent: @red;
    --filter-accent-dim: @red-dim;
  }
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

.craft-tab__mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid currentColor;
  font-family: @mono;
  font-size: 17px;
  line-height: 1;
}

.craft-tab__label {
  font-family: 'Unbounded Sans';
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
  margin-top: 20px;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 20px;
  position: relative;
}

.tl-card {
  --card-accent: @red;
  --card-accent-dim: @red-dim;
  --card-accent-glow: @red-glow;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
    border-color 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  overflow: visible;
  animation: cardIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) var(--delay, 0s) both;

  &:hover {
    transform: rotate(0deg) translateY(-6px);
    z-index: 10;
    .tl-card__img-wrap {
      width: 100%;
    }
    .tl-card__body {
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--card-accent);
      color: var(--card-accent);
      border-color: var(--card-accent-dim);
    }
    .tl-card__index-num {
      color: var(--card-accent);
    }

    .tl-card__scan {
      animation: scan 1.2s linear infinite;
    }
    .tl-card__img {
      transform: scale(1.04) translateY(-4px);
      filter: none;
    }
    .tl-card__cta {
      color: var(--card-accent);
      letter-spacing: 0.2em;
    }
  }

  &--work {
    --card-accent: @blue;
    --card-accent-dim: @blue-dim;
    --card-accent-glow: @blue-glow;
  }

  &--general {
    --card-accent: @red;
    --card-accent-dim: @red-dim;
    --card-accent-glow: @red-glow;
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tl-card__index {
  position: absolute;
  top: -18px;
  right: 14px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 3px 10px;
  z-index: 2;

  &-num {
    font-family: @mono;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    color: @muted;
  }
  &-slash {
    font-family: @mono;
    font-size: 16px;
    color: @faint;
    margin: 0 2px;
  }
  &-total {
    font-family: @mono;
    font-size: 16px;
    color: @faint;
  }
}

.tl-card__img-wrap {
  position: relative;
  width: 95%;
  height: 180px;
  margin: 0 auto;
  overflow: hidden;
  transition: all 0.2s;
  background: @bg;
}

.tl-card__img-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 110%,
    var(--card-accent-glow) 0%,
    transparent 70%
  );
}

.tl-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  filter: saturate(0.85) brightness(0.95);
  transform-origin: center bottom;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), filter 0.3s ease;
  z-index: 1;
}

.tl-card__img-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  .tl-card__placeholder-icon {
    font-size: 56px;
    opacity: 0.18;
    font-family: @mono;
    letter-spacing: -0.05em;
    color: @text;
    user-select: none;
  }
}

.tl-card__scan {
  position: absolute;
  top: -100%;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.025) 50%,
    transparent 100%
  );
  z-index: 3;
  pointer-events: none;
}

@keyframes scan {
  from {
    top: -40%;
  }
  to {
    top: 120%;
  }
}

.tl-card__body {
  padding: 18px 20px 20px;
  display: flex;
  position: relative;
  z-index: 1;
  background: @surface;
  flex-direction: column;
  border: 1px solid @border2;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
    border-color 0.3s ease, box-shadow 0.3s ease;
  gap: 8px;
}

.tl-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tl-card__tag {
  font-family: @mono;
  font-size: 9px;
  letter-spacing: 0.22em;
  color: var(--card-accent);
  border: 1px solid var(--card-accent);
  background: transparent;
  display: inline-block;
  padding: 2px 8px;
  align-self: flex-start;
  border-radius: 0;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: #050505;
    background: var(--card-accent);
  }
}

.tl-card__title {
  font-size: 17px;
  letter-spacing: 0.04em;
  font-family: 'Unbounded Sans';
  color: @text;
  line-height: 1.15;
  margin: 2px 0 0;
  text-transform: uppercase;
}

.tl-card__sub {
  font-size: 12px;
  height: 40px;
  color: @muted;
  line-height: 1.6;
  margin: 0;
}

.tl-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid @border;
}

.tl-card__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: @mono;
  font-size: 9px;
  letter-spacing: 0.18em;
  color: @muted;

  &-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: @muted;
  }

  &--live {
    color: #4ade80;
    .tl-card__status-dot {
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
      animation: pulse 2s ease-in-out infinite;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.tl-card__cta {
  font-family: @mono;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: @faint;
  text-decoration: none;
  transition: color 0.2s ease, letter-spacing 0.3s ease;

  &:hover {
    color: var(--card-accent);
  }
}

.tl-card__corner {
  position: absolute;
  z-index: 2;
  width: 10px;
  height: 10px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;

  .tl-card:hover & {
    opacity: 1;
  }

  &--tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid var(--card-accent);
    border-left: 2px solid var(--card-accent);
  }
  &--br {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid var(--card-accent);
    border-right: 2px solid var(--card-accent);
  }
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
    & > .tl-card:nth-child(n) {
      margin-top: 0;
    }
    & > .tl-card:nth-child(2n) {
      margin-top: 24px;
    }
  }
}

@media (max-width: 600px) {
  .craft-tabs {
    grid-template-columns: 1fr;
  }

  .craft-tab {
    min-height: 58px;
  }

  .craft-tab__label {
    font-size: 15px;
  }

  .tl-grid {
    grid-template-columns: 1fr;
    & > .tl-card:nth-child(n) {
      margin-top: 0;
      transform: none !important;
    }
  }
}
</style>
