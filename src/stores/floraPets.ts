import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { pets } from '@/locales/dynamic/pets'

// 只保留在本次页面会话中，路由离场不重置，刷新后恢复花花。
export const useFloraPets = defineStore('flora-pets', () => {
  const activePetId = ref(pets[0].id)
  const activePet = computed(
    () => pets.find((pet) => pet.id === activePetId.value) ?? pets[0]
  )
  const loadingPetId = ref<string | null>(null)
  const error = ref('')
  return { activePetId, activePet, loadingPetId, error }
})
