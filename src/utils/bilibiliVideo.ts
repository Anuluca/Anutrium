export const getBilibiliEmbedUrl = (bvid: string) =>
  `https://player.bilibili.com/player.html?${new URLSearchParams({
    bvid,
    page: '1',
    high_quality: '1',
    danmaku: '0',
    autoplay: '1',
  })}`
