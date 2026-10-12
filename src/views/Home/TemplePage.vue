<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  type Ref,
  ref,
  watch,
} from 'vue'
import { useRoute } from 'vue-router'

import { decorationActivityKey } from '@/composables/useDecorationActivity'
import { pageThemeColors } from '@/config/pageThemes'
import { templeExperience } from '@/config/templeExperience'
import {
  templeCategories,
  templeCategoryById,
  type TempleCategoryId,
} from '@/config/templeNavigation'
import { useSiteLoading } from '@/stores/siteLoading'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { hasJourneyReturnState } from '@/utils/journeyReturnState'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'
import AboutOverlay from '@/views/About/AboutOverlay.vue'

import FloraFocusLayout from './components/FloraFocusLayout.vue'
import FocusContent from './components/FocusContent.vue'
import TempleBackdrop from './components/TempleBackdrop.vue'
import TempleClock from './components/TempleClock.vue'
import { loadTempleFocusContent } from './focusContentLoader'
import type { TemplePresentation } from './templePresentation'
import type { createHomeTemple, TempleSelection } from './templeScene'

const props = defineProps<{ presentation: TemplePresentation }>()
const route = useRoute()
const navigation = useTempleNavigation()
provide(
  decorationActivityKey,
  computed(() => !navigation.aboutOpen)
)
const siteLoading = useSiteLoading()
let loadingTask: ReturnType<typeof siteLoading.beginTask> | undefined
const config = props.presentation
const shell = config.routeShell
const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const entranceFinished = ref(false)
const selected = ref<TempleSelection | null>(null)
const clockVisible = computed(
  () =>
    entranceFinished.value &&
    (!selected.value || selected.value === 'statue') &&
    !navigation.aboutOpen
)
const menuCategory = ref<TempleCategoryId | null>(null)
const settled = ref(false)
const menuContentReady = ref(false)
const menuRevealed = ref(false)
let menuRevealFrame: number | undefined
const cancelMenuReveal = () => {
  if (menuRevealFrame !== undefined) cancelAnimationFrame(menuRevealFrame)
  menuRevealFrame = undefined
  menuRevealed.value = false
}
watch(
  menuCategory,
  () => {
    cancelMenuReveal()
    menuContentReady.value = false
  },
  { flush: 'sync' }
)
watch(
  [settled, menuContentReady],
  ([stable, ready]) => {
    cancelMenuReveal()
    if (!stable || !ready) return
    // 内容先以透明起始态完成一帧绘制，下一帧再切换，缓存命中时也能完整过渡。
    menuRevealFrame = requestAnimationFrame(() => {
      menuRevealFrame = requestAnimationFrame(() => {
        menuRevealFrame = undefined
        menuRevealed.value = true
      })
    })
  },
  { flush: 'post' }
)
const onMenuContentLoading = (id: TempleCategoryId) => {
  if (menuCategory.value === id) menuContentReady.value = false
}
const onMenuContentReady = (id: TempleCategoryId) => {
  if (menuCategory.value === id) menuContentReady.value = true
}
const menu = ref<HTMLElement | null>(null)
const workDetailTarget = ref<HTMLElement | null>(null)
const focusContent = ref<InstanceType<typeof FocusContent> | null>(null)
const finishMenuReveal = (event: TransitionEvent) => {
  // transform 不触发 ResizeObserver；入场结束后只测量一次，修正固定滚动进度条的位置。
  if (event.propertyName === 'transform' && menuRevealed.value)
    focusContent.value?.refreshGeometry()
}
let resolveMenuExit: (() => void) | undefined
let menuExitElement: HTMLElement | undefined
const finishMenuExit = (element?: Element) => {
  if (element && element !== menuExitElement) return
  const resolve = resolveMenuExit
  resolveMenuExit = undefined
  menuExitElement = undefined
  resolve?.()
}
const resizing = ref(false)
let resizeRevision = 0
const resizeAnimations = new Set<Animation>()
const cancelResize = () => {
  resizeRevision++
  resizeAnimations.forEach((animation) => animation.cancel())
  resizeAnimations.clear()
  resizing.value = false
}
const animateResize = async (
  element: HTMLElement,
  frames: Keyframe[],
  duration: number
) => {
  const animation = element.animate(frames, {
    duration,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: 'both',
  })
  resizeAnimations.add(animation)
  await animation.finished
  return animation
}
const toggleExpanded = async () => {
  if (config.menu.layout === 'fullscreen' || resizing.value || !menu.value)
    return
  const revision = ++resizeRevision
  resizing.value = true
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const pane = menu.value
  const scroll = pane.querySelector<HTMLElement>('.scroll-viewport__scroll')!
  const scrollTop = scroll.scrollTop
  const expanding = !navigation.expanded
  const before = pane.getBoundingClientRect()
  try {
    navigation.expanded = expanding
    await nextTick()
    if (revision !== resizeRevision) return
    const after = pane.getBoundingClientRect()
    scroll.scrollTop = scrollTop
    const scale = before.width / after.width
    const offset = before.x - after.x
    const body = pane.querySelector<HTMLElement>('.temple-menu__body')!
    // FLIP：只在切换时重排一次。外层变换边界，内层反向缩放保持文字比例。
    await Promise.all([
      animateResize(
        pane,
        [
          { transform: `translateX(${offset}px) scaleX(${scale})` },
          { transform: 'none' },
        ],
        reduced ? 1 : 1200
      ),
      animateResize(
        body,
        Array.from({ length: 33 }, (_, index) => {
          const offset = index / 32
          return {
            offset,
            transform: `scaleX(${1 / (scale + (1 - scale) * offset)})`,
          }
        }),
        reduced ? 1 : 1200
      ),
    ])
    if (revision !== resizeRevision) return
    resizeAnimations.forEach((animation) => animation.cancel())
    resizeAnimations.clear()
    scroll.scrollTop = scrollTop
    focusContent.value?.refreshGeometry()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError'))
      throw error
  } finally {
    if (revision === resizeRevision) resizing.value = false
  }
}
const category = computed(() =>
  menuCategory.value ? templeCategoryById.get(menuCategory.value) : undefined
)
const buttons = new Map<string, HTMLElement>()
let scene: ReturnType<typeof createHomeTemple> | undefined
const sceneActive = computed(
  () => !navigation.aboutOpen && (!navigation.expanded || resizing.value)
)
watch(sceneActive, (active) => scene?.setActive(active), { flush: 'post' })
let disposed = false
const routeEntryActive = inject<Ref<boolean>>('route-entry-active', ref(false))
const siteEntryActive = inject<Ref<boolean>>(
  'site-scene-entry-active',
  ref(true)
)
let cancelRouteWait: (() => void) | undefined
let cancelEntryWait: (() => void) | undefined
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
  if (!siteEntryActive.value) {
    await new Promise<void>((resolve) => {
      // 加载线开始渐隐时开放模型入场，让初始地平线接续加载线。
      const stop = watch(siteEntryActive, (active) => {
        if (active) cancelEntryWait?.()
      })
      cancelEntryWait = () => {
        stop()
        cancelEntryWait = undefined
        resolve()
      }
    })
  }
  if (!disposed && !siteLoading.presentationReady) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => siteLoading.presentationReady,
        (ready) => {
          if (ready) cancelEntryWait?.()
        }
      )
      cancelEntryWait = () => {
        stop()
        cancelEntryWait = undefined
        resolve()
      }
    })
  }
}

