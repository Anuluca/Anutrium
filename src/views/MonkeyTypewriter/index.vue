<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Back,
  Upload,
  Collection,
  CopyDocument,
  Document,
  Download,
  Refresh,
  Share as ShareIcon,
} from '@element-plus/icons-vue'

import { useResizeObserver } from '@vueuse/core'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'

import { islandModules } from '@/config/islandModules'
import { flashActionButton } from '@/utils/flashActionButton'
import {
  showSuccessMessage,
  showErrorMessage,
  showWarningMessage,
} from '@/utils/elementMessage'
import { createMonkeyShareImage } from '@/utils/monkeyShareImage'
import {
  highlightEnglishWords,
  type EnglishWordMatch,
} from '@/utils/englishWordAnalysis'
import ReplicaExperimentLayout from '@/views/AiPlayground/components/ReplicaExperimentLayout.vue'

import FuzzyPhoto from './components/FuzzyPhoto.vue'
import FuzzyImage from './components/FuzzyImage.vue'
import ArticleAnalysis from './components/ArticleAnalysis.vue'

import type {
  MonkeyArticle,
  MonkeyArticlePage,
  MonkeyArticleSummary,
} from '@/types/monkeyArticle'

const typewriterImage =
  'https://assets.anuluca.com/Island/laboratory/monkey-typewriter/20261109_140508_typewriter.webp'

const libraryImage =
  'https://assets.anuluca.com/Island/laboratory/monkey-typewriter/20261109_171447_babel-library.webp'

