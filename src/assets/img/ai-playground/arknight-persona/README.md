# 复刻素材

- `reference.webp`：由用户提供的 `IMG_6717.jpg` 转码，仅用于活动卡片和礼包卡片的 CSS 取景。
- `classroom.webp`：内置 ImageGen 根据参考图重建的教室背景，移除人物及所有 UI。
- `protagonist.webp`：内置 ImageGen 根据参考图重建的人物，转换为带透明通道的 WebP。
- 生成素材为视觉重建，与原图的人物细节和教室透视存在差异。文字、按钮、资源栏及交互均由 Vue / CSS 实现。

## 最终生成提示词

工具：内置 `image_gen`，未使用 CLI 或外部 API。

1. 背景：`Create a clean background plate from the reference screenshot. Remove all foreground UI, text, icons, cards, the central character and floating petals. Reconstruct only the empty sunlit Japanese classroom. Preserve reference camera position, blue sky and tall left windows, blue-violet columns, desks, chairs, perspective floor grid, dark ceiling and bright foreground desks. Match the soft anime painted style and blue-violet grading. No characters, UI or lettering.`
2. 人物：`Extract only the central blue-haired Persona 3 Reload male protagonist. Preserve face, blue eyes, haircut, hand raised near ear, black school jacket, white shirt, ribbon tie, silver headphones, blue cable, turquoise player, belt and pants. Remove all UI, reconstruct clothing behind FRIENDS and ARCHIVES. Tight portrait canvas, same identity, pose, silhouette and lighting.`
3. 色键底图：`Replace only the gray/white checkerboard background with a perfectly solid flat chroma-key bright green #00FF00 background, for later alpha matting. Keep character pixels, pose, face, proportions, crop and placement the same. Uniform green, no checkerboard, gradients, shadows or green spill. Preserve turquoise player and blue hair.`

首次透明底输出实际为不透明棋盘格，因此追加色键底图步骤；使用浏览器 Canvas 去除绿色底、裁切透明边距并编码 WebP。两张最终生成素材合计约 321 KB。