// 空白点击优先收起侧栏详情，第二次点击才退出作品集聚焦。
const closeInlineDetail = () =>
  config.id === 'desktop' &&
  navigation.selected === 'archive' &&
  !navigation.expanded &&
  !navigation.aboutOpen &&
  (focusContent.value?.closeInlineDetail() ?? false)

const dismissMenuBackground = (event: MouseEvent) => {
  if (!settled.value || resizing.value || navigation.aboutOpen) return
  const target = event.target
  // 只响应布局容器本身的空白，避免卡片、文字和按钮点击触发返回。
  if (
    target instanceof HTMLElement &&
    target.matches(
      '.temple-menu, .temple-menu__body, .temple-focus-content, ' +
        '.scroll-viewport__scroll, .scroll-viewport__scroll > div, ' +
        '.archive-content, .journey-content, .works-section, .misc-section, ' +
        '.vlog-section, .works-grid, .misc-grid, .vlog-grid, .vlog-groups, .vlog-group'
    )
  ) {
    if (!closeInlineDetail()) scene?.select(null)
  }
}

const setButton = (id: string, element: unknown) => {
  if (element instanceof HTMLElement) buttons.set(id, element)
  else buttons.delete(id)
}

watch(
  () => navigation.revision,
  () => {
    if (navigation.ready) scene?.select(navigation.requested)
  }
)
watch(selected, () => {
  const themeCategory = navigation.selected
  scene?.setThemeColor(
    selected.value === 'sprigatito'
      ? pageThemeColors.SPRIGATITO
      : (themeCategory && templeCategoryById.get(themeCategory)?.themeColor) ||
          templeExperience.themeColor
  )
})

