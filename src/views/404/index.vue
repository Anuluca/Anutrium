<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import './index.less'

const router = useRouter()

const showTextClass = ref('')
const lastShowTextWidth = ref('0')
const porygonStyle = ref({
  opacity: '0',
  width: '512px',
  height: '478px',
})

onMounted(() => {
  document.documentElement.classList.add('not-found-no-scroll')
  document.body.classList.add('not-found-no-scroll')

  setTimeout(() => {
    showTextClass.value = 'active-shadow'
    porygonStyle.value = {
      opacity: '1',
      width: '394px',
      height: '369px',
    }
  }, 0)

  setTimeout(() => {
    showTextClass.value += ' active-color'
  }, 200)

  setTimeout(() => {
    lastShowTextWidth.value = '100%'
  }, 400)
})

onUnmounted(() => {
  document.documentElement.classList.remove('not-found-no-scroll')
  document.body.classList.remove('not-found-no-scroll')
})
</script>

<template>
  <div class="not-found-page main-container no-rem">
    <div class="inner">
      <div class="porygon" :style="porygonStyle" />
      <div class="show-text" :class="showTextClass">
        <p><span>404</span> NOT FOUND</p>
        <p>{{ $t('notFound.description') }}</p>
        <p
          class="last-show-text"
          :style="{ width: lastShowTextWidth }"
          @click="router.push('/')"
        >
          -> RETURN TO HOMEPAGE
        </p>
      </div>
    </div>
  </div>
</template>
