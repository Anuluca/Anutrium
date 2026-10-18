<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  PET_STAT_MAX,
  type PetStatKey,
  type PetStats,
} from '@/locales/dynamic/pets'

const props = defineProps<{ stats: PetStats; name: string }>()
const { locale } = useI18n()
const axes: {
  key: PetStatKey
  label: string
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}[] = [
  { key: 'hp', label: 'HP', x: 180, y: 34, anchor: 'middle' },
  { key: 'atk', label: 'Atk', x: 296, y: 114, anchor: 'start' },
  { key: 'def', label: 'Def', x: 296, y: 260, anchor: 'start' },
  { key: 'spe', label: 'Spe', x: 180, y: 330, anchor: 'middle' },
  { key: 'spd', label: 'SpD', x: 64, y: 260, anchor: 'end' },
  { key: 'spa', label: 'SpA', x: 64, y: 114, anchor: 'end' },
]
const center = 180
const radius = 112
const point = (index: number, ratio: number) => {
  const angle = -Math.PI / 2 + (index * Math.PI) / 3
  return {
    x: center + Math.cos(angle) * radius * ratio,
    y: center + Math.sin(angle) * radius * ratio,
  }
}
const vertices = axes.map((_, index) => point(index, 1))
const boundary = vertices.map(({ x, y }) => `${x},${y}`).join(' ')
// 所有宠物共用 150 的满刻度，避免按各自最大值归一化而夸大数值。
const values = computed(() =>
  axes
    .map((axis, index) => {
      const value = Math.min(PET_STAT_MAX, Math.max(0, props.stats[axis.key]))
      const { x, y } = point(index, value / PET_STAT_MAX)
      return `${x},${y}`
    })
    .join(' ')
)
const title = computed(() =>
  locale.value === 'en'
    ? `${props.name} stats, maximum ${PET_STAT_MAX} per stat`
    : `${props.name}战力图，单项上限 ${PET_STAT_MAX}`
)
const summary = computed(() =>
  axes.map((axis) => `${axis.label} ${props.stats[axis.key]}`).join(', ')
)
</script>

<template>
  <figure class="flora-stats-chart no-rem is-clickable" @click.stop>
    <svg viewBox="0 0 360 360" role="img" :aria-label="`${title}: ${summary}`">
      <desc>{{ summary }}</desc>
      <polygon
        class="flora-stats-chart__boundary"
        :points="boundary"
        vector-effect="non-scaling-stroke"
      />
      <line
        v-for="(vertex, index) in vertices"
        :key="axes[index].key"
        class="flora-stats-chart__axis"
        :x1="center"
        :y1="center"
        :x2="vertex.x"
        :y2="vertex.y"
        vector-effect="non-scaling-stroke"
      />
      <polygon
        class="flora-stats-chart__values"
        :points="values"
        vector-effect="non-scaling-stroke"
      />
      <g
        v-for="axis in axes"
        :key="axis.key"
        :data-stat="axis.key"
        :text-anchor="axis.anchor"
      >
        <text class="flora-stats-chart__label" :x="axis.x" :y="axis.y">
          {{ axis.label }}
        </text>
        <text class="flora-stats-chart__value" :x="axis.x" :y="axis.y + 26">
          {{ stats[axis.key] }}
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped lang="less">
.flora-stats-chart.no-rem {
  --stats-color: var(--flora-theme-color);
  width: 100%;
  max-width: 340px;
  margin: 0;
  color: var(--stats-color);
  font-family: 'Anton', sans-serif;
  opacity: 0.6;
  transition: opacity 200ms ease;
  &:hover {
    opacity: 1;
  }
  -webkit-mask-image: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / 45%) 0 1px,
    #000 1px 3px
  );
  mask-image: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / 45%) 0 1px,
    #000 1px 3px
  );

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .flora-stats-chart__boundary {
    fill: rgb(255 255 244 / 12%);
    stroke: rgb(255 255 244 / 20%);
    stroke-width: 1;
  }
  .flora-stats-chart__axis {
    stroke: rgb(255 255 244 / 28%);
    stroke-width: 1;
  }
  .flora-stats-chart__values {
    fill: var(--stats-color);
    stroke: var(--stats-color);
    stroke-width: 1.5;
  }
  text {
    fill: currentColor;
    font-family: 'Anton', sans-serif;
  }
  .flora-stats-chart__label {
    font-size: 42px;
  }
  .flora-stats-chart__value {
    fill: #fff;
    opacity: 0.5;
    font-size: 42px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
