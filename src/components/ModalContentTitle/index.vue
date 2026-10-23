<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <h2 class="modal-content-title no-rem">{{ title }}</h2>
</template>

<style scoped lang="less">
.modal-content-title.no-rem {
  margin: 0 0 12px;
  padding: 16px 12px 20px;
  background-color: rgba(0, 0, 0, 0.4);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--scanline-color) 0,
    var(--scanline-color) 1px,
    transparent 1px,
    transparent 4px
  );
  color: var(--page-theme-color, #8b5cc7);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(24px, 3.2vw, 36px);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: normal;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
