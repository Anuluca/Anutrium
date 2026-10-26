<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ThemeToggle from '@/components/ThemeToggle/index.vue'
import { useMotionActivity } from '@/composables/useMotionActivity'
import { visualState } from '@/stores'
import { getCardMobileThumbnailUrl } from '@/utils/imageVariant'
import { persistLocale, type SiteLocale } from '@/utils/locale'

import './index.less'

interface BottomLineItem {
  title: string
  sort: string
  color: string
  date: string
  href: string
  img?: string
}

interface BottomLineData {
  intro: string
  lastUpdate: string
  rants: string[]
  recommand: BottomLineItem[]
}

const props = withDefaults(
  defineProps<{
    entryActive?: boolean
    entryOverlayActive?: boolean
    widthMode?: 'default' | 'wide'
    motionActive?: boolean
  }>(),
  {
    entryActive: false,
    entryOverlayActive: false,
    widthMode: 'default',
    motionActive: true,
  }
)

const { locale, tm } = useI18n()
const router = useRouter()
const route = useRoute()
const visualStateStore = visualState()

const bottomLineData = computed(
  () => tm('bottomLine') as unknown as BottomLineData
)
const rantIndex = ref(0)
const selectRandomRant = () => {
  rantIndex.value = Math.floor(
    Math.random() * bottomLineData.value.rants.length
  )
}
const isInternalHref = (href: string) =>
  href.startsWith('/') && !href.startsWith('//')

