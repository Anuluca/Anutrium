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
    models: {
      zhCn: '三维模型资源鸣谢',
      en: '3D MODEL CREDITS',
    },
    lucario: { zhCn: '路卡利欧', en: 'Lucario' },
    modelSource: { zhCn: '三维模型来源', en: '3D Model Source' },
    repository: { zhCn: '资源仓库', en: 'Repository' },
    originalIP: { zhCn: '宝可梦原始知识产权', en: 'Original Pokémon IP' },
    thanks: { zhCn: '特别鸣谢', en: 'SPECIAL THANKS' },
    huahua: { zhCn: '花花', en: 'Huahua' },
  },
  assetCredits: {
    title: { zhCn: '开源素材使用声明', en: '' },
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
    lucario: {
      zhCn: '路卡利欧（Lucario）模型：个人海湾页面的模型取自 Pokémon 3D API 的公开资源仓库（编号 448），本站对模型进行了姿势、网格与材质展示处理，上游仓库提供 MIT 许可。宝可梦模型的权利归属于 Nintendo、Creatures Inc. 与 GAME FREAK inc.。本站为个人创作展示，与上述权利方不存在官方合作、赞助或背书关系。',
      en: '',
    },
    source: { zhCn: '项目来源', en: 'Project source' },
    license: { zhCn: '许可文本', en: 'License text' },
    official: { zhCn: '官方发布说明', en: 'Official announcement' },
    modelSource: { zhCn: '模型来源与权利说明', en: 'Model source and credits' },
  },
  dynamic,
} as const

export default about
