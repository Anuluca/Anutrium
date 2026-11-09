import { defineStore } from 'pinia'

import { ensureLightThemeStyles } from '@/utils/themeStyles'

type Theme = 'light' | 'dark'

type DeviceType = 'mobile' | 'tablet' | 'desktop'

export default defineStore('visualState', {
  state: (): {
    theme: Theme
    pendingTheme: Theme | null
    themeRequestRevision: number
    deviceType: DeviceType
    backgroundTopInset: number
    routeLeaveRevision: number
  } => ({
    theme: 'dark',
    pendingTheme: null,
    themeRequestRevision: 0,
    deviceType: 'desktop',
    backgroundTopInset: 0,
    routeLeaveRevision: 0,
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

    setBackgroundTopInset(inset: number): void {
      const normalizedInset = Math.max(0, inset)
      if (this.backgroundTopInset === normalizedInset) return
      this.backgroundTopInset = normalizedInset
    },

    markRouteLeaveComplete(): void {
      this.routeLeaveRevision += 1
    },
  },
})