const experiment = {
  pageTitle: '猴子打字',
  sceneLabel: '无限猴子打字实验室',
  canvas: { width: 1600, height: 912 },
  description: '随机生成文章，巴别图书馆保存着所有人生成过的文章',
}
// 直接访问 Worker，保留真实边缘 IP，避免代理把所有访客归入同一限流桶。
const endpoint = 'https://steam-api.anuluca.com/monkey-articles'
const view = ref<'typewriter' | 'library'>('typewriter')
const libraryTitleReady = ref(false)
watch(view, () => {
  libraryTitleReady.value = false
})
const article = ref<MonkeyArticle | null>(null)
const hasStarted = ref(false)
const visibleCharacters = ref(0)
const busy = ref(false)
const typing = ref(false)
const loading = ref(false)
const error = ref('')
const articles = ref<MonkeyArticleSummary[]>([])
const cursor = ref<string | null>(null)
const hasLoaded = ref(false)
const requestId = ref('')
const saving = ref(false)
const savedSource = ref('')
const shareRoot = ref<HTMLElement | null>(null)
const imageBusy = ref(false)
const sharing = ref(false)
let imageFile: File | null = null
const source = computed(() =>
  article.value
    ? JSON.stringify([article.value.title, article.value.content])
    : ''
)
const archived = computed(
  () => !!savedSource.value && savedSource.value === source.value
)
const canSave = computed(
  () =>
    article.value &&
    article.value.title.trim() &&
    article.value.content.trim() &&
    !typing.value &&
    !saving.value &&
    !archived.value
)
function clearImage() {
  imageFile = null
}
watch(
  source,
  () => {
    requestId.value = ''
    error.value = ''

    clearImage()
  },
  { flush: 'sync' }
)
const text = computed(
  () => article.value?.content.slice(0, visibleCharacters.value) || ''
)
const highlightedWords = ref<EnglishWordMatch[]>([])
const highlightSegments = computed(() =>
  highlightEnglishWords(
    article.value?.content || '',
    highlightedWords.value.map((item) => item.word)
  )
)
const manuscriptHighlights = ref<HTMLElement | null>(null)
const manuscript = ref<HTMLElement | null>(null)
const manuscriptEditor = ref<HTMLTextAreaElement | null>(null)
const readingProgress = ref<InstanceType<typeof PageScrollProgress> | null>(
  null
)
// 打字时读取外层滚动位置，编辑时读取 textarea；同帧内容变化合并测量。
const { schedule: scheduleReadingProgress } = useFrameTask(() => {
  const target = manuscriptEditor.value ?? manuscript.value
  const range = target ? target.scrollHeight - target.clientHeight : 0
  const scrollTop = target?.scrollTop ?? 0
  const scrollLeft = target?.scrollLeft ?? 0
  readingProgress.value?.setProgress(
    target && range > 0 ? (scrollTop / range) * 100 : 0
  )
  if (manuscriptHighlights.value) {
    manuscriptHighlights.value.scrollTop = scrollTop
    manuscriptHighlights.value.scrollLeft = scrollLeft
  }
})
useResizeObserver([manuscript, manuscriptEditor], scheduleReadingProgress)
watch(
  [
    text,
    source,
    manuscript,
    manuscriptEditor,
    manuscriptHighlights,
    highlightSegments,
    readingProgress,
  ],
  scheduleReadingProgress,
  { flush: 'post' }
)
let skipRequested = false
let animation = 0
let disposed = false
let listRevision = 0
const controllers = new Set<AbortController>()
const flashingButtons = new Map<HTMLElement, Animation | undefined>()
const replayingButtons = new WeakSet<HTMLElement>()
async function flashBeforeAction(event: MouseEvent) {
  const button = (event.target as Element | null)?.closest<HTMLElement>(
    'button, summary'
  )
  if (
    !button ||
    button.matches(':disabled, [data-image-entry]') ||
    replayingButtons.has(button)
  )
    return
  // 原生分享必须保留当前点击的用户激活：闪烁与业务动作并行，不延后分享事件。
  if (button.classList.contains('share-button')) {
    const flash = flashActionButton(button, 240, { accentColor: '#1dcba9' })
    if (flash) {
      flashingButtons.set(button, flash)
      void flash.finished
        .catch(() => {})
        .finally(() => flashingButtons.delete(button))
    }
    return
  }
  // SKIP 立即响应，避免闪烁结束时打字已完成而误触下一次生成。
  if (button.classList.contains('start-button') && (busy.value || typing.value))
    return
  // 在捕获阶段暂停原点击；闪烁完成后只重放一次，业务回调与 details 默认行为都延后执行。
  event.preventDefault()
  event.stopImmediatePropagation()
  if (flashingButtons.has(button)) return
  const flash = flashActionButton(button, 240, { accentColor: '#1dcba9' })
  flashingButtons.set(button, flash)
  try {
    if (flash) await flash.finished
    if (disposed || !button.isConnected || button.matches(':disabled')) return
    replayingButtons.add(button)
    try {
      button.click()
    } finally {
      replayingButtons.delete(button)
    }
  } catch {
    /* 离场取消动画时不再执行操作。 */
  } finally {
    flashingButtons.delete(button)
  }
}
const messages: Record<string, string> = {
  rate_limited: '操作过于频繁，每分钟最多 5 次，请稍后重试。',
  invalid_body: '标题或正文不符合要求：标题最多 120 字，正文最多 12000 字符。',
  request_conflict: '请求内容已改变，请再次保存。',
  large_body: '正文过长，请缩短后重试。',
  not_found: '这份档案已不在书架上，请刷新图书馆。',
  expired_request: '本次请求已过期，请再次点击开始打字。',
}
async function request<T>(suffix = '', init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  controllers.add(controller)
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${endpoint}${suffix}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok) {
      if (
        data.error === 'expired_request' ||
        data.error === 'request_conflict' ||
        response.status === 410
      )
        requestId.value = ''
      throw new Error(
        messages[data.error] || '档案服务暂时不可用，请稍后重试。'
      )
    }
    return data
  } catch (cause) {
    throw new Error(
      cause instanceof Error &&
      !['TypeError', 'AbortError', 'SyntaxError'].includes(cause.name)
        ? cause.message
        : '连接未完成，请重试。相同请求不会重复存档。'
    )
  } finally {
    clearTimeout(timeout)
    controllers.delete(controller)
  }
}
function finishTyping() {
  cancelAnimationFrame(animation)
  visibleCharacters.value = article.value?.content.length || 0
  typing.value = false
}
function reveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches)
    return finishTyping()
  typing.value = true
  visibleCharacters.value = 0
  const start = performance.now()
  const frame = (now: number) => {
    visibleCharacters.value = Math.min(
      article.value!.content.length,
      Math.floor((now - start) * 0.6)
    )
    if (visibleCharacters.value < article.value!.content.length)
      animation = requestAnimationFrame(frame)
    else typing.value = false
  }
  animation = requestAnimationFrame(frame)
}
function handleTypewriterAction() {
  if (busy.value) {
    skipRequested = true
  } else if (typing.value) {
    finishTyping()
  } else {
    void generate()
  }
}
async function generate() {
  if (busy.value || typing.value) return
  hasStarted.value = true
  skipRequested = false
  busy.value = true
  error.value = ''

  try {
    const result = await request<MonkeyArticle>('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (disposed) return
    article.value = result
    savedSource.value = ''
    if (skipRequested) finishTyping()
    else reveal()
  } catch (cause) {
    if (!disposed) error.value = (cause as Error).message
  } finally {
    if (!disposed) busy.value = false
  }
}
async function saveArticle() {
  if (!canSave.value || !article.value) return
  saving.value = true
  error.value = ''

  try {
    if (!requestId.value)
      requestId.value = `${9999999999999 - Date.now()}-${crypto.randomUUID()}`
    const result = await request<MonkeyArticle>('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestId.value,
        title: article.value.title,
        content: article.value.content,
      }),
    })
    if (disposed) return
    article.value = result
    savedSource.value = source.value
    requestId.value = ''
    hasLoaded.value = false
    listRevision++
    showSuccessMessage('已保存至巴别图书馆，所有访客均可阅读。')
  } catch (cause) {
    if (!disposed) showErrorMessage((cause as Error).message)
  } finally {
    if (!disposed) saving.value = false
  }
}
let imageRevision = 0
let imageTimer: ReturnType<typeof setTimeout> | undefined
let imageJob: Promise<File | null> | null = null
async function prepareShareImage(): Promise<File | null> {
  if (!article.value || !shareRoot.value || typing.value || busy.value)
    return null
  if (imageFile) return imageFile
  if (imageJob) return imageJob
  const revision = imageRevision
  const snapshot = source.value
  imageBusy.value = true
  imageJob = createMonkeyShareImage(
    shareRoot.value,
    article.value.title,
    article.value.content
  )
    .then((file) => {
      if (disposed || revision !== imageRevision || snapshot !== source.value)
        return null
      imageFile = file
      return file
    })
    .finally(() => {
      if (revision === imageRevision) {
        imageBusy.value = false
        imageJob = null
      }
    })
  return imageJob
}
// 提前生成图片，让原生分享直接在点击事件内获得 File，保留移动浏览器用户激活。
watch(
  [source, typing, busy, view, highlightedWords],
  () => {
    clearTimeout(imageTimer)
    imageRevision++
    imageFile = null
    imageJob = null
    imageBusy.value = false
    if (
      !article.value ||
      typing.value ||
      busy.value ||
      view.value !== 'typewriter'
    )
      return
    imageTimer = setTimeout(() => {
      void prepareShareImage().catch(() => {})
    }, 500)
  },
  { flush: 'post' }
)
async function shareImage() {
  if (!article.value || typing.value || busy.value || sharing.value) return
  sharing.value = true
  try {
    const snapshot = source.value
    let file = imageFile
    // 分析异步完成时会使预生成副本失效；同一次点击自动等待最新副本，不能静默丢失分享。
    for (let attempt = 0; !file && attempt < 3; attempt++) {
      file = await prepareShareImage()
      if (disposed || view.value !== 'typewriter') return
      if (snapshot !== source.value) {
        showWarningMessage('内容已更新，请再次点击分享。')
        return
      }
    }
    if (!file || disposed) {
      if (!disposed) showWarningMessage('分享图片正在更新，请稍后重试。')
      return
    }
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: article.value.title })
        if (!disposed) showSuccessMessage('已打开系统图片分享。')
        return
      } catch (cause) {
        if (cause instanceof Error && cause.name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    try {
      triggerDownload(url, file.name)
      showWarningMessage('系统图片分享不可用，已开始下载图片。')
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  } catch (cause) {
    if (!disposed) showErrorMessage((cause as Error).message)
  } finally {
    if (!disposed) sharing.value = false
  }
}
async function loadLibrary(reset = false) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  const revision = ++listRevision
  try {
    const data = await request<MonkeyArticlePage>(
      !reset && cursor.value
        ? `?cursor=${encodeURIComponent(cursor.value)}`
        : ''
    )
    if (disposed || revision !== listRevision) return
    articles.value = reset
      ? data.articles
      : [
          ...articles.value,
          ...data.articles.filter(
            (item) =>
              !articles.value.some((previous) => previous.id === item.id)
          ),
        ]
    cursor.value = data.nextCursor
    hasLoaded.value = true
  } catch (cause) {
    if (!disposed) error.value = (cause as Error).message
  } finally {
    if (!disposed) loading.value = false
  }
}
function openLibrary() {
  finishTyping()
  error.value = ''

  view.value = 'library'
  if (!hasLoaded.value) void loadLibrary(true)
}
async function readArticle(id: string) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await request<MonkeyArticle>(`/${id}`)
    if (disposed) return
    hasStarted.value = true
    article.value = result
    savedSource.value = source.value
    finishTyping()
    view.value = 'typewriter'
  } catch (cause) {
    if (!disposed) error.value = (cause as Error).message
  } finally {
    if (!disposed) loading.value = false
  }
}
async function copyArticle() {
  if (!article.value) return
  error.value = ''

  try {
    await navigator.clipboard.writeText(
      `${article.value.title}\n\n${article.value.content}`
    )
    showSuccessMessage('已复制全文。')
  } catch {
    showWarningMessage('浏览器未允许复制，请使用下载按钮。')
  }
}
function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
function download() {
  if (!article.value) return
  const url = URL.createObjectURL(
    new Blob(
      [
        `${article.value.title}\n${article.value.createdAt}\n\n${article.value.content}`,
      ],
      { type: 'text/plain;charset=utf-8' }
    )
  )
  try {
    triggerDownload(url, `monkey-${article.value.id}.txt`)
    showSuccessMessage('已开始下载 .txt 文件。')
  } catch {
    showErrorMessage('文件下载未能开始，请重试。')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
const date = (value: string) =>
  new Date(value).toLocaleString('zh-CN', { hour12: false })
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(imageTimer)
  imageRevision++
  clearImage()
  flashingButtons.forEach((flash) => flash?.cancel())
  flashingButtons.clear()
  cancelAnimationFrame(animation)
  controllers.forEach((controller) => controller.abort())
})
</script>

