<template>
  <div ref="root" class="study-note-card__copy" :style="frameStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useFrameTask } from '@/composables/useFrameTask'

const TITLE_PADDING = { right: 12, left: 6 }
const TITLE_FADE_EXTENSION = 8
const root = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const frameStyle = ref<Record<string, string>>({})
const measureFrame = useFrameTask(() => {
  if (!root.value || !title.value) return
  const frame = root.value.getBoundingClientRect()
  const textRange = document.createRange()
  textRange.selectNodeContents(title.value)
  const heading = textRange.getBoundingClientRect()
  const scale = frame.width / root.value.offsetWidth
  const scaleY = frame.height / root.value.offsetHeight
  if (!scale || !scaleY) return
  // 使用文字范围排除标题容器的内边距，镂空与悬停背景共用留白，文字本身不裁切。
  frameStyle.value = {
    '--note-title-fade-height': `${Math.max(
      0,
      (frame.top - heading.top) / scaleY + TITLE_FADE_EXTENSION
    )}px`,
    '--note-title-gap-start': `${Math.max(
      0,
      (heading.left - frame.left) / scale - TITLE_PADDING.left
    )}px`,
    '--note-title-gap-end': `${Math.min(
      root.value.offsetWidth,
      (heading.right - frame.left) / scale + TITLE_PADDING.right
    )}px`,
  }
})
useResizeObserver([root, title], measureFrame.schedule)
onMounted(() => {
  title.value = root.value?.querySelector('h2') ?? null
  measureFrame.schedule()
  void document.fonts.ready.then(measureFrame.schedule)
})
</script>
