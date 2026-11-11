import {
  onScopeDispose,
  type Ref,
  ref,
  shallowRef,
  watch,
  type WatchSource,
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { MonkeyArticle } from '@/types/monkeyArticle'

export function useMonkeyShareImage(options: {
  root: Ref<HTMLElement | null>
  article: () => MonkeyArticle | null
  enabled?: () => boolean
  dependencies?: WatchSource[]
  delay?: number
}) {
  const { locale } = useI18n()
  const file = shallowRef<File | null>(null)
  const preparing = ref(false)
  let revision = 0
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null
  let running: Promise<File | null> | null = null
  const enabled = () =>
    !disposed &&
    !!options.root.value &&
    !!options.article() &&
    (options.enabled?.() ?? true)

  async function prepare(): Promise<File | null> {
    if (!enabled()) return null
    if (file.value) return file.value
    // 已开始的光栅化无法中止；等待它结束，避免编辑期间并行生成多张大图。
    if (running) {
      await running.catch(() => null)
      return prepare()
    }
    clearTimeout(timer)
    const current = revision
    const snapshot = options.article()!
    const root = options.root.value!
    const abort = new AbortController()
    controller = abort
    preparing.value = true
    const job = (async () => {
      const { createMonkeyShareImage } = await import(
        '@/utils/monkeyShareImage'
      )
      abort.signal.throwIfAborted()
      const image = await createMonkeyShareImage(
        root,
        snapshot.title,
        snapshot.content,
        abort.signal
      )
      if (current !== revision || !enabled()) return null
      file.value = image
      return image
    })()
      .catch((cause) => {
        if (abort.signal.aborted) return null
        throw cause
      })
      .finally(() => {
        if (running === job) {
          running = null
          controller = null
          preparing.value = false
        }
      })
    running = job
    return job
  }

  watch(
    [
      options.root,
      () => options.article()?.title,
      () => options.article()?.content,
      () => options.enabled?.() ?? true,
      locale,
      ...(options.dependencies ?? []),
    ],
    () => {
      revision++
      controller?.abort()
      clearTimeout(timer)
      file.value = null
      if (enabled())
        timer = setTimeout(() => {
          void prepare().catch(() => {})
        }, options.delay ?? 500)
    },
    { flush: 'post', immediate: true }
  )

  onScopeDispose(() => {
    disposed = true
    revision++
    controller?.abort()
    clearTimeout(timer)
    file.value = null
  })
  return { file, preparing, prepare }
}
