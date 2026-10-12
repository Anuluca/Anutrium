<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery, useWindowSize } from '@vueuse/core'

import LoadingLine from '@/components/LoadingLine/index.vue'
import LoadingPercentage from '@/components/LoadingPercentage/index.vue'
import Logo from '@/components/Logo/index.vue'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import { getTempleEntranceHorizon } from '@/config/templeCamera'
import { visualState } from '@/stores'
import { useSiteLoading } from '@/stores/siteLoading'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { loadCriticalFont } from '@/utils/fontLoader'
import { hasJourneyReturnState } from '@/utils/journeyReturnState'
import { templePresentations } from '@/views/Home/templePresentation'

const emit = defineEmits([
  'finished',
  'scene-ready',
  'hidden',
  'progress-complete',
])

const isAnimating = ref(true)
const isLogoWipingOut = ref(false)
const logo2DShow = ref(false)
const logo2DHide = ref(false)
const isLogoDocking = ref(false)
const isBackgroundExiting = ref(false)
const isBackgroundFading = ref(false)
const siteLoading = useSiteLoading()
const route = useRoute()
// 固定首次访问的动画类型；模块入口与其详情页不能按路径前缀混用。
const isHorizonIntro = route.name === 'HOME' || route.name === 'ABOUT'
const navigation = useTempleNavigation()
const visual = visualState()
const touchDevice = useMediaQuery('(pointer: coarse)')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const projectedLogoHeight = ref(0)
const logoSizeStyle = computed(() =>
  isHorizonIntro && projectedLogoHeight.value > 0
    ? { '--entry-logo-height': `${projectedLogoHeight.value}px` }
    : {}
)
const loadingLineStyle = computed(() => {
  const presentation =
    visual.deviceType === 'desktop' && !touchDevice.value
      ? templePresentations.desktop
      : templePresentations.mobile
  return {
    '--loading-horizon-y': `${getTempleEntranceHorizon(
      Math.max(1, viewportWidth.value),
      Math.max(360, viewportHeight.value),
      presentation.scene.homeCamera,
      reducedMotion.value ||
        navigation.simpleEntrance ||
        hasJourneyReturnState()
    )}px`,
  }
})
const introProgress = ref(0)
const loadingProgress = computed(() => {
  if (!siteLoading.tasks.size) return introProgress.value
  // 20% 为入口动画，80% 为页面真实准备阶段。
  const value = Math.floor(
    introProgress.value * 0.2 + siteLoading.progress * 0.8
  )
  return siteLoading.pending ? Math.min(99, value) : value
})
const isProgressFading = ref(false)
const compactVisible = ref(false)
const compactFading = ref(false)
let introReady = false
let skipLogoReveal = false
const logoRotating3DRef = ref()
const logo2DRef = ref<HTMLElement | null>(null)
const entryStyle = ref<Record<string, string>>({})
const timers: number[] = []
let isUnmounted = false
let hasStartedIntroExit = false
let hasEmittedReady = false
let progressAnimationFrame: number | null = null
let progressStartedAt: number | null = null

const INTRO_MIN_DURATION = 800
const INTRO_STOP_DURATION = 350
const INTRO_PROGRESS_DURATION = INTRO_MIN_DURATION + INTRO_STOP_DURATION
const INTRO_FAILSAFE_DURATION = 4200
const EXIT_BACKGROUND_SHRINK_DURATION = 1260
const EXIT_BACKGROUND_FADE_DURATION = 760
const EXIT_DOCK_START_DELAY = 980
const EXIT_BACKGROUND_FADE_DELAY =
  EXIT_DOCK_START_DELAY + EXIT_BACKGROUND_SHRINK_DURATION
const EXIT_LOGO_HIDE_DELAY = 2460
const EXIT_HIDE_DELAY =
  EXIT_BACKGROUND_FADE_DELAY + EXIT_BACKGROUND_FADE_DURATION

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

const updateLoadingProgress = (timestamp: number) => {
  progressAnimationFrame = null
  if (introReady) return
  progressStartedAt ??= timestamp
  const elapsed = timestamp - progressStartedAt
  introProgress.value = Math.min(
    99,
    Math.floor((elapsed / INTRO_PROGRESS_DURATION) * 100)
  )
  // 达到等待上限后由真实任务完成信号继续推进，不为停滞的网络空转。
  if (introProgress.value < 99)
    progressAnimationFrame = window.requestAnimationFrame(updateLoadingProgress)
}

