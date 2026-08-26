<template>
  <div class="study-notes-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :title="t('island.modules.notes.studyNotes.title')"
    />

    <main ref="noteListRef" class="study-note-list">
      <section
        v-if="paginatedCards.length"
        ref="noteStackRef"
        :key="`notes-page-${currentPage}`"
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
          }"
          :to="card.note.path"
          :style="card.style"
        >
          <span class="study-note-card__category no-rem">
            {{ typeMap[card.note.type].label }}
          </span>

          <div v-if="card.note.image" class="study-note-card__visual">
            <img
              class="study-note-card__image"
              :src="card.note.image"
              :alt="card.note.title"
              decoding="async"
              loading="lazy"
              @load="scheduleMasonryLayout"
            />
          </div>

          <div class="study-note-card__copy">
            <time
              class="study-note-card__date no-rem"
              :datetime="card.note.time"
            >
              {{ card.dateLabel }}
            </time>
            <h2>{{ card.note.title }}</h2>
          </div>
        </RouterLink>
      </section>

      <div v-else class="study-note-empty">
        {{ t('island.modules.notes.studyNotes.empty') }}
      </div>

      <nav
        v-if="totalPages > 1"
        class="study-note-pagination"
        :aria-label="t('flanerie.pageLabel')"
      >
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
        >
          {{ t('flanerie.previousPage') }}
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
          {{ t('flanerie.nextPage') }}
        </button>
      </nav>
    </main>

    <PageFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { scrollPageTo } from '@/utils/pageScroll'

type StudyNoteType = 'frontend' | 'other'

interface StudyNote {
  id: string
  title: string
  time: string
  image?: string
  path: string
  type: StudyNoteType
}

interface StudyNoteTypeConfig {
  label: string
}

interface StudyNoteCard {
  note: StudyNote
  dateLabel: string
  style: Record<string, string | number>
}

const PAGE_SIZE = 20
const ENGLISH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})

const { locale, t, tm } = useI18n()
const route = useRoute()
const router = useRouter()
const noteListRef = ref<HTMLElement | null>(null)
const noteStackRef = ref<HTMLElement | null>(null)
const masonryReady = ref(false)
let masonryFrame: number | undefined
let masonryObserver: ResizeObserver | undefined

const notes = computed(
  () => tm('island.modules.notes.studyNotes.data') as StudyNote[]
)
const typeMap = computed(
  () =>
    tm('island.modules.notes.studyNotes.typeMap') as Record<
      StudyNoteType,
      StudyNoteTypeConfig
    >
)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(notes.value.length / PAGE_SIZE))
)

const normalizePage = (value: unknown, maxPage: number) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value
  const page = Number(normalizedValue)

  if (!Number.isInteger(page)) return 1
  return Math.min(Math.max(1, page), maxPage)
}

const currentPage = computed(() =>
  normalizePage(route.query.page, totalPages.value)
)

const formatNoteDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)

  if (locale.value !== 'en') {
    return `${year} 年 ${month} 月 ${day} 日`
  }

  return ENGLISH_DATE_FORMATTER.format(new Date(year, month - 1, day))
}

const paginatedCards = computed<StudyNoteCard[]>(() => {
  const pageStart = (currentPage.value - 1) * PAGE_SIZE
  const pageNotes = notes.value.slice(pageStart, pageStart + PAGE_SIZE)

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

  cards.forEach((card) => {
    const cardHeight = card.offsetHeight
    if (cardHeight <= 0) {
      hasCompleteMeasurements = false
      return
    }

    const rowSpan = Math.ceil((cardHeight + masonryGap) / rowHeight)
    const gridRowEnd = `span ${rowSpan}`

    if (card.style.gridRowEnd !== gridRowEnd) {
      card.style.gridRowEnd = gridRowEnd
    }
  })

  masonryReady.value = hasCompleteMeasurements
}

const scheduleMasonryLayout = () => {
  if (masonryFrame !== undefined) cancelAnimationFrame(masonryFrame)
  masonryFrame = requestAnimationFrame(() => {
    masonryFrame = undefined
    updateMasonryLayout()
  })
}

const observeMasonryLayout = async () => {
  masonryReady.value = false
  await nextTick()

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
  masonryObserver?.disconnect()
  if (masonryFrame !== undefined) cancelAnimationFrame(masonryFrame)
})

