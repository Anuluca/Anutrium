<template>
  <div class="svg-container" :class="{ 'is-looping': loop }">
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
        :class="['main-color', { 'draw-animation': active }, 'delay-1']"
        stroke-width="14"
        :pathLength="loop ? 1 : undefined"
        stroke-linejoin="miter"
      />
      <polyline
        points="68,60 133,60"
        fill="none"
        :class="['main-color delay-1-6', { 'draw-animation': active }]"
        stroke-width="14"
        :pathLength="loop ? 1 : undefined"
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
        :class="['main-color', { 'draw-animation': active }, 'delay-1']"
        stroke-width="14"
        :pathLength="loop ? 1 : undefined"
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

  active: {
    type: Boolean,
    default: true,
  },
  loop: {
    type: Boolean,
    default: false,
  },
})

const maskId = computed(() => `mask-${props.id}`)
</script>

<style scoped>
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

.is-looping .draw-animation {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation-duration: 1.5s;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
}

.is-looping .delay-1 {
  animation-delay: 0.2s;
}

.is-looping .delay-1-6 {
  animation-delay: 0.4s;
}

@media (prefers-reduced-motion: reduce) {
  .is-looping .draw-animation {
    animation: none;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
  }
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

.main-color {
  stroke: currentColor;
}

.bg-shape {
  fill: currentColor;
}
</style>
