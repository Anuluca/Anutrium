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
import { Bottom, Refresh } from '@element-plus/icons-vue'
import { usePreferredReducedMotion, useResizeObserver } from '@vueuse/core'

import LoadingLogo from '@/components/LoadingLogo/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import { createBabelBookOpening } from '@/utils/babelBookOpening'
import { showErrorMessage } from '@/utils/elementMessage'

import BabelArticleReader from './BabelArticleReader.vue'
import BabelPhoto from './BabelPhoto.vue'

import type { MonkeyArticle, MonkeyArticleSummary } from '@/types/monkeyArticle'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  articles: MonkeyArticleSummary[]
  loading: boolean
  hasMore: boolean
  revision: number
  readArticle: (id: string) => Promise<MonkeyArticle | null>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  refresh: []
  more: []
  closed: []
}>()
const reducedMotion = usePreferredReducedMotion()
const shelfReady = ref(false)
const stage = ref<HTMLElement | null>(null)
const readerTarget = ref<HTMLElement | null>(null)
const openedArticle = shallowRef<MonkeyArticle | null>(null)
const opening = ref(false)
const closing = ref(false)
const selectedBook = ref('')
const openingPhase = ref('')
let operation = 0
let bookOpening: ReturnType<typeof createBabelBookOpening> | null = null
let openingSize = { width: 0, height: 0 }
let origin: HTMLElement | null = null
function cancelOpening() {
  operation++
  bookOpening?.cancel()
  bookOpening = null
  opening.value = false
  closing.value = false
  openingPhase.value = ''
  if (!openedArticle.value) selectedBook.value = ''
}
watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) cancelOpening()
  }
)
onBeforeUnmount(cancelOpening)
const resizeOpening = useFrameTask(() => {
  if (!bookOpening || !stage.value) return
  const bounds = stage.value.getBoundingClientRect()
  if (
    Math.abs(bounds.width - openingSize.width) > 1 ||
    Math.abs(bounds.height - openingSize.height) > 1
  ) {
    openingSize = bounds
    bookOpening.finish()
  }
})
useResizeObserver(stage, resizeOpening.schedule)
async function openBook(event: MouseEvent, id: string) {
  if (opening.value || props.loading || !stage.value || !readerTarget.value)
    return
  const button = event.currentTarget as HTMLElement
  origin = button
  const current = ++operation
  opening.value = true
  selectedBook.value = id
  openingSize = stage.value.getBoundingClientRect()
  const transition = createBabelBookOpening(
    stage.value,
    button,
    readerTarget.value,
    (phase) => {
      openingPhase.value = phase
    },
    reducedMotion.value === 'reduce'
  )
  bookOpening = transition
  try {
    const [article, completed] = await Promise.all([
      props.readArticle(id),
      transition.finished,
    ])
    if (current !== operation || !props.modelValue || !article || !completed)
      return
    openedArticle.value = article
    await nextTick()
    await transition.reveal()
  } catch (cause) {
    if (current === operation) showErrorMessage((cause as Error).message)
  } finally {
    transition.cancel()
    if (current === operation) {
      bookOpening = null
      opening.value = false
      openingPhase.value = ''
      if (!openedArticle.value) selectedBook.value = ''
    }
  }
}
async function backToShelf() {
  if (
    opening.value ||
    !openedArticle.value ||
    !stage.value ||
    !readerTarget.value ||
    !origin
  )
    return
  const current = ++operation
  opening.value = true
  closing.value = true
  openingSize = stage.value.getBoundingClientRect()
  const transition = createBabelBookOpening(
    stage.value,
    origin,
    readerTarget.value,
    (phase) => {
      openingPhase.value = phase
    },
    reducedMotion.value === 'reduce',
    'close'
  )
  bookOpening = transition
  try {
    const completed = await transition.finished
    if (current !== operation || !props.modelValue || !completed) return
    openedArticle.value = null
    selectedBook.value = ''
  } finally {
    transition.cancel()
    if (current === operation) {
      bookOpening = null
      opening.value = false
      closing.value = false
      openingPhase.value = ''
    }
  }
  if (current === operation && props.modelValue) {
    await nextTick()
    origin?.focus({ preventScroll: true })
  }
}
const booksReady = computed(
  () => shelfReady.value || reducedMotion.value === 'reduce'
)
const dates = new WeakMap<MonkeyArticleSummary, { year: number; day: string }>()
function bookDate(item: MonkeyArticleSummary) {
  let formatted = dates.get(item)
  if (!formatted) {
    const date = new Date(item.createdAt)
    formatted = {
      year: date.getFullYear(),
      day: `${String(date.getMonth() + 1).padStart(2, '0')}.${String(
        date.getDate()
      ).padStart(2, '0')}`,
    }
    dates.set(item, formatted)
  }
  return formatted
}
const books = computed(() =>
  props.articles.map((item, index) => ({
    id: item.id,
    title: item.title,
    createdAt: item.createdAt,
    number: String(index + 1).padStart(3, '0'),
    ...bookDate(item),
    delay: `${index * 55}ms`,
  }))
)
</script>

