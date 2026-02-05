<script setup lang="ts">
import { computed, defineEmits, onMounted, ref } from 'vue'

import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import Logo from '@/components/Logo/index.vue'
import { loadAllFonts, showPageContent } from '@/utils/fontLoader'

const emit = defineEmits(['finished'])

const isAnimating = ref(true)
const isLogoWipingOut = ref(false)
const logo2DShow = ref(false)
const logo2DHide = ref(false)
const isBarsExiting = ref(false)
const logoRotating3DRef = ref()

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

const rotateFinished = () => {
  logo2DShow.value = true
  setTimeout(() => {
    isLogoWipingOut.value = true
  }, 400)
  setTimeout(() => {
    isBarsExiting.value = true
    
  }, 850);
  // logo动画时间260ms
  setTimeout(() => {
    logo2DHide.value = true
    // 显示页面内容
    showPageContent()
    // setTimeout(() => {
      emit('finished')
    // }, 100)
    // 等待竖条移出动画完成后隐藏容器
    setTimeout(() => {
      isAnimating.value = false
    }, 1200)
  }, 1400)
}

onMounted(() => {
  document.fonts.ready.then(async () => {
    // Logo 擦入完成后开始擦出
    setTimeout(async () => {
      // 等待字体加载完成
      await loadAllFonts()
      logoRotating3DRef.value.stop()
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
          <LogoRotating3D ref="logoRotating3DRef" @finished="rotateFinished" />
        </div>
      </div>
      <div :class="{ 'logo-wrapper2': true, show: logo2DShow && !logo2DHide }">
        <Logo v-if="logo2DShow" class="logo" ref="logoRef" />
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped src="./index.less" />
