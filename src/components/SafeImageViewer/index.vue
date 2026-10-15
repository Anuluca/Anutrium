<template>
  <ElImageViewer
    :url-list="urlList"
    :initial-index="initialIndex"
    :z-index="zIndex"
    :hide-on-click-modal="hideOnClickModal"
    :teleported="teleported"
    @close="handleClose"
    @switch="handleSwitch"
  >
    <div ref="corners" class="safe-image-viewer__corners" aria-hidden="true" />
    <template #toolbar="{ actions, reset }">
      <button
        v-for="tool in tools"
        :key="tool.action"
        type="button"
        class="safe-image-viewer__tool"
        :class="{ 'is-fit-toggle': tool.action === 'reset' }"
        :aria-label="tool.label"
        @click="
          onToolClick($event, () =>
            tool.action === 'reset' ? reset() : actions(tool.action)
          )
        "
      >
        <ElIcon><component :is="tool.icon" /></ElIcon>
      </button>
    </template>
  </ElImageViewer>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FullScreen,
  RefreshLeft,
  RefreshRight,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
import { ElIcon, ElImageViewer } from 'element-plus'

import { useOverlayScrollLock } from '@/composables/useOverlayScrollLock'
import { flashActionButton } from '@/utils/flashActionButton'
import { bindImageViewerTouch } from '@/utils/imageViewerTouch'
import { createScanlineMask } from '@/utils/scanlineMask'

import 'element-plus/theme-chalk/dark/css-vars.css'

import 'element-plus/es/components/image-viewer/style/css'

const props = withDefaults(
  defineProps<{
    hideOnClickModal?: boolean
    initialIndex?: number
    teleported?: boolean
    urlList: string[]
    zIndex?: number
  }>(),
  {
    hideOnClickModal: true,
    initialIndex: 0,
    teleported: true,
    zIndex: 10010,
  }
)