<template>
  <ModalWrapper
    :model-value="modelValue"
    width="var(--reader-modal-width)"
    :dialog-class="`babel-library-dialog${
      openedArticle ? ' babel-library-dialog--reading' : ''
    }`"
    :close-title="t('monkeyTypewriter.close')"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <section
      ref="stage"
      class="babel-library no-rem"
      :class="{
        'is-reading': !!openedArticle && !closing,
        'is-opening': opening,
        'is-unfolding':
          !closing &&
          (openingPhase === 'unfolding' || openingPhase === 'ready'),
      }"
      :aria-busy="opening"
      :aria-label="t('monkeyTypewriter.library')"
      @click.self="openedArticle && backToShelf()"
    >
      <aside class="library-art" @animationend.self="shelfReady = true">
        <BabelPhoto :animated="false" />
      </aside>
      <div class="library-catalogue">
        <div class="library-toolbar">
          <button
            class="library-refresh"
            type="button"
            :aria-label="t('monkeyTypewriter.refresh')"
            :disabled="loading || opening"
            @click="emit('refresh')"
          >
            <Refresh aria-hidden="true" :class="{ 'is-loading': loading }" />
          </button>
        </div>
        <div class="library-scroll" data-lenis-prevent :aria-busy="loading">
          <div
            v-if="booksReady"
            class="library-books"
            role="list"
            :aria-label="t('monkeyTypewriter.bookList')"
          >
            <div
              v-for="book in books"
              :key="`${revision}:${book.id}`"
              class="library-book-entry"
              role="listitem"
              :style="{ '--book-delay': book.delay }"
            >
              <button
                class="library-book"
                :class="{ 'is-selected': selectedBook === book.id }"
                type="button"
                :aria-label="`${book.number} ${book.title}`"
                :disabled="loading || opening"
                @click="openBook($event, book.id)"
              >
                <span class="book-number">{{ book.number }}</span>
                <span class="book-title-space"
                  ><span class="book-title" lang="en">{{
                    book.title
                  }}</span></span
                >
                <time class="book-date" :datetime="book.createdAt"
                  ><span>{{ book.year }}</span
                  ><span>{{ book.day }}</span></time
                >
              </button>
            </div>
          </div>
          <button
            v-if="hasMore"
            class="library-more"
            type="button"
            :aria-label="t('monkeyTypewriter.loadMore')"
            :disabled="loading || opening"
            @click="emit('more')"
          >
            <Bottom aria-hidden="true" />
          </button>
        </div>
      </div>
      <LoadingLogo
        v-if="opening && loading && openingPhase === 'ready'"
        class="book-opening-loading"
      />
      <div
        ref="readerTarget"
        class="library-reader-region"
        :class="{ 'is-active': !!openedArticle, 'is-closing': closing }"
        @click.self="backToShelf"
      >
        <BabelArticleReader
          v-if="openedArticle"
          :article="openedArticle"
          @back="backToShelf"
        />
      </div>
    </section>
  </ModalWrapper>
</template>

<style scoped lang="less">
.babel-library.no-rem {
  --accent: var(--page-theme-color, #e23456);
  display: grid;
  grid-template-columns: minmax(0, 36%) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(12px, 3vw, 40px);
  position: relative;
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  color: var(--text-color, #fffff4);
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    cursor: pointer;
    color: inherit;
  }
  button:disabled {
    cursor: wait;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  .library-art {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    animation: babelShelfEnter 500ms cubic-bezier(0.22, 1, 0.36, 1) 460ms both;
  }
  .library-art :deep(.babel-photo) {
    flex: none;
    width: auto;
    height: 100%;
  }
  .library-art,
  .library-catalogue {
    transition: opacity 180ms ease;
  }
  &.is-reading,
  &.is-unfolding {
    .library-art,
    .library-catalogue {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
  }
  &.is-opening {
    .library-art,
    .library-catalogue {
      pointer-events: none;
    }
  }
  .library-reader-region {
    position: absolute;
    inset: clamp(10px, 2vw, 28px);
    z-index: 4;
    pointer-events: none;
    min-width: 0;
    min-height: 0;
  }
  .library-reader-region.is-closing {
    z-index: 7;
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
  }
  .library-reader-region.is-active:not(.is-closing) {
    pointer-events: auto;
  }
  .library-book.is-selected {
    visibility: hidden;
  }
  .book-opening-loading {
    position: absolute;
    z-index: 7;
    top: 50%;
    left: 50%;
    width: 36px;
    height: 36px;
    transform: translate(-50%, -50%);
  }
  .library-catalogue {
    padding: clamp(12px, 2vw, 28px) clamp(12px, 2vw, 28px)
      clamp(12px, 2vw, 28px) 0;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .library-toolbar {
    display: flex;
    justify-content: flex-end;
    flex: none;
    padding-bottom: 16px;
  }
  .library-refresh,
  .library-more {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    padding: 7px;
    border: 0;
    background: transparent;
    svg {
      width: 22px;
      height: 22px;
    }
  }
  .library-refresh {
    animation: babelRefreshEnter 420ms ease 460ms both;
  }
  .library-more {
    margin: 20px auto 0;
  }
  .library-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 4px;
  }
  .library-books {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
    gap: 16px 10px;
  }
  .library-book-entry {
    min-width: 0;
    animation: babelBookEnter 460ms cubic-bezier(0.22, 1, 0.36, 1)
      var(--book-delay) both;
  }
  .library-book {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 572px;
    padding: 16px 8px 12px;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 7%, #050505);
    font-weight: 400;
    transition: border-color 180ms ease, background-color 180ms ease;
  }
  .book-number {
    flex: none;
    font: 400 18px/1.3 'UnboundedSans', sans-serif;
    color: var(--accent);
  }
  .book-title-space {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
  }
  .book-title {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font: 400 25px/1.15 'Anton', 'alibaba-puhuiti', sans-serif;
    transform: translate(-50%, -50%) rotate(90deg);
  }
  .book-date {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font: 400 18px/1 'Anton', sans-serif;
    color: var(--text-muted);
  }
  @media (hover: hover) and (pointer: fine) {
    .library-book:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, #050505);
    }
    .library-refresh:hover,
    .library-more:hover {
      color: var(--accent);
    }
  }
}
@media (min-width: 769px) {
  .babel-library.no-rem .library-art {
    justify-content: flex-start;
    padding: clamp(24px, 3vw, 40px) 0 clamp(24px, 3vw, 40px)
      clamp(24px, 3vw, 40px);
    -webkit-mask-image: linear-gradient(to right, #000 55%, transparent);
    mask-image: linear-gradient(to right, #000 55%, transparent);
    :deep(.babel-photo > img),
    :deep(.photo-fuzzy-canvas) {
      -webkit-mask-image: none;
      mask-image: none;
    }
    :deep(.photo-scanlines) {
      -webkit-mask-image: var(--photo-source);
      mask-image: var(--photo-source);
    }
  }
}
@media (max-width: 768px) {
  .babel-library.no-rem {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 8px;
    padding-top: 12px;
    .library-art {
      align-items: flex-start;
      justify-self: center;
      width: min(340px, 86vw, calc(var(--reader-modal-height) * 0.5));
      height: auto;
      aspect-ratio: 240 / 149;
      -webkit-mask-image: linear-gradient(to bottom, #000 35%, transparent);
      mask-image: linear-gradient(to bottom, #000 35%, transparent);
      :deep(.babel-photo) {
        width: 100%;
        height: auto;
      }
    }
    .library-catalogue {
      padding: 0 12px 12px;
    }
    .library-scroll {
      container-type: size;
    }
    .library-books {
      --library-book-height: min(220px, calc((100cqh - 12px) / 2));
      grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
      gap: 12px 8px;
    }
    .library-book {
      height: var(--library-book-height);
      padding: 8px 4px;
    }
    .book-number {
      font-size: 14px;
    }
    .book-title {
      width: max(0px, calc(var(--library-book-height) - 68px));
      font-size: 18px;
    }
    .book-date {
      gap: 2px;
      font-size: 13px;
    }
  }
}
@keyframes babelShelfEnter {
  from {
    opacity: 0;
    transform: translateY(-36px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes babelRefreshEnter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes babelBookEnter {
  from {
    opacity: 0;
    transform: translateY(-28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .babel-library.no-rem {
    .library-art,
    .library-refresh,
    .library-book-entry {
      animation: none;
    }
  }
}
</style>

<style lang="less">
@import '../../../assets/style/readerModalSize.less';
@import '../styles/bookOpening.less';

.modal-wrapper-dialog.babel-library-dialog.no-rem {
  .reader-modal-size();
  height: var(--reader-modal-height);
  max-height: none !important;
  padding: 0 !important;
  .modal-scroll-region {
    position: relative;
    overflow: hidden;
  }
  > .el-dialog__body > .modal-scroll-progress {
    display: none;
  }
}
.modal-wrapper-dialog.babel-library-dialog--reading .modal-close-row {
  display: none;
}
.modal-wrapper-dialog.babel-library-dialog.no-rem:not(
    .modal-wrapper-dialog--origin-motion
  ) {
  width: var(--reader-modal-width) !important;
}
@media (min-width: 769px) {
  .modal-wrapper-dialog.babel-library-dialog.no-rem
    .modal-close-row
    .diamond-close-btn {
    top: calc(
      100% + var(--modal-border-width) +
        (100dvh - var(--reader-modal-height) - 0.4rem) / 4
    );
  }
}
@media (max-width: 768px) {
  body:has(.babel-library-dialog) {
    .mobile-experience-alert,
    .footer-com,
    .footer-bottom-gradient {
      visibility: hidden;
    }
  }
  .modal-wrapper-dialog.babel-library-dialog.no-rem {
    .reader-modal-mobile-size();
    margin: var(--reader-modal-top-gap) var(--reader-modal-right-gap)
      var(--reader-modal-bottom-gap) var(--reader-modal-left-gap) !important;
    .modal-close-row .diamond-close-btn {
      top: calc(
        100% + var(--modal-border-width) +
          (var(--reader-modal-bottom-gap) - 76px) / 2
      );
      width: 44px;
      height: 44px;
    }
  }
}
</style>
