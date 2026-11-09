<template>
  <div
    class="island-notes-content is-embedded"
    :class="{
      'is-loading': notesLoading && !notes.length,
      'is-reading': !!openedNoteId,
    }"
  >
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
        :key="`notes-${activeCategory}-${currentPage}`"
        class="study-note-stack"
        :class="{ 'is-ready': contentRevealed }"
        :aria-label="t('island.modules.notes.studyNotes.title')"
      >
        <RouterLink
          v-for="card in paginatedCards"
          :key="card.note.id"
          class="study-note-card"
          :class="{
            'is-activating': activatingNoteId === card.note.id,
          }"
          :to="noteLocation(card.note)"
          :style="card.style"
          @click.capture="activateNote($event, card.note)"
        >
          <div class="study-note-card__visual">
            <div
              class="study-note-card__media"
              :class="{ 'study-note-card__media--default': !card.note.image }"
            >
              <Logo
                v-if="!card.note.image"
                :id="`note-cover-${card.note.id}`"
                class="study-note-card__logo"
                :active="false"
                aria-hidden="true"
              />
              <picture v-else>
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
                />
              </picture>
            </div>
          </div>

          <NoteCardCopy>
            <div class="study-note-card__copy-content">
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
          </NoteCardCopy>
        </RouterLink>
      </section>

      <div v-else-if="!notesLoading && !notesError" class="study-note-empty">
        {{ t('island.modules.notes.studyNotes.empty') }}
      </div>

      <template #footer>
        <Pagination
          v-if="totalPages > 1"
          class="study-note-pagination"
          :aria-label="t('pagination.pageLabel')"
          :page="currentPage"
          :page-count="totalPages"
          @select="setPage"
        />
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
      <template #background>
        <NoteModalBackground
          v-if="noteBackground.image"
          :key="`${openedNoteId}:${noteBackground.image}`"
          :image="noteBackground.image"
          ref="noteBackgroundRef"
          :height="noteBackground.height"
          :phase="noteBackground.phase"
          :overscan="noteBackground.overscan"
          :switching="!!switchingNoteId"
        />
      </template>
      <template #viewport>
        <div
          class="note-detail-stage no-rem"
          :class="{
            'is-switching': !!switchingNoteId,
            'has-switched-note': hasSwitchedNote,
          }"
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
        @background-change="noteBackground = $event"
        @background-scroll="noteBackgroundRef?.setScrollShift($event)"
      />
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
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
import Logo from '@/components/Logo/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
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

import NoteCardCopy from './NoteCardCopy.vue'
import NoteModalBackground from './NoteModalBackground.vue'

// 正文解析、代码高亮和公式样式只在首次打开详情时加载。
const NoteReader = defineAsyncComponent(() => import('./NoteReader.vue'))

const noteBackgroundRef = ref<InstanceType<typeof NoteModalBackground> | null>(
  null
)
const noteBackground = ref<{
  image?: string
  height: number
  phase: string
  overscan: number
}>({
  height: 0,
  phase: 'pending',
  overscan: 8,
})

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
const contentRevealed = ref(false)
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
// 避免 note 查询参数变化连带重建索引和卡片。
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
  hasSwitchedNote,
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

const paginatedCards = computed<StudyNoteCard[]>(() => {
  const pageStart = (currentPage.value - 1) * PAGE_SIZE
  const pageNotes = filteredNotes.value.slice(pageStart, pageStart + PAGE_SIZE)

  return pageNotes.map((note, noteIndex) => ({
    note,
    dateLabel: note.time.replace(/-/g, '/'),
    thumbnail: note.image ? getCardThumbnailUrl(note.image) : undefined,
    mobileThumbnail: note.image
      ? getCardMobileThumbnailUrl(note.image)
      : undefined,
    style: { '--note-index': noteIndex },
  }))
})

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
})

onBeforeUnmount(() => {
  disposed = true
  activationAnimations.forEach((animation) => animation.cancel())
})

const setPage = (page: number) => {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  noteViewportRef.value?.scrollRoot?.scrollTo({ top: 0 })
}
const refreshNotes = async () => {
  await reload()
  if (disposed || notesError.value) return
  showSuccessMessage('NOTES已刷新')
}
// 后台刷新和失败后的重试也可能缩短列表，统一收敛当前页。
watch(
  totalPages,
  (pages) => {
    if (currentPage.value > pages) setPage(pages)
  },
  { flush: 'post' }
)
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
  padding: 0;
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
  padding: 0;
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
  column-gap: 24px;
  row-gap: 12px;
  opacity: 0;

  &.is-ready {
    --note-entry-play-state: running;
    opacity: 1;
  }
}

