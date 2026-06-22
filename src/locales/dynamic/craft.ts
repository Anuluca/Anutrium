const craftDynamic = {
  tools: [
    {
      id: 'palette',
      title: {
        zhCn: 'CSS 调色盘',
        en: 'CSS COLOR PALETTE',
      },
      sub: {
        zhCn: '上传图片以进行高频像素特征提取，自动输出标准前端调色盘。',
        en: 'Upload image for high-frequency pixel extraction and automatic palette generation.',
      },
      category: 'work',
      tags: ['DESIGN', 'DEV'],
      icon: '🎨',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/colorPalette',
    },
    {
      id: 'motion',
      title: {
        zhCn: '缓动工作室',
        en: 'EASE STUDIO',
      },
      sub: {
        zhCn: '可视化调试贝塞尔曲线，生成 CSS 动画。',
        en: 'Visually tune Bezier curves and generate CSS animation.',
      },
      category: 'work',
      tags: ['DESIGN', 'DEV'],
      icon: '〜',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/easeStudio',
    },
    {
      id: 'bounce-dynamics',
      title: {
        zhCn: '弹力球',
        en: 'BOUNCING BALL',
      },
      sub: {
        zhCn: '调节软硬弹性与小球重量，生成自然落体和横向弹跳实时动画。',
        en: 'Tune elasticity and ball weight to generate a natural falling and horizontal bounce animation.',
      },
      category: 'work',
      tags: ['DEV', 'MOTION'],
      icon: '●',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/bounceDynamics',
    },
    {
      id: 'metronome',
      title: {
        zhCn: '节拍器',
        en: 'METRONOME',
      },
      sub: {
        zhCn: '设置 BPM 和拍号，用声音与视觉节拍辅助钢琴练习。',
        en: 'Set BPM and meter with audible and visual beats for piano practice.',
      },
      category: 'general',
      tags: ['MUSIC'],
      icon: '♪',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/metronome',
    },
    {
      id: 'html-entities',
      title: {
        zhCn: 'HTML 常用转义字符',
        en: 'HTML ENTITIES',
      },
      sub: {
        zhCn: '搜索常用 HTML 转义字符，快速复制实体名、编号或字符。',
        en: 'Search common HTML entities and copy names, numeric codes, or characters.',
      },
      category: 'work',
      tags: ['DEV'],
      icon: '&;',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/htmlEntities',
    },
    {
      id: 'base64-codec',
      title: {
        zhCn: 'Base64 加解密',
        en: 'BASE64 CODEC',
      },
      sub: {
        zhCn: '处理文本的 Base64 编码与解码，支持中文内容。',
        en: 'Encode and decode Base64 text with Unicode support.',
      },
      category: 'work',
      tags: ['DEV'],
      icon: '64',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/base64Codec',
    },
    {
      id: 'image-base64',
      title: {
        zhCn: '图片转 Base64',
        en: 'IMAGE TO BASE64',
      },
      sub: {
        zhCn: '上传图片生成 Data URL，适合快速嵌入和预览。',
        en: 'Upload an image and generate a Data URL for quick embedding.',
      },
      category: 'work',
      tags: ['DEV'],
      icon: '▨',
      statusLabel: {
        zhCn: '可用',
        en: 'LIVE',
      },
      link: '/imageBase64',
    },
  ],
} as const

export default craftDynamic
