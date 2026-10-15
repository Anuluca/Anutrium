import { onScopeDispose, ref, type Ref, shallowRef, watch } from 'vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

import { petAlbums } from '@/locales/dynamic/petAlbums'
import {
  FLORA_MEDIA_PAGE_SIZE,
  type FloraMedia,
  type FloraMediaPage,
} from '@/utils/floratriumMedia'

const origin = import.meta.env.DEV
  ? ''
  : (
      import.meta.env.VITE_PROFILE_WORKER_URL ||
      import.meta.env.VITE_STEAM_WORKER_URL ||
      'https://anutrium-steam-api.tilucario.workers.dev'
    ).replace(/\/$/, '')
const pathname = import.meta.env.DEV
  ? '/__floratrium/media'
  : '/floratrium/media'

const fetchPage = async (
  petId: string,
  cursor: string,
  signal: AbortSignal
): Promise<FloraMediaPage> => {
  const query = new URLSearchParams({ pet: petAlbums[petId].folder })
  if (cursor) query.set('cursor', cursor)
  const response = await fetch(`${origin}${pathname}?${query}`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Album unavailable')
  const page: FloraMediaPage = await response.json()
  if (
    !Array.isArray(page?.items) ||
    page.items.length > FLORA_MEDIA_PAGE_SIZE ||
    page.items.some(
      (item) =>
        !item ||
        typeof item.key !== 'string' ||
        typeof item.url !== 'string' ||
        (item.type !== 'image' && item.type !== 'video')
    ) ||
    !(page.nextCursor === null || typeof page.nextCursor === 'string')
  )
    throw new Error('Invalid album response')
  return page
}

const sameItems = (previous: FloraMedia[], next: FloraMedia[]) =>
  previous.length === next.length &&
  previous.every((item, index) => {
    const other = next[index]
    return (
      item.key === other.key && item.url === other.url && item.type === other.type
    )
  })

export const useFloraAlbum = (
  petId: () => string,
  expanded: Ref<boolean>,
  beforePageChange: () => void
) => {
  const loading = ref(false)
  const error = ref(false)
  const allItems = shallowRef<FloraMedia[]>([])
  const nextCursor = ref<string | null>(null)
  const pageCursors = ref([''])
  const pageIndex = ref(0)
  const totalPages = ref<number | null>(null)
  const visibility = useDocumentVisibility()
  let controller: AbortController | undefined
  let revision = 0

  const stopRequest = () => {
    ++revision
    controller?.abort()
    controller = undefined
    loading.value = false
  }
  const reset = () => {
    allItems.value = []
    pageCursors.value = ['']
    pageIndex.value = 0
    totalPages.value = null
    nextCursor.value = null
    error.value = false
  }
  const refresh = async (quiet = false) => {
    if (!expanded.value || visibility.value !== 'visible') return
    // 慢请求仍在进行时跳过轮询，避免每 15 秒中断并重新下载同一页。
    if (quiet && controller) return
    stopRequest()
    const requestController = new AbortController()
    controller = requestController
    const requestRevision = revision
    if (!quiet) loading.value = true
    try {
      const page = await fetchPage(
        petId(),
        pageCursors.value[pageIndex.value],
        requestController.signal
      )
      if (requestRevision !== revision) return
      // 保留未变化的数组引用，避免重建预览、重启视频及重新绑定观察器。
      if (!sameItems(allItems.value, page.items)) allItems.value = page.items
      nextCursor.value = page.nextCursor
      if (
        Number.isSafeInteger(page.totalPages) &&
        page.totalPages! > 0 &&
        page.totalPages !== totalPages.value
      ) {
        totalPages.value = page.totalPages!
        pageCursors.value = Array.from({ length: page.totalPages! }, (_, index) =>
          index === 0 ? '' : String(index * FLORA_MEDIA_PAGE_SIZE)
        )
      }
      // 旧接口未提供总页数时只发现下一页，不再为页码预扫描全部相册。
      if (page.totalPages === undefined) {
        totalPages.value = null
        pageCursors.value = pageCursors.value.slice(0, pageIndex.value + 1)
        if (page.nextCursor && !pageCursors.value.includes(page.nextCursor))
          pageCursors.value.push(page.nextCursor)
      }
      error.value = false
    } catch (cause) {
      if (requestRevision === revision && !requestController.signal.aborted)
        error.value = true
    } finally {
      if (requestRevision === revision) {
        loading.value = false
        controller = undefined
      }
    }
  }
  const goToPage = async (target: number) => {
    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > pageCursors.value.length ||
      target === pageIndex.value + 1
    )
      return
    stopRequest()
    beforePageChange()
    pageIndex.value = target - 1
    allItems.value = []
    error.value = false
    await refresh()
  }
  const changePage = (direction: -1 | 1) =>
    goToPage(pageIndex.value + direction + 1)

  const { pause, resume } = useIntervalFn(() => void refresh(true), 15000, {
    immediate: false,
  })
  watch([expanded, visibility], ([open, visible], [wasOpen]) => {
    if (open && !wasOpen) reset()
    if (open && visible === 'visible') {
      void refresh()
      resume()
    } else {
      pause()
      stopRequest()
    }
  })
  watch(petId, () => {
    stopRequest()
    expanded.value = false
    reset()
  })
  onScopeDispose(() => {
    pause()
    stopRequest()
  })
  return {
    allItems,
    loading,
    error,
    pageCursors,
    pageIndex,
    totalPages,
    nextCursor,
    refresh,
    goToPage,
    changePage,
  }
}
