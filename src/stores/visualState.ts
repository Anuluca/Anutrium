import { defineStore } from 'pinia'

import { ensureLightThemeStyles } from '@/utils/themeStyles'

type Theme = 'light' | 'dark'

type DeviceType = 'mobile' | 'tablet' | 'desktop'

type ZodiacLayout = 'hero' | 'content'

export default defineStore('visualState', {
  state: (): {
    theme: Theme
    pendingTheme: Theme | null
    themeRequestRevision: number
    deviceType: DeviceType
    zodiacLayout: ZodiacLayout
    homeStarfieldVisible: boolean
    homeHeaderScrollProgress: number
    backgroundTopInset: number
    routeLeaveRevision: number
    pageScrollProgressOverride: number | null
  } => ({
    theme: 'dark',
    pendingTheme: null,
    themeRequestRevision: 0,
    deviceType: 'desktop',
    zodiacLayout: 'hero',
    homeStarfieldVisible: true,
    homeHeaderScrollProgress: 0,
    backgroundTopInset: 0,
    routeLeaveRevision: 0,
    pageScrollProgressOverride: null,
  }),

  actions: {
    async setTheme(theme: Theme): Promise<boolean> {
      if (typeof document === 'undefined') return false
      if (theme !== 'light' && theme !== 'dark') theme = 'dark'

      const revision = ++this.themeRequestRevision
      this.pendingTheme = theme
      try {
        if (theme === 'light') await ensureLightThemeStyles()
        // 后来的选择优先，防止浅色样式加载完成后覆盖用户刚切回的深色。
        if (revision !== this.themeRequestRevision) return false

        if (localStorage.getItem('theme') !== theme)
          localStorage.setItem('theme', theme)
        for (const element of [document.documentElement, document.body]) {
          element.classList.toggle('light', theme === 'light')
          element.classList.toggle('dark', theme === 'dark')
          if (element.dataset.theme !== theme) element.dataset.theme = theme
        }
        this.theme = theme
        return true
      } catch (error) {
        console.error('主题切换失败，保留当前主题', error)
        return false
      } finally {
        if (revision === this.themeRequestRevision) this.pendingTheme = null
      }
    },

    toggleTheme(): Promise<boolean> {
      return this.setTheme(
        (this.pendingTheme ?? this.theme) === 'light' ? 'dark' : 'light'
      )
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

    setHomeStarfieldVisible(visible: boolean): void {
      if (this.homeStarfieldVisible === visible) return
      this.homeStarfieldVisible = visible
    },

    setHomeHeaderScrollProgress(progress: number): void {
      const normalizedProgress = Math.min(1, Math.max(0, progress))
      if (this.homeHeaderScrollProgress === normalizedProgress) return
      this.homeHeaderScrollProgress = normalizedProgress
    },

    setBackgroundTopInset(inset: number): void {
      const normalizedInset = Math.max(0, inset)
      if (this.backgroundTopInset === normalizedInset) return
      this.backgroundTopInset = normalizedInset
    },

    markRouteLeaveComplete(): void {
      this.routeLeaveRevision += 1
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
