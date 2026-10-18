import { petAlbums } from './petAlbums'

interface PetVideo {
  bvid: string
  title: { zhCn: string; en: string }
  cover: string
  url: string
}
interface PetVideoCollection {
  featured: string[]
  videos: PetVideo[]
}

// cover 暂用对应宠物照片，收到正式视频封面后仅替换此字段。
export const petVideos: Record<string, PetVideoCollection> = {
  huahua: {
    featured: ['BV19bt3zgEbF'],
    videos: [
      {
        bvid: 'BV19bt3zgEbF',
        title: { zhCn: '花花视频档案 #1', en: 'Flora Video Archive #1' },
        cover: petAlbums.huahua.defaults[0].url,
        url: 'https://www.bilibili.com/video/BV19bt3zgEbF',
      },
    ],
  },
  xiaohei: {
    featured: ['BV1pMRKYPENz'],
    videos: [
      {
        bvid: 'BV1pMRKYPENz',
        title: {
          zhCn: '「记录」外婆家的小黑',
          en: '「Record」Hei at Grandma’s',
        },
        cover: petAlbums.xiaohei.defaults[0].url,
        url: 'https://www.bilibili.com/video/BV1pMRKYPENz/',
      },
    ],
  },
}
