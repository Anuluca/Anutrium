<template>
  <div
    class="island-notes-content is-embedded"
    :class="{ 'is-loading': notesLoading && !notes.length }"
  >
    <ScrollViewport
      ref="noteViewportRef"
      class="study-note-list island-detail__viewport"
      edge-scanlines
    >
      <template #header>
        <FilterRail
          v-if="!notesLoading || notes.length"
          class="study-note-filters"
          :aria-label="locale === 'en' ? 'Note categories' : '笔记分类'"
          :items="categoryTabs"
          :model-value="activeCategory"
          horizontal
          :show-avatar="false"
          @update:model-value="selectCategory"
        />
      </template>
      <div
        v-if="notesLoading && !notes.length"
        class="study-note-loading no-rem"
        role="status"
        :aria-label="locale === 'en' ? 'Loading notes' : '正在加载笔记'"
      >
        <el-icon :size="28" class="is-loading" aria-hidden="true">
          <Loading />
        </el-icon>
      </div>
      <p v-if="notesError" class="study-note-service" role="status">
        {{
          locale === 'en'
            ? 'Online notes are unavailable.'
            : '在线笔记暂时无法读取。'
        }}
        <button type="button" @click="reload">
          {{ locale === 'en' ? 'Retry' : '重试' }}
        </button>
      </p>
      <section
        v-if="paginatedCards.length"
        ref="noteStackRef"
        :key="`notes-${activeCategory}-${currentPage}`"
        class="study-note-stack"
        :class="{ 'is-ready': masonryReady }"
        :aria-label="t('island.modules.notes.studyNotes.title')"
      >
        <RouterLink
          v-for="card in paginatedCards"
          :key="card.note.id"
          class="study-note-card"
          :class="{
            'study-note-card--with-image': card.note.image,
            'study-note-card--without-image': !card.note.image,
            'is-activating': activatingNoteId === card.note.id,
          }"
          :to="noteLocation(card.note)"
          :style="card.style"
          @click.capture="activateNote($event, card.note)"
        >
          <div v-if="card.note.image" class="study-note-card__visual">
            <picture>
              <source
                media="(max-width: 768px)"
                :srcset="getCardMobileThumbnailUrl(card.note.image)"
              />
              <img
                class="study-note-card__image"
                :src="getCardThumbnailUrl(card.note.image)"
                :alt="card.note.title"
                width="768"
                height="576"
                decoding="async"
                loading="lazy"
                @load="scheduleMasonryLayout"
              />
            </picture>
          </div>

          <div class="study-note-card__copy">
            <div class="study-note-card__meta no-rem">
              <span class="study-note-card__category no-rem">
                [<span class="study-note-card__category-text">{{
                  NOTE_CATEGORIES[card.note.type]?.label.en || 'UNKNOWN'
                }}</span
                >]
              </span>
              <time
                class="study-note-card__date no-rem"
                :datetime="card.note.time"
              >
                {{ card.dateLabel }}
              </time>
            </div>
            <h2 :class="locale === 'zhCn' && 'cn-font'">
              {{ card.note.title }}
            </h2>
          </div>
        </RouterLink>
      </section>

      <div v-else-if="!notesLoading && !notesError" class="study-note-empty">
        {{ t('island.modules.notes.studyNotes.empty') }}
      </div>

      <template #footer>
        <nav
          v-if="totalPages > 1"
          class="study-note-pagination"
          :aria-label="t('pagination.pageLabel')"
        >
          <button
            type="button"
            :disabled="currentPage === 1"
            @click="setPage(currentPage - 1)"
          >
            {{ t('pagination.previousPage') }}
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            :class="{ 'is-active': page === currentPage }"
            :aria-current="page === currentPage ? 'page' : undefined"
            @click="setPage(page)"
          >
            {{ page }}
          </button>
          <button
            type="button"
            :disabled="currentPage === totalPages"
            @click="setPage(currentPage + 1)"
          >
            {{ t('pagination.nextPage') }}
          </button>
        </nav>
      </template>
    </ScrollViewport>
    <ModalWrapper
      :model-value="noteVisible"
      dialog-class="note-detail-modal"
      width="var(--note-modal-width)"
      :close-title="locale === 'en' ? 'Close note (ESC)' : '关闭笔记 (ESC)'"
      @update:model-value="setNoteVisible"
      @closed="finishNoteClose"
    >
      <NoteReader v-if="openedNoteId" :id="openedNoteId" />
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'

