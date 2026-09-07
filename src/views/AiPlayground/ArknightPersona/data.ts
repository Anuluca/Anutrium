export const utilities = [
  { id: 'settings', label: '设置', icon: 'settings' },
  { id: 'notice', label: '公告', icon: 'warning' },
  { id: 'mail', label: '邮件', icon: 'mail' },
  { id: 'calendar', label: '签到', icon: 'calendar' },
]

export const mainMenus = [
  { id: 'squads', en: 'SQUADS', label: '编队', delay: '460ms' },
  { id: 'operator', en: 'OPERATOR', label: '干员', delay: '510ms' },
  { id: 'store', en: 'STORE', label: '采购中心', delay: '590ms' },
  { id: 'mission', en: 'MISSION', label: '任务', delay: '700ms' },
  { id: 'base', en: 'BASE', label: '基建', delay: '750ms' },
]

export const stages = [
  { code: '17-1', title: '大地的呼吸', cost: 18 },
  { code: '17-2', title: '遥远的回声', cost: 21 },
  { code: '1-7', title: '暴君', cost: 6 },
]

export const operators = [
  { name: '结城理', role: '近卫', mark: 'ⅩⅢ' },
  { name: '阿米娅', role: '术师', mark: '♜' },
  { name: '能天使', role: '狙击', mark: '✧' },
  { name: '凯尔希', role: '医疗', mark: '✚' },
]

interface Panel {
  en: string
  title: string
  description: string
  detailLabel?: string
  detail?: string
  note?: string
}

export const panels: Record<string, Panel> = {
  terminal: {
    en: 'TERMINAL',
    title: '作战终端',
    description: '选择行动目标，部署你的下一场作战。',
  },
  squads: {
    en: 'SQUADS',
    title: '编队',
    description: '切换编队，点击干员卡片加入或移出当前队伍。',
  },
  operator: {
    en: 'OPERATOR',
    title: '干员',
    description: '罗德岛干员名册。选择干员，调整当前作战阵容。',
  },
  store: {
    en: 'STORE',
    title: '采购中心',
    description: '使用演示龙门币兑换物资，物品将同步进入仓库。',
  },
  pack: {
    en: 'PACK',
    title: '限时礼包',
    description: '原图礼包展示价 ¥168。本页提供物资兑换演示。',
  },
  recruit: {
    en: 'RECRUIT',
    title: '公开招募',
    description: '选择至多三个职业标签，并设置招募时限。',
  },
  headhunt: {
    en: 'HEADHUNT',
    title: '干员寻访',
    description: '特别寻访开放中。此处使用固定结果演示寻访流程。',
  },
  mission: {
    en: 'MISSION',
    title: '任务',
    description: '今日已完成的任务奖励等待领取。',
  },
  base: {
    en: 'BASE',
    title: '基建',
    description: '各设施运转正常，收取生产收益后继续值班。',
  },
  depot: {
    en: 'DEPOT',
    title: '仓库',
    description: '管理养成物资与招募凭证。采购和寻访结果会同步到这里。',
  },
  settings: {
    en: 'SETTINGS',
    title: '设置',
    description: '调整这个蓝色时刻的动态表现。系统减少动态效果偏好优先。',
  },
  sanity: {
    en: 'SANITY',
    title: '恢复理智',
    description: '使用应急理智合剂恢复 60 点理智，上限 210。',
  },
  calendar: {
    en: 'CHECK IN',
    title: '此夜同行',
    description: '七日签到活动。领取今天的补给，为下一场行动做准备。',
  },
  mail: {
    en: 'MAIL',
    title: '邮件',
    description: '罗德岛后勤部：博士，今日补给已送达，请查收。',
  },
  notice: {
    en: 'NOTICE',
    title: '公告',
    description: '特别联动界面展示。',
    detailLabel: '联动记录 / 01',
    detail: '明日方舟 × 女神异闻录3 Reload',
    note: '本页为参考图的前端交互复刻，不连接真实游戏服务。',
  },
  profile: {
    en: 'DOCTOR',
    title: '博士档案',
    description: '罗德岛人事档案 / 最高权限',
    detailLabel: 'LEVEL 120',
    detail: '羊角',
    note: 'ID: 744586145 · 所属：罗德岛',
  },
  friends: {
    en: 'FRIENDS',
    title: '好友',
    description: '好友终端已连接。',
    detailLabel: 'SUPPORT NETWORK',
    detail: '阿米娅 · 在线',
    note: '支援干员：术师 / LV 90 · 今日访问 6 次',
  },
  archives: {
    en: 'ARCHIVES',
    title: '档案',
    description: '特别课外活动部 / 人物记录',
    detailLabel: 'PERSONA 3 RELOAD',
    detail: '结城理',
    note: '月光馆学园二年级转校生。寡言的少年，与同伴一起面对未知的影时间。',
  },
  event: {
    en: 'SUR L’EAU',
    title: '月行水上',
    description: '限时活动开放中，距离结束还有 8 天。',
    detailLabel: 'SIDE STORY',
    detail: '月行水上',
    note: '前往终端，选择本次演示行动。',
  },
  exhibition: {
    en: 'EXHIBITION',
    title: '奇象巡展',
    description: 'INTERACTIVE EXHIBITION / 特别展览',
    detailLabel: 'SPECIAL EVENT',
    detail: '奇象巡展',
    note: '一场有关相遇与未知的特别展览。',
  },
  lmd: {
    en: 'LUNG MEN DOLLAR',
    title: '龙门币',
    description: '用于采购物资与干员养成。',
    detailLabel: '获取方式',
    detail: '任务 / 基建',
    note: '在任务页面领取奖励，或前往基建收取收益。',
  },
  orundum: {
    en: 'ORUNDUM',
    title: '合成玉',
    description: '用于寻访新干员。',
    detailLabel: 'HEADHUNT',
    detail: '600 / 次',
    note: '可在干员寻访中体验一次演示招募。',
  },
  prime: {
    en: 'ORIGINITE PRIME',
    title: '至纯源石',
    description: '稀有资源。当前界面展示数量为 1,267。',
    detailLabel: 'RESOURCE',
    detail: '1,267',
    note: '本演示不提供充值或真实购买。',
  },
}
