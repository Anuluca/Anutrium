<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowReactive,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useResizeObserver } from '@vueuse/core'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

import NotFoundContent from '@/components/NotFoundContent/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
import SectionCount from '@/components/SectionCount/index.vue'
import {
  type HarborItem,
  splitHarborItemCount,
  useIslandHarborData,
} from '@/composables/useIslandHarborData'
import {
  ISLAND_OPENING_DURATION,
  ISLAND_RETURN_WINDOW_DURATION,
  ISLAND_WINDOW_DURATION,
  islandCardOpeningDelay,
  islandModuleAtPath,
  type IslandModuleId,
  islandModules,
} from '@/config/islandModules'
import { flashActionButton } from '@/utils/flashActionButton'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'
import { subscribePointerSamples } from '@/utils/pointerSamples'
import { createScanlineCharacters } from '@/utils/scanlineMask'

import {
  easeIslandDetailMotion,
  easeIslandReturnMotion,
} from '../scene/islandDetailMotion'
import {
  createIslandLinkOverlay,
  islandAnchorByItem,
} from '../scene/islandLinkOverlay'
import type { IslandDetailSide } from '../templeScene'

gsap.registerPlugin(Flip)
const IslandNotesContent = defineAsyncComponent(
  () => import('./island/IslandNotesContent.vue')
)
const IslandCollectionsContent = defineAsyncComponent(
  () => import('./island/IslandCollectionsContent.vue')
)

const props = withDefaults(
  defineProps<{
    mobile?: boolean
    interactive?: boolean
  }>(),
  { mobile: false, interactive: true }
)
const { locale } = useI18n()
const emit = defineEmits<{
  (event: 'overview-leaving', active: boolean): void
  (
    event: 'detail-side',
    side: IslandDetailSide,
    moduleId?: IslandModuleId,
    immediate?: boolean
  ): void
}>()
const route = useRoute()
const router = useRouter()
type Selection = { group: string; item: IslandModuleId }
const selectedItem = ref<Selection | null>(null)
const detailContentReady = ref(false)
const collectionsExpanded = ref(false)
const detailResizing = ref(false)
const transitionItem = ref<Selection | null>(null)
const phase = ref<
  'overview' | 'leaving' | 'detail' | 'restoring' | 'revealing'
>('overview')
let transitionRevision = 0
const reducedMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches
const opening = ref(false)
const overviewLeaving = ref(false)
let overviewExit: Promise<void> | undefined
const openingStyle = (id: string) => ({
  '--island-open-delay': `${
    islandCardOpeningDelay[id as IslandModuleId] ?? 0
  }s`,
})
const timers = new Map<ReturnType<typeof setTimeout>, () => void>()
const waitMotion = (duration: number) =>
  reducedMotion()
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer)
          resolve()
        }, duration * 1000)
        timers.set(timer, resolve)
      })
