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
  opacity: 0;
  z-index: -2;
  width: 100%;
  overflow: hidden;
  background: transparent;

  padding: 80px 0;
  padding-top: 0;

  pointer-events: auto;
  user-select: none;

  perspective: 1000px;
  transform: translateY(72px) scale(1.16);
  transform-origin: center bottom;
  animation: marqueeWrapperIn 1.1s cubic-bezier(0.23, 1, 0.32, 1) 0.95s forwards;

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

  &:hover .marquee-track {
    animation-play-state: paused;
  }
}

.marquee-3d-container {
  width: 100%;

  transform: rotateX(40deg);
  transform-style: preserve-3d;
}

.marquee-track {
  display: flex;
  white-space: nowrap;
  width: max-content;
  animation: marqueeScroll 25s linear infinite;

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
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-50%, 0, 0);
  }
}

@keyframes marqueeWrapperIn {
  from {
    opacity: 0;
    transform: translateY(72px) scale(1.16);
  }
  to {
    opacity: 0.2;
    transform: translateY(0) scale(1);
  }
}
</style>
