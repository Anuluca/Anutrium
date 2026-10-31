/* eslint-disable vue/one-component-per-file -- 每个生命周期用例独立挂载 Vue 测试实例。 */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/__performance-audit', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="fixture"></div>',
    })
  )
  await page.goto('/__performance-audit')
})

test('cancelled image preloads can retry while completed URLs stay deduplicated', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createApp } = await import('/node_modules/.vite/deps/vue.js')
    const { useImagePreloader } = await import(
      '/src/composables/useImagePreloader.ts'
    )
    const originalImage = window.Image
    const images: any[] = []
    window.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      setAttribute() {}
      constructor() {
        images.push(this)
      }
    } as any
    let preloader!: ReturnType<typeof useImagePreloader>
    const app = createApp({
      setup() {
        preloader = useImagePreloader()
        return () => null
      },
    })
    app.mount('#fixture')
    try {
      preloader.preloadImages(['completed', 'cancelled', 'completed'])
      images[0].onload()
      preloader.cancelPendingPreloads()
      const cancelledSource = images[1].src
      preloader.preloadImages(['completed', 'cancelled'])
      const retried = images.length
      images[2].onerror()
      preloader.preloadImages(['cancelled'])
      app.unmount()
      return {
        cancelledSource,
        retried,
        total: images.length,
        cleaned: images.every(
          (image) => image.onload === null && image.onerror === null
        ),
      }
    } finally {
      window.Image = originalImage
    }
  })
  expect(result).toEqual({
    cancelledSource: '',
    retried: 3,
    total: 4,
    cleaned: true,
  })
})

test('shared progress reacts to animation toggles, resets and scope disposal', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { effectScope, nextTick, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { useAnimatedProgress } = await import(
      '/src/composables/useAnimatedProgress.ts'
    )
    const progress = ref(50)
    const animated = ref(true)
    const scope = effectScope()
    const displayed = scope.run(() =>
      useAnimatedProgress(
        () => progress.value,
        () => animated.value
      )
    )!
    animated.value = false
    await nextTick()
    const snapped = displayed.value
    animated.value = true
    progress.value = 10
    await nextTick()
    const reset = displayed.value
    progress.value = 100
    await nextTick()
    scope.stop()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return { snapped, reset, afterDispose: displayed.value }
  })
  expect(result).toEqual({ snapped: 50, reset: 10, afterDispose: 10 })
})

test('Steam formats only visible games and preserves sorting, search and pagination', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createApp, nextTick } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { createI18n } = await import('/node_modules/.vite/deps/vue-i18n.js')
    const { useSteamProfile } = await import(
      '/src/composables/useSteamProfile.ts'
    )
    const originalFetch = window.fetch
    const originalFormat = Object.getOwnPropertyDescriptor(
      Intl.DateTimeFormat.prototype,
      'format'
    )!
    let dateFormats = 0
    Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', {
      configurable: true,
      get() {
        const format = originalFormat.get!.call(this)
        return (...args: unknown[]) => {
          dateFormats++
          return format(...args)
        }
      },
    })
    const games = Array.from({ length: 200 }, (_, index) => ({
      appid: index,
      name: `Game ${index}`,
      playtime_forever: index * 60,
      rtime_last_played: 1700000000,
    }))
    window.fetch = async () =>
      new Response(
        JSON.stringify({ ownedGames: { game_count: games.length, games } })
      )
    let profile!: ReturnType<typeof useSteamProfile>
    const app = createApp({
      setup() {
        profile = useSteamProfile()
        return () => null
      },
    })
    app.use(createI18n({ legacy: false, locale: 'en' }))
    app.mount('#fixture')
    try {
      await profile.loadProfile()
      await nextTick()
      const totalGames = profile.filteredGames.value.length
      const formatsBeforeVisible = dateFormats
      const initial = profile.visibleGames.value
      const initialFormats = dateFormats
      profile.showMoreGames()
      const expanded = profile.visibleGames.value.length
      profile.gameSearchQuery.value = 'Game 19'
      await nextTick()
      return {
        totalGames,
        formatsBeforeVisible,
        initialFormats,
        initialCount: initial.length,
        firstId: initial[0].appid,
        label: initial[0].playtimeLabel,
        expanded,
        matches: profile.filteredGames.value.length,
        visibleMatches: profile.visibleGames.value.length,
      }
    } finally {
      app.unmount()
      window.fetch = originalFetch
      Object.defineProperty(
        Intl.DateTimeFormat.prototype,
        'format',
        originalFormat
      )
    }
  })
  expect(result).toEqual({
    totalGames: 200,
    formatsBeforeVisible: 0,
    initialFormats: 30,
    initialCount: 30,
    firstId: 199,
    label: '199 h',
    expanded: 60,
    matches: 11,
    visibleMatches: 11,
  })
})

test('palette replaces and releases uploaded image URLs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/colorPalette')
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached()
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 4
    const context = canvas.getContext('2d')!
    return ['#ff0000', '#00ff00'].map((color) => {
      context.fillStyle = color
      context.fillRect(0, 0, 4, 4)
      return canvas.toDataURL().split(',')[1]
    })
  })
  await page.evaluate(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    ;(window as any).revokedImageUrls = []
    URL.revokeObjectURL = (url) => {
      ;(window as any).revokedImageUrls.push(url)
      revoke(url)
    }
  })
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({
    name: 'red.png',
    mimeType: 'image/png',
    buffer: Buffer.from(images[0], 'base64'),
  })
  await expect(page.locator('.pt-swatch-segment')).toHaveText('#FF0000')
  const firstUrl = await page.locator('.pt-preview-img').getAttribute('src')
  expect(firstUrl).toMatch(/^blob:/)
  await input.setInputFiles({
    name: 'green.png',
    mimeType: 'image/png',
    buffer: Buffer.from(images[1], 'base64'),
  })
  await expect(page.locator('.pt-swatch-segment')).toHaveText('#00FF00')
  const secondUrl = await page.locator('.pt-preview-img').getAttribute('src')
  await page.evaluate(() =>
    (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/404')
  )
  expect(await page.evaluate(() => (window as any).revokedImageUrls)).toEqual([
    firstUrl,
    secondUrl,
  ])
})

test('image encoder cancels the previous upload before committing the latest result', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/imageBase64')
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached()
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const result = await page.evaluate(() => {
    const originalAbort = FileReader.prototype.abort
    let aborts = 0
    FileReader.prototype.abort = function () {
      aborts++
      return originalAbort.call(this)
    }
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    for (const text of ['previous', 'latest']) {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], `${text}.png`, { type: 'image/png' }))
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    FileReader.prototype.abort = originalAbort
    return aborts
  })
  expect(result).toBe(1)
  await expect(page.locator('.preview-img')).toHaveAttribute(
    'src',
    'data:image/png;base64,bGF0ZXN0'
  )
})
