<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import Logo from '@/components/Logo/index.vue'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import { loadCriticalFont } from '@/utils/fontLoader'

const emit = defineEmits(['finished'])
const route = useRoute()

const isAnimating = ref(true)
const isLogoWipingOut = ref(false)
const logo2DShow = ref(false)
const logo2DHide = ref(false)
const isLogoDocking = ref(false)
const isBackgroundExiting = ref(false)
const isBackgroundFading = ref(false)
const logoRotating3DRef = ref()
const entryStyle = ref<Record<string, string>>({})
const timers: number[] = []
let isUnmounted = false
let hasStartedIntroExit = false
let hasEmittedReady = false

const INTRO_MIN_DURATION = 1600
const INTRO_FAILSAFE_DURATION = 4200
const INTRO_FORCE_HIDE_DURATION = 6200
const EXIT_LOGO_FADE_DELAY = 340
const EXIT_DOCK_START_DELAY = 980
const EXIT_READY_DELAY = 1140
const EXIT_BACKGROUND_FADE_DELAY = 2280
const EXIT_LOGO_HIDE_DELAY = 2460
const EXIT_HIDE_DELAY = 3040

const schedule = (handler: () => void, timeout: number) => {
  const timer = window.setTimeout(() => {
    const index = timers.indexOf(timer)
    if (index >= 0) timers.splice(index, 1)
    handler()
  }, timeout)
  timers.push(timer)
}

const waitWithSchedule = (timeout: number) =>
  new Promise<void>((resolve) => {
    schedule(resolve, timeout)
  })

const emitReady = () => {
  if (hasEmittedReady) return

  hasEmittedReady = true
  emit('finished')
}

const hideIntro = () => {
  isAnimating.value = false
}

const forceHideIntro = () => {
  if (isUnmounted || !isAnimating.value) return

  isLogoWipingOut.value = true
  isBackgroundExiting.value = true
  isBackgroundFading.value = true
  emitReady()
  hideIntro()
}

const getViewportSize = () => ({
  width: Math.max(1, window.innerWidth),
  height: Math.max(1, window.innerHeight),
})

const isMobileLayout = () =>
  window.matchMedia('(max-aspect-ratio: 1/1)').matches ||
  window.innerWidth < 768

const getVisibleRect = (selector: string) => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))

  return (
    elements
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
        style: window.getComputedStyle(element),
      }))
      .find(
        ({ rect, style }) =>
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
      )?.rect || null
  )
}

const getLogoFallbackRect = () => {
  const { width } = getViewportSize()
  const rootFontSize =
    parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
  const size = Math.max(24, rootFontSize * 1.83333)
  const top = isMobileLayout()
    ? Math.max(10, rootFontSize * 0.7)
    : rootFontSize * 2
  const left = isMobileLayout()
    ? (width - size) / 2
    : Math.max(24, rootFontSize * 2.33333)

  return {
    left,
    top,
    width: size,
    height: size,
  }
}

const getFooterFallbackRect = () => {
  const { width, height } = getViewportSize()
  const footerHeight = 26
  const hasFullFooter = route.meta.fullFooter !== false

  if (hasFullFooter) {
    return {
      left: 0,
      top: height - footerHeight,
      width,
      height: footerHeight,
      opacity: 0.98,
      radius: '0px',
    }
  }

  return {
    left: 40,
    top: height - footerHeight - 10,
    width: Math.max(1, width - 80),
    height: footerHeight,
    opacity: 0.98,
    radius: '0px',
  }
}

const getBackgroundTargetRect = () => {
  const { width, height } = getViewportSize()

  if (isMobileLayout()) {
    const size = Math.min(96, Math.max(40, width * 0.26))

    return {
      left: (width - size) / 2,
      top: (height - size) / 2,
      width: size,
      height: size,
      opacity: 0,
      radius: `${size / 2}px`,
    }
  }

  const footerRect = getVisibleRect('[data-entry-footer-target]')
  if (!footerRect) return getFooterFallbackRect()

  return {
    left: footerRect.left,
    top: footerRect.top,
    width: footerRect.width,
    height: footerRect.height,
    opacity: 0.98,
    radius: window.getComputedStyle(
      document.querySelector('[data-entry-footer-target]') as HTMLElement
    ).borderRadius,
  }
}

