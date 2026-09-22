let lightThemeStylesPromise: Promise<unknown> | null = null

/** Load the large light-theme override sheet only for visitors who use it. */
export const ensureLightThemeStyles = () => {
  if (typeof document === 'undefined') return Promise.resolve()

  lightThemeStylesPromise ||= import('@/assets/style/light-theme.less')
  return lightThemeStylesPromise
}
