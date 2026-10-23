import { type FloraMedia, getFloraAssetUrl } from '@/utils/floratriumMedia'

const friendMedia = (path: string): FloraMedia => {
  const key = `Floratrium/flora/friends/${path}`
  return {
    key,
    url: getFloraAssetUrl(key),
    type: path.endsWith('.mp4') ? 'video' : 'image',
  }
}

// 固定资源清单；页面不扫描目录或请求相册列表接口。
export const floraFriendAlbums = [
  {
    id: 'Mimi',
    name: { zhCn: '咪咪（花妈妈）', en: 'Mimi (Flora’s Mom)' },
    items: [
      'Mimi/20260627_184910_IMG_4230.webp',
      'Mimi/20260623_151030_IMG_4097.webp',
      'Mimi/20260622_125114_IMG_4052.webp',
      'Mimi/20260621_004255_IMG_4004.mp4',
      'Mimi/20260620_184055_IMG_3984.webp',
      'Mimi/20260620_144805_IMG_3972.webp',
      'Mimi/20260620_031934_IMG_3935.webp',
      'Mimi/20260615_172908_IMG_3821.webp',
      'Mimi/20260615_165523_IMG_3812.webp',
      'Mimi/20260614_005726_IMG_3770.webp',
      'Mimi/20260612_201017_IMG_3748.webp',
      'Mimi/20260612_152232_IMG_3731.webp',
      'Mimi/20260506_211522_IMG_9003.webp',
      'Mimi/20260504_115440_IMG_8946.webp',
      'Mimi/20260502_112342_DSC07707.webp',
      'Mimi/20260501_181931_B54459B04CA8046E8CE3DF3C9372F598.webp',
      'Mimi/20260430_211225_IMG_8825.webp',
      'Mimi/20260430_130557_DSC07701.webp',
      'Mimi/20260430_130337_DSC07696.webp',
      'Mimi/20260430_130335_DSC07695.webp',
      'Mimi/20260428_193722_DSC07672.webp',
      'Mimi/20260428_193450_DSC07669.webp',
      'Mimi/20260428_193420_DSC07668.webp',
      'Mimi/20260428_192457_DSC07653.webp',
      'Mimi/20260427_231543_IMG_8708.webp',
      'Mimi/20260405_213538_IMG_7814.webp',
      'Mimi/20260405_211258_IMG_7808.webp',
      'Mimi/20260315_145428_IMG_6718.webp',
      'Mimi/20260305_115117_IMG_6069.webp',
      'Mimi/20260220_142351_IMG_5356.webp',
      'Mimi/20260219_185408_IMG_5323.webp',
      'Mimi/20250524_155229_IMG_5769.webp',
      'Mimi/20250524_154823_DSC05868.webp',
    ].map(friendMedia),
  },
  {
    id: 'Siblings',
    name: { zhCn: '兄弟姐妹', en: 'Siblings' },
    items: [
      'Siblings/20260303_142538_IMG_6006.webp',
      'Siblings/20250604_205251_IMG_6316.webp',
      'Siblings/20250524_140639_IMG_5720.webp',
    ].map(friendMedia),
  },
  {
    id: 'Quanquan',
    name: { zhCn: '圈圈', en: 'Quanquan' },
    items: [
      'Quanquan/20260728_234733_EBF3B575C6882FE3C61D29B57699BAFF.webp',
      'Quanquan/20260721_203510_IMG_4884.webp',
      'Quanquan/20260721_203254_6CD72CA960C35ED9B9F31D5931DDFC55.webp',
    ].map(friendMedia),
  },
  {
    id: 'KittenDownstairs',
    name: { zhCn: '楼下宠物店的小猫', en: 'Kitten Downstairs' },
    items: [
      'KittenDownstairs/20260826_205209_IMG_6008.webp',
      'KittenDownstairs/20260808_144603_IMG_5466.webp',
    ].map(friendMedia),
  },
]

// 精选严格保留人工指定的顺序，不随分类排序反转。
export const floraFriendsFeatured = [
  'Mimi/20260428_192457_DSC07653.webp',
  'Mimi/20260430_130335_DSC07695.webp',
  'Quanquan/20260728_234733_EBF3B575C6882FE3C61D29B57699BAFF.webp',
  'Siblings/20250524_140639_IMG_5720.webp',
  'Siblings/20250604_205251_IMG_6316.webp',
  'Siblings/20260303_142538_IMG_6006.webp',
  'KittenDownstairs/20260826_205209_IMG_6008.webp',
  'Mimi/20260620_144805_IMG_3972.webp',
].map(friendMedia)
