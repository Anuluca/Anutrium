<template>
  <RouterLink
    v-if="to"
    :aria-disabled="disabled || undefined"
    class="theme-action-button"
    :style="buttonStyle"
    :tabindex="disabled ? -1 : undefined"
    :to="to"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
    <span
      v-if="showReturnIcon"
      class="theme-action-button__icon"
      aria-hidden="true"
    >
      ↵
    </span>
  </RouterLink>

  <a
    v-else-if="href"
    :aria-disabled="disabled || undefined"
    class="theme-action-button"
    :href="href"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :style="buttonStyle"
    :tabindex="disabled ? -1 : undefined"
    :target="target"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
    <span
      v-if="showReturnIcon"
      class="theme-action-button__icon"
      aria-hidden="true"
    >
      ↵
    </span>
  </a>

  <button
    v-else
    class="theme-action-button"
    :disabled="disabled"
    :style="buttonStyle"
    :type="type"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
    <span
      v-if="showReturnIcon"
      class="theme-action-button__icon"
      aria-hidden="true"
    >
      ↵
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    color?: string
    disabled?: boolean
    href?: string
    label?: string
    showReturnIcon?: boolean
    target?: '_blank' | '_parent' | '_self' | '_top'
    to?: RouteLocationRaw
    type?: 'button' | 'reset' | 'submit'
  }>(),
  {
    color: '#e23456',
    disabled: false,
    href: undefined,
    label: '',
    showReturnIcon: true,
    target: '_self',
    to: undefined,
    type: 'button',
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonStyle = computed(() => ({
  '--theme-action-color': props.color,
}))

const handleClick = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  emit('click', event)
}
</script>

<style scoped lang="less">
.theme-action-button {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.22em;
  width: fit-content;
  padding: 0.22em 0.68em;
  border: 0;
  color: #000;
  background-color: var(--theme-action-color);
  background-image: linear-gradient(
    to right,
    #000 0%,
    #000 50%,
    var(--theme-action-color) 50%,
    var(--theme-action-color) 100%
  );
  background-position: 100% 0;
  background-size: 200% 100%;
  box-shadow: 0 0 0.72rem
    color-mix(in srgb, var(--theme-action-color) 62%, transparent);
  font-family: 'UnboundedSans', sans-serif;
  font-size: clamp(0.65rem, 0.82vw, 0.82rem);
  font-weight: 600;
  letter-spacing: 0.005em;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.28s ease,
    background-position 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.28s ease;
  appearance: none;
  pointer-events: auto;

  &:not(:disabled):not([aria-disabled='true']):hover,
  &:not(:disabled):not([aria-disabled='true']):focus-visible {
    color: #fff;
    background-position: 0 0;
    box-shadow: 0 0 0.72rem rgb(0 0 0 / 78%);
  }

  &:not(:disabled):not([aria-disabled='true']):focus-visible {
    outline: 1px solid currentColor;
    outline-offset: 0.35rem;
  }

  &:disabled,
  &[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.theme-action-button__icon {
  font-family: sans-serif;
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  transform: translateY(0.14em);
}
</style>
