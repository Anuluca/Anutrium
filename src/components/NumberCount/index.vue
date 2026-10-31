<template>
  <strong ref="element" class="number-count" :style="sizeStyle">
    <CountUp :to="count" :min-digits="2" />
  </strong>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

import CountUp from '@/components/CountUp/index.vue'

defineProps<{ count: number }>()
const element = ref<HTMLElement | null>(null)
const parent = ref<HTMLElement | null>(null)
const height = ref(0)
const sizeStyle = computed(() =>
  height.value ? { fontSize: `${height.value}px` } : undefined
)
useResizeObserver(parent, ([entry]) => {
  height.value = entry?.contentRect.height || 0
})
onMounted(() => {
  parent.value = element.value?.parentElement || null
})
</script>

<style lang="less" scoped>
.number-count {
  position: relative;
  display: inline-block;
  color: var(--section-accent-color, var(--page-theme-color, #e23456));
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px currentColor;
  font: 400 1em / 1 'Anton', sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &::before {
    position: absolute;
    right: calc(100% - 0.08em);
    top: 42%;
    content: '×';
    font-size: 1.275em;
    line-height: 1;
    transform: translateY(-50%);
    mask-image: linear-gradient(to right, #000, transparent);
    -webkit-mask-image: linear-gradient(to right, #000, transparent);
    pointer-events: none;
  }
}

@media (max-width: 768px),
  (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .number-count {
    -webkit-text-fill-color: #000;
  }
}
</style>