import FilterRail, {
  type FilterRailItem,
} from '@/components/FilterRail/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
import { useNotes } from '@/composables/useNotes'
import {
  isNoteCategory,
  isNoteCategoryIncludedInAll,
  NOTE_CATEGORIES,
  type NoteCategory,
} from '@/config/noteCategories'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

import NoteReader from './NoteReader.vue'

type StudyNoteType = NoteCategory

interface StudyNote {
  id: string
  title: string
  time: string
  image?: string
  path: string
  type: StudyNoteType
}

interface StudyNoteCard {
  note: StudyNote
  dateLabel: string
  style: Record<string, string | number>
}

const PAGE_SIZE = 20
const currentPage = ref(1)

const { locale, t } = useI18n()
const noteViewportRef = ref<InstanceType<typeof ScrollViewport> | null>(null)
const noteStackRef = ref<HTMLElement | null>(null)
const masonryReady = ref(false)
let masonryFrame: number | undefined
let masonryObserver: ResizeObserver | undefined
let disposed = false

const route = useRoute()
const router = useRouter()
const activeCategory = computed<NoteCategory | 'all'>(() =>
  isNoteCategory(route.query.category) ? route.query.category : 'all'
)
const noteLocation = (note: StudyNote) => {
  const target = router.resolve(note.path)
  return {
    path: target.path,
    query: { ...route.query, ...target.query },
    hash: target.hash || route.hash,
  }
}
const activatingNoteId = ref('')
let activationAnimations: Animation[] = []

const activateNote = async (event: MouseEvent, note: StudyNote) => {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return
  event.preventDefault()
  if (activatingNoteId.value) return

  const card = event.currentTarget as HTMLElement
  activatingNoteId.value = note.id
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  // 闪烁与弹窗导航同时开始，动画结束后清理卡片反馈。
  const flash = (
    element: HTMLElement,
    property: 'backgroundColor' | 'color',
    target: string
  ) => {
    const initial = getComputedStyle(element)[property]
    return element.animate(
      [
        { [property]: initial, offset: 0 },
        { [property]: target, offset: 0.2 },
        { [property]: initial, offset: 0.4 },
        { [property]: target, offset: 0.6 },
        { [property]: target, offset: 1 },
      ].map((frame) => ({ ...frame, easing: 'steps(1, end)' })),
      {
        duration: reducedMotion ? 0 : 320,
        fill: 'forwards',
      }
    )
  }
  activationAnimations = [flash(card, 'backgroundColor', '#e23456')]
  card
    .querySelectorAll<HTMLElement>(
      'h2, .study-note-card__date, .study-note-card__category'
    )
    .forEach((element) => {
      activationAnimations.push(
        flash(
          element,
          'color',
          element.classList.contains('study-note-card__category')
            ? '#fff'
            : '#000'
        )
      )
    })
  try {
    await Promise.all([
      router.push(noteLocation(note)),
      ...activationAnimations.map((animation) => animation.finished),
    ])
  } catch {
    // 组件卸载会取消仍在播放的卡片动画。
  } finally {
    activationAnimations.forEach((animation) => animation.cancel())
    activationAnimations = []
    activatingNoteId.value = ''
  }
}
const selectedNoteId = computed(() =>
  typeof route.query.note === 'string' ? route.query.note : ''
)
const noteVisible = ref(false)
const openedNoteId = ref('')
watch(
  selectedNoteId,
  (id) => {
    if (id) openedNoteId.value = id
    noteVisible.value = !!id
  },
  { immediate: true }
)
const setNoteVisible = (visible: boolean) => {
  noteVisible.value = visible
  if (!visible && selectedNoteId.value) {
    const query = { ...route.query }
    delete query.note
    void router.replace({ path: route.path, query, hash: route.hash })
  }
}
// 离场动画结束后再卸载正文，避免关闭时内容提前消失。
const finishNoteClose = () => {
  if (!noteVisible.value) openedNoteId.value = ''
}
const { notes, error: notesError, loading: notesLoading, reload } = useNotes()
const allNotes = computed(() =>
  notes.value.filter((note) => isNoteCategoryIncludedInAll(note.type))
)
const categoryTabs = computed<FilterRailItem[]>(() => [
  {
    id: 'all',
    title: 'ALL',
    count: allNotes.value.length,
  },
  ...Object.entries(NOTE_CATEGORIES).map(([id, category]) => ({
    id,
    title: category.label.en,
    count: notes.value.filter((note) => note.type === id).length,
  })),
])
const filteredNotes = computed(() =>
  activeCategory.value === 'all'
    ? allNotes.value
    : notes.value.filter((note) => note.type === activeCategory.value)
)
const selectCategory = (category: string) => {
  if (category !== 'all' && !isNoteCategory(category)) return
  if (route.query.category === category) return
  void router.push({
    path: route.path,
    query: { ...route.query, category },
    hash: route.hash,
  })
}
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredNotes.value.length / PAGE_SIZE))
)

