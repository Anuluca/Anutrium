<script setup lang="ts">
import { type Component, onBeforeUnmount } from 'vue'
import { CloseBold, FullScreen } from '@element-plus/icons-vue'

import { flashActionButton } from '@/utils/flashActionButton'

withDefaults(
  defineProps<{
    expanded?: boolean
    mobile?: boolean
    label?: string
    fontFamily?: string
    iconClass?: string
    icon?: Component
  }>(),
  {
    expanded: false,
    mobile: false,
    label: undefined,
    fontFamily: 'UnboundedSans',
    iconClass: undefined,
    icon: undefined,
  }
)
const emit = defineEmits<{ (event: 'click', value: MouseEvent): void }>()
let flash: Animation | undefined
const onClick = (event: MouseEvent) => {
  flash = flashActionButton(event.currentTarget as HTMLButtonElement)
  emit('click', event)
}
onBeforeUnmount(() => flash?.cancel())
</script>

<template>
  <button
    class="flora-expand-button no-rem"
    :class="{ 'is-mobile': mobile }"
    :style="{ fontFamily: `'${fontFamily}', sans-serif` }"
    type="button"
    :aria-expanded="expanded"
    @click.stop="onClick"
  >
    <component
      :is="icon ?? (expanded ? CloseBold : FullScreen)"
      v-if="icon || !label"
      class="flora-media-expand-icon"
      :class="iconClass"
      aria-hidden="true"
      focusable="false"
    />
    <span>{{ label ?? (expanded ? 'COLLAPSE' : 'EXPAND') }}</span>
  </button>
</template>

<style scoped lang="less">
@import '../styles/floraMedia.less';
button.flora-expand-button.no-rem {
  .flora-media-expand-control();

  > span {
    transform: translateY(-0.06em);
  }

  &.is-mobile {
    .flora-media-expand-control-mobile();
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
</style>
