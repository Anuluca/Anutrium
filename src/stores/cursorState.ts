import { defineStore } from 'pinia'

export const ROUTE_CURSOR_LOADING_SOURCE = 'route-transition'

export default defineStore('cursorState', {
  state: (): {
    loadingSources: string[]
    interactiveSources: string[]
    instantSources: string[]
    isIdle: boolean
  } => ({
    loadingSources: [],
    interactiveSources: [],
    instantSources: [],
    isIdle: false,
  }),

  getters: {
    isLoading: (state) => state.loadingSources.length > 0,
    isInstant: (state) => state.instantSources.length > 0,
    isInteractive: (state) => state.interactiveSources.length > 0,
  },

  actions: {
    // 按使用方登记无惯性跟随，避免多个界面同时启用时互相覆盖。
    setInstant(source: string, active: boolean): void {
      const index = this.instantSources.indexOf(source)
      if (active && index < 0) this.instantSources.push(source)
      else if (!active && index >= 0) this.instantSources.splice(index, 1)
    },
    // 三维对象不能通过 DOM 标签识别悬停，由场景按命中结果注册，并在离场时清理。
    setInteractive(source: string, active: boolean): void {
      const index = this.interactiveSources.indexOf(source)
      if (active && index < 0) this.interactiveSources.push(source)
      else if (!active && index >= 0) this.interactiveSources.splice(index, 1)
    },
    startLoading(source: string): void {
      if (this.loadingSources.includes(source)) return
      this.loadingSources.push(source)
    },

    stopLoading(source: string): void {
      this.loadingSources = this.loadingSources.filter(
        (activeSource) => activeSource !== source
      )
    },
  },
})