const formatNoteDate = (date: string) => date.replace(/-/g, '/')

const paginatedCards = computed<StudyNoteCard[]>(() => {
  const pageStart = (currentPage.value - 1) * PAGE_SIZE
  const pageNotes = filteredNotes.value.slice(pageStart, pageStart + PAGE_SIZE)

  return pageNotes.map((note, noteIndex) => {
    return {
      note,
      dateLabel: formatNoteDate(note.time),
      style: {
        '--note-index': noteIndex,
      },
    }
  })
})

const updateMasonryLayout = () => {
  const stack = noteStackRef.value
  if (!stack) return

  const stackStyle = getComputedStyle(stack)
  const rowHeight = Number.parseFloat(stackStyle.gridAutoRows) || 1
  const masonryGap = Number.parseFloat(stackStyle.columnGap) || 0
  const cards = stack.querySelectorAll<HTMLElement>('.study-note-card')
  let hasCompleteMeasurements = cards.length > 0

  const updates: [HTMLElement, string][] = []
  cards.forEach((card) => {
    const cardHeight = card.offsetHeight
    if (cardHeight <= 0) {
      hasCompleteMeasurements = false
      return
    }

    const rowSpan = Math.ceil((cardHeight + masonryGap) / rowHeight)
    const gridRowEnd = `span ${rowSpan}`

    if (card.style.gridRowEnd !== gridRowEnd) updates.push([card, gridRowEnd])
  })

  // 集中读取高度后再写入网格跨度，避免每张卡片触发一次重排。
  updates.forEach(([card, gridRowEnd]) => (card.style.gridRowEnd = gridRowEnd))
  masonryReady.value = hasCompleteMeasurements
}

const scheduleMasonryLayout = () => {
  if (disposed || masonryFrame !== undefined) return
  masonryFrame = requestAnimationFrame(() => {
    masonryFrame = undefined
    updateMasonryLayout()
  })
}

const observeMasonryLayout = async () => {
  masonryReady.value = false
  await nextTick()
  if (disposed) return

  masonryObserver?.disconnect()
  const stack = noteStackRef.value
  if (!stack) return

  masonryObserver = new ResizeObserver(scheduleMasonryLayout)
  masonryObserver.observe(stack)
  stack
    .querySelectorAll<HTMLElement>('.study-note-card')
    .forEach((card) => masonryObserver?.observe(card))
  scheduleMasonryLayout()
}

