<template>
  <span class="section-count" :class="align && `section-count--${align}`">
    <strong>
      <span class="section-count__value">
        <CountUp :to="normalizedCount" :min-digits="2" />
      </span>
    </strong>
    <small v-if="align">{{ label }}</small>
    <small v-else>
      <span v-for="(character, index) in labelCharacters" :key="index">{{
        character
      }}</span>
    </small>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import CountUp from '@/components/CountUp/index.vue'

const props = withDefaults(
  defineProps<{
    count: number
    label?: string
    align?: 'left' | 'right'
  }>(),
  {
    label: 'ENTRIES',
    align: undefined,
  }
)

const normalizedCount = computed(() => Math.max(0, Math.trunc(props.count)))

const labelCharacters = computed(() => Array.from(props.label))
</script>

<style lang="less" scoped>
.section-count {
  display: inline-grid;
  grid-template-columns: max-content;
  flex: none;
  gap: 3.3px;
  justify-items: center;
  line-height: 1;

  strong {
    display: block;
    width: max-content;
    color: color-mix(
      in srgb,
      var(--section-accent-color, var(--page-theme-color, #e23456)) 58%,
      transparent
    );
    font-family: 'UnboundedSans', sans-serif;
    font-size: clamp(1.485rem, 2.42vw, 2.2rem);
    font-weight: 400;
    text-align: center;

    .section-count__value {
      display: inline-block;
    }
  }

  small {
    display: flex;
    justify-self: stretch;
    justify-content: space-between;
    gap: 0.04em;
    color: rgb(255 255 255 / 30%);
    font-family: 'UnboundedSans', sans-serif;
    font-size: 0.462rem;
    white-space: pre;

    > span:only-child {
      margin-inline: auto;
    }
  }

  &--left,
  &--right {
    small {
      display: block;
    }
  }

  &--left {
    justify-items: start;
    text-align: left;
  }

  &--right {
    justify-items: end;
    text-align: right;
  }
}

@media (max-width: 768px) {
  .section-count {
    gap: 2.2px;

    strong {
      font-size: 1.925rem;
    }

    small {
      font-size: 0.374rem;
    }
  }
}

@media (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .section-count strong {
    font-size: 1.925rem;
  }
}
</style>
