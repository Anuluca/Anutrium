<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    id: string
    title: string
    controlId?: string
    value?: string | number
    unit?: string
    anchor?: HTMLElement | null
  }>(),
  { unit: '', anchor: null, controlId: undefined, value: undefined }
)
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
const panel = ref<HTMLElement>()
const close = () => emit('update:modelValue', false)
const outsidePointer = (event: PointerEvent) => {
  if (!props.modelValue || !(event.target instanceof Node)) return
  if (
    !panel.value?.contains(event.target) &&
    !props.anchor?.contains(event.target)
  )
    close()
}
const onKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue || event.key !== 'Escape') return
  event.stopPropagation()
  event.preventDefault()
  close()
  props.anchor?.focus({ preventScroll: true })
}
onMounted(() => {
  window.addEventListener('pointerdown', outsidePointer, { passive: true })
  // 捕获阶段优先关闭工具框，避免同时触发拍照模式的退出快捷键。
  window.addEventListener('keydown', onKeydown, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', outsidePointer)
  window.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <Transition name="crt-effect">
    <section
      v-if="modelValue"
      :id="id"
      ref="panel"
      class="photo-tool-panel no-rem"
      :aria-label="title"
    >
      <div class="photo-tool-panel__header">
        <label :for="controlId">{{ title }}</label>
        <output v-if="value !== undefined || $slots.value" :for="controlId">
          <slot name="value"
            >{{ value }}<small v-if="unit">{{ unit }}</small></slot
          >
        </output>
        <slot name="actions" />
      </div>
      <slot />
    </section>
  </Transition>
</template>

<style lang="less" scoped>
@import '../styles/photoToolDesign.less';
.photo-tool-panel.no-rem {
  position: absolute;
  bottom: var(--photo-tool-panel-bottom, 88px);
  top: var(--photo-tool-panel-top, auto);
  left: 0;
  box-sizing: border-box;
  width: min(600px, var(--photo-safe-width, calc(100vw - 80px)));
  padding: 16px 16px 24px;
  border: 0;
  .photo-tool-surface();
  .photo-tool-fields();
  max-height: var(
    --photo-tool-panel-max-height,
    calc(var(--photo-safe-height, 100dvh) - 88px)
  );
  overflow-y: auto;
  overscroll-behavior: contain;
  color: @photo-tool-text;
  transform-origin: center center;
  font: 700 18px/1.4 'alibaba-puhuiti', sans-serif;
  .photo-tool-panel__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    font: 900 28px/1.2 'alibaba-puhuiti', sans-serif;
    label {
      color: @photo-tool-muted;
      letter-spacing: -0.05em;
      transform: scaleX(0.9);
      transform-origin: left center;
    }
  }
  :deep(output) {
    font: inherit;
    font-size: 36px;
    font-family: 'UnboundedSans', sans-serif;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.05em;
    white-space: nowrap;
  }
  :deep(small) {
    margin-left: 2px;
    font: inherit;
    font-family: 'alibaba-puhuiti', sans-serif;
    color: @photo-tool-muted;
  }
  &::after {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.62);
    opacity: 0;
    content: '';
    mix-blend-mode: screen;
    pointer-events: none;
  }
  &.crt-effect-enter-active {
    animation: anutriumCrtOn 0.46s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    &::after {
      animation: anutriumCrtFlashOn 0.46s linear forwards;
    }
  }
  &.crt-effect-leave-active {
    pointer-events: none;
    animation: anutriumCrtOff 0.42s cubic-bezier(0.2, 1, 0.22, 1) forwards;
    &::after {
      animation: anutriumCrtFlashOff 0.42s linear forwards;
    }
  }
}
</style>
