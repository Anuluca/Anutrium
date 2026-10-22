import { nextTick, onScopeDispose, type Ref, ref, watch } from 'vue'

import { getPageScrollTop, scrollPageTo } from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

const EXIT_DURATION = 650

/** 菜单挂载、动效和背景滚动锁共享一个生命周期。 */
export function useMobileMenu(isMobile: Readonly<Ref<boolean>>) {
  const isMobileMenuOpen = ref(false)
  const isMobileMenuMounted = ref(false)
  const isMobileMenuClosing = ref(false)
  let openFrame: number | null = null
  let unmountTimer: number | null = null
  let revision = 0
  let opening = false
  let scrollLocked = false
  let lockedScrollTop = 0

  const clearTimers = () => {
    revision++
    opening = false
    if (openFrame !== null) window.cancelAnimationFrame(openFrame)
    if (unmountTimer !== null) window.clearTimeout(unmountTimer)
    openFrame = null
    unmountTimer = null
  }

  const preventBackgroundTouchMove = (event: TouchEvent) => {
    event.preventDefault()
  }

  const unlockScroll = () => {
    if (!scrollLocked) return
    scrollLocked = false
    setSmoothScrollLocked('mobile-menu', false)
    document.documentElement.classList.remove('mobile-menu-scroll-locked')
    document.body.classList.remove('mobile-menu-scroll-locked')
    document.removeEventListener('touchmove', preventBackgroundTouchMove)
    scrollPageTo({ top: lockedScrollTop })
  }

  const closeMobileMenu = () => {
    if (isMobileMenuClosing.value && !isMobileMenuOpen.value) return
    clearTimers()
    isMobileMenuClosing.value = isMobileMenuOpen.value
    isMobileMenuOpen.value = false
    if (!isMobileMenuMounted.value) return
    unmountTimer = window.setTimeout(() => {
      unmountTimer = null
      isMobileMenuMounted.value = false
      isMobileMenuClosing.value = false
    }, EXIT_DURATION)
  }

  const openMobileMenu = async () => {
    clearTimers()
    const openingRevision = revision
    opening = true
    isMobileMenuClosing.value = false
    isMobileMenuMounted.value = true
    await nextTick()
    // 关闭、切路由或卸载发生在 nextTick 期间时，旧请求不能重新打开菜单。
    if (openingRevision !== revision || !isMobile.value) return
    openFrame = window.requestAnimationFrame(() => {
      openFrame = null
      opening = false
      isMobileMenuOpen.value = true
    })
  }

  const toggleMobileMenu = () => {
    if (isMobileMenuOpen.value || opening) {
      closeMobileMenu()
    } else void openMobileMenu()
  }

  watch([isMobile, isMobileMenuOpen], ([mobile, open]) => {
    if (mobile && open) {
      if (scrollLocked) return
      scrollLocked = true
      lockedScrollTop = getPageScrollTop()
      setSmoothScrollLocked('mobile-menu', true)
      document.documentElement.classList.add('mobile-menu-scroll-locked')
      document.body.classList.add('mobile-menu-scroll-locked')
      document.addEventListener('touchmove', preventBackgroundTouchMove, {
        passive: false,
      })
    } else {
      unlockScroll()
      if (!mobile) closeMobileMenu()
    }
  })

  onScopeDispose(() => {
    clearTimers()
    unlockScroll()
  })

  return {
    isMobileMenuOpen,
    isMobileMenuMounted,
    isMobileMenuClosing,
    toggleMobileMenu,
    closeMobileMenu,
  }
}
