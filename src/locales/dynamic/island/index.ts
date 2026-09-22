import game from './Game/Game'
import essaysTalks from './Notes/essaysTalks'
import studyNotes from './Notes/studyNotes'
import imageLog from './Photography/imageLog'
import merchPhotos from './Photography/merchPhotos'
import photoWorks from './Photography/photoWorks'
import designGoods from './Works/designGoods'
import experiments from './Works/experiments'
import illustration from './Works/illustration'
import trainerCard from './Works/trainerCard'

const latestPages = {
  zhCn: [
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
    {
      title: 'TEMP',
      module: 'TEMP / TEMP',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=TEMP',
    },
  ],
  en: [
    {
      title: 'State Grid UAV System',
      module: 'ARCHIVE / MAIN',
      path: '/archive?project=W001',
      img: 'https://placehold.co/260x180/14070c/e23456?text=STATE%20GRID',
    },
    {
      title: 'Substation Digital Cockpit',
      module: 'ARCHIVE / MAIN',
      path: '/archive?project=W002',
      img: 'https://placehold.co/260x180/14070c/e23456?text=COCKPIT',
    },
    {
      title: 'Digital Synergy Supervision',
      module: 'ARCHIVE / MAIN',
      path: '/archive?project=W003',
      img: 'https://placehold.co/260x180/14070c/e23456?text=SUPERVISION',
    },
    {
      title: 'Color Extractor',
      module: 'CRAFT / TOOL',
      path: '/colorPalette',
      img: 'https://placehold.co/260x180/14070c/e23456?text=COLOR',
    },
    {
      title: 'Ease Studio',
      module: 'CRAFT / TOOL',
      path: '/easeStudio',
      img: 'https://placehold.co/260x180/14070c/e23456?text=EASE',
    },
    {
      title: 'Bounce Dynamics',
      module: 'CRAFT / TOOL',
      path: '/bounceDynamics',
      img: 'https://placehold.co/260x180/14070c/e23456?text=BOUNCE',
    },
    {
      title: 'Base64 Codec',
      module: 'CRAFT / TOOL',
      path: '/base64Codec',
      img: 'https://placehold.co/260x180/14070c/e23456?text=BASE64',
    },
    {
      title: 'Image to Base64',
      module: 'CRAFT / TOOL',
      path: '/imageBase64',
      img: 'https://placehold.co/260x180/14070c/e23456?text=IMAGE',
    },
    {
      title: 'HTML Entities',
      module: 'CRAFT / TOOL',
      path: '/htmlEntities',
      img: 'https://placehold.co/260x180/14070c/e23456?text=HTML',
    },
    {
      title: 'Metronome',
      module: 'CRAFT / TOOL',
      path: '/metronome',
      img: 'https://placehold.co/260x180/14070c/e23456?text=METRONOME',
    },
    {
      title: 'Jiangxi / Jiujiang',
      module: 'FLÂNERIE / JOURNEY',
      path: '/flanerie/jiujiang',
      img: 'https://placehold.co/260x180/14070c/e23456?text=JIUJIANG',
    },
    {
      title: 'Jiangsu / Nanjing',
      module: 'FLÂNERIE / JOURNEY',
      path: '/flanerie/nanjing',
      img: 'https://placehold.co/260x180/14070c/e23456?text=NANJING',
    },
    {
      title: 'Singapore',
      module: 'FLÂNERIE / JOURNEY',
      path: '/flanerie/singapore',
      img: 'https://placehold.co/260x180/14070c/e23456?text=SINGAPORE',
    },
    {
      title: 'Pingtan Island',
      module: 'FLÂNERIE / JOURNEY',
      path: '/flanerie/pingtandao',
      img: 'https://placehold.co/260x180/14070c/e23456?text=PINGTAN',
    },
    {
      title: 'Friend Links',
      module: 'ABOUT / NETWORK',
      path: '/about',
      img: 'https://placehold.co/260x180/14070c/e23456?text=ABOUT',
    },
    {
      title: 'Game Library',
      module: 'ISLAND / GAMES',
      path: '/test',
      img: 'https://placehold.co/260x180/14070c/e23456?text=GAMES',
    },
    {
      title: 'Study Notes',
      module: 'ISLAND / NOTES',
      path: '/island/study-notes',
      img: 'https://placehold.co/260x180/14070c/e23456?text=NOTES',
    },
    {
      title: 'Daily Shots',
      module: 'ISLAND / PHOTOGRAPHY',
      path: '/island/photography',
      img: 'https://placehold.co/260x180/14070c/e23456?text=PHOTO',
    },
  ],
} as const

const tracks = [
  {
    title: '幽灵东京',
    artist: 'AYASE · PREVIEW PROVIDED COURTESY OF ITUNES',
    cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
    storeUrl:
      'https://music.apple.com/cn/album/%E5%B9%BD%E9%9C%8A%E6%9D%B1%E4%BA%AC/1487353903?i=1487353913',
  },
  {
    title: '贝加尔湖畔',
    artist: '李健 · PREVIEW PROVIDED COURTESY OF ITUNES',
    cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
    storeUrl:
      'https://music.apple.com/cn/album/%E8%B4%9D%E5%8A%A0%E5%B0%94%E6%B9%96%E7%95%94/905188240?i=905188255',
  },
  {
    title: 'Veridis Quo',
    artist: 'DAFT PUNK · PREVIEW PROVIDED COURTESY OF ITUNES',
    cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
    storeUrl:
      'https://music.apple.com/us/album/veridis-quo/697194953?i=697196125',
  },
] as const

const islandDynamic = {
  photoWorks,
  merchPhotos,
  imageLog,
  works: {
    illustration,
    trainerCard,
    experiments,
    designGoods,
  },
  notes: {
    studyNotes,
    essaysTalks,
  },
  game,
  latestPages,
  tracks,
} as const

export default islandDynamic
