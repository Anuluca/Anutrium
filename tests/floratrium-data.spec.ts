import { expect, test } from '@playwright/test'

import { FLORA_MEDIA_INDEX_TTL_MS } from '../src/utils/floratriumMedia'
import { handleFloraMedia, loadFloraMediaPage } from '../worker/src/floratrium'

test('creative albums restrict prefixes, filter images and paginate 15 items with expiring indexes', async ({
  browserName,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    `${browserName} 服务端逻辑共用`
  )
  const prefixes: string[] = []
  const delimiters: (string | undefined)[] = []
  let uploaded = false
  const bucket = {
    list: async ({
      prefix,
      delimiter,
    }: {
      prefix: string
      delimiter?: string
    }) => {
      prefixes.push(prefix)
      delimiters.push(delimiter)
      const keys = Array.from(
        { length: 31 },
        (_, i) => `${prefix}${String(i).padStart(3, '0')}.webp`
      )
      if (uploaded) keys.push(`${prefix}999.webp`)
      keys.push(
        `${prefix}video.mp4`,
        `${prefix}.hidden.webp`,
        `${prefix}test_originals/a.webp`,
        `${prefix}progress/nested.webp`,
        `${prefix}progress/deeper/nested.webp`
      )
      return { objects: keys.sort().map((key) => ({ key })), truncated: false }
    },
  } as Parameters<typeof loadFloraMediaPage>[0]
  const first = await loadFloraMediaPage(bucket, 'photography')
  expect(first.items).toHaveLength(15)
  expect(first.nextCursor).toBe('15')
  expect(first.totalItems).toBe(31)
  expect(first.totalPages).toBe(3)
  expect(
    (await loadFloraMediaPage(bucket, 'photography', '30')).items
  ).toHaveLength(1)
  const illustration = await loadFloraMediaPage(bucket, 'illustration')
  expect(illustration.totalItems).toBe(31)
  const process = await loadFloraMediaPage(bucket, 'illustrationProcess')
  expect(process.totalItems).toBe(31)
  expect(
    process.items.every((item) =>
      item.key.startsWith('Creative/illustration/prgress/')
    )
  ).toBe(true)
  expect(delimiters).toEqual(['/', '/', '/'])
  expect(prefixes).toEqual([
    'Creative/Photography/',
    'Creative/illustration/',
    'Creative/illustration/prgress/',
  ])
  const now = Date.now
  try {
    uploaded = true
    Date.now = () => now() + FLORA_MEDIA_INDEX_TTL_MS + 1
    const refreshed = await loadFloraMediaPage(bucket, 'photography')
    expect(refreshed.totalItems).toBe(32)
    expect(refreshed.items[0].key).toBe('Creative/Photography/999.webp')
  } finally {
    Date.now = now
  }
  const response = await handleFloraMedia(
    new URL('https://example.com/floratrium/media?pet=../Creative'),
    { FLORATRIUM_BUCKET: bucket } as Parameters<typeof handleFloraMedia>[1]
  )
  expect(response.status).toBe(400)
})

test('media indexes expire, isolate pets and buckets, and never cache failed scans', async ({
  browserName,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    `${browserName} 服务端逻辑共用`
  )
  let reads = 0
  let fail = false
  let revision = '001'
  const bucket = {
    list: async ({ prefix }: { prefix: string }) => {
      reads++
      if (fail) throw new Error('temporary R2 failure')
      return {
        objects: [{ key: `${prefix}${revision}.webp` }],
        truncated: false,
      }
    },
  } as Parameters<typeof loadFloraMediaPage>[0]
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  try {
    const first = await loadFloraMediaPage(bucket, 'flora')
    revision = '002'
    expect((await loadFloraMediaPage(bucket, 'flora')).items).toEqual(
      first.items
    )
    expect(reads).toBe(1)
    await loadFloraMediaPage(bucket, 'hei')
    expect(reads).toBe(2)
    await loadFloraMediaPage({ ...bucket }, 'flora')
    expect(reads).toBe(3)
    now += FLORA_MEDIA_INDEX_TTL_MS
    fail = true
    await expect(loadFloraMediaPage(bucket, 'flora')).rejects.toThrow(
      'temporary'
    )
    fail = false
    expect((await loadFloraMediaPage(bucket, 'flora')).items[0].key).toContain(
      '002'
    )
    expect(reads).toBe(5)
    await expect(
      loadFloraMediaPage(bucket, 'flora', '9007199254740992')
    ).rejects.toThrow('Invalid')
    expect(reads).toBe(5)
  } finally {
    Date.now = originalNow
  }
})

