import { expect, type Page, test } from '@playwright/test'

test.setTimeout(90000)
test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})
const push = (page: Page, path: string) =>
  page.evaluate(async (target) => {
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push(target)
  }, path)

test('home enters when the loading line fades and the footer follows above the overlay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const probe = {
      shrinkStarted: 0,
      fadeStarted: 0,
      modelStarted: 0,
      modelEnteredDuringShrink: false,
      footerAboveOverlay: false,
    }
    document.addEventListener('animationstart', (event) => {
      const animation = event as AnimationEvent
      if (
        (animation.target as Element).matches('.loading-line') &&
        animation.animationName.includes('loading-line-lifecycle')
      )
        probe.fadeStarted = performance.now()
    })
    const observer = new MutationObserver(() => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      const overlay = document.querySelector('.entry-overlay-container')
      const footer = document.querySelector('.footer-com')
      if (
        !probe.shrinkStarted &&
        overlay?.classList.contains('is-background-exiting')
      )
        probe.shrinkStarted = performance.now()
      if (!probe.modelStarted && stage?.dataset.entrancePhase === 'statue') {
        probe.modelStarted = performance.now()
        probe.modelEnteredDuringShrink =
          !!overlay?.classList.contains('is-background-exiting') &&
          !!footer &&
          Number(getComputedStyle(footer).opacity) < 0.1
      }
      if (probe.modelStarted && footer?.classList.contains('footer-ready')) {
        probe.footerAboveOverlay =
          !!overlay &&
          footer.parentElement === document.body &&
          Number(getComputedStyle(footer).zIndex) >
            Number(getComputedStyle(overlay).zIndex)
        observer.disconnect()
      }
    })
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
    })
    ;(window as any).homeEntryProbe = probe
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect
    .poll(
      () => page.evaluate(() => (window as any).homeEntryProbe.modelStarted),
      { timeout: 30000 }
    )
    .toBeGreaterThan(0)
  const footer = page.locator('.footer-com')
  await expect(footer).toHaveClass(/footer-ready/, { timeout: 30000 })
  const probe = await page.evaluate(() => (window as any).homeEntryProbe)
  expect(probe.modelEnteredDuringShrink).toBe(true)
  expect(probe.footerAboveOverlay).toBe(true)
  expect(probe.fadeStarted).toBeGreaterThan(0)
  expect(Math.abs(probe.modelStarted - probe.fadeStarted)).toBeLessThan(100)
  await expect(footer).toHaveCSS('transition-delay', /^0s(?:, 0s)*$/)
  await expect(footer.locator('.expand')).toHaveCSS('transition-delay', '0s')
  await expect(footer).toHaveClass(/footer-expanded/)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 10000,
  })
  await expect(footer).toHaveCSS('z-index', '100')
  await expect(footer).not.toHaveClass(/footer-above-entry-overlay/)
})

test('site loader waits for home assets without displaying a second page loader', async ({
  page,
}) => {
  let release!: () => void
  const assetGate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/models/lucario-island.bin*', async (route) => {
    await assetGate
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const overlay = page.locator('.entry-overlay-container')
    const stage = page.locator('.temple-stage')
    await expect(overlay).toBeVisible({ timeout: 20000 })
    await expect(stage).toBeAttached()
    await expect(page.locator('.temple-preparation-progress')).toHaveCount(0)
    await expect(page.locator('.entry-loading-progress')).toHaveCount(1)
    // 超过原入口动画的强制隐藏时间，真实资源未就绪时仍不能报 100% 或撤掉遮罩。
    await page.waitForTimeout(7000)
    await expect(overlay).toBeVisible()
    expect(
      Number(
        await overlay
          .locator('[role="progressbar"]')
          .getAttribute('aria-valuenow')
      )
    ).toBeLessThan(100)
    await expect(stage).not.toHaveAttribute('data-shader-warmup', 'complete')
    await expect(stage).toHaveCSS('opacity', '0')
    release()
    await expect(stage).toHaveAttribute('data-shader-warmup', 'complete', {
      timeout: 30000,
    })
    await expect(overlay).toHaveCount(0, { timeout: 15000 })
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 15000,
    })
    await expect(page.locator('.entry-loading-progress')).toHaveCount(0)
  } finally {
    release()
  }
})

test('returning to home skips the global loader and reuses model downloads', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const assets: string[] = []
  page.on('response', (response) => {
    if (response.ok() && response.url().includes('/models/'))
      assets.push(new URL(response.url()).pathname)
  })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await push(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await page.evaluate(() => {
    const probe = {
      seen: false,
      aligned: false,
      observer: new MutationObserver(() => {
        const element = document.querySelector('.site-loading-progress')
        if (element) {
          probe.seen = true
          const bounds = element.getBoundingClientRect()
          probe.aligned ||=
            getComputedStyle(element).position === 'fixed' &&
            Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2) <= 1 &&
            Math.abs(bounds.height - 1) <= 0.01
        }
      }),
    }
    probe.observer.observe(document.body, { childList: true, subtree: true })
    ;(window as any).siteLoadingProbe = probe
  })
  await push(page, '/archive')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.site-loading-progress')).toHaveCount(0)
  expect(
    await page.evaluate(() => {
      const probe = (window as any).siteLoadingProbe
      probe.observer.disconnect()
      return { seen: probe.seen, aligned: probe.aligned }
    })
  ).toEqual({ seen: false, aligned: false })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await expect(
    page.locator('.temple-page .entry-loading-progress')
  ).toHaveCount(0)
  for (const name of [
    'lucario-island.json',
    'lucario-island.bin',
    'lucario-studio.json',
    'lucario-studio.bin.gz',
  ])
    expect(assets.filter((path) => path === `/models/${name}`)).toHaveLength(1)
})

test('failed home preparation releases the site loader and can be retried on return', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/models/lucario-island.bin*', (route) =>
    route.fulfill({ status: 503, body: '' })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lucario-status')).toBeVisible({ timeout: 25000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  await expect(page.locator('.entry-loading-progress')).toHaveCount(0)
  await page.unroute('**/models/lucario-island.bin*')
  await push(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await push(page, '/')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.lucario-status')).toHaveCount(0)
  await expect(page.locator('.entry-loading-progress')).toHaveCount(0)
})

test('stalled model requests time out and release the global loading overlay', async ({
  page,
}) => {
  await page.clock.install()
  let requested = false
  await page.route('**/models/lucario-island.bin*', () => {
    requested = true
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => requested).toBe(true)
  // 路由预取比场景挂载更早；先确认场景已订阅同一加载任务，再推进超时时钟。
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-model',
    'lucario'
  )
  await page.clock.fastForward(31000)
  await expect(page.locator('.lucario-status')).toBeAttached()
  await page.clock.runFor(3500)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await expect(page.locator('.entry-loading-progress')).toHaveCount(0)
  await expect(page.locator('.lucario-status')).toBeVisible()
})
