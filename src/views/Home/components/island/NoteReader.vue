<template>
  <article class="note-reader no-rem" :class="{ 'is-loading': loading }">
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
        <h1>{{ note.metadata.title }}</h1>
      </header>
      <!-- 渲染器仅允许受控展示标签并校验链接协议，正文来自 Markdown 转换。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="note-markdown" @click="followNoteAnchor" v-html="html" />
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading } from '@element-plus/icons-vue'

import { notesEndpoint } from '@/composables/useNotes'
import { NOTE_CATEGORIES } from '@/config/noteCategories'
import { parseNoteDocument } from '@/utils/noteDocument'
import { renderNoteMarkdown } from '@/utils/renderNoteMarkdown'

import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

const props = defineProps<{ id: string }>()
const { locale } = useI18n()
const note = ref<ReturnType<typeof parseNoteDocument> | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
const html = computed(() =>
  note.value ? renderNoteMarkdown(note.value.body) : ''
)
const followNoteAnchor = (event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href^="#"]'
  )
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return
  const content = event.currentTarget as HTMLElement
  const scrollRegion = content.closest<HTMLElement>('.modal-scroll-region')
  let id: string
  try {
    id = decodeURIComponent(link.hash.slice(1))
  } catch {
    return
  }
  const target = content.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
  if (!target || !scrollRegion) return
  event.preventDefault()
  scrollRegion.scrollTo({
    top:
      scrollRegion.scrollTop +
      target.getBoundingClientRect().top -
      scrollRegion.getBoundingClientRect().top,
  })
}
const load = async () => {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  error.value = ''
  note.value = null
  try {
    if (!/^[0-9a-f-]{36}$/.test(props.id)) throw new Error('not_found')
    const response = await fetch(`${notesEndpoint}/${props.id}`, {
      cache: 'no-store',
      signal: current.signal,
    })
    if (!response.ok)
      throw new Error(response.status === 404 ? 'not_found' : 'unavailable')
    const source = await response.text()
    if (current.signal.aborted) return
    note.value = parseNoteDocument(source)
  } catch (reason) {
    if (current.signal.aborted) return
    error.value =
      locale.value === 'en'
        ? 'Unable to read this note. It may not exist or the service is unavailable.'
        : reason instanceof Error && reason.message === 'not_found'
        ? '未找到这篇笔记。'
        : '笔记暂时无法读取，请重试。'
  } finally {
    if (!current.signal.aborted) loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })
onBeforeUnmount(() => {
  controller?.abort()
})
</script>

<style lang="less" scoped>
@import '../../styles/noteTypography.less';

.note-reader.no-rem {
  padding: 32px clamp(16px, 4vw, 56px) 48px;
  min-width: 0;
  font-size: 18px;
  line-height: 1.85;
  overflow-wrap: anywhere;
  &.is-loading {
    display: grid;
    flex: 1;
    place-items: center;
    padding: 0;
    color: var(--modal-theme-color, var(--page-theme-color, #e23456));
  }
  .note-reader__loading {
    display: grid;
    place-items: center;
  }
  a {
    color: #e23456;
  }
  .note-reader__error {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
    button {
      flex-shrink: 0;
      cursor: pointer;
    }
  }
  .note-reader__header {
    margin: 0 0 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
    text-align: center;
    h1 {
      .note-title-typography();
      margin: 8px 0 0;
      color: var(--text-color);
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 78px;
      line-height: 1.4;
      transform-origin: center;
    }
  }
  .note-reader__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 32px;
    .note-meta-typography();
    time {
      color: var(--text-muted);
      opacity: 0.5;
      white-space: nowrap;
    }
  }
  .note-reader__category {
    color: #e23456;
    white-space: nowrap;
  }
  .note-reader__category-text {
    .note-category-text();
  }
  :deep(.note-markdown) {
    min-width: 0;
    font-weight: 700;
    overflow-wrap: anywhere;

    strong,
    b {
      font-weight: 900;
    }

    .katex-display {
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      padding-block: 8px;
    }

    .note,
    .tip,
    .attention,
    .warning {
      margin: 1em 0;
      padding: 8px 16px;
      border-left: 3px solid var(--note-container-color, #6ab0de);
      background: color-mix(
        in srgb,
        var(--note-container-color, #6ab0de) 10%,
        transparent
      );
    }
    .tip {
      --note-container-color: #1abc9c;
    }
    .attention,
    .warning {
      --note-container-color: #f0b37e;
    }

    dt {
      font-weight: 900;
    }
    dd {
      margin-left: 1.5em;
    }
    u,
    ins {
      text-decoration: underline;
    }
    mark {
      background: #f0ce65;
      color: #161616;
    }
    sub,
    sup {
      font-size: 0.75em;
      line-height: 0;
      position: relative;
    }
    sub {
      bottom: -0.25em;
    }
    sup {
      top: -0.5em;
    }
    .katex sub,
    .katex sup {
      position: static;
    }
    .task-list-item {
      list-style: none;
    }
    .task-list-item-checkbox {
      margin-right: 0.5em;
      accent-color: #e23456;
    }

    .note-image-caption,
    figcaption {
      display: block;
      margin: 8px 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85em;
    }
    .note-code-block {
      margin: 1em 0;
      min-width: 0;
    }
    .note-code-block figcaption {
      text-align: left;
    }
    .note-code-line {
      display: block;
      min-height: 1.5em;
    }
    .note-code-line::before {
      display: inline-block;
      width: 2.5em;
      margin-right: 1em;
      color: var(--text-muted);
      text-align: right;
      content: attr(data-line);
      user-select: none;
    }
    .note-code-line.is-marked {
      background: rgba(226, 52, 86, 0.18);
    }
    .note-quote.right {
      border-left: 0;
      border-right: 3px solid #e23456;
    }
    .note-quote footer {
      color: var(--text-muted);
      font-size: 0.85em;
    }
    .note-embed {
      margin: 1em 0;
      aspect-ratio: 16 / 9;
    }
    .note-embed iframe {
      display: block;
      border: 0;
      width: 100%;
      height: 100%;
    }
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 1.6em 0 0.65em;
      font-weight: 900;
      line-height: 1.45;
    }
    h1 {
      font-size: 25px;
    }
    h2 {
      font-size: 21px;
    }
    h3 {
      font-size: 18px;
    }
    p,
    ul,
    ol,
    blockquote,
    pre,
    table {
      margin: 1em 0;
    }
    ul {
      padding-left: 1.6em;
      list-style: disc;
    }
    ol {
      padding-left: 1.6em;
      list-style: decimal;
    }
    li > ul {
      list-style: circle;
    }
    a {
      text-decoration: underline;
    }
    blockquote {
      padding: 8px 16px;
      border-left: 3px solid #e23456;
      background: var(--surface-color);
      color: var(--text-muted);
    }
    pre {
      max-width: 100%;
      overflow: auto;
      padding: 16px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }
    code {
      font-family: Consolas, monospace;
      font-size: 0.88em;
      white-space: break-spaces;
    }
    pre code {
      white-space: pre;
    }
    :not(pre) > code {
      padding: 2px 5px;
      background: var(--surface-color);
      color: #e23456;
    }
    table {
      display: block;
      max-width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      text-align: left;
    }
    th {
      font-weight: 900;
      background: var(--surface-color);
    }
    img {
      max-width: 100%;
      height: auto;
    }
    hr {
      margin: 24px 0;
      border: 0;
      border-top: 1px solid var(--border-color);
    }
  }
}
@media screen and (max-aspect-ratio: 1) {
  .note-reader.no-rem .note-reader__meta {
    font-size: 0.6844433rem;
  }
}
</style>
