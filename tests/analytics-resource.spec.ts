import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
})

test('concurrent subscribers share a request and one cancellation does not cancel others', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { readAnalyticsSummary } = await import(
      '/src/utils/analyticsResource.ts'
    )
    let requests = 0
    let finish!: (response: Response) => void
    let underlyingSignal: AbortSignal | null = null
    window.fetch = async (_url, init) => {
      requests++
      underlyingSignal = init!.signal as AbortSignal
      return new Promise<Response>((resolve) => {
        finish = resolve
      })
    }
    const a = new AbortController()
    const b = new AbortController()
    const first = readAnalyticsSummary(30, a.signal).catch(
      (error: Error) => error.name
    )
    const second = readAnalyticsSummary(30, b.signal)
    await Promise.resolve()
    a.abort()
    const cancelledSharedRequest = underlyingSignal!.aborted
    finish(
      new Response(
        JSON.stringify({
          days: 30,
          generatedAt: new Date().toISOString(),
          reports: [],
        })
      )
    )
    const [cancelled, data] = await Promise.all([first, second])
    const cached = await readAnalyticsSummary(30, new AbortController().signal)
    return {
      requests,
      cancelled,
      cancelledSharedRequest,
      cached: data === cached,
    }
  })
  expect(result).toEqual({
    requests: 1,
    cancelled: 'AbortError',
    cancelledSharedRequest: false,
    cached: true,
  })
})

test('late cancelled responses cannot replace a newer result and expired data is refreshed', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { readAnalyticsSummary } = await import(
      '/src/utils/analyticsResource.ts'
    )
    const finishes: Array<(response: Response) => void> = []
    const signals: AbortSignal[] = []
    window.fetch = async (_url, init) => {
      signals.push(init!.signal as AbortSignal)
      return new Promise<Response>((resolve) => {
        finishes.push(resolve)
      })
    }
    const a = new AbortController()
    const old = readAnalyticsSummary(30, a.signal).catch(
      (error: Error) => error.name
    )
    await Promise.resolve()
    a.abort()
    const current = readAnalyticsSummary(30, new AbortController().signal)
    await Promise.resolve()
    const payload = (days: number, generatedAt = new Date().toISOString()) =>
      new Response(JSON.stringify({ days, generatedAt, reports: [] }))
    finishes[1](payload(30))
    const currentResult = await current
    finishes[0](payload(99))
    await old
    const cached = await readAnalyticsSummary(30, new AbortController().signal)
    const expired = readAnalyticsSummary(7, new AbortController().signal)
    await Promise.resolve()
    finishes[2](payload(7, new Date(Date.now() - 610000).toISOString()))
    await expired
    const refreshed = readAnalyticsSummary(7, new AbortController().signal)
    await Promise.resolve()
    finishes[3](payload(7))
    await refreshed
    return {
      requests: finishes.length,
      cancelledUnderlying: signals[0].aborted,
      keptNew: cached === currentResult && cached.days === 30,
    }
  })
  expect(result).toEqual({
    requests: 4,
    cancelledUnderlying: true,
    keptNew: true,
  })
})
