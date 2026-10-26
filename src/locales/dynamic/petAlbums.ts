import type { FloraAlbumId, FloraMedia } from '@/utils/floratriumMedia'

export interface PetAlbum {
  folder: FloraAlbumId
  defaults: FloraMedia[]
}

// 默认照片固定于动态数据目录，按本地文件名顺序选取；全量资源通过列表接口更新。
export const petAlbums: Record<string, PetAlbum> = {
  huahua: {
    folder: 'flora',
    defaults: [
      {
        key: 'Floratrium/flora/20250603_180916_compressed_91e37bf1de65-MEME.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250603_180916_compressed_91e37bf1de65-MEME.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250606_135616_compressed_c31a9b826310-CLOSEUP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250606_135616_compressed_c31a9b826310-CLOSEUP.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250606_135618_compressed_3d3f7fd128f8-CLOSEUP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250606_135618_compressed_3d3f7fd128f8-CLOSEUP.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250606_142022_modified_time_compressed_36f3dc45c7e1-CLOSEUP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250606_142022_modified_time_compressed_36f3dc45c7e1-CLOSEUP.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250606_173834_modified_time_compressed_7eb94f515f45-CLOSEUP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250606_173834_modified_time_compressed_7eb94f515f45-CLOSEUP.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250607_083044_compressed_e29276e8fff9.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250607_083044_compressed_e29276e8fff9.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250607_120638_compressed_8079792e0a94.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250607_120638_compressed_8079792e0a94.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250607_120926_modified_time_compressed_a92e7fc95011.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250607_120926_modified_time_compressed_a92e7fc95011.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250607_202649_compressed_0bd9c4ecc672-SLEEP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250607_202649_compressed_0bd9c4ecc672-SLEEP.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/flora/20250607_204307_modified_time_compressed_eb54596e6b35-SLEEP.webp',
        url: 'https://assets.anuluca.com/Floratrium/flora/20250607_204307_modified_time_compressed_eb54596e6b35-SLEEP.webp',
        type: 'image',
      },
    ],
  },
  xiaohei: {
    folder: 'hei',
    defaults: [
      {
        key: 'Floratrium/hei/20240216_100511_compressed_c3d25ed3b269.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20240216_100511_compressed_c3d25ed3b269.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20260530_233444_modified_time_converted_no_savings_35cc7e7a5052.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20260530_233444_modified_time_converted_no_savings_35cc7e7a5052.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20260608_021525_modified_time_compressed_24507599c5a4.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20260608_021525_modified_time_compressed_24507599c5a4.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20260608_021529_modified_time_compressed_3f6ec5a20665.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20260608_021529_modified_time_compressed_3f6ec5a20665.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20260608_045133_modified_time_compressed_f4f9d87eb0d8.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20260608_045133_modified_time_compressed_f4f9d87eb0d8.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20260608_045137_modified_time_compressed_dd0d8642b9c6.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20260608_045137_modified_time_compressed_dd0d8642b9c6.webp',
        type: 'image',
      },
      {
        key: 'Floratrium/hei/20261005_024012_modified_time_compressed_43ae0531596f.webp',
        url: 'https://assets.anuluca.com/Floratrium/hei/20261005_024012_modified_time_compressed_43ae0531596f.webp',
        type: 'image',
      },
    ],
  },
}

// 精选照片与全量相册保持相同的倒序方向。
for (const album of Object.values(petAlbums)) album.defaults.reverse()
