<template>
  <span
    class="menu-toggle-icon hamburger"
    :class="{ active }"
    aria-hidden="true"
  >
    <span />
    <span />
    <span />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean
}>()
</script>

<style lang="less" scoped>
.menu-toggle-icon {
  position: relative;
  z-index: 1;
  display: block;
  width: 30px;
  height: 22px;

  > span {
    position: absolute;
    top: 50%;
    left: 0;
    display: block;
    width: 100%;
    height: 3px;
    background-color: var(--text-color);
    transition: transform 0.3s ease, opacity 0.3s ease;

    &:nth-child(1) {
      transform: translateY(calc(-50% - 9.5px));
    }

    &:nth-child(2) {
      transform: translateY(-50%);
    }

    &:nth-child(3) {
      transform: translateY(calc(-50% + 9.5px));
    }
  }

  &.active > span {
    &:nth-child(1) {
      transform: translateY(-50%) rotate(45deg);
    }

    &:nth-child(2) {
      opacity: 0;
    }

    &:nth-child(3) {
      transform: translateY(-50%) rotate(-45deg);
    }
  }
}
</style>
