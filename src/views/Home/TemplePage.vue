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
import { PHOTO_ROUTE_PATH } from '@/config/atriumPhoto'
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
import { isRouteCurtainCovered } from '@/utils/routeCurtain'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'
import AboutOverlay from '@/views/About/AboutOverlay.vue'

import AtriumPhotoStudio from './components/AtriumPhotoStudio.vue'
import FloraFocusLayout from './components/FloraFocusLayout.vue'
import FocusContent from './components/FocusContent.vue'
import TempleBackdrop from './components/TempleBackdrop.vue'
import TempleClock from './components/TempleClock.vue'
import TempleModuleCaption from './components/TempleModuleCaption.vue'
import { usePaneResize } from './composables/usePaneResize'
import { useTempleEntry } from './composables/useTempleEntry'
import type { AtriumPhotoFraming } from './scene/atriumPhotoFraming'
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

import './styles/atriumPhoto.less'

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
  getScrollRoot: () => HTMLElement | null | undefined
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
const photoFraming = ref<AtriumPhotoFraming>()
const photoStudioMounted = ref(false)
const photoRevealed = ref(false)
let photoRevealFrame: number | undefined
const cancelPhotoReveal = () => {
  if (photoRevealFrame !== undefined) cancelAnimationFrame(photoRevealFrame)
  photoRevealFrame = undefined
}
const revealPhotoMode = () => {
  cancelPhotoReveal()
  if (!navigation.photoMode) return
  // 给背景保留帧一次实际绘制机会，避免首帧编译与淡出挤在同一帧。
  photoRevealFrame = requestAnimationFrame(() => {
    photoRevealFrame = requestAnimationFrame(() => {
      photoRevealFrame = undefined
      if (!navigation.photoMode) return
      photoRevealed.value = true
      document.documentElement.classList.remove('atrium-photo-pending')
      document.documentElement.classList.add('atrium-photo-mode')
    })
  })
}
let photoTransitionTimer: ReturnType<typeof setTimeout> | undefined
const finishPhotoTransition = () => {
  if (navigation.photoMode) return
  if (photoTransitionTimer) clearTimeout(photoTransitionTimer)
  photoTransitionTimer = undefined
  photoStudioMounted.value = false
  photoRevealed.value = false
  scene?.finishPhotoTransition()
  document.documentElement.classList.remove(
    'atrium-photo-transition',
    'atrium-photo-pending'
  )
}
const applyPhotoMode = (active: boolean) => {
  if (navigation.photoMode === active) return
  if (!scene || (active && selected.value !== 'statue')) return
  const alreadyMounted = photoStudioMounted.value
  cancelPhotoReveal()
  if (active) {
    photoFraming.value = scene.getPhotoFraming()
    photoStudioMounted.value = true
  }
  navigation.photoMode = active
  if (photoTransitionTimer) clearTimeout(photoTransitionTimer)
  document.documentElement.classList.add('atrium-photo-transition')
  scene.setPhotoMode(active)
  if (active) {
    document.documentElement.classList.add('atrium-photo-pending')
    if (alreadyMounted) revealPhotoMode()
  } else {
    document.documentElement.classList.remove(
      'atrium-photo-mode',
      'atrium-photo-pending'
    )
    photoTransitionTimer = setTimeout(finishPhotoTransition, 1100)
  }
}
const setPhotoMode = (active: boolean) => {
  if (active) {
    if (!scene || selected.value !== 'statue') return
    if (route.path !== PHOTO_ROUTE_PATH) void router.push(PHOTO_ROUTE_PATH)
    else applyPhotoMode(true)
  } else if (route.path === PHOTO_ROUTE_PATH) void router.push('/atrium')
  else applyPhotoMode(false)
}
const photoKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && navigation.photoMode) setPhotoMode(false)
}
onMounted(() => window.addEventListener('keydown', photoKeydown))
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
    !selected.value &&
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
const { resizing, cancel: cancelResize, run: resizePane } = usePaneResize()
let expandClickFlash: Animation | undefined
const toggleExpanded = async (event: MouseEvent) => {
  if (config.menu.layout === 'fullscreen' || resizing.value || !menu.value)
    return
  const scroll = focusContent.value?.getScrollRoot()
  const body = menu.value.querySelector<HTMLElement>('.temple-menu__body')
  if (!scroll || !body) return
  expandClickFlash = flashActionButton(event.currentTarget as HTMLButtonElement)
  await resizePane({
    pane: menu.value,
    content: [body],
    scroll,
    update: () => {
      navigation.expanded = !navigation.expanded
    },
    refresh: () => focusContent.value?.refreshGeometry(),
  })
}
const category = computed(() =>
  menuCategory.value ? templeCategoryById.get(menuCategory.value) : undefined
)
const scrollMenuFromBackground = (event: WheelEvent) => {
  if (
    config.menu.layout !== 'sidebar' ||
    !settled.value ||
    resizing.value ||
    navigation.aboutOpen ||
    event.ctrlKey ||
    !event.deltaY
  )
    return
  // 三级详情优先接收背景滚轮；没有详情时沿用二级菜单的滚动条件。
  const detailRoot =
    islandFocusLayout?.getScrollRoot() ||
    workDetailTarget.value?.querySelector<HTMLElement>(
      '.scroll-viewport__scroll'
    )
  const root =
    detailRoot ||
    (menuRevealed.value && !navigation.expanded
      ? focusContent.value?.getScrollRoot()
      : null)
  if (!root) return
  const target = event.target
  if (
    !(target instanceof Element) ||
    target.closest(
      '.temple-menu, .temple-work-detail, [data-lenis-nested-scroll]'
    )
  )
    return
  event.preventDefault()
  // 转发输入也会中断带 current 参数的自动定位，避免与用户滚动争抢位置。
  const forwarded = new WheelEvent('wheel', {
    deltaY: event.deltaY,
    deltaX: event.deltaX,
    deltaMode: event.deltaMode,
    cancelable: true,
  })
  root.dispatchEvent(forwarded)
  if (forwarded.defaultPrevented) return
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
// 等待原场景完成构图后进入独立拍照场景，支持直达、刷新及历史导航。
watch(
  [() => route.path, selected, settled, status],
  ([path, selection, isSettled, sceneStatus]) => {
    if (path !== PHOTO_ROUTE_PATH) {
      if (navigation.photoMode) applyPhotoMode(false)
      return
    }
    if (
      selection === 'statue' &&
      isSettled &&
      sceneStatus === 'ready' &&
      !navigation.photoMode
    )
      applyPhotoMode(true)
  },
  { immediate: true, flush: 'post' }
)

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
      scene?.select(navigation.requested, isRouteCurtainCovered(route.fullPath))
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
  // 首次入口使用加载线，站内返回由路由遮罩等待场景的首帧。
  const initialEntry = !siteEntryActive.value
  loadingTask = siteLoading.beginTask('home-scene', 1, {
    silent: !initialEntry,
  })
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
      entryIslandModule: () => islandModuleAtPath(route.path),
      dismissBackground: closeInlineDetail,
      prepared: () => {
        if (initialEntry) loadingTask?.finish()
      },
      rendered: () => {
        if (!initialEntry) loadingTask?.finish()
      },
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
          route.path !== PHOTO_ROUTE_PATH &&
          !islandModuleAtPath(route.path)
        )
          void router.push('/atrium')
        else if (
          previousSelection === 'statue' &&
          id !== 'statue' &&
          (route.path === '/atrium' ||
            route.path === PHOTO_ROUTE_PATH ||
            islandModuleAtPath(route.path))
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
  applyPhotoMode(false)
  cancelPhotoReveal()
  finishPhotoTransition()
  if (photoTransitionTimer) clearTimeout(photoTransitionTimer)
  window.removeEventListener('keydown', photoKeydown)
  document.documentElement.classList.remove('atrium-photo-mode')
  document.documentElement.classList.remove('atrium-photo-transition')
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
            @photo="setPhotoMode(true)"
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
    <Transition name="atrium-photo-tools" @after-leave="finishPhotoTransition">
      <AtriumPhotoStudio
        v-if="photoStudioMounted && photoFraming"
        v-show="navigation.photoMode"
        :framing="photoFraming"
        :revealed="photoRevealed"
        :mobile="config.id === 'mobile'"
        @ready="revealPhotoMode"
        @exit="setPhotoMode(false)"
      />
    </Transition>
  </main>
</template>

<style lang="less" scoped src="./TemplePage.less" />
