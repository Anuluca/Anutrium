import { ref } from 'vue'
import { defineStore } from 'pinia'

// 网站级审查开关保留跨路由状态；每次重新加载网站默认隐藏边框。
export const useLayoutBorders = defineStore('layout-borders', () => {
  const visible = ref(false)
  return { visible }
})
