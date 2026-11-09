<template>
  <article
    ref="readerElement"
    :data-note-enter="note && !loading ? 'pending' : undefined"
    class="note-reader no-rem native-cursor"
    :class="{ 'is-loading': loading, 'is-header-compact': headerCompact }"
    @wheel.capture="headerScrollGate.wheel"
    @touchstart.capture.passive="headerScrollGate.touchStart"
    @touchmove.capture="headerScrollGate.touchMove"
    @touchend.capture.passive="headerScrollGate.touchEnd"
    @touchcancel.capture.passive="headerScrollGate.touchEnd"
    @keydown.capture="headerScrollGate.keydown"
  >
    <div
      v-if="loading"
      class="note-reader__loading"
      role="status"
      :aria-label="locale === 'en' ? 'Loading note' : '正在加载笔记详情'"
    >
      <LoadingLogo />
    </div>
    <div v-else-if="error" class="note-reader__error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">
        {{ locale === 'en' ? 'Retry' : '重试' }}
      </button>
    </div>
    <template v-else-if="note">
      <header ref="headerElement" class="note-reader__header">
        <div class="note-reader__heading">
          <h1>{{ note.metadata.title }}</h1>
          <div class="note-reader__meta">
            <span class="note-reader__category">
              [<span class="note-reader__category-text">{{
                NOTE_CATEGORIES[note.metadata.type].label.en
              }}</span
              >]
            </span>
            <time :datetime="note.metadata.time">{{
              note.metadata.time.replace(/-/g, '/')
            }}</time>
          </div>
        </div>
      </header>
      <div class="note-reader__body-frame">
        <div
          ref="bodyScrollElement"
          class="note-reader__body-scroll"
          data-lenis-prevent
          data-lenis-nested-scroll
          tabindex="0"
          @scroll.passive="updateHeader.schedule"
        >
          <!-- 渲染器仅允许受控展示标签并校验链接协议，正文来自 Markdown 转换。 -->
          <div
            ref="bodyContentElement"
            class="note-content"
            @click="handleContentClick"
            @pointerover.capture="handleNoteTooltipEnter"
            @pointerout.capture="handleNoteTooltipLeave"
            @focusin="handleNoteTooltipEnter"
            @focusout="handleNoteTooltipLeave"
            @animationend="handleNoteTooltipAnimationEnd"
            @keydown="handleContentKeydown"
          >
            <NoteMarkdown :body="note.body" />
          </div>
        </div>
      </div>
      <!-- 轨道以阅读器为定位容器，避免标题收起时跟随正文区域向上延伸。 -->
      <PageScrollProgress
        embedded
        :style="{ top: `${progressTop}px` }"
        :scroll-target="bodyScrollElement"
        color="var(--modal-theme-color, #e23456)"
      />
    </template>
  </article>
  <SafeImageViewer
    v-if="imagePreview"
    :url-list="imagePreview.urls"
    :labels="imagePreview.labels"
    :initial-index="imagePreview.index"
    @close="imagePreview = null"
  />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutationObserver, useResizeObserver } from '@vueuse/core'

import LoadingLogo from '@/components/LoadingLogo/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import {
  scrollNestedTo,
  useNestedSmoothScroll,
} from '@/composables/useNestedSmoothScroll'
import type { NoteDocument } from '@/composables/useNoteDocuments'
import { useNoteHeaderScrollGate } from '@/composables/useNoteHeaderScrollGate'
import { useScrollScanlines } from '@/composables/useScrollScanlines'
import { NOTE_CATEGORIES } from '@/config/noteCategories'
import { createNoteEntrance } from '@/utils/noteEntrance'
import {
  handleNoteTooltipAnimationEnd,
  handleNoteTooltipEnter,
  handleNoteTooltipLeave,
} from '@/utils/noteTooltip'

import NoteMarkdown from './NoteMarkdown.vue'

import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

