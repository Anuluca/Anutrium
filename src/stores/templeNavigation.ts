import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  templeCategoryById,
  type TempleCategoryId,
  type TempleNavigationId,
} from '@/config/templeNavigation'

export const useTempleNavigation = defineStore('temple-navigation', () => {
  const selected = ref<TempleCategoryId | null>(null)
  const aboutOpen = ref(false)
  const ready = ref(false)
  const expanded = ref(false)
  const requested = ref<TempleCategoryId | null>(null)
  const revision = ref(0)

  const entryModule = ref<TempleCategoryId | null>(null)
  const simpleEntrance = ref(false)
  const returnModule = ref<TempleCategoryId | null>(null)
  const returnExpanded = ref(false)
  const scrollPositions = reactive<Partial<Record<TempleCategoryId, number>>>(
    {}
  )

  // 导航与三维拾取共享同一可用性配置；加载期间只保留最后一次操作。
  function request(id: TempleNavigationId | null) {
    if (id === 'about') {
      aboutOpen.value = !aboutOpen.value
      return
    }
    if (id && !templeCategoryById.get(id)?.enabled) return
    aboutOpen.value = false
    expanded.value = false
    requested.value = id
    revision.value++
  }
  function reset() {
    selected.value = null
    aboutOpen.value = false
    expanded.value = false
    ready.value = false
    requested.value = null
    revision.value = 0
  }
  return {
    entryModule,
    simpleEntrance,
    returnModule,
    returnExpanded,
    scrollPositions,
    selected,
    aboutOpen,
    ready,
    expanded,
    requested,
    revision,
    request,
    reset,
  }
})
