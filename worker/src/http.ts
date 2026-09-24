let cachedAllowedOriginsSource = ''
let cachedAllowedOrigins = new Set<string>()

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export const jsonResponse = (
  body: unknown,
  status = 200,
  headers: HeadersInit = {}
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })

export const getAllowedOrigins = (source: string) => {
  if (source === cachedAllowedOriginsSource) return cachedAllowedOrigins

  cachedAllowedOriginsSource = source
  cachedAllowedOrigins = new Set(
    source
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
  return cachedAllowedOrigins
}

export const getCorsHeaders = (
  origin: string | null,
  allowedOrigins: ReadonlySet<string>
): Record<string, string> => {
  if (!origin || !allowedOrigins.has(origin)) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export const withCors = (
  response: Response,
  origin: string | null,
  allowedOrigins: ReadonlySet<string>
) => {
  const headers = new Headers(response.headers)
  Object.entries(getCorsHeaders(origin, allowedOrigins)).forEach(
    ([key, value]) => headers.set(key, value)
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
