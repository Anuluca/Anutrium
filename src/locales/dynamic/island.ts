const OUTSIDE_PHOTO_PREFIX = 'https://assets.anuluca.com/Island/picWork/normal/'
const PEOPLE_PHOTO_PREFIX = 'https://assets.anuluca.com/Island/picWork/people/'
const PHOTOGRAPHY_DEVICE = 'Sony RX100M6'

const buildPhotographyPhotos = (prefix: string, filenames: string[]) =>
  filenames.map((filename) => ({
    title: filename,
    device: PHOTOGRAPHY_DEVICE,
    url: `${prefix}${encodeURIComponent(filename)}`,
  }))

const islandDynamic = {
  photographyCoverUrl:
    'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg',
  photographyGroups: [
    {
      id: 'outside',
      title: {
        zhCn: '到处拍拍',
        en: 'OUT AND ABOUT',
      },
      titleEn: 'OUT AND ABOUT',
      railLabel: 'OUTSIDE',
      coverUrl:
        'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg',
      coverPosition: 'right center',
      photos: buildPhotographyPhotos(OUTSIDE_PHOTO_PREFIX, [
        'https://assets.anuluca.com/Island/picWork/normal/DSC00037.JPG',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00054.JPG',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00172.JPG',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00274.JPG',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00508.JPG',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00583.jpg',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00786-01.jpeg',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg',
        'https://assets.anuluca.com/Island/picWork/normal/DSC00814-01.jpeg',
        'https://assets.anuluca.com/Island/picWork/normal/DSC04376.jpg',
        'https://assets.anuluca.com/Island/picWork/normal/dXWAS0.jpg',
        'https://assets.anuluca.com/Island/picWork/normal/DSC06667.jpg',
        'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4535.jpg',
        'https://assets.anuluca.com/Flanerie/cities/chizhou/09.jpg',
        'https://assets.anuluca.com/Flanerie/cities/changsha/01.jpg',
        'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07756.jpg',
        'https://assets.anuluca.com/Flanerie/cities/lushan/IMG_0735.jpg',
        'https://assets.anuluca.com/Flanerie/cities/jiujiang/IMG_8779.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07085.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07068.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_0729.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_7170.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_0730.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07357.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07419.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07458.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07467.jpg',
        'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9051.jpg',
        'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9123.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/DSC06198.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_4203.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_4739.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/DSC05381.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_4346.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_4593.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_4349.jpg',
        'https://assets.anuluca.com/Flanerie/cities/nanchang/IMG_6828.jpg',
      ]),
    },
    {
      id: 'home',
      title: {
        zhCn: '家里也拍拍',
        en: 'FAMILY & PAWS',
      },
      titleEn: 'FAMILY & PAWS',
      railLabel: 'LOVED ONES',
      coverUrl:
        'https://assets.anuluca.com/Island/picWork/people/familyMember/DSC00012.JPG',
      coverPosition: 'right calc(50% + 40px)',
      photoGroups: [
        {
          id: 'family',
          title: {
            zhCn: '家人',
            en: 'FAMILY',
          },
          avatarUrl:
            'https://assets.anuluca.com/Island/picWork/people/familyMember/DSC00012.JPG',
          photos: buildPhotographyPhotos(
            `${PEOPLE_PHOTO_PREFIX}familyMember/`,
            [
              'https://assets.anuluca.com/Island/picWork/people/DSC00012.JPG',
              'https://assets.anuluca.com/Island/picWork/people/DSC00072 (1).jpg',
              'https://assets.anuluca.com/Island/picWork/people/DSC00257.JPG',
              'https://assets.anuluca.com/Island/picWork/people/DSC00361.JPG',
              'https://assets.anuluca.com/Island/picWork/people/DSC01768.JPG',
              'https://assets.anuluca.com/Island/picWork/people/DSC01795.JPG',
              'https://assets.anuluca.com/Island/picWork/people/IMG_5188.jpg',
            ]
          ),
        },
        {
          id: 'hei',
          title: {
            zhCn: '小黑',
            en: 'HEI',
          },
          avatarUrl:
            'https://assets.anuluca.com/Island/picWork/people/hei/DSC00208.JPG',
          photos: buildPhotographyPhotos(`${PEOPLE_PHOTO_PREFIX}hei/`, [
            'DSC00208.JPG',
            'YRXes0.jpg',
          ]),
        },
      ],
    },
  ],
  merchPhotographyCollections: [
    {
      id: 'pokemon-plush',
      category: 'pokemon',
      title: {
        zhCn: '宝可梦毛绒',
        en: 'POKÉMON PLUSH',
      },
      subtitle: {
        zhCn: '毛绒收藏',
        en: 'PLUSH COLLECTION',
      },
      cover: 'https://placehold.co/900x1200/151515/e23456?text=POKEMON+PLUSH',
      photos: [
        {
          url: 'https://placehold.co/1600x1200/151515/e23456?text=PHOTO+01',
          title: {
            zhCn: '宝可梦毛绒',
            en: 'Pokémon Plush',
          },
        },
        {
          url: 'https://placehold.co/1200x1600/181818/e23456?text=PHOTO+02',
        },
      ],
    },
    {
      id: 'shodo-arceus',
      category: 'pokemon',
      title: {
        zhCn: '掌动｜阿尔宙斯',
        en: 'SHODO | ARCEUS',
      },
      subtitle: {
        zhCn: '宝可梦掌动系列',
        en: 'POKÉMON SHODO SERIES',
      },
      cover: 'https://placehold.co/900x1200/121212/e23456?text=SHODO+ARCEUS',
      photos: [
        {
          url: 'https://placehold.co/1600x1200/121212/e23456?text=ARCEUS+01',
          title: {
            zhCn: '阿尔宙斯',
            en: 'Arceus',
          },
        },
      ],
    },
    {
      id: 'shodo-dragapult',
      category: 'pokemon',
      title: {
        zhCn: '掌动｜多龙巴鲁托',
        en: 'SHODO | DRAGAPULT',
      },
      subtitle: {
        zhCn: '宝可梦掌动系列',
        en: 'POKÉMON SHODO SERIES',
      },
      cover: 'https://placehold.co/900x1200/161616/e23456?text=SHODO+DRAGAPULT',
      photos: [],
    },
    {
      id: 'shodo-dragapult2',
      category: 'pokemon',
      title: {
        zhCn: '掌动｜多龙巴鲁托',
        en: 'SHODO | DRAGAPULT',
      },
      subtitle: {
        zhCn: '宝可梦掌动系列',
        en: 'POKÉMON SHODO SERIES',
      },
      cover: 'https://placehold.co/900x1200/161616/e23456?text=SHODO+DRAGAPULT',
      photos: [],
    },
    {
      id: 'shodo-dragapult3',
      category: 'pokemon',
      title: {
        zhCn: '掌动｜多龙巴鲁托',
        en: 'SHODO | DRAGAPULT',
      },
      subtitle: {
        zhCn: '宝可梦掌动系列',
        en: 'POKÉMON SHODO SERIES',
      },
      cover: 'https://placehold.co/900x1200/161616/e23456?text=SHODO+DRAGAPULT',
      photos: [],
    },
    {
      id: 'shodo-cinderace',
      category: 'pokemon',
      title: {
        zhCn: '掌动｜闪焰王牌',
        en: 'SHODO | CINDERACE',
      },
      subtitle: {
        zhCn: '宝可梦掌动系列',
        en: 'POKÉMON SHODO SERIES',
      },
      cover: 'https://placehold.co/900x1200/141414/e23456?text=SHODO+CINDERACE',
      photos: [],
    },
    {
      id: 'ultraman-belial',
      category: 'tokusatsu',
      title: {
        zhCn: '奥特软影｜贝利亚',
        en: 'ULTRAMAN | BELIAL',
      },
      subtitle: {
        zhCn: '奥特曼软胶收藏',
        en: 'ULTRAMAN SOFUBI SERIES',
      },
      cover: 'https://placehold.co/900x1200/101010/e23456?text=ULTRAMAN+BELIAL',
      photos: [],
    },
    {
      id: 'pokemon-battle-chess',
      category: 'pokemon',
      title: {
        zhCn: '宝可梦战斗棋',
        en: 'POKÉMON BATTLE CHESS',
      },
      subtitle: {
        zhCn: '宝可梦桌面收藏',
        en: 'POKÉMON TABLETOP COLLECTION',
      },
      cover: 'https://placehold.co/900x1200/171717/e23456?text=BATTLE+CHESS',
      photos: [],
    },
  ],
  latestPages: {
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
        module: 'ARCHIVE / MAIN PROJECT',
        path: '/archive?project=W001',
        img: 'https://placehold.co/260x180/14070c/e23456?text=STATE%20GRID',
      },
      {
        title: 'Substation Digital Cockpit',
        module: 'ARCHIVE / MAIN PROJECT',
        path: '/archive?project=W002',
        img: 'https://placehold.co/260x180/14070c/e23456?text=COCKPIT',
      },
      {
        title: 'Digital Synergy Supervision',
        module: 'ARCHIVE / MAIN PROJECT',
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
        path: '/test',
        img: 'https://placehold.co/260x180/14070c/e23456?text=NOTES',
      },
      {
        title: 'Daily Shots',
        module: 'ISLAND / PHOTOGRAPHY',
        path: '/island/photography',
        img: 'https://placehold.co/260x180/14070c/e23456?text=PHOTO',
      },
    ],
  },
  tracks: [
    {
      title: '幽灵东京',
      artist: 'AYASE · PREVIEW PROVIDED COURTESY OF ITUNES',
      cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
      src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/4b/7c/14/4b7c1462-882a-8df4-a4c4-db8b41505987/mzaf_13769688772858368327.plus.aac.p.m4a',
      volume: 0.08,
      storeUrl:
        'https://music.apple.com/cn/album/%E5%B9%BD%E9%9C%8A%E6%9D%B1%E4%BA%AC/1487353903?i=1487353913',
    },
    {
      title: '贝加尔湖畔',
      artist: '李健 · PREVIEW PROVIDED COURTESY OF ITUNES',
      cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
      src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/67/c4/b8/67c4b832-adf5-7e9f-931f-5699892452c7/mzaf_5314494580193787769.plus.aac.p.m4a',
      volume: 0.12,
      storeUrl:
        'https://music.apple.com/cn/album/%E8%B4%9D%E5%8A%A0%E5%B0%94%E6%B9%96%E7%95%94/905188240?i=905188255',
    },
    {
      title: 'Veridis Quo',
      artist: 'DAFT PUNK · PREVIEW PROVIDED COURTESY OF ITUNES',
      cover: 'https://placehold.co/320x320/14070c/e23456?text=ALBUM%20COVER',
      src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/7a/f8/4d/7af84d3a-fc7b-1569-766b-8adf13dab451/mzaf_3503155761614342520.plus.aac.p.m4a',
      volume: 0.12,
      storeUrl:
        'https://music.apple.com/us/album/veridis-quo/697194953?i=697196125',
    },
  ],
} as const

export default islandDynamic
