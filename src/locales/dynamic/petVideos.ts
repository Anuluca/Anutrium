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

export const petVideos: Record<string, PetVideoCollection> = {
  huahua: {
    featured: ['BV19bt3zgEbF'],
    videos: [
      {
        bvid: 'BV19bt3zgEbF',
        title: { zhCn: '花花视频档案 #1', en: 'Flora Video Archive #1' },
        cover:
          'https://assets.anuluca.com/other/videoCover/dc149db5fd2cfd0443b1c637b1bdcd41d637f7b1.jpg@672w_378h_1c.avif',
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
        cover:
          'https://assets.anuluca.com/other/videoCover/d450c430b6b1850d23d08c1a1f731a8b3cbdb3dc.jpg@672w_378h_1c_!web-search-common-cover.webp',
        url: 'https://www.bilibili.com/video/BV1pMRKYPENz/',
      },
    ],
  },
}
