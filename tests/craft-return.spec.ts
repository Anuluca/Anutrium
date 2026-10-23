import { expect, type Page, test } from '@playwright/test'

const ready = async (page: Page) => {
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    {
      timeout: 45000,
    }
  )
  await expect(
    page.locator('.entry-overlay-container, .route-curtain')
  ).toHaveCount(0, {
    timeout: 30000,
  })
}
const offset = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const root = element.closest('.scroll-viewport__scroll')!
    const transform = element.matches('[data-craft-tool]')
      ? getComputedStyle(element).transform
      : 'none'
    const translateY =
      transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
    return (
      element.getBoundingClientRect().top -
      root.getBoundingClientRect().top -
      translateY
    )
  })

for (const expanded of [false, true]) {
  test(`tool return restores card position and filter, expanded=${expanded}`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const path = `/creative?current=craft&isExpand=${expanded}`
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await ready(page)
    const craft = page.locator('.craft-content')
    await craft
      .locator('.filter-rail button')
      .filter({ hasText: 'DESIGN' })
      .click()
    const selector = '[data-craft-tool="motion"]'
    const card = page.locator(selector)
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    await card.focus()
    await expect
      .poll(() =>
        card.evaluate(
          (element) =>
            element
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length
        )
      )
      .toBe(0)
    const before = await offset(page, selector)
    await card.click()
    await expect(page).toHaveURL(/\/easeStudio$/, { timeout: 30000 })
    await expect(page.locator('.route-curtain')).toHaveCount(0, {
      timeout: 30000,
    })
    await page.locator('.detail-page-header__back').click()
    await expect(page).toHaveURL(`http://localhost:3000${path}`)
    await ready(page)
    await expect(craft.locator('.filter-rail .is-active')).toContainText(
      'DESIGN'
    )
    await expect(craft.locator('.shared-tool-card')).toHaveCount(2)
    await expect
      .poll(async () => Math.abs((await offset(page, selector)) - before), {
        timeout: 15000,
      })
      .toBeLessThanOrEqual(1)
    await expect(page.locator('.temple-page')).toHaveClass(
      expanded ? /temple-page--expanded/ : /^(?!.*temple-page--expanded)/
    )
  })
}

test('direct tool entry returns to the craft section', async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/metronome', { waitUntil: 'domcontentloaded' })
  await page.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL('http://localhost:3000/creative?current=craft')
  await ready(page)
  await expect
    .poll(
      async () => Math.abs(await offset(page, '[data-section-label="CRAFT"]')),
      {
        timeout: 15000,
      }
    )
    .toBeLessThanOrEqual(1)
})

test('craft exists only inside creative and the removed route resolves to 404', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative?current=craft', { waitUntil: 'domcontentloaded' })
  await ready(page)
  await expect(
    page.locator('.creative-content .craft-content .shared-tool-card')
  ).toHaveCount(6)
  const removed = await page.evaluate(async () => {
    const router = (document.querySelector('#app') as any).__vue_app__.config
      .globalProperties.$router
    const exists = router
      .getRoutes()
      .some((route: any) => route.path === '/craft' || route.name === 'CRAFT')
    await router.push('/craft')
    return !exists
  })
  expect(removed).toBe(true)
  await expect(page).toHaveURL(/\/404$/, { timeout: 30000 })
})
