import { onScopeDispose } from 'vue'

import { notesEndpoint } from '@/composables/useNotes'
import { parseNoteDocument } from '@/utils/noteDocument'

export type NoteDocument = ReturnType<typeof parseNoteDocument>

/** 仅保留当前阅读窗口及相邻两篇；预取和阅读共享请求，不提前挂载正文。 */
export function useNoteDocuments() {
  const entries = new Map<
    string,
    { controller: AbortController; promise: Promise<NoteDocument> }
  >()
  const remove = (id: string) => {
    entries.get(id)?.controller.abort()
    entries.delete(id)
  }
  const clear = () => {
    for (const entry of entries.values()) entry.controller.abort()
    entries.clear()
  }
  const retain = (ids: string[]) => {
    const retained = new Set(ids)
    for (const id of entries.keys()) if (!retained.has(id)) remove(id)
  }
  const load = (id: string, refresh = false): Promise<NoteDocument> => {
    if (!/^[0-9a-f-]{36}$/.test(id))
      return Promise.reject(new Error('not_found'))
    if (refresh) remove(id)
    const cached = entries.get(id)
    if (cached) return cached.promise
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const promise = (async () => {
      try {
        const response = await fetch(`${notesEndpoint}/${id}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok)
          throw new Error(response.status === 404 ? 'not_found' : 'unavailable')
        return parseNoteDocument(await response.text())
      } catch (reason) {
        if (entries.get(id)?.controller === controller) entries.delete(id)
        throw reason
      } finally {
        clearTimeout(timeout)
      }
    })()
    entries.set(id, { controller, promise })
    return promise
  }
  onScopeDispose(clear)
  return { load, retain, clear }
}