const readerElement = ref<HTMLElement | null>(null)
const bodyScrollElement = ref<HTMLElement | null>(null)
const bodyContentElement = ref<HTMLElement | null>(null)
const headerElement = ref<HTMLElement | null>(null)
const progressTop = ref(0)
const backgroundHeight = ref(0)
const COVER_SCROLL_RATIO = 0.015
const backgroundOverscan = ref(8)
const updateCoverOverscan = useFrameTask(() => {
  const scroll = bodyScrollElement.value
  if (!scroll) return
  // 按内容总高度预留整个滚动过程的位移余量，避免图片移动后露出边缘。
  backgroundOverscan.value = 8 + scroll.scrollHeight * COVER_SCROLL_RATIO
})
useResizeObserver(bodyContentElement, updateCoverOverscan.schedule)
let progressHeaderLocked = false
const measureProgressTop = () => {
  const header = headerElement.value
  if (!header) return
  const height = header.offsetHeight
  backgroundHeight.value = height
  if (progressHeaderLocked) return
  progressTop.value = header.offsetTop + height
}
const updateProgressTop = useFrameTask(measureProgressTop)
useResizeObserver(headerElement, updateProgressTop.schedule)
watch(headerElement, () => {
  progressHeaderLocked = false
  updateProgressTop.schedule()
})
const headerCompact = ref(false)
let previousHeaderScrollTop = 0
const updateHeader = useFrameTask(() => {
  const scroll = bodyScrollElement.value
  if (!scroll || !props.active) return
  emit('backgroundScroll', Math.max(0, scroll.scrollTop) * COVER_SCROLL_RATIO)
  if (headerScrollGate.isBlocking()) return
  const previousTop = previousHeaderScrollTop
  previousHeaderScrollTop = scroll.scrollTop
  // 分开收起、恢复阈值，避免标题高度变化引起临界位置反复切换。
  if (scroll.scrollTop > 96 && !headerCompact.value) {
    // 只在首次收起前记录完整标题占位，收起和恢复动画均不改变轨道。
    measureProgressTop()
    progressHeaderLocked = true
    headerCompact.value = true
  } else if (scroll.scrollTop <= 4 && scroll.scrollTop < previousTop)
    headerCompact.value = false
})
let entrance: ReturnType<typeof createNoteEntrance> | undefined
let entranceRevision = 0
const props = withDefaults(
  defineProps<{
    id: string
    active?: boolean
    fadeOnly?: boolean
    loadDocument: (id: string, refresh?: boolean) => Promise<NoteDocument>
  }>(),
  {
    active: true,
    fadeOnly: false,
  }
)
const headerScrollGate = useNoteHeaderScrollGate({
  header: () => headerElement.value,
  scroll: () => bodyScrollElement.value,
  active: () => props.active,
  compact: () => headerCompact.value,
  compactHeader: () => {
    measureProgressTop()
    progressHeaderLocked = true
    headerCompact.value = true
  },
  expandHeader: () => {
    headerCompact.value = false
    previousHeaderScrollTop = 0
  },
})
const emit = defineEmits<{
  ready: [id: string]
  backgroundScroll: [shift: number]
  backgroundChange: [
    state: {
      image?: string
      height: number
      phase: string
      overscan: number
    }
  ]
}>()
const backgroundPhase = ref('pending')
useMutationObserver(
  readerElement,
  () => {
    backgroundPhase.value = readerElement.value?.dataset.noteEnter || 'pending'
  },
  { attributes: true, attributeFilter: ['data-note-enter'] }
)
useNestedSmoothScroll(() => (props.active ? bodyScrollElement.value : null))
useScrollScanlines(() => bodyScrollElement.value)
const { locale } = useI18n()
const note = shallowRef<NoteDocument | null>(null)
const loading = ref(false)
let hadBackgroundImage: boolean | undefined
watch(
  [note, loading, backgroundHeight, backgroundPhase, backgroundOverscan],
  () => {
    const image = !loading.value ? note.value?.metadata.image : undefined
    // 无封面时只发送一次清空状态，避免正文滚动持续更新整个列表组件。
    if (!image && hadBackgroundImage === false) return
    hadBackgroundImage = !!image
    emit('backgroundChange', {
      image,
      height: backgroundHeight.value,
      phase: backgroundPhase.value,
      overscan: backgroundOverscan.value,
    })
  },
  { immediate: true }
)

