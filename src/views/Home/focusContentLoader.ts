import type { Component } from 'vue'

import type { TempleCategoryId } from '@/config/templeNavigation'
import { ensureRouteMessages } from '@/locales/routeMessages'

const loads = new Map<TempleCategoryId, Promise<Component>>()

// 选择模块时只预取代码与文案；列表和地图仍在运镜完成后挂载。
export function loadTempleFocusContent(category: TempleCategoryId) {
  const cached = loads.get(category)
  if (cached) return cached
  const load = (async () => {
    if (category === 'archive') {
      const [component] = await Promise.all([
        import('@/views/Archive/ArchiveContent.vue'),
        ensureRouteMessages('ARCHIVE'),
      ])
      return component.default
    }
    if (category === 'flanerie') {
      const [component] = await Promise.all([
        import('@/views/Flânerie/JourneyContent.vue'),
        ensureRouteMessages('FLANERIE'),
      ])
      return component.default
    }
    return (await import('@/components/NotFoundContent/index.vue')).default
  })().catch((error) => {
    loads.delete(category)
    throw error
  })
  loads.set(category, load)
  return load
}
