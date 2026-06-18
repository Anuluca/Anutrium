<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import StartAnimation from '@/components/StartAnimation/index.vue'
import BackController from '@/components/BackController/index.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { visualState } from './stores'
import CursorMove from '@/components/CursorMove/index.vue'
import { installExternalLinkTracking } from '@/utils/analytics'

const visualStateStore = visualState()
let removeExternalLinkTracking: (() => void) | null = null
let resizeRafId: number | null = null
let showLayoutTimer: number | null = null

function setRootFontSize() {
  if (typeof document === 'undefined') return

  const deviceWidth = document.documentElement.clientWidth
  const deviceHeight = document.documentElement.clientHeight
  const aspectRatio = deviceWidth / deviceHeight

  let rootFontSize = null
  let deviceType = ''

  if (aspectRatio <= 2 / 3) {
    rootFontSize = (deviceWidth / 375) * 14
    deviceType = 'mobile'
  } else if (aspectRatio <= 1 && aspectRatio > 2 / 3) {
    rootFontSize = (deviceWidth / 375) * 8
    deviceType = 'tablet'
  } else {
    rootFontSize = (deviceWidth / 375) * 4.9
    deviceType = 'desktop'
  }

  if (visualStateStore.deviceType !== deviceType) {
    visualStateStore.setDeviceType(
      deviceType as 'mobile' | 'tablet' | 'desktop'
    )
  }

  document.documentElement.style.fontSize = rootFontSize + 'px'
}

function scheduleRootFontSizeUpdate() {
  if (resizeRafId !== null) return

  resizeRafId = window.requestAnimationFrame(() => {
    resizeRafId = null
    setRootFontSize()
  })
}

const showLayout = ref(false)
const startAnimationFinished = () => {
  if (showLayoutTimer !== null) {
    window.clearTimeout(showLayoutTimer)
  }

  showLayoutTimer = window.setTimeout(() => {
    showLayout.value = true
    showLayoutTimer = null
  }, 250)
}

onMounted(() => {
  setRootFontSize()
  window.addEventListener('resize', scheduleRootFontSizeUpdate, {
    passive: true,
  })
  visualStateStore.setTheme(localStorage.getItem('theme') || 'dark')
  removeExternalLinkTracking = installExternalLinkTracking()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRootFontSizeUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  if (showLayoutTimer !== null) window.clearTimeout(showLayoutTimer)
  removeExternalLinkTracking?.()
})
</script>

<template>
  <CursorMove />
  <StartAnimation @finished="startAnimationFinished" />
  <layout v-if="showLayout" />
  <FooterCom v-if="showLayout" />
  <BackController />
</template>
