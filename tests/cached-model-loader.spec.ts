import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // 隔离下载器，避免首页 GPU 和真实模型下载干扰缓存、取消与超时验证。
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
})

test('concurrent model consumers share a download and the resolved cache', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createCachedModelLoader } = await import(
      '/src/utils/cachedModelLoader.ts'
    )
    const paths: string[] = []
    window.fetch = async (path) => {
      paths.push(String(path))
      return new Response('{"version":1}')
    }
    const load = createCachedModelLoader(
      'revision-1',
      'Model',
      async (fetchAsset) => (await fetchAsset('model.json')).json()
    )
    const first = load()
    const second = load()
    const [a, b] = await Promise.all([first, second])
    return { shared: first === second && load() === first && a === b, paths, a }
  })
  expect(result).toEqual({
    shared: true,
    paths: ['/models/model.json?v=revision-1'],
    a: { version: 1 },
  })
})

test('a failed model batch aborts pending peers and allows a fresh retry', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createCachedModelLoader } = await import(
      '/src/utils/cachedModelLoader.ts'
    )
    let healthy = false
    let aborted = false
    let requests = 0
    window.fetch = async (path, init) => {
      if (init?.cache === 'only-if-cached')
        return new Response(null, { status: 504 })
      requests++
      if (!healthy && String(path).includes('model.bin'))
        return new Promise<Response>((_, reject) => {
          init!.signal!.addEventListener(
            'abort',
            () => {
              aborted = true
              reject(new DOMException('Cancelled', 'AbortError'))
            },
            { once: true }
          )
        })
      return new Response('{}', { status: healthy ? 200 : 503 })
    }
    const load = createCachedModelLoader('1', 'Model', (fetchAsset) =>
      Promise.all([
        fetchAsset('model.json').then((response) => response.json()),
        fetchAsset('model.bin').then((response) => response.arrayBuffer()),
      ])
    )
    const failed = load()
    const error = await failed.catch((error: Error) => error.message)
    healthy = true
    const retry = load()
    await retry
    return {
      error,
      aborted,
      requests,
      fresh: retry !== failed,
      cached: load() === retry,
    }
  })
  expect(result).toEqual({
    error: 'Model model.json: 503',
    aborted: true,
    requests: 4,
    fresh: true,
    cached: true,
  })
})

test('model timeout covers response body reads and releases the cache for retry', async ({
  page,
}) => {
  await page.clock.install()
  await page.evaluate(async () => {
    const { createCachedModelLoader } = await import(
      '/src/utils/cachedModelLoader.ts'
    )
    const probe = {
      aborted: false,
      bodyStarted: false,
      healthy: false,
      failed: false,
    }
    window.fetch = async (_, init) => {
      if (probe.healthy) return new Response('ok')
      return new Response(
        new ReadableStream({
          start(controller) {
            probe.bodyStarted = true
            init!.signal!.addEventListener(
              'abort',
              () => {
                probe.aborted = true
                controller.error(new DOMException('Cancelled', 'AbortError'))
              },
              { once: true }
            )
          },
        })
      )
    }
    const load = createCachedModelLoader('1', 'Model', async (fetchAsset) =>
      (await fetchAsset('model.bin')).text()
    )
    const failed = load().catch(() => {
      probe.failed = true
    })
    ;(window as any).modelTimeoutProbe = { probe, load, failed }
  })
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).modelTimeoutProbe.probe.bodyStarted)
    )
    .toBe(true)
  await page.clock.runFor(30001)
  const result = await page.evaluate(async () => {
    const { probe, load, failed } = (window as any).modelTimeoutProbe
    await failed
    probe.healthy = true
    return { aborted: probe.aborted, failed: probe.failed, retry: await load() }
  })
  expect(result).toEqual({ aborted: true, failed: true, retry: 'ok' })
})

test('startup cache probes stop after the entrance mode is decided', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { fetchStartupAsset, finishStartupCacheCheck, startupCacheState } =
      await import('/src/utils/startupCache.ts')
    const modes: (RequestCache | undefined)[] = []
    window.fetch = async (_, init) => {
      modes.push(init?.cache)
      return new Response('cached')
    }
    const signal = new AbortController().signal
    await fetchStartupAsset('/models/initial.bin', signal)
    const state = startupCacheState.value
    finishStartupCacheCheck()
    await fetchStartupAsset('/models/later.bin', signal)
    return { modes, state, finalState: startupCacheState.value }
  })
  expect(result).toEqual({
    modes: ['only-if-cached', undefined],
    state: 'hit',
    finalState: 'hit',
  })
})
