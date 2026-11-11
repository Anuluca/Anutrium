<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
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
const props = defineProps<{ article: MonkeyArticle }>()
function returnToShelf(event: MouseEvent) {
  if (!(event.target as Element).closest('.babel-reader-actions button'))
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
  if (sharing.value) return
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
    class="babel-reader no-rem"
    tabindex="-1"
    :aria-label="t('monkeyTypewriter.collectionArticle')"
    @click.capture="flashBeforeAction"
    @click="returnToShelf"
  >
    <header class="babel-reader-heading">
      <h2 class="manuscript-title">{{ article.title }}</h2>
      <time :datetime="article.createdAt">{{
        article.createdAt.slice(0, 10).replace(/-/g, '/')
      }}</time>
    </header>
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
          <pre class="manuscript-highlights">{{ article.content }}</pre>
        </div>
      </div>
      <PageScrollProgress embedded :scroll-target="scroll" />
    </div>
    <nav
      class="babel-reader-toolbar"
      :aria-label="t('monkeyTypewriter.articleActions')"
    >
      <DiamondCloseBtn
        class="reader-close"
        :title="t('monkeyTypewriter.backToShelf')"
        :aria-label="t('monkeyTypewriter.backToShelf')"
      />
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
  </article>
</template>

<style scoped lang="less">
@import '../styles/articleActions.less';
.babel-reader.no-rem {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: clamp(12px, 2vw, 28px);
  box-sizing: border-box;
  background: #090909;
  color: var(--text-color, #fffff4);
  outline: none;
  animation: babelReaderEnter 220ms ease both;
  .babel-reader-toolbar {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: end;
    gap: 16px;
    flex: none;
    padding-top: 20px;
  }
  .reader-close {
    position: relative;
    inset: auto;
    width: 64px;
    height: 64px;
    :deep(.diamond-shape) {
      width: 32px;
      height: 32px;
    }
    :deep(.close-icon) {
      width: 20px;
      height: 20px;
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
    flex: none;
    padding: clamp(18px, 3vh, 36px) 0 20px;
  }
  .manuscript-title {
    margin: 0 0 10px;
    overflow-wrap: anywhere;
    font: 400 clamp(24px, 3vw, 42px) / 1.2 'Anton', 'alibaba-puhuiti',
      sans-serif;
  }
  time {
    color: var(--text-muted);
    font: 400 clamp(20px, 1.7vw, 24px) / 1.5 'UnboundedSans', sans-serif;
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
  .manuscript-highlights {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 400 17px/1.9 'Courier New', 'alibaba-puhuiti', monospace;
  }
}
@media (max-width: 768px) {
  .babel-reader.no-rem .babel-reader-actions > button {
    min-height: 48px;
    font-size: 24px;
    .action-icon {
      flex-basis: 28px;
      width: 28px;
      height: 28px;
    }
  }
}
@keyframes babelReaderEnter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .babel-reader.no-rem {
    animation: none;
  }
}
</style>
