<script lang="ts" setup>
import { defineProps, onMounted } from 'vue'
import $ from 'jquery'

import './index.less'

const props = defineProps({
  //子组件接收父组件传递过来的值
  theme: {
    type: String,
    default: 'light', // 设置默认值
  },
  isTextMenu: Boolean,
})

// 更精确的Safari浏览器检测函数
const isSafari = () => {
  // 检查是否为Safari浏览器 (Safari没有"chrome"关键字，但有"Safari"关键字)
  const isSafariUA =
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor)
  // 排除Chrome、Edge等基于Chromium的浏览器
  const isNotChromeBased = !/Chrome|Chromium|Edg|OPR|Opera/.test(
    navigator.userAgent
  )
  return isSafariUA && isNotChromeBased
}

onMounted(() => {
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
          ')',
      })
    })

    // 检测是否为Safari浏览器并添加类名
    if (isSafari()) {
      $('.body-color').addClass('safari')
    }
  })
})
</script>

<template>
  <div class="body-color">
    <div
      :class="{
        'body-color': true,
        dark: props.theme === 'dark',
        light: props.theme === 'light',
        // isTextMenu: props.isTextMenu,
      }"
    />
    <div
      :class="{
        'star-back': true,
        dark: props.theme === 'dark',
        light: props.theme === 'light',
      }"
    />
  </div>
</template>