test('truncated R2 listings reject repeated cursors rather than looping forever', async ({
  browserName,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    `${browserName} 服务端逻辑共用`
  )
  let reads = 0
  const bucket = {
    list: async () => {
      reads++
      return { objects: [], truncated: true, cursor: 'same' }
    },
  } as Parameters<typeof loadFloraMediaPage>[0]
  await expect(loadFloraMediaPage(bucket, 'flora')).rejects.toThrow('Repeated')
  expect(reads).toBe(2)
})

test.describe('album data lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://localhost:3000/', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html></html>' })
    )
    await page.goto('/')
  })

  test('legacy cursors discover only the next page, and quiet refreshes preserve list identity', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { effectScope, ref, nextTick } = await import(
        '/node_modules/.vite/deps/vue.js'
      )
      const { useFloraAlbum } = await import(
        '/src/views/Home/composables/useFloraAlbum.ts'
      )
      const requests: string[] = []
      window.fetch = async (input) => {
        const url = new URL(String(input), location.origin)
        const cursor = url.searchParams.get('cursor') || ''
        requests.push(cursor)
        return new Response(
          JSON.stringify({
            items: [
              {
                key: cursor || 'first',
                url: `https://assets.anuluca.com/${cursor || 'first'}.webp`,
                type: 'image',
              },
            ],
            nextCursor: cursor ? null : 'legacy-second',
          })
        )
      }
      const scope = effectScope()
      const expanded = ref(false)
      let releases = 0
      const album = scope.run(() =>
        useFloraAlbum(
          () => 'huahua',
          expanded,
          () => releases++
        )
      )!
      const flush = async () => {
        await nextTick()
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      await flush()
      const collapsedRequests = requests.length
      expanded.value = true
      await flush()
      const openedRequests = requests.length
      const originalItems = album.allItems.value
      await album.refresh(true)
      const retainedIdentity = album.allItems.value === originalItems
      await album.changePage(1)
      const secondKey = album.allItems.value[0].key
      const discovered = album.pageCursors.value.slice()
      expanded.value = false
      await flush()
      const closedRequests = requests.length
      await album.refresh()
      const ignoredWhileClosed = requests.length === closedRequests
      scope.stop()
      return {
        collapsedRequests,
        openedRequests,
        retainedIdentity,
        requests,
        secondKey,
        discovered,
        releases,
        ignoredWhileClosed,
      }
    })
    expect(result).toMatchObject({
      collapsedRequests: 0,
      openedRequests: 1,
      retainedIdentity: true,
      requests: ['', '', 'legacy-second'],
      secondKey: 'legacy-second',
      discovered: ['', 'legacy-second'],
      releases: 1,
      ignoredWhileClosed: true,
    })
  })

  test('slow requests survive polling; pet changes and scope disposal abort stale work', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { effectScope, ref, nextTick } = await import(
        '/node_modules/.vite/deps/vue.js'
      )
      const { useFloraAlbum } = await import(
        '/src/views/Home/composables/useFloraAlbum.ts'
      )
      const signals: AbortSignal[] = []
      const resolveRequests: Array<(response: Response) => void> = []
      window.fetch = (_input, options) => {
        signals.push(options!.signal as AbortSignal)
        return new Promise<Response>((resolve) => resolveRequests.push(resolve))
      }
      const scope = effectScope()
      const pet = ref('huahua')
      const expanded = ref(false)
      const album = scope.run(() =>
        useFloraAlbum(
          () => pet.value,
          expanded,
          () => {}
        )
      )!
      expanded.value = true
      await nextTick()
      await album.refresh(true)
      const skippedPoll = signals.length === 1 && !signals[0].aborted
      pet.value = 'xiaohei'
      await nextTick()
      const reset =
        !expanded.value &&
        album.allItems.value.length === 0 &&
        signals[0].aborted
      resolveRequests[0](
        new Response(
          JSON.stringify({
            items: [{ key: 'old', url: 'old.webp', type: 'image' }],
            nextCursor: null,
          })
        )
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      const staleIgnored =
        album.allItems.value.length === 0 && !album.error.value
      expanded.value = true
      await nextTick()
      scope.stop()
      const disposed = signals[1].aborted
      resolveRequests[1](
        new Response(JSON.stringify({ items: [], nextCursor: null }))
      )
      return { skippedPoll, reset, staleIgnored, disposed }
    })
    expect(result).toEqual({
      skippedPoll: true,
      reset: true,
      staleIgnored: true,
      disposed: true,
    })
  })

  test('known page counts allow direct jumps with one request per visited page', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { effectScope, ref, nextTick } = await import(
        '/node_modules/.vite/deps/vue.js'
      )
      const { useFloraAlbum } = await import(
        '/src/views/Home/composables/useFloraAlbum.ts'
      )
      const requests: string[] = []
      window.fetch = async (input) => {
        const cursor =
          new URL(String(input), location.origin).searchParams.get('cursor') ||
          ''
        requests.push(cursor)
        return new Response(
          JSON.stringify({ items: [], nextCursor: '28', totalPages: 100 })
        )
      }
      const scope = effectScope()
      const expanded = ref(false)
      const album = scope.run(() =>
        useFloraAlbum(
          () => 'huahua',
          expanded,
          () => {}
        )
      )!
      expanded.value = true
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))
      await album.goToPage(100)
      const result = {
        requests,
        pageIndex: album.pageIndex.value,
        totalPages: album.totalPages.value,
      }
      scope.stop()
      return result
    })
    expect(result).toEqual({
      requests: ['', String(99 * 28)],
      pageIndex: 99,
      totalPages: 100,
    })
  })
})

