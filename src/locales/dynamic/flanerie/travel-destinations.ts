export const group = {
  id: 'visited',
  title: {
    zhCn: '旅行目的地',
    en: 'VISITED CITIES',
  },
  titleEn: 'VISITED CITIES',
  railLabel: 'VISITED',
} as const

const travelDestinations = [
  {
    id: 'changsha',
    category: 'visited',
    title: {
      zhCn: '湖南｜长沙',
      en: 'HUNAN | CHANGSHA',
    },
    mapLabel: {
      zhCn: '长沙',
      en: 'Changsha',
    },
    date: '2026',
    tagline: {
      zhCn: '感觉没什么看的。',
      en: 'It doesn’t look that interesting.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/changsha/01.jpg',
    location: {
      id: 'hunan',
      name: {
        zhCn: '湖南',
        en: 'Hunan',
      },
      lat: 28.2282,
      lng: 112.9388,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/579d8d7cd8ea8f520db4bad734ed7a9f16c98c83.jpg@672w_378h_1c.webp',
        bvid: 'BV1eZo1B8EUB',
        url: 'https://www.bilibili.com/video/BV1eZo1B8EUB',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '橘子洲',
          en: 'Orange Isle',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/changsha/01.jpg',
      },
      {
        title: {
          zhCn: 'T形帛画 - 湖南省博物馆',
          en: 'the T-shaped silk painting at Hunan Museum',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/changsha/02.jpg',
      },
    ],
  },
  {
    id: 'xiangtan',
    category: 'visited',
    title: {
      zhCn: '湖南｜湘潭',
      en: 'HUNAN | XIANGTAN',
    },
    mapLabel: {
      zhCn: '湘潭',
      en: 'Xiangtan',
    },
    date: '2026',
    tagline: {
      zhCn: '槟榔大城，湘江边很漂亮。',
      en: 'A city of betel nuts, with beautiful scenery along the Xiang River.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/xiangtan/DSC06981.jpg',
    location: {
      id: 'hunan',
      name: {
        zhCn: '湖南',
        en: 'Hunan',
      },
      lat: 28.2282,
      lng: 112.9388,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/4a2510fcedd8140ee6020b0222099fbfba3f91a7.jpg@672w_378h_1c.webp',
        bvid: 'BV1wX5m6VEst',
        url: 'https://www.bilibili.com/video/BV1wX5m6VEst',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '齐白石公园',
          en: 'Qi Baishi Park',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/xiangtan/DSC06979.jpg',
      },
      {
        location: {
          zhCn: '湘江沿岸',
          en: 'Along the Xiang River',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/xiangtan/DSC06981.jpg',
      },
    ],
  },
  {
    id: 'shaoshan',
    category: 'visited',
    title: {
      zhCn: '湖南｜韶山',
      en: 'HUNAN | SHAOSHAN',
    },
    mapLabel: {
      zhCn: '韶山',
      en: 'Shaoshan',
    },
    date: '2026',
    tagline: {
      zhCn: '青山中的红色记忆与小镇风情。',
      en: 'A red legacy among green hills, with the charm of a small town.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/shaoshan/DSC06929.jpg',
    location: {
      id: 'hunan',
      name: {
        zhCn: '湖南',
        en: 'Hunan',
      },
      lat: 28.2282,
      lng: 112.9388,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/6ed793ca1434f5b6ede23b1b522da5e836f418c3.jpg@672w_378h_1c.webp',
        bvid: 'BV1pP536gEfN',
        url: 'https://www.bilibili.com/video/BV1pP536gEfN',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '韶山大道',
          en: 'Shaoshan Avenue',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/shaoshan/DSC06929.jpg',
      },
    ],
  },
  {
    id: 'anqing',
    category: 'visited',
    title: {
      zhCn: '安徽｜安庆',
      en: 'ANHUI | ANQING',
    },
    mapLabel: {
      zhCn: '安庆',
      en: 'Anqing',
    },
    date: '2026',
    tagline: {
      zhCn: '宁静的小城。',
      en: 'A quiet little city.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/anqing/DSC07722.jpg',
    location: {
      id: 'anhui',
      name: {
        zhCn: '安徽',
        en: 'Anhui',
      },
      lat: 31.8206,
      lng: 117.2272,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/0853634f48056b28b96ef3dfc97396fb49a84c2b.jpg@672w_378h_1c.webp',
        bvid: 'BV1SbEV6vETK',
        url: 'https://www.bilibili.com/video/BV1SbEV6vETK',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '步行街',
          en: 'Pedestrian Street',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/anqing/DSC07722.jpg',
      },
      {
        location: {
          zhCn: '江毛水饺',
          en: 'Jiangmao Dumplings',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/anqing/DSC07724.jpg',
      },
    ],
  },
  {
    id: 'chizhou',
    category: 'visited',
    title: {
      zhCn: '安徽｜池州',
      en: 'ANHUI | CHIZHOU',
    },
    mapLabel: {
      zhCn: '池州',
      en: 'Chizhou',
    },
    date: '2026',
    tagline: {
      zhCn: '我妈妈的家乡。',
      en: "My mother's hometown.",
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/chizhou/05.jpg',
    location: {
      id: 'anhui',
      name: {
        zhCn: '安徽',
        en: 'Anhui',
      },
      lat: 31.8206,
      lng: 117.2272,
    },
    videos: [
      {
        title: {
          zhCn: '旅行VLOG',
          en: 'Travel Vlog',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/db519ef0ee839ed9e64ee33518223d38912a3d23.jpg@672w_378h_1c.webp',
        bvid: 'BV1FUjc67ERM',
        url: 'https://www.bilibili.com/video/BV1FUjc67ERM',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '西递古村',
          en: 'Xidi Ancient Village',
        },
        time: '2019',
        device: 'MI 6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/01.jpg',
      },
      {
        location: {
          zhCn: '西递古村',
          en: 'Xidi Ancient Village',
        },
        time: '2019',
        device: 'MI 6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/02.jpg',
      },
      {
        location: {
          zhCn: '西递古村',
          en: 'Xidi Ancient Village',
        },
        time: '2019',
        device: 'MI 6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/03.jpg',
      },
      {
        location: {
          zhCn: '西递古村',
          en: 'Xidi Ancient Village',
        },
        time: '2019',
        device: 'MI 6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/04.jpg',
      },
      {
        location: {
          zhCn: '忘记是什么野山了。',
          en: 'I forgot which wild mountain this was.',
        },
        time: '2020',
        device: 'MI 6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/05.jpg',
      },
      {
        location: {
          zhCn: '草。',
          en: 'Grass.',
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/07.jpg',
      },
      {
        location: {
          zhCn: '妈妈老家前的小道。',
          en: "The path in front of my mother's old home.",
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/08.jpg',
      },
      {
        location: {
          zhCn: '过年。',
          en: 'Chinese New Year.',
        },
        time: '2020',
        device: 'SONY RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/09.jpg',
      },
      {
        location: {
          zhCn: '步行街',
          en: 'Pedestrian Street',
        },
        time: '2026',
        device: 'SONY RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chizhou/20.jpg',
      },
    ],
  },
  {
    id: 'huangshan',
    category: 'visited',
    title: {
      zhCn: '安徽｜黄山',
      en: 'ANHUI | HUANGSHAN',
    },
    mapLabel: {
      zhCn: '黄山',
      en: 'Huangshan',
    },
    date: '2024',
    tagline: {
      zhCn: '奇石多到看到腻。',
      en: 'So many bizarre rocks that I eventually got tired of them.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/huangshan/DSC04850 (1).jpg',
    location: {
      id: 'anhui',
      name: {
        zhCn: '安徽',
        en: 'Anhui',
      },
      lat: 31.8206,
      lng: 117.2272,
    },
    videos: [
      {
        title: {
          zhCn: '随记',
          en: 'Notes from the Trip',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/c95e33a6a565c65e01598dea869ee792093a2ad9.jpg@672w_378h_1c.webp',
        bvid: 'BV1raw4zAE7V',
        url: 'https://www.bilibili.com/video/BV1raw4zAE7V',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/huangshan/DSC04850 (1).jpg',
      },
      {
        location: {
          zhCn: '留念',
          en: 'A Keepsake',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/huangshan/IMG_0515 (1).jpg',
      },
      {
        location: {
          zhCn: '缆车',
          en: 'Cable Car',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/huangshan/DSC04805 (1).jpg',
      },
    ],
  },
  {
    id: 'chongqing',
    category: 'visited',
    title: {
      zhCn: '重庆',
      en: 'CHONGQING',
    },
    mapLabel: {
      zhCn: '重庆',
      en: 'Chongqing',
    },
    date: '2026',
    tagline: {
      zhCn: '完全在爬山，这里的口味比南昌更辣。',
      en: 'It was all uphill walking, and the food here is even spicier than in Nanchang.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4225.jpg',
    location: {
      id: 'chongqing',
      name: {
        zhCn: '重庆',
        en: 'Chongqing',
      },
      lat: 29.563,
      lng: 106.5516,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/d22f6e0a871e49d2ffdddbc6831a987bb6f5de19.jpg@672w_378h_1c.webp',
        bvid: 'BV1Fiw4zhEuL',
        url: 'https://www.bilibili.com/video/BV1Fiw4zhEuL',
        orientation: 'portrait',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '山城巷的奇怪涂鸦',
          en: 'Strange Graffiti in Shancheng Alley',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/DSC06605.jpg',
      },
      {
        location: {
          zhCn: '得意世界',
          en: 'Deyi World',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/DSC06625.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/DSC06644.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/DSC06667.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/DSC06677.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4269.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4535.jpg',
      },
      {
        location: {
          zhCn: '罗汉寺',
          en: 'Luohan Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4537.jpg',
      },
      {
        location: {
          zhCn: '街道。',
          en: 'Street.',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4124.jpg',
      },
      {
        location: {
          zhCn: '重庆美术馆',
          en: 'Chongqing Art Museum',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4161.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4168.jpg',
      },
      {
        location: {
          zhCn: '洪崖洞',
          en: 'Hongya Cave',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4225.jpg',
      },
      {
        location: {
          zhCn: '白象居',
          en: 'Baixiangju',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4399.jpg',
      },
      {
        location: {
          zhCn: '解放碑',
          en: 'Jiefangbei',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/chongqing/IMG_4534.jpg',
      },
    ],
  },
  {
    id: 'fuzhou-jiangxi',
    category: 'visited',
    title: {
      zhCn: '江西｜抚州',
      en: 'JIANGXI | FUZHOU',
    },
    mapLabel: {
      zhCn: '抚州',
      en: 'Fuzhou, Jiangxi',
    },
    date: '2026',
    tagline: {
      zhCn: '来看《牡丹亭》。',
      en: 'Here to see The Peony Pavilion.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/IMG_3109.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/bff90e4e219ee3d66a5fcf3deca325c31a0f03a7.jpg@672w_378h_1c.webp',
        bvid: 'BV1KewHz4Ejm',
        url: 'https://www.bilibili.com/video/BV1KewHz4Ejm',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '商业街的鸽子。',
          en: 'Pigeons on the shopping street.',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/IMG_3041.jpg',
      },
      {
        location: {
          zhCn: '审 美 升 级。',
          en: 'A E S T H E T I C  U P G R A D E.',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/IMG_3045.jpg',
      },
      {
        location: {
          zhCn: '留念。',
          en: 'A keepsake.',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/IMG_3109.jpg',
      },
      {
        location: {
          zhCn: '维护很差的戏曲博物馆',
          en: 'A poorly maintained opera museum',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/IMG_3139.jpg',
      },
      {
        location: {
          zhCn: '杜丽娘',
          en: 'Du Liniang',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/DSC06596.jpg',
      },
      {
        location: {
          zhCn: '杜丽娘',
          en: 'Du Liniang',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou/DSC06598.jpg',
      },
    ],
  },
  {
    id: 'jingdezhen',
    category: 'visited',
    title: {
      zhCn: '江西｜景德镇',
      en: 'JIANGXI | JINGDEZHEN',
    },
    mapLabel: {
      zhCn: '景德镇',
      en: 'Jingdezhen',
    },
    date: '2026',
    tagline: {
      zhCn: '瓷博太夯了。',
      en: 'The ceramics museum absolutely lives up to the hype.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/DSC06743.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/f9838bb94cb29474000fdcf2b2392c1ebae651d0.jpg@672w_378h_1c.webp',
        bvid: 'BV1R9oaBREMo',
        url: 'https://www.bilibili.com/video/BV1R9oaBREMo',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '中国瓷器博物馆',
          en: 'China Ceramics Museum',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/DSC06743.jpg',
      },
      {
        location: {
          zhCn: '中国瓷器博物馆',
          en: 'China Ceramics Museum',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/DSC06793.jpg',
      },
      {
        location: {
          zhCn: '御窑厂',
          en: 'Imperial Kiln Factory',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/DSC06821.jpg',
      },
      {
        location: {
          zhCn: '龙珠阁',
          en: 'Longzhu Pavilion',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/DSC06829.jpg',
      },
      {
        location: {
          zhCn: '特色路牌',
          en: 'Distinctive Street Sign',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jingdezhen/IMG_5071.jpg',
      },
    ],
  },
  {
    id: 'lushan',
    category: 'visited',
    title: {
      zhCn: '江西｜庐山',
      en: 'JIANGXI | LUSHAN',
    },
    mapLabel: {
      zhCn: '庐山',
      en: 'Lushan',
    },
    date: '2026',
    tagline: {
      zhCn: '这里分人文线路和山水线路，真的太大了，至少五天才能充分看完。',
      en: 'There are separate cultural and scenic routes here. The place is enormous—it takes at least five days to see it properly.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07767.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    // videos: [
    //   {
    //     title: {
    //       zhCn: '人文篇',
    //       en: '',
    //     },
    //     cover: 'https://assets.anuluca.com/other/videoCover/',
    //     bvid: '',
    //     url: 'https://www.bilibili.com/video/',
    //     orientation: 'landscape',
    //   },
    //   {
    //     title: {
    //       zhCn: '山水篇',
    //       en: '',
    //     },
    //     cover: 'https://assets.anuluca.com/other/videoCover/',
    //     bvid: '',
    //     url: 'https://www.bilibili.com/video/',
    //     orientation: 'landscape',
    //   },
    // ],
    photos: [
      {
        location: {
          zhCn: '如琴湖',
          en: 'Ruqin Lake',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07746.jpg',
      },
      {
        location: {
          zhCn: '白居易草堂的猫',
          en: "A Cat at Bai Juyi's Cottage",
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07754.jpg',
      },
      {
        location: {
          zhCn: '白居易草堂的猫',
          en: "A Cat at Bai Juyi's Cottage",
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07756.jpg',
      },
      {
        location: {
          zhCn: '牯岭镇的猫',
          en: 'A Cat in Guling Town',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07760.jpg',
      },
      {
        location: {
          zhCn: '牯岭镇',
          en: 'Guling Town',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07767.jpg',
      },
      {
        location: {
          zhCn: '三叠泉',
          en: 'Sandie Spring',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07774.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07780.jpg',
      },
      {
        location: {
          zhCn: '秀峰瀑布',
          en: 'Xiufeng Waterfall',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07794.jpg',
      },
      {
        location: {
          zhCn: '红嘴蓝鹊',
          en: 'Red-billed Blue Magpie',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/lushan/IMG_0735.jpg',
      },
    ],
  },
  {
    id: 'donglin-buddha',
    category: 'visited',
    title: {
      zhCn: '江西｜东林大佛',
      en: 'JIANGXI | DONGLIN BUDDHA',
    },
    mapLabel: {
      zhCn: '东林大佛',
      en: 'Donglin Buddha',
    },
    date: '2026',
    tagline: {
      zhCn: '好高啊，好大啊。',
      en: 'So tall. So huge.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/donglin-buddha/DSC07786.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/donglin-buddha/DSC07786.jpg',
      },
    ],
  },
  {
    id: 'poyang-lake',
    category: 'visited',
    title: {
      zhCn: '江西｜鄱阳湖',
      en: 'JIANGXI | POYANG LAKE',
    },
    mapLabel: {
      zhCn: '鄱阳湖',
      en: 'Poyang Lake',
    },
    date: '2026',
    tagline: {
      zhCn: '好像主要在观鸟了。',
      en: 'I mostly ended up birdwatching.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/poyang-lake/P1011274.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Passonic Lumix ZX99',
        url: 'https://assets.anuluca.com/Flanerie/cities/poyang-lake/P1011274.jpg',
      },
    ],
  },
  {
    id: 'jiujiang',
    category: 'visited',
    title: {
      zhCn: '江西｜九江',
      en: 'JIANGXI | JIUJIANG',
    },
    mapLabel: {
      zhCn: '九江',
      en: 'Jiujiang',
    },
    date: '2026',
    tagline: {
      zhCn: '回留。',
      en: 'Return. Remain.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7531.jpg',
    location: {
      id: 'jiangxi',
      name: {
        zhCn: '江西',
        en: 'Jiangxi',
      },
      lat: 28.682,
      lng: 115.8582,
    },
    videos: [
      {
        title: 'VLOG',
        bvid: 'BV1xHL86eEP9',
        url: 'https://www.bilibili.com/video/BV1xHL86eEP9',
        cover:
          'https://assets.anuluca.com/other/videoCover/c0cba2ab9d686c3149549abbfedcb699330c72be.jpg@672w_378h_1c.webp',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '儿童墙绘',
          en: "Children's Mural",
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7504.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7527.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7531.jpg',
      },
      {
        location: {
          zhCn: '九江长江大桥',
          en: 'Jiujiang Yangtze River Bridge',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7549.jpg',
      },
      {
        location: {
          zhCn: '鸽子但没对上焦',
          en: 'A Pigeon, but Out of Focus',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/_DSC7567.jpg',
      },
      {
        location: {
          zhCn: '摊前的快乐',
          en: 'Joy by the Street Stall',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/IMG_8779.jpg',
      },
      {
        location: {
          zhCn: '东林寺',
          en: 'Donglin Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/jiujiang/IMG_8778.jpg',
      },
    ],
  },
  {
    id: 'nanjing',
    category: 'visited',
    title: {
      zhCn: '江苏｜南京',
      en: 'JIANGSU | NANJING',
    },
    mapLabel: {
      zhCn: '南京',
      en: 'Nanjing',
    },
    date: '2026',
    tagline: {
      zhCn: '历史与烟火气在此交融。',
      en: 'Half Jinling in mist and rain, half Stone City in its bones.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07049.jpg',
    location: {
      id: 'jiangsu',
      name: {
        zhCn: '江苏',
        en: 'Jiangsu',
      },
      lat: 32.0603,
      lng: 118.7969,
    },
    videos: [
      {
        title: 'VLOG',
        cover:
          'https://assets.anuluca.com/other/videoCover/da9112aa1ba9a005b5e66e5c7cba37130a6e8c20.jpg@672w_378h_1c.webp',
        bvid: 'BV1KNEJ6jE1y',
        url: 'https://www.bilibili.com/video/BV1KNEJ6jE1y',
        orientation: 'landscape',
      },
      {
        title: {
          zhCn: '红山动物园记录',
          en: 'Hongshan Zoo Visit',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/778b1499e9704aa53d9e43d92e6761c984875ecd.jpg@672w_378h_1c.webp',
        bvid: 'BV1zmLs6GEhS',
        url: 'https://www.bilibili.com/video/BV1zmLs6GEhS',
        orientation: 'portrait',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '和平雕塑',
          en: 'Peace Statue',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07049.jpg',
      },
      {
        location: {
          zhCn: '莫愁女',
          en: 'Lady Mochou',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07068.jpg',
      },
      {
        location: {
          zhCn: '车流',
          en: 'Traffic',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07085.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07089.jpg',
      },
      {
        location: {
          zhCn: '总统府',
          en: 'Presidential Palace',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07101.jpg',
      },
      {
        location: {
          zhCn: '陵园路',
          en: 'Lingyuan Road',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07149.jpg',
      },
      {
        location: {
          zhCn: '中山陵',
          en: 'Sun Yat-sen Mausoleum',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07182.jpg',
      },
      {
        location: {
          zhCn: '檐上航线',
          en: 'Flight Path above the Eaves',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07228.jpg',
      },
      {
        location: {
          zhCn: '明孝陵',
          en: 'Ming Xiaoling Mausoleum',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07256.jpg',
      },
      {
        location: {
          zhCn: '长椅',
          en: 'Bench',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_0729.jpg',
      },
      {
        location: {
          zhCn: '灵谷寺',
          en: 'Linggu Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_7170.jpg',
      },
      {
        location: {
          zhCn: '古鸡鸣寺',
          en: 'Jiming Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07314.jpg',
      },
      {
        location: {
          zhCn: '古鸡鸣寺',
          en: 'Jiming Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07317.jpg',
      },
      {
        location: {
          zhCn: '古鸡鸣寺的樱花',
          en: 'Cherry Blossoms at Jiming Temple',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/IMG_0730.jpg',
      },
      {
        location: {
          zhCn: '狐獴 in 红山动物园',
          en: 'Meerkat at Hongshan Zoo',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07357.jpg',
      },
      {
        location: {
          zhCn: '考拉 in 红山动物园',
          en: 'Koala at Hongshan Zoo',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07381.jpg',
      },
      {
        location: {
          zhCn: '金头狮狨 in 红山动物园',
          en: 'Golden-headed Lion Tamarin at Hongshan Zoo',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07419.jpg',
      },
      {
        location: {
          zhCn: '豹猫 in 红山动物园',
          en: 'Leopard Cat at Hongshan Zoo',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07458.jpg',
      },
      {
        location: {
          zhCn: '白腰文鸟 in 红山动物园',
          en: 'White-rumped Munia at Hongshan Zoo',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07467.jpg',
      },
      {
        location: {
          zhCn: '大桥公园 傍晚',
          en: 'Bridge Park at Dusk',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/nanjing/DSC07485.jpg',
      },
    ],
  },
  {
    id: 'suzhou',
    category: 'visited',
    title: {
      zhCn: '江苏｜苏州',
      en: 'JIANGSU | SUZHOU',
    },
    mapLabel: {
      zhCn: '苏州',
      en: 'Suzhou',
    },
    date: '2025',
    tagline: {
      zhCn: '西园寺素面好吃。',
      en: 'The vegetarian noodles at Xiyuan Temple are delicious.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/suzhou/IMG_6267.jpg',
    location: {
      id: 'jiangsu',
      name: {
        zhCn: '江苏',
        en: 'Jiangsu',
      },
      lat: 32.0603,
      lng: 118.7969,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/suzhou/DSC05958.jpg',
      },
      {
        location: {
          zhCn: '虎丘塔',
          en: 'Tiger Hill Pagoda',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/suzhou/DSC05970.jpg',
      },
      {
        location: {
          zhCn: '松鼠桂鱼',
          en: 'Sweet-and-Sour Mandarin Fish',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/suzhou/DSC06053.jpg',
      },
      {
        location: {
          zhCn: '游船',
          en: 'Boat Ride',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/suzhou/IMG_6265.jpg',
      },
      {
        location: {
          zhCn: '游船',
          en: 'Boat Ride',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/suzhou/IMG_6267.jpg',
      },
    ],
  },
  {
    id: 'singapore',
    category: 'visited',
    title: {
      zhCn: '新加坡',
      en: 'SINGAPORE',
    },
    mapLabel: {
      zhCn: '新加坡',
      en: 'Singapore',
    },
    date: '2026',
    tagline: {
      zhCn: '走马观花。',
      en: 'Glance over the flowers hurriedly.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/singapore/f1ae5f2f-5d6d-422e-b4ef-475a20c31484 (1).png',
    location: {
      id: 'singapore',
      name: {
        zhCn: '新加坡',
        en: 'Singapore',
      },
      lat: 1.3521,
      lng: 103.8198,
    },
    videos: [
      {
        title: 'VLOG',
        bvid: 'BV1VaoQBkEtk',
        cover:
          'https://assets.anuluca.com/other/videoCover/54e2add0b11286a42e9915b3b8648f1f3fcbeeab.jpg@672w_378h_1c.webp',
        url: 'https://www.bilibili.com/video/BV1VaoQBkEtk',
        orientation: 'landscape',
      },
      {
        title: {
          zhCn: '滨海湾花园灯光秀',
          en: 'Garden Rhapsody at Gardens by the Bay',
        },
        bvid: 'BV1qCoDBLE7Z',
        cover:
          'https://assets.anuluca.com/other/videoCover/059f23eb176a3afe3597f3cd6158834b93b6991f.jpg@672w_378h_1c.webp',
        url: 'https://www.bilibili.com/video/BV1qCoDBLE7Z',
        orientation: 'landscape',
      },
      {
        title: {
          zhCn: 'S.E.A. 水下舞龙',
          en: 'S.E.A. UNDERWATER DRAGON DANCE',
        },
        bvid: 'BV13eo7BVE5L',
        cover:
          'https://assets.anuluca.com/other/videoCover/767bb0f1647038afb068972ef96c06f15c489141.jpg@672w_378h_1c.webp',
        url: 'https://www.bilibili.com/video/BV13eo7BVE5L',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '新加坡Pokemon Center',
          en: 'Pokémon Center Singapore',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/IMG_5522.jpg',
      },
      {
        location: {
          zhCn: '树篱迷宫',
          en: 'Hedge Maze',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/DSC06851.jpg',
      },
      {
        location: {
          zhCn: '虎豹别墅的壁画',
          en: 'Mural at Haw Par Villa',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/DSC06855.jpg',
      },
      {
        location: {
          zhCn: '鱼尾狮雕像',
          en: 'Merlion Statue',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/f1ae5f2f-5d6d-422e-b4ef-475a20c31484 (1).png',
      },
      {
        location: {
          zhCn: '阿努比斯雕像 in 新加坡环球影城《木乃伊》主题馆',
          en: 'Statue of Anubis in Revenge of the Mummy at Universal Studios Singapore',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/IMG_5812.jpg',
      },
      {
        location: {
          zhCn: '威震天 in 新加坡环球影城',
          en: 'Megatron at Universal Studios Singapore',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/DSC06879.jpg',
      },
      {
        location: {
          zhCn: '后厨小巷',
          en: 'Back-Kitchen Alley',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/IMG_5705.jpg',
      },
      {
        location: {
          zhCn: '滨海湾花园的雕塑',
          en: 'Sculpture at Gardens by the Bay',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/IMG_5743.jpg',
      },
      {
        location: {
          zhCn: '中国旅游广告',
          en: 'China Tourism Advertisement',
        },
        time: '2026',
        device: 'iPhone 17',
        url: 'https://assets.anuluca.com/Flanerie/cities/singapore/IMG_5825.jpg',
      },
    ],
  },
  {
    id: 'fuzhou-fujian',
    category: 'visited',
    title: {
      zhCn: '福建｜福州',
      en: 'FUJIAN | FUZHOU',
    },
    mapLabel: {
      zhCn: '福州',
      en: 'Fuzhou, Fujian',
    },
    date: '2025',
    tagline: {
      zhCn: '家人居住的地方，海鲜也吃爽了，琵琶虾好鲜啊。',
      en: 'Where my family lives. I had my fill of seafood too—the mantis shrimp was incredibly fresh.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/DSC04393.jpg',
    location: {
      id: 'fujian',
      name: {
        zhCn: '福建',
        en: 'Fujian',
      },
      lat: 26.0745,
      lng: 119.2965,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/e1a04a3cb2e278fc0611b81f185027d720cf6632.jpg@672w_378h_1c.webp',
        bvid: 'BV1dqX9B3EhW',
        url: 'https://www.bilibili.com/video/BV1dqX9B3EhW',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '傍晚的城市。',
          en: 'The City at Dusk.',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/DSC04393.jpg',
      },
      {
        location: {
          zhCn: '傍晚的船政博物馆。',
          en: 'Foochow Arsenal Museum at Dusk.',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/DSC04414.jpg',
      },
      {
        location: {
          zhCn: '家人。',
          en: 'Family.',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_5188.jpg',
      },
      {
        location: {
          zhCn: '船政博物馆',
          en: 'Foochow Arsenal Museum',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_8801.jpg',
      },
      {
        location: {
          zhCn: '船政博物馆',
          en: 'Foochow Arsenal Museum',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_8802.jpg',
      },
      {
        location: {
          zhCn: '船政博物馆',
          en: 'Foochow Arsenal Museum',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_8803.jpg',
      },
      {
        location: {
          zhCn: '烟台山(?)',
          en: 'Yantai Hill (?)',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_9052.jpg',
      },
      {
        location: {
          zhCn: '烟台山(?)',
          en: 'Yantai Hill (?)',
        },
        time: '2025',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/fuzhou2/IMG_9053.jpg',
      },
    ],
  },
  {
    id: 'pingtandao',
    category: 'visited',
    title: {
      zhCn: '福建｜平潭岛',
      en: 'FUJIAN | PINGTAN ISLAND',
    },
    mapLabel: {
      zhCn: '平潭岛',
      en: 'Pingtan Island',
    },
    date: '2024',
    tagline: {
      zhCn: '精神阿罗拉人的梦中情岛。',
      en: 'A dream island for Alolans at heart.',
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9051.jpg',
    location: {
      id: 'fujian',
      name: {
        zhCn: '福建',
        en: 'Fujian',
      },
      lat: 26.0745,
      lng: 119.2965,
    },
    videos: [
      {
        title: {
          zhCn: 'VLOG',
          en: 'VLOG',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/7cfad6c2ca3554650c37e846646a4d26affd245d.jpg@672w_378h_1c.webp',
        bvid: 'BV1jeX9B5E1c',
        url: 'https://www.bilibili.com/video/BV1jeX9B5E1c',
        orientation: 'portrait',
      },
      {
        title: {
          zhCn: '海滩/日出记录',
          en: 'Beach / Sunrise Footage',
        },
        cover:
          'https://assets.anuluca.com/other/videoCover/ee17390a07bda7ec40dc62d1dcf19509c5d38ae7.jpg@672w_378h_1c.webp',
        bvid: 'BV1y5X6BSEit',
        url: 'https://www.bilibili.com/video/BV1y5X6BSEit',
        orientation: 'landscape',
      },
    ],
    photos: [
      {
        location: {
          zhCn: '风车',
          en: 'Wind Turbine',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/DSC06410.jpg',
      },
      {
        location: {
          zhCn: '还是风车',
          en: 'Another Wind Turbine',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/DSC06419.jpg',
      },
      {
        location: {
          zhCn: '依旧风车',
          en: 'Yet Another Wind Turbine',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/DSC06427.jpg',
      },
      {
        location: {
          zhCn: '好多风车',
          en: 'So Many Wind Turbines',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/DSC06442.jpg',
      },
      {
        location: {
          zhCn: '风车好看啊',
          en: 'The Wind Turbines Look Great',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9051.jpg',
      },
      {
        location: {
          zhCn: '大福湾观景区',
          en: 'Dafu Bay Scenic Area',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/DSC06455.jpg',
      },
      {
        location: {
          zhCn: '68海里',
          en: '68 Nautical Miles Scenic Area',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9048.jpg',
      },
      {
        location: {
          zhCn: '随机的贝壳',
          en: 'A Random Seashell',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9097.jpg',
      },
      {
        location: {
          zhCn: '龙王头沙滩',
          en: 'Longwangtou Beach',
        },
        time: '2024',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/cities/pingtandao/IMG_9123.jpg',
      },
    ],
  },
  {
    id: 'shanghai',
    category: 'visited',
    title: {
      zhCn: '上海',
      en: 'SHANGHAI',
    },
    mapLabel: {
      zhCn: '上海',
      en: 'Shanghai',
    },
    date: '2024',
    tagline: {
      zhCn: '去了好多次，想去的活动大多都在上海举办。',
      en: "I've been many times; most of the events I want to attend are held in Shanghai.",
    },
    img: 'https://assets.anuluca.com/Flanerie/cities/shanghai/20160710_195758.jpeg',
    location: {
      id: 'shanghai',
      name: {
        zhCn: '上海',
        en: 'Shanghai',
      },
      lat: 31.2304,
      lng: 121.4737,
    },
    photos: [
      {
        location: {
          zhCn: '南京路步行街',
          en: 'Nanjing Road Pedestrian Street',
        },
        time: '2016',
        device: 'SAMSUNG i8268',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/20160710_121421.jpeg',
      },
      {
        location: {
          zhCn: '像拿座机拍的。',
          en: 'Looks like it was shot on a landline.',
        },
        time: '2016',
        device: 'SAMSUNG i8268',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/20160710_195758.jpeg',
      },
      {
        location: {
          zhCn: '2016CJ现场',
          en: 'ChinaJoy 2016',
        },
        time: '2016',
        device: 'SAMSUNG i8268',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/IMG_20160729_09533001.jpeg',
      },
      {
        location: {
          zhCn: '2016CJ现场',
          en: 'ChinaJoy 2016',
        },
        time: '2016',
        device: 'SAMSUNG i8268',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/IMG_20160729_10350901.jpeg',
      },
      {
        location: {
          zhCn: '和宝友面基',
          en: 'Meeting Up with Fellow Pokémon Fans',
        },
        time: '2024',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/IMG_3288.jpg',
      },
      {
        location: {
          zhCn: '官方道馆（古月鸟）',
          en: 'Official Pokémon Gym (Cramorant)',
        },
        time: '2024',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/IMG_7392.jpg',
      },
      {
        location: {
          zhCn: '第二十六届上海国际电影节《波导的勇者》',
          en: 'Pokémon: Lucario and the Mystery of Mew at the 26th Shanghai International Film Festival',
        },
        time: '2024',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/cities/shanghai/IMG_7402.jpg',
      },
    ],
  },
] as const

export default travelDestinations
