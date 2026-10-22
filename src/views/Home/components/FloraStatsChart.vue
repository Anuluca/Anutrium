<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  PET_STAT_MAX,
  type PetNature,
  petNatures,
  type PetStatKey,
  type PetStats,
} from '@/locales/dynamic/pets'

const props = defineProps<{
  stats: PetStats
  name: string
  nature: PetNature
}>()
const natureEffect = computed(() => petNatures[props.nature])
const { locale } = useI18n()
const axes: {
  key: PetStatKey
  label: string
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}[] = [
  { key: 'hp', label: 'HP', x: 180, y: 50, anchor: 'middle' },
  { key: 'atk', label: 'Atk', x: 280, y: 122, anchor: 'start' },
  { key: 'def', label: 'Def', x: 280, y: 252, anchor: 'start' },
  { key: 'spe', label: 'Spe', x: 180, y: 314, anchor: 'middle' },
  { key: 'spd', label: 'SpD', x: 80, y: 252, anchor: 'end' },
  { key: 'spa', label: 'SpA', x: 80, y: 122, anchor: 'end' },
]
const center = 180
const radius = 142
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
  <figure :key="name" class="flora-stats-chart no-rem is-clickable" @click.stop>
    <svg
      viewBox="0 0 360 360"
      preserveAspectRatio="xMaxYMin"
      role="img"
      :aria-label="`${title}: ${summary}`"
    >
      <desc>{{ summary }}</desc>
      <defs>
        <linearGradient
          :id="`flora-stat-up-${name}`"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="#e23456" />
          <stop offset="45%" stop-color="#e23456" />
          <stop offset="100%" stop-color="#e23456" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          :id="`flora-stat-down-${name}`"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="#4999e8" stop-opacity="0" />
          <stop offset="55%" stop-color="#4999e8" />
          <stop offset="100%" stop-color="#4999e8" />
        </linearGradient>
        <mask
          :id="`flora-stat-grid-${name}`"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="360"
          height="360"
        >
          <rect width="360" height="360" fill="white" />
          <polygon
            :points="boundary"
            fill="none"
            stroke="black"
            stroke-width="2"
          />
          <line
            v-for="(vertex, index) in vertices"
            :key="axes[index].key"
            :x1="center"
            :y1="center"
            :x2="vertex.x"
            :y2="vertex.y"
            stroke="black"
            stroke-width="2"
          />
        </mask>
      </defs>
      <polygon
        class="flora-stats-chart__boundary"
        :points="boundary"
        :mask="`url(#flora-stat-grid-${name})`"
      />
      <polygon
        class="flora-stats-chart__values"
        :points="values"
        vector-effect="non-scaling-stroke"
      />
      <g
        v-for="(axis, index) in axes"
        :key="axis.key"
        class="flora-stats-chart__axis"
        :style="{ '--stats-axis-index': index }"
        :data-stat="axis.key"
        :class="{
          'is-increased': axis.key === natureEffect.increased,
          'is-decreased': axis.key === natureEffect.decreased,
        }"
        :text-anchor="axis.anchor"
      >
        <g
          v-if="
            axis.key === natureEffect.increased ||
            axis.key === natureEffect.decreased
          "
          class="flora-stats-chart__indicator"
          :transform="`translate(${
            axis.x -
            (axis.anchor === 'end' ? 105 : axis.anchor === 'middle' ? 54 : 20) +
            (axis.key === natureEffect.decreased ? 14 : 0)
          }, ${
            axis.y - (axis.key === natureEffect.increased ? 60 : 52)
          }) scale(1.25)`"
          aria-hidden="true"
        >
          <path
            v-if="axis.key === natureEffect.increased"
            d="M16 0 32 22H23V60H9V22H0Z"
            :fill="`url(#flora-stat-up-${name})`"
          />
          <path
            v-else
            d="M9 0H23V38H32L16 60 0 38H9Z"
            :fill="`url(#flora-stat-down-${name})`"
          />
        </g>
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
  --stats-enter-delay: 200ms;
  --stats-enter-duration: 900ms;
  --stats-values-delay: calc(
    var(--stats-enter-delay) + var(--stats-enter-duration)
  );
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
    rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
      var(--flora-detail-scanline-gap, 1px),
    #000 var(--flora-detail-scanline-gap, 1px)
      var(--flora-detail-scanline-period, 3px)
  );
  mask-image: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
      var(--flora-detail-scanline-gap, 1px),
    #000 var(--flora-detail-scanline-gap, 1px)
      var(--flora-detail-scanline-period, 3px)
  );

  > svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    transform-origin: center;
    animation: flora-stats-enter var(--stats-enter-duration)
      cubic-bezier(0.22, 1, 0.36, 1) var(--stats-enter-delay) both;
  }
  .flora-stats-chart__boundary {
    fill: rgb(255 255 244 / 12%);
  }
  .flora-stats-chart__values {
    opacity: 0.5;
    fill: var(--stats-color);
    stroke: var(--stats-color);
    stroke-width: 1.5;
    // 以整个 SVG 的中心缩放，保持六个顶点的实际数值比例。
    transform-box: view-box;
    transform-origin: center;
    animation: flora-stats-values-enter 650ms cubic-bezier(0.22, 1, 0.36, 1)
      var(--stats-values-delay) both;
  }
  text {
    fill: currentColor;
    font-family: 'Anton', sans-serif;
    text-shadow: 0 3px 10px rgb(0 0 0 / 80%);
  }
  .flora-stats-chart__axis {
    animation: flora-stats-axis-enter 450ms cubic-bezier(0.22, 1, 0.36, 1)
      calc(var(--stats-values-delay) + var(--stats-axis-index) * 100ms) both;
  }
  .flora-stats-chart__label {
    font-size: 50px;
  }
  .flora-stats-chart__indicator {
    opacity: 0.6;
  }
  .flora-stats-chart__value {
    fill: #fff;
    opacity: 0.5;
    font-size: 50px;
    font-variant-numeric: tabular-nums;
  }
  .is-increased text {
    fill: #e23456;
  }
  .is-decreased text {
    fill: #4999e8;
  }
  .flora-stats-chart__label,
  .is-increased .flora-stats-chart__label,
  .is-decreased .flora-stats-chart__label {
    stroke: var(--stats-color);
    stroke-width: 1.5px;
    fill: transparent;
  }
  .is-increased .flora-stats-chart__label {
    stroke: #e23456;
  }
  .is-decreased .flora-stats-chart__label {
    stroke: #4999e8;
  }
  @media (prefers-reduced-motion: reduce) {
    > svg,
    .flora-stats-chart__values,
    .flora-stats-chart__axis {
      animation: none;
    }
  }
}
@keyframes flora-stats-enter {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}
@keyframes flora-stats-values-enter {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}
@keyframes flora-stats-axis-enter {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
