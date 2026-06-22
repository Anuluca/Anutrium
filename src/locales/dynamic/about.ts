const aboutDynamic = {
  changelogs: [
    {
      version: 'v1.0',
      codename: 'GOLIATH',
      date: '2026-06-06',
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
        {
          zhCn: '引入星空背景',
          en: 'Added the starfield background.',
        },
        {
          zhCn: '新增语言与主题切换功能',
          en: 'Added language and theme switching.',
        },
        {
          zhCn: '优化项目资源结构与代码复用性',
          en: 'Reorganized project assets and improved code reuse.',
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
        {
          zhCn: '确立以「投影」为核心的品牌风格，强调整体呼吸感，采用空洞与黑洞两种主题风格',
          en: 'Established a projection-centered brand direction with generous visual breathing room and Void and Black Hole themes.',
        },
        {
          zhCn: '添加路由，完成项目 Netlify 自动化部署，并使用 Cloudflare 提供域名管理',
          en: 'Added routing, configured automated Netlify deployment, and set up Cloudflare domain management.',
        },
      ],
    },
  ],
} as const

export default aboutDynamic
