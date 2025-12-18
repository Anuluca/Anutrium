<script setup lang="ts">
import './index.less'
import Porygon from '@/assets/img/porygon.png'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  const showText = document.getElementsByClassName('show-text')[0]
  const lastShowText = document.getElementsByClassName('last-show-text')[0]
  const porygon_element = document.getElementsByClassName('porygon')[0]
  showText['style'].textShadow = '0 0 0 15px white'
  showText['style'].color = 'transparent'
  lastShowText['style'].width = '0'
  porygon_element['style'].opacity = '0'
  porygon_element['style'].width = '512px'
  porygon_element['style'].height = '478px'

  setTimeout(() => {
    showText['style'].textShadow = '0 0 0 8px white'
    porygon_element['style'].opacity = '1'
    porygon_element['style'].width = '394px'
    porygon_element['style'].height = '369px'
  }, 0)
  setTimeout(() => {
    showText['style'].color = '#fff'
  }, 200)
  setTimeout(() => {
    lastShowText['style'].width = '100%'
  }, 400)
})
</script>

<template>
  <div class="not-found-page">
    <div class="inner">
      <!-- <img class="porygon" :src="Porygon" /> -->
      <div class="porygon" />
      <div class="show-text">
        <p>404 NOT FOUND</p>
        <p>{{ $t('notFound.description') }}</p>
        <!-- <p> $t('home.lisence2')</p> -->
        <!-- <p class="last-show-text" @click="router.push('/')">{{ $t('notFound.back') }}</p> -->
        <p class="last-show-text" @click="router.push('/')">-> RETURN TO HOMEPAGE</p>
      </div>
    </div>
  </div>
</template>
