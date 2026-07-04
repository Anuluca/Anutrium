import dynamic from '../dynamic/flanerie'

const flanerie = {
  metaItem: {
    zhCn: '记录这些总会忘记的事情。',
    en: 'Someday, I may forget all this, or leave it behind.That’s why I keep recording.',
  },
  videoLabel: {
    zhCn: '视频记录',
    en: 'VIDEO LOG',
  },
  photoLabel: {
    zhCn: '图片记录',
    en: 'PHOTO LOG',
  },
  deviceLabel: {
    zhCn: '摄影设备',
    en: 'CAPTURED WITH',
  },
  countLabel: {
    zhCn: '数量',
    en: 'COUNT',
  },
  previousPage: {
    zhCn: '上一页',
    en: 'PREV',
  },
  nextPage: {
    zhCn: '下一页',
    en: 'NEXT',
  },
  pageLabel: {
    zhCn: '页',
    en: 'PAGE',
  },
  dynamic,
} as const

export default flanerie
