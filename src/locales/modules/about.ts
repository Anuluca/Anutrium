import dynamic from '../dynamic/about'

const about = {
  brandColorName: {
    zhCn: '热情红',
    en: 'PASSION RED',
  },
  changelogTagLabel: {
    zhCn: '更新日志',
    en: 'CHANGELOG',
  },
  majorUpdateLabel: {
    zhCn: '重大更新',
    en: 'MAJOR UPDATE',
  },
  latestLabel: 'LATEST',
  roadmapTagLabel: {
    zhCn: '未来更新',
    en: 'ROADMAP',
  },
  crewTagLabel: {
    zhCn: '制作人员',
    en: 'CREDITS',
  },
  staff: {
    roles: {
      originalConcept: {
        zhCn: '总导演',
        en: 'GENERAL DIRECTOR',
      },
      creativeDirection: {
        zhCn: '技术架构',
        en: 'TECHNICAL ARCHITECTURE',
      },
      visualDesign: { zhCn: '视觉设计', en: 'VISUAL DESIGN' },
      engineering: {
        zhCn: 'WEB 开发',
        en: 'WEB DEVELOPMENT',
      },
      motion: {
        zhCn: '交互与动态设计',
        en: 'INTERACTION & MOTION DESIGN',
      },
      photography: { zhCn: '摄影与创作', en: 'PHOTOGRAPHY & CREATION' },
      editorial: {
        zhCn: '文案与内容编辑',
        en: 'WRITING & EDITORIAL',
      },
      maintenance: {
        zhCn: '内容维护',
        en: 'CONTENT MAINTENANCE',
      },
    },
    ai: {
      zhCn: '人工智能辅助开发',
      en: 'AI DEVELOPMENT ASSISTANCE',
    },
    typefaces: {
      zhCn: '字体设计鸣谢',
      en: 'TYPEFACE CREDITS',
    },
    unbounded: { zhCn: '标小智无界黑', en: 'Unbounded Sans' },
    alibaba: { zhCn: '阿里巴巴普惠体', en: 'Alibaba PuHuiTi' },
    unboundedAuthors: {
      zhCn: '无界黑项目作者与贡献者',
      en: 'Unbounded Sans Project Authors',
    },
    alibabaAuthors: {
      zhCn: '阿里巴巴 · 汉仪字库',
      en: 'Alibaba · Hanyi Fonts',
    },
    thanks: { zhCn: '特别鸣谢', en: 'SPECIAL THANKS' },
    huahua: { zhCn: '花花', en: 'Flora' },
  },
  originalDesign: {
    title: { zhCn: '原创设计使用声明', en: 'Original Design Usage Notice' },
    restriction: {
      zhCn: '本站由 Anuluca 独立设计与开发，原创内容包括页面布局、视觉元素、交互编排、动态效果及原创文案。欢迎分享本站链接与页面截图，但不得将本站设计或内容冒充为自己的作品。未经授权，请勿复制或再分发本站设计资源，将其用于网站模板、商业项目、产品包装或其他设计作品。禁止将本站原创设计（包括页面截图、布局与视觉元素）输入人工智能（AI）工具，用于生成网站或平面设计。其他使用需求请先联系作者，说明用途与使用范围。本站使用的第三方字体、模型及其他素材，其权利归各自权利人所有，具体使用条件以对应授权与许可为准。',
      en: 'This site is independently designed and developed by Anuluca. Original work includes page layouts, visual elements, interaction sequences, motion effects, and original copy. You are welcome to share links to this site and screenshots of its pages, but do not present this site’s design or content as your own work. Without permission, do not copy or redistribute this site’s design resources for website templates, commercial projects, product packaging, or other design work. Do not input this site’s original design, including page screenshots, layouts, or visual elements, into artificial intelligence (AI) tools to generate websites or graphic designs. For other uses, contact the author first and specify the intended purpose and scope. Third-party fonts, models, and other assets remain the property of their respective rights holders and are subject to their applicable permissions and licenses.',
    },
  },
  assetCredits: {
    title: { zhCn: '开源素材使用声明', en: '' },
    intro: {
      zhCn: '以下列出本站使用的字体素材，并说明其来源、许可及相关权利归属。',
      en: 'The following lists the fonts used on this site, together with their sources, licenses, and relevant rights information.',
    },
    unbounded: {
      zhCn: 'UnboundedSans（标小智无界黑）：本站标题使用的字体，基于 Dela Gothic One 衍生并补充简体中文字符，由无界黑项目作者与贡献者维护，标小智支持该项目。字体采用 SIL 开源字体许可证（SIL Open Font License，OFL）1.1 发布，允许按许可使用、嵌入、修改与再分发，包括商业用途；字体本身不得单独出售，再分发须保留版权与许可信息。相关权利归原作者及权利人所有。',
      en: '',
    },
    anton: {
      zhCn: 'Anton：本站使用的拉丁字母展示字体，由 Vernon Adams 设计，版权声明署名为 The Anton Project Authors。字体采用 SIL Open Font License 1.1 发布，使用与再分发须遵守该许可，保留版权声明及许可文本，不得将字体本身单独出售。',
      en: '',
    },
    alibaba: {
      zhCn: 'alibaba-puhuiti（阿里巴巴普惠体）：本站正文与界面文字使用的字体，由阿里巴巴发布，按其官方字体法律声明提供免费商用授权。字体版权及相关权利仍归相应权利人所有；使用范围和限制以官方授权文件为准。',
      en: '',
    },
    source: { zhCn: '项目来源', en: 'Project source' },
    license: { zhCn: '许可文本', en: 'License text' },
    official: { zhCn: '官方发布说明', en: 'Official announcement' },
  },
  dynamic,
} as const

export default about
