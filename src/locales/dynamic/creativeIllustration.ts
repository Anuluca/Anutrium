import type { GalleryMedia } from '@/components/MediaGallery/index.vue'

const illustrationRoot = 'https://assets.anuluca.com/Creative/illustration'

export const creativeIllustrationPreview: Array<
  GalleryMedia & { width: number; height: number }
> = [
  {
    filename: '20240122_215617_TWO SIDES_表里.webp',
    width: 1428,
    height: 2048,
  },
  {
    filename: '20240810_103854_METEOR MASH_彗星拳.webp',
    width: 1980,
    height: 1980,
  },
  {
    filename: '20240826_013410_No Title_无题.webp',
    width: 1280,
    height: 1811,
  },
  {
    filename: '20240827_182312_REBIRTH_诞生.webp',
    width: 2048,
    height: 1177,
  },
  {
    filename: '20250412_211141_IRON VALIENT_铁武者.webp',
    width: 2048,
    height: 1444,
  },
  {
    filename: '20251203_074156_MEGA LUCARIO Z_MEGA路卡利欧Z.webp',
    width: 1314,
    height: 1454,
  },
  {
    filename: '20261023_000708_Be Brave_勇敢.webp',
    width: 2048,
    height: 1448,
  },
].map(({ filename, width, height }) => ({
  url: `${illustrationRoot}/${encodeURIComponent(filename)}`,
  width,
  height,
}))
