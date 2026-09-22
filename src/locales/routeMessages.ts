import i18n from './index'
import { resolveLocalePair } from './resolveLocalePair'

type MessageModule = { default: unknown }
type MessageDomain =
  | 'about'
  | 'archive'
  | 'craft'
  | 'flanerie'
  | 'home'
  | 'island'

const messageLoaders: Record<MessageDomain, () => Promise<MessageModule>> = {
  about: () => import('./modules/about'),
  archive: () => import('./modules/archive'),
  craft: () => import('./modules/craft'),
  flanerie: () => import('./modules/flanerie'),
  home: () => import('./modules/home'),
  island: () => import('./modules/island'),
}

const routeMessageDomains: Record<string, MessageDomain[]> = {
  HOME: ['home', 'archive', 'craft', 'flanerie'],
  ARCHIVE: ['archive'],
  FLANERIE: ['flanerie'],
  FLANERIE_DETAIL: ['flanerie'],
  CRAFT: ['craft'],
  COLORPALETTE: ['craft'],
  EASESTUDIO: ['craft'],
  METRONOME: ['craft'],
  BOUNCEDYNAMICS: ['craft'],
  HTMLENTITIES: ['craft'],
  BASE64CODEC: ['craft'],
  IMAGEBASE64: ['craft'],
  ABOUT: ['about'],
  ISLAND_PHOTOGRAPHY: ['island'],
  ISLAND_MERCH_PHOTOGRAPHY: ['island'],
  ISLAND_MERCH_PHOTOGRAPHY_DETAIL: ['island'],
  ISLAND_IMAGE_LOG: ['island'],
  ISLAND_IMAGE_LOG_DETAIL: ['island'],
  ISLAND_ILLUSTRATION: ['island'],
  ISLAND_TRAINER_CARD: ['island'],
  ISLAND_STUDY_NOTES: ['island'],
  TEST: ['island'],
}

const messageLoads = new Map<MessageDomain, Promise<void>>()

const loadMessageDomain = (domain: MessageDomain) => {
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
  return Promise.all(domains.map(loadMessageDomain)).then(() => undefined)
}
