import dynamic from '../dynamic/island/index'

const island = {
  page: {
    ariaLabel: {
      zhCn: '个人海湾',
      en: 'Personal Harbor',
    },
    headerMeta: {
      zhCn: '随手拍下世界，也认真收藏日常。',
      en: 'Photographs from everywhere and from home.',
    },
  },
  modules: {
    photography: {
      photoWorks: {
        title: {
          zhCn: '摄影作品',
          en: 'PHOTOGRAPHY',
        },
        tagline: {
          zhCn: '到处走走，到处拍拍。',
          en: 'Wander around. Photograph everywhere.',
        },
        collectionNavigation: {
          zhCn: '摄影作品分类',
          en: 'Photography collections',
        },
        subjectNavigation: {
          zhCn: '拍摄对象分类',
          en: 'Photography subjects',
        },
        allPhotos: {
          zhCn: '全部',
          en: 'ALL',
        },
        photoUnit: {
          zhCn: '',
          en: 'PHOTOS',
        },
        photoFallback: {
          zhCn: '摄影作品',
          en: 'Photograph',
        },
        empty: {
          zhCn: '影像正在冲洗中',
          en: 'PHOTOGRAPHS ARE DEVELOPING',
        },
        img: 'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg',
        data: dynamic.photoWorks,
      },
      merchPhotos: {
        title: {
          zhCn: '周边摄影',
          en: 'MERCH PHOTOGRAPHY',
        },
        tagline: {
          zhCn: '现在不怎么买了。',
          en: 'Nothing to buy now.',
        },
        collectionLabel: {
          zhCn: 'PICS',
          en: 'PICS',
        },
        empty: {
          zhCn: '这组影像仍在准备中',
          en: 'THIS COLLECTION IS IN DEVELOPMENT',
        },
        img: 'https://assets.anuluca.com/Island/picMerch/lucarioonearm/DSC01408.jpg',
        data: dynamic.merchPhotos,
      },
      imageLog: {
        title: {
          zhCn: '图像记录',
          en: 'IMAGE LOG',
        },
        tagline: {
          zhCn: '记录留档，等人考古。',
          en: 'Archived for future excavation.',
        },
        albumLabel: {
          zhCn: 'PICS',
          en: 'PICS',
        },
        empty: {
          zhCn: '图像记录仍在整理中',
          en: 'IMAGE LOG IS IN DEVELOPMENT',
        },
        img: 'https://assets.anuluca.com/Island/picRecord/covid/IMG_20200128_185746.jpg',
        data: dynamic.imageLog,
      },
    },
    works: {
      illustration: {
        img: 'https://placehold.co/760x480/14070c/e23456?text=WIP',
        empty: {
          zhCn: '绘画作品仍在整理中',
          en: 'ILLUSTRATIONS ARE IN DEVELOPMENT',
        },
        data: dynamic.works.illustration,
      },
      trainerCard: {
        img: 'https://placehold.co/760x480/14070c/e23456?text=WIP',
        empty: {
          zhCn: '训练家卡仍在整理中',
          en: 'TRAINER CARDS ARE IN DEVELOPMENT',
        },
        data: dynamic.works.trainerCard,
      },
      experiments: dynamic.works.experiments,
      designGoods: dynamic.works.designGoods,
    },
    notes: {
      studyNotes: {
        title: {
          zhCn: '学习笔记',
          en: 'STUDY NOTES',
        },
        subtitle: {
          zhCn: '日常学习备份',
          en: 'Daily learning archive.',
        },
        counterLabel: {
          zhCn: '篇笔记',
          en: 'NOTES',
        },
        empty: {
          zhCn: '学习笔记仍在整理中',
          en: 'STUDY NOTES ARE BEING ORGANIZED',
        },
        typeMap: dynamic.notes.studyNotes.typeMap,
        data: dynamic.notes.studyNotes.list,
      },
      essaysTalks: dynamic.notes.essaysTalks,
    },
    games: {
      library: dynamic.game,
    },
  },
  latest: {
    title: {
      zhCn: '最近更新',
      en: 'LATEST',
    },
    pages: dynamic.latestPages,
  },
  player: {
    ariaLabel: {
      zhCn: '音乐播放器',
      en: 'Music player',
    },
    nowPlaying: 'NOW PLAYING',
    prevTrack: {
      zhCn: '上一首',
      en: 'Previous track',
    },
    nextTrack: {
      zhCn: '下一首',
      en: 'Next track',
    },
    pauseTrack: {
      zhCn: '暂停',
      en: 'Pause',
    },
    playTrack: {
      zhCn: '播放',
      en: 'Play',
    },
    tracks: dynamic.tracks,
  },
} as const

export default island
