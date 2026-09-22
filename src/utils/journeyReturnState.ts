const JOURNEY_RETURN_FLAG_KEY = 'anutrium:flanerie:returning-from-detail'
const JOURNEY_RETURN_VLOG_KEY = 'anutrium:flanerie:selected-vlog'
const JOURNEY_RETURN_SCROLL_KEY = 'anutrium:flanerie:scroll-top'

export interface JourneyReturnState {
  vlogId: string
  scrollTop: number | null
}

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const rememberJourneySelection = (vlogId: string, scrollTop: number) => {
  const storage = getSessionStorage()
  if (!storage) return

  storage.setItem(JOURNEY_RETURN_VLOG_KEY, vlogId)
  storage.setItem(JOURNEY_RETURN_SCROLL_KEY, String(scrollTop))
}

export const markJourneyReturn = (vlogId: string) => {
  const storage = getSessionStorage()
  if (!storage) return

  storage.setItem(JOURNEY_RETURN_FLAG_KEY, 'true')
  storage.setItem(JOURNEY_RETURN_VLOG_KEY, vlogId)
}

export const consumeJourneyReturnState = (): JourneyReturnState | null => {
  const storage = getSessionStorage()
  if (!storage) return null

  const isReturn = storage.getItem(JOURNEY_RETURN_FLAG_KEY) === 'true'
  const vlogId = storage.getItem(JOURNEY_RETURN_VLOG_KEY)
  const rawScrollTop = storage.getItem(JOURNEY_RETURN_SCROLL_KEY)
  const parsedScrollTop = rawScrollTop === null ? NaN : Number(rawScrollTop)

  storage.removeItem(JOURNEY_RETURN_FLAG_KEY)
  storage.removeItem(JOURNEY_RETURN_VLOG_KEY)
  storage.removeItem(JOURNEY_RETURN_SCROLL_KEY)

  if (!isReturn || !vlogId) return null

  return {
    vlogId,
    scrollTop: Number.isFinite(parsedScrollTop) ? parsedScrollTop : null,
  }
}
