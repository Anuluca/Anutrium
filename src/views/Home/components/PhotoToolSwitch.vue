<script setup lang="ts">
import { ElSwitch } from 'element-plus'

import 'element-plus/es/components/switch/style/css'

defineProps<{ modelValue: boolean; label: string }>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <ElSwitch
    class="photo-tool-switch no-rem"
    :model-value="modelValue"
    :aria-label="label"
    :width="46"
    @update:model-value="emit('update:modelValue', Boolean($event))"
  />
</template>

<style lang="less" scoped>
@import '../styles/photoToolDesign.less';
.photo-tool-switch.no-rem {
  --el-switch-on-color: @photo-tool-accent;
  --el-switch-off-color: @photo-tool-track;
  --switch-thumb-shadow: @photo-tool-thumb-shadow;
  flex: none;
}
</style>
