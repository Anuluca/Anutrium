import { createIslandPlaceholder } from '@/composables/useIslandHarborData'
import studyNotes from '@/locales/dynamic/island/Notes/studyNotes'

// 沿用原海湾的封面资源；不依赖尚未加载的路由语言包，也不加载完整摄影数据。
const photographyCover =
  'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg'
const placeholderCover = createIslandPlaceholder('WIP')
const studyNoteCover =
  studyNotes.list.find((note) => 'image' in note)?.image ||
  createIslandPlaceholder('STUDY NOTES')

export const templeCategories = [
  {
    id: 'art',
    roman: 'I',
    title: 'ART',
    x: -6.9,
    z: 3,
    items: [
      {
        title: '摄影',
        english: 'PHOTOGRAPHY',
        icon: 'camera',
        cover: photographyCover,
        path: '/island/photography',
      },
      {
        title: '绘画',
        english: 'ILLUSTRATION',
        icon: 'art',
        cover: placeholderCover,
        path: '/island/illustration',
      },
    ],
  },
  {
    id: 'creative',
    roman: 'II',
    title: 'CREATIVE',
    x: -6.6,
    z: -7.2,
    items: [
      {
        title: '实验室',
        english: 'LABORATORY',
        icon: 'flask',
        cover: placeholderCover,
        path: '/404',
      },
      {
        title: '设计小屋',
        english: 'DESIGN CABIN',
        icon: 'cube',
        cover: placeholderCover,
        path: '/404',
      },
    ],
  },
  {
    id: 'notes',
    roman: 'III',
    title: 'NOTES',
    x: 6.6,
    z: -7.2,
    items: [
      {
        title: '学习笔记',
        english: 'STUDY NOTES',
        icon: 'book',
        cover: studyNoteCover,
        path: '/island/study-notes',
      },
      {
        title: '杂谈',
        english: 'ESSAYS',
        icon: 'notes',
        cover: placeholderCover,
        path: '/404',
      },
    ],
  },
  {
    id: 'otaku',
    roman: 'IV',
    title: 'OTAKU',
    x: 6.9,
    z: 3,
    items: [
      {
        title: '游戏库',
        english: 'GAME LIBRARY',
        icon: 'game',
        cover: placeholderCover,
        path: '/404',
      },
      {
        title: '收藏品',
        english: 'COLLECTIBLES',
        icon: 'cube',
        cover:
          'https://assets.anuluca.com/Island/picMerch/lucarioonearm/DSC01408.jpg',
        path: '/island/merch-photography',
      },
    ],
  },
] as const

export type TempleCategoryId = (typeof templeCategories)[number]['id']
