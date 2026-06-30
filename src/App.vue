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
} from 'vue'
import { useHead } from '@vueuse/head'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { visualState } from './stores'
import { getSeoMeta, syncSeoMeta, type SeoLocale } from '@/router'
import { installExternalLinkTracking } from '@/utils/analytics'

const BackController = defineAsyncComponent(
  () => import('@/components/BackController/index.vue')
)
const CursorMove = defineAsyncComponent(
  () => import('@/components/CursorMove/index.vue')
)
const StartAnimation = defineAsyncComponent(
  () => import('@/components/StartAnimation/index.vue')
)

const visualStateStore = visualState()
const route = useRoute()
const { locale, tm } = useI18n()
let removeExternalLinkTracking: (() => void) | null = null
let resizeRafId: number | null = null
let entryAnimationTimer: number | null = null
const entryAnimationReady = ref(false)
const entryAnimationRenderKey = computed(() =>
  entryAnimationReady.value ? 'entry-ready' : 'entry-pending'
)

interface VlogSeoItem {
  id: string
  title: string
}

const seoMeta = computed(() => {
  const siteLocale: SeoLocale = locale.value === 'en' ? 'en' : 'zhCn'
  const vlogs = tm('flanerie.dynamic.vlogs') as VlogSeoItem[]

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
    entryAnimationTimer = null
  }, 250)
}

onMounted(() => {
  setRootFontSize()
  window.addEventListener('resize', scheduleRootFontSizeUpdate, {
    passive: true,
  })
  visualStateStore.setTheme(localStorage.getItem('theme') || 'dark')
  syncSeoMeta(route)
  removeExternalLinkTracking = installExternalLinkTracking()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRootFontSizeUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  if (entryAnimationTimer !== null) window.clearTimeout(entryAnimationTimer)
  removeExternalLinkTracking?.()
})
</script>

<template>
  <CursorMove />
  <StartAnimation @finished="startAnimationFinished" />
  <layout
    :key="`layout-${entryAnimationRenderKey}`"
    :entry-active="entryAnimationReady"
  />
  <div
    class="footer-bottom-gradient"
    :class="{ 'footer-bottom-gradient--ready': entryAnimationReady }"
    aria-hidden="true"
  />
  <FooterCom
    :key="`footer-${entryAnimationRenderKey}`"
    :entry-active="entryAnimationReady"
  />
  <BackController />
</template>

<style scoped lang="less">
.footer-bottom-gradient {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 99;
  height: 64px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.62) 100%
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
