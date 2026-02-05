<template>
  <div class="svg-container">
    <svg
      viewBox="0 0 200 250"
      xmlns="http://www.w3.org/2000/svg"
      class="animated-icon"
    >
      <defs>
        <mask :id="maskId">
          <rect width="100%" height="100%" fill="white" />
          <polyline
            points="53,158 53,94"
            fill="none"
            stroke="black"
            stroke-width="26"
          />
          <path d="M65,93.8 L136,132 L135.5,158 L65,120 Z" fill="black" />
          <polyline
            points="148,158 148,94"
            fill="none"
            stroke="black"
            stroke-width="26"
          />
        </mask>
      </defs>

      <polyline
        points="68,78 68,55 100,3 133,55 133,78"
        fill="none"
        :class="['main-color', { 'draw-animation': active },'delay-1']"
        stroke-width="14"
        stroke-linejoin="miter"
      />
      <polyline
        points="68,60 133,60"
        fill="none"
        :class="['main-color delay-1-6', { 'draw-animation': active }]"
        stroke-width="14"
      />

      <rect
        x="28"
        y="86"
        width="145"
        height="79"
        class="bg-shape"
        :mask="`url(#${maskId})`"
      />

      <polyline
        points="133,174 133,198 100,248 68,198 68,174"
        fill="none"
        :class="['main-color', { 'draw-animation': active },'delay-1']"
        stroke-width="14"
        stroke-linejoin="miter"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: {
    type: String,
    default: 'n-mask',
  },
  // 新增控制开关
  active: {
    type: Boolean,
    default: true,
  },
})

const maskId = computed(() => `mask-${props.id}`)
</script>

<style scoped>
/* 样式部分完全保持原样 */
.svg-container {
  display: inline-block;
  line-height: 0;
}

.animated-icon {
  width: auto;
  height: 100%;
}

.draw-animation {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: draw 3s ease-out forwards;
}

.draw-animation2 {
  animation: draw2 0.3s ease-out forwards;
  clip-path: inset(0 100% 0 0);
}

.delay-1-6 {
  animation-delay: 0.8s;
}
.delay-1 {
  animation-delay: 0.4s;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes draw2 {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

.main-color {
  stroke: currentColor;
}

.bg-shape {
  fill: currentColor;
}
</style>
