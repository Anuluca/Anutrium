const aboutDynamic = {
  changelogs: [
    {
      version: 'v1.1',
      date: '2026-06-25',
      title: {
        zhCn: '内容更新：旅程、工具',
        en: '',
      },
      details: [
        {
          zhCn: '新增旅程：__"长沙"__、__"湘潭"__、__"韶山"__、__"安庆"__、__"池州"__、__"黄山"__、__"重庆"__、__"抚州"__、__"景德镇"__、__"庐山"__、__"东林大佛"__、__"鄱阳湖"__、__"福州"__、__"上海"__；',
          en: '',
        },
        {
          zhCn: '新增工具：__「弹力球」__；',
          en: '',
        },
        {
          zhCn: '新增__旅程地图__；',
          en: '',
        },
        {
          zhCn: '新增__「热情红」__品牌色彩介绍',
          en: '',
        },
        {
          zhCn: '新增__当前工作状态__模块',
          en: '',
        },
      ],
    },
    {
      version: 'v1.0',
      codename: 'GOLIATH',
      date: '2026-06-25',
      title: {
        zhCn: '「主页」「作品集」「旅程」「工具」「关于」页面上线',
        en: '',
      },
      details: [
        {
          zhCn: '__「首页」__页面上线',
          en: '',
        },
        {
          zhCn: '__「作品集」__页面上线，同步上线__目前为止所有项目作品__的数据展示',
          en: '',
        },
        {
          zhCn: '__「旅程」__页面上线，同步上线__"平潭岛"__、__"南京"__、__"新加坡"__、__"九江"__、__"苏州"__四个城市的记录',
          en: '',
        },
        {
          zhCn: '__「工具」__页面上线，同步上线__CSS调色盘__、__可视化贝塞尔曲线调整__、__HTML常用转义字符__、__BASE64加解密__、__图片转Base64__、__节拍器__工具',
          en: '',
        },
        {
          zhCn: '__「关于」__页面上线',
          en: '',
        },
      ],
    },
    {
      version: 'v0.4-alpha',
      date: '2026-01-21',
      title: {
        zhCn: '完成项目整体设计、自动化部署配置、各项技术栈选型与注入',
        en: '',
      },
      details: [
        {
          zhCn: '完成项目整体设计风格开发及移动端适配调试；',
          en: '',
        },
        {
          zhCn: '对elementPlus常用组件进行样式覆盖；',
          en: '',
        },
        {
          zhCn: '项目使用__Cloudflare R2__作为图片托管，使用Cloudflare Page服务管理域名；',
          en: '',
        },
        {
          zhCn: '项目使用postcss-pxtorem完成响应式布局。',
          en: '',
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
          en: '',
        },
        {
          zhCn: '引入 __Pinia store__ 进行静态数据管理；',
          en: '',
        },
        {
          zhCn: '代码结构优化，完成项目框架搭建。',
          en: '',
        },
      ],
    },
  ],
} as const

export default aboutDynamic
