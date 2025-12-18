<script setup lang="ts">
import './index.less'
import ShowImg from '@/assets/img/show_1.png'
import { onBeforeUnmount, onMounted } from 'vue'
import { reduce } from '@/utils'

const mainImg = document.getElementsByClassName('show-img')
const mainImgLight = document.getElementsByClassName('show-img-light')
const mainImgLight2 = document.getElementsByClassName('show-img-light2')

onMounted(() => {
  //入场动画
  const imgSelf = document.getElementsByClassName('img-position')[0]
  const left1 = document.getElementsByClassName('left1')[0]
  const left2 = document.getElementsByClassName('left2')[0]
  const left3 = document.getElementsByClassName('left3')[0]
  const title = document.getElementsByClassName('big-title')[0]

  imgSelf['style'].opacity = '0'
  imgSelf['style'].bottom = '-40px'
  // imgSelf['style'].transition = 'opacity 2s, bottom 1s'
  left1['style'].top = '20px'
  left2['style'].top = '23px'
  left3['style'].opacity = '0'
  title['style'].marginLeft = '-100px'
  title['style'].opacity = '0'

  setTimeout(() => {
    imgSelf['style'].opacity = '1'
    imgSelf['style'].bottom = '10px'
    left1['style'].top = '-20px'
    left2['style'].top = '-7px'
    left3['style'].opacity = '1'
  }, 0)
  setTimeout(() => {
    title['style'].marginLeft = '0'
    title['style'].opacity = '1'
  }, 400)
  // 图片立体书效果
  reduce(
    (document.onmousemove = function (e) {
      // 通过event.clientX和event.clilentY获取鼠标位置
      // 将鼠标的x轴值和Y轴值赋值给图片的left和top
      mainImg[0]['style'].bottom = -e.clientY / 100 + 10 + 'px'
      mainImg[0]['style'].left = e.clientX / 100 - 50 + 'px'
      mainImgLight[0]['style'].bottom = -e.clientY / 30 + 35 + 'px'
      mainImgLight[0]['style'].left = e.clientX / 30 - 25 + 'px'
      mainImgLight[0]['style'].transform = `rotateY(${e.clientX / 60}deg) rotateX(${
        e.clientY / 40
      }deg)`
      mainImgLight2[0]['style'].bottom = e.clientY / 30 + 35 + 'px'
      mainImgLight2[0]['style'].left = -e.clientX / 30 - 25 + 'px'
      mainImgLight2[0]['style'].transform = `rotateY(${-e.clientX / 60}deg) rotateX(${
        -e.clientY / 40
      }deg)`
    }),
    1000
  )
})

const hideLeftImg = () => {
  const leftImg = document.getElementsByClassName('lll')[0]
  const leftImgAll = document.getElementsByClassName('left-img')[0]
  const showButton = document.getElementsByClassName('show-left-button')[0]

  showButton['style'].bottom = '0'
  leftImg['style'].marginLeft = '-1000px'
  leftImg['style'].opacity = '0'
  leftImgAll['style'].width = '0'
}

const showLeftImg = () => {
  const leftImg = document.getElementsByClassName('lll')[0]
  const leftImgAll = document.getElementsByClassName('left-img')[0]
  const showButton = document.getElementsByClassName('show-left-button')[0]

  showButton['style'].bottom = '-28px'
  leftImg['style'].marginLeft = '0'
  leftImg['style'].opacity = '1'
  leftImgAll['style'].width = '40vw'
}

//销毁onmousemove
onBeforeUnmount(() => {
  document.onmousemove = null
})
</script>

<template>
  <div class="left-img">
    <!-- 背景 -->
    <div class="lll">
      <div class="left1" @click="hideLeftImg()">
        <div class="slip">{{ '<' }}</div>
      </div>
      <div class="left2"></div>
      <div class="left3"></div>
      <div class="img-position">
        <img :src="ShowImg" class="show-img" />
      </div>
      <div class="big-title">
        HOME
      </div>
    </div>
    <div class="show-left-button" @click="showLeftImg()">{{ '>' }}</div>
  </div>
</template>
