import dynamic from '../dynamic/island/index'

const island = {
  photoMode: {
    componentControl: { zhCn: '组件控制', en: 'Scene components' },
    zodiacOpacity: { zhCn: '十二星宿透明度', en: 'Zodiac opacity' },
    zodiacBlur: { zhCn: '十二星宿模糊度', en: 'Zodiac blur' },
    starsOpacity: { zhCn: '星空透明度', en: 'Starfield opacity' },
    starsBlur: { zhCn: '星空模糊度', en: 'Starfield blur' },
    themeColor: { zhCn: '主题色', en: 'Theme color' },
    reset: { zhCn: '重置', en: 'Reset' },
    backgroundRed: { zhCn: '热情红', en: 'Passionate red' },
    zodiacGroup: { zhCn: '十二星宿', en: 'Zodiac' },
    starsGroup: { zhCn: '星空', en: 'Starfield' },
    modelGroup: { zhCn: '模型', en: 'Model' },
    backgroundGroup: { zhCn: '颜色', en: 'Colors' },
    opacityShort: { zhCn: '透明度', en: 'Opacity' },
    blurShort: { zhCn: '模糊度', en: 'Blur' },
    formShort: { zhCn: '形态', en: 'Appearance' },
    outlineShort: { zhCn: '描边', en: 'Outline' },
    modelForm: { zhCn: '模型形态', en: 'Model appearance' },
    modelDefault: { zhCn: '默认', en: 'Default' },
    modelWireframe: { zhCn: '网格', en: 'Wireframe' },
    modelWireThickness: { zhCn: '网格粗细', en: 'Wireframe thickness' },
    modelWireDensity: { zhCn: '网格密集程度', en: 'Wireframe density' },
    modelOutline: { zhCn: '模型描边', en: 'Model outline' },
    backgroundCyan: { zhCn: '青色', en: 'Cyan' },
    backgroundPink: { zhCn: '粉色', en: 'Pink' },
    blackGradient: { zhCn: '背景黑色渐变', en: 'Black background gradient' },
    show: { zhCn: '显示', en: 'Show' },
    hide: { zhCn: '隐藏', en: 'Hide' },
    backgroundBlue: { zhCn: '蓝色', en: 'Blue' },
    tools: { zhCn: '拍照工具栏', en: 'Photo tools' },
    focalLength: { zhCn: '焦距畸变调整', en: 'Focal distortion adjustment' },
    modelLabel: { zhCn: '路卡利欧拍照模型', en: 'Lucario photo model' },
    loading: { zhCn: '正在加载拍照模型', en: 'Loading photo model' },
    loadError: {
      zhCn: '拍照模型加载失败，请退出后重试',
      en: 'Photo model failed to load. Exit and try again.',
    },
    enter: { zhCn: '进入拍照模式', en: 'Enter photo mode' },
    poses: { zhCn: '姿势', en: 'POSES' },
    poseList: { zhCn: '姿势列表', en: 'Pose list' },
    standing: { zhCn: '站立', en: 'STANDING' },
    mobileHint: {
      zhCn: '单指旋转 / 双指移动',
      en: 'ONE FINGER TO ROTATE / TWO FINGERS TO PAN',
    },
    hint: {
      zhCn: '左键旋转 / 右键移动 / 滚动缩放',
      en: 'LEFT DRAG TO ROTATE / RIGHT DRAG TO PAN / SCROLL TO ZOOM',
    },
    showTools: { zhCn: '显示拍照工具', en: 'Show photo tools' },
    hideTools: { zhCn: '隐藏拍照工具', en: 'Hide photo tools' },
    capture: { zhCn: '截图并保存', en: 'Capture and save' },
    exit: { zhCn: '退出拍照模式', en: 'Exit photo mode' },
    captureError: {
      zhCn: '截图失败，请重试',
      en: 'Capture failed. Please try again.',
    },
  },
  modules: {
    photography: {
      merch: {
        title: {
          zhCn: '收藏品',
          en: 'COLLECTIBLES',
        },
        tagline: {
          zhCn: '现在不怎么买了。',
          en: 'Nothing to buy now.',
        },
        collectionLabel: {
          zhCn: '枚入',
          en: 'PCS',
        },
        empty: {
          zhCn: '这组影像仍在准备中',
          en: 'THIS COLLECTION IS IN DEVELOPMENT',
        },
        img: 'https://assets.anuluca.com/Island/merch/lucarioonearm/DSC01408.jpg',
        data: dynamic.merch,
      },
    },
    notes: {
      studyNotes: {
        title: {
          zhCn: '学习笔记',
          en: 'STUDY NOTES',
        },
        subtitle: {
          zhCn: '日常学习备份',
          en: 'Daily learning archive.',
        },
        counterLabel: {
          zhCn: '篇笔记',
          en: 'NOTES',
        },
        empty: {
          zhCn: '暂无笔记',
          en: 'NO NOTES',
        },
        typeMap: dynamic.notes.studyNotes.typeMap,
      },
    },
    games: {
      library: dynamic.game,
    },
  },
} as const

export default island
