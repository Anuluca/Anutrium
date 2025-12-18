<script setup lang="ts">
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import BackController from '@/components/BackController/index.vue'
import { onMounted } from 'vue'
import { visualState } from './stores'
import { useRouter, useRoute } from 'vue-router'

const $router = useRouter() // 这是路由跳转的
const visualStateStore = visualState()

const isMobile = () => {
  let flag = navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
  )
  return flag
}

onMounted(() => {
  if (isMobile()) {
    $router.push('mobileTemp')
  }
  // 主题判断
  if (localStorage.getItem('theme')) {
    visualStateStore.setTheme(localStorage.getItem('theme'))
  } else {
    localStorage.setItem('theme', 'dark')
  }
})
</script>

<template>
  <el-container>
    <BackController />
    <layout></layout>
    <FooterCom />
  </el-container>
</template>
