/// <reference types="vite/client" />
declare module '*.md'
declare module '*.js'

interface ImportMetaEnv {
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
