# 不规则扫描线遮罩 (Scanline Mask)

- 实现：`src/utils/scanlineMask.ts`。
- 输出：CSS `mask-image` 渐变字符串；可用于文字、SVG、图片，无 Vue 或 DOM 依赖。
- 每个字符单独应用遮罩，上部条纹细密，下部逐渐变厚，最终连接实心区。
- 每个字符的扫描线覆盖高度独立生成，默认在 42%–72% 之间；字形本身高度一致，底部始终留出实心部分。
- 复用 `dailyRandom.ts` 的种子算法，相同参数生成固定图案，不使用运行时随机数。

## 参数

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `seed` | `0` | 字符串或数字种子，决定条纹的错位图案 |
| `lines` | `16` | 扫描线区域的条带数量，限制为 1–128 |
| `heightRange` | `[0.42, 0.72]` | 各字符覆盖高度的变化范围，自动限制到 5%–95%，不占满全高 |
| `solidFrom` | 不设置 | 显式设置固定终点（0–1）时覆盖 `heightRange`；花花编号不设置该参数 |
| `topCoverage` | `0.3` | 顶部条带的实心占比 |
| `bottomCoverage` | `0.94` | 底部条带的实心占比 |
| `irregularity` | `0.3` | 条带高度、条纹起点的变化程度，范围 0–0.95 |

## 单个元素

```ts
import { createScanlineMask } from '@/utils/scanlineMask'

const maskImage = createScanlineMask({ seed: 'icon-heart', lines: 16 })
const style = { maskImage, WebkitMaskImage: maskImage }
```

## 逐字符文字

```vue
<script setup lang="ts">
import { createScanlineCharacters } from '@/utils/scanlineMask'

const characters = createScanlineCharacters('№ 001', {
  seed: 'number',
  heightRange: [0.42, 0.72],
})
</script>

<template>
  <span aria-label="编号 001">
    <span
      v-for="(item, index) in characters"
      :key="index"
      :style="{
        display: 'inline-block',
        whiteSpace: 'pre',
        maskImage: item.maskImage,
        WebkitMaskImage: item.maskImage,
      }"
      aria-hidden="true"
    >{{ item.character }}</span>
  </span>
</template>
```

- 字符内容与位置共同参与种子，两个相同的 `0` 也会有不同图案。
- 返回的 `scanHeight` 为该字符扫描线终点；高度使用独立种子流，不随条纹数量或粗细参数变化。
- 文本按 Unicode 码点拆分，保留空格；组合字符及由多个码点组成的 emoji 如需作为整体，应由调用方先按字素分组，再分别调用 `createScanlineMask`。
- 条带坐标使用百分比，改变字号时效果等比例缩放；超出范围和非有限数值会被归一化处理。
- 遮罩只影响绘制，不调整元素的尺寸、位置或透明度。
