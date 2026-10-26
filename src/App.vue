<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { isTempleRouteName } from '@/config/templeNavigation'
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import MobileScreenFrame from '@/components/MobileScreenFrame/index.vue'
import LayoutBorderToggle from '@/components/LayoutBorderToggle/index.vue'
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
import { useRoute, useRouter } from 'vue-router'
import { visualState } from './stores'
import { useSiteLoading } from '@/stores/siteLoading'
import { useTempleNavigation } from '@/stores/templeNavigation'
import {
  getSeoMeta,
  syncPageTheme,
  syncSeoMeta,
  type SeoLocale,
} from '@/router'
import {
  installExternalLinkTracking,
  installGoogleAnalytics,
} from '@/utils/analytics'
import { startSmoothScroll, stopSmoothScroll } from '@/utils/smoothScroll'
import { scheduleTypekitLoad } from '@/utils/typekit'

const BackController = defineAsyncComponent(
  () => import('@/components/BackController/index.vue')
)
const CursorMove = defineAsyncComponent(
  () => import('@/components/CursorMove/index.vue')
)
const StartAnimation = defineAsyncComponent(
  () => import('@/components/StartAnimation/index.vue')
)
const MobileExperienceAlert = defineAsyncComponent(
  () => import('@/components/MobileExperienceAlert/index.vue')
)

const visualStateStore = visualState()
const route = useRoute()
const router = useRouter()
const { locale, tm } = useI18n()
let removeExternalLinkTracking: (() => void) | null = null
let removeGoogleAnalytics: (() => void) | null = null
let resizeRafId: number | null = null
let pageContentRemountTimer: number | null = null
let cancelScheduledTypekitLoad: (() => void) | null = null
const entryAnimationReady = ref(false)
const sceneEntryReady = ref(false)
const entryOverlayHidden = ref(false)
const footerTeleportReady = ref(false)
const pageContentActive = ref(true)
const isTempleRoute = computed(() => isTempleRouteName(route.name))
const templeNavigation = useTempleNavigation()
const footerWidthMode = computed(() =>
  isTempleRoute.value && templeNavigation.isInitialScene ? 'wide' : 'default'
)
const siteLoading = useSiteLoading()
watch(
  isTempleRoute,
  (home) => {
    if (typeof window === 'undefined') return
    if (home && !entryAnimationReady.value) siteLoading.beginTask('home-scene')
    else siteLoading.cancelTask('home-scene')
  },
  { immediate: true, flush: 'sync' }
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
  entryAnimationReady.value = true
  syncSmoothScrollForRoute()
  if (pageContentActive.value) return
  if (pageContentRemountTimer !== null) {
    window.clearTimeout(pageContentRemountTimer)
  }
  pageContentRemountTimer = window.setTimeout(() => {
    pageContentActive.value = true
    pageContentRemountTimer = null
  }, 900)
}

const syncSmoothScrollForRoute = () => {
  if (!entryAnimationReady.value) return
  if (route.path === '/test2') stopSmoothScroll()
  else startSmoothScroll()
}

const startAnimationHidden = () => {
  entryOverlayHidden.value = true
}

const unmountPageContent = () => {
  // 三维场景保留首次挂载，避免开场结束后重播入场。
  if (isTempleRoute.value) return
  pageContentActive.value = false
}

onMounted(async () => {
  removeGoogleAnalytics = installGoogleAnalytics(router)
  // SSR 保留页脚节点，客户端挂载后再移至 body，避开移动端页面容器的层叠上下文。
  footerTeleportReady.value = true
  setRootFontSize()
  window.addEventListener('resize', scheduleRootFontSizeUpdate, {
    passive: true,
  })
  const savedTheme = localStorage.getItem('theme')
  await visualStateStore.setTheme(savedTheme === 'light' ? 'light' : 'dark')
  syncSeoMeta(route)
  const navigation = useTempleNavigation()
  syncPageTheme(
    route,
    isTempleRoute.value
      ? navigation.companionFocused
        ? 'SPRIGATITO'
        : (navigation.activeModule || navigation.entryModule)?.toUpperCase()
      : undefined
  )
  removeExternalLinkTracking = installExternalLinkTracking()
  cancelScheduledTypekitLoad = scheduleTypekitLoad()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRootFontSizeUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  if (pageContentRemountTimer !== null) {
    window.clearTimeout(pageContentRemountTimer)
  }
  cancelScheduledTypekitLoad?.()
  removeExternalLinkTracking?.()
  removeGoogleAnalytics?.()
  stopSmoothScroll()
})

watch(
  () => route.path,
  (path) => {
    if (path === '/test2') stopSmoothScroll()
  }
)
</script>

<template>
  <CursorMove />
  <StartAnimation
    @finished="startAnimationFinished"
    @scene-ready="sceneEntryReady = true"
    @hidden="startAnimationHidden"
    @progress-complete="unmountPageContent"
  />
  <layout
    :entry-active="entryAnimationReady"
    :scene-entry-active="sceneEntryReady"
    :content-active="pageContentActive"
    @route-transition-complete="syncSmoothScrollForRoute"
  />
  <div
    class="footer-bottom-gradient"
    :class="{ 'footer-bottom-gradient--ready': entryAnimationReady }"
    aria-hidden="true"
  />
  <Teleport to="body" :disabled="!footerTeleportReady">
    <FooterCom
      :width-mode="footerWidthMode"
      :motion-active="!isTempleRoute || !templeNavigation.immersive"
      :entry-active="isTempleRoute ? sceneEntryReady : entryAnimationReady"
      :entry-overlay-active="!entryOverlayHidden"
    />
    <LayoutBorderToggle />
  </Teleport>
  <BackController :entry-active="entryAnimationReady" />
  <MobileExperienceAlert v-if="entryOverlayHidden" />
  <MobileScreenFrame v-if="!isTempleRoute" />
</template>

<style scoped lang="less">
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
</style>
