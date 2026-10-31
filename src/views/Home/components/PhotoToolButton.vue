<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    controls?: string
    expanded?: boolean
    disabled?: boolean
    mobile?: boolean
  }>(),
  { disabled: false, mobile: false, controls: undefined, expanded: undefined }
)
const emit = defineEmits<{ (event: 'click', value: MouseEvent): void }>()
</script>

<template>
  <button
    type="button"
    class="photo-tool-button no-rem"
    :class="{ 'is-active': expanded, 'is-mobile': mobile }"
    :aria-label="label"
    :aria-expanded="expanded"
    :aria-controls="controls"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style lang="less" scoped>
@import '../styles/photoToolDesign.less';
.photo-tool-button.no-rem {
  .photo-tool-surface();
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  padding: 10px;
  border: 0;
  border-radius: 0;
  color: @photo-tool-text;
  cursor: pointer;
  transition: color 0.3s ease;
  &.is-active {
    color: @photo-tool-accent;
    :deep(svg) {
      opacity: 1;
    }
  }
  &:focus-visible {
    outline: 1px solid currentColor;
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  :deep(svg) {
    width: 56px;
    height: 56px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    &:not(.is-mobile):not(:disabled) {
      &:hover,
      &:focus-visible {
        color: @photo-tool-accent;
        :deep(svg) {
          opacity: 1;
        }
      }
    }
  }
}
</style>
