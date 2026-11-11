<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CopyDocument,
  Download,
  Refresh,
  Share as ShareIcon,
  Upload,
} from '@element-plus/icons-vue'
import { useResizeObserver } from '@vueuse/core'

import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import { useMonkeyActionFlash } from '@/composables/useMonkeyActionFlash'
import { useMonkeyShareImage } from '@/composables/useMonkeyShareImage'
import { islandModules } from '@/config/islandModules'
import {
  showErrorMessage,
  showSuccessMessage,
  showWarningMessage,
} from '@/utils/elementMessage'
import {
  type EnglishWordMatch,
  highlightEnglishWords,
} from '@/utils/englishWordAnalysis'
import {
  copyMonkeyArticle,
  downloadMonkeyArticle,
  shareMonkeyArticleImage,
} from '@/utils/monkeyArticleActions'
import { monkeyTypewriterImages } from '@/utils/preloadMonkeyTypewriterAssets'
import ReplicaExperimentLayout from '@/views/AiPlayground/components/ReplicaExperimentLayout.vue'

import ArticleAnalysis from './components/ArticleAnalysis.vue'
import BabelLibraryModal from './components/BabelLibraryModal.vue'
import BabelPhoto from './components/BabelPhoto.vue'
import FuzzyPhoto from './components/FuzzyPhoto.vue'

import type {
  MonkeyArticle,
  MonkeyArticlePage,
  MonkeyArticleSummary,
} from '@/types/monkeyArticle'

const { t } = useI18n()

const typewriterImage = monkeyTypewriterImages.typewriter

const experiment = computed(() => ({
  pageTitle: t('monkeyTypewriter.pageTitle'),
  sceneLabel: t('monkeyTypewriter.sceneLabel'),
  canvas: { width: 1600, height: 912 },
  description: t('monkeyTypewriter.description'),
}))
// 直接访问 Worker，保留真实边缘 IP，避免代理把所有访客归入同一限流桶。
const endpoint = 'https://steam-api.anuluca.com/monkey-articles'
const libraryOpen = ref(false)
const libraryMounted = ref(false)
const libraryBatch = ref(0)
const article = ref<MonkeyArticle | null>(null)
const hasStarted = ref(false)
const visibleCharacters = ref(0)
const busy = ref(false)
const typing = ref(false)
const loading = ref(false)
const error = ref('')
const articles = shallowRef<MonkeyArticleSummary[]>([])
const cursor = ref<string | null>(null)
const hasLoaded = ref(false)
const requestId = ref('')
const saving = ref(false)
const savedSource = ref('')
const shareRoot = ref<HTMLElement | null>(null)
const sharing = ref(false)
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
watch(
  source,
  () => {
    requestId.value = ''
    error.value = ''
  },
  { flush: 'sync' }
)
const text = computed(
  () => article.value?.content.slice(0, visibleCharacters.value) || ''
)
const highlightedWords = shallowRef<EnglishWordMatch[]>([])
const highlightSegments = computed(() =>
  typing.value
    ? []
    : highlightEnglishWords(
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
const { flashBeforeAction } = useMonkeyActionFlash({
  immediate: (button) =>
    button.classList.contains('start-button') && (busy.value || typing.value),
})
const requestErrorCodes = new Set([
  'rate_limited',
  'invalid_body',
  'request_conflict',
  'large_body',
  'not_found',
  'expired_request',
])
function errorMessage(cause: unknown) {
  const message = (cause as Error).message
  return message.startsWith('monkeyTypewriter.') ? t(message) : message
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
        `monkeyTypewriter.${
          requestErrorCodes.has(data.error) ? data.error : 'serviceError'
        }`
      )
    }
    return data
  } catch (cause) {
    throw new Error(
      cause instanceof Error &&
      !['TypeError', 'AbortError', 'SyntaxError'].includes(cause.name)
        ? cause.message
        : 'monkeyTypewriter.connectionError'
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
    showSuccessMessage(t('monkeyTypewriter.saved'))
  } catch (cause) {
    if (!disposed) showErrorMessage(errorMessage(cause))
  } finally {
    if (!disposed) saving.value = false
  }
}
const {
  file: imageFile,
  preparing: imageBusy,
  prepare: prepareShareImage,
} = useMonkeyShareImage({
  root: shareRoot,
  article: () => article.value,
  enabled: () => !typing.value && !busy.value && !libraryOpen.value,
  dependencies: [highlightedWords],
})
async function shareImage() {
  if (!article.value || typing.value || busy.value || sharing.value) return
  sharing.value = true
  try {
    const snapshot = source.value
    let file = imageFile.value
    // 分析异步完成时会使预生成副本失效；同一次点击自动等待最新副本，不能静默丢失分享。
    for (let attempt = 0; !file && attempt < 3; attempt++) {
      file = await prepareShareImage()
      if (disposed || libraryOpen.value) return
      if (snapshot !== source.value) {
        showWarningMessage(t('monkeyTypewriter.contentChanged'))
        return
      }
    }
    if (!file || disposed) {
      if (!disposed) showWarningMessage(t('monkeyTypewriter.imageUpdating'))
      return
    }
    await shareMonkeyArticleImage(file, article.value.title)
  } catch (cause) {
    if (!disposed) showErrorMessage(errorMessage(cause))
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
    const seen = new Set(reset ? [] : articles.value.map((item) => item.id))
    const incoming = data.articles.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    articles.value = reset ? incoming : [...articles.value, ...incoming]
    if (reset) libraryBatch.value++
    cursor.value = data.nextCursor
    hasLoaded.value = true
  } catch (cause) {
    if (!disposed) showErrorMessage(errorMessage(cause))
  } finally {
    if (!disposed) loading.value = false
  }
}
function openLibrary() {
  finishTyping()
  error.value = ''

  libraryMounted.value = true
  libraryOpen.value = true
  if (!hasLoaded.value) void loadLibrary(true)
}
async function readArticle(id: string): Promise<MonkeyArticle | null> {
  if (loading.value) return null
  loading.value = true
  try {
    const result = await request<MonkeyArticle>(`/${id}`)
    return disposed ? null : result
  } catch (cause) {
    if (!disposed) showErrorMessage(errorMessage(cause))
    return null
  } finally {
    if (!disposed) loading.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(animation)
  controllers.forEach((controller) => controller.abort())
})
</script>

