<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  watch,
} from 'vue'

import LoadingPercentage from '@/components/LoadingPercentage/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

import { templeCategories, type TempleCategoryId } from './templeCategories'

const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const selected = ref<TempleCategoryId | null>(null)
const menuCategory = ref<TempleCategoryId | null>(null)
const settled = ref(false)
const preparationProgress = ref<number | null>(0)
const preparationVisible = ref(false)
const preparationFading = ref(false)
let progressFadeDelay: number | undefined
let progressFadeFallback: number | undefined
let resolveProgressFade: (() => void) | undefined
const finishProgressFade = () => {
  clearTimeout(progressFadeDelay)
  clearTimeout(progressFadeFallback)
  resolveProgressFade?.()
  resolveProgressFade = undefined
}
const completeProgress = () =>
  new Promise<void>((resolve) => {
    preparationProgress.value = 100
    resolveProgressFade = resolve
    progressFadeDelay = window.setTimeout(() => {
      preparationFading.value = true
    }, 140)
    progressFadeFallback = window.setTimeout(finishProgressFade, 1000)
  })
const category = computed(() =>
  templeCategories.find((item) => item.id === menuCategory.value)
)
const buttons = new Map<string, HTMLElement>()
let scene:
  | { select: (id: TempleCategoryId | null) => void; dispose: () => void }
  | undefined
let disposed = false
const routeEntryActive = inject<Ref<boolean>>('route-entry-active', ref(false))
let cancelRouteWait: (() => void) | undefined
let cancelOverlayWait: (() => void) | undefined
const waitForRouteTransition = () =>
  new Promise<void>((resolve) => {
    if (!routeEntryActive.value) return resolve()
    // 使用路由 after-enter 信号，避免依赖固定延迟或与页面缩放过渡重叠。
    const stop = watch(routeEntryActive, (active) => {
      if (!active) cancelRouteWait?.()
    })
    cancelRouteWait = () => {
      stop()
      cancelRouteWait = undefined
      resolve()
    }
  })
const waitForRouteEnter = async () => {
  await waitForRouteTransition()
  if (disposed) return
  if (document.querySelector('.entry-overlay-container')) {
    await new Promise<void>((resolve) => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.entry-overlay-container'))
          cancelOverlayWait?.()
      })
      observer.observe(document.body, { childList: true })
      cancelOverlayWait = () => {
        observer.disconnect()
        cancelOverlayWait = undefined
        resolve()
      }
    })
  }
  if (!disposed) preparationVisible.value = true
}

const dismissMenuBackground = (event: MouseEvent) => {
  if (
    event.target instanceof Element &&
    !event.target.closest('.temple-menu-item')
  )
    scene?.select(null)
}

const setButton = (id: string, element: unknown) => {
  if (element instanceof HTMLElement) buttons.set(id, element)
  else buttons.delete(id)
}

onMounted(async () => {
  document.body.classList.remove('island-pc-shell-leaving')
  document.body.classList.add('island-pc-shell')
  setSmoothScrollLocked('island-temple', true)
  if (
    !routeEntryActive.value &&
    !document.querySelector('.entry-overlay-container')
  )
    preparationVisible.value = true
  try {
    const { createIslandTemple } = await import('./islandTempleScene')
    if (disposed || !stage.value) return
    scene = createIslandTemple(stage.value, buttons, {
      waitForRouteEnter,
      completeProgress,
      progress: (value) => {
        preparationProgress.value = value
      },
      ready: () => {
        status.value = 'ready'
      },
      select: (id) => {
        selected.value = id
        settled.value = false
      },
      settled: () => {
        menuCategory.value = selected.value
        settled.value = true
      },
      error: (error) => {
        preparationProgress.value = null
        status.value = 'error'
        console.error('神殿场景加载失败', error)
      },
    })
  } catch (error) {
    if (!disposed) {
      preparationProgress.value = null
      status.value = 'error'
      console.error(error)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  cancelRouteWait?.()
  cancelOverlayWait?.()
  finishProgressFade()
  scene?.dispose()
})
onUnmounted(() => {
  document.body.classList.remove('island-pc-shell')
  setSmoothScrollLocked('island-temple', false)
})
</script>

<template>
  <main
    class="lucario-page temple-page no-rem"
    data-route-shell="island-pc"
    aria-label="个人海湾"
    :data-selected="selected || 'none'"
    :data-settled="settled"
  >
    <div
      ref="stage"
      class="lucario-stage temple-stage"
      :aria-busy="status === 'loading'"
    >
      <PageHeroTitle static color="var(--page-theme-color, #e23456)" />
    </div>
    <LoadingPercentage
      v-if="preparationVisible && preparationProgress !== null"
      class="temple-preparation-progress"
      :progress="preparationProgress"
      :animate="preparationProgress !== 100"
      :fading="preparationFading"
      aria-label="场景准备进度"
      @faded="finishProgressFade"
    />
    <div class="temple-obelisks">
      <button
        v-for="item in templeCategories"
        :key="item.id"
        :ref="(element) => setButton(item.id, element)"
        type="button"
        class="temple-obelisk"
        :data-obelisk="item.id"
        :aria-label="`${item.roman} / ${item.title}`"
        :aria-pressed="selected === item.id"
        :disabled="status !== 'ready'"
        @click="scene?.select(item.id)"
      />
    </div>
    <Transition name="temple-menu-reveal">
      <section
        v-if="category"
        class="temple-menu"
        :class="{ 'temple-menu--left': category.x > 0, 'is-visible': settled }"
        :aria-label="category.title"
        :inert="!settled || undefined"
        @click="dismissMenuBackground"
      >
        <header>
          <span>{{ category.roman }} /</span>
          <h1>{{ category.title }}</h1>
          <i />
        </header>
        <div class="temple-menu-cards">
          <RouterLink
            v-for="item in category.items"
            :key="item.title"
            :to="item.path"
            class="temple-menu-item"
            :tabindex="settled ? 0 : -1"
          >
            <img
              class="temple-menu-cover"
              :src="item.cover"
              alt=""
              width="760"
              height="480"
              loading="lazy"
              decoding="async"
              :style="
                item.title === '收藏品'
                  ? { objectPosition: 'center 26%' }
                  : undefined
              "
            />
            <span class="temple-menu-caption">
              <span class="temple-menu-copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.english }}</small>
              </span>
              <svg
                class="temple-menu-arrow"
                viewBox="0 0 12 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m3 4 6 6-6 6"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </span>
          </RouterLink>
        </div>
      </section>
    </Transition>
    <p v-if="status === 'error'" class="lucario-status" role="alert">
      模型加载失败，请刷新页面重试
    </p>
  </main>
</template>

<style lang="less" scoped src="./TempleHarbor.less" />
