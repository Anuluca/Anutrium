import dynamic from '../dynamic/archive'

const archive = {
  title01: {
    zhCn: '工作项目',
    en: 'MAIN',
  },
  title02: {
    zhCn: '个人项目',
    en: 'PERSONAL',
  },
  title03: {
    zhCn: '其他工作项目',
    en: 'OTHER',
  },
  statusTitle: {
    zhCn: '开放新的工作机会',
    en: 'OPEN TO NEW WORK',
  },
  statusDescription: {
    zhCn: '开放前端工程、创意开发与自由职业合作。',
    en: 'Open to frontend, creative-development, and freelance work.',
  },
  statusWorkLabel: {
    zhCn: '个人状态',
    en: 'OPENINGS',
  },
  statusWorkValue: {
    zhCn: '空闲_调整中',
    en: 'AVAILABLE',
  },
  statusFreelanceLabel: {
    zhCn: '自由职业',
    en: 'FREELANCE',
  },
  statusFreelanceValue: {
    zhCn: '视周期安排',
    en: 'SCHEDULE BASED',
  },
  statusLocationLabel: {
    zhCn: '工作方式',
    en: 'WORK MODE',
  },
  statusLocationValue: {
    zhCn: '中国 / 入职',
    en: 'CHINA / ON-SITE',
  },
  statusCta: {
    zhCn: '发送工作信息',
    en: 'SEND WORK BRIEF',
  },
  statusResumeCta: {
    zhCn: '下载简历',
    en: 'DOWNLOAD CV',
  },
  dynamic,
} as const

export default archive
