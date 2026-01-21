<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import layout from './layout/index.vue'
import FooterCom from '@/components/FooterCom/index.vue'
import StartAnimation from '@/components/StartAnimation/index.vue'
import BackController from '@/components/BackController/index.vue'
import { onMounted, ref } from 'vue'
import { visualState } from './stores'

const visualStateStore = visualState()

// 设置根字体大小
function setRootFontSize() {
  const deviceWidth = document.documentElement.clientWidth
  const deviceHeight = document.documentElement.clientHeight
  const aspectRatio = deviceWidth / deviceHeight

  let rootFontSize = null
  let deviceType = ''

  if (aspectRatio <= 2 / 3) {
    // 长宽比<=2:3，认为是移动端
    rootFontSize = (deviceWidth / 375) * 14
    deviceType = 'mobile'
  } else if (aspectRatio <= 1 && aspectRatio > 2 / 3) {
    // 1:1>长宽比>2:3，认为是平板端
    rootFontSize = (deviceWidth / 375) * 8
    deviceType = 'tablet'
  } else {
    // 长宽比>1，认为是桌面端
    rootFontSize = (deviceWidth / 375) * 4.9
    deviceType = 'desktop'
  }

  visualStateStore.setDeviceType(deviceType as 'mobile' | 'tablet' | 'desktop')

  document.documentElement.style.fontSize = rootFontSize + 'px'
}

// 初始化和监听窗口变化
setRootFontSize()
window.addEventListener('resize', setRootFontSize)

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
  }, 450)
}

onMounted(() => {
  // 检查当前主题
  visualStateStore.setTheme(localStorage.getItem('theme') || 'dark')
})
</script>

<template>
  <StartAnimation @finished="startAnimationFinished" />
  <layout v-if="showLayout" />
  <FooterCom v-if="showLayout" />
  <BackController />
</template>
