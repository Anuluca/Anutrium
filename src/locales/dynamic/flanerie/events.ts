export const group = {
  id: 'activity',
  title: {
    zhCn: '参与活动',
    en: 'EVENTS',
  },
  titleEn: 'EVENTS',
  railLabel: 'EVENTS',
} as const

const events = [
  {
    id: 'super_wuhan',
    category: 'activity',
    title: {
      zhCn: '武汉｜宝可梦超级赛',
      en: 'WUHAN | POKEMON SUPER TOURNAMENT',
    },
    mapLabel: {
      zhCn: '武汉',
      en: 'Wuhan',
    },
    date: '2023',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0750 (1).jpg',
    location: {
      id: 'hubei',
      name: {
        zhCn: '湖北',
        en: 'Hubei',
      },
      lat: 30.5928,
      lng: 114.3055,
    },
    photos: [
      {
        location: {
          zhCn: '城市活动',
          en: 'City Event',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0704 (1).jpg',
      },
      {
        location: {
          zhCn: '超级巨皮卡丘',
          en: 'Gigantamax Pikachu',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0734 (1).jpg',
      },
      {
        location: {
          zhCn: '超级巨屁卡丘',
          en: 'Gigantamax Pika-butt',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0734 (1).jpg',
      },
      {
        location: {
          zhCn: '活动现场',
          en: 'Event Venue',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0750 (1).jpg',
      },
      {
        location: {
          zhCn: '活动现场',
          en: 'Event Venue',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0771.mp4',
      },
      {
        location: {
          zhCn: '小孩哥现场开包',
          en: 'A Kid Opening Packs Live at the Event',
        },
        time: '2023',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event2/IMG_0819 (1).jpg',
      },
    ],
  },
  {
    id: 'poke_coco',
    category: 'activity',
    title: {
      zhCn: '北京｜《剧场版宝可梦：可可》首映会',
      en: 'BEIJING | POKEMON THE MOVIE: COCO PREMIERE',
    },
    mapLabel: {
      zhCn: '北京',
      en: 'Beijing',
    },
    date: '2021',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/poke_event3/6.jpg',
    location: {
      id: 'beijing',
      name: {
        zhCn: '北京',
        en: 'Beijing',
      },
      lat: 39.9042,
      lng: 116.4074,
    },
    photos: [
      {
        location: {
          zhCn: '地铁广告',
          en: 'Subway Advertisement',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/7.jpg',
      },
      {
        location: {
          zhCn: '车站广告',
          en: 'Station Advertisement',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/4.jpg',
      },
      {
        location: {
          zhCn: '影院布置',
          en: 'Cinema Decorations',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/2.jpg',
      },
      {
        location: {
          zhCn: '影院布置',
          en: 'Cinema Decorations',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/3.jpg',
      },
      {
        location: {
          zhCn: '影院布置',
          en: 'Cinema Decorations',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/5.jpg',
      },
      {
        location: {
          zhCn: '寄语',
          en: 'A Message',
        },
        time: '2021',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event3/6.jpg',
      },
    ],
  },
  {
    id: 'pikachu_costume',
    category: 'activity',
    title: {
      zhCn: '深圳｜卓悦汇宝可梦见面会',
      en: 'SHENZHEN | POKEMON MEET-AND-GREET AT ONE AVENUE',
    },
    mapLabel: {
      zhCn: '深圳',
      en: 'Shenzhen',
    },
    date: '2020',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/poke_event1/DSC00981.jpg',
    location: {
      id: 'guangdong',
      name: {
        zhCn: '广东',
        en: 'Guangdong',
      },
      lat: 23.1291,
      lng: 113.2644,
    },
    photos: [
      {
        location: {
          zhCn: '车站广告',
          en: 'Station Advertisement',
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/1.jpg',
      },
      {
        location: {
          zhCn: '活动现场',
          en: 'Event Venue',
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/2.mp4',
      },
      {
        location: {
          zhCn: '活动现场',
          en: 'Event Venue',
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/00020 IMG_0456.JPEG',
      },
      {
        location: {
          zhCn: '皮卡丘人偶服',
          en: 'Pikachu Mascot Costume',
        },
        time: '2020',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/00019 IMG_0450.JPEG',
      },
      {
        location: {
          zhCn: '皮卡丘人偶服',
          en: 'Pikachu Mascot Costume',
        },
        time: '2020',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/DSC00981.jpg',
      },
      {
        location: {
          zhCn: '皮卡丘人偶服',
          en: 'Pikachu Mascot Costume',
        },
        time: '2020',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/DSC01026.jpg',
      },
      {
        location: {
          zhCn: '皮卡丘人偶服',
          en: 'Pikachu Mascot Costume',
        },
        time: '2020',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/DSC01074.jpg',
      },
      {
        location: {
          zhCn: '皮卡丘人偶服',
          en: 'Pikachu Mascot Costume',
        },
        time: '2020',
        device: 'iPhone 12 mini',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/00018 IMG_0446.JPEG',
      },
      {
        location: {
          zhCn: '第二天腾讯举办的比赛',
          en: 'The Tournament Hosted by Tencent the Next Day',
        },
        time: '2020',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/poke_event1/DSC01166.jpg',
      },
    ],
  },
  {
    id: 'dyna_gaia',
    category: 'activity',
    title: {
      zhCn: '武汉｜戴拿&盖亚奥特曼见面会',
      en: 'WUHAN | ULTRAMAN DYNA & GAIA MEET-AND-GREET',
    },
    mapLabel: {
      zhCn: '武汉',
      en: 'Wuhan',
    },
    date: '2023',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_0508.JPG',
    location: {
      id: 'hubei',
      name: {
        zhCn: '湖北',
        en: 'Hubei',
      },
      lat: 30.5928,
      lng: 114.3055,
    },
    photos: [
      {
        location: {
          zhCn: '盖亚',
          en: 'Ultraman Gaia',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_0508.JPG',
      },
      {
        location: {
          zhCn: '盖亚',
          en: 'Ultraman Gaia',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_8549.JPG',
      },
      {
        location: {
          zhCn: '戴拿',
          en: 'Ultraman Dyna',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_8545.JPG',
      },
      {
        location: {
          zhCn: '戴拿',
          en: 'Ultraman Dyna',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_8546.JPG',
      },
      {
        location: {
          zhCn: '戴拿',
          en: 'Ultraman Dyna',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_0509.jpg',
      },
      {
        location: {
          zhCn: '戴拿',
          en: 'Ultraman Dyna',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_8547.JPG',
      },
      {
        location: {
          zhCn: '戴拿',
          en: 'Ultraman Dyna',
        },
        time: '2026',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanDynaGaia/IMG_8548.JPG',
      },
    ],
  },
  {
    id: 'ginga',
    category: 'activity',
    title: {
      zhCn: '深圳｜银河奥特曼见面会',
      en: 'SHENZHEN | ULTRAMAN GINGA MEET-AND-GREET',
    },
    mapLabel: {
      zhCn: '深圳',
      en: 'Shenzhen',
    },
    date: '2021',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8558.jpg',
    location: {
      id: 'guangdong',
      name: {
        zhCn: '广东',
        en: 'Guangdong',
      },
      lat: 23.1291,
      lng: 113.2644,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8552.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8553.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8554.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8555.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8556.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8557.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8558.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8559.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanGinga/IMG_8560.jpg',
      },
    ],
  },
  {
    id: 'zet',
    category: 'activity',
    title: {
      zhCn: '深圳｜泽塔奥特曼见面会',
      en: 'SHENZHEN | ULTRAMAN Z MEET-AND-GREET',
    },
    mapLabel: {
      zhCn: '深圳',
      en: 'Shenzhen',
    },
    date: '2021',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01949.jpg',
    location: {
      id: 'guangdong',
      name: {
        zhCn: '广东',
        en: 'Guangdong',
      },
      lat: 23.1291,
      lng: 113.2644,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01919.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01949.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01951.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01955.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01957.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01965.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC01969.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02010.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02023.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02054.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02055.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02063.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02069.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02075.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02107.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02115.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02120.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02126.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02132.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02148.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02168.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02175.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02182.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02198.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02227.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02242.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZ/DSC02251.jpg',
      },
    ],
  },
  {
    id: 'zero',
    category: 'activity',
    title: {
      zhCn: '深圳｜赛罗奥特曼见面会',
      en: 'SHENZHEN | ULTRAMAN ZERO MEET-AND-GREET',
    },
    mapLabel: {
      zhCn: '深圳',
      en: 'Shenzhen',
    },
    date: '2021',
    tagline: {
      zhCn: '',
      en: '',
    },
    img: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02578.jpg',
    location: {
      id: 'guangdong',
      name: {
        zhCn: '广东',
        en: 'Guangdong',
      },
      lat: 23.1291,
      lng: 113.2644,
    },
    photos: [
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02359.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02363.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02368.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02369.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02387.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02406.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02407.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02411.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02414.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02436.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02448.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02452.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02500.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02516.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02545.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02578.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02583.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02587.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02596.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02615.jpg',
      },
      {
        location: {
          zhCn: '',
          en: '',
        },
        time: '2021',
        device: 'Sony RX100M6',
        url: 'https://assets.anuluca.com/Flanerie/events/ultramanZero/DSC02621.jpg',
      },
    ],
  },
] as const

export default events