<template>
  <ReplicaExperimentLayout
    :experiment="experiment"
    :bordered="false"
    :back-path="islandModules.LABORATORY.path"
  >
    <section
      ref="shareRoot"
      class="monkey-lab no-rem"
      :class="{
        'is-typing': typing,
        'is-intro': view === 'typewriter' && !hasStarted,
      }"
      @click.capture="flashBeforeAction"
    >
      <div
        class="photo-header"
        :class="{ 'photo-header--library': view === 'library' }"
      >
        <div v-if="view === 'typewriter'" class="photo-composition">
          <FuzzyPhoto
            class="typewriter-photo"
            :src="typewriterImage"
            alt="猴子在打字机前打字"
            :width="360"
            :height="270"
          />
          <div class="paper-projection">
            <Transition appear name="monkey-action">
              <button
                v-show="!saving"
                class="start-button"
                type="button"
                :disabled="saving"
                @click="handleTypewriterAction"
              >
                <span>{{
                  busy || typing ? 'SKIP' : article ? 'RESTART' : 'START'
                }}</span>
              </button>
            </Transition>
          </div>
          <Transition appear name="monkey-action">
            <button
              type="button"
              class="babel-entrance"
              aria-label="巴别图书馆"
              :disabled="busy || saving"
              data-image-entry
              @click="openLibrary"
            >
              <FuzzyPhoto
                class="babel-photo"
                :src="libraryImage"
                alt="木质书架"
                :width="240"
                :height="298"
              >
                <span
                  class="babel-title"
                  :class="{ 'is-ready': libraryTitleReady }"
                  aria-hidden="true"
                >
                  <span class="babel-title-fallback">巴别图书馆</span>
                  <FuzzyImage
                    class="babel-title-canvas"
                    text="巴别图书馆"
                    :width="185"
                    :height="40"
                    color="#e23456"
                    @ready="libraryTitleReady = true"
                  />
                </span>
              </FuzzyPhoto>
            </button>
          </Transition>
        </div>
        <Transition appear name="monkey-action">
          <button
            v-if="view === 'library'"
            v-show="!(busy || saving)"
            type="button"
            class="library-button"
            :disabled="busy || saving"
            @click=";(view = 'typewriter'), (error = '')"
          >
            <Back class="action-icon" aria-hidden="true" /><span
              class="button-label"
              >返回打字机</span
            >
          </button>
        </Transition>
      </div>
      <Transition v-if="view === 'typewriter'" name="crt-effect">
        <div v-show="hasStarted" class="lab-workspace">
          <div class="paper-tray">
            <div class="manuscript-panels">
              <div class="manuscript-frame">
                <article
                  ref="manuscript"
                  @scroll.passive="scheduleReadingProgress"
                  class="manuscript"
                  aria-label="随机英文文章"
                  :aria-busy="typing || busy"
                  data-lenis-prevent
                  tabindex="0"
                >
                  <template v-if="article">
                    <input
                      v-model="article.title"
                      class="manuscript-title"
                      aria-label="文章标题"
                      maxlength="120"
                      :disabled="typing || saving"
                    />
                    <p v-if="typing" class="manuscript-text" lang="en">
                      {{ text
                      }}<span v-if="typing" class="typing-cursor">▌</span>
                    </p>
                    <div v-else class="manuscript-body">
                      <pre
                        ref="manuscriptHighlights"
                        class="manuscript-highlights"
                        aria-hidden="true"
                      ><template v-for="(segment, index) in highlightSegments" :key="index"><mark v-if="segment.highlighted">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template>{{ '\n' }}</pre>
                      <textarea
                        ref="manuscriptEditor"
                        @scroll.passive="scheduleReadingProgress"
                        v-model="article.content"
                        class="manuscript-editor"
                        aria-label="文章正文"
                        maxlength="12000"
                        :disabled="saving"
                        placeholder="在这里输入或修改文章…"
                        spellcheck="false"
                      />
                    </div>
                  </template>
                  <div v-else class="empty-manuscript">
                    <p>
                      {{
                        busy
                          ? '正在生成随机文章…'
                          : '点击“START”，生成一篇随机文章'
                      }}
                    </p>
                  </div>
                </article>
                <PageScrollProgress ref="readingProgress" embedded />
              </div>
              <Transition appear name="monkey-analysis">
                <div
                  v-show="article && !typing && !busy"
                  class="analysis-reveal"
                >
                  <ArticleAnalysis
                    :content="article?.content || ''"
                    :active="!!article && !typing && !busy"
                    @analyzed="highlightedWords = $event.words"
                  >
                    <template #retry="{ retry }">
                      <button
                        type="button"
                        class="text-button analysis-retry"
                        @click="retry"
                      >
                        <Refresh class="action-icon" aria-hidden="true" />
                        <span class="button-label">重新加载词表</span>
                      </button>
                    </template>
                  </ArticleAnalysis>
                </div>
              </Transition>
            </div>
            <div class="draft-actions" :class="{ 'is-empty': !article }">
              <div class="draft-actions-left">
                <Transition appear name="monkey-action">
                  <button
                    v-show="!(!article || typing)"
                    type="button"
                    :disabled="!article || typing"
                    @click="copyArticle"
                  >
                    <CopyDocument class="action-icon" aria-hidden="true" /><span
                      class="button-label"
                      >复制全文</span
                    >
                  </button>
                </Transition>
                <Transition appear name="monkey-action">
                  <button
                    v-show="!(!article || typing)"
                    type="button"
                    :disabled="!article || typing"
                    @click="download"
                  >
                    <Download class="action-icon" aria-hidden="true" /><span
                      class="button-label"
                      >下载 .txt</span
                    >
                  </button>
                </Transition>
                <Transition appear name="monkey-action">
                  <button
                    v-show="article && !typing && !saving && !busy"
                    type="button"
                    class="share-button"
                    :aria-busy="sharing || imageBusy"
                    :disabled="!article || typing || saving || busy"
                    @click="shareImage"
                  >
                    <ShareIcon class="action-icon" aria-hidden="true" /><span
                      class="button-label"
                      >分享</span
                    >
                  </button>
                </Transition>
              </div>
              <Transition appear name="monkey-action">
                <button
                  v-show="!(!canSave || busy)"
                  type="button"
                  class="save-button"
                  :disabled="!canSave || busy"
                  @click="saveArticle"
                >
                  <Upload class="action-icon" aria-hidden="true" /><span
                    class="button-label"
                    >保存至巴别图书馆</span
                  >
                </button>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>
      <section v-else class="babel-library" aria-label="巴别图书馆">
        <header class="library-heading">
          <div>
            <p class="eyebrow">A CATALOGUE OF ACCIDENTS</p>
            <h2>巴别图书馆<span> / The Library of Babel</span></h2>
            <p>所有人留下的偶然，都在这里。按生成时间由新到旧排列。</p>
          </div>
          <Transition appear name="monkey-action">
            <button
              v-show="!loading"
              class="text-button"
              type="button"
              :disabled="loading"
              @click="loadLibrary(true)"
            >
              <Refresh class="action-icon" aria-hidden="true" /><span
                class="button-label"
                >刷新书架</span
              >
            </button>
          </Transition>
        </header>
        <div
          class="library-scroll"
          data-lenis-prevent
          tabindex="0"
          :aria-busy="loading"
        >
          <div v-if="!articles.length" class="library-empty">
            {{
              loading
                ? '正在寻找书架…'
                : hasLoaded
                ? '书架还是空的。回到打字机，留下第一份偶然。'
                : '书架尚未载入，请刷新重试。'
            }}
          </div>
          <Transition
            name="monkey-action"
            v-for="(item, index) in articles"
            :key="item.id"
          >
            <button
              v-show="!loading"
              type="button"
              class="archive-row"
              :disabled="loading"
              @click="readArticle(item.id)"
            >
              <Document class="action-icon" aria-hidden="true" /><span
                class="archive-index"
                >{{ String(index + 1).padStart(3, '0') }}</span
              ><span class="archive-copy"
                ><strong lang="en">{{ item.title }}</strong
                ><span lang="en">{{ item.preview }}</span></span
              ><span class="archive-meta"
                >{{ date(item.createdAt) }}<br />{{ item.words }} WORDS</span
              ><span class="archive-arrow">↗</span>
            </button>
          </Transition>
          <Transition appear name="monkey-action">
            <button
              v-if="cursor"
              v-show="!loading"
              class="load-more"
              type="button"
              :disabled="loading"
              @click="loadLibrary()"
            >
              <Collection class="action-icon" aria-hidden="true" /><span
                class="button-label"
                >{{ loading ? '正在读取…' : '继续探索书架' }}</span
              >
            </button>
          </Transition>
        </div>
        <p class="library-footnote">
          这里收藏已经生成的有限文本，不是穷举所有可能文本的图书馆。
        </p>
      </section>

      <div class="lab-feedback" aria-live="polite">
        <span v-if="error" role="alert">{{ error }}</span>
      </div>
    </section>
  </ReplicaExperimentLayout>
</template>

<style scoped lang="less" src="./index.less" />
