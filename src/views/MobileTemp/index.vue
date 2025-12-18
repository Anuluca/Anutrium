<script lang="ts" setup>
import './index.less'
import $ from 'jquery'
import { onMounted, defineProps } from 'vue'

const props = defineProps({
  //子组件接收父组件传递过来的值
  theme: String,
  ifDarken: Boolean
})

onMounted(() => {
  console.log(props.theme)

  $(document).ready(function () {
    var stars = 800 /*星星的密集程度，数字越大越多*/
    var $stars = $('.star-back-temp')
    var r = 700 /*星星的看起来的距离,值越大越远,可自行调制到自己满意的样子*/
    for (var i = 0; i < stars; i++) {
      var $star = $('<div/>').addClass('star-temp')
      $stars.append($star)
    }
    $('.star-temp').each(function () {
      var cur = $(this)
      var s = 0.2 + Math.random() * 1
      var curR = r + Math.random() * 300
      cur.css({
        transformOrigin: '0 0 ' + curR + 'px',
        transform:
          ' translate3d(0,0,-' +
          curR +
          'px) rotateY(' +
          Math.random() * 360 +
          'deg) rotateX(' +
          Math.random() * -50 +
          'deg) scale(' +
          s +
          ',' +
          s +
          ')'
      })
    })
  })

  const showText = document.getElementsByClassName('temp-text')[0]
  const lastShowText = document.getElementsByClassName('temp-llast')[0]
  const porygon_element = document.getElementsByClassName('temp-lluca')[0]
  showText['style'].textShadow = '0 0 0 15px white'
  showText['style'].color = 'transparent'
  lastShowText['style'].width = '0'
  porygon_element['style'].opacity = '0'
  porygon_element['style'].width = '120px'
  porygon_element['style'].height = '120px'

  setTimeout(() => {
    showText['style'].textShadow = '0 0 0 8px white'
    porygon_element['style'].opacity = '1'
    porygon_element['style'].width = '150px'
    porygon_element['style'].height = '150px'
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
  <div class="mobile-temp">
    <div class="mobile-temp dawn"></div>
    <div class="star-back-temp dawn"></div>
    <div class="temp-lluca" />
    <div class="temp-text">
      <p class="temp-llast">移动端适配正在开发中</p>
      <p style="display: flex; align-items: center">
        请移步PC端访问<el-icon style="margin: 0 4px"><Monitor /></el-icon>
      </p>
    </div>
  </div>
</template>
