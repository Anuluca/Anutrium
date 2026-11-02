import { computed, nextTick, onScopeDispose, type Ref, ref, watch } from 'vue'
import { type RouteLocationRaw, useRoute, useRouter } from 'vue-router'

import type ModalWrapper from '@/components/ModalWrapper/index.vue'
import { useNoteDocuments } from '@/composables/useNoteDocuments'
import type { NoteSummary } from '@/utils/noteDocument'
import {
  NOTE_CARD_DURATION,
  noteCardFrames,
} from '@/utils/noteNavigationMotion'

/** 统一笔记 URL、相邻预取和可取消动画；列表与阅读器只消费展示状态。 */
export function useNoteNavigation(
  filteredNotes: Readonly<Ref<NoteSummary[]>>,
  noteLocation: (note: NoteSummary) => RouteLocationRaw
) {
  const route = useRoute()
  const router = useRouter()
  const selectedNoteId = computed(() =>
    typeof route.query.note === 'string' ? route.query.note : ''
  )
  const noteVisible = ref(false)
  const openedNoteId = ref('')
  const noteModalRef = ref<InstanceType<typeof ModalWrapper> | null>(null)
  const noteDocuments = useNoteDocuments()
  const switchingNoteId = ref('')
  const switchingFromNoteId = ref('')
  const outgoingNoteShellRef = ref<HTMLElement | null>(null)
  const noteSwitchOrigin = ref<Record<string, string>>({})
  let resolveNoteReady: (() => void) | undefined
  const handleNoteReady = (id: string) => {
    if (id === switchingNoteId.value) resolveNoteReady?.()
  }
  let noteSwitchRevision = 0
  let noteSwitchAnimations: Animation[] = []
  const cancelNoteSwitch = () => {
    noteSwitchRevision++
    noteSwitchAnimations.forEach((animation) => animation.cancel())
    noteSwitchAnimations = []
    switchingNoteId.value = ''
    switchingFromNoteId.value = ''
    resolveNoteReady?.()
    resolveNoteReady = undefined
  }
  watch(
    selectedNoteId,
    (id) => {
      if (switchingNoteId.value && id !== switchingNoteId.value)
        cancelNoteSwitch()
      if (id) openedNoteId.value = id
      noteVisible.value = !!id
    },
    { immediate: true }
  )
  const setNoteVisible = (visible: boolean) => {
    if (!visible) cancelNoteSwitch()
    noteVisible.value = visible
    if (!visible && selectedNoteId.value) {
      const query = { ...route.query }
      delete query.note
      void router.replace({ path: route.path, query, hash: route.hash })
    }
  }
  // 离场动画结束后再卸载正文，避免关闭时内容提前消失。
  const finishNoteClose = () => {
    if (!noteVisible.value) {
      openedNoteId.value = ''
      noteDocuments.clear()
    }
  }
  const noteIndexes = computed(
    () => new Map(filteredNotes.value.map((note, index) => [note.id, index]))
  )
  const currentNoteIndex = computed(
    () =>
      noteIndexes.value.get(
        switchingNoteId.value ? switchingFromNoteId.value : openedNoteId.value
      ) ?? -1
  )
  const previousNote = computed(() =>
    currentNoteIndex.value > 0
      ? filteredNotes.value[currentNoteIndex.value - 1]
      : undefined
  )
  const nextNote = computed(() =>
    currentNoteIndex.value >= 0
      ? filteredNotes.value[currentNoteIndex.value + 1]
      : undefined
  )
  watch(
    [openedNoteId, previousNote, nextNote, noteVisible],
    ([id, previous, next, visible]) => {
      if (!id || !visible) return
      const ids = [
        ...new Set(
          [id, switchingFromNoteId.value, previous?.id, next?.id].filter(
            (id): id is string => !!id
          )
        ),
      ]
      noteDocuments.retain(ids)
      ids.forEach((id) => void noteDocuments.load(id).catch(() => {}))
    },
    { immediate: true }
  )
  const navigateNote = async (event: MouseEvent, note: NoteSummary) => {
    if (switchingNoteId.value || !noteVisible.value) return
    const dialog = noteModalRef.value?.getDialogElement()
    const shell = event.currentTarget as HTMLElement
    const reader = dialog?.querySelector<HTMLElement>('.note-reader')
    if (!dialog || !reader) return
    shell.getAnimations().forEach((animation) => {
      if (
        animation instanceof CSSAnimation &&
        animation.animationName === 'noteNeighborEnter'
      )
        animation.finish()
    })
    const revision = ++noteSwitchRevision
    const source = shell.getBoundingClientRect()
    const target = dialog.getBoundingClientRect()
    const stage = shell.parentElement!.getBoundingClientRect()
    const horizontal = source.left < stage.left || source.right > stage.right
    const outgoingTarget = new DOMRect(
      horizontal ? stage.right - source.right : source.left,
      horizontal ? source.top : stage.bottom - source.bottom,
      source.width,
      source.height
    )
    noteSwitchOrigin.value = {
      left: `${target.left}px`,
      top: `${target.top}px`,
      width: `${target.width}px`,
      height: `${target.height}px`,
    }
    switchingFromNoteId.value = openedNoteId.value
    switchingNoteId.value = note.id
    await nextTick()
    if (revision !== noteSwitchRevision || !outgoingNoteShellRef.value) return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const timing: KeyframeAnimationOptions = {
      duration: reducedMotion ? 0 : NOTE_CARD_DURATION,
      easing: 'linear',
      fill: 'forwards',
    }
    // 只移动空外壳。阅读器保持中央几何不变，以透明度切换已预取的正文。
    noteSwitchAnimations = [
      shell.animate(noteCardFrames(source, target), timing),
      outgoingNoteShellRef.value.animate(
        noteCardFrames(target, outgoingTarget),
        timing
      ),
    ]
    const movement = Promise.all(
      noteSwitchAnimations.map((animation) => animation.finished)
    )
    // 关闭窗口会取消所有动画；立即接管拒绝，避免淡出期间出现未处理的取消异常。
    void movement.catch(() => {})
    const fadeOut = reader.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reducedMotion ? 0 : 150,
      easing: 'ease-out',
      fill: 'forwards',
    })
    noteSwitchAnimations.push(fadeOut)
    try {
      await fadeOut.finished
      if (revision !== noteSwitchRevision || !noteVisible.value) return
      const ready = new Promise<void>((resolve) => {
        resolveNoteReady = resolve
      })
      await router.push(noteLocation(note))
      if (revision !== noteSwitchRevision || selectedNoteId.value !== note.id)
        return
      await ready
      if (revision !== noteSwitchRevision || !noteVisible.value) return
      const fadeIn = reader.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: reducedMotion ? 0 : 250,
        easing: 'ease-out',
        fill: 'both',
      })
      noteSwitchAnimations.push(fadeIn)
      await Promise.all([movement, fadeIn.finished])
    } catch {
      // 关闭弹窗、浏览器返回或组件卸载会取消当前位移动画。
    } finally {
      if (revision === noteSwitchRevision) cancelNoteSwitch()
    }
  }

  onScopeDispose(cancelNoteSwitch)
  return {
    noteVisible,
    openedNoteId,
    noteModalRef,
    switchingNoteId,
    outgoingNoteShellRef,
    noteSwitchOrigin,
    previousNote,
    nextNote,
    setNoteVisible,
    finishNoteClose,
    navigateNote,
    handleNoteReady,
    loadNoteDocument: noteDocuments.load,
  }
}
