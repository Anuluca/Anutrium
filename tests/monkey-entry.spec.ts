import { expect, type Page, test } from '@playwright/test'

import { monkeyTypewriterImages } from '../src/utils/preloadMonkeyTypewriterAssets'

const path = '/laboratory/monkey-typewriter'
const push = (page: Page) =>
  page.evaluate((path) => {
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push(path)
  }, path)

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.goto('/colorPalette', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.palette-tool')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
})

test('entry waits for both images before revealing the module', async ({
  page,
}) => {
  const releases: Array<() => void> = []
  const requested = new Set<string>()
  for (const src of Object.values(monkeyTypewriterImages)) {
    const response = await page.request.get(src)
    expect(response.ok()).toBe(true)
    const gate = new Promise<void>((resolve) => releases.push(resolve))
    await page.route(src, async (route) => {
      requested.add(src)
      await gate
      await route.fulfill({ response })
    })
  }
  try {
    await push(page)
    await expect.poll(() => requested.size).toBe(2)
    await expect(page.locator('.route-curtain')).toHaveAttribute(
      'data-phase',
      'covered'
    )
    await expect(page).toHaveURL(/\/colorPalette$/)
    await expect(page.locator('.monkey-lab')).toHaveCount(0)
    releases[0]()
    await expect
      .poll(() =>
        page.evaluate((src) => {
          const image = new Image()
          image.src = src
          return image.complete && image.naturalWidth > 0
        }, monkeyTypewriterImages.typewriter)
      )
      .toBe(true)
    await expect(page).toHaveURL(/\/colorPalette$/)
    await expect(page.locator('.monkey-lab')).toHaveCount(0)
    releases[1]()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('.route-curtain')).toHaveCount(0)
    await expect(page.locator('.monkey-lab')).toBeVisible()
    for (const selector of ['.typewriter-photo > img', '.babel-photo > img'])
      expect(
        await page
          .locator(selector)
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0
          )
      ).toBe(true)
  } finally {
    releases.forEach((release) => release())
  }
})

test('failed image cancels entry and a later attempt retries', async ({
  page,
}) => {
  let fail = true
  await page.route(monkeyTypewriterImages.typewriter, (route) =>
    fail ? route.abort('failed') : route.continue()
  )
  await push(page)
  await expect(page.locator('.el-message--error')).toContainText(
    '图片加载失败，请稍后重试'
  )
  await expect(page).toHaveURL(/\/colorPalette$/)
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await expect(page.locator('.monkey-lab')).toHaveCount(0)
  fail = false
  await push(page)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.locator('.monkey-lab')).toBeVisible()
})
