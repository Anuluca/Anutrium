<template>
  <button class="diamond-close-btn" :title="title" @click="$emit('click')">
    <div class="diamond-shape">
      <svg
        class="close-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped lang="less">
@red: #e23456;

.diamond-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  .diamond-shape {
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid @red;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.3s ease;
    &::before {
      content: '';
      position: absolute;
      inset: -4px;
      border: 1px solid rgba(226, 52, 86, 0.3);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .close-icon {
      transform: rotate(-45deg) scale(3);
      color: @red;
      transition: all 0.3s ease;
    }
  }

  &:hover {
    .diamond-shape {
      background: rgba(0, 0, 0, 0.8);
      box-shadow: 0 0 15px rgba(226, 52, 86, 0.4),
        inset 0 0 10px rgba(226, 52, 86, 0.2);

      &::before {
        opacity: 1;
      }

      .close-icon {
        transform: rotate(45deg);
        color: #fff;
        filter: drop-shadow(0 0 8px @red);
      }
    }
  }

  &:active {
    .diamond-shape {
      transform: rotate(45deg) scale(1.5);
    }
  }
}
</style>
