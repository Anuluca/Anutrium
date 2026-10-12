import { ensureRouteMessages } from '@/locales/routeMessages'

import type AboutContent from './AboutContent.vue'

let contentLoad: Promise<{ default: typeof AboutContent }> | undefined

export function loadAboutContent() {
  if (!contentLoad) {
    contentLoad = Promise.all([
      import('./AboutContent.vue'),
      ensureRouteMessages('ABOUT'),
    ])
      .then(([component]) => component)
      .catch((error) => {
        contentLoad = undefined
        throw error
      })
  }
  return contentLoad
}
