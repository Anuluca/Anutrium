<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import Logo from '@/components/Logo/index.vue'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import { showPageContent } from '@/utils/fontLoader'

const emit = defineEmits(['finished'])

const isAnimating = ref(true)
const isLogoWipingOut = ref(false)
const logo2DShow = ref(false)
const logo2DHide = ref(false)
const isBarsExiting = ref(false)
const logoRotating3DRef = ref()
const timers: number[] = []

const schedule = (handler: () => void, timeout: number) => {
  const timer = window.setTimeout(() => {
    const index = timers.indexOf(timer)
    if (index >= 0) timers.splice(index, 1)
    handler()
  }, timeout)
  timers.push(timer)
}

const bars = computed(() => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
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
  schedule(() => {
    isLogoWipingOut.value = true
  }, 400)
  schedule(() => {
    isBarsExiting.value = true
  }, 850)

  schedule(() => {
    logo2DHide.value = true

    showPageContent()

    emit('finished')

    schedule(() => {
      isAnimating.value = false
    }, 1200)
  }, 1400)
}

onMounted(() => {
  if (!document.fonts) {
    logoRotating3DRef.value?.stop()
    return
  }

  document.fonts.ready.then(() => {
    schedule(() => {
      logoRotating3DRef.value?.stop()
    }, 1600)
  })
})

onUnmounted(() => {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.length = 0
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
        <Logo v-if="logo2DShow" ref="logoRef" class="logo" />
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped src="./index.less" />
