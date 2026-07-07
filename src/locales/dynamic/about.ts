import PokeAmice from '@/assets/img/about/pokeAmice.png'

const aboutDynamic = {
  neighbours: [
    {
      name: 'DRRR情报屋',
      url: 'https://DRRR.anuluca.com',
      logo: 'https://assets.anuluca.com/Logo/drrrfavicon.svg',
      description: '《无头骑士异闻录》关系网｜非官方档案站',
    },
    {
      name: 'Poke Amice 宝可梦友会',
      url: 'http://pokeamice.com',
      logo: PokeAmice,
      description:
        '此处是由一位业余宝可梦爱好者Asimov创建的宝可梦全栈资料整理站点&个人研究据点。',
    },
  ],
  changelogs: [
    {
      version: 'v1.1',
      date: '2026-07-08',
      title: {
        zhCn: '内容更新：旅程、工具',
        en: 'CONTENT UPDATE: FLÂNERIE & TOOLS',
      },
      details: [
        {
          zhCn: '新增旅程：__"长沙"__、__"湘潭"__、__"韶山"__、__"安庆"__、__"池州"__、__"黄山"__、__"重庆"__、__"抚州"__、__"景德镇"__、__"庐山"__、__"东林大佛"__、__"鄱阳湖"__、__"福州"__、__"上海"__、__"南昌"__、__"武汉"__、__"深圳"__、__"卓悦汇宝可梦见面会"__、__"武汉超级赛"__、__"《宝可梦：可可》首映会"__、__"戴拿&盖亚奥特曼见面会"__、__"银河奥特曼见面会"__、__"泽塔奥特曼见面会"__、__"赛罗奥特曼见面会"__；',
          en: 'Added journeys: __"Changsha"__, __"Xiangtan"__, __"Shaoshan"__, __"Anqing"__, __"Chizhou"__, __"Huangshan"__, __"Chongqing"__, __"Fuzhou, Jiangxi"__, __"Jingdezhen"__, __"Lushan"__, __"Donglin Buddha"__, __"Poyang Lake"__, __"Fuzhou, Fujian"__, __"Shanghai"__, __"Nanchang"__, __"Wuhan"__, __"Shenzhen"__, __"Pokémon Meet-and-Greet at UpperHills"__, __"Wuhan Super Tournament"__, __"Pokémon the Movie: Secrets of the Jungle Premiere"__, __"Ultraman Dyna & Gaia Meet-and-Greet"__, __"Ultraman Ginga Meet-and-Greet"__, __"Ultraman Z Meet-and-Greet"__, and __"Ultraman Zero Meet-and-Greet"__;',
        },
        {
          zhCn: '新增工具：__「弹力球」__；',
          en: 'Added tool: __"Bouncy Ball"__;',
        },
        {
          zhCn: '新增__旅程地图__；',
          en: 'Added the __Journey Map__;',
        },
        {
          zhCn: '新增__「热情红」__品牌色彩介绍',
          en: 'Added an introduction to the __"Passion Red"__ brand color.',
        },
        {
          zhCn: '新增__当前工作状态__模块',
          en: 'Added the __Current Work Status__ section.',
        },
        {
          zhCn: '多项过渡动画效果重做',
          en: 'Redesigned and reimplemented several transition animations.',
        },
        {
          zhCn: '移除无用样式变量和代码清理',
          en: 'Removed unused style variables and cleaned up the codebase.',
        },
        {
          zhCn: '诸多bug修复、细节增补、整体性能优化',
          en: 'Numerous bug fixes, detail refinements, and overall performance improvements.',
        },
      ],
    },
    {
      version: 'v1.0',
      codename: 'GOLIATH',
      date: '2026-06-25',
      title: {
        zhCn: '「主页」「作品集」「旅程」「工具」「关于」页面上线',
        en: 'HOME, ARCHIVE, FLÂNERIE, CRAFT & ABOUT PAGES LAUNCHED',
      },
      details: [
        {
          zhCn: '__「首页」__页面上线',
          en: 'Launched the __Home__ page.',
        },
        {
          zhCn: '__「作品集」__页面上线，同步上线__目前为止所有项目作品__的数据展示',
          en: 'Launched the __Archive__ page, including data for __all projects completed to date__.',
        },
        {
          zhCn: '__「旅程」__页面上线，同步上线__"平潭岛"__、__"南京"__、__"新加坡"__、__"九江"__、__"苏州"__四个城市的记录',
          en: 'Launched the __Flânerie__ page with records from __"Pingtan Island"__, __"Nanjing"__, __"Singapore"__, __"Jiujiang"__, and __"Suzhou"__.',
        },
        {
          zhCn: '__「工具」__页面上线，同步上线__配色提取器__、__可视化贝塞尔曲线调整__、__HTML常用转义字符__、__BASE64加解密__、__图片转Base64__、__节拍器__工具',
          en: 'Launched the __Craft__ page with the __Color Palette Extractor__, __Visual Bézier Curve Editor__, __HTML Entity Reference__, __Base64 Encoder/Decoder__, __Image-to-Base64 Converter__, and __Metronome__.',
        },
        {
          zhCn: '__「关于」__页面上线',
          en: 'Launched the __About__ page.',
        },
        {
          zhCn: '诸多bug修复、细节增补、整体性能优化',
          en: 'Numerous bug fixes, detail refinements, and overall performance improvements.',
        },
      ],
    },
    {
      version: 'v0.4-alpha',
      date: '2026-01-21',
      title: {
        zhCn: '完成项目整体设计、自动化部署配置、各项技术栈选型与注入',
        en: 'COMPLETED THE OVERALL DESIGN, AUTOMATED DEPLOYMENT, AND TECHNOLOGY STACK SETUP',
      },
      details: [
        {
          zhCn: '完成项目整体设计风格开发及移动端适配调试；',
          en: 'Completed the overall visual design and mobile adaptation;',
        },
        {
          zhCn: '对elementPlus常用组件进行__样式覆盖__；',
          en: 'Added __custom style overrides__ for commonly used Element Plus components;',
        },
        {
          zhCn: '项目使用__Cloudflare R2__作为图片托管，使用__Cloudflare Page__服务管理域名；',
          en: 'Configured __Cloudflare R2__ for image hosting and __Cloudflare Pages__ for deployment and domain management;',
        },
        {
          zhCn: '项目使用__postcss-pxtorem__完成响应式布局。',
          en: 'Implemented responsive layouts with __postcss-pxtorem__.',
        },
        {
          zhCn: '支持中英双语与暗色与浅色两种模式。',
          en: 'Added Chinese and English localization plus dark and light themes.',
        },
        {
          zhCn: '诸多bug修复、细节增补、整体性能优化',
          en: 'Numerous bug fixes, detail refinements, and overall performance improvements.',
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
          zhCn: '项目初始化，从 __MegaAnuluca__ 继承项目，删减无用内容以便二次开发；',
          en: 'Initialized the project from __MegaAnuluca__ and removed unused content for further development;',
        },
        {
          zhCn: '引入 __Pinia store__ 进行静态数据管理；',
          en: 'Introduced __Pinia Store__ for static data management;',
        },
        {
          zhCn: '代码结构优化，完成项目框架搭建。',
          en: 'Optimized the code structure and completed the application scaffold.',
        },
        {
          zhCn: '诸多bug修复、细节增补、整体性能优化',
          en: 'Numerous bug fixes, detail refinements, and overall performance improvements.',
        },
      ],
    },
  ],
} as const

export default aboutDynamic
