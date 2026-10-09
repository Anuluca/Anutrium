export const templeCategories = [
  {
    id: 'art',
    roman: 'I',
    title: 'ART',
    x: -6.2,
    z: 3,
    items: [
      {
        title: '摄影',
        english: 'PHOTOGRAPHY',
        icon: 'camera',
        path: '/island/photography',
      },
      {
        title: '绘画',
        english: 'ILLUSTRATION',
        icon: 'art',
        path: '/island/illustration',
      },
    ],
  },
  {
    id: 'creative',
    roman: 'II',
    title: 'CREATIVE',
    x: -4.5,
    z: -2.6,
    items: [
      { title: '实验室', english: 'LABORATORY', icon: 'flask', path: '/404' },
      {
        title: '设计小屋',
        english: 'DESIGN CABIN',
        icon: 'cube',
        path: '/404',
      },
    ],
  },
  {
    id: 'notes',
    roman: 'III',
    title: 'NOTES',
    x: 4.5,
    z: -2.6,
    items: [
      {
        title: '学习笔记',
        english: 'STUDY NOTES',
        icon: 'book',
        path: '/island/study-notes',
      },
      { title: '杂谈', english: 'ESSAYS', icon: 'notes', path: '/404' },
    ],
  },
  {
    id: 'otaku',
    roman: 'IV',
    title: 'OTAKU',
    x: 6.2,
    z: 3,
    items: [
      { title: '游戏库', english: 'GAME LIBRARY', icon: 'game', path: '/404' },
      {
        title: '收藏品',
        english: 'COLLECTIBLES',
        icon: 'cube',
        path: '/island/merch-photography',
      },
    ],
  },
] as const

export type TempleCategoryId = (typeof templeCategories)[number]['id']
