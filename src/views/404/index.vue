<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import './index.less'

const router = useRouter()

// 定义响应式数据控制动画状态
const showTextClass = ref('')
const lastShowTextWidth = ref('0')
const porygonStyle = ref({
  opacity: '0',
  width: '512px',
  height: '478px',
})

onMounted(() => {
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
</script>

<template>
  <div class="not-found-page main-container">
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
