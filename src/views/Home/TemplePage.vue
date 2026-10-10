<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  watch,
} from 'vue'
import { useRoute } from 'vue-router'

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

import FocusContent from './components/FocusContent.vue'
import TempleBackdrop from './components/TempleBackdrop.vue'
import type { TemplePresentation } from './templePresentation'
import type { createHomeTemple, TempleSelection } from './templeScene'

const props = defineProps<{ presentation: TemplePresentation }>()
const route = useRoute()
const navigation = useTempleNavigation()
const siteLoading = useSiteLoading()
let loadingTask: ReturnType<typeof siteLoading.beginTask> | undefined
const config = props.presentation
const shell = config.routeShell
const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const selected = ref<TempleSelection | null>(null)
const menuCategory = ref<TempleCategoryId | null>(null)
const settled = ref(false)
const menu = ref<HTMLElement | null>(null)
const workDetailTarget = ref<HTMLElement | null>(null)
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
    await animateResize(
      pane,
      [
        { left: `${before.x}px`, right: 'auto', width: `${before.width}px` },
        { left: `${after.x}px`, right: 'auto', width: `${after.width}px` },
      ],
      reduced ? 1 : 1200
    )
    if (revision !== resizeRevision) return
    resizeAnimations.forEach((animation) => animation.cancel())
    resizeAnimations.clear()
    scroll.scrollTop = scrollTop
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
      // 全站加载模块在遮罩退场进行一半时开放模型入场。
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
}

const dismissMenuBackground = () => scene?.select(null)

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
watch(
  () => navigation.selected,
  () => {
    scene?.setThemeColor(
      (navigation.selected &&
        templeCategoryById.get(navigation.selected)?.themeColor) ||
        templeExperience.themeColor
    )
  }
)

onMounted(async () => {
  document.body.classList.remove(`${shell}-shell-leaving`)
  document.body.classList.add(`${shell}-shell`)
  setSmoothScrollLocked('island-temple', true)
  loadingTask = siteLoading.beginTask('home-scene')
  try {
    const { createHomeTemple } = await import('./templeScene')
    if (disposed || !stage.value) return
    scene = createHomeTemple(
      stage.value,
      buttons,
      {
        waitForRouteEnter,
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
            templeCategories.some(
              (item) => item.id === initialModule && item.enabled
            )
          )
            scene?.select(
              initialModule as TempleCategoryId,
              navigation.simpleEntrance
            )
          if (initialModule === navigation.returnModule)
            navigation.expanded = navigation.returnExpanded
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
          navigation.selected = id === 'statue' ? null : id
          navigation.expanded = false
          settled.value = false
          if (id === 'statue') menuCategory.value = null
        },
        settled: () => {
          if (resolveMenuExit) return
          menuCategory.value =
            selected.value === 'statue' ? null : selected.value
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
      <TempleBackdrop />
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
        :class="{ 'temple-menu--left': category.x > 0, 'is-visible': settled }"
        :aria-label="category.label"
        :inert="!settled || navigation.aboutOpen || undefined"
        :aria-busy="resizing"
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
            :key="category.id"
            :category="category.id"
            :expanded="navigation.expanded"
            :resizing="resizing"
            :detail-target="workDetailTarget"
            @click.stop
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
