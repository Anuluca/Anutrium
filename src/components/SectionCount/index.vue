<template>
  <span class="section-count">
    <strong>{{ formattedCount }}</strong>
    <small>{{ label }}</small>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count: number
    label?: string
  }>(),
  {
    label: 'ENTRIES',
  }
)

const formattedCount = computed(() =>
  String(Math.max(0, Math.trunc(props.count))).padStart(2, '0')
)
</script>

<style lang="less" scoped>
.section-count {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: baseline;
  color: #e23456;
  font-family: 'anton', sans-serif;
  line-height: 1;

  strong {
    color: rgb(226 52 86 / 58%);
    font-family: inherit;
    font-size: clamp(1.35rem, 2.2vw, 2rem);
    font-weight: 400;
  }

  small {
    color: rgb(255 255 255 / 30%);
    font-family: inherit;
    font-size: 0.42rem;
    letter-spacing: 0.04em;
  }
}

@media (max-width: 768px) {
  .section-count {
    gap: 4px;

    strong {
      font-size: 1.25rem;
    }

    small {
      font-size: 0.34rem;
    }
  }
}
</style>
