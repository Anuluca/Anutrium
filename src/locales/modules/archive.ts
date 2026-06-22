import dynamic from '../dynamic/archive'

const archive = {
  title01: {
    zhCn: '工作项目',
    en: 'MAIN PROJECTS',
  },
  title02: {
    zhCn: '个人项目',
    en: 'PERSONAL PROJECTS',
  },
  title03: {
    zhCn: '其他工作项目',
    en: 'OTHER PROJECTS',
  },
  statusKicker: 'CURRENT_STATUS / AVAILABLE',
  statusTitle: {
    zhCn: '开放新的工作机会',
    en: 'OPEN TO NEW WORK',
  },
  statusDescription: {
    zhCn: '目前可以沟通前端工程与创意开发相关工作机会，并根据周期接受自由职业委托。',
    en: 'Available to discuss frontend engineering and creative development roles, with freelance work assessed against schedule.',
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
