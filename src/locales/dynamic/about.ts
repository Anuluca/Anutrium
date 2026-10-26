import PokeAmice from '@/assets/img/about/pokeAmice.png'

const aboutDynamic = {
  roadmap: [
    {
      zhCn: '__「宝可后院」__大模块',
      en: '__"POKEYARD"__ page',
    },
    {
      zhCn: '二级模块 UI 简化',
      en: 'UI simplification for secondary modules',
    },
  ],
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
      description: 'Asimov的宝可梦资料整理&个人研究据点。',
    },
  ],
  changelogs: [
    {
      version: 'v2.1',
      published: false,
      date: '2026-10-26',
      title: {
        zhCn: 'Floratrium 相册更新',
        en: 'FLORATRIUM ALBUM UPDATE',
      },
      details: [
        {
          zhCn: '新增__ATRIUM 模块__，新增__想法、笔记与宅__三个模块',
          en: 'Added the __ATRIUM__ module with three new sub-modules: __Ideas, Notes, and Otaku__.',
        },
        {
          zhCn: 'Floratrium 新增__【花花的邻居们】相册__，花花相册新增__按文件名日期划分的四个成长阶段__。',
          en: 'Added the __"Neighbors of Floratrium"__ album to Floratrium, and the Floratrium album now includes __four growth stages divided by file name dates__.',
        },
        {
          zhCn: '首页新增__禅模式（Zen Mode）__：点击顶部 Logo 进入，点击页面或按 __Esc__ 即可退出。',
          en: 'Added a __Zen Mode__ to the home page: click the top logo to enter, and click anywhere on the page or press __Esc__ to exit.',
        },
        {
          zhCn: '优化__首页三维场景（3D Scene）渲染__、优化__场景资源加载与复用__、降低__交互与页面合成开销__。',
          en: 'Optimized __3D scene rendering__ on the home page, improved __scene resource loading and reuse__, and reduced __interaction and page compositing overhead__.',
        },
        {
          zhCn: '新增旅程：__"青阳"__、__"赣州"__、__"汕头"__、__"潮州"__、__"广州"__；',
          en: 'Added journeys: __"Qingyang"__, __"Ganzhou"__, __"Shantou"__, __"Chaozhou"__, and __"Guangzhou"__;',
        },
      ],
    },
    {
      version: 'v2.0',
      codename: 'MIRAGE',
      date: '2026-10-23',
      title: {
        zhCn: '3D场景交互升级，「花花小窝」页面正式上线',
        en: '3D SCENE INTERACTION UPDATE & 「花花小窝」页面 LAUNCH',
      },
      details: [
        {
          zhCn: '重构__首页与二级页面的空间交互体系__：以实时渲染的三维场景（3D Scene）与模型交互承载内容入口，统一场景导航、视角切换与页面过渡；',
          en: 'Rebuilt the __spatial interaction system for the home and secondary pages__: real-time 3D scenes and interactive models now serve as content entry points, with unified scene navigation, camera transitions, and page transitions;',
        },
        {
          zhCn: '__「花花小窝」页面__开发完成并正式上线：支持查看宠物信息、浏览相册与视频，并可点击喜爱为宠物增加喜爱数；',
          en: '__「花花小窝」页面__ is complete and now live: view pet profiles, browse photos and videos, and show affection with the like button;',
        },
        {
          zhCn: '__「创作」页面__开发完成并正式上线：包含__摄影、绘画、设计创作与工具__模块，支持浏览摄影与绘画作品、查看绘画过程及设计作品详情，并使用实用工具；',
          en: 'The __Creative page__ is complete and now live, featuring __Photography, Illustration, Design, and Craft__ sections: browse photography and illustrations, view drawing processes and design details, and access practical tools;',
        },
        {
          zhCn: '__「关于」页__新增__制作人员与资源鸣谢__展示，集中介绍项目制作分工与所用资源的作者及来源；',
          en: 'Added __production credits and resource acknowledgements__ to the __About__ page, highlighting production roles and the creators and sources of project resources;',
        },
        {
          zhCn: '新增首页__路卡利欧「头疼模式」__，丰富模型的动作表现与交互反馈；',
          en: 'Added __Lucario’s "Headache Mode"__ to the home scene, expanding model animations and interaction feedback;',
        },
        {
          zhCn: '__旅程地图__接入__OpenStreetMap__，完善地图浏览体验；',
          en: 'Integrated __OpenStreetMap__ into the __Journey Map__ to improve map browsing;',
        },
        {
          zhCn: '接入__Steam Web API__，支持展示Steam游戏库信息；',
          en: 'Integrated the __Steam Web API__ to display Steam library information;',
        },
        {
          zhCn: '接入__Google Analytics 4（GA4）__，支持网站浏览量统计与访问数据分析；',
          en: 'Integrated __Google Analytics 4 (GA4)__ for page-view tracking and traffic analysis;',
        },
        {
          zhCn: '优化全站__UI、操作流程与移动端适配__，完善布局、交互反馈和细节表现。',
          en: 'Refined the site-wide __user interface (UI), interaction flows, and mobile layouts__, improving layout consistency, interaction feedback, and visual details.',
        },
      ],
    },
    {
      version: 'v1.2',
      date: '2026-09-24',
      title: {
        zhCn: '交互设计更新，对性能大幅优化',
        en: '',
      },
      details: [
        {
          zhCn: '完成__全站性能优化__：重构关键渲染与资源加载流程，减少首屏等待与运行时开销，提升页面响应速度和滚动流畅度；',
          en: 'Completed __site-wide performance optimizations__: refactored critical rendering and asset-loading workflows to reduce initial load times and runtime overhead while improving responsiveness and scrolling performance;',
        },
        {
          zhCn: '完成__交互设计更新__：统一导航、页面过渡、模块动效与操作反馈，并优化桌面端和移动端的交互体验；',
          en: 'Completed an __interaction design update__: unified navigation, page transitions, module animations, and interaction feedback while refining the experience across desktop and mobile;',
        },
        {
          zhCn: '新增十二星宿轮盘背景、重做首页、关于页、主要标题组件、次要标题组件、通用页脚组件设计',
          en: '',
        },
        {
          zhCn: '新增旅程：__"蔡依林PLEASURE TOUR"__、__"张学友60+演唱会"__',
          en: '',
        },
        {
          zhCn: '新增花花页面跳转模块',
          en: '',
        },
        {
          zhCn: '诸多bug修复、细节增补、整体性能优化',
          en: 'Numerous bug fixes, detail refinements, and overall performance improvements.',
        },
      ],
    },
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