const measureExitTargets = () => {
  const { width, height } = getViewportSize()
  const logoRect =
    getVisibleRect('[data-entry-logo-target]') || getLogoFallbackRect()
  const backgroundRect = getBackgroundTargetRect()

  entryStyle.value = {
    '--entry-logo-target-left': `${logoRect.left}px`,
    '--entry-logo-target-top': `${logoRect.top}px`,
    '--entry-logo-target-width': `${logoRect.width}px`,
    '--entry-logo-target-height': `${logoRect.height}px`,
    '--entry-bg-target-x': `${backgroundRect.left}px`,
    '--entry-bg-target-y': `${backgroundRect.top}px`,
    '--entry-bg-target-scale-x': `${backgroundRect.width / width}`,
    '--entry-bg-target-scale-y': `${backgroundRect.height / height}`,
    '--entry-bg-target-opacity': `${backgroundRect.opacity}`,
    '--entry-bg-target-radius': backgroundRect.radius,
  }
}

const startExitMotion = async () => {
  await nextTick()
  if (isUnmounted) return

  measureExitTargets()
  isLogoDocking.value = true
  isBackgroundExiting.value = true
}

const finishIntro = (skipLogoReveal = false) => {
  if (hasStartedIntroExit || isUnmounted) return

  hasStartedIntroExit = true

  if (skipLogoReveal) {
    isLogoWipingOut.value = true
    void startExitMotion()

    schedule(() => {
      emitReady()
    }, 780)

    schedule(() => {
      isBackgroundFading.value = true
    }, 980)

    schedule(() => {
      hideIntro()
    }, 1680)
    return
  }

  logo2DShow.value = true

  schedule(() => {
    isLogoWipingOut.value = true
  }, EXIT_LOGO_FADE_DELAY)

  schedule(() => {
    void startExitMotion()
  }, EXIT_DOCK_START_DELAY)

  schedule(() => {
    emitReady()
  }, EXIT_READY_DELAY)

  schedule(() => {
    isBackgroundFading.value = true
  }, EXIT_BACKGROUND_FADE_DELAY)

  schedule(() => {
    logo2DHide.value = true
  }, EXIT_LOGO_HIDE_DELAY)

  schedule(() => {
    hideIntro()
  }, EXIT_HIDE_DELAY)
}

const rotateFinished = () => {
  finishIntro()
}

onMounted(() => {
  schedule(() => {
    finishIntro(true)
  }, INTRO_FAILSAFE_DURATION)
  schedule(forceHideIntro, INTRO_FORCE_HIDE_DURATION)

  Promise.all([loadCriticalFont(), waitWithSchedule(INTRO_MIN_DURATION)]).then(
    () => {
      if (isUnmounted) return
      logoRotating3DRef.value?.stop()
    }
  )
})

onUnmounted(() => {
  isUnmounted = true
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.length = 0
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isAnimating"
      class="entry-overlay-container"
      :class="{
        'is-background-exiting': isBackgroundExiting,
        'is-background-fading': isBackgroundFading,
      }"
      :style="entryStyle"
    >
      <div class="entry-background" />

      <div class="logo-wrapper" :class="{ 'is-wiping-out': isLogoWipingOut }">
        <div class="blinds-container">
          <LogoRotating3D ref="logoRotating3DRef" @finished="rotateFinished" />
        </div>
      </div>
      <div
        :class="{
          'logo-wrapper2': true,
          show: logo2DShow,
          'is-docking': isLogoDocking,
          'is-hidden': logo2DHide,
        }"
      >
        <Logo v-if="logo2DShow" ref="logoRef" class="logo" />
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped src="./index.less" />
