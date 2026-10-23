import { ref } from 'vue'
import { defineStore } from 'pinia'

interface CraftOrigin {
  path: string
  toolId: string
  tag: string | null
  offset: number
}

export const useCraftNavigation = defineStore('craft-navigation', () => {
  // 仅保留当前页面会话的来源，直接访问或刷新详情时使用工具箱入口。
  const origin = ref<CraftOrigin | null>(null)
  const restoring = ref(false)
  return { origin, restoring }
})
