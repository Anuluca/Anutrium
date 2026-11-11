import { expect, test } from '@playwright/test'

import {
  babelBooks,
  mockBabelLibrary,
  openMonkeyTypewriter,
} from './helpers/babelLibrary'

test('intro defers dictionary and image export modules until an article exists', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  page.on('request', (request) => {
    if (!new URL(request.url()).searchParams.has('import'))
      requests.push(request.url())
  })
  await page.route('**/monkey-articles/generate', (route) =>
    route.fulfill({ json: babelBooks[0] })
  )
  await openMonkeyTypewriter(page)
  expect(
    requests.filter((url) =>
      /english-words.*\.txt|\/utils\/monkeyShareImage\.ts/.test(url)
    )
  ).toEqual([])
  await page.locator('.start-button').click()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    babelBooks[0].content
  )
  await expect
    .poll(
      () => requests.filter((url) => /english-words.*\.txt/.test(url)).length
    )
    .toBe(1)
  await expect
    .poll(() =>
      requests.some((url) => url.includes('/utils/monkeyShareImage.ts'))
    )
    .toBe(true)
})

test('editing serializes image exports and shares only the newest draft', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/src/utils/monkeyShareImage.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.exportsProbe = { active: 0, max: 0, count: 0 };
    export async function createMonkeyShareImage(root, title, content) {
      const probe = window.exportsProbe;
      probe.count++;
      probe.max = Math.max(probe.max, ++probe.active);
      if (probe.count === 1) await new Promise(resolve => { window.releaseExport = resolve });
      probe.active--;
      return new File([content], 'monkey.png', { type: 'image/png' });
    }
  `,
    })
  )
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as any).sharedContent = await data.files![0].text()
      },
    })
  })
  await page.route('**/monkey-articles/generate', (route) =>
    route.fulfill({ json: babelBooks[0] })
  )
  await openMonkeyTypewriter(page)
  await page.locator('.start-button').click()
  await expect
    .poll(() => page.evaluate(() => (window as any).exportsProbe?.count))
    .toBe(1)
  const content = 'A new draft that must replace the old share image.'
  await page.getByRole('textbox', { name: '文章正文' }).fill(content)
  await page.waitForTimeout(900)
  expect(await page.evaluate(() => (window as any).exportsProbe.count)).toBe(1)
  await page.evaluate(() => (window as any).releaseExport())
  await expect
    .poll(() => page.evaluate(() => (window as any).exportsProbe.count))
    .toBe(2)
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => (window as any).sharedContent))
    .toBe(content)
  expect(await page.evaluate(() => (window as any).exportsProbe.max)).toBe(1)
})

test('covered background and hidden library artwork stop drawing frames', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage
    ;(window as any).canvasProbe = { page: 0, library: 0 }
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      const key = this.canvas.closest('.monkey-lab')
        ? 'page'
        : this.canvas.closest('.babel-library')
        ? 'library'
        : null
      if (key) (window as any).canvasProbe[key]++
      return draw.apply(this, args as any)
    }
  })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await expect(page.locator('.babel-entrance .babel-title')).toHaveClass(
    /is-ready/
  )
  const before = await page.evaluate(() => (window as any).canvasProbe.page)
  await expect
    .poll(() => page.evaluate(() => (window as any).canvasProbe.page))
    .toBeGreaterThan(before)
  await page.locator('.babel-entrance').click()
  await expect(page.locator('.babel-library .babel-title')).toHaveClass(
    /is-ready/
  )
  await expect(page.locator('.library-book').first()).toBeVisible()
  const pageFrames = await page.evaluate(() => (window as any).canvasProbe.page)
  await page.waitForTimeout(250)
  expect(await page.evaluate(() => (window as any).canvasProbe.page)).toBe(
    pageFrames
  )
  await page.locator('.library-book').first().click()
  await expect(page.locator('.babel-reader')).toBeVisible()
  const libraryFrames = await page.evaluate(
    () => (window as any).canvasProbe.library
  )
  await page.waitForTimeout(250)
  expect(await page.evaluate(() => (window as any).canvasProbe.library)).toBe(
    libraryFrames
  )
})