const itemTransitionClass = (item: string) => {
  if (overviewLeaving.value) return 'crt-effect-leave-active'
  if (opening.value) return 'crt-effect-enter-active'
  if (!transitionItem.value || transitionItem.value.item === item) return ''
  if (phase.value === 'leaving') return 'crt-effect-leave-active'
  if (phase.value === 'revealing') return 'crt-effect-enter-active'
  if (phase.value === 'restoring') return 'is-transition-hidden'
  return ''
}
const groupTransitionClass = (group: string) => {
  if (overviewLeaving.value) return 'crt-effect-leave-active'
  if (opening.value) return 'crt-effect-enter-active'
  if (!transitionItem.value || transitionItem.value.group === group) return ''
  return itemTransitionClass('')
}
const detailSide = computed(() =>
  selectedItem.value?.group === 'interests' ? 'right' : 'left'
)
const { harborSections } = useIslandHarborData()
const groups = computed(() => {
  const english = locale.value === 'en'
  return harborSections.map((group) => ({
    ...group,
    label: english ? group.subtitle : group.title,
    items: group.items.map((item) => {
      const placeholder = item.img.includes('placehold.co')
      const { value, unit } = splitHarborItemCount(item.count)
      const englishTitle =
        islandModules[item.subtitle as IslandModuleId].englishTitle
      return {
        ...item,
        countValue: Number(value),
        countLabel: unit,
        titleCharacters: createScanlineCharacters(englishTitle, {
          seed: `atrium-card:${item.subtitle}`,
          heightRange: [0.35, 0.58],
          lines: 12,
        }),
        englishTitle,
        label: english
          ? islandModules[item.subtitle as IslandModuleId].englishTitle
          : item.title,
        placeholder,
        desktopSrc: placeholder ? '' : getCardThumbnailUrl(item.img),
        mobileSrc: placeholder ? '' : getCardMobileThumbnailUrl(item.img),
      }
    }),
  }))
})
const root = ref<HTMLElement | null>(null)
const hoveredItem = ref<{ group: string; item: string } | null>(null)
const hovered = computed(() => hoveredItem.value?.group ?? null)
const coverFilterId = `island-cover-tint-${getCurrentInstance()?.uid}`
const busy = ref(false)
const canHover = computed(
  () =>
    props.interactive &&
    !busy.value &&
    !opening.value &&
    !overviewLeaving.value &&
    phase.value === 'overview'
)
const hoverArmed = ref(false)
const cardParallax = { x: 0, y: 0 }
let cardParallaxMotion: gsap.core.Tween | undefined
let unsubscribeCardPointer: (() => void) | undefined
let renderedParallaxX = NaN
let renderedParallaxY = NaN
const writeCardParallax = () => {
  if (!root.value) return
  // 保留连续缓动值，只将最终绘制位置对齐设备像素，稳定细扫描线的采样覆盖率。
  const ratio = window.devicePixelRatio || 1
  const x = Math.round(cardParallax.x * ratio) / ratio
  const y = Math.round(cardParallax.y * ratio) / ratio
  if (x === renderedParallaxX && y === renderedParallaxY) return
  renderedParallaxX = x
  renderedParallaxY = y
  root.value.style.setProperty('--island-parallax-x', `${x}px`)
  root.value.style.setProperty('--island-parallax-y', `${y}px`)
  scheduleMeasure()
}
watch(canHover, (enabled) => {
  if (!enabled) cardParallaxMotion?.kill()
})
const setHovered = (group: string, item: string) => {
  hoveredItem.value = canHover.value ? { group, item } : null
}
const hoverItem = (group: string, item: string) => {
  if (hoverArmed.value) setHovered(group, item)
}
const armHover = (event: PointerEvent) => {
  if (!canHover.value || event.pointerType === 'touch') return
  hoverArmed.value = true
  const target =
    event.target instanceof Element
      ? event.target.closest('[data-island-item], [data-island-anchor]')
      : null
  const item =
    target?.getAttribute('data-island-item') ??
    target?.getAttribute('data-island-anchor')
  if (item) setHovered(itemGroups.get(item)!, item)
}
watch(canHover, (allowed) => {
  if (!allowed) {
    hoveredItem.value = null
    hoverArmed.value = false
  }
})
const failedCovers = ref(new Set<string>())
const linkOverlay = createIslandLinkOverlay()
let disposed = false
let measureFrame: number | undefined
let layoutMotion: gsap.core.Timeline | undefined
// 先移除正文的布局占位，再测量完整总览终点。
const animateLayout = async (
  selection: Selection | null,
  immediate = false
) => {
  if (disposed || !root.value) return
  layoutMotion?.progress(1).kill()
  const target = selection ?? selectedItem.value
  if (!target) return
  const window = root.value.querySelector<HTMLElement>(
    `[data-island-group="${target.group}"]`
  )!
  // 隐藏的兄弟卡片只播放 CRT，避免 FLIP 缓存 display/visibility 后覆盖 Vue 的恢复状态。
  const layoutTargets = [
    window,
    window.querySelector('.island-window__bar')!,
    window.querySelector(`[data-flash-item="${target.item}"]`)!,
  ] as HTMLElement[]
  const state = Flip.getState(layoutTargets)
  // 起点保留当前视差；归零后的终点交给 FLIP 平滑衔接，避免点击时卡片跳动。
  cardParallaxMotion?.kill()
  cardParallax.x = cardParallax.y = 0
  writeCardParallax()
  // CSS 独立位移已归零，清除 FLIP 读取时缓存的旧坐标。
  gsap.set(layoutTargets, { clearProps: 'transform' })
  selectedItem.value = selection
  linkOverlay.setFocused(selection?.item ?? null)
  hoveredItem.value = null
  await nextTick()
  if (disposed) return
  measure(true)
  await new Promise<void>((resolve) => {
    layoutMotion = Flip.from(state, {
      duration:
        immediate || reducedMotion()
          ? 0
          : selection
          ? ISLAND_WINDOW_DURATION
          : ISLAND_RETURN_WINDOW_DURATION,
      ease: selection ? easeIslandDetailMotion : easeIslandReturnMotion,
      scale: true,
      nested: true,
      onUpdate: scheduleMeasure,
      onComplete: () => {
        gsap.set(layoutTargets, { clearProps: 'transform' })
        scheduleMeasure()
        resolve()
      },
      onInterrupt: resolve,
    })
  })
}
const transitionDetail = async (
  moduleId: IslandModuleId | null,
  initial = false
) => {
  const revision = ++transitionRevision
  const selection = moduleId
    ? { group: islandModules[moduleId].group, item: moduleId }
    : null
  const previous = selectedItem.value ?? transitionItem.value
  busy.value = true
  collectionsExpanded.value = false
  detailContentReady.value = false
  if (selection) {
    const alreadyHidden =
      phase.value === 'leaving' && transitionItem.value?.item === moduleId
    transitionItem.value = selection
    if (!initial && !selectedItem.value && !alreadyHidden) {
      phase.value = 'leaving'
      await waitMotion(0.24)
      if (disposed || revision !== transitionRevision) return
    }
    phase.value = 'detail'
    emit(
      'detail-side',
      islandModules[selection.item].side,
      selection.item,
      initial
    )
    await animateLayout(selection, initial)
    if (disposed || revision !== transitionRevision) return
    // 窗口形变结束后再延迟显示正文，避免延迟被窗口入场动画吞掉。
    await waitMotion(0.45)
    if (disposed || revision !== transitionRevision) return
    detailContentReady.value = true
    await nextTick()
    root.value
      ?.querySelector<HTMLElement>(
        '.island-detail__viewport .scroll-viewport__scroll'
      )
      ?.focus({ preventScroll: true })
  } else if (previous) {
    transitionItem.value = previous
    let restoring: Promise<void> | undefined
    if (selectedItem.value) {
      emit('detail-side', null)
      phase.value = 'restoring'
      restoring = animateLayout(null)
      // 卡片回位过半时开始开屏，让两段动画自然重叠。
      await waitMotion(ISLAND_RETURN_WINDOW_DURATION * 0.5)
      if (disposed || revision !== transitionRevision) return
    }
    phase.value = 'revealing'
    await Promise.all([restoring, waitMotion(ISLAND_OPENING_DURATION + 0.05)])
    if (disposed || revision !== transitionRevision) return
    phase.value = 'overview'
    transitionItem.value = null
    root.value
      ?.querySelector<HTMLButtonElement>(
        `[data-island-item="${previous.item}"]`
      )
      ?.focus({ preventScroll: true })
  }
  if (revision === transitionRevision) busy.value = false
}
watch(
  [root, () => route.path],
  ([element, path], [previousRoot]) => {
    if (!element) return
    const moduleId = islandModuleAtPath(path)
    if (!moduleId && !selectedItem.value && !transitionItem.value) return
    void transitionDetail(moduleId, !previousRoot)
  },
  { flush: 'post' }
)
const toggleCollectionsExpanded = async (event: MouseEvent) => {
  if (busy.value || detailResizing.value || !root.value) return
  const panel = root.value.querySelector<HTMLElement>(
    '.island-window--interests'
  )!
  const scroll = panel.querySelector<HTMLElement>('.scroll-viewport__scroll')!
  const scrollTop = scroll.scrollTop
  const state = Flip.getState(panel)
  const animation = flashActionButton(event.currentTarget as HTMLButtonElement)
  if (animation) {
    animations.add(animation)
    void animation.finished
      .catch(() => undefined)
      .finally(() => animations.delete(animation))
  }
  detailResizing.value = true
  collectionsExpanded.value = !collectionsExpanded.value
  await nextTick()
  if (disposed) return
  scroll.scrollTop = scrollTop
  layoutMotion = Flip.from(state, {
    duration: reducedMotion() ? 0 : 1.2,
    ease: easeIslandDetailMotion,
    scale: true,
    onUpdate: scheduleMeasure,
    onComplete: () => {
      gsap.set(panel, { clearProps: 'transform' })
      detailResizing.value = false
      scheduleMeasure()
    },
    onInterrupt: () => {
      detailResizing.value = false
    },
  })
}
const closeDetail = () => {
  if (['restoring', 'revealing'].includes(phase.value)) return true
  if (!selectedItem.value && !transitionItem.value) return false
  if (!selectedItem.value && !islandModuleAtPath(route.path)) {
    void transitionDetail(null)
    return true
  }
  void router.push('/atrium')
  return true
}
const leaveOverview = () => {
  if (overviewExit) return overviewExit
  opening.value = false
  hoveredItem.value = null
  overviewLeaving.value = true
  emit('overview-leaving', true)
  const closingDuration =
    0.24 + Math.max(...Object.values(islandCardOpeningDelay))
  // 关屏与模型回正同时启动，卡片保留到最后一张关屏结束。
  overviewExit = Promise.resolve()
  void waitMotion(closingDuration + 0.05).then(() => {
    if (!disposed) emit('overview-leaving', false)
  })
  return overviewExit
}
defineExpose({
  updateAnchors: linkOverlay.updateAnchors,
  closeDetail,
  leaveOverview,
})
const panels = shallowReactive(new Map<string, HTMLElement>())
const titles = new Map<string, HTMLElement>()
const itemTitles = new Map<string, HTMLElement>()
const titleScales = new WeakMap<HTMLElement, string>()
const bindElement =
  (elements: Map<string, HTMLElement>, id: string) => (element: unknown) => {
    if (element instanceof HTMLElement) elements.set(id, element)
    else elements.delete(id)
  }
