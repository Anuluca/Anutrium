<template>
  <svg class="note-cover-dither-filter" aria-hidden="true" width="0" height="0">
    <defs>
      <filter
        :id="props.id"
        x="0"
        y="0"
        width="100%"
        height="100%"
        color-interpolation-filters="sRGB"
      >
        <feImage
          :href="thresholdTile"
          x="0"
          y="0"
          width="16"
          height="16"
          result="threshold"
        />
        <feTile in="threshold" result="thresholds" />
        <feComposite
          in="SourceGraphic"
          in2="thresholds"
          operator="arithmetic"
          k1="0"
          k2="0.75"
          k3="-0.25"
          k4="0.5"
        />
        <!-- 合成保持 alpha=1，再移回量化区间，避免反预乘抬亮中间色。
             0.001 偏置避免最高色阶在 8 位舍入后落回下一级。 -->
        <feColorMatrix
          type="matrix"
          values="1 0 0 0 -0.249
                  0 1 0 0 -0.249
                  0 0 1 0 -0.249
                  0 0 0 0 1"
        />
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.333333 0.666667 1" />
          <feFuncG type="discrete" tableValues="0 0.333333 0.666667 1" />
          <feFuncB type="discrete" tableValues="0 0.333333 0.666667 1" />
          <feFuncA type="linear" slope="0" intercept="1" />
        </feComponentTransfer>
        <feComposite in2="SourceAlpha" operator="in" result="dithered" />
        <feComposite
          in="dithered"
          in2="SourceGraphic"
          operator="arithmetic"
          k1="0"
          :k2="props.strength"
          :k3="1 - props.strength"
          k4="0"
        />
      </filter>
    </defs>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ id?: string; strength?: number }>(), {
  id: 'note-cover-dither-veil',
  strength: 1,
})

// Bayer 阈值取自 Vue Bits Dither Veil，RGB 分通道四级量化，保留原图色彩。
// SVG 直接处理已显示的图片，无需读取跨域像素，也不创建持续运行的渲染循环。
// 来源与许可：docs/references/dither-veil/LICENSE.md。
const cells = Array.from({ length: 64 }, (_, index) => {
  const x = index % 8
  const y = Math.floor(index / 8)
  const xor = x ^ y
  const rank =
    ((xor & 1) << 5) |
    ((y & 1) << 4) |
    ((xor & 2) << 2) |
    ((y & 2) << 1) |
    ((xor & 4) >> 1) |
    ((y & 4) >> 2)
  const threshold = Math.round(((rank + 0.5) / 64) * 255)
  return `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${threshold},${threshold},${threshold})"/>`
}).join('')
const thresholdTile = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${cells}</svg>`
)}`
</script>

<style scoped>
.note-cover-dither-filter {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
}
</style>
