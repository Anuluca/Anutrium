import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  templeCategoryById,
  type TempleCategoryId,
  type TempleNavigationId,
} from '@/config/templeNavigation'

export const useTempleNavigation = defineStore('temple-navigation', () => {
  const selected = ref<TempleCategoryId | null>(null)
  const companionFocused = ref(false)
  const statueFocused = ref(false)
  const aboutOpen = ref(false)
  const ready = ref(false)
  const expanded = ref(false)
  const requested = ref<Exclude<TempleNavigationId, 'about'> | null>(null)
  const revision = ref(0)
  let inlineDetailCloser: (() => boolean) | undefined
  const setInlineDetailCloser = (closer?: () => boolean) => {
    inlineDetailCloser = closer
  }
  const closeInlineDetail = () => inlineDetailCloser?.() ?? false

  const entryModule = ref<TempleCategoryId | null>(null)
  // 返回时场景尚未就绪，先用路由已解析的模块保持页头和星盘布局。
  const activeModule = computed(
    () =>
      selected.value ||
      (!ready.value
        ? revision.value
          ? requested.value === 'statue' || requested.value === 'sprigatito'
            ? null
            : requested.value
          : entryModule.value
        : null)
  )
  const activeSelection = computed(() =>
    companionFocused.value
      ? 'sprigatito'
      : statueFocused.value
      ? 'statue'
      : activeModule.value
  )
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
    if (
      id &&
      id !== 'statue' &&
      id !== 'sprigatito' &&
      !templeCategoryById.get(id)?.enabled
    )
      return
    aboutOpen.value = false
    expanded.value = false
    requested.value = id
    revision.value++
  }
  function reset() {
    inlineDetailCloser = undefined
    selected.value = null
    companionFocused.value = false
    statueFocused.value = false
    aboutOpen.value = false
    expanded.value = false
    ready.value = false
    requested.value = null
    revision.value = 0
  }
  return {
    setInlineDetailCloser,
    closeInlineDetail,
    entryModule,
    activeModule,
    activeSelection,
    simpleEntrance,
    returnModule,
    returnExpanded,
    scrollPositions,
    selected,
    companionFocused,
    statueFocused,
    aboutOpen,
    ready,
    expanded,
    requested,
    revision,
    request,
    reset,
  }
})