// 稳定 ref 回调避免 hover 更新时重复解绑节点和重建 ResizeObserver 订阅。
const panelBindings = new Map(
  Object.keys(islandAnchorByItem).map((id) => [id, bindElement(panels, id)])
)
const titleBindings = new Map(
  harborSections.map(({ id }) => [id, bindElement(titles, id)])
)
const itemTitleBindings = new Map(
  Object.keys(islandAnchorByItem).map((id) => [id, bindElement(itemTitles, id)])
)
const linkBindings = new Map(
  Object.keys(islandAnchorByItem).map((id) => [
    id,
    (element: unknown) => linkOverlay.bind(id, element),
  ])
)
const itemGroups = new Map(
  harborSections.flatMap((group) =>
    group.items.map((item) => [item.subtitle, group.id] as const)
  )
)
const measure = (measureTitles = false) => {
  if (disposed || !root.value) return
  const bounds = root.value.getBoundingClientRect()
  const next: Record<string, { x: number; y: number }> = {}
  for (const [id, panel] of panels) {
    const rect = panel.getBoundingClientRect()
    next[id] = {
      x:
        (itemGroups.get(id) === 'interests' ? rect.left : rect.right) -
        bounds.left,
      y: rect.top + rect.height / 2 - bounds.top,
    }
  }
  const scales: [HTMLElement, string][] = []
  if (measureTitles) {
    for (const title of titles.values()) {
      const header = title.parentElement!
      const style = getComputedStyle(header)
      const glyph = header.querySelector<HTMLElement>('.island-window__glyph')!
      const available =
        header.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        parseFloat(style.columnGap) -
        glyph.offsetWidth
      scales.push([
        title,
        String(
          Math.min(1, Math.max(0, available) / Math.max(1, title.scrollWidth))
        ),
      ])
    }
    if (!selectedItem.value)
      for (const title of itemTitles.values())
        scales.push([
          title,
          String(
            title.parentElement!.clientWidth / Math.max(1, title.scrollWidth)
          ),
        ])
  }
  // 先完成所有尺寸读取，再批量写样式，避免标题间交错触发布局计算。
  for (const [title, scale] of scales) {
    if (titleScales.get(title) === scale) continue
    title.style.setProperty('--island-title-scale', scale)
    titleScales.set(title, scale)
  }
  linkOverlay.updateOrigins(next)
}
const scheduleMeasure = () => {
  if (disposed || measureFrame !== undefined) return
  measureFrame = requestAnimationFrame(() => {
    measureFrame = undefined
    measure(titlesNeedMeasure)
    titlesNeedMeasure = false
  })
}
let titlesNeedMeasure = false
const scheduleLayoutMeasure = () => {
  titlesNeedMeasure = true
  scheduleMeasure()
}
useResizeObserver(root, scheduleLayoutMeasure)
useResizeObserver(
  Object.keys(islandAnchorByItem).map((id) => computed(() => panels.get(id))),
  scheduleLayoutMeasure
)

watch([root, locale, () => props.mobile], scheduleLayoutMeasure, {
  flush: 'post',
})
onMounted(() => {
  unsubscribeCardPointer = subscribePointerSamples((event) => {
    if (event.pointerType === 'touch' || !canHover.value || reducedMotion())
      return
    cardParallaxMotion = gsap.to(cardParallax, {
      x: gsap.utils.clamp(-1, 1, (event.clientX / innerWidth - 0.5) * 2) * -12,
      y: gsap.utils.clamp(-1, 1, (event.clientY / innerHeight - 0.5) * 2) * -8,
      duration: 0.7,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: writeCardParallax,
    })
  }, 1000 / 30)
  scheduleLayoutMeasure()
  void document.fonts.ready.then(scheduleLayoutMeasure)
  if (!islandModuleAtPath(route.path) && !reducedMotion()) {
    opening.value = true
    void waitMotion(ISLAND_OPENING_DURATION + 0.05).then(() => {
      if (!disposed) {
        opening.value = false
        scheduleMeasure()
      }
    })
  }
})
const baseLinks = computed(() =>
  groups.value.flatMap((group) =>
    group.items.map((item) => ({
      id: item.subtitle,
      group: group.id,
      item,
    }))
  )
)
const linksById = computed(
  () => new Map(baseLinks.value.map((link) => [link.id, link]))
)
const links = computed(() => {
  const active =
    hoveredItem.value && linksById.value.get(hoveredItem.value.item)
  return active
    ? [...baseLinks.value.filter((link) => link !== active), active]
    : baseLinks.value
})