watch(paginatedCards, observeMasonryLayout, { flush: 'post' })

onMounted(() => {
  observeMasonryLayout()
  document.fonts?.ready.then(scheduleMasonryLayout)
})

onBeforeUnmount(() => {
  disposed = true
  activationAnimations.forEach((animation) => animation.cancel())
  masonryObserver?.disconnect()
  if (masonryFrame !== undefined) cancelAnimationFrame(masonryFrame)
})

const setPage = (page: number) => {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  noteViewportRef.value?.scrollRoot?.scrollTo({ top: 0 })
}
// 包括浏览器前进、后退在内，分类变化统一回到第一页；仅开关正文不重置列表。
watch(activeCategory, () => setPage(1), { flush: 'post' })
</script>

<style lang="less" scoped>
@import '../../styles/noteTypography.less';
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;

.study-note-filters.filter-rail--horizontal {
  align-self: stretch;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.island-notes-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--text-color);
  overflow: hidden;
  &.is-embedded {
    padding: 0;
    .study-note-list {
      padding: 0;
    }
    .study-note-stack {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@container (max-width: 360px) {
  .island-notes-content.is-embedded .study-note-stack {
    grid-template-columns: minmax(0, 1fr);
  }
}

.island-notes-content.is-embedded.is-loading {
  height: 100%;

  .study-note-list {
    height: 100%;
    padding: 0;
  }
}

.study-note-loading.no-rem {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--page-theme-color, #e23456);
}

.study-note-service {
  margin-bottom: 16px;
  color: var(--text-muted);
  button {
    color: @red;
    cursor: pointer;
  }
}

.study-note-list {
  padding: 24px 0 36px;

  :deep(.filter-rail) {
    flex-shrink: 0;
  }

  :deep(.scroll-viewport__scroll) {
    padding-right: 0;
    outline: none;
  }

  :deep(.scroll-viewport__scroll > div) {
    min-height: 100%;
    height: 100%;
  }
}

.study-note-stack {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 1px;
  column-gap: 10px;
  row-gap: 0;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.is-ready {
    opacity: 1;
  }
}

.study-note-card {
  --note-border-color: color-mix(in srgb, var(--border-color) 98%, #000 2%);
  position: relative;
  display: block;
  align-self: start;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--note-border-color);
  background-color: color-mix(in srgb, var(--bg-color) 82%, transparent);
  box-shadow: 0 14px 34px var(--shadow-color);
  break-inside: avoid;
  color: inherit;
  isolation: isolate;
  text-decoration: none;
  clip-path: inset(0 100% 100% 0);
  animation: studyNoteCardRevealIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.14s + var(--note-index) * 120ms);

  &::before {
    position: absolute;
    z-index: 4;
    inset: 0;
    border: 1px solid @red;
    content: '';
    opacity: 0;
    pointer-events: none;
  }

  &::after {
    position: absolute;
    z-index: 3;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    box-sizing: border-box;
    border: 1px solid var(--note-border-color);
    content: '';
    pointer-events: none;
    animation: studyNoteCardBorderIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.14s + var(--note-index) * 120ms);
  }

  &__meta.no-rem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__category.no-rem {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @red;
    .note-meta-typography();
    transition: color 0.3s ease;
  }

  &__category-text {
    .note-category-text();
  }

  &__visual {
    margin: 0 16px;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.1);

    picture {
      display: contents;
    }
  }

  &__image {
    display: block;
    width: 100%;
    height: auto;
    filter: saturate(0.68) contrast(1.03);
    transition: filter 0.45s ease, transform 0.65s ease;
  }

  &__copy {
    padding: 12px 16px 12px;
  }

  &__date.no-rem {
    display: block;
    flex-shrink: 0;
    margin-left: auto;
    color: var(--text-muted);
    .note-meta-typography();
    opacity: 0.5;
    transition: color 0.3s ease;
    white-space: nowrap;
  }

  &--without-image {
    .study-note-card__copy {
      padding-top: 18px;
      padding-bottom: 16px;
    }
  }

  h2 {
    width: 108.6957%;
    margin: 8px 0 0;
    color: var(--text-color);
    font-family: 'UnboundedSans';
    font-size: 26.4px;
    .note-title-typography();
    line-height: 1.15;
    text-transform: uppercase;
    transform-origin: left center;
    transition: color 0.3s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &.is-activating {
    &::before {
      opacity: 1;
      animation: none;
    }
    .study-note-card__image {
      filter: saturate(0.88) contrast(1.02);
      transform: scale(1.025);
    }
  }

  &:focus-visible {
    outline: 2px solid @red;
    outline-offset: 4px;

    &::after {
      border-color: @red;
    }
  }
}

