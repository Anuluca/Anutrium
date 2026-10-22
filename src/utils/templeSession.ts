import {
  type TempleEntryId,
  templeNavigationById,
} from '@/config/templeNavigation'

const STORAGE_KEY = 'anutrium:temple:session'
const WINDOW_MARKER = /\|anutrium-temple:([^|]+)$/

interface TempleSession {
  selection: TempleEntryId | null
  aboutOpen: boolean
}

interface StoredTempleSession extends TempleSession {
  path: string
}

let initialized = false

const getStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    const storage = window.sessionStorage
    if (!initialized) {
      // window.open 会复制 opener 的 sessionStorage；窗口标识用于识别并丢弃这份副本。
      const ownerKey = `${STORAGE_KEY}:owner`
      const marker = window.name.match(WINDOW_MARKER)?.[1]
      const owner = storage.getItem(ownerKey)
      if (window.opener && marker !== owner) storage.removeItem(STORAGE_KEY)
      const id =
        marker ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      storage.setItem(ownerKey, id)
      window.name = `${window.name.replace(
        WINDOW_MARKER,
        ''
      )}|anutrium-temple:${id}`
      initialized = true
    }
    return storage
  } catch {
    return null
  }
}

export const readTempleSession = (): StoredTempleSession | null => {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    if (
      (state.selection !== null &&
        (state.selection === 'about' ||
          !templeNavigationById.has(state.selection))) ||
      typeof state.aboutOpen !== 'boolean' ||
      typeof state.path !== 'string'
    )
      return null
    return {
      selection: state.selection,
      aboutOpen: state.aboutOpen,
      path: state.path,
    }
  } catch {
    return null
  }
}

export const rememberTempleSession = (state: TempleSession) => {
  try {
    const storage = getStorage()
    storage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        path:
          window.location.pathname +
          window.location.search +
          window.location.hash,
      })
    )
  } catch {
    // 禁用存储时仍允许正常切换菜单。
  }
}
