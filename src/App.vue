<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useHead } from '@vueuse/head'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { visualState } from './stores'
import {
  getSeoMeta,
  syncPageTheme,
  syncSeoMeta,
  type SeoLocale,
} from '@/router'
import { installExternalLinkTracking } from '@/utils/analytics'
import { startSmoothScroll, stopSmoothScroll } from '@/utils/smoothScroll'
import { ensureLightThemeStyles } from '@/utils/themeStyles'
import { scheduleTypekitLoad } from '@/utils/typekit'

const BackController = defineAsyncComponent(
  () => import('@/components/BackController/index.vue')
)
const CursorMove = defineAsyncComponent(
  () => import('@/components/CursorMove/index.vue')
)
const PetTeaserLink = defineAsyncComponent(
  () => import('@/components/PetTeaserLink.vue')
)
const StartAnimation = defineAsyncComponent(
  () => import('@/components/StartAnimation/index.vue')
)
const MobileExperienceAlert = defineAsyncComponent(
  () => import('@/components/MobileExperienceAlert/index.vue')
)

const visualStateStore = visualState()
const route = useRoute()
const { locale, tm } = useI18n()
let removeExternalLinkTracking: (() => void) | null = null
let resizeRafId: number | null = null
let entryAnimationTimer: number | null = null
let cancelScheduledTypekitLoad: (() => void) | null = null
const entryAnimationReady = ref(false)
const entryOverlayHidden = ref(false)
const petTeaserHiddenPaths = new Set(['/pet', '/404', '/island', '/test'])
const shouldShowPetTeaser = computed(
  () => !petTeaserHiddenPaths.has(route.path)
)

interface VlogSeoItem {
  id: string
  title: string
}

const seoMeta = computed(() => {
  const siteLocale: SeoLocale = locale.value === 'en' ? 'en' : 'zhCn'
  const vlogs =
    typeof route.params.vlogId === 'string'
      ? (tm('flanerie.dynamic.vlogs') as VlogSeoItem[])
      : []

  return getSeoMeta(route, siteLocale, Array.isArray(vlogs) ? vlogs : [])
})

useHead(
  computed(() => ({
    title: seoMeta.value.title,
    htmlAttrs: {
      lang: seoMeta.value.lang,
    },
    link: [
      {
        rel: 'canonical',
        href: seoMeta.value.canonicalUrl,
      },
    ],
    meta: [
      {
        name: 'description',
        content: seoMeta.value.description,
      },
      {
        property: 'og:title',
        content: seoMeta.value.title,
      },
      {
        property: 'og:description',
        content: seoMeta.value.description,
      },
      {
        property: 'og:url',
        content: seoMeta.value.canonicalUrl,
      },
      {
        property: 'og:locale',
        content: seoMeta.value.openGraphLocale,
      },
      {
        name: 'twitter:title',
        content: seoMeta.value.title,
      },
      {
        name: 'twitter:description',
        content: seoMeta.value.description,
      },
    ],
  }))
)

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

const startAnimationFinished = () => {
  if (entryAnimationTimer !== null) {
    window.clearTimeout(entryAnimationTimer)
  }

  entryAnimationTimer = window.setTimeout(() => {
    entryAnimationReady.value = true
    syncSmoothScrollForRoute()
    entryAnimationTimer = null
  }, 250)
}

const syncSmoothScrollForRoute = () => {
  if (!entryAnimationReady.value) return
  if (route.path === '/') stopSmoothScroll()
  else startSmoothScroll()
}

const startAnimationHidden = () => {
  entryOverlayHidden.value = true
}

onMounted(async () => {
  setRootFontSize()
  window.addEventListener('resize', scheduleRootFontSizeUpdate, {
    passive: true,
  })
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'light') await ensureLightThemeStyles()
  visualStateStore.setTheme(savedTheme === 'light' ? 'light' : 'dark')
  syncSeoMeta(route)
  syncPageTheme(route)
  removeExternalLinkTracking = installExternalLinkTracking()
  cancelScheduledTypekitLoad = scheduleTypekitLoad()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRootFontSizeUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  if (entryAnimationTimer !== null) window.clearTimeout(entryAnimationTimer)
  cancelScheduledTypekitLoad?.()
  removeExternalLinkTracking?.()
  stopSmoothScroll()
})

watch(
  () => route.path,
  (path) => {
    if (path === '/') stopSmoothScroll()
  }
)
</script>

<template>
  <CursorMove />
  <StartAnimation
    @finished="startAnimationFinished"
    @hidden="startAnimationHidden"
  />
  <layout
    :entry-active="entryAnimationReady"
    @route-transition-complete="syncSmoothScrollForRoute"
  />
  <PetTeaserLink
    v-if="shouldShowPetTeaser"
    :entry-active="entryAnimationReady"
  />
  <div
    class="footer-bottom-gradient"
    :class="{ 'footer-bottom-gradient--ready': entryAnimationReady }"
    aria-hidden="true"
  />
  <FooterCom :entry-active="entryAnimationReady" />
  <BackController :entry-active="entryAnimationReady" />
  <MobileExperienceAlert v-if="entryOverlayHidden" />
  <div class="mobile-screen-frame" aria-hidden="true" />
</template>

<style scoped lang="less">
.mobile-screen-frame {
  display: none;
}

.footer-bottom-gradient {
  position: fixed;
  right: 0;
  bottom: -60px;
  left: 0;
  z-index: 99;
  height: 120px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.32) 100%
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;

  &--ready {
    opacity: 1;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .footer-bottom-gradient {
    display: none;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .mobile-screen-frame {
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: block;
    border-color: var(--mobile-screen-frame-color);
    border-style: solid;
    border-width: var(--mobile-screen-frame-size)
      var(--mobile-screen-frame-inline-size);
    box-sizing: border-box;
    box-shadow: inset 0 0 20px rgb(0 0 0 / 40%);
    pointer-events: none;
  }
}
</style>
