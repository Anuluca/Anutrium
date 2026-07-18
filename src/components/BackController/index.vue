<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import BackStars from '@/components/BackStars/index.vue'
import { visualState } from '@/stores'

type ZodiacSignId =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'

const route = useRoute()
const visualStateStore = visualState()
const props = withDefaults(defineProps<{ entryActive?: boolean }>(), {
  entryActive: true,
})

const currentRouter = computed(() => route.path)

const isTextMenu = computed(() => currentRouter.value !== '/')
const useDeepBlackBackground = computed(
  () => route.meta.starBackground === 'deep-black'
)

const craftRouteNames = new Set([
  'CRAFT',
  'COLORPALETTE',
  'EASESTUDIO',
  'METRONOME',
  'BOUNCEDYNAMICS',
  'HTMLENTITIES',
  'BASE64CODEC',
  'IMAGEBASE64',
])

const activeSign = computed<ZodiacSignId>(() => {
  const routeName = String(route.name || '')
  const redirectedPath = route.redirectedFrom?.path || ''

  if (routeName === 'ARCHIVE') return 'gemini'
  if (routeName.startsWith('FLANERIE')) return 'sagittarius'
  if (
    routeName.startsWith('ISLAND') ||
    routeName === 'TEST' ||
    redirectedPath.startsWith('/island')
  ) {
    return 'pisces'
  }
  if (craftRouteNames.has(routeName)) return 'aquarius'
  if (routeName === 'ABOUT') return 'virgo'
  return 'leo'
})

const zodiacLayout = computed(() =>
  currentRouter.value === '/' ? visualStateStore.zodiacLayout : 'content'
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
      :entry-active="props.entryActive"
    />
  </div>
</template>

<style>
.back-controller {
  width: 100%;
  height: 100%;
}
</style>
