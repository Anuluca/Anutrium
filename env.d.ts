/// <reference types="vite/client" />
declare module '*.md'
declare module '*.js'

interface ImportMetaEnv {
  readonly VITE_PROFILE_WORKER_URL?: string
  readonly VITE_STEAM_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
