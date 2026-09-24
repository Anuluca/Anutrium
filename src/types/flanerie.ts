type JourneyCategory = 'visited' | 'resident' | 'activity'

interface JourneyLocation {
  id: string
  name: string
  lat: number
  lng: number
}

export interface JourneyPhoto {
  title?: string
  location?: string
  device?: string
  time?: string
  url: string
}

export interface JourneyVideo {
  title: string
  cover: string
  bvid?: string
  url: string
  orientation?: 'landscape' | 'portrait'
}

export interface JourneyItem {
  id: string
  category?: JourneyCategory
  title: string
  mapLabel?: string
  date: string
  tagline: string
  img: string
  img2?: string
  location: JourneyLocation
  photos?: JourneyPhoto[]
  videos?: JourneyVideo[]
}

export interface JourneyGroup {
  id: JourneyCategory
  title: string
  titleEn?: string
}
