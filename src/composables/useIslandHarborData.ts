import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

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

export interface LatestPage {
  title: string
  module: string
  path: string
  img: string
}

interface PhotographyGroupSummary {
  photos?: unknown[]
  photoGroups?: Array<{ photos: unknown[] }>
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
  const router = useRouter()

  const photographyPhotoCount = computed(() => {
    const groups = tm(
      'island.modules.photography.photoWorks.data.groups'
    ) as PhotographyGroupSummary[]

    return groups.reduce(
      (total, group) =>
        total +
        (group.photos?.length ||
          group.photoGroups?.reduce(
            (groupTotal, photoGroup) => groupTotal + photoGroup.photos.length,
            0
          ) ||
          0),
      0
    )
  })
  const merchCollectionCount = computed(
    () =>
      Object.values(
        tm('island.modules.photography.merchPhotos.data') as Record<
          string,
          unknown[]
        >
      ).flat().length
  )
  const illustrationItemCount = computed(
    () =>
      (tm('island.modules.works.illustration.data.photos') as unknown[]).length
  )
  const studyNoteList = computed(
    () =>
      tm('island.modules.notes.studyNotes.data') as Array<{
        image?: string
      }>
  )
  const studyNoteCover = computed(
    () =>
      studyNoteList.value.find((note) => note.image)?.image ||
      createIslandPlaceholder('STUDY NOTES')
  )
  const developingPlaceholder = createIslandPlaceholder('WIP')

  const harborSections: HarborSection[] = [
    {
      id: 'works',
      title: '创作',
      subtitle: 'WORKS',
      progress: '78%',
      items: [
        {
          title: '摄影作品',
          subtitle: 'PHOTO WORKS',
          get count() {
            return `${photographyPhotoCount.value} PICS`
          },
          get img() {
            return t('island.modules.photography.photoWorks.img')
          },
          path: '/island/photography',
        },
        {
          title: '绘画',
          subtitle: 'ILLUSTRATION',
          get count() {
            return `${illustrationItemCount.value} ITEMS`
          },
          get img() {
            return t('island.modules.works.illustration.img')
          },
          path: '/island/illustration',
        },
        {
          title: '实验',
          subtitle: 'EXPERIMENTS',
          count: '0 ITEMS',
          img: developingPlaceholder,
        },
        {
          title: '设计小物',
          subtitle: 'DESIGN GOODS',
          count: '0 ITEMS',
          img: developingPlaceholder,
        },
      ],
    },
    {
      id: 'notes',
      title: '札记',
      subtitle: 'NOTES',
      progress: '46%',
      items: [
        {
          title: '学习笔记',
          subtitle: 'STUDY NOTES',
          get count() {
            return `${studyNoteList.value.length} NOTES`
          },
          get img() {
            return studyNoteCover.value
          },
          path: '/island/study-notes',
        },
        {
          title: '文章杂谈',
          subtitle: 'ESSAYS & TALKS',
          count: '0 ARTICLES',
          img: developingPlaceholder,
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
            return `${merchCollectionCount.value} COLLECTIONS`
          },
          get img() {
            return t('island.modules.photography.merchPhotos.img')
          },
          path: '/island/merch-photography',
        },
      ],
    },
  ]

  const latestPages = computed<LatestPage[]>(() =>
    (tm('island.latest.pages') as LatestPage[]).slice(0, 13)
  )

  const openHarborItem = (item: HarborItem) => {
    router.push(item.path || '/404')
  }

  return {
    harborSections,
    latestPages,
    openHarborItem,
  }
}
