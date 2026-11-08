<template>
  <div
    class="island-notes-content is-embedded"
    :class="{
      'is-loading': notesLoading && !notes.length,
      'is-reading': !!openedNoteId,
    }"
  >
    <NoteCoverDitherFilter id="note-card-dither-veil" :strength="0.5" />
    <ScrollViewport
      ref="noteViewportRef"
      class="study-note-list island-detail__viewport"
      edge-scanlines
    >
      <template #header>
        <div v-if="!notesLoading || notes.length" class="study-note-toolbar">
          <FilterRail
            class="study-note-filters"
            :aria-label="locale === 'en' ? 'Note categories' : '笔记分类'"
            :items="categoryTabs"
            :model-value="activeCategory"
            horizontal
            :show-avatar="false"
            @update:model-value="selectCategory"
          />
          <button
            class="study-note-refresh"
            type="button"
            :aria-label="locale === 'en' ? 'Refresh notes' : '刷新笔记'"
            :title="locale === 'en' ? 'Refresh notes' : '刷新笔记'"
            :disabled="notesLoading"
            :aria-busy="notesLoading"
            @click="refreshNotes"
          >
            <LoadingLogo
              v-if="notesLoading"
              class="study-note-refresh__loading"
            />
            <el-icon v-else aria-hidden="true">
              <Refresh />
            </el-icon>
          </button>
        </div>
      </template>
      <div
        v-if="notesLoading && !notes.length"
        class="study-note-loading no-rem"
        role="status"
        :aria-label="locale === 'en' ? 'Loading notes' : '正在加载笔记'"
      >
        <LoadingLogo />
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
        :class="{ 'is-ready': masonryReady && contentRevealed }"
        :aria-label="t('island.modules.notes.studyNotes.title')"
      >
        <RouterLink
          v-for="card in paginatedCards"
          :key="card.note.id"
          class="study-note-card"
          :class="{
            'study-note-card--without-image': !card.note.image,
            'is-activating': activatingNoteId === card.note.id,
          }"
          :to="noteLocation(card.note)"
          :style="card.style"
          @click.capture="activateNote($event, card.note)"
        >
          <div v-if="card.note.image" class="study-note-card__visual">
            <div class="study-note-card__media">
              <picture>
                <source
                  media="(max-width: 768px)"
                  :srcset="card.mobileThumbnail"
                />
                <img
                  class="study-note-card__image"
                  :src="card.thumbnail"
                  :alt="card.note.title"
                  width="768"
                  height="576"
                  decoding="async"
                  loading="lazy"
                  @load="scheduleMasonryLayout"
                />
              </picture>
            </div>
          </div>

          <div class="study-note-card__copy">
            <h2 :class="locale === 'zhCn' && 'cn-font'">
              {{ card.note.title }}
            </h2>
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
            :aria-label="t('pagination.previousPage')"
            :disabled="currentPage === 1"
            @click="setPage(currentPage - 1)"
          >
            <span aria-hidden="true">◀</span>
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
            :aria-label="t('pagination.nextPage')"
            :disabled="currentPage === totalPages"
            @click="setPage(currentPage + 1)"
          >
            <span aria-hidden="true">▶</span>
          </button>
        </nav>
      </template>
    </ScrollViewport>
    <ModalWrapper
      ref="noteModalRef"
      :model-value="noteVisible"
      :dialog-class="`note-detail-modal${
        switchingNoteId ? ' is-switching' : ''
      }`"
      width="var(--note-modal-width)"
      :close-title="locale === 'en' ? 'Close note (ESC)' : '关闭笔记 (ESC)'"
      @update:model-value="setNoteVisible"
      @closed="finishNoteClose"
    >
      <template #viewport>
        <div
          class="note-detail-stage no-rem"
          :class="{ 'is-switching': !!switchingNoteId }"
        >
          <div
            v-if="switchingNoteId"
            ref="outgoingNoteShellRef"
            class="note-detail-nav note-detail-outgoing no-rem"
            :style="noteSwitchOrigin"
            aria-hidden="true"
          />
          <button
            v-if="previousNote"
            type="button"
            class="note-detail-nav note-detail-nav--prev no-rem"
            :class="{ 'is-incoming': switchingNoteId === previousNote.id }"
            :disabled="!!switchingNoteId"
            :aria-label="`${locale === 'en' ? 'Previous note' : '上一篇'}: ${
              previousNote.title
            }`"
            @click.stop="navigateNote($event, previousNote)"
          />
          <button
            v-if="nextNote"
            type="button"
            class="note-detail-nav note-detail-nav--next no-rem"
            :class="{ 'is-incoming': switchingNoteId === nextNote.id }"
            :disabled="!!switchingNoteId"
            :aria-label="`${locale === 'en' ? 'Next note' : '下一篇'}: ${
              nextNote.title
            }`"
            @click.stop="navigateNote($event, nextNote)"
          />
        </div>
      </template>
      <NoteReader
        v-if="openedNoteId"
        :id="openedNoteId"
        :active="noteVisible"
        :fade-only="!!switchingNoteId"
        :load-document="loadNoteDocument"
        @ready="handleNoteReady"
      />
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'

import FilterRail, {
  type FilterRailItem,
} from '@/components/FilterRail/index.vue'
import LoadingLogo from '@/components/LoadingLogo/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import { useNoteNavigation } from '@/composables/useNoteNavigation'
import { useNotes } from '@/composables/useNotes'
import {
  isNoteCategory,
  isNoteCategoryIncludedInAll,
  NOTE_CATEGORIES,
  type NoteCategory,
} from '@/config/noteCategories'
import { showSuccessMessage } from '@/utils/elementMessage'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'
import type { NoteSummary } from '@/utils/noteDocument'

import NoteCoverDitherFilter from './NoteCoverDitherFilter.vue'
import NoteReader from './NoteReader.vue'

interface StudyNoteCard {
  note: NoteSummary
  dateLabel: string
  thumbnail?: string
  mobileThumbnail?: string
  style: Record<string, string | number>
}

const PAGE_SIZE = 12
const currentPage = ref(1)

const { locale, t } = useI18n()
const noteViewportRef = ref<InstanceType<typeof ScrollViewport> | null>(null)
const noteStackRef = ref<HTMLElement | null>(null)
const masonryReady = ref(false)
const contentRevealed = ref(false)
let masonryObserver: ResizeObserver | undefined
let disposed = false

const route = useRoute()
const router = useRouter()
const activeCategory = computed<NoteCategory | 'all'>(() =>
  isNoteCategory(route.query.category) ? route.query.category : 'all'
)
const noteLocation = (note: NoteSummary) => {
  const target = router.resolve(note.path)
  return {
    path: target.path,
    query: { ...route.query, ...target.query },
    hash: target.hash || route.hash,
  }
}
const activatingNoteId = ref('')
let activationAnimations: Animation[] = []

const activateNote = async (event: MouseEvent, note: NoteSummary) => {
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
const { notes, error: notesError, loading: notesLoading, reload } = useNotes()
const categoryGroups = computed(() => {
  const groups = new Map<NoteCategory | 'all', NoteSummary[]>([['all', []]])
  for (const id of Object.keys(NOTE_CATEGORIES) as NoteCategory[])
    groups.set(id, [])
  for (const note of notes.value) {
    groups.get(note.type)?.push(note)
    if (isNoteCategoryIncludedInAll(note.type)) groups.get('all')!.push(note)
  }
  return groups
})
const categoryTabs = computed<FilterRailItem[]>(() => [
  { id: 'all', title: 'ALL', count: categoryGroups.value.get('all')!.length },
  ...Object.entries(NOTE_CATEGORIES).map(([id, category]) => ({
    id,
    title: category.label.en,
    count: categoryGroups.value.get(id as NoteCategory)!.length,
  })),
])
const filteredNotes = shallowRef<NoteSummary[]>([])
// Vue 3.2 会向下传播 computed 的失效；只在分类或数据实际变化时替换列表，
// 避免 note 查询参数变化连带重建索引、卡片和瀑布流测量。
watch(
  [categoryGroups, activeCategory],
  ([groups, category]) => {
    filteredNotes.value = groups.get(category)!
  },
  { immediate: true, flush: 'sync' }
)
const {
  noteVisible,
  openedNoteId,
  noteModalRef,
  switchingNoteId,
  outgoingNoteShellRef,
  noteSwitchOrigin,
  previousNote,
  nextNote,
  setNoteVisible,
  finishNoteClose,
  navigateNote,
  handleNoteReady,
  loadNoteDocument,
} = useNoteNavigation(filteredNotes, noteLocation)
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
      thumbnail: note.image ? getCardThumbnailUrl(note.image) : undefined,
      mobileThumbnail: note.image
        ? getCardMobileThumbnailUrl(note.image)
        : undefined,
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

const { schedule: scheduleMasonryLayout } = useFrameTask(updateMasonryLayout)

const observeMasonryLayout = async () => {
  masonryReady.value = false
  await nextTick()
  if (disposed) return

  masonryObserver?.disconnect()
  const stack = noteStackRef.value
  if (!stack) return

  masonryObserver ??= new ResizeObserver(scheduleMasonryLayout)
  masonryObserver.observe(stack)
  stack
    .querySelectorAll<HTMLElement>('.study-note-card')
    .forEach((card) => masonryObserver?.observe(card))
  scheduleMasonryLayout()
}

watch(paginatedCards, observeMasonryLayout, { flush: 'post' })

onMounted(() => {
  // 等详情容器显现后再播放卡片动画，避免前几张在父级隐藏时已淡入完毕。
  const entrance = noteViewportRef.value?.scrollRoot
    ?.closest('.island-detail')
    ?.getAnimations()
  void Promise.allSettled(
    (entrance ?? []).map((animation) => animation.finished)
  ).then(() => {
    if (!disposed) contentRevealed.value = true
  })
  observeMasonryLayout()
  document.fonts?.ready.then(scheduleMasonryLayout)
})

onBeforeUnmount(() => {
  disposed = true
  activationAnimations.forEach((animation) => animation.cancel())
  masonryObserver?.disconnect()
})

const setPage = (page: number) => {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  noteViewportRef.value?.scrollRoot?.scrollTo({ top: 0 })
}
const refreshNotes = async () => {
  await reload()
  if (disposed || notesError.value) return
  if (currentPage.value > totalPages.value) setPage(totalPages.value)
  showSuccessMessage('NOTES已刷新')
}
// 包括浏览器前进、后退在内，分类变化统一回到第一页；仅开关正文不重置列表。
watch(activeCategory, () => setPage(1), { flush: 'post' })
</script>

<style lang="less" scoped>
@import '../../styles/noteTypography.less';
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;

.study-note-toolbar {
  display: flex;
  align-self: stretch;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.study-note-filters.filter-rail--horizontal {
  flex: 1;
  min-width: 0;
  margin: 0;
  border-bottom: 0;
}

.study-note-refresh {
  display: grid;
  flex: 0 0 1.8rem;
  place-items: center;
  justify-items: end;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.72rem;
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    color: var(--text-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.study-note-refresh__loading.no-rem {
  --loading-logo-height: 18px;
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
  }
}

@container (max-width: 360px) {
  .island-notes-content.is-embedded .study-note-stack {
    grid-template-columns: minmax(0, 1fr);
  }
}

.island-notes-content.is-embedded.is-loading {
  .study-note-list {
    height: 100%;
    :deep(.scroll-viewport__scroll.no-rem) {
      padding-right: 0;
    }
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
  :deep(.filter-rail) {
    flex-shrink: 0;
  }

  :deep(.scroll-viewport__scroll.no-rem) {
    padding-right: 16px;
    outline: none;
  }

  :deep(.scroll-viewport__scroll > div) {
    min-height: 100%;
    height: 100%;
  }
}

.study-note-stack {
  --note-entry-play-state: paused;
  padding-bottom: 32px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1px;
  column-gap: 10px;
  row-gap: 0;
  opacity: 0;

  &.is-ready {
    --note-entry-play-state: running;
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
  opacity: 0;
  animation: studyNoteCardFadeIn 0.45s ease-out both;
  animation-delay: calc(0.08s + var(--note-index) * 100ms);
  animation-play-state: var(--note-entry-play-state, running);

  &::before {
    position: absolute;
    z-index: 4;
    inset: 0;
    border: 1px solid @red;
    content: '';
    opacity: 0;
    pointer-events: none;
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
    .note-category-typography();
    transition: color 0.3s ease;
  }

  &__category-text {
    .note-category-text();
  }

  &__visual {
    position: relative;
    margin: 0;
    -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
    overflow: hidden;
    background: rgba(128, 128, 128, 0.1);
  }

  &__media {
    position: relative;
    transition: transform 1.3s ease;

    picture {
      display: contents;
    }

    // 两级带遮罩的模糊叠层保留顶部细节，向底部逐渐增强，无需重复加载图片。
    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    &::before {
      z-index: 1;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 50%,
        #000 100%
      );
      mask-image: linear-gradient(to bottom, transparent 50%, #000 100%);
    }
    &::after {
      z-index: 2;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 75%,
        #000 100%
      );
      mask-image: linear-gradient(to bottom, transparent 75%, #000 100%);
    }
  }

  &__image {
    display: block;
    width: 100%;
    height: auto;
    filter: url('#note-card-dither-veil');
    transition: filter 0.45s ease;
  }

  &__copy {
    padding: 0 16px 12px;
  }

  &__date.no-rem {
    display: block;
    flex-shrink: 0;
    margin-left: auto;
    color: var(--text-muted);
    .note-meta-typography();
    .note-date-typography();
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
    margin: 0 0 8px;
    color: var(--text-color);
    font-family: 'UnboundedSans';
    font-size: 30px;
    .note-title-typography();
    line-height: 1.15;
    text-transform: none;
    transform-origin: left center;
    transition: color 0.3s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &.is-activating {
    &::before {
      opacity: 1;
      animation: none;
    }
    .study-note-card__image {
      filter: url('#note-card-dither-veil');
    }
    .study-note-card__media {
      transform: scale(1.05);
    }
  }

  &:focus-visible {
    outline: 2px solid @red;
    outline-offset: 4px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .study-note-card:hover .study-note-card__media {
    transform: scale(1.05);
  }

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
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.56rem;
    font-weight: 900;
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

@keyframes studyNoteCardFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .study-note-card {
    &__copy {
      padding: 0 14px 10px;
    }

    &--without-image {
      .study-note-card__copy {
        padding-top: 16px;
        padding-bottom: 14px;
      }
    }
  }
}

@media (max-width: 768px) {
  .island-notes-content.is-embedded .study-note-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media screen and (max-aspect-ratio: 1) {
  .study-note-card {
    h2 {
      font-size: 44px;
    }

    &__category.no-rem,
    &__date.no-rem {
      font-size: 0.6844433rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .study-note-card {
    animation: none;
    opacity: 1;
    transition: none;

    &__image,
    &__media {
      transition: none;
    }

    &:hover::before {
      animation: none;
      opacity: 1;
    }
  }
}
</style>

<style lang="less" src="../../styles/noteModal.less"></style>
