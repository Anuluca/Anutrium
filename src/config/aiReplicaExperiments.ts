import type { Component } from 'vue'

/** 案例列表、静态路由与展示模板共用这一份配置。画布尺寸使用原始 CSS 像素。 */
export interface AiReplicaExperiment {
  id: string
  path: string
  routeName: string
  title: string
  titleEn: string
  pageTitle: string
  pageTitleEn: string
  model: string
  description: string
  cover: string
  referenceImage?: string
  imageryCredit?: { label: string; url: string }
  sceneLabel: string
  canvas: { width: number; height: number }
  loadScene: () => Promise<{ default: Component }>
}

export const aiReplicaExperiments: AiReplicaExperiment[] = [
  {
    id: 'arknight-persona-astra',
    path: '/ai-playground/arknightxpersona3reload',
    routeName: 'ARKNIGHT_PERSONA_RELOAD',
    title: '明日方舟 UI 复刻',
    titleEn: 'Arknights UI Recreation',
    pageTitle: 'GPT-6-Astra前端UI复刻',
    pageTitleEn: 'ARKNIGHTS × PERSONA 3 RELOAD',
    model: 'GPT-6 Astra High',
    description: '使用GPT-6 Astra High 一句话通过参考图生成的UI复刻',
    cover:
      'https://assets.anuluca.com/Island/playground/arknight-persona/reference.webp',
    referenceImage:
      'https://assets.anuluca.com/Island/playground/arknight-persona/reference.webp',
    sceneLabel: '明日方舟与女神异闻录3 Reload 交互界面',
    canvas: { width: 1600, height: 912 },
    loadScene: () => import('@/views/AiPlayground/ArknightPersona/index.vue'),
  },
  {
    id: 'tidal-atlas',
    path: '/ai-playground/tidal-atlas',
    routeName: 'TIDAL_ATLAS',
    title: '仿Fgo卷轴式地图交互',
    titleEn: 'FGO-Inspired Scroll Map Interaction',
    pageTitle: '世界地形图',
    pageTitleEn: 'World Terrain Map',
    model: 'GPT-6.2 Sol High',
    description:
      'GPT6.2 Sol 仿照《Fate/Grand Order》第七异闻带“黄金树海纪行 纳维·米克特兰”制作的卷轴式地图',
    cover: '/images/tidal-atlas/terrain.webp',
    referenceImage: '/images/tidal-atlas/fgo-reference.webp',
    imageryCredit: {
      label: 'NASA Earth Observatory · Blue Marble',
      url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/',
    },
    sceneLabel: '卷轴式世界地形图',
    canvas: { width: 1200, height: 720 },
    loadScene: () => import('@/views/AiPlayground/TidalAtlas/index.vue'),
  },
]
