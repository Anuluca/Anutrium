const common = {
  name: [
    {
      zhCn: '路卡',
      en: 'Anu',
    },
    {
      zhCn: '的自由',
      en: "luca's A",
    },
    {
      zhCn: '庭院',
      en: 'trium',
    },
  ],
  scroll: {
    zhCn: '继续探索',
    en: 'SCROLL TO EXPLORE',
  },
  notFound: {
    description: {
      zhCn: '这个页面可能还在开发中',
      en: 'THIS PAGE MAY STILL BE UNDER DEVELOPMENT',
    },
  },
  workDetailModal: {
    participation: {
      zhCn: '参与度',
      en: 'PARTICIPATION',
    },
    confidentialKicker: 'DISCLOSURE_LEVEL / RESTRICTED',
    confidential: {
      zhCn: '详情受保密协议限制',
      en: 'DETAILS LIMITED BY CONFIDENTIALITY AGREEMENT',
    },
    confidentialDescription: {
      zhCn: '页面仅展示已获准公开的项目背景与职责范围，实际业务流程、数据结构及完整界面未全部披露。',
      en: 'Only approved project context and responsibilities are shown. Full workflows, data structures, and interface coverage are intentionally withheld.',
    },
  },
} as const

export default common
