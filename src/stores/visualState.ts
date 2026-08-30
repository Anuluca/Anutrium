import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export type ZodiacLayout = 'hero' | 'content'

export default defineStore('visualState', {
  state: (): {
    theme: Theme
    deviceType: DeviceType
    zodiacLayout: ZodiacLayout
    homeHeaderScrollProgress: number
    pageScrollProgressOverride: number | null
  } => ({
    theme: 'dark',
    deviceType: 'desktop',
    zodiacLayout: 'hero',
    homeHeaderScrollProgress: 0,
    pageScrollProgressOverride: null,
  }),

  actions: {
    /**
     * 设置主题并更新本地存储和DOM
     * @param theme - 要设置的主题 ('light' | 'dark')
     */
    setTheme(theme: Theme): void {
      if (theme !== 'light' && theme !== 'dark') {
        console.warn(`Invalid theme value: ${theme}. Using 'dark' as fallback.`)
        theme = 'dark'
      }

      localStorage.setItem('theme', theme)

      const bodyElement = document.body
      const rootElement = document.documentElement
      if (theme === 'dark') {
        bodyElement.classList.remove('light')
        bodyElement.classList.add('dark')
        rootElement.classList.remove('light')
        rootElement.classList.add('dark')
      } else {
        bodyElement.classList.add('light')
        bodyElement.classList.remove('dark')
        rootElement.classList.add('light')
        rootElement.classList.remove('dark')
      }
      rootElement.dataset.theme = theme
      bodyElement.dataset.theme = theme

      this.theme = theme
    },

    /**
     * 切换主题
     */
    toggleTheme(): void {
      const newTheme: Theme = this.theme === 'light' ? 'dark' : 'light'
      this.setTheme(newTheme)
    },

    /**
     * 设置设备类型
     * @param deviceType - 要设置的设备类型 ('mobile' | 'tablet' | 'desktop')
     */
    setDeviceType(deviceType: DeviceType): void {
      if (!['mobile', 'tablet', 'desktop'].includes(deviceType)) {
        console.warn(
          `Invalid deviceType value: ${deviceType}. Using 'desktop' as fallback.`
        )
        deviceType = 'desktop'
      }

      localStorage.setItem('deviceType', deviceType)

      this.deviceType = deviceType
    },

    setZodiacLayout(layout: ZodiacLayout): void {
      if (this.zodiacLayout === layout) return
      this.zodiacLayout = layout
    },

    setHomeHeaderScrollProgress(progress: number): void {
      const normalizedProgress = Math.min(1, Math.max(0, progress))
      if (this.homeHeaderScrollProgress === normalizedProgress) return
      this.homeHeaderScrollProgress = normalizedProgress
    },

    setPageScrollProgressOverride(progress: number | null): void {
      const normalizedProgress =
        progress === null
          ? null
          : Math.round(Math.min(100, Math.max(0, progress)) * 10_000) / 10_000
      if (this.pageScrollProgressOverride === normalizedProgress) return
      this.pageScrollProgressOverride = normalizedProgress
    },
  },
})
