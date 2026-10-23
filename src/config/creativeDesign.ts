import { getFloraAssetUrl } from '@/utils/floratriumMedia'

import type { WorkCardItem } from '@/types/archive'

export interface CreativeDesign extends WorkCardItem {
  id: 'lucarioCard' | 'ironvalientCard' | 'trainerCards' | 'appleMusicCover'
  titleEn: string
  showImageInfo: boolean
  secondImage?: string
}

export const creativeDesigns: CreativeDesign[] = [
  {
    id: 'lucarioCard',
    title: '路卡利欧透卡',
    titleEn: 'Lucario Clear Card',
    company: '自制',
    time: '2026-05',
    img: getFloraAssetUrl(
      'Creative/design/lucarioCard/20260530_233444_modified_time_compressed_b2eaca3ec3e1.webp'
    ),
    showImageInfo: false,
  },
  {
    id: 'ironvalientCard',
    secondImage: '20260711_112600_modified_time_compressed_e1bec35eba6c.webp',
    title: '铁武者透卡',
    titleEn: 'Iron Valiant Clear Card',
    company: '自制',
    time: '2026-07',
    img: getFloraAssetUrl(
      'Creative/design/ironvalientCard/20260711_112731_modified_time_compressed_7f5e3a617038.webp'
    ),
    showImageInfo: false,
  },
  {
    id: 'trainerCards',
    title: '训练家卡',
    titleEn: 'Trainer Cards',
    company: '自制',
    time: 'RENEWING',
    img: getFloraAssetUrl(
      'Creative/design/trainerCards/20260530_233443_Generation IV Pokémon HeartGold Version_第四世代 心金.webp'
    ),
    showImageInfo: true,
  },
  {
    id: 'appleMusicCover',
    title: 'Apple Music播放列表封面',
    titleEn: 'Apple Music Playlist Covers',
    company: '自制',
    time: 'RENEWING',
    img: getFloraAssetUrl(
      'Creative/design/appleMusicCover/20260920_085431_Psychedelic Pop & Alternative Pop_迷幻流行:另类流行.webp'
    ),
    showImageInfo: true,
  },
]
