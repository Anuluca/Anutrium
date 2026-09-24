interface ArchiveWorkLink {
  label: string
  url: string
  icon?: string
}

export interface ArchiveWork {
  id: string
  title: string
  company: string
  tags?: string[]
  img?: string
  logo?: string
  time?: string
  description?: string
  details?: string[]
  images?: string[]
  imageDescriptions?: string[]
  link?: string
  links?: ArchiveWorkLink[]
  participation?: number
  confidential?: boolean
  crystal?: {
    image?: string
    links?: Array<{
      href: string
      label: string
      target?: '_blank' | '_self'
    }>
    text?: string
  }
}

export type WorkCardItem = Pick<
  ArchiveWork,
  'id' | 'title' | 'img' | 'company' | 'time' | 'tags'
>
