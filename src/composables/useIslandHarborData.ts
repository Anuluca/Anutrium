import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useNotes } from '@/composables/useNotes'

export interface HarborItem {
  title: string
  subtitle: string
  count: string
  img: string
  path?: string
}

interface HarborSection {
  id: string
  title: string
  subtitle: string
  progress: string
  items: HarborItem[]
}

export const createIslandPlaceholder = (
  label: string,
  width = 760,
  height = 480
) =>
  `https://placehold.co/${width}x${height}/14070c/e23456?text=${encodeURIComponent(
    label
  )}`

export const splitHarborItemCount = (count: string) => {
  const [, value = count, unit = ''] = count.match(/^(\S+)\s*(.*)$/) || []
  return { value, unit }
}

export const useIslandHarborData = () => {
  const { t, tm } = useI18n()

  const merchCollectionCount = computed(
    () =>
      Object.values(
        tm('island.modules.photography.merch.data') as Record<string, unknown[]>
      ).flat().length
  )
  const { notes: studyNoteList } = useNotes()
  const developingPlaceholder = createIslandPlaceholder('WIP')

  const harborSections: HarborSection[] = [
    {
      id: 'ideas',
      title: '想法',
      subtitle: 'IDEAS',
      progress: '0%',
      items: [
        {
          title: '实验室',
          subtitle: 'LABORATORY',
          count: '1 ITEM',
          img: developingPlaceholder,
          path: '/atrium/laboratory',
        },
        {
          title: '笔记',
          subtitle: 'NOTES',
          get count() {
            return `${studyNoteList.value.length} NOTES`
          },
          img: 'https://assets.anuluca.com/Island/notes/pokemonCorocoro/XY/IMG_2133.jpg?image=card-thumb',
          path: '/atrium/notes',
        },
      ],
    },
    {
      id: 'interests',
      title: '宅',
      subtitle: 'OTAKU',
      progress: '72%',
      items: [
        {
          title: '游戏库',
          subtitle: 'GAME LIBRARY',
          count: '0 GAMES',
          img: developingPlaceholder,
        },
        {
          title: '收藏品',
          subtitle: 'COLLECTIBLES',
          get count() {
            return `${merchCollectionCount.value} ITEMS`
          },
          get img() {
            return t('island.modules.photography.merch.img')
          },
          path: '/atrium/collections',
        },
      ],
    },
  ]

  return {
    harborSections,
  }
}
