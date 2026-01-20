<script setup lang="ts">
import { computed, defineEmits, onMounted, ref } from 'vue'

import Logo from '@/assets/img/logo/logo.png'
import LogoDark from '@/assets/img/logo/logo_black.png'
import { visualState } from '@/stores'

const emit = defineEmits(['finished'])

const isAnimating = ref(true)
const isLogoWipingOut = ref(false)
const isBarsExiting = ref(false)

const visualStateStore = visualState()
const showLogo = computed(() => {
  return visualStateStore.theme === 'dark' ? Logo : LogoDark
})

const bars = computed(() => {
  // 检测是否为移动端
  const isMobile = window.innerWidth < 768
  const barCount = isMobile ? 10 : 20
  const middleIndex = Math.floor(barCount / 2)

  return Array.from({ length: barCount }, (_, i) => ({
    id: i,
    direction: i < middleIndex ? -1 : 1,
    delay: Math.abs(middleIndex - i) * 0.05,
  }))
})

onMounted(() => {
  document.fonts.ready.then(() => {
    // Logo 擦入完成后开始擦出
    setTimeout(() => {
      isLogoWipingOut.value = true

      // 在 Logo 擦出即将完成时启动背景竖条移出
      setTimeout(() => {
        isBarsExiting.value = true

        setTimeout(() => {
          emit('finished')
        }, 500)

        // 等待竖条移出动画完成后隐藏容器
        setTimeout(() => {
          isAnimating.value = false
        }, 1600)
      }, 800)
    }, 1600)
  })
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isAnimating" class="entry-overlay-container">
      <div class="bars-layout">
        <div
          v-for="bar in bars"
          :key="bar.id"
          class="bg-bar"
          :class="{ 'is-exit': isBarsExiting }"
          :style="{
            '--dir': bar.direction,
            '--delay': `${bar.delay}s`,
          }"
        />
      </div>

      <div class="logo-wrapper" :class="{ 'is-wiping-out': isLogoWipingOut }">
        <div class="blinds-container">
          <img :src="showLogo" alt="Logo" class="logo-img" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped src="./index.less" />
