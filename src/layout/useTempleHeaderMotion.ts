import { computed, nextTick, onScopeDispose, type Ref, ref, watch } from 'vue'

interface HeaderPresentation {
  moduleName: string
  moduleTheme: string
  contentAligned: boolean
}

interface HeaderMotionOptions {
  root: Ref<HTMLElement | null>
  isTempleRoute: Readonly<Ref<boolean>>
  wantsNavigation: Readonly<Ref<boolean>>
  presentation: Readonly<Ref<HeaderPresentation>>
}

export function useTempleHeaderMotion({
  root,
  isTempleRoute,
  wantsNavigation,
  presentation,
}: HeaderMotionOptions) {
  const templeHeaderDefault = ref(!wantsNavigation.value)
  const navigationRevealed = ref(wantsNavigation.value)
  // 离场期间保留标题宽度，避免 Logo 的运动基准随文字卸载而改变。
  const lastHeader = ref(presentation.value)
  const displayedHeader = computed(() =>
    isTempleRoute.value ? lastHeader.value : presentation.value
  )
  let motion: Animation | undefined
  let centering = false
  let revision = 0

  const cancelMotion = () => {
    revision++
    motion?.cancel()
    motion = undefined
    centering = false
  }

  const moveLogo = async (centered: boolean) => {
    const currentRevision = ++revision
    const logo = root.value?.querySelector<HTMLElement>('.logo-box .logo')
    const before = logo?.getBoundingClientRect()
    motion?.cancel()
    motion = undefined
    centering = centered
    if (!centered) templeHeaderDefault.value = false
    await nextTick()
    if (!logo || !before || currentRevision !== revision) return false
    const after = logo.getBoundingClientRect()
    let targetX = after.x
    let targetY = after.y
    if (centered) {
      // 离场菜单尚未卸载，不能临时切 flex 测终点；直接计算页头内容区中心。
      const header = logo.closest('header')!
      const bounds = header.getBoundingClientRect()
      const styles = getComputedStyle(header)
      targetX = bounds.left + (bounds.width - after.width) / 2
      targetY =
        bounds.top +
        (bounds.height +
          parseFloat(styles.paddingTop) -
          parseFloat(styles.paddingBottom) -
          after.height) /
          2
    }
    const animation = logo.animate(
      [
        {
          transform: `translate(${before.x - after.x}px, ${
            before.y - after.y
          }px)`,
        },
        {
          transform: centered
            ? `translate(${targetX - after.x}px, ${targetY - after.y}px)`
            : 'none',
        },
      ],
      {
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 1
          : 2000,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }
    )
    motion = animation
    try {
      await animation.finished
    } catch {
      return false
    }
    if (currentRevision !== revision) return false
    if (centered) {
      templeHeaderDefault.value = true
      await nextTick()
      if (currentRevision !== revision) return false
      centering = false
    }
    animation.cancel()
    motion = undefined
    return true
  }

  const centerTempleLogo = () => {
    if (
      isTempleRoute.value &&
      !wantsNavigation.value &&
      !templeHeaderDefault.value &&
      !centering
    )
      void moveLogo(true)
  }

  watch(
    [isTempleRoute, wantsNavigation, presentation],
    async ([temple, visible, header]) => {
      if (!temple) {
        cancelMotion()
        lastHeader.value = header
        templeHeaderDefault.value = false
        navigationRevealed.value = true
        return
      }
      if (!visible) {
        navigationRevealed.value = false
        centerTempleLogo()
        return
      }
      lastHeader.value = header
      if (templeHeaderDefault.value || centering) {
        navigationRevealed.value = false
        if (await moveLogo(false))
          navigationRevealed.value = wantsNavigation.value
      } else navigationRevealed.value = true
    }
  )

  onScopeDispose(cancelMotion)
  return {
    templeHeaderDefault,
    navigationRevealed,
    displayedHeader,
  }
}
