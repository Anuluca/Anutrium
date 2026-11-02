<template>
  <span class="loading-logo no-rem" aria-hidden="true">
    <Logo v-if="mounted" :id="logoId" class="loading-logo__mark" loop />
  </span>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from 'vue'

import Logo from '@/components/Logo/index.vue'

const logoId = `loading-logo-${getCurrentInstance()!.uid}`
const mounted = ref(false)
// 客户端挂载后再创建 SVG，避免静态生成时的实例 ID 与客户端水合发生冲突。
onMounted(() => (mounted.value = true))
</script>

<style lang="less" scoped>
.loading-logo.no-rem {
  display: inline-grid;
  place-items: center;
  width: calc(var(--loading-logo-height, 60px) * 0.8);
  height: var(--loading-logo-height, 60px);
  max-width: 100%;
  max-height: 100%;
  color: var(--modal-theme-color, var(--page-theme-color, #e23456));
  line-height: 0;
  pointer-events: none;
}
.loading-logo__mark {
  width: 100%;
  height: 100%;
}
</style>
