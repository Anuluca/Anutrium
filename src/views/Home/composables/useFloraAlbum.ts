import { onScopeDispose, type Ref, ref, shallowRef, watch } from 'vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

import { petAlbums } from '@/locales/dynamic/petAlbums'
import {
  type FloraMedia,
  type FloraMediaPage,
  isMediaAlbumId,
  mediaAlbums,
} from '@/utils/floratriumMedia'

const origin = import.meta.env.DEV
  ? ''
  : (
      import.meta.env.VITE_PROFILE_WORKER_URL ||
      import.meta.env.VITE_STEAM_WORKER_URL ||
      ''
    ).replace(/\/$/, '')
const pathname = import.meta.env.DEV
  ? '/__floratrium/media'
  : origin
  ? '/floratrium/media'
  : '/api/floratrium/media'

const resolveAlbum = (id: string) => {
  const album = petAlbums[id]?.folder || id
  if (!isMediaAlbumId(album)) throw new Error('Invalid album')
  return album
}
export const fetchFloraMediaPage = async (
  petId: string,
  cursor: string,
  signal: AbortSignal,
  complete = false
): Promise<FloraMediaPage> => {
  const album = resolveAlbum(petId)
  const query = new URLSearchParams({ pet: album })
  if (cursor) query.set('cursor', cursor)
  if (complete && album === 'flora') query.set('collection', '1')
  const response = await fetch(`${origin}${pathname}?${query}`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Album unavailable')
  const page: FloraMediaPage = await response.json()
  if (
    !Array.isArray(page?.items) ||
    (!complete && page.items.length > mediaAlbums[album].pageSize) ||
    page.items.some(
      (item) =>
        !item ||
        typeof item.key !== 'string' ||
        typeof item.url !== 'string' ||
        (item.type !== 'image' && item.type !== 'video')
    ) ||
    !(page.nextCursor === null || typeof page.nextCursor === 'string') ||
    (page.totalPages !== undefined &&
      (!Number.isSafeInteger(page.totalPages) || page.totalPages < 1)) ||
    (page.totalItems !== undefined &&
      (!Number.isSafeInteger(page.totalItems) || page.totalItems < 0))
  )
    throw new Error('Invalid album response')
  return page
}

const sameItems = (previous: FloraMedia[], next: FloraMedia[]) =>
  previous.length === next.length &&
  previous.every((item, index) => {
    const other = next[index]
    return (
      item.key === other.key &&
      item.url === other.url &&
      item.type === other.type
    )
  })

export const useFloraAlbum = (
  petId: () => string,
  expanded: Ref<boolean>,
  beforePageChange?: () => void,
  options: { prefetch?: boolean; complete?: () => boolean } = {}
) => {
  const loading = ref(false)
  const error = ref(false)
  const allItems = shallowRef<FloraMedia[]>([])
  const pageCursors = ref([''])
  const pageIndex = ref(0)
  const totalPages = ref<number | null>(null)
  const totalItems = ref<number | null>(null)
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
    totalItems.value = null
    error.value = false
  }
  const refresh = async (quiet = false) => {
    // Creative 在折叠状态预取一次首页以取得总数，不启动后台轮询。
    if (
      visibility.value !== 'visible' ||
      (!expanded.value && !(options.prefetch && totalItems.value === null))
    )
      return
    // 慢请求仍在进行时跳过轮询，避免每 15 秒中断并重新下载同一页。
    if (quiet && controller) return
    stopRequest()
    const requestController = new AbortController()
    controller = requestController
    const requestRevision = revision
    let timedOut = false
    // 区分网络超时与切页主动取消：超时显示重试，主动取消不污染新页状态。
    const timeout = setTimeout(() => {
      timedOut = true
      requestController.abort()
    }, 15000)
    if (!quiet) loading.value = true
    try {
      const page = await fetchFloraMediaPage(
        petId(),
        pageCursors.value[pageIndex.value],
        requestController.signal,
        options.complete?.()
      )
      if (requestRevision !== revision) return
      // 保留未变化的数组引用，避免重建预览、重启视频及重新绑定观察器。
      if (page.totalItems !== undefined) totalItems.value = page.totalItems
      if (
        Number.isSafeInteger(page.totalPages) &&
        page.totalPages! > 0 &&
        page.totalPages !== totalPages.value
      ) {
        totalPages.value = page.totalPages!
        pageCursors.value = Array.from(
          { length: page.totalPages! },
          (_, index) =>
            index === 0
              ? ''
              : String(index * mediaAlbums[resolveAlbum(petId())].pageSize)
        )
      }
      // 删除图片使当前页失效时，重新请求最后一个有效页。
      if (page.totalPages !== undefined && pageIndex.value >= page.totalPages) {
        pageIndex.value = page.totalPages - 1
        await refresh()
        return
      }
      if (!sameItems(allItems.value, page.items)) allItems.value = page.items
      // 旧接口未提供总页数时只发现下一页，不再为页码预扫描全部相册。
      if (page.totalPages === undefined) {
        totalPages.value = null
        if (pageCursors.value[pageIndex.value + 1] !== page.nextCursor) {
          pageCursors.value = pageCursors.value.slice(0, pageIndex.value + 1)
          if (page.nextCursor && !pageCursors.value.includes(page.nextCursor))
            pageCursors.value.push(page.nextCursor)
        }
      }
      error.value = false
    } catch {
      if (
        requestRevision === revision &&
        (timedOut || !requestController.signal.aborted)
      )
        error.value = true
    } finally {
      clearTimeout(timeout)
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
      return false
    stopRequest()
    beforePageChange?.()
    pageIndex.value = target - 1
    allItems.value = []
    error.value = false
    await refresh()
    return true
  }
  const changePage = (direction: -1 | 1) =>
    goToPage(pageIndex.value + direction + 1)

  const { pause, resume } = useIntervalFn(() => void refresh(true), 15000, {
    immediate: false,
  })
  watch(
    [expanded, visibility],
    ([open, visible], previous) => {
      const wasOpen = previous?.[0]
      if (open && !wasOpen) {
        const count = totalItems.value
        // 预取的首页可立即展示，后台仍刷新；其他页重新打开时回到首页。
        const firstPage =
          options.prefetch && pageIndex.value === 0 ? allItems.value : []
        reset()
        totalItems.value = count
        allItems.value = firstPage
      }
      if (open && visible === 'visible') {
        void refresh()
        resume()
      } else {
        pause()
        stopRequest()
        if (
          options.prefetch &&
          visible === 'visible' &&
          totalItems.value === null
        )
          void refresh()
      }
    },
    { immediate: true }
  )
  watch(petId, () => {
    stopRequest()
    expanded.value = false
    reset()
    if (options.prefetch) void refresh()
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
    totalItems,
    refresh,
    goToPage,
    changePage,
  }
}