const animations = new Set<Animation>()
const titleHoverAnimations = new Set<Animation>()
watch([() => hoveredItem.value?.item, canHover], ([item, enabled]) => {
  titleHoverAnimations.forEach((animation) => animation.cancel())
  titleHoverAnimations.clear()
  if (!item || !enabled || reducedMotion()) return
  const title = itemTitles.get(item)
  if (!title) return
  const animation = title.animate(
    [0, 1, 0, 1, 1].map((opacity, index) => ({
      opacity,
      offset: index / 4,
      easing: 'steps(1, end)',
    })),
    { duration: 160 }
  )
  titleHoverAnimations.add(animation)
  void animation.finished
    .catch(() => undefined)
    .finally(() => titleHoverAnimations.delete(animation))
})
const returnFromHeader = async (event: Event) => {
  if (!selectedItem.value || busy.value || phase.value !== 'detail') return
  const element = event.currentTarget as HTMLElement
  busy.value = true
  const animation = flashActionButton(element, 240, { colorOnly: true })
  try {
    if (animation) {
      animations.add(animation)
      await animation.finished
    }
    if (!disposed) closeDetail()
  } catch {
    // 卸载时取消闪烁，不再发起路由跳转。
  } finally {
    if (animation) animations.delete(animation)
    if (!disposed && phase.value === 'detail') busy.value = false
  }
}
const openItem = async (item: HarborItem, group: string) => {
  if (!canHover.value) return
  busy.value = true
  const intent = ++transitionRevision
  transitionItem.value = { group, item: item.subtitle as IslandModuleId }
  phase.value = 'leaving'
  const targets =
    root.value?.querySelectorAll<HTMLElement>(
      `[data-flash-header="${group}"], [data-flash-item="${item.subtitle}"], [data-link-item="${item.subtitle}"]`
    ) || []
  try {
    await Promise.all(
      Array.from(targets, (element) => {
        const animation = flashActionButton(element, 240, { colorOnly: true })
        if (!animation) return Promise.resolve()
        animations.add(animation)
        return animation.finished.finally(() => animations.delete(animation))
      })
    )
    if (!disposed && intent === transitionRevision)
      await router.push(islandModules[item.subtitle as IslandModuleId].path)
  } catch {
    // 离场或组件卸载会取消闪烁，不再触发滞后的导航。
  } finally {
    if (intent === transitionRevision && !islandModuleAtPath(route.path))
      busy.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  unsubscribeCardPointer?.()
  cardParallaxMotion?.kill()
  transitionRevision++
  for (const [timer, resolve] of timers) {
    clearTimeout(timer)
    resolve()
  }
  timers.clear()
  if (measureFrame !== undefined) cancelAnimationFrame(measureFrame)
  linkOverlay.dispose()
  layoutMotion?.kill()
  animations.forEach((animation) => animation.cancel())
  titleHoverAnimations.forEach((animation) => animation.cancel())
})
</script>

