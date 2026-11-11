<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { loadEnglishDictionary } from '@/utils/englishDictionary'
import {
  analyzeEnglishWords,
  type EnglishWordAnalysis,
} from '@/utils/englishWordAnalysis'

const { t } = useI18n()

const props = defineProps<{ content: string; active: boolean }>()
const emit = defineEmits<{
  (event: 'analyzed', result: EnglishWordAnalysis): void
}>()
const dictionary = shallowRef<ReadonlySet<string> | null>(null)
const result = shallowRef<EnglishWordAnalysis>({ words: [], occurrences: 0 })
const loading = ref(false)
const failed = ref(false)
const pending = ref(false)
watch(result, (value) => emit('analyzed', value), {
  flush: 'sync',
  immediate: true,
})
let debounce: ReturnType<typeof setTimeout> | undefined
let disposed = false
function analyze() {
  pending.value = false
  if (props.active && dictionary.value)
    result.value = analyzeEnglishWords(props.content, dictionary.value)
}
async function load() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    const words = await loadEnglishDictionary()
    if (disposed) return
    dictionary.value = words
    analyze()
  } catch {
    if (!disposed) failed.value = true
  } finally {
    if (!disposed) loading.value = false
  }
}
watch(
  [() => props.content, () => props.active],
  ([content, active], [oldContent, oldActive]) => {
    clearTimeout(debounce)
    pending.value = false
    result.value = { words: [], occurrences: 0 }
    if (!active || !dictionary.value) return
    // 生成结束和读取存档立即分析，连续编辑正文时延迟 300ms 合并更新。
    if (oldActive && content !== oldContent) {
      pending.value = true
      debounce = setTimeout(analyze, 300)
    } else analyze()
  }
)
watch(
  () => props.active,
  (active) => {
    if (active && !dictionary.value) void load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(debounce)
})
</script>

<template>
  <section
    class="analysis-frame"
    :aria-label="t('monkeyTypewriter.analysis')"
    :aria-busy="loading || pending"
    tabindex="0"
    data-lenis-prevent
  >
    <p v-if="loading || pending" class="analysis-summary" role="status">
      {{
        loading
          ? t('monkeyTypewriter.loadingDictionary')
          : t('monkeyTypewriter.analyzing')
      }}
    </p>
    <template v-else-if="failed">
      <p class="analysis-summary" role="status">
        {{ t('monkeyTypewriter.dictionaryFailed') }}
      </p>
      <slot name="retry" :retry="load" />
    </template>
    <template v-else>
      <p class="analysis-summary" role="status">
        <i18n-t
          :keypath="
            result.words.length
              ? 'monkeyTypewriter.wordCount'
              : 'monkeyTypewriter.zeroWords'
          "
          tag="span"
        >
          <template #count
            ><strong>{{ result.words.length }}</strong></template
          >
        </i18n-t>
      </p>
      <div
        v-if="result.words.length"
        class="analysis-words"
        role="list"
        :aria-label="t('monkeyTypewriter.recognizedWords')"
      >
        <span
          v-for="item in result.words"
          :key="item.word"
          class="analysis-word"
          role="listitem"
          lang="en"
        >
          {{ item.word
          }}<span v-if="item.count > 1" class="analysis-count">
            ×{{ item.count }}</span
          >
        </span>
      </div>
    </template>
  </section>
</template>
