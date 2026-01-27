<script setup lang="ts">
import { computed } from 'vue'

import Logo from '@/assets/img/logo/logo.png'
import LogoDark from '@/assets/img/logo/logo_black.png'
import { visualState } from '@/stores'

const visualStateStore = visualState()

const showLogo = computed(() => {
  return visualStateStore.theme === 'dark' ? Logo : LogoDark
})

const toOld = () => {
  location.href = 'https://anulucas-blog.pages.dev/'
}
const clickLisence = () => {
  window.open('https://creativecommons.org/licenses/by-nc-nd/3.0/cn/')
}
</script>

<template>
  <div class="home-page main-container" @mousewheel="wheelEvent">
    <div class="center-text">
      <img :src="showLogo" alt="" />
      <div class="tempTitle">庭院建设中</div>
      <div class="tempLink" @click="toOld">前往旧版主页</div>
      <p>DESIGNED & DEVELOPED BY ANULUCA</p>
      <p>
        POWERED BY： &nbsp;
        <span style="color: #75fb7c">VUE3.2 &nbsp;</span> |
        <span style="color: #2834ff"> &nbsp;NETLIFY</span>
      </p>
    </div>
    <div class="bottom-text">
      <p>The copyright statement for articles and pictures:</p>
      <p>
        free to reprint, non-commercial, non-derivative, with attribution （
        <span class="lisence" @click="clickLisence">
          Creative Commons 3.0 lisence
        </span>
        ）.
      </p>
      <div style="text-align: center; color: #8d8d8d; font-family: 'cnTitle'">
        &lt; 预计2026年内开放 &gt;
      </div>
    </div>
  </div>
</template>
<style lang="less" scoped src="./index.less" />
