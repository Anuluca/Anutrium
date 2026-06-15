export type ContactType = 'TWITTER' | 'WEIBO' | 'BILIBILI' | 'GITHUB' | 'MAIL'

export interface ContactLink {
  type: ContactType
  label: string
  href: string
  external: boolean
}

export const CONTACT_LINKS: ContactLink[] = [
  {
    type: 'GITHUB',
    label: 'GITHUB',
    href: 'https://github.com/Anuluca',
    external: true,
  },
  {
    type: 'WEIBO',
    label: 'WEIBO',
    href: 'https://weibo.com/u/7738638501',
    external: true,
  },
  {
    type: 'TWITTER',
    label: 'TWITTER',
    href: 'https://twitter.com/TILucario',
    external: true,
  },
  {
    type: 'BILIBILI',
    label: 'BILIBILI',
    href: 'https://space.bilibili.com/128735968',
    external: true,
  },
  {
    type: 'MAIL',
    label: 'MAIL',
    href: 'mailto:tilucario@outlook.com',
    external: false,
  },
]

export const getContactLink = (type: ContactType) =>
  CONTACT_LINKS.find((item) => item.type === type)
