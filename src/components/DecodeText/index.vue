<template>
  <span class="decode-text" :aria-label="text">
    <span
      v-for="(character, index) in characters"
      :key="index"
      class="decode-text__character"
      aria-hidden="true"
    >
      <span :class="{ 'decode-text__original--hidden': active }">{{
        character
      }}</span>
      <span v-if="active" class="decode-text__glyph">{{ glyphs[index] }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ text: string }>()
const characters = computed(() => Array.from(props.text))
const glyphs = ref<string[]>([])
const active = ref(false)
const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%*+'
let frame = 0
let mounted = false
let motionQuery: MediaQueryList | undefined

const stop = () => {
  cancelAnimationFrame(frame)
  active.value = false
}

const play = () => {
  stop()
  if (motionQuery?.matches || !characters.value.length) return

  active.value = true
  glyphs.value = characters.value.map((character) =>
    /\s/u.test(character) ? character : ''
  )
  const startedAt = performance.now()
  const stagger = Math.min(45, 600 / Math.max(1, characters.value.length - 1))
  let previousTick = -1

  // 按原字宽度占位；只更新覆盖层，避免中英文乱码切换引起布局跳动。
  const update = (now: number) => {
    const elapsed = now - startedAt - 440
    const tick = Math.floor(elapsed / 45)
    if (elapsed >= 0 && tick !== previousTick) {
      previousTick = tick
      glyphs.value = characters.value.map((character, index) => {
        if (/\s/u.test(character)) return character
        const progress = elapsed - index * stagger
        if (progress < 0) return ''
        if (progress >= 240) return character
        return charset[Math.floor(Math.random() * charset.length)]
      })
    }
    if (elapsed >= (characters.value.length - 1) * stagger + 240) {
      active.value = false
      return
    }
    frame = requestAnimationFrame(update)
  }
  frame = requestAnimationFrame(update)
}

watch(
  () => props.text,
  () => {
    if (mounted) play()
  }
)

onMounted(() => {
  mounted = true
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', play)
  play()
})

onBeforeUnmount(() => {
  stop()
  motionQuery?.removeEventListener('change', play)
})
</script>

<style scoped lang="less">
.decode-text__character {
  position: relative;
  display: inline-block;
  white-space: pre;
}

.decode-text__original--hidden {
  visibility: hidden;
}

.decode-text__glyph {
  position: absolute;
  inset: 0;
  overflow: hidden;
  text-align: center;
}
</style>
