import i18n from './index'
import { resolveLocalePair } from './resolveLocalePair'

type MessageModule = { default: unknown }
type MessageDomain = 'about' | 'archive' | 'craft' | 'flanerie' | 'island'

const messageLoaders: Record<MessageDomain, () => Promise<MessageModule>> = {
  about: () => import('./modules/about'),
  archive: () => import('./modules/archive'),
  craft: () => import('./modules/craft'),
  flanerie: () => import('./modules/flanerie'),
  island: () => import('./modules/island'),
}

const routeMessageDomains: Record<string, MessageDomain[]> = {
  // 首页场景不消费这些文案；嵌入面板在挂载前按需加载，避免阻塞首屏。
  HOME: [],
  ATRIUM: [],
  ARCHIVE: ['archive'],
  FLANERIE: ['flanerie'],
  FLANERIE_DETAIL: ['flanerie'],
  COLORPALETTE: ['craft'],
  EASESTUDIO: ['craft'],
  METRONOME: ['craft'],
  BOUNCEDYNAMICS: ['craft'],
  HTMLENTITIES: ['craft'],
  BASE64CODEC: ['craft'],
  IMAGEBASE64: ['craft'],
}

const messageLoads = new Map<MessageDomain, Promise<void>>()

export const ensureMessageDomain = (domain: MessageDomain) => {
  const cachedLoad = messageLoads.get(domain)
  if (cachedLoad) return cachedLoad

  const load = messageLoaders[domain]()
    .then(({ default: source }) => {
      const [zhCnMessages, enMessages] = resolveLocalePair({ [domain]: source })

      i18n.global.mergeLocaleMessage(
        'zhCn',
        zhCnMessages as Record<string, unknown>
      )
      i18n.global.mergeLocaleMessage(
        'en',
        enMessages as Record<string, unknown>
      )
    })
    .catch((error) => {
      messageLoads.delete(domain)
      throw error
    })

  messageLoads.set(domain, load)
  return load
}

export const ensureRouteMessages = (routeName: unknown) => {
  if (typeof routeName !== 'string') return Promise.resolve()

  const domains = routeMessageDomains[routeName] || []
  return Promise.all(domains.map(ensureMessageDomain)).then(() => undefined)
}