<template>
  <div
    ref="root"
    class="island-focus no-rem"
    :class="{
      'is-mobile': mobile,
      'has-detail': selectedItem,
      'has-detail--right': selectedItem && detailSide === 'right',
      'has-collections-expanded': collectionsExpanded,
      'is-hover-disabled': !canHover,
    }"
    :data-detail-item="selectedItem?.item"
    :data-detail-phase="phase"
    :data-opening="opening"
    :data-overview-leaving="overviewLeaving"
    :data-detail-side="selectedItem ? detailSide : undefined"
    :style="{ '--island-cover-filter': `url(#${coverFilterId})` }"
    @pointermove="armHover"
  >
    <svg width="0" height="0" class="island-filter-defs" aria-hidden="true">
      <defs>
        <filter :id="coverFilterId" color-interpolation-filters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" :slope="226 / 255" />
            <feFuncG type="linear" :slope="52 / 255" />
            <feFuncB type="linear" :slope="86 / 255" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
    <div class="island-detail-shade" aria-hidden="true" />
    <div class="island-panels" :aria-hidden="!selectedItem || undefined">
      <div
        class="island-reserved island-reserved--left"
        data-island-reserved="left"
      />
      <div
        class="island-reserved island-reserved--right"
        data-island-reserved="right"
      />
      <section
        v-for="group in groups"
        v-show="!selectedItem || selectedItem.group === group.id"
        :key="group.id"
        class="island-window"
        :class="`island-window--${group.id}`"
        :data-island-group="group.id"
      >
        <header
          class="island-window__bar"
          :class="[
            groupTransitionClass(group.id),
            {
              'is-active':
                hovered === group.id || selectedItem?.group === group.id,
              'is-blurred':
                canHover && hoveredItem && hoveredItem.group !== group.id,
              'is-detail-return': selectedItem && !busy,
            },
          ]"
          :data-flash-header="group.id"
          :role="selectedItem ? 'button' : undefined"
          :tabindex="selectedItem ? 0 : undefined"
          @click.stop="returnFromHeader"
          @keydown.enter.stop.prevent="returnFromHeader"
          @keydown.space.stop.prevent="returnFromHeader"
        >
          <span class="island-window__glyph" aria-hidden="true">{{
            group.id === 'interests' ? '◀' : '▶'
          }}</span>
          <h2 :ref="titleBindings.get(group.id)" :data-title="group.label">
            {{ group.label }}
          </h2>
        </header>
        <div class="island-window__body">
          <figure
            v-for="item in group.items"
            v-show="!selectedItem || selectedItem.item === item.subtitle"
            :key="item.subtitle"
            :ref="panelBindings.get(item.subtitle)"
            class="island-item"
            :class="[
              itemTransitionClass(item.subtitle),
              {
                'is-active':
                  hoveredItem?.item === item.subtitle ||
                  selectedItem?.item === item.subtitle,
                'is-blurred':
                  canHover && hoveredItem && hoveredItem.item !== item.subtitle,
                'is-detail-return': selectedItem && !busy,
              },
            ]"
            :data-flash-item="item.subtitle"
            :style="openingStyle(item.subtitle)"
            :role="selectedItem ? 'button' : undefined"
            :tabindex="selectedItem ? 0 : undefined"
            @click.stop="returnFromHeader"
            @keydown.enter.stop.prevent="returnFromHeader"
            @keydown.space.stop.prevent="returnFromHeader"
          >
            <span
              v-if="item.placeholder || failedCovers.has(item.img)"
              class="island-placeholder"
              >{{ item.placeholder ? 'WIP' : item.subtitle }}</span
            >
            <picture v-else>
              <source media="(max-width: 768px)" :srcset="item.mobileSrc" />
              <img
                :src="item.desktopSrc"
                alt=""
                loading="lazy"
                decoding="async"
                @error="failedCovers.add(item.img)"
              />
            </picture>
            <figcaption>
              <strong class="island-item__title"
                ><span
                  :ref="itemTitleBindings.get(item.subtitle)"
                  class="island-item__title-text"
                  ><template v-if="selectedItem">{{ item.label }}</template
                  ><template v-else
                    ><span
                      v-for="(letter, index) in item.titleCharacters"
                      :key="index"
                      class="island-item__title-character"
                      :style="{ '--island-character-mask': letter.maskImage }"
                      >{{
                        letter.character === ' ' ? '\u00a0' : letter.character
                      }}</span
                    ></template
                  ></span
                ></strong
              >
              <SectionCount
                class="island-item__count"
                :count="item.countValue"
                :label="item.countLabel"
                :align="
                  !selectedItem &&
                  ['NOTES', 'LABORATORY'].includes(item.subtitle)
                    ? 'left'
                    : 'right'
                "
              />
            </figcaption>
          </figure>
        </div>
        <button
          v-if="
            selectedItem?.item === 'COLLECTIBLES' &&
            selectedItem.group === group.id &&
            detailContentReady
          "
          class="island-detail-expand"
          type="button"
          :aria-label="collectionsExpanded ? '恢复半屏内容' : '展开全屏内容'"
          :aria-expanded="collectionsExpanded"
          :disabled="busy || detailResizing"
          @click.stop="toggleCollectionsExpanded"
        >
          <span />
        </button>
        <Transition name="island-detail-reveal" appear>
          <div
            v-if="
              selectedItem?.group === group.id &&
              phase === 'detail' &&
              detailContentReady
            "
            class="island-detail"
            :inert="detailResizing || undefined"
          >
            <ScrollViewport
              class="island-detail__viewport"
              :edge-fade="selectedItem.item === 'COLLECTIBLES'"
            >
              <IslandNotesContent v-if="selectedItem.item === 'NOTES'" />
              <IslandCollectionsContent
                v-else-if="selectedItem.item === 'COLLECTIBLES'"
                :expanded="collectionsExpanded"
                :mobile="mobile"
              />
              <NotFoundContent
                v-else
                embedded
                :action-label="locale === 'en' ? 'BACK' : '返回模块总览'"
                @return-home="closeDetail"
              />
            </ScrollViewport>
          </div>
        </Transition>
      </section>
    </div>
    <svg
      v-show="phase === 'overview' || phase === 'detail'"
      :ref="linkOverlay.bindViewport"
      class="island-links"
      :aria-label="
        locale === 'en' ? 'Model module shortcuts' : '模型模块快捷入口'
      "
    >
      <g
        v-for="link in links"
        v-show="!selectedItem || selectedItem.item === link.id"
        :key="link.id"
        :ref="linkBindings.get(link.id)"
        :data-link-group="link.group"
        :data-link-item="link.id"
        :data-flash-group="link.id"
        :class="{
          'is-active': canHover && hoveredItem?.item === link.id,
          'is-detail': selectedItem?.item === link.id,
        }"
      >
        <line />
        <g
          class="island-anchor"
          :role="selectedItem ? 'img' : 'button'"
          :tabindex="canHover ? 0 : -1"
          :aria-label="link.item.label"
          :aria-disabled="!canHover"
          :data-island-anchor="link.id"
          @pointerenter="hoverItem(link.group, link.id)"
          @pointerleave="hoveredItem = null"
          @focus="setHovered(link.group, link.id)"
          @blur="hoveredItem = null"
          @click.stop="openItem(link.item, link.group)"
          @keydown.enter.stop.prevent="openItem(link.item, link.group)"
          @keydown.space.stop.prevent="openItem(link.item, link.group)"
        >
          <rect
            x="-24"
            y="-24"
            width="48"
            height="48"
            class="island-anchor__hit"
          />
          <path
            v-for="layer in 4"
            :key="layer"
            d="M-20 -10 V-20 H-10 M10 -20 H20 V-10 M20 10 V20 H10 M-10 20 H-20 V10"
            class="island-anchor__merge"
            :style="{
              '--merge-scale': 2.8 - (layer - 1) * 0.5,
            }"
            aria-hidden="true"
          />
          <g class="island-anchor__frame">
            <path
              d="M-20 -10 V-20 H-10 M10 -20 H20 V-10 M20 10 V20 H10 M-10 20 H-20 V10"
              class="island-anchor__corners"
            />
          </g>
        </g>
      </g>
    </svg>
    <!-- 视觉层在画布之后；独立透明按钮保留键盘和点击操作，不改变模型的绘制顺序。 -->
    <nav
      v-show="!selectedItem && phase === 'overview'"
      class="island-targets"
      :aria-label="locale === 'en' ? 'Atrium modules' : '个人海湾模块'"
    >
      <section
        v-for="group in groups"
        :key="group.id"
        class="island-window"
        :class="`island-window--${group.id}`"
        :aria-label="group.label"
      >
        <header class="island-window__bar" aria-hidden="true">
          <span>{{ group.id === 'interests' ? '◀' : '▶' }}</span
          ><span>{{ group.label }}</span>
        </header>
        <div class="island-window__body">
          <button
            v-for="item in group.items"
            :key="item.subtitle"
            class="island-item island-target"
            type="button"
            :aria-label="item.label"
            :disabled="!canHover"
            :data-island-item="item.subtitle"
            @pointerenter="hoverItem(group.id, item.subtitle)"
            @pointerleave="hoveredItem = null"
            @focus="setHovered(group.id, item.subtitle)"
            @blur="hoveredItem = null"
            @click.stop="openItem(item, group.id)"
          >
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>
    </nav>
  </div>
</template>