test('gallery state updates reuse parsed thumbnail URLs', async ({ page }) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.route('https://assets.anuluca.com/**', (route) => route.abort())
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { createApp, h, nextTick } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const root = document.createElement('div')
    document.body.append(root)
    const app = createApp({
      render: () =>
        h(Gallery, {
          items: [{ url: 'https://assets.anuluca.com/test.webp' }],
        }),
    })
    app.mount(root)
    await nextTick()
    const image = root.querySelector('img')!
    const before = image.src
    const originalURL = window.URL
    let parses = 0
    window.URL = new Proxy(originalURL, {
      construct(target, args) {
        parses++
        return Reflect.construct(target, args)
      },
    })
    try {
      Object.defineProperty(image, 'naturalWidth', { value: 640 })
      Object.defineProperty(image, 'naturalHeight', { value: 480 })
      image.decode = () => Promise.resolve()
      image.dispatchEvent(new Event('load'))
      await nextTick()
      await nextTick()
      return { parses, unchanged: before === image.src, source: image.src }
    } finally {
      window.URL = originalURL
      app.unmount()
    }
  })
  expect(result.parses).toBe(0)
  expect(result.unchanged).toBe(true)
  expect(result.source).toContain('image=card-thumb')
})

test('album request timeout ends loading and a retry can recover', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { effectScope, ref, nextTick } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { useFloraAlbum } = await import(
      '/src/views/Home/composables/useFloraAlbum.ts'
    )
    const nativeTimer = window.setTimeout
    window.setTimeout = (handler, timeout, ...args) =>
      nativeTimer(handler, timeout === 15000 ? 10 : timeout, ...args)
    const scope = effectScope()
    try {
      window.fetch = (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener(
            'abort',
            () => reject(new DOMException('Timeout', 'AbortError')),
            { once: true }
          )
        })
      const expanded = ref(false)
      const album = scope.run(() =>
        useFloraAlbum(
          () => 'huahua',
          expanded,
          () => {}
        )
      )!
      expanded.value = true
      await nextTick()
      await new Promise((resolve) => nativeTimer(resolve, 50))
      const timedOut = album.error.value && !album.loading.value
      window.fetch = async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                key: 'recovered',
                url: 'https://assets.anuluca.com/recovered.webp',
                type: 'image',
              },
            ],
            nextCursor: null,
            totalPages: 1,
          })
        )
      await album.refresh()
      return {
        timedOut,
        recovered:
          !album.error.value && album.allItems.value[0]?.key === 'recovered',
      }
    } finally {
      scope.stop()
      window.setTimeout = nativeTimer
    }
  })
  expect(result).toEqual({ timedOut: true, recovered: true })
})
