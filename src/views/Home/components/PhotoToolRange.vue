<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    id: string
    label: string
    min: number
    max: number
    disabled?: boolean
    step?: number
    unit?: string
  }>(),
  { step: 1, unit: '', disabled: false }
)
const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()
const ratio = computed(() =>
  props.max > props.min
    ? Math.min(
        1,
        Math.max(0, (props.modelValue - props.min) / (props.max - props.min))
      )
    : 0
)
const progress = computed(() => `${ratio.value * 100}%`)
const thumbLeft = computed(
  () => `calc(${progress.value} - ${ratio.value * 14}px)`
)
const valueText = computed(
  () => `${Math.round(props.modelValue)}${props.unit ? ` ${props.unit}` : ''}`
)
const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (!props.disabled && Number.isFinite(value))
    emit('update:modelValue', value)
}
</script>

<template>
  <div class="photo-tool-range no-rem" :class="{ 'is-disabled': disabled }">
    <div
      class="photo-tool-range__control"
      :style="{
        '--photo-range-progress': progress,
        '--photo-range-thumb-left': thumbLeft,
      }"
    >
      <span class="photo-tool-range__track" aria-hidden="true"
        ><span class="photo-tool-range__fill"
      /></span>
      <span class="photo-tool-range__thumb" aria-hidden="true" />
      <!-- 原生 range 只处理输入，绘制不依赖浏览器私有伪元素。 -->
      <input
        :id="id"
        class="is-clickable"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :value="modelValue"
        :aria-label="label"
        :aria-valuetext="valueText"
        @input="onInput"
      />
    </div>
    <div class="photo-tool-range__limits" aria-hidden="true">
      <span>{{ min }}{{ unit }}</span
      ><span>{{ max }}{{ unit }}</span>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../styles/photoToolDesign.less';
.photo-tool-range.no-rem {
  margin-top: 14px;
  &.is-disabled {
    opacity: 0.4;
    input[type='range'] {
      cursor: not-allowed;
    }
  }
  .photo-tool-range__control {
    position: relative;
    height: 22px;
    &:has(input:focus-visible) {
      outline: 1px solid @photo-tool-accent;
      outline-offset: 3px;
    }
  }
  .photo-tool-range__track {
    position: absolute;
    top: 6px;
    left: 0;
    right: 0;
    display: block;
    height: 10px;
    border: 0;
    border-radius: 0;
    background: @photo-tool-track;
    pointer-events: none;
  }
  .photo-tool-range__fill {
    display: block;
    width: var(--photo-range-progress, 0%);
    height: 100%;
    background: @photo-tool-accent;
  }
  .photo-tool-range__thumb {
    position: absolute;
    top: 0;
    left: var(--photo-range-thumb-left, 0px);
    display: block;
    width: 14px;
    height: 22px;
    border: 0;
    border-radius: 0;
    background: @photo-tool-accent;
    box-shadow: @photo-tool-thumb-shadow;
    pointer-events: none;
  }
  input[type='range'] {
    appearance: none;
    position: absolute;
    inset: 0;
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: 0;
    opacity: 0;
    cursor: ew-resize;
    &::-webkit-slider-runnable-track {
      height: 10px;
    }
    &::-webkit-slider-thumb {
      appearance: none;
      box-sizing: border-box;
      width: 14px;
      height: 22px;
      margin-top: -6px;
      border: 0;
    }
    &::-moz-range-thumb {
      box-sizing: border-box;
      width: 14px;
      height: 22px;
      border: 0;
    }
  }
  .photo-tool-range__limits {
    display: flex;
    justify-content: space-between;
    font-family: 'UnboundedSans', sans-serif;
    font-size: 13px;
    opacity: 0.55;
  }
}
</style>
