const bottomLine = {
  intro: 'DRIVEN BY PASSION.',
  lastUpdate: import.meta.env.VITE_LAST_UPDATE,
  rants: [
    {
      zhCn: '这个时代的DJ REMIX会不会多过头了',
      en: 'ARE THERE TOO MANY DJ REMIXES THESE DAYS?',
    },
    {
      zhCn: '不要暂停我的音乐',
      en: "DON'T PAUSE MY MUSIC",
    },
    {
      zhCn: '正因为有各种各样的想法，世界才会变得更加广阔。',
      en: 'THE WORLD GROWS WIDER BECAUSE OF ALL THE DIFFERENT IDEAS IN IT.',
    },
  ],
  recommand: [
    {
      title: {
        zhCn: 'DRRR情报屋2.0上线',
        en: 'DRRR INTELLIGENCE ROOM 2.0',
      },
      sort: '',
      color: '#F2F347',
      date: '2026/09/16',
      href: 'https://drrr.anuluca.com',
      img: 'https://assets.anuluca.com/other/27b03fd3-077d-44ae-8965-f0fd0317621e.jpg',
    },
    {
      title: { zhCn: '新加坡', en: 'SINGAPORE' },
      sort: { zhCn: '旅程', en: 'FLÂNERIE' },
      color: '#D04B33',
      date: '2026/06/25',
      href: '/flanerie/singapore',
      img: 'https://assets.anuluca.com/Flanerie/cities/singapore/f1ae5f2f-5d6d-422e-b4ef-475a20c31484 (1).png',
    },
    {
      title: { zhCn: '庐山', en: 'LUSHAN' },
      sort: { zhCn: '旅程', en: 'FLÂNERIE' },
      color: '#D04B33',
      date: '2026/06/25',
      href: '/flanerie/lushan',
      img: 'https://assets.anuluca.com/Flanerie/cities/lushan/DSC07767.jpg',
    },
    {
      title: { zhCn: '弹力球', en: 'BOUNCING BALL' },
      sort: { zhCn: '工具', en: 'TOOL' },
      color: '#3C5DE8',
      date: '2026/01/21',
      href: '/bounceDynamics',
    },
    {
      title: { zhCn: '节拍器', en: 'METRONOME' },
      sort: { zhCn: '工具', en: 'TOOL' },
      color: '#E23456',
      date: '2026/01/21',
      href: '/metronome',
    },
  ],
} as const

export default bottomLine
