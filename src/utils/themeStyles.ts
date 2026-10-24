let lightThemeStylesPromise: Promise<unknown> | null = null

/** Load the large light-theme override sheet only for visitors who use it. */
export const ensureLightThemeStyles = () => {
  if (typeof document === 'undefined') return Promise.resolve()

  // 合并并发加载；失败后清除缓存，避免后续切换一直复用已拒绝的 Promise。
  lightThemeStylesPromise ||= import('@/assets/style/light-theme.less').catch(
    (error) => {
      lightThemeStylesPromise = null
      throw error
    }
  )
  return lightThemeStylesPromise
}
