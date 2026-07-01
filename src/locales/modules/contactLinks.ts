export type ContactType = 'TWITTER' | 'WEIBO' | 'BILIBILI' | 'GITHUB' | 'MAIL'

export interface ContactLink {
  type: ContactType
  label: string
  href: string
}

const contactLinks: ContactLink[] = [
  {
    type: 'GITHUB',
    label: 'GITHUB',
    href: 'https://github.com/Anuluca',
  },
  {
    type: 'WEIBO',
    label: 'WEIBO',
    href: 'https://weibo.com/u/7738638501',
  },
  {
    type: 'TWITTER',
    label: 'TWITTER',
    href: 'https://twitter.com/TILucario',
  },
  {
    type: 'BILIBILI',
    label: 'BILIBILI',
    href: 'https://space.bilibili.com/128735968',
  },
  {
    type: 'MAIL',
    label: 'MAIL',
    href: 'mailto:tilucario@outlook.com',
  },
]

export default contactLinks
