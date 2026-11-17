<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyDocument, Download, Share } from '@element-plus/icons-vue'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import { useMonkeyActionFlash } from '@/composables/useMonkeyActionFlash'
import { useMonkeyShareImage } from '@/composables/useMonkeyShareImage'
import { showErrorMessage } from '@/utils/elementMessage'
import {
  copyMonkeyArticle,
  downloadMonkeyArticle,
  shareMonkeyArticleImage,
} from '@/utils/monkeyArticleActions'

import type { MonkeyArticle } from '@/types/monkeyArticle'

const { t } = useI18n()

const { flashBeforeAction } = useMonkeyActionFlash({
  immediate: (button) => button.classList.contains('reader-close'),
})
const props = defineProps<{
  article: MonkeyArticle | null
  cover: {
    title: string
    number: string
    year: number
    day: string
    createdAt: string
  }
  contentReady: boolean
}>()
const paragraphs = computed(
  () => props.article?.content.match(/[\s\S]+?(?:\n\n|$)/g) || []
)
function returnToShelf(event: MouseEvent) {
  if (
    props.contentReady &&
    !(event.target as Element).closest('.babel-reader-actions button')
  )
    emit('back')
}
const emit = defineEmits<{ back: [] }>()
const root = ref<HTMLElement | null>(null)
const scroll = ref<HTMLElement | null>(null)
const sharing = ref(false)
let disposed = false
const {
  file,
  preparing,
  prepare: prepareImage,
} = useMonkeyShareImage({
  root,
  article: () => props.article,
  delay: 0,
})
async function share() {
  if (sharing.value || !props.article) return
  sharing.value = true
  try {
    const image = file.value || (await prepareImage())
    if (!image || disposed) return
    await shareMonkeyArticleImage(image, props.article.title)
  } catch (cause) {
    if (!disposed) showErrorMessage((cause as Error).message)
  } finally {
    sharing.value = false
  }
}
onMounted(() => {
  root.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  disposed = true
})
</script>

<template>
  <article
    ref="root"
    class="babel-book-card no-rem"
    :class="{ 'babel-reader': !!article }"
    tabindex="-1"
    :aria-label="t('monkeyTypewriter.collectionArticle')"
    @click.capture="flashBeforeAction"
    @click="returnToShelf"
  >
    <header class="babel-reader-heading book-opening-cover">
      <span class="book-number">{{ cover.number }}</span>
      <h2 class="manuscript-title book-title">{{ cover.title }}</h2>
      <time class="book-date" :datetime="cover.createdAt"
        ><span>{{ cover.year }}</span
        ><span>{{ cover.day }}</span></time
      >
    </header>
    <DiamondCloseBtn
      v-if="article && contentReady"
      class="reader-close"
      :title="t('monkeyTypewriter.backToShelf')"
      :aria-label="t('monkeyTypewriter.backToShelf')"
    />
    <div
      v-if="article"
      class="babel-reader-content"
      :class="{ 'is-ready': contentReady }"
    >
      <div class="babel-reader-body">
        <div
          ref="scroll"
          class="manuscript"
          data-lenis-prevent
          data-lenis-nested-scroll
          tabindex="0"
          :aria-label="t('monkeyTypewriter.body')"
        >
          <div class="manuscript-body">
            <pre
              class="manuscript-highlights"
            ><span v-for="(paragraph, index) in paragraphs" :key="index" class="reader-paragraph">{{ paragraph }}</span></pre>
          </div>
        </div>
        <PageScrollProgress embedded :scroll-target="scroll" />
      </div>
      <nav
        class="babel-reader-toolbar"
        :aria-label="t('monkeyTypewriter.articleActions')"
      >
        <div class="babel-reader-actions">
          <button
            type="button"
            :aria-label="t('monkeyTypewriter.copy')"
            @click="copyMonkeyArticle(article)"
          >
            <CopyDocument class="action-icon" aria-hidden="true" /><span
              class="button-label"
              >{{ t('monkeyTypewriter.copy') }}</span
            >
          </button>
          <button
            type="button"
            :aria-label="t('monkeyTypewriter.download')"
            @click="downloadMonkeyArticle(article)"
          >
            <Download class="action-icon" aria-hidden="true" /><span
              class="button-label"
              >{{ t('monkeyTypewriter.download') }}</span
            >
          </button>
          <button
            type="button"
            :aria-label="t('monkeyTypewriter.share')"
            class="share-button"
            :aria-busy="preparing || sharing"
            :disabled="sharing"
            @click="share"
          >
            <Share class="action-icon" aria-hidden="true" /><span
              class="button-label"
              >{{ t('monkeyTypewriter.share') }}</span
            >
          </button>
        </div>
      </nav>
    </div>
  </article>
</template>

<style scoped lang="less">
@import '../styles/articleActions.less';
.babel-book-card.no-rem {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  padding: 0;
  box-sizing: border-box;
  background: #090909;
  color: var(--text-color, #fffff4);
  outline: none;

  .babel-reader-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: end;
    gap: 16px;
    flex: none;
    padding-top: 20px;
  }
  .reader-close {
    position: absolute;
    inset: auto;
    left: calc(var(--book-meta-center) - 22px);
    bottom: var(--book-meta-bottom);
    width: 44px;
    height: 44px;
    z-index: 2;
    :deep(.diamond-shape) {
      width: 24px;
      height: 24px;
    }
    :deep(.close-icon) {
      width: 16px;
      height: 16px;
    }
    &:focus-visible {
      outline: 2px solid var(--page-theme-color, #e23456);
      outline-offset: 2px;
    }
  }
  .babel-reader-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    min-width: 0;
    > button {
      .monkey-article-action();
      min-width: 0;
      max-width: 100%;
      min-height: 54px;
      padding: 8px 12px 8px 6px;
      font-size: 28px;
      .button-label {
        min-width: 0;
        white-space: normal;
      }
      .action-icon {
        flex-basis: 32px;
        width: 32px;
        height: 32px;
      }
      &:focus-visible {
        outline: 2px solid var(--page-theme-color, #e23456);
        outline-offset: 2px;
      }
    }
  }
  .babel-reader-heading {
    margin: 0;
    padding: 0;
  }
  .babel-reader-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 76px 24px 16px 68px;
    visibility: hidden;
    pointer-events: none;
  }
  .babel-reader-content.is-ready {
    visibility: visible;
    pointer-events: auto;
  }
  .babel-reader-body {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .manuscript {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding-right: 16px;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .reader-paragraph {
    display: block;
  }
  .manuscript-highlights {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 400 17px/1.9 'Courier New', 'alibaba-puhuiti', monospace;
  }
}
@media (max-width: 768px) {
  .babel-book-card.no-rem .babel-reader-actions > button {
    min-height: 48px;
    font-size: 24px;
    .action-icon {
      flex-basis: 28px;
      width: 28px;
      height: 28px;
    }
  }
}
</style>
