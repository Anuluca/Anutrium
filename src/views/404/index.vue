<script setup lang="ts">
import { onBeforeMount, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import NotFoundContent from '@/components/NotFoundContent/index.vue'
import { scrollPageTo } from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

import './index.less'

const router = useRouter()
onBeforeMount(() => {
  document.documentElement.classList.add('not-found-no-scroll')
  document.body.classList.add('not-found-no-scroll')
  setSmoothScrollLocked('not-found', true)
})
onMounted(() => scrollPageTo({ top: 0, behavior: 'auto' }))
onUnmounted(() => {
  setSmoothScrollLocked('not-found', false)
  document.documentElement.classList.remove('not-found-no-scroll')
  document.body.classList.remove('not-found-no-scroll')
})
</script>

<template>
  <NotFoundContent @return-home="router.push('/')" />
</template>
