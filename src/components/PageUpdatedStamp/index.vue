<template>
  <span v-if="updatedAt" class="page-updated-stamp" aria-hidden="true">
    UPDATED: {{ updatedAt }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const updatedAt = computed(() =>
  typeof route.meta.updatedAt === 'string' ? route.meta.updatedAt : ''
)
</script>

<style lang="less" scoped>
.page-updated-stamp {
  z-index: 0;
  color: var(--updated-color, var(--primary-color, #e23456));
  font-family: 'anton', sans-serif;
  font-size: var(--updated-font-size, clamp(1.8rem, 2.7vw, 2.7rem));
  letter-spacing: 0;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: var(--updated-transform, translateY(-50%));
  user-select: none;
  white-space: nowrap;
  animation: pageUpdatedStampIn 0.52s ease-out 0.68s both;
}

@keyframes pageUpdatedStampIn {
  from {
    opacity: 0;
    transform: var(--updated-enter-transform, translate3d(8px, -50%, 0));
  }

  to {
    opacity: var(--updated-opacity, 0.06);
    transform: var(--updated-transform, translateY(-50%));
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-updated-stamp {
    animation: none;
    opacity: var(--updated-opacity, 0.06);
  }
}
</style>
