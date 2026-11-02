<template>
  <article
    ref="readerElement"
    :data-note-enter="note && !loading ? 'pending' : undefined"
    class="note-reader no-rem native-cursor"
    :class="{ 'is-loading': loading }"
  >
    <div
      v-if="loading"
      class="note-reader__loading"
      role="status"
      :aria-label="locale === 'en' ? 'Loading note' : '正在加载笔记详情'"
    >
      <el-icon :size="28" class="is-loading" aria-hidden="true">
        <Loading />
      </el-icon>
    </div>
    <div v-else-if="error" class="note-reader__error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">
        {{ locale === 'en' ? 'Retry' : '重试' }}
      </button>
    </div>
    <template v-else-if="note">
      <header class="note-reader__header">
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
      </header>
      <div class="note-reader__body-frame">
        <div
          ref="bodyScrollElement"
          class="note-reader__body-scroll"
          data-lenis-prevent
          data-lenis-nested-scroll
          tabindex="0"
        >
          <!-- 渲染器仅允许受控展示标签并校验链接协议，正文来自 Markdown 转换。 -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="note-markdown"
            @click="handleContentClick"
            @pointerover="handleImageEnter"
            @pointerover.capture="handleNoteTooltipEnter"
            @pointerout.capture="handleNoteTooltipLeave"
            @focusin="handleNoteTooltipEnter"
            @focusout="handleNoteTooltipLeave"
            @animationend="handleNoteTooltipAnimationEnd"
            @pointerout="handleImageLeave"
            @pointercancel="imageHover.stop"
            @keydown="handleContentKeydown"
            v-html="html"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
        <PageScrollProgress
          embedded
          :scroll-target="bodyScrollElement"
          color="var(--modal-theme-color, #e23456)"
        />
      </div>
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading } from '@element-plus/icons-vue'

import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import { useImageCincoHover } from '@/composables/useImageCincoHover'
import {
  scrollNestedTo,
  useNestedSmoothScroll,
} from '@/composables/useNestedSmoothScroll'
import type { NoteDocument } from '@/composables/useNoteDocuments'
import { NOTE_CATEGORIES } from '@/config/noteCategories'
import { createNoteEntrance } from '@/utils/noteEntrance'
import {
  handleNoteTooltipAnimationEnd,
  handleNoteTooltipEnter,
  handleNoteTooltipLeave,
} from '@/utils/noteTooltip'
import { renderNoteMarkdown } from '@/utils/renderNoteMarkdown'

import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

const readerElement = ref<HTMLElement | null>(null)
const bodyScrollElement = ref<HTMLElement | null>(null)
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
const emit = defineEmits<{ ready: [id: string] }>()
useNestedSmoothScroll(() => (props.active ? bodyScrollElement.value : null))
const { locale } = useI18n()
const note = shallowRef<NoteDocument | null>(null)
const loading = ref(false)
const error = ref('')
let loadRevision = 0
let requestedId = ''
const renderedNotes = new WeakMap<NoteDocument, string>()
const html = computed(() => {
  const document = note.value
  if (!document) return ''
  const cached = renderedNotes.get(document)
  if (cached !== undefined) return cached
  const rendered = renderNoteMarkdown(document.body)
  renderedNotes.set(document, rendered)
  return rendered
})
const imageHover = useImageCincoHover({ glowStrength: 0.5 })
const handleImageEnter = (event: PointerEvent) => {
  const wrapper = (event.target as HTMLElement).closest<HTMLElement>(
    '.note-image-hover'
  )
  if (wrapper && !wrapper.contains(event.relatedTarget as Node | null))
    imageHover.start(event, wrapper)
}
const handleImageLeave = (event: PointerEvent) => {
  const wrapper = (event.target as HTMLElement).closest<HTMLElement>(
    '.note-image-hover'
  )
  if (wrapper && !wrapper.contains(event.relatedTarget as Node | null))
    imageHover.leave()
}
const imagePreview = ref<{
  urls: string[]
  labels: string[]
  index: number
} | null>(null)
const openContentImage = (target: HTMLElement, content: HTMLElement) => {
  if (!(target instanceof HTMLImageElement)) return false
  const images = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
  imageHover.stop()
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
  const revision = ++loadRevision
  const id = props.id
  const refresh = !!error.value && requestedId === id
  requestedId = id
  loading.value = true
  error.value = ''
  imagePreview.value = null
  imageHover.stop()
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
  if (!props.active) return
  entrance?.destroy()
  entrance = undefined
  if (!note.value || loading.value) return
  await nextTick()
  if (revision === entranceRevision && props.active && readerElement.value) {
    const scroll = bodyScrollElement.value
    if (!scroll) return
    // 复用中的阅读器同样重置 Lenis 目标，避免旧惯性将重开的正文带回原位置。
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