const emit = defineEmits<{
  close: []
}>()
const { locale } = useI18n()
const onToolClick = (event: MouseEvent, action: () => void) => {
  flashActionButton(event.currentTarget as HTMLElement, 180)
  action()
}
const corners = ref<HTMLElement | null>(null)
let cornerStyle: CSSProperties = { display: 'none' }
let decoratedImage: HTMLImageElement | null = null
let wrapper: HTMLElement | null = null
let image: HTMLImageElement | null = null
let mutationObserver: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let navigationObserver: ResizeObserver | undefined
let unbindTouch: (() => void) | undefined
let activeIndex = props.initialIndex
let requestedDirection = 0
let switchVersion = 0
let outgoingImage: HTMLImageElement | null = null
const switchAnimations = new Set<Animation>()
const clearSwitchAnimations = () => {
  for (const animation of switchAnimations) animation.cancel()
  switchAnimations.clear()
  outgoingImage?.remove()
  outgoingImage = null
}
const recordSwitchDirection = (event: Event) => {
  if (event instanceof KeyboardEvent) {
    if (event.key === 'ArrowLeft') requestedDirection = -1
    if (event.key === 'ArrowRight') requestedDirection = 1
  } else if (event.target instanceof Element) {
    if (event.target.closest('.el-image-viewer__prev')) requestedDirection = -1
    if (event.target.closest('.el-image-viewer__next')) requestedDirection = 1
  }
}
const handleSwitch = async (index: number) => {
  wrapper?.classList.remove('is-image-zoomed')
  wrapper?.classList.remove('is-hover-dimmed')
  const version = ++switchVersion
  const direction =
    requestedDirection ||
    (index === (activeIndex + 1) % props.urlList.length ? 1 : -1)
  requestedDirection = 0
  activeIndex = index
  clearSwitchAnimations()
  if (!wrapper || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const oldImage = wrapper.querySelector<HTMLImageElement>(
    '.el-image-viewer__img'
  )
  if (oldImage?.naturalWidth) {
    outgoingImage = oldImage.cloneNode() as HTMLImageElement
    outgoingImage.className = 'safe-image-viewer__outgoing-image'
    outgoingImage.setAttribute('aria-hidden', 'true')
    Object.assign(outgoingImage.style, {
      position: 'absolute',
      left: `${oldImage.offsetLeft}px`,
      top: `${oldImage.offsetTop}px`,
      width: `${oldImage.offsetWidth}px`,
      height: `${oldImage.offsetHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      pointerEvents: 'none',
      transform: getComputedStyle(oldImage).transform,
    })
    oldImage.parentElement?.append(outgoingImage)
  }
  await nextTick()
  const incoming = wrapper?.querySelector<HTMLImageElement>(
    '.el-image-viewer__img'
  )
  if (!incoming) return
  try {
    await incoming.decode()
  } catch {
    /* 图片加载失败时保留组件原有错误展示。 */
  }
  if (
    version !== switchVersion ||
    !wrapper?.isConnected ||
    closeTimer !== undefined
  )
    return
  syncCorners()
  const vertical = window.matchMedia('(max-width: 768px)').matches
  const distance =
    Math.min(vertical ? incoming.offsetHeight : incoming.offsetWidth, 160) *
    direction
  const offset = (value: number) => (vertical ? `0 ${value}px` : `${value}px 0`)
  // 使用独立 translate 动画，避免覆盖缩放、旋转、拖动使用的 transform。
  const animate = (element: HTMLElement, frames: Keyframe[]) => {
    const animation = element.animate(frames, {
      duration: 380,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    })
    switchAnimations.add(animation)
    return animation.finished
      .catch(() => {})
      .finally(() => {
        animation.cancel()
        switchAnimations.delete(animation)
      })
  }
  const previous = outgoingImage
  if (previous)
    void animate(previous, [
      { translate: '0 0', opacity: 1 },
      { translate: offset(-distance), opacity: 0 },
    ]).then(() => previous.remove())
  if (corners.value)
    void animate(corners.value, [
      { translate: offset(distance), opacity: 0 },
      { translate: '0 0', opacity: 1 },
    ])
  void animate(incoming, [
    { translate: offset(distance), opacity: 0 },
    { translate: '0 0', opacity: 1 },
  ])
}
const syncNavigationCutouts = () => {
  if (!wrapper?.isConnected) return
  for (const surface of wrapper.querySelectorAll<HTMLElement>(
    '.safe-image-viewer__nav-surface'
  )) {
    const nav = surface.parentElement!
    const label = nav.querySelector<HTMLElement>(
      '.safe-image-viewer__nav-label'
    )!
    const width = nav.clientWidth
    const height = nav.clientHeight
    if (!width || !height) continue
    const style = getComputedStyle(label)
    const size = parseFloat(style.fontSize)
    const canvas = document.createElement('canvas')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.ceil(width * ratio)
    canvas.height = Math.ceil(height * ratio)
    const context = canvas.getContext('2d')
    if (!context) continue
    context.scale(ratio, ratio)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    // 完全扣除字形；扫描线空隙的透明度由独立遮罩控制。
    context.globalCompositeOperation = 'destination-out'
    context.globalAlpha = 1
    context.font = `400 ${size}px Anton`
    context.textAlign = 'center'
    const drawText = (text: string, y: number) => {
      const metrics = context.measureText(text)
      context.fillText(
        text,
        width / 2,
        y +
          (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
            2
      )
    }
    const text = label.textContent ?? ''
    if (style.writingMode === 'horizontal-tb') {
      drawText(text, height / 2)
    } else {
      Array.from(text).forEach((character, index) =>
        drawText(
          character,
          height / 2 + (index - (text.length - 1) / 2) * size * 1.08
        )
      )
    }
    const mask = `url("${canvas.toDataURL()}")`
    surface.style.maskImage = mask
    surface.style.webkitMaskImage = mask
  }
}
let closeTimer: ReturnType<typeof setTimeout> | undefined
const handleClose = () => {
  if (closeTimer !== undefined) return
  ++switchVersion
  clearSwitchAnimations()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('close')
    return
  }
  // 等电视机关机动画结束后再卸载，期间继续保留背景滚动锁。
  wrapper?.classList.add('is-crt-closing')
  closeTimer = setTimeout(() => emit('close'), 450)
}
const markNavigationHovered = (event: PointerEvent) => {
  if (!(event.target instanceof Element)) return
  const nav = event.target.closest(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )
  if (!nav) return
  nav.classList.add('has-hovered')
  if (event.relatedTarget instanceof Node && nav.contains(event.relatedTarget))
    return
  if (
    window.matchMedia(
      '(min-width: 769px) and (hover: hover) and (pointer: fine)'
    ).matches
  )
    wrapper?.classList.add('is-hover-dimmed')
}
const clearNavigationHover = (event: PointerEvent) => {
  if (!(event.target instanceof Element)) return
  const nav = event.target.closest(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )
  if (
    nav &&
    !(event.relatedTarget instanceof Node && nav.contains(event.relatedTarget))
  )
    wrapper?.classList.remove('is-hover-dimmed')
}
const syncCorners = () => {
  const current =
    wrapper?.querySelector<HTMLImageElement>('.el-image-viewer__img') ?? null
  if (current !== image) {
    resizeObserver?.disconnect()
    image = current
    if (image) resizeObserver?.observe(image)
  }
  if (!image?.naturalWidth) {
    wrapper?.classList.remove('is-image-zoomed')
    if (corners.value) corners.value.style.display = 'none'
    cornerStyle = { display: 'none' }
    return
  }
  const nativeScale = Number(
    /scale\(([^)]+)\)/.exec(image.style.transform)?.[1] ?? 1
  )
  wrapper?.classList.toggle(
    'is-image-zoomed',
    nativeScale * Number(image.style.scale || 1) > 1.01
  )
  if (decoratedImage !== image) {
    decoratedImage = image
    // 装饰层独立播放动画，不触发图片预览组件重新渲染。
    for (const animation of corners.value?.getAnimations() ?? [])
      if ((animation as CSSAnimation).animationName === 'viewer-corner-in')
        animation.currentTime = 0
  }
  // 使用未变换的布局尺寸，并复制图片变换，使装饰同步旋转、缩放和拖动。
  const nextStyle: CSSProperties = {
    display: 'block',
    left: `${image.offsetLeft - 16}px`,
    top: `${image.offsetTop - 16}px`,
    width: `${image.offsetWidth + 32}px`,
    height: `${image.offsetHeight + 32}px`,
    transform: image.style.transform,
    scale: image.style.scale,
    translate: image.style.translate,
    transition: image.style.transition,
  }
  // 装饰尺寸直接写入独立 DOM；观察图片变换不会再引发 Vue 组件渲染。
  if (
    Object.keys(nextStyle).some(
      (key) =>
        nextStyle[key as keyof CSSProperties] !==
        cornerStyle[key as keyof CSSProperties]
    ) ||
    Object.keys(nextStyle).length !== Object.keys(cornerStyle).length
  ) {
    if (corners.value) Object.assign(corners.value.style, nextStyle)
    cornerStyle = nextStyle
  }
}
onMounted(async () => {
  await nextTick()
  wrapper =
    corners.value?.closest<HTMLElement>('.el-image-viewer__wrapper') ?? null
  if (!wrapper) return
  unbindTouch = bindImageViewerTouch(
    wrapper,
    syncCorners,
    clearSwitchAnimations,
    (direction) => {
      const nav = wrapper?.querySelector<HTMLElement>(
        direction === 1 ? '.el-image-viewer__next' : '.el-image-viewer__prev'
      )
      if (nav && !nav.classList.contains('is-disabled')) nav.click()
    }
  )
  for (const nav of wrapper.querySelectorAll<HTMLElement>(
    '.el-image-viewer__prev, .el-image-viewer__next'
  )) {
    const fill = document.createElement('span')
    fill.className = 'safe-image-viewer__nav-fill'
    fill.setAttribute('aria-hidden', 'true')
    const scanlineOptions = {
      seed: nav.classList.contains('el-image-viewer__prev')
        ? 'flora-number-viewer-prev'
        : 'flora-number-viewer-next',
      lines: 32,
      solidFrom: 1,
      topCoverage: 0.3,
      bottomCoverage: 0.94,
      irregularity: 0.65,
      gapOpacity: 0.4,
    }
    fill.style.setProperty(
      '--viewer-nav-scanlines',
      createScanlineMask({ ...scanlineOptions, direction: 'to right' })
    )
    fill.style.setProperty(
      '--viewer-nav-scanlines-mobile',
      createScanlineMask({ ...scanlineOptions, direction: 'to bottom' })
    )
    const surface = document.createElement('span')
    surface.className = 'safe-image-viewer__nav-surface'
    surface.setAttribute('aria-hidden', 'true')
    surface.append(fill)
    nav.append(surface)
    const label = document.createElement('span')
    label.className = 'safe-image-viewer__nav-label'
    label.setAttribute('aria-hidden', 'true')
    label.textContent = nav.classList.contains('el-image-viewer__prev')
      ? 'PREV'
      : 'NEXT'
    nav.append(label)
  }
  void document.fonts.load('400 112px Anton', 'PREV NEXT').then(() => {
    if (!wrapper?.isConnected) return
    syncNavigationCutouts()
    navigationObserver = new ResizeObserver(syncNavigationCutouts)
    wrapper
      .querySelectorAll('.el-image-viewer__prev, .el-image-viewer__next')
      .forEach((nav) => navigationObserver?.observe(nav))
  })
  resizeObserver = new ResizeObserver(syncCorners)
  mutationObserver = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.target instanceof HTMLImageElement ||
          (record.type === 'childList' &&
            record.target instanceof Element &&
            record.target.classList.contains('el-image-viewer__canvas'))
      )
    )
      syncCorners()
  })
  mutationObserver.observe(wrapper, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'src'],
  })
  wrapper.addEventListener('load', syncCorners, true)
  wrapper.addEventListener('pointerover', markNavigationHovered)
  wrapper.addEventListener('pointerout', clearNavigationHover)
  wrapper.addEventListener('click', recordSwitchDirection, true)
  document.addEventListener('keydown', recordSwitchDirection, true)
  window.addEventListener('resize', syncCorners)
  syncCorners()
})
onBeforeUnmount(() => {
  unbindTouch?.()
  ++switchVersion
  clearSwitchAnimations()
  clearTimeout(closeTimer)
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  navigationObserver?.disconnect()
  wrapper?.removeEventListener('load', syncCorners, true)
  wrapper?.removeEventListener('pointerover', markNavigationHovered)
  wrapper?.removeEventListener('pointerout', clearNavigationHover)
  wrapper?.removeEventListener('click', recordSwitchDirection, true)
  document.removeEventListener('keydown', recordSwitchDirection, true)
  window.removeEventListener('resize', syncCorners)
})
const tools = computed(
  () =>
    [
      {
        action: 'zoomOut',
        icon: ZoomOut,
        label: locale.value === 'en' ? 'Zoom out' : '缩小',
      },
      {
        action: 'zoomIn',
        icon: ZoomIn,
        label: locale.value === 'en' ? 'Zoom in' : '放大',
      },
      {
        action: 'reset',
        icon: FullScreen,
        label: locale.value === 'en' ? 'Toggle image fit' : '切换图片适配',
      },
      {
        action: 'anticlockwise',
        icon: RefreshLeft,
        label: locale.value === 'en' ? 'Rotate left' : '向左旋转',
      },
      {
        action: 'clockwise',
        icon: RefreshRight,
        label: locale.value === 'en' ? 'Rotate right' : '向右旋转',
      },
    ] as const
)

useOverlayScrollLock('safe-image-viewer', () => true)
</script>
