import { computed, nextTick, ref, watch } from 'vue'
import { onClickOutside, useResizeObserver } from '@vueuse/core'

type AboutPanel = 'changelog' | 'roadmap' | 'crew'

export function useAboutPanels() {
  const activeAboutPanel = ref<AboutPanel | null>(null)
  const visibleAboutPanel = ref<AboutPanel | null>(null)
  const panelLayout = ref<AboutPanel>('changelog')
  const crewOpen = computed(() => activeAboutPanel.value === 'crew')
  const passionRef = ref<HTMLElement | null>(null)
  const crewTriggerRef = ref<HTMLElement | null>(null)
  const heroShellRef = ref<HTMLElement | null>(null)
  const panelAnchorStyle = ref<Record<string, string>>({})
  const panelLayoutWidth = ref(0)
  const crewBodyHeight = ref(0)
  const panelScrollRef = ref<HTMLElement | null>(null)
  let panelLeaving = false
  const aboutPanelRef = ref<HTMLElement | null>(null)
  const aboutTriggersRef = ref<HTMLElement | null>(null)
  const positionPanelDock = () => {
    const shell = heroShellRef.value?.getBoundingClientRect()
    const trigger =
      panelLayout.value === 'crew'
        ? crewTriggerRef.value
        : aboutTriggersRef.value?.querySelector<HTMLElement>(
            `[aria-controls="about-${panelLayout.value}-panel"]`
          )
    if (!shell || !trigger) return
    const rect = trigger.getBoundingClientRect()
    const width =
      panelLayout.value === 'crew'
        ? shell.width / 3
        : Math.min(700, shell.right - rect.left - 8)
    panelLayoutWidth.value = width
    if (panelLayout.value === 'crew' && passionRef.value) {
      const availablePanelHeight =
        rect.top - passionRef.value.getBoundingClientRect().top + 56
      crewBodyHeight.value = Math.max(0, availablePanelHeight * 0.9 - 28)
    }
    panelAnchorStyle.value = {
      left:
        panelLayout.value === 'crew' ? 'auto' : `${rect.left - shell.left}px`,
      right:
        panelLayout.value === 'crew' ? `${shell.right - rect.right}px` : 'auto',
      bottom: `${shell.bottom - rect.bottom}px`,
      height: `${rect.height}px`,
      width: `${width}px`,
    }
  }

  useResizeObserver([heroShellRef, aboutTriggersRef, crewTriggerRef], () => {
    if (activeAboutPanel.value || visibleAboutPanel.value) positionPanelDock()
  })

  const showRequestedPanel = async () => {
    const panel = activeAboutPanel.value
    if (!panel) return
    panelLayout.value = panel
    await nextTick()
    if (activeAboutPanel.value !== panel) return
    positionPanelDock()
    await nextTick()
    if (activeAboutPanel.value !== panel) return
    visibleAboutPanel.value = panel
  }

  // 离场结束前保留旧窗口的定位和尺寸，再布置新窗口并触发入场。
  watch(activeAboutPanel, () => {
    if (panelLeaving) return
    if (visibleAboutPanel.value) {
      panelLeaving = true
      visibleAboutPanel.value = null
    } else {
      void showRequestedPanel()
    }
  })

  const finishPanelLeave = () => {
    panelLeaving = false
    void showRequestedPanel()
  }

  const preparePanelLeave = (element: Element) => {
    if (activeAboutPanel.value)
      element.classList.add('about-program-instant-leave')
  }

  onClickOutside(
    aboutPanelRef,
    () => {
      activeAboutPanel.value = null
    },
    { ignore: [aboutTriggersRef, crewTriggerRef] }
  )

  const toggleAboutPanel = (panel: AboutPanel) => {
    activeAboutPanel.value = activeAboutPanel.value === panel ? null : panel
  }

  return {
    activeAboutPanel,
    visibleAboutPanel,
    panelLayout,
    crewOpen,
    passionRef,
    crewTriggerRef,
    heroShellRef,
    panelAnchorStyle,
    panelLayoutWidth,
    crewBodyHeight,
    aboutPanelRef,
    aboutTriggersRef,
    panelScrollRef,
    preparePanelLeave,
    finishPanelLeave,
    toggleAboutPanel,
  }
}
