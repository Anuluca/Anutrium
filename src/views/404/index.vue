<script setup lang="ts">
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { scrollPageTo } from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

import './index.less'

const router = useRouter()

const isEntered = ref(false)
let entranceTimer: number | null = null

onBeforeMount(() => {
  document.documentElement.classList.add('not-found-no-scroll')
  document.body.classList.add('not-found-no-scroll')
  setSmoothScrollLocked('not-found', true)
})

onMounted(() => {
  scrollPageTo({ top: 0, behavior: 'auto' })

  entranceTimer = window.setTimeout(() => {
    entranceTimer = null
    isEntered.value = true
  })
})

onUnmounted(() => {
  if (entranceTimer !== null) window.clearTimeout(entranceTimer)
  setSmoothScrollLocked('not-found', false)
  document.documentElement.classList.remove('not-found-no-scroll')
  document.body.classList.remove('not-found-no-scroll')
})
</script>

<template>
  <div
    class="not-found-page main-container"
    :class="{ 'is-entered': isEntered }"
  >
    <div class="inner">
      <div class="porygon" />
      <div class="show-text">
        <p><span>404</span> NOT FOUND</p>
        <p>{{ $t('notFound.description') }}</p>
        <p class="last-show-text" @click="router.push('/')">
          -> RETURN TO HOMEPAGE
        </p>
      </div>
    </div>
  </div>
</template>
