<template>
  <div class="home-page main-container" @mousewheel="wheelEvent">
    <!-- <LeftImg /> -->
    <div class="right-container">
      <div class="center-text">
        <img :src="showLogo" alt="" />
        <div style="font-size: 40px; color: #000; margin-bottom: 5px; text-align: center">
          庭院建设中
        </div>
        <div
          style="
            margin-bottom: 20px;
            color: #000;
            text-align: center;
            text-decoration: underline;
            cursor: pointer;
          "
          @click="toOld"
        >
          前往旧版主页
        </div>
        <p>DESIGNED & DEVELOPED BY ANULUCA</p>
        <p>
          Based on： &nbsp;<span style="color: #75fb7c">VUE3.2 &nbsp;</span> |
          <span style="color: #2834ff"> &nbsp;ELEMENT+</span>
        </p>
      </div>
      <div class="bottom-text">
        <p>The copyright statement for articles and pictures:</p>
        <p>
          free to reprint, non-commercial, non-derivative, with attribution （
          <span class="lisence" @click="clickLisence">Creative Commons 3.0 lisence</span> ）.
        </p>
        <div style="text-align: center; color: #8D8D8D">< 预计2026年内开放 ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import './index.less'
import { computed, onMounted, ref } from 'vue'
import { visualState } from '@/stores'
import Logo from '@/assets/img/logo.png'
import LogoDark from '@/assets/img/logo_black.png'
import { useRouter } from 'vue-router'

const visualStateStore = visualState()
const router = useRouter()

const showLogo = computed(() => {
  return visualStateStore.theme === 'dark' ? Logo : LogoDark
})

const toOld = () => {
  router.push('/old')
}
onMounted(() => {})
</script>