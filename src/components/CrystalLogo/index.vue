<template>
  <div class="crystal-logo no-cursor">
    <div class="crystal-shape">
      <div class="shine-effect" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="less">
.crystal-logo {
  display: inline-block;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;

  .crystal-shape {
    width: 20px;
    height: 40px;
    background-color: #e23456;
    position: relative;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    transition: all 0.3s ease;

    .shine-effect {
      position: absolute;
      top: -100%;
      left: -100%;
      width: 300%;
      height: 300%;
      background: linear-gradient(
        45deg,
        transparent 0%,
        transparent 40%,
        rgba(255, 255, 255, 0.8) 50%,
        transparent 60%,
        transparent 100%
      );
      animation: shineScan 3s ease-in-out infinite;
      opacity: 0.6;
    }
  }

  &:hover {
    filter: drop-shadow(0 0 10px #e23456) drop-shadow(0 0 20px #e23456)
      drop-shadow(0 0 30px rgba(226, 52, 86, 0.5));
    .crystal-shape {
      background-color: rgba(0, 0, 0, 0.9) !important;

      .shine-effect {
        opacity: 0.1 !important;
      }
    }
  }
}

@keyframes shineScan {
  0% {
    transform: translate(-50%, -50%) rotate(45deg);
    opacity: 0;
  }
  20% {
    opacity: 0.6;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    transform: translate(50%, 50%) rotate(45deg);
    opacity: 0;
  }
}
</style>