.study-note-card {
  --note-ribbon-outset: 0px;
  --note-card-enter-duration: 450ms;
  --note-card-enter-delay: calc(0.08s + var(--note-index) * 100ms);
  --note-border-color: color-mix(in srgb, var(--border-color) 98%, #000 2%);
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: visible;
  border: 1px solid var(--note-border-color);
  background-color: color-mix(in srgb, var(--bg-color) 82%, transparent);
  box-shadow: 0 14px 34px var(--shadow-color);
  color: inherit;
  isolation: isolate;
  text-decoration: none;
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
    display: inline-flex;
    align-items: baseline;
    min-width: 0;
    margin-inline-start: 4px;
    padding-right: 0.2rem;
    white-space: nowrap;
    color: var(--note-copy-color, @red);
    .note-meta-typography();
    .note-category-typography();
    font-size: 0.54rem;
  }

  &__category-text {
    .note-category-text();
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__visual {
    position: relative;
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    justify-content: center;
    margin: 0;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.1);
    -webkit-mask-image: linear-gradient(to bottom, #000 20%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 20%, transparent 100%);
    animation: studyNoteCoverFadeIn var(--note-card-enter-duration) ease-out both;
    animation-delay: var(--note-card-enter-delay);
    animation-play-state: var(--note-entry-play-state, running);
  }

  &__media {
    position: relative;
    flex: none;
    min-height: 0;
    aspect-ratio: 5 / 3;
    transition: transform 1.3s ease;

    &--default {
      display: grid;
      place-items: center;
      color: color-mix(in srgb, var(--bg-color) 80%, #fff 20%);
    }

    picture {
      display: contents;
    }
  }

  &__logo {
    height: 48%;
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 30%;

  }

  &__copy {
    --note-copy-inset: 16px;
    --note-copy-crop-top: 28px;
    position: relative;
    display: flex;
    flex: none;
    flex-direction: column;
    margin: calc(-56px + var(--note-copy-crop-top)) 0 0
      calc(0px - var(--note-ribbon-outset));
    overflow: visible;
    padding: 0 var(--note-copy-inset) 8px
      calc(var(--note-copy-inset) + var(--note-ribbon-outset));
    &::before {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      border: 1px solid fade(@red, 50%);
      content: '';
      pointer-events: none;
      transform-origin: center bottom;
      animation: studyNoteFrameReveal var(--note-card-enter-duration)
        cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: var(--note-card-enter-delay);
      animation-play-state: var(--note-entry-play-state, running);
      clip-path: polygon(
        0 0,
        var(--note-title-gap-start, 0px) 0,
        var(--note-title-gap-start, 0px) 4px,
        var(--note-title-gap-end, 100%) 4px,
        var(--note-title-gap-end, 100%) 0,
        100% 0,
        100% 100%,
        0 100%
      );
    }
    &::after {
      position: absolute;
      z-index: 0;
      bottom: 100%;
      left: var(--note-title-gap-start, 0px);
      width: calc(
        var(--note-title-gap-end, 100%) - var(--note-title-gap-start, 0px)
      );
      height: var(--note-title-fade-height, 0px);
      background: linear-gradient(to top, @red, fade(@red, 0%));
      opacity: var(--note-title-fade-opacity, 0);
      transform: scaleY(0);
      transform-origin: center bottom;
      transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
      content: '';
      pointer-events: none;
    }
  }

  &__copy-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    margin-top: calc(0px - var(--note-copy-crop-top));
    animation: studyNoteTextReveal 400ms ease-out both;
    animation-delay: calc(
      var(--note-card-enter-delay) + var(--note-card-enter-duration)
    );
    animation-play-state: var(--note-entry-play-state, running);
  }

  &__date.no-rem {
    display: block;
    flex-shrink: 0;
    margin-left: auto;
    .note-meta-typography();
    .note-date-typography();
    font-size: 0.54rem;
    color: var(--note-date-color, #999);
    white-space: nowrap;
  }

  h2 {
    position: relative;
    width: fit-content;
    max-width: 108.6957%;
    box-sizing: border-box;
    margin: 8px 0 2px;
    padding: 4px 18px 2px 0;
    color: var(--note-copy-color, @red);
    font-family: 'UnboundedSans';
    font-size: 42px;
    .note-title-typography();
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    line-height: 1.15;
    overflow-wrap: anywhere;
    text-transform: none;
    transform-origin: left center;
    transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &.is-activating {
    &::before {
      opacity: 1;
      animation: none;
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

  .study-note-card:hover .study-note-card__copy {
    --note-title-fade-opacity: 1;
    --note-copy-color: #000;
    --note-date-color: #000;
    background: @red;
    animation: studyNoteCopyFlash 280ms steps(1, end) forwards;
  }

  .study-note-card:hover .study-note-card__copy::after {
    transform: scaleY(1);
  }
}

@keyframes studyNoteCopyFlash {
  0%,
  40% {
    --note-copy-color: @red;
    --note-date-color: #999;
    --note-title-fade-opacity: 0;
    background-color: transparent;
  }
  20%,
  60%,
  100% {
    --note-copy-color: #000;
    --note-date-color: #000;
    --note-title-fade-opacity: 1;
    background-color: @red;
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
  flex-shrink: 0;
  padding-top: 12px;
}

@keyframes studyNoteFrameReveal {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes studyNoteTextReveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes studyNoteCoverFadeIn {
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
      --note-copy-inset: 14px;
      padding: 0 var(--note-copy-inset) 6px
        calc(var(--note-copy-inset) + var(--note-ribbon-outset));
    }
  }
}

@media (max-width: 768px) {
  .study-note-stack {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media screen and (max-aspect-ratio: 1) {
  .study-note-card {
    h2 {
      font-size: 60px;
    }

    &__category.no-rem,
    &__date.no-rem {
      font-size: 0.79rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .study-note-card {
    transition: none;

    &__visual,
    &__copy::before,
    &__copy-content {
      animation: none;
      opacity: 1;
      transform: none;
    }

    &__copy::after,
    &__media,
    h2 {
      transition: none;
    }

    &:hover .study-note-card__copy {
      animation: none;
    }
  }
}
</style>

<style lang="less" src="../../styles/noteModal.less"></style>
