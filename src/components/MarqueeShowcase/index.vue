<template>
  <div class="marquee-wrapper">
    <div class="marquee-3d-container">
      <div class="marquee-track">
        <div v-for="group in 2" :key="group" class="marquee-content">
          <span class="text-solid">WEB-ENGEERING</span>
          <span class="text-stroke">VLOG</span>
          <span class="text-solid">GAME</span>
          <span class="text-stroke">POKEMON</span>
          <span class="text-solid">FRONTEND</span>
          <span class="text-stroke">LIVE</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.marquee-wrapper {
  opacity: 0.2;
  z-index: -2;
  width: 100%;
  overflow: hidden;
  background: transparent;
  // 增加上下 padding，防止 3D 旋转后文字边缘被裁切
  padding: 80px 0;
  padding-top: 0;

  // 开启鼠标交互，以响应 hover 事件
  pointer-events: auto;
  user-select: none;

  // 3D 景深魔法：数值越小，透视畸变越强烈
  perspective: 1000px;

  // 边缘羽化遮罩：两侧半透明渐变，结合 3D 景深产生“弯曲进入迷雾”的错觉
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );
  mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );

  // 【需求实现】鼠标悬浮时，内部轨道动画暂停
  &:hover .marquee-track {
    animation-play-state: paused;
  }
}

.marquee-3d-container {
  width: 100%;
  // 核心透视参数：
  // rotateX: 让整排文字往后仰
  // rotateY/Z: 增加不对称的侧向空间错落感
  transform: rotateX(40deg);
  transform-style: preserve-3d;
}

.marquee-track {
  display: flex;
  white-space: nowrap;
  width: max-content;
  animation: marqueeScroll 25s linear infinite;
  // 确保动画层也保留 3D 渲染
  transform-style: preserve-3d;
}

.marquee-content {
  display: flex;
  align-items: center;
}

.marquee-content span {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 80px;
  text-transform: uppercase;
  margin-right: 60px;
  line-height: 1;

  // 增加一点极轻微的文字投影，让 3D 空间感更加立体脱俗
  text-shadow: 0 15px 25px rgba(0, 0, 0, 0.1);
}

.text-solid {
  color: #e23456;
}

.text-stroke {
  color: transparent;
  -webkit-text-stroke: 2px var(--text-color);
}

@keyframes marqueeScroll {
  0% {
    // 使用 translate3d 开启 GPU 硬件加速，保证滚动丝滑
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-50%, 0, 0);
  }
}
</style>
