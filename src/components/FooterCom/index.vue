<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ThemeToggle from '@/components/ThemeToggle/index.vue'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'
import { ensureLightThemeStyles } from '@/utils/themeStyles'

import './index.less'

interface BottomLineItem {
  title: string
  sort: string
  color: string
  date: string
  href: string
}

interface BottomLineData {
  intro: string
  lastUpdate: string
  recommand: BottomLineItem[]
}

const props = withDefaults(defineProps<{ entryActive?: boolean }>(), {
  entryActive: false,
})

const { locale, tm } = useI18n()
const router = useRouter()
const route = useRoute()
const visualStateStore = visualState()

const bottomLineData = computed(
  () => tm('bottomLine') as unknown as BottomLineData
)
const isInternalHref = (href: string) =>
  href.startsWith('/') && !href.startsWith('//')

const isMotionPaused = ref(false)
const footerExpanded = ref(false)
const marqueeTrack = ref<HTMLElement | null>(null)
const marqueeDuration = ref('24s')
const marqueeDistance = ref('0px')
let footerAnimationTimer: number | null = null
let marqueeFrame: number | null = null
let marqueeResizeObserver: ResizeObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null
let hasPlayedEntryAnimation = false
const isThemeSwitching = ref(false)
let themeSwitchTimer: number | null = null
const isDev = import.meta.env.DEV

onMounted(() => {
  nextTick(() => {
    scheduleMarqueeUpdate()
    if (marqueeTrack.value && 'ResizeObserver' in window) {
      marqueeResizeObserver = new ResizeObserver(scheduleMarqueeUpdate)
      marqueeResizeObserver.observe(marqueeTrack.value)
    }
  })
  if (props.entryActive) {
    nextTick(initFooterAnimation)
  }
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionState()
  document.addEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery.addEventListener('change', updateMotionState)
})

onUnmounted(() => {
  if (footerAnimationTimer !== null) {
    window.clearTimeout(footerAnimationTimer)
  }
  if (marqueeFrame !== null) window.cancelAnimationFrame(marqueeFrame)
  if (themeSwitchTimer !== null) window.clearTimeout(themeSwitchTimer)
  marqueeResizeObserver?.disconnect()
  marqueeResizeObserver = null
  document.removeEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery?.removeEventListener('change', updateMotionState)
})

const updateMotionState = () => {
  isMotionPaused.value =
    document.visibilityState === 'hidden' || !!reducedMotionQuery?.matches
}

const updateMarqueeDuration = () => {
  const contentWidth = (marqueeTrack.value?.scrollWidth ?? 0) / 2
  if (!contentWidth) return

  const duration = Math.min(52, Math.max(12, contentWidth / 46))
  marqueeDuration.value = `${duration.toFixed(2)}s`
  marqueeDistance.value = `${contentWidth}px`
}

const scheduleMarqueeUpdate = () => {
  if (marqueeFrame !== null) return

  marqueeFrame = window.requestAnimationFrame(() => {
    marqueeFrame = null
    updateMarqueeDuration()
  })
}

const initFooterAnimation = () => {
  if (hasPlayedEntryAnimation) return
  hasPlayedEntryAnimation = true
  footerExpanded.value = false

  footerAnimationTimer = window.setTimeout(() => {
    footerAnimationTimer = null
    footerExpanded.value = true
  }, 400)
}

const changeLanguage = (lang: SiteLocale) => {
  persistLocale(lang)
  locale.value = lang
}

const changeTheme = async (isDark: boolean) => {
  const newTheme = isDark ? 'dark' : 'light'
  if (newTheme === 'light') await ensureLightThemeStyles()

  if (route.path === '/') {
    isThemeSwitching.value = true
    themeSwitchTimer = window.setTimeout(() => {
      visualStateStore.setTheme(newTheme)
      isThemeSwitching.value = false
      themeSwitchTimer = null
    }, 150)
  } else {
    visualStateStore.setTheme(newTheme)
  }
}

const isDarkTheme = computed({
  get: () => visualStateStore.theme === 'dark',
  set: changeTheme,
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) {
      nextTick(initFooterAnimation)
    }
  }
)

watch(locale, () => nextTick(scheduleMarqueeUpdate))
</script>

<template>
  <div
    :class="{
      'footer-com': true,
      'footer-ready': props.entryActive,
      'footer-expanded': footerExpanded,
      'motion-paused': isMotionPaused,
    }"
    data-entry-footer-target
  >
    <div class="left">
      <button
        v-if="isDev"
        class="footer-test-entry"
        type="button"
        aria-label="打开开发测试页"
        @click="router.push('/test')"
      />
      <div class="language">
        <button
          type="button"
          class="el-button el-button--danger is-link chinese"
          :disabled="locale === 'zhCn'"
          @click="changeLanguage('zhCn')"
        >
          <span>汉语</span>
        </button>
        <button
          type="button"
          class="el-button el-button--danger is-link"
          disabled
        >
          <span>|</span>
        </button>
        <button
          type="button"
          class="el-button el-button--danger is-link"
          :disabled="locale === 'en'"
          @click="changeLanguage('en')"
        >
          <span>En</span>
        </button>
      </div>
    </div>

    <div class="center">
      <div class="expand">
        <div
          ref="marqueeTrack"
          class="marquee-wrap"
          :style="{
            '--footer-marquee-duration': marqueeDuration,
            '--footer-marquee-distance': marqueeDistance,
          }"
        >
          <div
            v-for="copy in 2"
            :key="copy"
            class="marquee-content"
            :aria-hidden="copy === 2 ? 'true' : undefined"
          >
            <span class="recommend">
              <component
                :is="isInternalHref(item.href) ? RouterLink : 'a'"
                v-for="(item, key) in bottomLineData.recommand"
                :key="`${copy}-${item.href}-${key}`"
                class="recommend-link"
                :to="isInternalHref(item.href) ? item.href : undefined"
                :href="isInternalHref(item.href) ? undefined : item.href"
                :tabindex="copy === 2 ? -1 : undefined"
              >
                「
                <span
                  :style="{
                    color: item.color || '#5F9DDD',
                    fontWeight: 600,
                  }"
                  >{{ item.title }}{{ item.sort ? `/${item.sort}` : '' }}</span
                >
                」
                <span class="recommend-date">{{ item.date }}</span>
                &nbsp;
              </component>
            </span>
            <b>{{ bottomLineData.intro }}</b>
          </div>
        </div>
      </div>
    </div>

    <div class="right">
      <button class="mark" type="button" @click="router.push('/')">
        LAST UPDATE： {{ bottomLineData.lastUpdate }}
      </button>
      <ThemeToggle
        v-model="isDarkTheme"
        :aria-label="
          isDarkTheme
            ? '切换为浅色主题 / Switch to light theme'
            : '切换为深色主题 / Switch to dark theme'
        "
      />
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="isThemeSwitching"
      class="theme-switch-overlay"
      aria-hidden="true"
    >
      <span />
    </div>
  </Teleport>
</template>
