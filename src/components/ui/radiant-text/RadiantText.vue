<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@inspira-ui/plugins'

interface Props {
  active?: boolean
  duration?: number
  radiantWidth?: number
  baseColor?: string
  radiantColor?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  active: true,
  duration: 10,
  radiantWidth: 100,
  baseColor: 'currentColor',
  radiantColor: '#ffffff',
  class: '',
})

const styleVariables = computed(() => ({
  '--radiant-animation-duration': `${props.duration}s`,
  '--radiant-width': `${props.radiantWidth}px`,
  '--radiant-base-color': props.baseColor,
  '--radiant-color': props.radiantColor,
}))
</script>

<template>
  <span
    :style="styleVariables"
    :class="
      cn('radiant-text', props.active && 'radiant-text--active', props.class)
    "
  >
    <span class="radiant-text__base"><slot /></span>
    <span v-if="props.active" class="radiant-text__shine" aria-hidden="true">
      <slot />
    </span>
  </span>
</template>

<style scoped>
@keyframes radiant {
  0%,
  90%,
  100% {
    background-position: calc(-100% - var(--radiant-width)) 0;
  }

  30%,
  60% {
    background-position: calc(100% + var(--radiant-width)) 0;
  }
}

.radiant-text {
  position: relative;
  display: inline-block;
  isolation: isolate;
  color: var(--radiant-base-color);
}

.radiant-text__base {
  display: block;
  color: var(--radiant-base-color);
  white-space: nowrap;
}

.radiant-text__shine {
  position: absolute;
  top: -0.08em;
  right: 0;
  bottom: -0.14em;
  left: 0;
  box-sizing: border-box;
  padding-top: 0.08em;
  padding-bottom: 0.14em;
  color: transparent;
  background-image: linear-gradient(
    to right,
    transparent,
    var(--radiant-color) 50%,
    transparent
  );
  background-repeat: no-repeat;
  background-position: calc(-100% - var(--radiant-width)) 0;
  background-size: var(--radiant-width) 100%;
  background-clip: text;
  animation: radiant var(--radiant-animation-duration) infinite;
  mix-blend-mode: screen;
  pointer-events: none;
  text-shadow: none;
  white-space: nowrap;
  -webkit-background-clip: text;
}
</style>
