<script setup lang="ts">
import './index.less'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    ariaLabel?: string
  }>(),
  {
    ariaLabel: '切换主题',
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const handleChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
}
</script>

<template>
  <label class="bb8-toggle is-clickable">
    <input
      class="bb8-toggle__checkbox"
      type="checkbox"
      :checked="props.modelValue"
      :aria-label="props.ariaLabel"
      @change="handleChange"
    />
    <span class="bb8-toggle__container" aria-hidden="true">
      <span class="bb8-toggle__scenery">
        <span
          v-for="index in 7"
          :key="`star-${index}`"
          class="bb8-toggle__star"
        />
        <span class="tatto-1" />
        <span class="tatto-2" />
        <span class="gomrassen" />
        <span class="hermes" />
        <span class="chenini" />
        <span
          v-for="index in 3"
          :key="`cloud-${index}`"
          class="bb8-toggle__cloud"
        />
      </span>
      <span class="bb8">
        <span class="bb8__head-container">
          <span class="bb8__antenna" />
          <span class="bb8__antenna" />
          <span class="bb8__head" />
        </span>
        <span class="bb8__body" />
      </span>
      <span class="artificial__hidden">
        <span class="bb8__shadow" />
      </span>
    </span>
  </label>
</template>
