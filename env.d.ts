/// <reference types="vite/client" />
declare module '*.md'
declare module '*.js'

interface Window {
  /** 在创建场景前设置；测试可显式覆盖构建开关。 */
  __ANUTRIUM_HOME_DIAGNOSTICS__?: boolean
}

interface ImportMetaEnv {
  readonly VITE_HOME_SCENE_DIAGNOSTICS?: string
  readonly VITE_HOME_LABEL_QUALITY?: 'high' | 'low' | 'flat' | 'lod'
  readonly VITE_LAST_UPDATE: string
  readonly VITE_PROFILE_WORKER_URL?: string
  readonly VITE_STEAM_WORKER_URL?: string
  readonly VITE_GA4_MEASUREMENT_ID?: string
  readonly VITE_GA4_ENABLE_DEV?: string
  readonly VITE_GA4_DEBUG?: string
  readonly VITE_GA4_REPORTS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
