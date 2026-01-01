<script setup lang="ts">
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import StartAnimation from '@/components/StartAnimation/index.vue'
import BackController from '@/components/BackController/index.vue'
import { onMounted, ref } from 'vue'
import { visualState } from './stores'
import { useRouter, useRoute } from 'vue-router'

const $router = useRouter() // 这是路由跳转的
const visualStateStore = visualState()

// 控制布局组件是否渲染
const showLayout = ref(false)

const startAnimationFinished = () => {
  setTimeout(() => {
  // 检查字体是否已加载完成
  const checkFontLoaded = () => {
    if (window.fontLoaded) {
      showLayout.value = true
    } else {
      requestAnimationFrame(checkFontLoaded)
    }
  }
  checkFontLoaded()
    
  }, 450);
}

onMounted(() => {

  // 检查当前主题
  visualStateStore.setTheme(localStorage.getItem('theme') || 'light')
  
})
</script>

<template>
  <StartAnimation @finished="startAnimationFinished"/>
  <BackController />
  <layout v-if="showLayout"></layout>
  <FooterCom  v-if="showLayout"/>
</template>