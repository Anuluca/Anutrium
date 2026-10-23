import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import {
  templeCategoryById,
  type TempleCategoryId,
  type TempleEntryId,
  type TempleNavigationId,
} from '@/config/templeNavigation'
import { rememberTempleSession } from '@/utils/templeSession'

export const useTempleNavigation = defineStore('temple-navigation', () => {
  const selected = ref<TempleCategoryId | null>(null)
  const companionFocused = ref(false)
  const statueFocused = ref(false)
  const aboutOpen = ref(false)
  const aboutOverlayVisible = ref(false)
  const ready = ref(false)
  const entranceFinished = ref(false)
  const clockAwaitingSettle = ref(false)
  const expanded = ref(false)
  const requested = ref<Exclude<TempleNavigationId, 'about'> | null>(null)
  const revision = ref(0)
  let inlineDetailCloser: (() => boolean) | undefined
  const setInlineDetailCloser = (closer?: () => boolean) => {
    inlineDetailCloser = closer
  }
  const closeInlineDetail = () => inlineDetailCloser?.() ?? false

  const entryModule = ref<TempleEntryId | null>(null)
  const entryExpanded = ref<boolean | null>(null)
  const requestedExpanded = ref(false)
  // 返回时场景尚未就绪，先用路由已解析的模块保持页头和星盘布局。
  const activeModule = computed(() => {
    if (selected.value) return selected.value
    if (ready.value) return null
    const pending = revision.value ? requested.value : entryModule.value
    return pending === 'statue' || pending === 'sprigatito' ? null : pending
  })
  const activeSelection = computed(() =>
    !ready.value &&
    !revision.value &&
    (entryModule.value === 'statue' || entryModule.value === 'sprigatito')
      ? entryModule.value
      : companionFocused.value
      ? 'sprigatito'
      : statueFocused.value
      ? 'statue'
      : activeModule.value
  )
  const isInitialScene = computed(
    () => !activeSelection.value && !aboutOpen.value && !expanded.value
  )
  const homeCornersVisible = computed(
    () =>
      entranceFinished.value &&
      !clockAwaitingSettle.value &&
      !aboutOverlayVisible.value &&
      isInitialScene.value
  )
  const simpleEntrance = ref(false)
  watch([activeSelection, aboutOpen, ready], ([selection, open, isReady]) => {
    // 场景卸载的 reset 不应覆盖当前标签页的记忆。
    if (isReady) rememberTempleSession({ selection, aboutOpen: open })
  })
  const returnModule = ref<TempleCategoryId | null>(null)
  const returnExpanded = ref(false)
  const scrollPositions = reactive<Partial<Record<TempleCategoryId, number>>>(
    {}
  )

  // 导航与三维拾取共享同一可用性配置；加载期间只保留最后一次操作。
  function request(id: TempleNavigationId | null, expand = false) {
    if (id === 'about') {
      aboutOpen.value = !aboutOpen.value
      rememberTempleSession({
        selection: activeSelection.value,
        aboutOpen: aboutOpen.value,
      })
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
    requestedExpanded.value = expand
    revision.value++
    rememberTempleSession({ selection: id, aboutOpen: false })
  }
  function reset() {
    inlineDetailCloser = undefined
    selected.value = null
    companionFocused.value = false
    statueFocused.value = false
    aboutOpen.value = false
    aboutOverlayVisible.value = false
    expanded.value = false
    ready.value = false
    entranceFinished.value = false
    clockAwaitingSettle.value = false
    requested.value = null
    requestedExpanded.value = false
    entryExpanded.value = null
    revision.value = 0
  }
  return {
    setInlineDetailCloser,
    closeInlineDetail,
    entryModule,
    entryExpanded,
    requestedExpanded,
    activeModule,
    activeSelection,
    isInitialScene,
    homeCornersVisible,
    entranceFinished,
    clockAwaitingSettle,
    simpleEntrance,
    returnModule,
    returnExpanded,
    scrollPositions,
    selected,
    companionFocused,
    statueFocused,
    aboutOpen,
    aboutOverlayVisible,
    ready,
    expanded,
    requested,
    revision,
    request,
    reset,
  }
})