onMounted(async () => {
  navigation.setInlineDetailCloser(closeInlineDetail)
  document.body.classList.remove(`${shell}-shell-leaving`)
  document.body.classList.add(`${shell}-shell`)
  setSmoothScrollLocked('island-temple', true)
  // 全局地平线加载仅属于首次入场；站内返回沿用路由过渡。
  if (!siteEntryActive.value) loadingTask = siteLoading.beginTask('home-scene')
  try {
    const { createHomeTemple } = await import('./templeScene')
    if (disposed || !stage.value) return
    scene = createHomeTemple(
      stage.value,
      buttons,
      {
        waitForRouteEnter,
        dismissBackground: closeInlineDetail,
        prepared: () => loadingTask?.finish(),
        progress: (value) => loadingTask?.update(value),
        ready: () => {
          status.value = 'ready'
          navigation.ready = true
          const initialModule =
            (navigation.revision
              ? navigation.requested
              : navigation.entryModule || route.query.module) ??
            (hasJourneyReturnState() ? 'flanerie' : undefined)
          if (
            initialModule === 'statue' ||
            initialModule === 'sprigatito' ||
            templeCategories.some(
              (item) => item.id === initialModule && item.enabled
            )
          )
            scene?.select(
              initialModule as TempleSelection,
              navigation.simpleEntrance
            )
          if (initialModule === navigation.returnModule)
            navigation.expanded = navigation.returnExpanded
        },
        entranceComplete: () => {
          entranceFinished.value = true
        },
        beforeReturn: () => {
          if (!menuCategory.value || !menu.value) return
          const element = menu.value
          cancelResize()
          menuExitElement = element
          settled.value = false
          void nextTick(() => {
            if (menuExitElement === element) menuCategory.value = null
          })
          return new Promise<void>((resolve) => {
            resolveMenuExit = resolve
          })
        },
        select: (id) => {
          finishMenuExit()
          cancelResize()
          selected.value = id
          navigation.selected =
            id === 'statue' || id === 'sprigatito' ? null : id
          navigation.companionFocused = id === 'sprigatito'
          navigation.statueFocused = id === 'statue'
          navigation.expanded = false
          settled.value = false
          if (id && id !== 'statue' && id !== 'sprigatito')
            void loadTempleFocusContent(id).catch(() => {})
          if (id === 'statue' || id === 'sprigatito') menuCategory.value = null
        },
        settled: () => {
          if (resolveMenuExit) return
          menuCategory.value =
            selected.value === 'statue' || selected.value === 'sprigatito'
              ? null
              : selected.value
          settled.value = true
        },
        error: (error) => {
          loadingTask?.finish('error')
          status.value = 'error'
          console.error('神殿场景加载失败', error)
        },
      },
      config,
      templeExperience,
      navigation.simpleEntrance || hasJourneyReturnState()
    )
    scene.setActive(sceneActive.value)
  } catch (error) {
    if (!disposed) {
      loadingTask?.finish('error')
      status.value = 'error'
      console.error(error)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  cancelMenuReveal()
  cancelResize()
  navigation.reset()
  cancelRouteWait?.()
  cancelEntryWait?.()
  loadingTask?.finish('cancelled')
  scene?.dispose()
  finishMenuExit()
})
onUnmounted(() => {
  document.body.classList.remove(`${shell}-shell`)
  setSmoothScrollLocked('island-temple', false)
})
</script>

<template>
  <main
    class="lucario-page temple-page no-rem"
    :class="{
      'temple-page--mobile': config.id === 'mobile',
      'temple-page--expanded': navigation.expanded,
      'temple-page--resizing': resizing,
      'temple-page--fullscreen-menu': config.menu.layout === 'fullscreen',
    }"
    :style="config.menu.styles"
    :data-presentation="config.id"
    :data-route-shell="shell"
    aria-label="主页"
    :data-selected="selected || 'none'"
    :data-statue-focused="selected === 'statue'"
    :data-settled="settled"
  >
    <div
      ref="stage"
      class="lucario-stage temple-stage"
      :aria-busy="status === 'loading'"
    >
      <FloraFocusLayout v-if="selected === 'sprigatito' && settled" />
      <TempleBackdrop />
      <TempleClock v-if="clockVisible" />
    </div>
    <div class="temple-obelisks">
      <button
        v-for="item in templeCategories"
        :key="item.id"
        :ref="(element) => setButton(item.id, element)"
        type="button"
        class="temple-obelisk"
        :data-obelisk="item.id"
        :aria-label="`${item.roman} / ${item.label}`"
        :aria-pressed="selected === item.id"
        :disabled="status !== 'ready' || !item.enabled"
        @click="
          config.raycastObelisks && $event.detail > 0
            ? scene?.pick($event)
            : scene?.select(item.id)
        "
      />
    </div>
    <div class="temple-fullscreen-shade" aria-hidden="true" />
    <div
      v-if="config.id === 'desktop'"
      ref="workDetailTarget"
      class="temple-work-detail"
      :inert="!settled || resizing || navigation.aboutOpen || undefined"
    />
    <Transition
      name="temple-menu-reveal"
      @after-leave="finishMenuExit"
      @leave-cancelled="finishMenuExit"
    >
      <section
        v-if="category"
        ref="menu"
        class="temple-menu"
        :class="{
          'temple-menu--left': category.x > 0,
          'is-visible': settled && menuRevealed,
        }"
        :aria-label="category.label"
        :inert="!settled || !menuRevealed || navigation.aboutOpen || undefined"
        :aria-busy="resizing || !menuContentReady"
        :data-content-ready="menuContentReady"
        @transitionend.self="finishMenuReveal"
        @click="dismissMenuBackground"
      >
        <button
          v-if="config.menu.layout !== 'fullscreen'"
          class="temple-expand"
          type="button"
          :aria-label="navigation.expanded ? '恢复半屏内容' : '展开全屏内容'"
          :aria-expanded="navigation.expanded"
          :disabled="resizing"
          @click.stop="toggleExpanded"
        >
          <span />
        </button>
        <div class="temple-menu__body" :inert="resizing || undefined">
          <FocusContent
            ref="focusContent"
            :key="category.id"
            :category="category.id"
            :expanded="navigation.expanded"
            :resizing="resizing"
            :detail-target="workDetailTarget"
            @loading="onMenuContentLoading"
            @ready="onMenuContentReady"
          />
        </div>
      </section>
    </Transition>
    <AboutOverlay />
    <p v-if="status === 'error'" class="lucario-status" role="alert">
      模型加载失败，请刷新页面重试
    </p>
  </main>
</template>

<style lang="less" scoped src="./TemplePage.less" />
