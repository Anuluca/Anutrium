import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
})

const openDetail = async (page: Page) => {
  await page.goto('/flanerie/changsha?from=home', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.route-curtain')).toHaveCount(0)
}

const push = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<void> }
          }
        }
      }
    }
    await app.__vue_app__.config.globalProperties.$router.push(path)
  }, path)

test('wipe covers before routing and reveals a ready home', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await page.evaluate(() => {
    const phases: Array<{ phase: string; path: string }> = []
    ;(window as any).curtainPhases = phases
    new MutationObserver(() => {
      const curtain = document.querySelector<HTMLElement>('.route-curtain')
      if (curtain)
        phases.push({ phase: curtain.dataset.phase!, path: location.pathname })
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-phase'],
    })
  })
  const back = page.locator('.detail-page-header__back')
  await back.click()
  const curtain = page.locator('.route-curtain')
  await expect(curtain).toHaveAttribute('data-phase', 'cover')
  expect(new URL(page.url()).pathname).toBe('/flanerie/changsha')
  await expect(curtain).toHaveAttribute('data-effect', 'wipe')
  const translation = await curtain
    .locator('.route-curtain-panel')
    .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)
  expect(translation).toBeLessThan(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
  await expect(curtain).toHaveCount(0, { timeout: 15000 })
  const phases = await page.evaluate(
    () =>
      (window as any).curtainPhases as Array<{ phase: string; path: string }>
  )
  expect(
    phases.some(
      (sample) =>
        sample.phase === 'cover' && sample.path === '/flanerie/changsha'
    )
  ).toBe(true)
  expect(
    phases.some((sample) => sample.phase === 'reveal' && sample.path === '/')
  ).toBe(true)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false'
  )
})

test('detail parameter navigation and browser back both use the wipe', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await push(page, '/flanerie/nanchang')
  await expect(page.locator('.route-curtain')).toHaveAttribute(
    'data-phase',
    'reveal'
  )
  await expect(page.locator('.route-curtain')).toHaveAttribute(
    'data-effect',
    'wipe'
  )
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/flanerie\/changsha/)
  await expect(page.locator('.route-curtain')).toHaveAttribute(
    'data-effect',
    'wipe'
  )
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 15000,
  })
  await expect(page.locator('.flr-page')).toBeVisible()
})

test('reduced motion skips the wipe and keeps navigation usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDetail(page)
  await push(page, '/craft')
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(page.locator('.route-curtain')).toHaveCount(0)
})

test('home module selection does not create a route curtain', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    ;(window as any).curtainSeen = false
    new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes].some(
            (node) =>
              node instanceof Element &&
              node.classList.contains('route-curtain')
          )
        )
      )
        (window as any).curtainSeen = true
    }).observe(document.body, { childList: true })
  })
  if (testInfo.project.name.includes('mobile'))
    await page.getByRole('button', { name: '切换导航菜单' }).click()
  const path = page.url()
  await page.locator('[data-temple-nav="sprigatito"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
  expect(page.url()).toBe(path)
  expect(await page.evaluate(() => (window as any).curtainSeen)).toBe(false)
  await push(page, '/archive')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive',
    { timeout: 30000 }
  )
  expect(await page.evaluate(() => (window as any).curtainSeen)).toBe(false)
  await expect(page.locator('.router-container')).not.toHaveCSS(
    'position',
    'fixed'
  )
})

test('aborted and superseded navigations remove the curtain', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  const outcomes = await page.evaluate(async () => {
    const app = document.querySelector('#app') as any
    const router = app.__vue_app__.config.globalProperties.$router
    const removeGuard = router.beforeResolve((to: { path: string }) =>
      to.path === '/craft' ? false : undefined
    )
    await router.push('/craft')
    removeGuard()
    const abortedClean = !document.querySelector('.route-curtain')
    const first = router.push('/craft')
    await new Promise((resolve) => setTimeout(resolve, 120))
    await Promise.allSettled([first, router.push('/flanerie/nanchang')])
    return { abortedClean }
  })
  expect(outcomes.abortedClean).toBe(true)
  await expect(page).toHaveURL(/\/flanerie\/nanchang/)
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 15000,
  })
  await expect(page.locator('.flr-page')).toBeVisible()
})