const { reducedMotion, motionAllowed } = useMotionActivity()
const isMotionPaused = computed(
  () => !motionAllowed.value || !props.motionActive || footerResizing.value
)
const footerReady = ref(false)
const footerExpanded = ref(false)
const footerElement = ref<HTMLElement | null>(null)
const footerContent = ref<HTMLElement | null>(null)
const footerResizing = ref(false)
let footerGeometry: DOMRect | undefined
let footerGeometryObserver: ResizeObserver | null = null
let footerGeometryAnimations: Animation[] = []
const cancelFooterGeometryAnimation = () => {
  footerGeometryAnimations.forEach((animation) => animation.cancel())
  footerGeometryAnimations = []
  footerResizing.value = false
}
const updateFooterGeometry = (previousGeometry?: DOMRect) => {
  const element = footerElement.value
  const content = footerContent.value
  if (!element || !content) return
  const before =
    previousGeometry ??
    (footerGeometryAnimations.length
      ? element.getBoundingClientRect()
      : footerGeometry)
  cancelFooterGeometryAnimation()
  const after = element.getBoundingClientRect()
  footerGeometry = after
  if (
    !before ||
    !before.width ||
    !before.height ||
    reducedMotion.value === 'reduce'
  )
    return
  const scaleX = before.width / after.width
  const scaleY = before.height / after.height
  const x = before.left - after.left
  const y = before.bottom - after.bottom
  if (
    Math.abs(x) + Math.abs(y) + Math.abs(scaleX - 1) + Math.abs(scaleY - 1) <
    0.001
  )
    return
  // 最终盒尺寸只切换一次；外层 FLIP，内容反向缩放，文字和按钮不随边界拉伸。
  const options: KeyframeAnimationOptions = {
    duration: 500,
    easing: 'ease',
    fill: 'both',
  }
  footerResizing.value = true
  const animations = [
    element.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})` },
        { transform: 'none' },
      ],
      options
    ),
    content.animate(
      Array.from({ length: 33 }, (_, index) => {
        const offset = index / 32
        return {
          offset,
          transform: `scale(${1 / (scaleX + (1 - scaleX) * offset)}, ${
            1 / (scaleY + (1 - scaleY) * offset)
          })`,
        }
      }),
      options
    ),
  ]
  footerGeometryAnimations = animations
  void Promise.all(animations.map((animation) => animation.finished))
    .then(() => {
      if (footerGeometryAnimations === animations)
        cancelFooterGeometryAnimation()
    })
    .catch(() => undefined)
}

let previousWidthModeGeometry: DOMRect | undefined
watch(
  () => props.widthMode,
  () => {
    previousWidthModeGeometry = footerElement.value?.getBoundingClientRect()
    cancelFooterGeometryAnimation()
  },
  { flush: 'pre' }
)
watch(
  () => props.widthMode,
  () => {
    // DOM 更新后、浏览器绘制前应用反向变换，避免先显示终点再跳回起点。
    updateFooterGeometry(previousWidthModeGeometry)
    previousWidthModeGeometry = undefined
  },
  { flush: 'post' }
)
const marqueeTrack = ref<HTMLElement | null>(null)
const marqueeViewport = ref<HTMLElement | null>(null)
const marqueeCopies = ref(2)
const marqueeDuration = ref('24s')
const marqueeDistance = ref('0px')
let marqueeFrame: number | null = null
let marqueeResizeObserver: ResizeObserver | null = null
let hasPlayedEntryAnimation = false
const FOOTER_ENTRY_DELAY = 800
let footerEntryTimer: number | null = null
const isDev = import.meta.env.DEV
const preview = ref<{ src: string; left: number; bottom: number } | null>(null)
let previewQuery: MediaQueryList | null = null
let previewAnchor: HTMLElement | null = null
let previewRequest = 0

const hidePreview = () => {
  previewRequest += 1
  previewAnchor = null
  preview.value = null
}

const showPreview = async (event: Event, item: BottomLineItem) => {
  if (
    !previewQuery?.matches ||
    window.innerWidth <= window.innerHeight ||
    !item.img
  )
    return
  const anchor = event.currentTarget as HTMLElement
  const request = ++previewRequest
  previewAnchor = anchor
  const src = getCardMobileThumbnailUrl(item.img)
  // 等缩略图加载后再闪烁；快速切换条目时丢弃旧请求，避免显示上一张图片。
  const image = new Image()
  image.src = src
  try {
    await image.decode()
  } catch {
    if (request === previewRequest) hidePreview()
    return
  }
  if (request !== previewRequest || previewAnchor !== anchor) return
  const bounds = anchor.getBoundingClientRect()
  const footer = anchor.closest('.footer-com')!.getBoundingClientRect()
  const halfWidth = 90
  const center = Math.max(
    halfWidth + 8,
    Math.min(window.innerWidth - halfWidth - 8, bounds.left + bounds.width / 2)
  )
  preview.value = {
    src,
    left: center - footer.left,
    bottom: footer.bottom - bounds.top + 10,
  }
}

const leavePreview = (event: Event) => {
  if (previewAnchor === event.currentTarget) hidePreview()
}

onMounted(() => {
  previewQuery = window.matchMedia(
    '(min-aspect-ratio: 1/1) and (hover: hover) and (pointer: fine)'
  )
  previewQuery.addEventListener('change', hidePreview)
  window.addEventListener('resize', hidePreview)
  selectRandomRant()
  nextTick(() => {
    footerGeometry = footerElement.value?.getBoundingClientRect()
    if (footerElement.value && 'ResizeObserver' in window) {
      footerGeometryObserver = new ResizeObserver(([entry]) => {
        const size = entry.borderBoxSize[0]
        if (
          size &&
          footerGeometry &&
          Math.abs(size.inlineSize - footerGeometry.width) < 0.1 &&
          Math.abs(size.blockSize - footerGeometry.height) < 0.1
        )
          return
        updateFooterGeometry()
      })
      footerGeometryObserver.observe(footerElement.value)
    }
    scheduleMarqueeUpdate()
    if (marqueeTrack.value && 'ResizeObserver' in window) {
      marqueeResizeObserver = new ResizeObserver(scheduleMarqueeUpdate)
      const content = marqueeTrack.value.firstElementChild
      if (content) marqueeResizeObserver.observe(content)
      if (marqueeViewport.value)
        marqueeResizeObserver.observe(marqueeViewport.value)
    }
  })
  if (props.entryActive) {
    initFooterAnimation()
  }
})

onUnmounted(() => {
  footerGeometryObserver?.disconnect()
  cancelFooterGeometryAnimation()
  hidePreview()
  previewQuery?.removeEventListener('change', hidePreview)
  window.removeEventListener('resize', hidePreview)
  if (marqueeFrame !== null) window.cancelAnimationFrame(marqueeFrame)
  if (footerEntryTimer !== null) window.clearTimeout(footerEntryTimer)
  marqueeResizeObserver?.disconnect()
  marqueeResizeObserver = null
})

const updateMarqueeDuration = () => {
  const contentWidth =
    marqueeTrack.value?.firstElementChild?.getBoundingClientRect().width ?? 0
  if (!contentWidth) return

  const viewportWidth =
    marqueeViewport.value?.getBoundingClientRect().width ?? 0
  // 移出完整一轮后，剩余副本仍须覆盖可见区域；单轮宽度保留小数，避免循环接缝抖动。
  marqueeCopies.value = Math.max(2, Math.ceil(viewportWidth / contentWidth) + 1)

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
  footerEntryTimer = window.setTimeout(() => {
    footerEntryTimer = null
    footerReady.value = true
    footerExpanded.value = true
  }, FOOTER_ENTRY_DELAY)
}

const changeLanguage = (lang: SiteLocale) => {
  persistLocale(lang)
  locale.value = lang
}

const isDarkTheme = computed({
  get: () => visualStateStore.theme === 'dark',
  set: (isDark: boolean) => {
    void visualStateStore.setTheme(isDark ? 'dark' : 'light')
  },
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) {
      initFooterAnimation()
    }
  },
  { flush: 'sync' }
)

watch(locale, () => {
  hidePreview()
  nextTick(scheduleMarqueeUpdate)
})
watch(() => route.fullPath, hidePreview)
</script>

<template>
  <div
    ref="footerElement"
    :class="{
      'footer-com': true,
      'footer-wide': props.widthMode === 'wide',
      'footer-ready': footerReady,
      'footer-above-entry-overlay': props.entryOverlayActive,
      'footer-expanded': footerExpanded,
      'motion-paused': isMotionPaused,
      'footer-resizing': footerResizing,
    }"
    data-entry-footer-target
  >
    <div ref="footerContent" class="footer-content">
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
            <span>中文</span>
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
            class="el-button el-button--danger is-link english"
            :disabled="locale === 'en'"
            @click="changeLanguage('en')"
          >
            <span>En</span>
          </button>
        </div>
      </div>

      <div ref="marqueeViewport" class="center">
        <div class="expand">
          <div class="footer-reveal-track">
            <div
              ref="marqueeTrack"
              class="marquee-wrap"
              :style="{
                '--footer-marquee-duration': marqueeDuration,
                '--footer-marquee-distance': marqueeDistance,
              }"
              @animationiteration.self="selectRandomRant"
            >
              <div
                v-for="copy in marqueeCopies"
                :key="copy"
                class="marquee-content"
                :aria-hidden="copy > 1 ? 'true' : undefined"
              >
                <span class="recommend">
                  <component
                    :is="isInternalHref(item.href) ? RouterLink : 'a'"
                    v-for="(item, key) in bottomLineData.recommand"
                    :key="`${copy}-${item.href}-${key}`"
                    class="recommend-link"
                    :to="isInternalHref(item.href) ? item.href : undefined"
                    :href="isInternalHref(item.href) ? undefined : item.href"
                    :tabindex="copy > 1 ? -1 : undefined"
                    @mouseenter="showPreview($event, item)"
                    @mouseleave="leavePreview"
                    @focus="showPreview($event, item)"
                    @blur="leavePreview"
                  >
                    <span class="recommend-title"
                      >{{ item.title
                      }}{{ item.sort ? `/${item.sort}` : '' }}</span
                    >
                    <span class="recommend-date">{{ item.date }}</span>
                  </component>
                  <!-- 所有候选文案占用同一网格，保留最长宽度，随机换句时不改变循环距离。 -->
                  <span class="recommend-rant">
                    <span
                      v-for="(rant, index) in bottomLineData.rants"
                      :key="index"
                      class="recommend-title"
                      :class="{ 'rant-inactive': index !== rantIndex }"
                      :aria-hidden="index !== rantIndex ? 'true' : undefined"
                      >{{ rant }}</span
                    >
                  </span>
                </span>
              </div>
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
    <Transition name="footer-thumbnail">
      <div
        v-if="preview"
        :key="preview.src"
        class="footer-thumbnail"
        :style="{ left: `${preview.left}px`, bottom: `${preview.bottom}px` }"
        aria-hidden="true"
      >
        <div class="footer-thumbnail-screen">
          <img :src="preview.src" alt="" />
        </div>
      </div>
    </Transition>
  </div>
</template>