<template>
  <ReplicaExperimentLayout
    :experiment="experiment"
    mobile-layout="flow"
    :back-label="t('monkeyTypewriter.laboratory')"
    :bordered="false"
    :back-path="islandModules.LABORATORY.path"
  >
    <section
      ref="shareRoot"
      class="monkey-lab no-rem"
      :class="{
        'is-intro': !hasStarted,
      }"
      @click.capture="flashBeforeAction"
    >
      <div class="photo-header">
        <div class="photo-composition">
          <FuzzyPhoto
            class="typewriter-photo"
            :active="!libraryOpen"
            :src="typewriterImage"
            :alt="t('monkeyTypewriter.monkeyAlt')"
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
              :aria-label="t('monkeyTypewriter.library')"
              :disabled="busy || saving"
              data-image-entry
              @click="openLibrary"
            >
              <BabelPhoto :active="!libraryOpen" />
            </button>
          </Transition>
        </div>
      </div>
      <Transition name="crt-effect">
        <div v-show="hasStarted" class="lab-workspace">
          <div class="paper-tray">
            <div class="manuscript-panels">
              <div class="manuscript-frame">
                <article
                  ref="manuscript"
                  class="manuscript"
                  :aria-label="t('monkeyTypewriter.randomArticle')"
                  :aria-busy="typing || busy"
                  data-lenis-prevent
                  tabindex="0"
                  @scroll.passive="scheduleReadingProgress"
                >
                  <template v-if="article">
                    <input
                      v-model="article.title"
                      class="manuscript-title"
                      :aria-label="t('monkeyTypewriter.title')"
                      maxlength="120"
                      :disabled="typing || saving"
                    />
                    <p v-if="typing" class="manuscript-text" lang="en">
                      {{ text }}<span class="typing-cursor">▌</span>
                    </p>
                    <div v-else class="manuscript-body">
                      <pre
                        ref="manuscriptHighlights"
                        class="manuscript-highlights"
                        aria-hidden="true"
                      ><template v-for="(segment, index) in highlightSegments" :key="index"><mark v-if="segment.highlighted">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template>{{ '\n' }}</pre>
                      <textarea
                        ref="manuscriptEditor"
                        v-model="article.content"
                        class="manuscript-editor"
                        :aria-label="t('monkeyTypewriter.body')"
                        maxlength="12000"
                        :disabled="saving"
                        :placeholder="t('monkeyTypewriter.placeholder')"
                        spellcheck="false"
                        @scroll.passive="scheduleReadingProgress"
                      />
                    </div>
                  </template>
                  <div v-else class="empty-manuscript">
                    <p>
                      {{
                        busy
                          ? t('monkeyTypewriter.generating')
                          : t('monkeyTypewriter.startHint')
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
                        <span class="button-label">{{
                          t('monkeyTypewriter.retryDictionary')
                        }}</span>
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
                    v-show="article && !typing"
                    type="button"
                    :disabled="!article || typing"
                    @click="copyMonkeyArticle(article)"
                  >
                    <CopyDocument class="action-icon" aria-hidden="true" /><span
                      class="button-label"
                      >{{ t('monkeyTypewriter.copy') }}</span
                    >
                  </button>
                </Transition>
                <Transition appear name="monkey-action">
                  <button
                    v-show="article && !typing"
                    type="button"
                    :disabled="!article || typing"
                    @click="downloadMonkeyArticle(article)"
                  >
                    <Download class="action-icon" aria-hidden="true" /><span
                      class="button-label"
                      >{{ t('monkeyTypewriter.download') }}</span
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
                      >{{ t('monkeyTypewriter.share') }}</span
                    >
                  </button>
                </Transition>
              </div>
              <Transition appear name="monkey-action">
                <button
                  v-show="canSave && !busy"
                  type="button"
                  class="save-button"
                  :disabled="!canSave || busy"
                  @click="saveArticle"
                >
                  <Upload class="action-icon" aria-hidden="true" /><span
                    class="button-label"
                    >{{ t('monkeyTypewriter.save') }}</span
                  >
                </button>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>
      <div class="lab-feedback" aria-live="polite">
        <span v-if="error" role="alert">{{ t(error) }}</span>
      </div>
    </section>
    <BabelLibraryModal
      v-if="libraryMounted"
      v-model="libraryOpen"
      :articles="articles"
      :loading="loading"
      :has-more="!!cursor"
      :revision="libraryBatch"
      :read-article="readArticle"
      @refresh="loadLibrary(true)"
      @more="loadLibrary()"
      @closed="libraryMounted = libraryOpen"
    />
  </ReplicaExperimentLayout>
</template>

<style scoped lang="less" src="./index.less" />
