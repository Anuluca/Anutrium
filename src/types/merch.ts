export interface MerchPhoto {
  url: string
  title?: string
}

export interface MerchCollection {
  id: string
  title: string
  subtitle: string
  cover: string
  coverOffsetX?: string | number
  coverOffsetY?: string | number
  photos: MerchPhoto[]
}

export type MerchCategoryId = 'pokemon' | 'tokusatsu' | 'other'
export type MerchGroups = Record<MerchCategoryId, MerchCollection[]>
