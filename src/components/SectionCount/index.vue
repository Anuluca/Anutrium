<template>
  <span
    ref="sectionCountRef"
    class="section-count"
    :style="{ '--section-count-scale-x': countScaleX }"
  >
    <strong>
      <span ref="countTextRef" class="section-count__value">
        <CountUp
          :to="normalizedCount"
          :min-digits="2"
          @end="updateCountScale"
        />
      </span>
    </strong>
    <small ref="labelRef">{{ label }}</small>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import CountUp from '@/components/CountUp/index.vue'

const props = withDefaults(
  defineProps<{
    count: number
    label?: string
  }>(),
  {
    label: 'ENTRIES',
  }
)

const normalizedCount = computed(() => Math.max(0, Math.trunc(props.count)))

const sectionCountRef = ref<HTMLElement | null>(null)
const countTextRef = ref<HTMLElement | null>(null)
const labelRef = ref<HTMLElement | null>(null)
const countScaleX = ref(1)
let resizeObserver: ResizeObserver | null = null

const updateCountScale = () => {
  const countTextWidth = countTextRef.value?.offsetWidth || 0
  const labelWidth = labelRef.value?.offsetWidth || 0

  if (!countTextWidth || !labelWidth) return
  const nextScale = (labelWidth / countTextWidth) * 1.04
  if (Math.abs(nextScale - countScaleX.value) < 0.001) return
  countScaleX.value = nextScale
}

onMounted(() => {
  resizeObserver = new ResizeObserver(updateCountScale)
  if (sectionCountRef.value) resizeObserver.observe(sectionCountRef.value)
  void nextTick(updateCountScale)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style lang="less" scoped>
.section-count {
  display: inline-flex;
  flex: none;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  line-height: 1;

  strong {
    display: block;
    width: 100%;
    color: rgb(226 52 86 / 58%);
    font-family: 'cn-custom', sans-serif;
    font-size: clamp(1.35rem, 2.2vw, 2rem);
    font-weight: 400;
    text-align: center;

    .section-count__value {
      display: inline-block;
      transform: scaleX(var(--section-count-scale-x));
      transform-origin: center;
    }
  }

  small {
    display: block;
    width: max-content;
    color: rgb(255 255 255 / 30%);
    font-family: 'cn-custom', sans-serif;
    font-size: 0.42rem;
    letter-spacing: 0.04em;
  }
}

@media (max-width: 768px) {
  .section-count {
    gap: 2px;

    strong {
      font-size: 1.75rem;
    }

    small {
      font-size: 0.34rem;
    }
  }
}

@media (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .section-count strong {
    font-size: 1.75rem;
  }
}
</style>