@media (hover: hover) and (pointer: fine) {
  .study-note-card:not(.is-activating):hover::before {
    animation: studyNoteBorderFlash 280ms steps(1, end) forwards;
  }
}

@keyframes studyNoteBorderFlash {
  0%,
  40% {
    opacity: 0;
  }
  20%,
  60%,
  100% {
    opacity: 1;
  }
}

.study-note-empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 1.24rem;
  letter-spacing: 0;
}

.study-note-pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;

  button {
    min-width: 36px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid rgba(226, 52, 86, 0.28);
    color: var(--text-muted);
    background: var(--surface-color);
    cursor: pointer;
    font-family: @mono;
    font-size: 0.56rem;
    transition: border-color 0.2s, color 0.2s, background 0.2s;

    &:hover:not(:disabled),
    &:focus-visible,
    &.is-active {
      border-color: @red;
      color: var(--text-color);
      background: rgba(226, 52, 86, 0.14);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.28;
    }
  }
}

@keyframes studyNoteCardRevealIn {
  99.9% {
    clip-path: inset(0);
  }

  100% {
    clip-path: none;
  }
}

@keyframes studyNoteCardBorderIn {
  to {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: 1100px) {
  .study-note-stack {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .island-notes-content {
    padding-top: 88px;
  }

  .study-note-list {
    padding: 38px 18px 28px;
  }

  .study-note-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .study-note-card {
    &__visual {
      margin: 0 14px;
    }

    &__copy {
      padding: 10px 14px 10px;
    }

    &--without-image {
      .study-note-card__copy {
        padding-top: 16px;
        padding-bottom: 14px;
      }
    }
  }
}

@media (max-width: 600px) {
  .study-note-list {
    padding-right: 14px;
    padding-left: 14px;
  }

  .study-note-stack {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media screen and (max-aspect-ratio: 1) {
  .study-note-card {
    h2 {
      font-size: 38.72px;
    }

    &__category.no-rem,
    &__date.no-rem {
      font-size: 0.6844433rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .study-note-stack {
    transition: none;
  }

  .study-note-card {
    animation: none;
    clip-path: none;
    transition: none;

    &::after {
      width: 100%;
      height: 100%;
      animation: none;
    }

    &__image {
      transition: none;
    }

    &:hover::before {
      animation: none;
      opacity: 1;
    }
  }
}
</style>

<style lang="less">
.modal-wrapper-dialog.note-detail-modal.no-rem {
  --note-modal-width: min(calc(100vw - 48px), 120vh);
  height: 90vh;
}
.modal-wrapper-dialog.note-detail-modal.no-rem:not(
    .modal-wrapper-dialog--origin-motion
  ) {
  width: var(--note-modal-width) !important;
}
@media (max-width: 768px) {
  .modal-wrapper-dialog.note-detail-modal.no-rem {
    --note-modal-width: min(calc(100vw - 20px), calc((100dvh - 192px) * 3 / 4));
    height: calc(var(--note-modal-width) * 4 / 3);
  }
}
</style>
