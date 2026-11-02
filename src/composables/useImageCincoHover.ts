import { onBeforeUnmount, onMounted } from 'vue'

import { createImageCincoHover } from '@/utils/imageCincoHover'

export function useImageCincoHover(options?: { glowStrength?: number }) {
  const hover = createImageCincoHover(options)
  onMounted(hover.mount)
  onBeforeUnmount(hover.destroy)
  return hover
}