const completeLoadingProgress = () => {
  if (progressAnimationFrame !== null) {
    window.cancelAnimationFrame(progressAnimationFrame)
    progressAnimationFrame = null
  }
  introProgress.value = 100
  if (isHorizonIntro) isProgressFading.value = true
  else schedule(() => (isProgressFading.value = true), 140)
}

const emitReady = () => {
  if (hasEmittedReady) return

  hasEmittedReady = true
  emit('finished')
}

const hideIntro = () => {
  if (!isAnimating.value) return

  isAnimating.value = false
  emit('hidden')
}

const forceHideIntro = () => {
  if (isUnmounted || !isAnimating.value) return
  // 入口动画兜底只处理动画故障，不越过仍在下载或预热的页面资源。
  if (siteLoading.pending) return

  isLogoWipingOut.value = true
  isBackgroundExiting.value = true
  isBackgroundFading.value = true
  siteLoading.presentationReady = true
  emitReady()
  emit('scene-ready')
  hideIntro()
}

const getViewportSize = () => ({
  width: Math.max(1, window.innerWidth),
  height: Math.max(1, window.innerHeight),
})

const isMobileLayout = () =>
  window.matchMedia('(max-aspect-ratio: 1/1)').matches ||
  window.innerWidth < 768

const getVisibleElementRect = (selector: string) => {
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue

    const style = window.getComputedStyle(element)
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      return { element, rect, style }
    }
  }

  return null
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

  return {
    left: 40,
    top: height - footerHeight - 10,
    width: Math.max(1, width - 80),
    height: footerHeight,
    radius: '0px',
  }
}

const getBackgroundTargetRect = () => {
  const footerTarget = getVisibleElementRect('[data-entry-footer-target]')
  if (!footerTarget) return getFooterFallbackRect()
  const { rect, style } = footerTarget

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    radius: style.borderRadius,
  }
}

const measureExitTargets = () => {
  const { width, height } = getViewportSize()
  const logoTarget = getVisibleElementRect('[data-entry-logo-target]')
  const logoTargetSvgRect = logoTarget?.element
    .querySelector('svg')
    ?.getBoundingClientRect()
  const logoRect =
    logoTargetSvgRect || logoTarget?.rect || getLogoFallbackRect()
  const logoSourceRect = logo2DRef.value?.getBoundingClientRect()
  const logoSourceWidth = Math.max(1, logoSourceRect?.width || logoRect.width)
  const logoSourceHeight = Math.max(
    1,
    logoSourceRect?.height || logoRect.height
  )
  const logoTargetScale = Math.min(
    logoRect.width / logoSourceWidth,
    logoRect.height / logoSourceHeight
  )
  const backgroundRect = getBackgroundTargetRect()

  entryStyle.value = {
    '--entry-logo-target-x': `${logoRect.left}px`,
    '--entry-logo-target-y': `${logoRect.top}px`,
    '--entry-logo-target-scale': `${logoTargetScale}`,
    '--entry-bg-target-x': `${backgroundRect.left}px`,
    '--entry-bg-target-y': `${backgroundRect.top}px`,
    '--entry-bg-target-scale-x': `${backgroundRect.width / width}`,
    '--entry-bg-target-scale-y': `${backgroundRect.height / height}`,
    '--entry-bg-target-radius': backgroundRect.radius,
  }
}

const startExitMotion = async () => {
  await nextTick()
  if (isUnmounted) return

  measureExitTargets()
  isLogoDocking.value = true
  isBackgroundExiting.value = true
  emitReady()
  if (!isHorizonIntro)
    schedule(
      revealScene,
      (EXIT_BACKGROUND_SHRINK_DURATION + EXIT_BACKGROUND_FADE_DURATION) / 2
    )
}

const finishIntro = () => {
  if (hasStartedIntroExit || isUnmounted) return

  hasStartedIntroExit = true
  completeLoadingProgress()
  if (!isHorizonIntro) startIntroExit()
}

