const aboutDynamic = {
  changelogs: [
    {
      version: 'v1.0',
      codename: 'GOLIATH',
      date: '2026-06-25',
      title: {
        zhCn: '内容更新：旅程、工具',
        en: 'CONTENT UPDATE: FLÂNERIE AND TOOLS',
      },
      details: [
        {
          zhCn: '新增工具：弹力球',
          en: 'Added the Bounce Dynamics tool.',
        },
        {
          zhCn: '新增旅程：南京、九江、新加坡',
          en: 'Added travel logs for Nanjing; Jiujiang; Singapore.',
        },
        {
          zhCn: '新增旅程地图',
          en: 'Added an interactive travel map.',
        },
        {
          zhCn: '关于页新增#E23456品牌色彩介绍',
          en: 'Added #E23456 Brand Color Explaination in the About page.',
        },
      ],
    },
    {
      version: 'v0.4-alpha',
      codename: 'MIRAGE',
      date: '2026-01-21',
      title: {
        zhCn: '代码结构优化',
        en: 'CODEBASE OPTIMIZATION',
      },
      details: [
        {
          zhCn: '引入 Pinia store 进行静态数据管理',
          en: 'Introduced a Pinia store for centralized static data management.',
        },
      ],
    },
    {
      version: 'v0.1-alpha',
      codename: null,
      date: '2025-12-18',
      title: {
        zhCn: '项目初始化',
        en: 'PROJECT INITIALIZATION',
      },
      details: [
        {
          zhCn: '项目初始化，从 MegaAnuluca 继承项目，删减无用内容以便二次开发',
          en: 'Initialized the project from MegaAnuluca and removed unused content for further development.',
        },
      ],
    },
  ],
} as const

export default aboutDynamic
