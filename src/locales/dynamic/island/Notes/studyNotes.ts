export const studyNoteTypeMap = {
  frontend: {
    label: {
      zhCn: '前端',
      en: 'FRONTEND',
    },
  },
  other: {
    label: {
      zhCn: '其他',
      en: 'OTHER',
    },
  },
} as const

export const studyNoteList = [
  {
    id: 'vue-reactivity-notes',
    title: {
      zhCn: 'Vue 响应式系统：从依赖收集到更新调度',
      en: 'Vue Reactivity: From Dependency Tracking to Update Scheduling',
    },
    time: '2026-07-22',
    image:
      'https://assets.anuluca.com/Island/picWork/normal/DSC00812-01-01.jpeg',
    path: '/404',
    type: 'frontend',
  },
  {
    id: 'typescript-type-narrowing',
    title: {
      zhCn: 'TypeScript 类型收窄的常用模式',
      en: 'Common TypeScript Type Narrowing Patterns',
    },
    time: '2026-07-16',
    path: '/404',
    type: 'frontend',
  },
  {
    id: 'browser-rendering-pipeline',
    title: {
      zhCn: '浏览器渲染流水线与页面性能',
      en: 'Browser Rendering Pipeline and Page Performance',
    },
    time: '2026-07-09',
    path: '/404',
    type: 'frontend',
  },
  {
    id: 'css-layout-observations',
    title: {
      zhCn: '现代 CSS 布局问题排查记录',
      en: 'Debugging Notes for Modern CSS Layouts',
    },
    time: '2026-06-28',
    path: '/404',
    type: 'frontend',
  },
  {
    id: 'web-animation-performance',
    title: {
      zhCn: 'Web 动画的性能边界与降级策略',
      en: 'Performance Boundaries and Fallbacks for Web Animation',
    },
    time: '2026-06-15',
    path: '/404',
    type: 'frontend',
  },
  {
    id: 'learning-review-method',
    title: {
      zhCn: '周期复盘：把零散输入转化为长期记忆',
      en: 'Periodic Review: Turning Fragments into Long-Term Memory',
    },
    time: '2026-06-02',
    path: '/404',
    type: 'other',
  },
] as const

const studyNotes = {
  typeMap: studyNoteTypeMap,
  list: studyNoteList,
} as const

export default studyNotes
