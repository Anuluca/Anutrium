import { onScopeDispose, ref, shallowRef, watch } from 'vue'

import type { FloraMedia } from '@/utils/floratriumMedia'
import { fetchFloraMediaPage } from '@/views/Home/composables/useFloraAlbum'

export const useCreativeDesignAlbum = (album: () => string) => {
  const items = shallowRef<FloraMedia[]>([])
  const loading = ref(false)
  const error = ref(false)
  let controller: AbortController | undefined

  const refresh = async () => {
    controller?.abort()
    const request = new AbortController()
    controller = request
    items.value = []
    loading.value = true
    error.value = false
    const timeout = setTimeout(() => request.abort(), 15000)
    try {
      const result: FloraMedia[] = []
      const cursors = new Set<string>()
      let cursor: string | null = ''
      const id = album()
      // 拉取所有分页后一起展示，底部缩略图覆盖整个目录；切换作品时取消旧请求。
      while (cursor !== null) {
        if (cursors.has(cursor)) throw new Error('Repeated album cursor')
        cursors.add(cursor)
        const page = await fetchFloraMediaPage(id, cursor, request.signal)
        result.push(...page.items.filter((item) => item.type === 'image'))
        cursor = page.nextCursor
      }
      if (controller === request) items.value = result
    } catch {
      if (controller === request) error.value = true
    } finally {
      clearTimeout(timeout)
      if (controller === request) loading.value = false
    }
  }
  watch(album, refresh, { immediate: true })
  onScopeDispose(() => {
    controller?.abort()
    controller = undefined
  })
  return { items, loading, error, refresh }
}
