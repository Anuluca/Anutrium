<template>
  <div class="cursor-position" :style="followerStyle">
    <div class="cursor-scale" :class="{ 'is-clicked': isClicked }">
      <div class="cursor-shape" :class="{ 'is-active': isHovering }" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const mouse = reactive({ x: 0, y: 0 })
const follower = reactive({ x: 0, y: 0 })

const isHovering = ref(false)
const isClicked = ref(false)

const followerStyle = computed(() => ({
  transform: `translate3d(${follower.x}px, ${follower.y}px, 0)`,
}))

const ease = 0.1
let animationFrameId

const onMouseMove = (e) => {
  mouse.x = e.clientX
  mouse.y = e.clientY
}

const onMouseDown = () => (isClicked.value = true)
const onMouseUp = () => (isClicked.value = false)

// ✨ 新增：使用事件委托处理 Hover 状态
const onMouseOver = (e) => {
  // closest() 可以确保就算鼠标悬停在 button 内部的 span 上，也能正确识别
  if (e.target.closest('a, button, [data-magnetic]')) {
    isHovering.value = true
  }
}

const onMouseOut = (e) => {
  // 当鼠标离开目标元素时
  if (e.target.closest('a, button, [data-magnetic]')) {
    isHovering.value = false
  }
}

const render = () => {
  follower.x += (mouse.x - follower.x) * ease
  follower.y += (mouse.y - follower.y) * ease
  animationFrameId = requestAnimationFrame(render)
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  // 绑定全局委托事件，抛弃 setTimeout 和 querySelectorAll
  window.addEventListener('mouseover', onMouseOver)
  window.addEventListener('mouseout', onMouseOut)

  render()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)

  // 清理事件
  window.removeEventListener('mouseover', onMouseOver)
  window.removeEventListener('mouseout', onMouseOut)

  cancelAnimationFrame(animationFrameId)
})
</script>

<style>
/* 全局强制隐藏系统指针 */
* {
  cursor: none !important;
}
</style>

<style lang="less" scoped>
@follower-size: 24px;
// 三角形在视觉上会显得比同样宽度的圆小，所以做大一点保持视觉平衡
@triangle-size: 36px;

.cursor-position {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  // 把差值混合放在最外层，确保所有变形都能完美反色
  mix-blend-mode: difference;
}

.cursor-scale {
  // 点击时的缩放动画，使用 cubic-bezier 增加一点“Q弹”的物理回弹感
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &.is-clicked {
    // 点击时整体放大 1.5 倍
    transform: scale(1.5);
  }
}

.cursor-shape {
  width: @follower-size;
  height: @follower-size;
  margin-top: -(@follower-size / 2);
  margin-left: -(@follower-size / 2);
  background-color: #e23456;
  border-radius: 50%;
  box-shadow: 0 0 20px #ffffff61;

  // 形态切换时的丝滑过渡
  transition: all 1s cubic-bezier(0.25, 1, 0.5, 1);

  &.is-active {
    width: @triangle-size;
    height: @triangle-size;
    margin-top: -(@triangle-size / 2);
    margin-left: -(@triangle-size / 2);
    border-radius: 0; // 取消圆角

    // 使用 CSS 遮罩绘制正三角形
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);

    // 增加旋转动画
    animation: spin 2s linear infinite;
  }
}

// 旋转动画关键帧
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
