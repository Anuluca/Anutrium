<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import { loadEnglishDictionary } from '@/utils/englishDictionary'
import {
  analyzeEnglishWords,
  type EnglishWordAnalysis,
} from '@/utils/englishWordAnalysis'

const props = defineProps<{ content: string; active: boolean }>()
const emit = defineEmits<{
  (event: 'analyzed', result: EnglishWordAnalysis): void
}>()
const dictionary = shallowRef<ReadonlySet<string> | null>(null)
const result = ref<EnglishWordAnalysis>({ words: [], occurrences: 0 })
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
onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(debounce)
})
</script>

<template>
  <section
    class="analysis-frame"
    aria-label="文章分析"
    :aria-busy="loading || pending"
    tabindex="0"
    data-lenis-prevent
  >
    <p v-if="loading || pending" class="analysis-summary" role="status">
      {{ loading ? '正在加载英文词表…' : '正在分析…' }}
    </p>
    <template v-else-if="failed">
      <p class="analysis-summary" role="status">
        词表加载失败，文章功能仍可正常使用。
      </p>
      <slot name="retry" :retry="load" />
    </template>
    <template v-else>
      <p class="analysis-summary" role="status">
        <template v-if="result.words.length">
          本次生成了 <strong>{{ result.words.length }}</strong> 个正常单词：
        </template>
        <template v-else>很遗憾，本次生成了<strong>0</strong>个正常单词。</template>
      </p>
      <div
        v-if="result.words.length"
        class="analysis-words"
        role="list"
        aria-label="识别到的英文单词"
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