const startIntroExit = () => {
  if (isUnmounted) return
  emit('progress-complete')
  const exitDuration = skipLogoReveal
    ? Math.max(
        EXIT_BACKGROUND_SHRINK_DURATION + EXIT_BACKGROUND_FADE_DURATION,
        isHorizonIntro ? 2440 : 0
      )
    : EXIT_HIDE_DELAY
  // 资源准备可能超过入口动画时长，退场兜底必须从实际完成时开始计时。
  schedule(forceHideIntro, exitDuration + 320)

  if (skipLogoReveal) {
    isLogoWipingOut.value = true
    void startExitMotion()

    schedule(() => {
      isBackgroundFading.value = true
    }, EXIT_BACKGROUND_SHRINK_DURATION)

    schedule(() => {
      hideIntro()
    }, exitDuration)
    return
  }

  logo2DShow.value = true
  isLogoWipingOut.value = true

  schedule(() => {
    void startExitMotion()
  }, EXIT_DOCK_START_DELAY)

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

const tryFinishIntro = () => {
  if (introReady && !siteLoading.pending) finishIntro()
}

const revealScene = () => {
  siteLoading.presentationReady = true
  emit('scene-ready')
}

const rotateFinished = () => {
  introReady = true
  introProgress.value = 100
  tryFinishIntro()
}

watch(() => siteLoading.pending, tryFinishIntro)
// 首次入口保留完整 Logo 过渡；后续页面准备复用同一条加载线。
watch(
  [isAnimating, () => siteLoading.pending, () => siteLoading.batch],
  ([animating, pending]) => {
    if (animating) return
    if (pending) {
      compactVisible.value = true
      compactFading.value = false
    } else if (compactVisible.value) {
      compactFading.value = true
    }
  },
  { flush: 'sync' }
)

onMounted(() => {
  progressAnimationFrame = window.requestAnimationFrame(updateLoadingProgress)
  schedule(() => {
    introReady = true
    introProgress.value = 100
    skipLogoReveal = true
    tryFinishIntro()
  }, INTRO_FAILSAFE_DURATION)

  void loadCriticalFont()
  waitWithSchedule(INTRO_MIN_DURATION).then(() => {
    if (isUnmounted) return
    logoRotating3DRef.value?.stop()
  })
})

onUnmounted(() => {
  isUnmounted = true
  if (progressAnimationFrame !== null) {
    window.cancelAnimationFrame(progressAnimationFrame)
    progressAnimationFrame = null
  }
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
        'entry-mode--horizon': isHorizonIntro,
        'entry-mode--centered': !isHorizonIntro,
      }"
      :style="[loadingLineStyle, logoSizeStyle, entryStyle]"
    >
      <div class="entry-background" />

      <div class="logo-wrapper" :class="{ 'is-wiping-out': isLogoWipingOut }">
        <div class="blinds-container">
          <LogoRotating3D
            ref="logoRotating3DRef"
            render-mode="edges"
            edge-color="#E23456"
            :edge-width="2"
            transparent
            :bottom-anchor="isHorizonIntro"
            @anchor-change="projectedLogoHeight = $event"
            @finished="rotateFinished"
          />
        </div>
      </div>
      <LoadingLine
        v-if="isHorizonIntro"
        :progress="loadingProgress"
        :fading="isProgressFading"
        :style="loadingLineStyle"
        aria-hidden="true"
        @complete="startIntroExit"
        @reveal="revealScene"
      />
      <LoadingPercentage
        v-else
        :progress="loadingProgress"
        :fading="isProgressFading"
        aria-hidden="true"
      />
      <div
        ref="logo2DRef"
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
    <LoadingLine
      v-if="!isAnimating && compactVisible"
      :key="siteLoading.batch"
      class="site-loading-progress"
      :progress="siteLoading.progress"
      :fading="compactFading"
      :style="loadingLineStyle"
      aria-label="网站加载进度"
      @reveal="siteLoading.presentationReady = true"
      @faded="compactFading && (compactVisible = false)"
    />
  </Teleport>
</template>

<style lang="less" scoped src="./index.less" />

<style lang="less" scoped>
.entry-loading-progress.site-loading-progress.no-rem {
  position: fixed;
  z-index: 1001;
}
</style>