<style scoped lang="less">
.island-focus.no-rem {
  position: absolute;
  inset: 0;
  pointer-events: none;
  --island-base: #e23456;
  --island-inverse: #1dcba9;
  --island-inline-inset: var(--temple-content-inset, 24px);
  --island-content-top: max(
    124px,
    calc(var(--layout-header-bottom, 0px) + 24px)
  );
  --island-card-gap: 24px;
  --island-title-size: 72px;
  --island-bar-height: 28px;
  --island-reserved-height: clamp(64px, 12svh, 120px);
  --island-title-overflow: calc(var(--island-title-size) / 2);
  .island-filter-defs {
    position: absolute;
  }
  .island-detail-shade {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: rgba(8, 8, 10, 0.94);
    opacity: 0;
    pointer-events: none;
    transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  &.has-collections-expanded .island-detail-shade {
    opacity: 1;
  }
  .island-panels,
  .island-targets {
    position: absolute;
    inset: var(--island-content-top) var(--island-inline-inset)
      var(--temple-panel-bottom, 64px);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: var(--island-reserved-height) repeat(2, minmax(0, 1fr));
    gap: 16px clamp(96px, 18vw, 280px);
    pointer-events: none;
  }
  .island-panels {
    z-index: auto;
    .island-window__bar,
    .island-item {
      container-type: inline-size;
      opacity: 0.75;
      transition: filter 180ms ease;
      &.is-blurred {
        filter: brightness(0.6) saturate(0);
      }
      &.is-active {
        opacity: 1;
      }
    }
    .island-item {
      container-type: size;
    }
  }
  .island-targets {
    translate: var(--island-parallax-x, 0px) var(--island-parallax-y, 0px);
    z-index: 3;
  }
  .island-reserved {
    min-width: 0;
    min-height: 0;
    &--left {
      grid-area: 1 / 1;
    }
    &--right {
      grid-area: 1 / 2;
    }
  }
  .island-window {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--island-card-gap);
    min-width: 0;
    min-height: 0;
    color: var(--island-base);
    background: transparent;
    &--ideas {
      grid-area: 2 / 1 / 4 / 2;
    }
    &--interests {
      grid-area: 2 / 2 / 4 / 3;
    }
    &__bar {
      position: relative;
      display: flex;
      align-items: center;
      height: var(--island-bar-height);
      flex: 0 0 var(--island-bar-height);
      margin-top: var(--island-title-overflow);
      padding: 0 8px;
      gap: 10px;
      border: 1px solid currentColor;
      box-sizing: border-box;
      background: transparent;
      white-space: nowrap;
      &::after {
        position: absolute;
        inset: -1px;
        z-index: 1;
        border: 1px solid currentColor;
        border-top: 0;
        content: '';
        pointer-events: none;
      }
      &.is-active {
        color: var(--island-inverse);
        h2::after {
          -webkit-text-fill-color: currentColor;
          -webkit-text-stroke: 0;
        }
      }
      h2 {
        position: relative;
        align-self: flex-start;
        margin: 0;
        flex: none;
        font: 400 var(--island-title-size) / 1 'UnboundedSans', sans-serif;
        transform-origin: left center;
        transform: translateY(calc(-40% - 10px))
          scaleX(var(--island-title-scale, 1));
        clip-path: inset(
          0 0
            max(
              0px,
              calc(
                var(--island-title-size) * 0.6 - var(--island-bar-height) - 9px
              )
            )
            0
        );
        color: inherit;
        -webkit-text-fill-color: #000;
        -webkit-text-stroke: 0;
        &::after {
          content: attr(data-title);
          position: absolute;
          inset: 0;
          color: inherit;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 2px currentColor;
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000,
            rgb(0 0 0 / 40%)
          );
          mask-image: linear-gradient(to bottom, #000, rgb(0 0 0 / 40%));
          pointer-events: none;
        }
      }
    }
    &__glyph {
      font: 400 16px/1 'Anton', sans-serif;
    }
    &__body {
      display: grid;
      flex: 1;
      min-height: 0;
      grid-auto-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
      gap: var(--island-card-gap);
      border: 0;
    }
  }
  .island-item {
    --section-accent-color: currentColor;
    --island-item-title-size: clamp(24px, 2.1vw, 36px);
    position: relative;
    min-height: 0;
    min-width: 0;
    margin: 0;
    border: 1px solid currentColor;
    box-sizing: border-box;
    overflow: hidden;
    &.is-active {
      color: var(--island-inverse);
      picture {
        opacity: 1;
      }
      img {
        filter: none;
      }
    }
    picture {
      position: absolute;
      inset: -20px;
      display: block;
      width: calc(100% + 40px);
      height: calc(100% + 40px);
      opacity: 0.75;
      &::after {
        position: absolute;
        inset: 0;
        content: '';
        background: repeating-linear-gradient(
          to bottom,
          transparent 0 2px,
          rgba(0, 0, 0, 0.58) 2px 4px
        );
        pointer-events: none;
      }
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(1.25) contrast(1.2) var(--island-cover-filter);
    }
    figcaption {
      position: absolute;
      inset: 8px 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 6px;
      pointer-events: none;
    }
    .island-item__title {
      grid-area: 1 / 1 / 2 / 3;
      min-width: 0;
      width: 100%;
      align-self: start;
      justify-self: start;
      font: 400 clamp(20px, 18cqw, 68px) / 1 'Anton', sans-serif;
      letter-spacing: -0.015em;
      .island-item__title-text {
        display: block;
        width: max-content;
        white-space: nowrap;
        transform: translateX(-2px) scale(var(--island-title-scale, 1), 1.35);
        transform-origin: left top;
      }
      .island-item__title-character {
        display: inline-block;
        mask-image: var(--island-character-mask);
        -webkit-mask-image: var(--island-character-mask);
      }
    }
    .island-item__count {
      grid-area: 2 / 1 / 3 / 3;
      container-type: inline-size;
      width: 100%;
      max-width: 100%;
      justify-self: stretch;
      align-self: end;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 2px;
      transform: scaleY(0.72);
      transform-origin: center bottom;
      :deep(strong),
      :deep(small) {
        font-family: 'Anton', sans-serif;
        color: color-mix(in srgb, var(--section-accent-color) 58%, transparent);
      }
      :deep(small) {
        letter-spacing: -0.02em;
      }
      :deep(small),
      :deep(strong) {
        font-size: clamp(4px, 12cqw, 68px);
      }
    }
  }
  .island-window--interests .island-window__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .island-window--ideas .island-window__body {
    grid-template-rows: minmax(0, 0.6fr) minmax(0, 1.4fr);
  }
  &:not(.has-detail) {
    .island-item[data-flash-item='NOTES'],
    .island-item[data-island-item='NOTES'] {
      margin-bottom: clamp(24px, 6svh, 64px);
    }
  }
  @container (max-height: 125px) {
    &:not(.has-detail) .island-item__title {
      font-size: clamp(12px, 30cqh, 68px);
    }
    &:not(.has-detail) .island-item__count {
      :deep(strong),
      :deep(small) {
        font-size: clamp(4px, 25cqh, 68px);
      }
    }
  }
  .island-window--interests .island-window__bar {
    flex-direction: row-reverse;
    h2 {
      transform-origin: right center;
    }
  }
  &:not(.has-detail) .island-panels {
    .island-window__bar,
    .island-item {
      translate: var(--island-parallax-x, 0px) var(--island-parallax-y, 0px);
      will-change: translate;
    }
    .island-item.is-active {
      z-index: 2;
    }
    .island-window--ideas .island-window__bar,
    .island-window--ideas .island-item {
      --island-edge-mask: linear-gradient(
        to left,
        rgb(0 0 0 / 40%),
        #000 min(80px, 28%)
      );
    }
    .island-window--interests .island-window__bar,
    .island-item[data-flash-item='GAME LIBRARY'] {
      --island-edge-mask: linear-gradient(
        to right,
        rgb(0 0 0 / 40%),
        #000 min(80px, 28%)
      );
    }
    .island-window__bar,
    .island-item {
      mask-image: var(--island-edge-mask, none);
      -webkit-mask-image: var(--island-edge-mask, none);
    }
    .island-window__bar {
      // 渐隐覆盖外溢标题，避免遮罩把原来的上溢字形裁掉。
      mask-size: 100% calc(100% + 2 * var(--island-title-size));
      -webkit-mask-size: 100% calc(100% + 2 * var(--island-title-size));
      mask-position: center;
      -webkit-mask-position: center;
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
      mask-clip: no-clip;
      -webkit-mask-clip: no-clip;
    }
  }
  .island-targets {
    .island-window {
      pointer-events: none;
    }
    .island-window__bar {
      visibility: hidden;
    }
    .island-window__body {
      border-color: transparent;
    }
    .island-target {
      padding: 0;
      border: 1px solid transparent !important;
      background: transparent;
      color: inherit;
      cursor: pointer;
      pointer-events: auto;
      span {
        opacity: 0;
      }
      &:focus-visible {
        outline: 2px solid var(--island-inverse) !important;
        outline-offset: -3px;
      }
    }
  }
  &.is-hover-disabled {
    .island-links .island-anchor,
    .island-links .island-anchor__hit {
      pointer-events: none;
    }
  }
  .island-links {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    // 包络包含端点与描边；限制动态 SVG 的绘制范围，静态卡片保留独立层级。
    contain: strict;
    overflow: hidden;
    pointer-events: none;
    g[data-link-group] {
      color: var(--island-base);
      &.is-active {
        color: var(--island-inverse);
        line,
        .island-anchor__frame {
          opacity: 1;
          animation: island-link-flash 240ms steps(1, end) both;
        }
        .island-anchor {
          opacity: 1;
          animation: none;
        }
        .island-anchor__merge {
          animation: island-anchor-merge 420ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
      }
    }
    g[data-link-group].is-detail {
      color: #27efbd;
      .island-anchor {
        --island-anchor-opacity: 0.85;
        opacity: var(--island-anchor-opacity);
        pointer-events: none;
      }
      .island-anchor__frame {
        transform: scale(1.8);
        filter: drop-shadow(0 0 4px rgb(39 239 189 / 45%));
      }
      line {
        opacity: 0;
      }
    }
    line,
    rect,
    path {
      fill: none;
      stroke: currentColor;
      vector-effect: non-scaling-stroke;
    }
    line {
      stroke-width: 1;
      opacity: 0;
      pointer-events: none;
    }
    .island-anchor {
      opacity: var(--island-anchor-opacity, 0.5);
      animation: island-anchor-blink 5200ms steps(1, end) infinite;
      pointer-events: auto;
      cursor: pointer;
      &:focus-visible {
        outline: 1px solid var(--island-inverse);
        outline-offset: 4px;
      }
    }
    .island-anchor__hit {
      fill: transparent;
      stroke: none;
      pointer-events: all;
    }
    .island-anchor__merge {
      opacity: 0;
      stroke-width: 1;
      transform-box: fill-box;
      transform-origin: center;
      pointer-events: none;
    }
    .island-anchor__corners {
      stroke-width: 2;
    }
  }
  @keyframes island-link-flash {
    0%,
    40%,
    80%,
    100% {
      opacity: 1;
    }
    20%,
    60% {
      opacity: 0;
    }
  }
  @keyframes island-anchor-blink {
    0%,
    4%,
    8%,
    50%,
    54%,
    58%,
    100% {
      opacity: var(--island-anchor-opacity, 0.5);
    }
    2%,
    6%,
    10%,
    49%,
    52%,
    56% {
      opacity: 0;
    }
  }
  @keyframes island-anchor-merge {
    0% {
      opacity: 0.85;
      transform: scale(var(--merge-scale));
    }
    70% {
      opacity: 0.65;
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .island-panels .island-window__bar,
    .island-panels .island-item {
      transition: none;
    }
    .island-links .island-anchor,
    .island-links g[data-link-group].is-active line,
    .island-links g[data-link-group].is-active .island-anchor,
    .island-links g[data-link-group].is-active .island-anchor__frame,
    .island-links g[data-link-group].is-active .island-anchor__merge {
      animation: none;
    }
  }
  &.is-mobile {
    --island-inline-inset: var(--temple-mobile-content-inset, 24px);
    --island-content-top: 114px;
    --island-card-gap: 18px;
    --island-title-size: 60px;
    --island-bar-height: 26px;
    .island-window--ideas .island-window__body {
      grid-template-rows: minmax(0, 0.4fr) minmax(0, 1.6fr);
    }
    .island-panels,
    .island-targets {
      gap: 12px clamp(56px, 16vw, 100px);
    }
    .island-window__bar {
      padding: 0 5px;
      gap: 5px;
    }
    figcaption {
      inset-inline: 5px;
    }
  }
  @media (max-height: 950px) {
    &:not(.has-detail):not(.is-mobile)
      .island-window--ideas
      .island-window__body {
      grid-template-rows: minmax(0, 0.5fr) minmax(0, 1.5fr);
    }
  }
  @media (max-height: 760px) {
    &:not(.has-detail):not(.is-mobile)
      .island-window--ideas
      .island-window__body {
      grid-template-rows: minmax(0, 0.3fr) minmax(0, 1.7fr);
    }
    &.is-mobile:not(.has-detail) {
      .island-window {
        margin-top: -24px;
        height: calc(100% + 24px);
      }
      .island-window--ideas .island-window__body {
        grid-template-rows: minmax(0, 0.34fr) minmax(0, 1.66fr);
      }
    }
  }
  &[data-detail-phase='leaving'],
  &[data-detail-phase='restoring'],
  &[data-detail-phase='revealing'] {
    .island-targets,
    .island-links {
      pointer-events: none;
    }
    .island-target,
    .island-anchor {
      pointer-events: none;
    }
  }
  .is-transition-hidden {
    visibility: hidden;
  }
  .crt-effect-leave-active {
    animation: anutriumCrtOff 0.24s cubic-bezier(0.2, 1, 0.22, 1) both;
  }
  .crt-effect-enter-active {
    animation: anutriumCrtOn 0.46s cubic-bezier(0.19, 1, 0.22, 1) both;
  }
  .island-item.crt-effect-enter-active {
    animation-delay: var(--island-open-delay, 0s);
  }
  &[data-overview-leaving='true'] .island-item.crt-effect-leave-active {
    animation-delay: var(--island-open-delay, 0s);
  }
  .island-placeholder {
    display: grid;
    height: 100%;
    place-items: center;
    font: 400 clamp(32px, 9vw, 120px) / 1 'Anton', sans-serif;
    opacity: 0.4;
  }
  &.has-detail {
    .island-links {
      z-index: 4;
    }
    .island-reserved {
      display: none;
    }
    .island-panels {
      display: block;
      z-index: 3;
    }
    .island-window {
      position: absolute;
      inset: 0 0 0 auto;
      width: 62%;
      display: grid;
      grid-template-columns: minmax(0, 0.325fr) minmax(0, 1.325fr);
      grid-template-rows: 76px minmax(0, 1fr);
      gap: 18px 16px;
    }
    .island-window__bar {
      grid-area: 1 / 1;
      margin: 0;
      height: 100%;
      min-width: 0;
      align-items: center;
      opacity: 1;
      h2 {
        align-self: center;
        font-size: clamp(24px, 2.9vw, 48px);
        transform: translateY(-3px) scaleX(var(--island-title-scale, 1));
        clip-path: none;
        -webkit-text-fill-color: currentColor;
        &::after {
          mask-image: none;
          -webkit-mask-image: none;
        }
      }
    }
    .is-detail-return {
      pointer-events: auto;
      cursor: pointer;
      &:hover,
      &:focus-visible {
        color: #e23456;
      }
    }
    .island-window__body {
      display: contents;
    }
    .island-item {
      grid-area: 1 / 2;
      opacity: 1;
      picture,
      .island-placeholder {
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      figcaption {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        inset: 0;
        padding: 0 20px;
      }
      .island-item__title {
        align-self: center;
        text-align: left;
        width: auto;
        font-family: 'alibaba-puhuiti', sans-serif;
        font-weight: 900;
        letter-spacing: normal;
        .island-item__title-text {
          transform: none;
          mask-image: none;
          -webkit-mask-image: none;
          width: auto;
          white-space: normal;
        }
        font-size: clamp(24px, 2.2vw, 36px);
      }
      .island-item__count {
        color: inherit;
        container-type: normal;
        align-self: center;
        flex: none;
        display: inline-grid;
        width: auto;
        gap: 3.3px;
        transform: none;
        :deep(small),
        :deep(strong) {
          font-size: clamp(12px, 1.6vw, 24px);
          letter-spacing: normal;
          color: inherit;
        }
      }
    }
    .island-detail {
      grid-area: 2 / 1 / 3 / -1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      pointer-events: auto;
      color: var(--text-color);
      container-type: inline-size;
    }
    .island-detail__viewport {
      :deep(.scroll-viewport__scroll) {
        padding-right: 0;
        outline: none;
      }
      :deep(.scroll-viewport__scroll > div) {
        min-height: 100%;
      }
      :deep(.not-found-page.is-embedded) {
        min-height: 280px;
        height: 100%;
      }
    }
    &.has-detail--right .island-window {
      inset: 0 auto 0 0;
    }
    .island-detail-expand {
      position: absolute;
      right: -48px;
      top: 50%;
      width: 28px;
      height: 44px;
      padding: 0;
      border: 0;
      display: grid;
      place-items: center;
      background: transparent;
      color: var(--island-inverse);
      cursor: pointer;
      pointer-events: auto;
      transition: scale 0.25s ease;
      &:hover {
        scale: 1.5;
      }
      &:focus-visible {
        outline: 1px solid currentColor;
      }
      span {
        width: 0;
        height: 0;
        border-top: 11px solid transparent;
        border-bottom: 11px solid transparent;
        border-left: 12px solid currentColor;
        transition: transform 0.3s ease;
      }
    }
    &.has-collections-expanded {
      .island-window {
        width: 100%;
      }
      .island-detail-expand {
        right: calc(-0.5 * var(--island-inline-inset) - 14px);
        span {
          transform: rotate(180deg);
        }
      }
      .island-links {
        visibility: hidden;
      }
    }
    &.is-mobile {
      .island-window {
        width: 70%;
        grid-template-columns: minmax(0, 0.325fr) minmax(0, 1.325fr);
        grid-template-rows: 62px minmax(0, 1fr);
        gap: 12px 6px;
      }
      &.has-collections-expanded .island-window {
        width: 100%;
      }
      .island-detail-expand {
        right: -32px;
      }
      &.has-collections-expanded .island-detail-expand {
        right: calc(-0.5 * var(--island-inline-inset) - 14px);
      }
      .island-window__glyph {
        display: block;
        font-size: 7px;
      }
      .island-window__bar {
        padding: 0 4px;
      }
      .island-item figcaption {
        gap: 8px;
        padding: 0 16px;
      }
      .island-item__title {
        font-size: 18px;
      }
      .island-item__count {
        :deep(strong),
        :deep(small) {
          font-size: 12px;
        }
      }
    }
  }
}
.island-detail-reveal-enter-active {
  transition: opacity 0.4s ease;
}
.island-detail-reveal-leave-active {
  // 退场正文退出布局后再测量卡片终点，避免把正文占用的高度算进动画。
  position: absolute;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.island-detail-reveal-enter-from,
.island-detail-reveal-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .island-focus .crt-effect-leave-active,
  .island-focus .crt-effect-enter-active {
    animation: none;
  }
  .island-focus .island-detail-shade,
  .island-detail-reveal-enter-active,
  .island-detail-reveal-leave-active {
    transition: none;
  }
}
</style>
