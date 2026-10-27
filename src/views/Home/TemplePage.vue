<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import MobileScreenFrame from '@/components/MobileScreenFrame/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { decorationActivityKey } from '@/composables/useDecorationActivity'
import { islandModuleAtPath, type IslandModuleId } from '@/config/islandModules'
import { TEMPLE_SCENE_RISE } from '@/config/templeCamera'
import { templeExperience } from '@/config/templeExperience'
import {
  parseTempleExpanded,
  templeCategories,
  templeCategoryById,
  type TempleCategoryId,
  templeModulePaths,
} from '@/config/templeNavigation'
import type { TemplePresentation } from '@/config/templePresentation'
import { pets } from '@/locales/dynamic/pets'
import { ensureMessageDomain } from '@/locales/routeMessages'
import { cursorState, visualState } from '@/stores'
import { useFloraPets } from '@/stores/floraPets'
import { useSiteLoading } from '@/stores/siteLoading'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { flashActionButton } from '@/utils/flashActionButton'
import { readHomeFeatures } from '@/utils/homeFeatures'
import { hasJourneyReturnState } from '@/utils/journeyReturnState'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'
import AboutOverlay from '@/views/About/AboutOverlay.vue'

import FloraFocusLayout from './components/FloraFocusLayout.vue'
import FocusContent from './components/FocusContent.vue'
import TempleBackdrop from './components/TempleBackdrop.vue'
import TempleClock from './components/TempleClock.vue'
import TempleModuleCaption from './components/TempleModuleCaption.vue'
import { useTempleEntry } from './composables/useTempleEntry'
import { isHomeSceneDiagnosticsEnabled } from './scene/diagnostics'
import { loadTempleFocusContent } from './focusContentLoader'
import type {
  createHomeTemple,
  IslandDetailSide,
  IslandModelAnchors,
  TempleCallbacks,
  TempleSelection,
} from './templeScene'
import { templeSceneHost } from './templeSceneHost'

const IslandFocusLayout = defineAsyncComponent(() =>
  Promise.all([
    ensureMessageDomain('island'),
    import('./components/IslandFocusLayout.vue'),
  ]).then(([, component]) => component.default)
)
let latestIslandAnchors: IslandModelAnchors | null = null
const islandInteractive = ref(false)
const islandOverviewLeaving = ref(false)
let islandFocusLayout: {
  updateAnchors: (anchors: IslandModelAnchors) => void
  closeDetail: () => boolean
  leaveOverview: () => Promise<void>
} | null = null
const setIslandFocusLayout = (value: unknown) => {
  islandFocusLayout = value as typeof islandFocusLayout
  if (islandFocusLayout && latestIslandAnchors)
    islandFocusLayout.updateAnchors(latestIslandAnchors)
}

