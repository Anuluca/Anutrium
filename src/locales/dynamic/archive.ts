const archiveDynamic = {
  WebArchives: [
    {
      id: 'W001',
      confidential: true,
      title: {
        zhCn: '国家电网无人机巡检系统',
        en: 'STATE GRID UAV SYSTEM',
      },
      participation: 50,
      time: '2023_12 to 2024_08',
      company: {
        zhCn: '国家电网',
        en: 'State_Grid_Corporation_of_China',
      },
      tags: ['VUE3', 'ELEMENTPLUS', 'ECHARTS', 'WEBGL', 'SGMAP'],
      img: 'https://assets.anuluca.com/other/G.jpg',
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '以无人机覆盖飞行、AI 分析、缺陷研判、实时传图、实时预警告警、工单推送提升江西电网供电巡检效率。',
        en: 'Improves Jiangxi power-grid inspection efficiency through UAV coverage flights, AI analysis, defect assessment, real-time image transfer, live alerts, and work-order dispatch.',
      },
      images: [
        'https://assets.anuluca.com/other/7c83cb8a-d86a-42a8-9310-e136acbea961.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.51.24.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.51.08.jpg',
        'https://assets.anuluca.com/other/yujinggaojinggongdan.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '新闻报道',
          en: 'News report',
        },
        {
          zhCn: '首页地图交互',
          en: 'Homepage map interaction',
        },
        {
          zhCn: '实时图片推送',
          en: 'Real-time image push',
        },
        {
          zhCn: '预警告警工单',
          en: 'Alert and warning work orders',
        },
      ],
      details: [
        {
          zhCn: '实现无人机飞行轨迹直播与大量地图交互能力，地图组件为公司基于思极地图自主研发，需在文档不完整的情况下持续对接联调。',
          en: 'Implemented live UAV flight-path tracking with extensive map interactions; the map component was an in-house Siji Map based system that required frequent integration work despite incomplete documentation.',
        },
        {
          zhCn: '基于 Vue 3 与 Element Plus 构建业务操作界面，支撑巡检任务、设备状态与数据看板等核心流程。',
          en: 'Built the business UI with Vue 3 and Element Plus, supporting core flows such as inspection tasks, device status, and data dashboards.',
        },
        {
          zhCn: '结合 ECharts 展示巡检统计、告警趋势与任务状态，让供电运维数据更适合快速研判。',
          en: 'Used ECharts to present inspection statistics, alert trends, and task states, making operation and maintenance data easier to assess quickly.',
        },
        {
          zhCn: '支持按文件夹批量上传图片，并依据文件夹结构与文件属性进行分类处理。',
          en: 'Supported batch image upload by folder and classified processing based on folder structure and file metadata.',
        },
        {
          zhCn: '提供图片标注功能，支撑巡检图像的问题定位、记录与后续分析流程。',
          en: 'Delivered image annotation features for issue localization, record keeping, and follow-up analysis in inspection images.',
        },
        {
          zhCn: '支持实时传图、实时预警告警。',
          en: 'Supported real-time image transfer plus real-time warning and alert workflows.',
        },
      ],
      links: [
        {
          label: {
            zhCn: '人民网报道',
            en: "People's Daily Report",
          },
          url: 'https://paper.people.com.cn/zgnyb/pc/content/202504/14/content_30068735.html',
          icon: 'Link',
        },
        {
          label: {
            zhCn: '新浪新闻报道',
            en: 'Sina News Report',
          },
          url: 'https://k.sina.com.cn/article_1699432410_v654b47da020018pgy.html',
          icon: 'Link',
        },
      ],
    },
    {
      id: 'W002',
      confidential: true,
      title: {
        zhCn: '变电驾驶舱（物联大屏）',
        en: 'SUBSTATION DIGITAL COCKPIT (IOT DASHBOARD)',
      },
      participation: 100,
      time: '2024_08 to 2025_03',
      company: {
        zhCn: '国家电网',
        en: 'State_Grid_Corporation_of_China',
      },
      tags: ['VUE3', 'ELEMENTPLUS', 'ECHARTS', 'WEBGL', 'SGMAP'],
      img: 'https://assets.anuluca.com/other/iShot_2026-06-04_23.49.55.jpg',
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '面向电力设备运维与物联感知场景，集中展示设备规模、运行状态、告警事件、检修计划与地图分布，帮助管理人员快速掌握生产运营全貌。',
        en: 'A cockpit for power-device operation and IoT sensing scenarios, centralizing device scale, runtime status, alerts, maintenance plans, and map distribution for fast production oversight.',
      },
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.49.55.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.50.18.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.52.50.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.53.12.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '原型1 - 大屏首页排版',
          en: 'Prototype 1 - Dashboard home layout',
        },
        {
          zhCn: '原型2 - 拓扑图数据展示',
          en: 'Prototype 2 - Topology data view',
        },
        {
          zhCn: '原型3 - 设备主人管理界面',
          en: 'Prototype 3 - Device owner management',
        },
        {
          zhCn: '原型4 - 地图层级交互',
          en: 'Prototype 4 - Map hierarchy interaction',
        },
      ],
      details: [
        {
          zhCn: '支持地图态势展示，可在行政区地图、变电站电网图、点位地图之间切换，呈现变电站、设备分布、在线监测和预警信息。',
          en: 'Supported map-based situational views across administrative maps, substation grid diagrams, and point maps to show substations, device distribution, online monitoring, and warning information.',
        },
        {
          zhCn: '基于 Vue3 与组件化 UI 框架搭建驾驶舱式后台界面，整合多达11项业务入口。',
          en: 'Built a cockpit-style backend interface with Vue 3 and a componentized UI framework, integrating up to 11 business entries.',
        },
        {
          zhCn: '使用 ECharts 构建折线图、柱状图、环形图、Top5 排名和告警统计图表，实现设备运行、终端类型、接入数量等数据可视化。',
          en: 'Used ECharts to build line charts, bar charts, donut charts, Top 5 rankings, and alert statistics for device operation, terminal type, and access-volume visualization.',
        },
        {
          zhCn: '与省公司平台对接接口获取气象预警等数据。',
          en: 'Integrated with provincial company platform APIs to retrieve data such as weather warnings.',
        },
        {
          zhCn: '页面采用大屏化视觉设计，支持切换主题，并且适配大屏与设备主人管理界面两种应用场景。',
          en: 'Designed a large-screen visual experience with theme switching, covering both command-screen views and device-owner management scenarios.',
        },
      ],
    },
    {
      id: 'W003',
      confidential: true,
      title: {
        zhCn: '数字化协同监督平台',
        en: 'DIGITAL SYNERGY SUPERVISION PLATFORM',
      },
      participation: 50,
      time: '2025_03 to 2026_01',
      company: {
        zhCn: '国家电网',
        en: 'State_Grid_Corporation_of_China',
      },
      tags: ['VUE3', 'ELEMENTPLUS', 'ECHARTS', 'SGMAP'],
      img: 'https://assets.anuluca.com/other/iShot_2026-06-04_23.48.12.jpg',
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '面向纪检监察与主动监督场景，整合案件档案、领导人员行为监督、用车核查与数据异常监测能力，借助AI大模型帮助监督人员发现线索、核查风险并形成闭环处置。',
        en: 'A supervision platform for discipline inspection and active oversight, integrating case archives, leadership behavior supervision, vehicle-use checks, and anomaly monitoring with AI-model assistance.',
      },
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.47.14.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.48.22.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.47.39.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.48.12.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '原型1 - 首页统计',
          en: 'Prototype 1 - Home statistics',
        },
        {
          zhCn: '原型2 - AI问答',
          en: 'Prototype 2 - AI Q&A',
        },
        {
          zhCn: '原型3 - 主动监督',
          en: 'Prototype 3 - Active supervision',
        },
        {
          zhCn: '原型4 - 违规用车定位',
          en: 'Prototype 4 - Illegal vehicle-use positioning',
        },
      ],
      details: [
        {
          zhCn: '集成公司自研光明大模型 AI 助手能力，支持法律法规查询、智能核查、历史对话和结果生成，用于辅助监督人员分析疑点线索。',
          en: 'Integrated the in-house Guangming large-model AI assistant for legal-regulation queries, intelligent checks, conversation history, and generated results to help supervisors analyze suspicious clues.',
        },
        {
          zhCn: '基于公司研发的电网地图api，实现车辆轨迹核查与车辆违规用车分析，通过路线回放、起终点标记、异常明细表和趋势图定位用车风险。',
          en: 'Used the company-developed power-grid map API to implement vehicle trajectory checks and illegal vehicle-use analysis with route replay, start/end markers, anomaly tables, and trend charts.',
        },
        {
          zhCn: '使用 ECharts 构建案件统计、线索统计、信访统计、异常趋势和分类占比等图表，提升监督数据的可读性。',
          en: 'Built case statistics, clue statistics, petition statistics, anomaly trends, and category-ratio charts with ECharts to improve supervision-data readability.',
        },
      ],
    },
    {
      id: 'W004',
      confidential: true,
      title: {
        zhCn: '国家电网RPA系统',
        en: 'STATE GRID RPA SYSTEM',
      },
      participation: 50,
      time: '2025_12 to 2025_12',
      company: {
        zhCn: '国家电网',
        en: 'State_Grid_Corporation_of_China',
      },
      tags: ['Vue2', 'ELEMENTUI', 'SASS', 'ECHARTS', 'TAILWINDCSS'],
      img: 'https://assets.anuluca.com/other/37fdd6dc419b49d785b9cb5d68aa6ef5.jpg',
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '从流程编排、监控大屏、主题适配、后台管理等开发。',
        en: 'Worked on process orchestration, monitoring dashboards, theme adaptation, and backend management modules.',
      },
      details: [
        {
          zhCn: '基于 Vue2 和 ElementUI 开发的流程编排面板，支持通过拖拽指令快速搭建 RPA 自动化任务。',
          en: 'Built a Vue 2 and ElementUI based process-orchestration panel that supports drag-and-drop commands for assembling RPA automation tasks.',
        },
        {
          zhCn: '利用 ECharts 构建机器人大屏，实时监控在线数量、执行成功率与任务积压等关键指标。',
          en: 'Used ECharts to build robot monitoring dashboards for online count, execution success rate, and task backlog metrics.',
        },
        {
          zhCn: '使用 SASS 深度定制 ElementUI 主题，适配国家电网的蓝白企业色与深浅模式切换。',
          en: 'Deeply customized the ElementUI theme with SASS to fit State Grid blue-white branding and light/dark mode switching.',
        },
        {
          zhCn: '通过 ElementUI 表格与表单高效实现机器人注册、任务调度、日志检索及权限管理。',
          en: 'Implemented robot registration, task scheduling, log search, and permission management efficiently through ElementUI tables and forms.',
        },
        {
          zhCn: '针对海量执行日志采用虚拟滚动与懒加载，配合 ECharts 的 dataZoom 实现大数据趋势图平滑浏览。',
          en: 'Optimized large execution-log browsing with virtual scrolling and lazy loading, plus ECharts dataZoom for smooth big-data trend charts.',
        },
      ],
    },
    {
      id: 'W005',
      title: {
        zhCn: '飞梭®智能文档认知平台',
        en: 'FINSENSE®',
      },
      participation: 50,
      time: '2022_01 to 2022_07',
      company: {
        zhCn: '文因互联',
        en: 'Memect_Technology_Co.',
      },
      tags: ['REACT', 'Antd', 'D3', 'PDF_VIEWER'],
      img: 'https://assets.anuluca.com/other/8320d930cbcf10286068ff0c86e76fda398.jpg',
      logo: 'https://assets.anuluca.com/other/130958568.jpg',
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_22.58.57.jpg',
      ],
      description: {
        zhCn: '面向金融文档场景的智能认知平台，将复杂文档转化为可审核、可分析的结构化数据。',
        en: 'An intelligent document cognition platform for financial-document scenarios, turning complex documents into reviewable and analyzable structured data.',
      },
      details: [
        {
          zhCn: '基于 React 与 Ant Design 构建文档认知工作台，承载文档上传、解析、审核与结果管理等核心流程。',
          en: 'Built a document-cognition workspace with React and Ant Design for document upload, parsing, review, and result management workflows.',
        },
        {
          zhCn: '接入 PDF Viewer 实现原文档在线预览，并支持在页面中同步展示识别结果、字段信息与结构化数据。',
          en: 'Integrated PDF Viewer for online original-document preview while synchronizing recognition results, field information, and structured data on the same page.',
        },
        {
          zhCn: '围绕智能文档认知场景，呈现从非结构化文档到可检索、可审核、可复用数据的处理链路。',
          en: 'Presented an end-to-end intelligent document cognition flow from unstructured documents to searchable, reviewable, and reusable data.',
        },
        {
          zhCn: '使用 D3 等可视化能力展示文档关系、字段关联与分析结果，让复杂文本信息更容易被业务人员理解。',
          en: 'Used D3 and visualization capabilities to show document relationships, field associations, and analysis results so business users could understand complex text information more easily.',
        },
        {
          zhCn: '界面强调“原文 + 抽取结果 + 审核操作”的并列展示，适合金融文档处理中的质控与人工复核场景。',
          en: 'Emphasized a side-by-side layout of original text, extraction results, and review actions for quality-control and manual-review scenarios in financial document processing.',
        },
      ],
      links: [
        {
          label: {
            zhCn: '项目官网',
            en: 'Project Website',
          },
          url: 'https://memect.cn/finsense/',
          icon: 'Link',
        },
        {
          label: {
            zhCn: '公司官网',
            en: 'Company Website',
          },
          url: 'https://memect.cn/',
          icon: 'Link',
        },
        {
          label: {
            zhCn: '腾讯云采访',
            en: 'Tencent Cloud Interview',
          },
          url: 'https://cloud.tencent.com/developer/article/2250951',
          icon: 'Link',
        },
        {
          label: {
            zhCn: '搜狐新闻',
            en: 'Sohu News',
          },
          url: 'https://news.sohu.com/a/567296860_634795',
          icon: 'Link',
        },
      ],
    },
    {
      id: 'W006',
      title: {
        zhCn: '平安证券知识库项目',
        en: 'PING AN SECURITIES KNOWLEDGE HUB SYSTEM',
      },
      participation: 33.33,
      time: '2020_09 to 2022_01',
      company: {
        zhCn: '文因互联',
        en: 'Memect_Technology_Co.',
      },
      tags: ['VUE2', 'ELEMENTUI', 'ECHARTS', 'PDF_VIEWER'],
      img: 'https://assets.anuluca.com/other/171280126412338930EA.jpg',
      logo: 'https://assets.anuluca.com/other/130958568.jpg',
      description: {
        zhCn: '基于 Vue2 + ElementUI 搭建后台管理，集成 PDF_VIEWER 实现研报/合同在线预览与批注，并通过 ECharts 展示文档统计与热点趋势，服务于投研及合规团队的知识复用。',
        en: 'A Vue 2 + ElementUI backend system with PDF_VIEWER based research-report and contract preview/annotation plus ECharts document statistics and trend visualization for investment research and compliance teams.',
      },
      details: [
        {
          zhCn: '使用 ElementUI 树形控件与可编辑表格实现文档多级目录管理，支持批量上传及权限字段动态渲染。',
          en: 'Used ElementUI tree controls and editable tables to implement multi-level document directory management, batch upload, and dynamic permission-field rendering.',
        },
        {
          zhCn: '对搜索结果中的文档标题与正文进行关键词高亮，并通过锚点跳转至 PDF_VIEWER 对应页码。',
          en: 'Highlighted keywords in search-result document titles and body text, with anchor jumps to the corresponding PDF_VIEWER page.',
        },
        {
          zhCn: '集成 PDF_VIEWER 实现研报无插件分页加载，支持文本划线与批注同步至后端。',
          en: 'Integrated PDF_VIEWER for plugin-free paginated research-report loading, supporting text underlines and annotation synchronization to the backend.',
        },
        {
          zhCn: '利用 ECharts 绘制文档下载量、浏览次数趋势图及部门分布柱状图，支持时间筛选。',
          en: 'Used ECharts to draw document-download trends, view-count trends, and department-distribution bar charts with time filtering.',
        },
        {
          zhCn: '基于 Vue2 封装的动态表单根据文件类型切换校验规则，并对多级部门选单做懒加载联动。',
          en: 'Built Vue 2 dynamic forms that switch validation rules by file type and support lazy-loaded linkage for multi-level department selectors.',
        },
      ],
    },
    {
      id: 'W007',
      confidential: true,
      title: {
        zhCn: '江西中烟综合管理系统',
        en: 'JIANGXI TOBACCO MANAGEMENT SYSTEM',
      },
      participation: 100,
      time: '2019_09 to 2020_09',
      company: {
        zhCn: '江西中烟',
        en: 'JIANGXI TOBACCO',
      },
      tags: ['REACT', 'Antd', 'DB2'],
      img: 'https://assets.anuluca.com/other/0ff41bd5ad6eddc41ffc116415177bf253663375.jpg',
      logo: 'https://assets.anuluca.com/other/u=3946042415,1178956773&fm=253&fmt=auto&app=138&f=JPEG.jpg',
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_21.38.58.jpg',
      ],
      description: {
        zhCn: '基于 React、Antd 组件库及 DB2 数据库，主导开发了支撑企业内部管理流程的一体化综合平台。',
        en: 'An integrated internal management platform built with React, Ant Design, and DB2 to support enterprise business-management workflows.',
      },
      details: [
        {
          zhCn: '使用 Antd 封装了大量可复用的表单、表格等组件，高效实现了各类日常管理页面的业务流转。',
          en: 'Wrapped a large set of reusable Ant Design based form and table components to efficiently implement daily-management business flows.',
        },
        {
          zhCn: '完成业务综合看板等模块的开发，将核心指标与数据进行可视化展示，为管理层提供了清晰的决策依据。',
          en: 'Developed modules such as the business overview dashboard, visualizing core indicators and data for clearer management decisions.',
        },
        {
          zhCn: '在负责前端开发的同时，承担 DB2 数据库的日常维护与优化，包括慢查询分析、索引调优及存储过程管理，保障系统在高并发下的数据响应稳定性。',
          en: 'Handled DB2 database maintenance and optimization alongside frontend development, including slow-query analysis, index tuning, and stored-procedure management to keep data responses stable under high concurrency.',
        },
      ],
    },
  ],
  PersonalArchives: [
    {
      id: 'P003',
      title: {
        zhCn: 'DRRR情报屋',
        en: 'DRRR INTELLIGENCE ROOM',
      },
      time: '2024_02 to Now',
      participation: 100,
      company: 'Anuluca',
      tags: ['REACT19', 'Typescript', 'Vite', 'AntV G6', 'i18next'],
      img: 'https://assets.anuluca.com/other/27b03fd3-077d-44ae-8965-f0fd0317621e.jpg',
      logo: 'https://assets.anuluca.com/Logo/drrrfavicon.svg',
      images: [
        'https://assets.anuluca.com/other/22.png',
        'https://assets.anuluca.com/other/11.png',
        'https://assets.anuluca.com/other/33.png',
        'https://assets.anuluca.com/other/44.png',
        'https://assets.anuluca.com/other/55.png',
        'https://assets.anuluca.com/other/66.png',
      ],
      imageDescriptions: [
        {
          zhCn: '首页',
          en: 'Home page',
        },
        {
          zhCn: '加载页',
          en: 'Loading page',
        },
        {
          zhCn: '名词页',
          en: 'Terms page',
        },
        {
          zhCn: '作品页',
          en: 'Works page',
        },
        {
          zhCn: '资料页',
          en: 'Resource page',
        },
        {
          zhCn: '手机端',
          en: 'Mobile page',
        },
      ],
      description: {
        zhCn: '一个由个人维护的《无头骑士异闻录》中文资料站，也是目前唯一的系统梳理该作品人物关系的网站。',
        en: 'The only Chinese encyclopedia dedicated to Durarara!! and the only site presenting a structured relationship map for its ensemble cast.',
      },
      crystal: {
        text: {
          zhCn: '这个百科网站源于我对自己第一个 Web 项目的纪念。',
          en: 'This encyclopedia began as a tribute to my first web project.',
        },
        image: 'https://assets.anuluca.com/other/first1.jpg',
      },
      details: [
        {
          zhCn: '基于 React 19、TypeScript 与 Vite 构建的《无头骑士异闻录》主题资源站。',
          en: 'A Durarara!! resource site built with React 19, TypeScript, and Vite.',
        },
        {
          zhCn: '使用 AntV G6 呈现 46 位角色与 85 条关系，支持筛选、检索和双人关系查询。',
          en: 'Uses AntV G6 to visualize 46 characters and 85 relationships with search, filtering, and pairwise lookup.',
        },
        {
          zhCn: '收录角色、阵营、作品与正版资源入口，提供完整的池袋资料索引。',
          en: 'Collects character, faction, work, and official resource information in one archive.',
        },
        {
          zhCn: '由个人独立完成设计、开发、资料整理，并持续更新维护。',
          en: 'Independently designed, developed, researched, and continuously maintained.',
        },
        {
          zhCn: '通过 i18next 支持中日双语，并适配桌面端与移动端访问。',
          en: 'Supports Chinese and Japanese through i18next with responsive desktop and mobile layouts.',
        },
      ],
      links: [
        {
          label: {
            zhCn: '官方网站',
            en: 'Official Website',
          },
          url: 'https://drrr.anuluca.com',
          icon: 'Link',
        },
      ],
    },
    {
      id: 'P001',
      title: {
        zhCn: '路卡庭院',
        en: 'ANUTRIUM',
      },
      participation: 100,
      time: '2025_12 to Now',
      company: 'Anuluca',
      tags: ['Vue3', 'Three.js', 'UI/UX', 'TYPESCRIPT'],
      img: 'https://assets.anuluca.com/other/mega5.jpg',
      logo: 'https://assets.anuluca.com/Logo/anutrium_favicon.jpg',
      images: [
        'https://assets.anuluca.com/other/mega5.jpg',
        'https://assets.anuluca.com/other/mega6.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '早期概念设计1',
          en: 'Early concept design 1',
        },
        {
          zhCn: '早期概念设计2',
          en: 'Early concept design 2',
        },
      ],
      description: {
        zhCn: '个人网站第三次迭代，使用 Vue 3 和 Vite 从零重构。',
        en: 'The third iteration of my personal website, rebuilt from scratch with Vue 3 and Vite.',
      },
      details: [
        {
          zhCn: '采用 Vue 3 Composition API + TypeScript 构建，实现完整的类型安全开发体验。',
          en: 'Built with Vue 3 Composition API and TypeScript for a fully typed development experience.',
        },
        {
          zhCn: '集成全新学习的 Three.js、WebGL 实现3D Logo、晶体视觉、后期 Bloom 等 3D 效果。',
          en: 'Integrated newly learned Three.js and WebGL techniques for 3D logos, crystal visuals, and post-processing Bloom effects.',
        },
        {
          zhCn: '使用 Pinia 进行全局状态管理，配合 vue-i18n 实现国际化中英文双语切换。',
          en: 'Used Pinia for global state management together with vue-i18n for Chinese-English internationalization.',
        },
        {
          zhCn: '通过 Vite 构建工具优化打包体积，首屏加载时间控制在 1.5s 以内。',
          en: 'Optimized bundle output through Vite, targeting first-screen load time within 1.5 seconds.',
        },
        {
          zhCn: '响应式设计适配移动端、平板和桌面端多种设备。',
          en: 'Implemented responsive design for mobile, tablet, and desktop devices.',
        },
      ],
      links: [
        {
          label: {
            zhCn: '官方网站',
            en: 'Official Website',
          },
          url: 'https://anuluca.com',
          icon: 'Link',
        },
      ],
    },
    {
      id: 'P002',
      title: {
        zhCn: '路卡的自由庭院岛',
        en: "LUCA'S LIBER GARDEN",
      },
      participation: 100,
      time: '2019_09 to 2025_12',
      company: 'Anuluca',
      tags: ['HEXO', 'HTML', 'MARKDOWN'],
      img: 'https://assets.anuluca.com/other/iShot_2026-06-04_20.59.04.jpg',
      logo: 'https://assets.anuluca.com/Logo/anutrium_favicon.jpg',
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_20.59.04.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_20.56.07.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_20.55.32.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_21.02.13.jpg',
        'https://assets.anuluca.com/other/iShot_2026-06-04_21.02.36.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '主页',
          en: 'Home page',
        },
        {
          zhCn: '资讯页，使用MarkdownToHtml',
          en: 'News page with MarkdownToHtml',
        },
        {
          zhCn: '宝可梦后院',
          en: 'Pokemon backyard',
        },
        {
          zhCn: '宝可梦详情',
          en: 'Pokemon detail',
        },
        {
          zhCn: '摄影展示',
          en: 'Photography showcase',
        },
      ],
      description: {
        zhCn: '个人网站第二次迭代，使用 Hexo + Theme Book 为基础制作',
        en: 'The second iteration of my personal website, built on Hexo and Theme Book.',
      },
      details: [
        {
          zhCn: '基于 Hexo 与 Theme Book 搭建静态博客体系，通过 Markdown 管理文章内容并生成站点页面。',
          en: 'Built a static blog system with Hexo and Theme Book, using Markdown to manage article content and generate site pages.',
        },
        {
          zhCn: '内容结构覆盖个人学习笔记、技术记录与日常杂谈，形成可长期沉淀的个人知识库。',
          en: 'Covered personal study notes, technical records, and casual essays, forming a long-term personal knowledge base.',
        },
        {
          zhCn: '加入游戏游玩记录与宝可梦相关页面，让博客不只承载文字，也呈现兴趣内容与收藏信息。',
          en: 'Added game play records and Pokemon-related pages so the blog could present interests and collection information beyond text.',
        },
        {
          zhCn: '整体以目录式导航和文章阅读体验为核心，适合在轻量静态站中持续扩展栏目与内容。',
          en: 'Centered the experience on directory-style navigation and article reading, making the lightweight static site easy to expand over time.',
        },
        {
          zhCn: '站点具备明显的个人作品陈列属性，在我的个人网站迭代生涯中有里程碑意义。',
          en: 'The site has a clear personal-portfolio character and marks an important milestone in my personal website iterations.',
        },
      ],
      links: [
        {
          label: {
            zhCn: '官方网站',
            en: 'Official Website',
          },
          url: 'https://garden.anuluca.com/',
          icon: 'Link',
        },
      ],
    },
  ],
  MiscWorks: [
    {
      id: 'M001',
      title: {
        zhCn: '江西电网KPI考核系统',
        en: 'State Grid KPI System',
      },
      participation: 100,
      company: {
        zhCn: '国家电网',
        en: 'State Grid',
      },
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '本系统包括绩效设计器、模板配置、月度考核启动与评价等全流程，并攻克了类似低代码开发平台的组件自定义核心难点。',
        en: 'A full-process KPI assessment system covering performance designer, template configuration, monthly assessment startup, and evaluation, with low-code-like component customization as a core challenge.',
      },
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_23.44.04.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '原型图1',
          en: 'Prototype 1',
        },
      ],
      details: [
        {
          zhCn: '实现绩效设计器与模板设计模块，支持用户通过拖拽式配置自定义考核指标、评分公式及模板结构，大幅降低业务人员对新考核方案的调整成本。',
          en: 'Implemented performance designer and template designer modules that allow users to configure assessment indicators, scoring formulas, and template structures through drag-and-drop, lowering the adjustment cost for new assessment plans.',
        },
        {
          zhCn: '底层封装了基于 JSON Schema 的动态表单渲染引擎，可对表格、输入框、选择器等组件进行属性级自定义与联动校验，达到了类似低代码系统的组件灵活扩展能力。',
          en: 'Wrapped a JSON Schema based dynamic form-rendering engine that supports property-level customization and linked validation for tables, inputs, selectors, and other components, reaching low-code-style flexibility.',
        },
      ],
    },
    {
      id: 'M002',
      title: {
        zhCn: '江西电网巡检APP',
        en: 'State Grid Inspection App',
      },
      participation: 100,
      company: {
        zhCn: '国家电网',
        en: 'State Grid',
      },
      tags: ['Vue2', 'ELEMENTUI', 'TAILWINDCSS', 'Vant2'],
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      img: 'https://assets.anuluca.com/other/8320d930cbcf10286068ff0c86e76fda398.jpg',
      description: {
        zhCn: '我主导设计并开发了江西电网巡检APP，支撑一线班组完成设备巡检、缺陷上报与任务调度，实现电网巡检业务的移动化转型。',
        en: 'I led the design and development of the Jiangxi Power Grid inspection app, helping field teams handle equipment inspection, defect reporting, and task dispatch through a mobile workflow.',
      },
      details: [
        {
          zhCn: '基于 Vue2 + Vant2 搭建移动端主体框架，实现巡检任务列表、设备扫码、缺陷拍照上传及离线数据缓存等核心功能。',
          en: 'Built the mobile frontend with Vue 2 and Vant 2, implementing inspection task lists, equipment scanning, defect photo upload, and offline data caching.',
        },
        {
          zhCn: '利用 ElementUI 开发后台管理模块，提供巡检路线配置、任务派发、缺陷处理流程跟踪及报表导出能力。',
          en: 'Developed the backend management module with ElementUI, providing route configuration, task dispatch, defect-flow tracking, and report export features.',
        },
        {
          zhCn: '采用 TailwindCSS 原子化样式体系，统一移动端与后台的视觉风格，并针对电力行业定制蓝白主题与高对比色。',
          en: 'Used TailwindCSS utility styles to unify mobile and backend visuals while customizing a blue-white high-contrast theme for the power industry.',
        },
        {
          zhCn: '主导前后端接口设计与联调，针对弱网环境优化数据同步策略，保障现场作业的稳定性和离线可用性。',
          en: 'Led frontend-backend API design and integration, optimizing data synchronization for weak-network environments to keep field work stable and available offline.',
        },
      ],
    },
    {
      id: 'M003',
      title: {
        zhCn: '四级日管控系统',
        en: 'Level 4 Daily Control System',
      },
      participation: 30,
      company: {
        zhCn: '国家电网',
        en: 'State Grid',
      },
      logo: 'https://assets.anuluca.com/other/bd315c6034a85edf8db1fead061e1e23dd54574edfa1.jpg',
      description: {
        zhCn: '主要负责UI设计、主体框架搭建，以及页面的搭建与交互',
        en: 'Mainly responsible for UI design, main framework setup, page construction, and interaction implementation.',
      },
      images: [
        'https://assets.anuluca.com/other/iShot_2026-06-04_21.31.42.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '系统截图1',
          en: 'System screenshot 1',
        },
      ],
    },
    {
      zhCn: {
        id: 'M004',
        title: '快察®智能核查系统',
        participation: 33.33,
        company: '文因互联',
        logo: 'https://assets.anuluca.com/other/130958568.jpg',
        tags: ['VUE2', 'ELEMENTUI', 'ECHARTS', 'PDF_VIEWER'],
        images: [
          'https://assets.anuluca.com/other/iShot_2026-06-04_22.59.17.jpg',
        ],
        description:
          '面向金融文档质控的智能核查系统，支持单文档核查、多文档交叉复核与版本比对。',
        links: [
          {
            label: '项目官网',
            url: 'https://memect.cn/kuaicha/',
            icon: 'Link',
          },
          {
            label: '公司官网',
            url: 'https://memect.cn/',
            icon: 'Link',
          },
        ],
      },
      en: {
        id: 'M004',
        title: 'KuaiCha',
        participation: 33.33,
        company: 'Memect_Technology_Co.',
        logo: 'https://assets.anuluca.com/other/130958568.jpg',
        tags: ['VUE2', 'ELEMENTUI', 'ECHARTS', 'PDF_VIEWER'],
        description:
          'An intelligent financial-document quality-control system supporting single-document checking, multi-document cross-review, and version comparison.',
        links: [
          {
            label: 'Project Website',
            url: 'https://memect.cn/kuaicha/',
            icon: 'Link',
          },
          {
            label: 'Company Website',
            url: 'https://memect.cn/',
            icon: 'Link',
          },
        ],
      },
    },
    {
      id: 'M006',
      title: 'Anulife',
      participation: 100,
      company: {
        zhCn: '我自己',
        en: 'Anuluca',
      },
      logo: 'https://assets.anuluca.com/Logo/anutrium_favicon.jpg',
      tags: ['HTML5', 'CSS'],
      description: {
        zhCn: '个人网站第一版，大学时期纯HTML手搓。',
        en: 'The first version of my personal website, hand-built with pure HTML during university.',
      },
      images: [
        'https://assets.anuluca.com/other/YHpcGj.jpg',
        'https://assets.anuluca.com/other/YHp2zn.jpg',
      ],
      imageDescriptions: [
        {
          zhCn: '开发早期',
          en: 'Early development',
        },
        {
          zhCn: '最终截图',
          en: 'Final screenshot',
        },
      ],
      links: [
        {
          label: {
            zhCn: '官网',
            en: 'Website',
          },
          url: 'https://anulucas-blog.pages.dev/custom_websites/Anulife.github.io/',
          icon: 'Link',
        },
      ],
      details: [
        {
          zhCn: '这个阶段只会硬搓，不会引包，所以虽说是个人网站，但压根写不了什么东西',
          en: 'At this stage I only knew how to hard-code pages and did not know how to introduce packages, so although it was a personal website, it could not really hold much content.',
        },
        {
          zhCn: '但是我觉得这个时期是我审美最好的时期，没有被乱七八糟的东西污染',
          en: 'Still, I think this was the period when my visual taste was at its cleanest, before being influenced by too many unrelated things.',
        },
        {
          zhCn: '目前的Anutrium设计初期就是参考了当初写的这个网站的一些设计风格，加上第二版的内容组合而成',
          en: 'The early design direction of Anutrium referenced parts of this first site and combined them with content ideas from the second version.',
        },
      ],
    },
    {
      id: 'M007',
      title: {
        zhCn: '大学WEB课程毕业作业',
        en: 'WEB CLASS GRAD PROJECT',
      },
      participation: 100,
      company: {
        zhCn: '我自己',
        en: 'Anuluca',
      },
      logo: 'https://assets.anuluca.com/Logo/anutrium_favicon.jpg',
      tags: ['HTML5', 'CSS'],
      description: {
        zhCn: '真正意义上自己写的第一个WEB项目，代码已经丢了但有照片。',
        en: 'My first real self-written web project; the source code is gone, but screenshots remain.',
      },
      crystal: {
        text: {
          zhCn: '几年后对这个项目进行了重置并在社区发行。',
          en: 'Years later, I rebuilt this project and released it to the community.',
        },
        image:
          'https://assets.anuluca.com/other/27b03fd3-077d-44ae-8965-f0fd0317621e.jpg',
        links: [
          {
            label: 'drrr.anuluca.com',
            href: 'https://drrr.anuluca.com',
          },
        ],
      },
      images: [
        'https://assets.anuluca.com/other/first1.jpg',
        'https://assets.anuluca.com/other/first2.jpg',
        'https://assets.anuluca.com/other/first3.jpg',
        'https://assets.anuluca.com/other/first4.jpg',
        'https://assets.anuluca.com/other/first5.jpg',
      ],
    },
  ],
} as const

export default archiveDynamic
