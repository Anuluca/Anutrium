<template>
  <span class="text-roll" :aria-label="text">
    <span class="text-roll__line" aria-hidden="true">
      <span
        v-for="(character, index) in characters"
        :key="`current-${index}`"
        class="text-roll__char text-roll__char--current"
        :style="{ '--text-roll-delay': getCharacterDelay(index) }"
      >
        {{ character }}
      </span>
    </span>
    <span class="text-roll__line text-roll__line--incoming" aria-hidden="true">
      <span
        v-for="(character, index) in characters"
        :key="`incoming-${index}`"
        class="text-roll__char text-roll__char--incoming"
        :style="{ '--text-roll-delay': getCharacterDelay(index) }"
      >
        {{ character }}
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const STAGGER_SECONDS = 0.022

const props = withDefaults(
  defineProps<{
    center?: boolean
    text: string
  }>(),
  {
    center: false,
  }
)

const characters = computed(() =>
  Array.from(props.text, (character) =>
    character === ' ' ? '\u00a0' : character
  )
)

const getCharacterDelay = (index: number) => {
  const staggerIndex = props.center
    ? Math.abs(index - (characters.value.length - 1) / 2)
    : index

  return `${staggerIndex * STAGGER_SECONDS}s`
}
</script>

<style lang="less" scoped>
.text-roll {
  position: relative;
  display: block;
  overflow: hidden;
}

.text-roll__line {
  display: flex;
  justify-content: center;
}

.text-roll__line--incoming {
  position: absolute;
  inset: 0;
}

.text-roll__char {
  display: inline-block;
  transition: transform 0.3s ease-in-out;
  transition-delay: var(--text-roll-delay);
  will-change: transform;
}

.text-roll__char--current {
  transform: translateY(0);
}

.text-roll__char--incoming {
  transform: translateY(105%);
}
</style>
