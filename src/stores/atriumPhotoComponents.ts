import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export const PHOTO_THEMES = {
  red: {
    accent: '#e23456',
    material: '#e84d6b',
    ambient: '#b45d71',
    key: '#ffb7c9',
    rim: '#f21148',
    background: '#280914',
    preview: '#e23456',
  },
  pink: {
    accent: '#C64665',
    material: '#C64665',
    ambient: '#906070',
    key: '#ffd1de',
    rim: '#C64665',
    background: '#2b101b',
    preview: '#C64665',
  },
  cyan: {
    accent: '#18c6a6',
    material: '#18c6a6',
    ambient: '#438d83',
    key: '#baffef',
    rim: '#12c6ac',
    background: '#082b27',
    preview: '#18c6a6',
  },
  blue: {
    accent: '#408bfa',
    material: '#548de8',
    ambient: '#516fba',
    key: '#b7d9ff',
    rim: '#245bfa',
    background: '#071a36',
    preview: '#408bfa',
  },
} as const

export const useAtriumPhotoComponents = defineStore(
  'atrium-photo-components',
  () => {
    const active = ref(false)
    const settings = reactive({
      zodiacOpacity: 15,
      zodiacBlur: 0,
      starsOpacity: 17,
      starsBlur: 0,
      background: 'red' as keyof typeof PHOTO_THEMES,
      blackGradient: true,
      modelOutline: false,
      modelWireThickness: 1,
      modelWireDensity: 100,
      modelForm: 'default' as 'default' | 'wireframe',
    })
    let initial = { ...settings }
    const initialize = (values: typeof settings) => {
      Object.assign(settings, values)
      initial = { ...settings }
    }
    const reset = () => Object.assign(settings, initial)
    return { active, settings, initialize, reset }
  }
)
