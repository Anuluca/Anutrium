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
    var $stars = $('.star-back')
    var r = 700 /*星星的看起来的距离,值越大越远,可自行调制到自己满意的样子*/
    for (var i = 0; i < stars; i++) {
      var $star = $('<div/>').addClass('star')
      $stars.append($star)
    }
    $('.star').each(function () {
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
})
</script>

<template>
  <div class="body-color">
    <div
      :class="{
        'body-color': true,
        dawn: props.theme === 'dawn',
        light: props.theme === 'light',
        night: props.ifDarken
      }"
    ></div>
    <div
      :class="{ 'star-back': true, dawn: props.theme === 'dawn', light: props.theme === 'light' }"
    ></div>
  </div>
</template>