const error = ref('')
let loadRevision = 0
let requestedId = ''
const imagePreview = ref<{
  urls: string[]
  labels: string[]
  index: number
} | null>(null)
const openContentImage = (target: HTMLElement, content: HTMLElement) => {
  if (!(target instanceof HTMLImageElement)) return false
  const images = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
  imagePreview.value = {
    urls: images.map((image) => image.src),
    labels: images.map((image) => image.alt),
    index: images.indexOf(target),
  }
  return true
}
const handleContentClick = (event: MouseEvent) => {
  if (window.getSelection()?.isCollapsed === false) {
    event.preventDefault()
    return
  }
  if (
    openContentImage(
      event.target as HTMLElement,
      event.currentTarget as HTMLElement
    )
  )
    event.preventDefault()
  else followNoteAnchor(event)
}
const handleContentKeydown = (event: KeyboardEvent) => {
  if (!['Enter', ' '].includes(event.key)) return
  if (
    openContentImage(
      event.target as HTMLElement,
      event.currentTarget as HTMLElement
    )
  )
    event.preventDefault()
}
const followNoteAnchor = (event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href^="#"]'
  )
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return
  const content = event.currentTarget as HTMLElement
  const scrollRegion = bodyScrollElement.value
  let id: string
  try {
    id = decodeURIComponent(link.hash.slice(1))
  } catch {
    return
  }
  const target = content.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
  if (!target || !scrollRegion) return
  event.preventDefault()
  scrollNestedTo(
    scrollRegion,
    scrollRegion.scrollTop +
      target.getBoundingClientRect().top -
      scrollRegion.getBoundingClientRect().top -
      12
  )
}
const load = async () => {
  headerScrollGate.reset()
  emit('backgroundScroll', 0)
  const revision = ++loadRevision
  const id = props.id
  const refresh = !!error.value && requestedId === id
  requestedId = id
  loading.value = true
  error.value = ''
  imagePreview.value = null
  note.value = null
  try {
    const document = await props.loadDocument(id, refresh)
    if (revision !== loadRevision) return
    note.value = document
  } catch (reason) {
    if (revision !== loadRevision) return
    error.value =
      locale.value === 'en'
        ? 'Unable to read this note. It may not exist or the service is unavailable.'
        : reason instanceof Error && reason.message === 'not_found'
        ? '未找到这篇笔记。'
        : '笔记暂时无法读取，请重试。'
  } finally {
    if (revision === loadRevision) {
      loading.value = false
      await nextTick()
      if (revision === loadRevision) emit('ready', id)
    }
  }
}
watch(
  () => props.fadeOnly,
  (fadeOnly) => {
    if (!fadeOnly) return
    entrance?.destroy()
    entrance = undefined
    if (readerElement.value) readerElement.value.dataset.noteEnter = 'ready'
  }
)
watch([note, loading, () => props.active], async () => {
  const revision = ++entranceRevision
  // 关闭阶段保留正文与当前画面，重开时即使文章未改变也重新建立入场。
  headerScrollGate.reset()
  if (!props.active) return
  entrance?.destroy()
  entrance = undefined
  if (!note.value || loading.value) return
  await nextTick()
  if (revision === entranceRevision && props.active && readerElement.value) {
    const scroll = bodyScrollElement.value
    if (!scroll) return
    // 复用中的阅读器同样重置 Lenis 目标，避免旧惯性将重开的正文带回原位置。
    updateHeader.cancel()
    progressHeaderLocked = false
    headerCompact.value = false
    emit('backgroundScroll', 0)
    previousHeaderScrollTop = 0
    updateProgressTop.schedule()
    scrollNestedTo(scroll, 0, true)
    if (props.fadeOnly) readerElement.value.dataset.noteEnter = 'ready'
    else
      entrance = createNoteEntrance(readerElement.value, {
        scroll,
        viewport: readerElement.value,
      })
  }
})
watch(() => props.id, load, { immediate: true })
onBeforeUnmount(() => {
  entranceRevision++
  entrance?.destroy()
  loadRevision++
})
</script>

<style lang="less" src="../../styles/noteReader.less"></style>

<style lang="less" scoped>
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  :deep(.note-image-hover) {
    overflow: hidden;
    img {
      transition: transform 220ms ease-out;
    }
    &:hover img {
      transform: scale(1.025);
    }
  }
}
</style>