const props = defineProps<{
  presentation: TemplePresentation
  freshScene?: boolean
}>()
const emit = defineEmits<{ (event: 'fresh-scene-consumed'): void }>()
const route = useRoute()
const router = useRouter()
const navigation = useTempleNavigation()
const floraPets = useFloraPets()
const visual = visualState()
const cursor = cursorState()
watch(
  () => visual.theme,
  (theme) => scene?.setColorMode(theme)
)
// 关闭期间继续保持背景休眠，待 About 离场结束后再恢复。
const aboutBackgroundHidden = computed({
  get: () => navigation.aboutOverlayVisible,
  set: (visible: boolean) => {
    navigation.aboutOverlayVisible = visible
  },
})
const restoreAboutBackground = () => {
  if (!navigation.aboutOpen) aboutBackgroundHidden.value = false
}
watch(
  () => navigation.aboutOpen,
  (open) => {
    if (open) aboutBackgroundHidden.value = true
  },
  { flush: 'sync', immediate: true }
)
provide(
  decorationActivityKey,
  computed(() => !aboutBackgroundHidden.value)
)
const siteLoading = useSiteLoading()
let loadingTask: ReturnType<typeof siteLoading.beginTask> | undefined
const config = props.presentation
const shell = config.routeShell
const pageStyles = {
  ...config.menu.styles,
  '--temple-scene-rise': `${TEMPLE_SCENE_RISE * 100}svh`,
}
const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const entranceFinished = computed(() => navigation.entranceFinished)
const selected = ref<TempleSelection | null>(null)
const clockAwaitingSettle = computed({
  get: () => navigation.clockAwaitingSettle,
  set: (waiting: boolean) => {
    navigation.clockAwaitingSettle = waiting
  },
})
const clockVisible = computed(
  () =>
    entranceFinished.value &&
    !clockAwaitingSettle.value &&
    (!selected.value || selected.value === 'statue') &&
    !navigation.aboutOpen
)
const menuCategory = ref<TempleCategoryId | null>(null)
// 离场期间保留原遮罩方向，避免侧栏消失时渐变突然反向。
const menuShadeLeft = ref(false)
const settled = ref(false)
const menuContentReady = ref(false)
const menuRevealed = ref(false)
const menuVisible = computed(() => settled.value && menuRevealed.value)
let menuRevealFrame: number | undefined
const cancelMenuReveal = () => {
  if (menuRevealFrame !== undefined) cancelAnimationFrame(menuRevealFrame)
  menuRevealFrame = undefined
  menuRevealed.value = false
}
watch(
  menuCategory,
  (id) => {
    if (id) menuShadeLeft.value = (templeCategoryById.get(id)?.x ?? 0) > 0
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
const moduleFooterTarget = ref<HTMLElement | null>(null)
const floraFocusLayout = ref<InstanceType<typeof FloraFocusLayout> | null>(null)
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
let expandClickFlash: Animation | undefined
const toggleExpanded = async (event: MouseEvent) => {
  if (config.menu.layout === 'fullscreen' || resizing.value || !menu.value)
    return
  const scroll = focusContent.value?.getScrollRoot()
  if (!scroll) return
  expandClickFlash = flashActionButton(event.currentTarget as HTMLButtonElement)
  const revision = ++resizeRevision
  resizing.value = true
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const pane = menu.value
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
const scrollMenuFromBackground = (event: WheelEvent) => {
  if (
    config.menu.layout !== 'sidebar' ||
    !settled.value ||
    !menuRevealed.value ||
    navigation.expanded ||
    resizing.value ||
    navigation.aboutOpen ||
    event.ctrlKey ||
    !event.deltaY
  )
    return
  const target = event.target
  if (
    !(target instanceof Element) ||
    target.closest(
      '.temple-menu, .temple-work-detail, [data-lenis-nested-scroll]'
    )
  )
    return
  const root = focusContent.value?.getScrollRoot()
  if (!root) return
  event.preventDefault()
  // 转发输入也会中断带 current 参数的自动定位，避免与用户滚动争抢位置。
  root.dispatchEvent(new WheelEvent('wheel', event))
  const unit =
    event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? root.clientHeight
      : event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? parseFloat(getComputedStyle(root).lineHeight) || 16
      : 1
  root.scrollBy({
    top: event.deltaY * unit,
    behavior: 'instant' as ScrollBehavior,
  })
}
const buttons = new Map<string, HTMLElement>()
let scene: ReturnType<typeof createHomeTemple> | undefined
const focusIslandDetail = (
  side: IslandDetailSide,
  moduleId?: IslandModuleId,
  immediate = false
) => scene?.setIslandDetail(side, immediate, moduleId)
let sceneHostKey: string | undefined
let sceneFactory: typeof createHomeTemple | undefined
watch(
  [() => navigation.immersive, () => cursor.isIdle],
  ([immersive, idle]) => {
    if (immersive && idle) scene?.resetPointer()
  },
  { flush: 'sync' }
)
watch(
  () => navigation.immersive,
  (immersive) => scene?.setImmersive(immersive),
  {
    flush: 'sync',
  }
)
const sceneActive = computed(
  // 带参进入全屏时仍需完成方尖碑聚焦，settled 后再暂停被遮挡的场景。
  () =>
    !aboutBackgroundHidden.value &&
    !(config.id === 'mobile' && floraFocusLayout.value?.albumExpanded) &&
    (!navigation.expanded || resizing.value || !settled.value)
)
watch(sceneActive, (active) => scene?.setActive(active), { flush: 'post' })
watch(aboutBackgroundHidden, (hidden) => scene?.setOccluded(hidden), {
  flush: 'sync',
})
let disposed = false
const { siteEntryActive, waitForRouteEnter } = useTempleEntry()

// 空白点击优先收起侧栏详情，第二次点击才退出作品集聚焦。
const closeInlineDetail = () =>
  (selected.value === 'statue' &&
    (islandFocusLayout?.closeDetail() ?? false)) ||
  (selected.value === 'sprigatito' &&
    (floraFocusLayout.value?.closeExpandedAlbum() ?? false)) ||
  (config.id === 'desktop' &&
    (navigation.selected === 'archive' || navigation.selected === 'island') &&
    !navigation.expanded &&
    !navigation.aboutOpen &&
    (focusContent.value?.closeInlineDetail() ?? false))

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

const obelisksDisabled = computed(
  () => status.value !== 'ready' || navigation.immersive
)
const obeliskControls = templeCategories.map((category) => ({
  category,
  setRef(element: unknown) {
    if (element instanceof HTMLElement) buttons.set(category.id, element)
    else buttons.delete(category.id)
  },
  onClick(event: MouseEvent) {
    if (config.raycastObelisks && event.detail > 0) scene?.pick(event)
    else scene?.select(category.id)
  },
}))

watch(
  () => navigation.revision,
  () => {
    if (navigation.ready) {
      scene?.select(navigation.requested)
      navigation.expanded = navigation.requestedExpanded
    }
  }
)
const syncSceneTheme = (selection: TempleSelection | null, animate = true) => {
  const themeCategory =
    selection === 'statue' || selection === 'sprigatito' ? null : selection
  scene?.setThemeColor(
    selection === 'sprigatito'
      ? floraPets.activePet.themeColor
      : (themeCategory && templeCategoryById.get(themeCategory)?.themeColor) ||
          templeExperience.themeColor,
    animate
  )
}
watch(
  [selected, () => floraPets.activePet.themeColor],
  () => syncSceneTheme(selected.value),
  // 首帧绘制前完成主题初始化；不能等待默认 watcher 队列再由红色补间。
  { flush: 'sync' }
)

let petSelectionRevision = 0
const selectPet = async (id: string) => {
  const pet = pets.find((item) => item.id === id)
  if (
    !pet ||
    !scene ||
    (pet.id === floraPets.activePetId && !floraPets.loadingPetId)
  )
    return
  const revision = ++petSelectionRevision
  floraPets.loadingPetId = pet.id
  floraPets.error = ''
  try {
    if (
      (await scene.setPet(pet)) &&
      !disposed &&
      revision === petSelectionRevision
    )
      floraPets.activePetId = pet.id
  } catch (error) {
    if (!disposed && revision === petSelectionRevision) {
      floraPets.error = '宠物模型加载失败，请重试'
      console.error('Pet model load failed', error)
    }
  } finally {
    if (revision === petSelectionRevision) floraPets.loadingPetId = null
  }
}

const featureRequest = new AbortController()
onMounted(async () => {
  if (props.freshScene) {
    navigation.entryExpanded = parseTempleExpanded(route.query.isExpand)
  }
  navigation.setInlineDetailCloser(closeInlineDetail)
  document.body.classList.remove(`${shell}-shell-leaving`)
  document.body.classList.add(`${shell}-shell`)
  setSmoothScrollLocked('island-temple', true)
  // 全局地平线加载仅属于首次入场；站内返回沿用路由过渡。
  if (!siteEntryActive.value) loadingTask = siteLoading.beginTask('home-scene')
  try {
    const [{ createHomeTemple }, homeFeatures] = await Promise.all([
      import('./templeScene'),
      readHomeFeatures(featureRequest.signal),
    ])
    if (disposed || !stage.value) return
    sceneFactory = createHomeTemple
    const entrySelection = () => {
      const id = navigation.revision
        ? navigation.requested
        : navigation.entryModule ??
          (hasJourneyReturnState() ? 'flanerie' : undefined)
      return id === 'statue' ||
        id === 'sprigatito' ||
        templeCategories.some((item) => item.id === id && item.enabled)
        ? (id as TempleSelection)
        : null
    }
    const experience = {
      ...templeExperience,
      headache: templeExperience.headache && {
        ...templeExperience.headache,
        mode: homeFeatures?.lucarioHeadache
          ? ('headache' as const)
          : ('normal' as const),
      },
    }
    sceneHostKey = `${config.id}:${experience.model.id}:${
      experience.headache?.mode
    }:${isHomeSceneDiagnosticsEnabled()}`
    const sceneCallbacks: TempleCallbacks = {
      entranceStarted: () => {
        navigation.entranceStarted = true
      },
      waitForRouteEnter,
      entrySelection,
      dismissBackground: closeInlineDetail,
      prepared: () => loadingTask?.finish(),
      progress: (value) => loadingTask?.update(value),
      ready: () => {
        status.value = 'ready'
        navigation.ready = true
        const initialModule = entrySelection()
        if (selected.value !== initialModule)
          scene?.select(initialModule, navigation.simpleEntrance)
        navigation.expanded = navigation.revision
          ? navigation.requestedExpanded
          : navigation.entryExpanded ??
            (initialModule === navigation.returnModule &&
              navigation.returnExpanded)
      },
      entranceComplete: () => {
        navigation.entranceFinished = true
      },
      beforeReturn: () => {
        if (selected.value === 'statue')
          return islandFocusLayout?.leaveOverview()
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
        const previousSelection = selected.value
        clockAwaitingSettle.value = true
        finishMenuExit()
        cancelResize()
        selected.value = id
        navigation.selected = id === 'statue' || id === 'sprigatito' ? null : id
        navigation.companionFocused = id === 'sprigatito'
        navigation.statueFocused = id === 'statue'
        if (
          id === 'statue' &&
          route.path !== '/atrium' &&
          !islandModuleAtPath(route.path)
        )
          void router.push('/atrium')
        else if (
          previousSelection === 'statue' &&
          id !== 'statue' &&
          (route.path === '/atrium' || islandModuleAtPath(route.path))
        )
          void router.replace(
            id === 'sprigatito'
              ? '/floratrium'
              : id
              ? templeModulePaths[id]
              : '/'
          )
        navigation.expanded = false
        settled.value = false
        if (id && id !== 'statue' && id !== 'sprigatito')
          void loadTempleFocusContent(id).catch(() => {})
        if (id === 'statue' || id === 'sprigatito') menuCategory.value = null
      },
      islandAnchors: (anchors) => {
        latestIslandAnchors = anchors
        islandFocusLayout?.updateAnchors(anchors)
      },
      islandInteractive: (ready) => {
        islandInteractive.value = ready
      },
      settled: () => {
        if (resolveMenuExit) return
        menuCategory.value =
          selected.value === 'statue' || selected.value === 'sprigatito'
            ? null
            : selected.value
        settled.value = true
        clockAwaitingSettle.value = false
      },
      error: (error) => {
        loadingTask?.finish('error')
        status.value = 'error'
        console.error('神殿场景加载失败', error)
      },
    }
    if (props.freshScene) {
      templeSceneHost.clear()
      emit('fresh-scene-consumed')
    }
    const resident = templeSceneHost.take(
      `${sceneHostKey}:${floraPets.activePet.id}`,
      createHomeTemple
    )
    scene =
      resident ??
      createHomeTemple(
        stage.value,
        buttons,
        sceneCallbacks,
        config,
        experience,
        navigation.simpleEntrance || hasJourneyReturnState(),
        floraPets.activePet
      )
    if (resident) resident.attachFromHost(stage.value, buttons, sceneCallbacks)
    scene.setColorMode(visual.theme)
    syncSceneTheme(entrySelection(), false)
    scene.setOccluded(aboutBackgroundHidden.value)
    scene.setActive(sceneActive.value)
    scene.setImmersive(navigation.immersive)
    if (resident) await resident.resumeFromHost()
  } catch (error) {
    if (!disposed) {
      loadingTask?.finish('error')
      status.value = 'error'
      console.error(error)
    }
  }
})

onBeforeUnmount(() => {
  featureRequest.abort()
  expandClickFlash?.cancel()
  disposed = true
  petSelectionRevision++
  floraPets.loadingPetId = null
  cancelMenuReveal()
  cancelResize()
  loadingTask?.finish('cancelled')
  if (scene && sceneHostKey && status.value === 'ready')
    templeSceneHost.retain(
      `${sceneHostKey}:${scene.petId}`,
      scene,
      sceneFactory
    )
  else scene?.dispose()
  navigation.reset()
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
      'temple-page--menu-visible': !!category && menuVisible,
      'temple-page--menu-left': menuShadeLeft,
      'temple-page--album-expanded': !!floraFocusLayout?.albumExpanded,
      'temple-page--resizing': resizing,
      'temple-page--fullscreen-menu': config.menu.layout === 'fullscreen',
    }"
    :style="pageStyles"
    :data-presentation="config.id"
    :data-route-shell="shell"
    aria-label="主页"
    :data-selected="selected || 'none'"
    :data-statue-focused="selected === 'statue'"
    :data-settled="settled"
  >
    <Transition name="temple-about-background">
      <div
        v-show="!aboutBackgroundHidden"
        class="temple-underlay"
        :inert="aboutBackgroundHidden || undefined"
        :aria-hidden="aboutBackgroundHidden"
        @wheel="scrollMenuFromBackground"
      >
        <div
          ref="stage"
          class="lucario-stage temple-stage"
          :aria-busy="status === 'loading'"
        >
          <Transition name="flora-focus-fade" appear>
            <FloraFocusLayout
              v-if="selected === 'sprigatito' && settled"
              ref="floraFocusLayout"
              :mobile="config.id === 'mobile'"
              @select-pet="selectPet"
            />
          </Transition>
          <IslandFocusLayout
            v-if="(selected === 'statue' && settled) || islandOverviewLeaving"
            :ref="setIslandFocusLayout"
            :interactive="islandInteractive"
            :mobile="config.id === 'mobile'"
            @detail-side="focusIslandDetail"
            @overview-leaving="islandOverviewLeaving = $event"
          />
          <MobileScreenFrame v-if="config.id === 'mobile'" />
          <TempleBackdrop />
          <Transition name="temple-clock-reveal" appear>
            <TempleClock
              v-if="clockVisible"
              :immersive="navigation.immersive"
            />
          </Transition>
        </div>
        <div class="temple-obelisks">
          <button
            v-for="{ category: item, setRef, onClick } in obeliskControls"
            :key="item.id"
            :ref="setRef"
            type="button"
            class="temple-obelisk"
            :data-obelisk="item.id"
            :aria-label="item.label"
            :aria-pressed="selected === item.id"
            :disabled="obelisksDisabled || !item.enabled"
            @click="onClick"
          />
        </div>
        <div class="temple-fullscreen-shade" aria-hidden="true" />
        <div
          v-if="config.id === 'desktop'"
          ref="workDetailTarget"
          class="temple-work-detail"
          :class="{ 'temple-work-detail--creative': menuCategory === 'island' }"
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
              'is-visible': menuVisible,
            }"
            :aria-label="category.label"
            :inert="!menuVisible || navigation.aboutOpen || undefined"
            :aria-busy="resizing || !menuContentReady"
            :data-content-ready="menuContentReady"
            @transitionend.self="finishMenuReveal"
            @click="dismissMenuBackground"
          >
            <button
              v-if="config.menu.layout !== 'fullscreen'"
              class="temple-expand"
              type="button"
              :aria-label="
                navigation.expanded ? '恢复半屏内容' : '展开全屏内容'
              "
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
                @footer-target="moduleFooterTarget = $event"
              />
            </div>
          </section>
        </Transition>
        <Transition name="temple-caption" appear>
          <TempleModuleCaption
            v-if="
              category &&
              config.menu.layout === 'sidebar' &&
              menuVisible &&
              !navigation.expanded &&
              !resizing &&
              !navigation.aboutOpen
            "
            :key="category.id"
            :category="category.id"
          />
        </Transition>

        <PageFooter
          variant="home"
          :visible="navigation.homeCornersVisible"
          :embedded-target="moduleFooterTarget"
        />
        <p v-if="status === 'error'" class="lucario-status" role="alert">
          模型加载失败，请刷新页面重试
        </p>
      </div>
    </Transition>
    <AboutOverlay @closed="restoreAboutBackground" />
  </main>
</template>

<style lang="less" scoped src="./TemplePage.less" />