const setPage = async (page: number) => {
  const nextPage = Math.min(Math.max(1, page), totalPages.value)
  if (nextPage === currentPage.value) return

  await router.replace({
    query: {
      ...route.query,
      page: nextPage === 1 ? undefined : String(nextPage),
    },
  })
  await nextTick()

  if (noteListRef.value) {
    const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')
    const menuBottom = menu?.getBoundingClientRect().bottom || 0
    const listTop =
      noteListRef.value.getBoundingClientRect().top +
      window.scrollY -
      menuBottom -
      20
    scrollPageTo({ top: Math.max(0, listTop), behavior: 'smooth' })
  }
}
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;

.study-notes-page {
  color: var(--text-color);
  overflow: hidden;
}

.study-note-list {
  padding: 24px 0 36px;
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
  position: relative;
  display: block;
  align-self: start;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background-color: var(--surface-color);
  background-image: linear-gradient(@red, @red);
  background-position: left center;
  background-repeat: no-repeat;
  background-size: 0 100%;
  box-shadow: 0 14px 34px var(--shadow-color);
  break-inside: avoid;
  color: inherit;
  isolation: isolate;
  text-decoration: none;
  clip-path: inset(0 100% 100% 0);
  animation: studyNoteCardRevealIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.14s + var(--note-index) * 120ms);
  transition: background-size 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s ease;

  &::after {
    position: absolute;
    z-index: 3;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    box-sizing: border-box;
    border: 1px solid var(--border-color);
    content: '';
    pointer-events: none;
    animation: studyNoteCardBorderIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.14s + var(--note-index) * 120ms);
  }

  &__category.no-rem {
    display: block;
    padding: 16px 16px 12px;
    color: @red;
    font-family: @mono;
    font-size: 20px;
    font-weight: normal;
    line-height: 1;
    transition: color 0.3s ease;
  }

  &__visual {
    margin: 0 16px;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.1);
  }

  &__image {
    display: block;
    width: 100%;
    height: auto;
    filter: saturate(0.68) contrast(1.03);
    transition: filter 0.45s ease, transform 0.65s ease;
  }

  &__copy {
    padding: 12px 16px 20px;
  }

  &__date.no-rem {
    display: block;
    color: var(--text-muted);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    opacity: 0.5;
    transition: color 0.3s ease;
    white-space: nowrap;
  }

  &--without-image {
    .study-note-card__copy {
      padding-top: 18px;
      padding-bottom: 28px;
    }
  }

  h2 {
    margin: 8px 0 0;
    color: var(--text-color);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(19px, 1.65vw, 28px);
    font-weight: 900;
    line-height: 1.08;
    text-wrap: balance;
    transform-origin: left top;
    transition: color 0.3s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover {
    background-size: 100% 100%;
    box-shadow: -32px 0 56px 10px rgba(226, 52, 86, 0.31),
      32px 0 56px 10px rgba(226, 52, 86, 0.31);

    &::after {
      border-color: rgba(255, 255, 255, 0.25);
    }

    .study-note-card__date {
      color: #000;
    }

    .study-note-card__category {
      color: #fff;
    }

    h2 {
      color: #000;
      transform: scale(1.04);
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

.study-note-empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

.study-note-pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 42px;

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
  .study-notes-page {
    padding-top: 88px;
  }

  .study-note-list {
    padding: 38px 18px 28px;
  }

  .study-note-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .study-note-card {
    &__category.no-rem {
      padding: 14px 14px 10px;
      font-size: 18px;
    }

    &__visual {
      margin: 0 14px;
    }

    &__copy {
      padding: 10px 14px 18px;
    }

    &--without-image {
      .study-note-card__copy {
        padding-top: 16px;
        padding-bottom: 24px;
      }
    }

    h2 {
      font-size: clamp(18px, 3vw, 23px);
    }
  }

  .study-note-pagination {
    margin-top: 30px;
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

  .study-note-card {
    h2 {
      font-size: clamp(20px, 5.6vw, 26px);
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
  }
}
</style>
