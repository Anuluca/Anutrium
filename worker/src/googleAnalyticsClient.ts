interface GoogleRow {
  dimensionValues?: { value: string }[]
  metricValues?: { value: string }[]
}
export interface GoogleReport {
  metricHeaders?: { name: string }[]
  rows?: GoogleRow[]
  totals?: GoogleRow[]
  rowCount?: number
  metadata?: {
    timeZone?: string
    subjectToThresholding?: boolean
    dataLossFromOtherRow?: boolean
    samplingMetadatas?: unknown[]
  }
}
export class AnalyticsApiError extends Error {
  constructor(readonly status: number) {
    super(`analytics_api_${status}`)
  }
}
export type GoogleAnalyticsClient = <T>(
  method: 'batchRunReports' | 'runReport' | 'runRealtimeReport',
  body: object
) => Promise<T>

// 仅缓存已完成的密钥导入和令牌结果，不跨 Worker 请求共享 fetch、Response 或未完成的 I/O Promise。
let credentials: { source: string; email: string; key: CryptoKey } | undefined
let access: { source: string; token: string; expiresAt: number } | undefined
const encode = (value: string | Uint8Array) =>
  btoa(
    String.fromCharCode(
      ...(typeof value === 'string' ? new TextEncoder().encode(value) : value)
    )
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const timeout = (deadline: number, maximum: number) => {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new AnalyticsApiError(504)
  return Math.min(remaining, maximum)
}

async function postJson<T>(
  url: string,
  init: RequestInit,
  deadline: number,
  maximum: number
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout(deadline, maximum))
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new AnalyticsApiError(response.status)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

async function accessToken(source: string, deadline: number): Promise<string> {
  if (access?.source === source && access.expiresAt > Date.now())
    return access.token
  let credential = credentials
  if (credential?.source !== source) {
    const account = JSON.parse(source) as {
      client_email?: string
      private_key?: string
    }
    if (!account.client_email || !account.private_key)
      throw new AnalyticsApiError(503)
    const pem = account.private_key
      .replace(/-----[^-]+-----/g, '')
      .replace(/\s/g, '')
    const key = await crypto.subtle.importKey(
      'pkcs8',
      Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )
    credential = { source, email: account.client_email, key }
    credentials = credential
  }
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${encode(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  )}.${encode(
    JSON.stringify({
      iss: credential.email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    credential.key,
    new TextEncoder().encode(unsigned)
  )
  const data = await postJson<{ access_token?: string; expires_in?: number }>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${encode(new Uint8Array(signature))}`,
      }),
    },
    deadline,
    8000
  )
  if (!data.access_token) throw new AnalyticsApiError(502)
  access = {
    source,
    token: data.access_token,
    expiresAt:
      Date.now() +
      Math.max(0, Math.min(3600, data.expires_in ?? 3600) - 60) * 1000,
  }
  return data.access_token
}

export async function createGoogleAnalyticsClient(
  env: Env
): Promise<GoogleAnalyticsClient> {
  const deadline = Date.now() + 30000
  const token = await accessToken(env.GA4_SERVICE_ACCOUNT_JSON, deadline)
  return async <T>(method: string, body: object): Promise<T> => {
    try {
      return await postJson<T>(
        `https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID}:${method}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        deadline,
        10000
      )
    } catch (error) {
      if (
        error instanceof AnalyticsApiError &&
        error.status === 401 &&
        access?.token === token
      )
        access = undefined
      throw error
    }
  }
}
