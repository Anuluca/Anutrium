import type { GalleryMedia } from '@/components/MediaGallery/index.vue'

const photographyRoot = 'https://assets.anuluca.com/Creative/Photography'

// 记录原图尺寸，滚动队列在缩略图加载前即可按等高、原始比例稳定排版。
export const creativePhotographyPreview: Array<
  GalleryMedia & { width: number; height: number }
> = [
  {
    filename: '20260530_233444_modified_time_compressed_2cadb319aa4e.webp',
    width: 2048,
    height: 1365,
  },
  {
    filename: '20260530_233444_modified_time_compressed_549d220c64c4.webp',
    width: 1365,
    height: 2048,
  },
  {
    filename: '20260709_003441_modified_time_compressed_945b813d79d1.webp',
    width: 1365,
    height: 2048,
  },
  {
    filename: '20260530_233444_modified_time_compressed_43154bd467d4.webp',
    width: 1365,
    height: 2048,
  },
  {
    filename: '20260530_233444_modified_time_compressed_6f3a9a47f580.webp',
    width: 2048,
    height: 1365,
  },
  {
    filename: '20260530_233444_modified_time_compressed_e5f052cf8797.webp',
    width: 2048,
    height: 1153,
  },
].map(({ filename, width, height }) => ({
  url: `${photographyRoot}/${filename}`,
  width,
  height,
}))
