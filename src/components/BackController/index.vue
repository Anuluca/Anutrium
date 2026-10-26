<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import BackStars from '@/components/BackStars/index.vue'
import { TEMPLE_FOCUS_DURATION } from '@/config/templeCamera'
import { templeNavigationById } from '@/config/templeNavigation'
import type { ZodiacSignId } from '@/config/zodiacThemes'
import { visualState } from '@/stores'
import { useTempleNavigation } from '@/stores/templeNavigation'

const route = useRoute()
const visualStateStore = visualState()
const navigation = useTempleNavigation()
const props = withDefaults(defineProps<{ entryActive?: boolean }>(), {
  entryActive: true,
})

const currentRouter = computed(() => route.path)
const isTempleRoute = computed(() => route.name === 'HOME')

const isTextMenu = computed(() => currentRouter.value !== '/test2')
const useDeepBlackBackground = computed(
  () => route.meta.starBackground === 'deep-black'
)

const craftRouteNames = new Set([
  'COLORPALETTE',
  'EASESTUDIO',
  'METRONOME',
  'BOUNCEDYNAMICS',
  'HTMLENTITIES',
  'BASE64CODEC',
  'IMAGEBASE64',
])

const requestedActiveSign = computed<ZodiacSignId>(() => {
  if (isTempleRoute.value) {
    const entry = navigation.activeSelection
      ? templeNavigationById.get(navigation.activeSelection)
      : undefined
    return entry && 'zodiacSign' in entry ? entry.zodiacSign : 'pisces'
  }
  const routeName = String(route.name || '')
  const redirectedPath = route.redirectedFrom?.path || ''

  if (routeName === 'ARCHIVE') return 'aquarius'
  if (routeName.startsWith('FLANERIE')) return 'sagittarius'
  if (
    routeName.startsWith('ISLAND') ||
    routeName === 'TEST' ||
    redirectedPath.startsWith('/island')
  ) {
    return 'pisces'
  }
  if (craftRouteNames.has(routeName)) return 'gemini'
  if (routeName === 'ABOUT') return 'pisces'
  return 'leo'
})
const activeSign = ref<ZodiacSignId>(requestedActiveSign.value)
let pendingActiveSign = activeSign.value

watch(
  requestedActiveSign,
  (sign) => {
    pendingActiveSign = sign
  },
  { flush: 'sync' }
)

watch(
  [() => navigation.activeSelection, () => navigation.aboutOpen],
  () => {
    // 模块切换直接旋转；真正的路由切换仍等待原有离场信号。
    if (isTempleRoute.value) activeSign.value = requestedActiveSign.value
  },
  { flush: 'sync' }
)

watch(
  () => visualStateStore.routeLeaveRevision,
  () => {
    if (route.name !== 'ABOUT') activeSign.value = pendingActiveSign
  },
  { flush: 'sync' }
)

const zodiacLayout = computed(() => {
  if (isTempleRoute.value) return navigation.activeSelection ? 'content' : 'red'
  return currentRouter.value === '/test2'
    ? visualStateStore.zodiacLayout
    : 'content'
})
const particlesVisible = computed(
  () =>
    currentRouter.value !== '/test2' || visualStateStore.homeStarfieldVisible
)
// About 关闭动画结束后再恢复星空与星盘，避免背景提前透出。
const celestialVisible = computed(
  () => !navigation.aboutOpen && !navigation.aboutOverlayVisible
)
const motionActive = computed(
  () =>
    celestialVisible.value &&
    (!isTempleRoute.value || navigation.backgroundMotionActive)
)
const simpleInitialEntrance = computed(
  () =>
    isTempleRoute.value &&
    navigation.simpleEntrance &&
    navigation.isInitialScene
)
</script>

<template>
  <div class="back-controller">
    <BackStars
      :theme="visualStateStore.theme"
      :is-text-menu="isTextMenu"
      :deep-black="useDeepBlackBackground"
      :active-sign="activeSign"
      :layout="zodiacLayout"
      :layout-transition-duration="
        isTempleRoute ? TEMPLE_FOCUS_DURATION : undefined
      "
      :tinted="isTempleRoute"
      :particles-visible="particlesVisible"
      :celestial-visible="celestialVisible"
      :motion-active="motionActive"
      :particle-fps="40"
      :top-inset="visualStateStore.backgroundTopInset"
      :entry-active="
        simpleInitialEntrance ? navigation.entranceStarted : props.entryActive
      "
      :simple-entrance="simpleInitialEntrance"
    />
  </div>
</template>

<style>
.back-controller {
  width: 100%;
  height: 100%;
}
</style>
