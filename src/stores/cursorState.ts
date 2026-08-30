import { defineStore } from 'pinia'

export const ROUTE_CURSOR_LOADING_SOURCE = 'route-transition'

export default defineStore('cursorState', {
  state: (): { loadingSources: string[] } => ({
    loadingSources: [],
  }),

  getters: {
    isLoading: (state) => state.loadingSources.length > 0,
  },

  actions: {
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
