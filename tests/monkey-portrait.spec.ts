import { expect, test } from '@playwright/test'

import {
  babelBooks,
  mockBabelLibrary,
  openMonkeyTypewriter,
} from './helpers/babelLibrary'

test('mobile monkey page reads upright and fits narrow screens without losing the draft', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chrome')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBabelLibrary(page)
  await page.route('**/monkey-articles/generate', (route) =>
    route.fulfill({ json: babelBooks[0] })
  )
  await openMonkeyTypewriter(page)
  await expect(page.locator('.replica-experiment-page')).not.toHaveCSS(
    'position',
    'fixed'
  )
  await expect(page.locator('.replica-content')).toHaveCSS('transform', 'none')
  await expect(page.locator('.start-button')).toHaveText('START')
  await page.screenshot({
    path: 'test-results/monkey-portrait-intro.png',
    fullPage: true,
  })
  await page.locator('.start-button').click()
  const editor = page.getByRole('textbox', { name: '文章正文' })
  await expect(editor).toHaveValue(babelBooks[0].content)
  const draft = 'An upright English draft on a mobile screen.'
  await editor.fill(draft)
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 393, height: 851 },
  ]) {
    await page.setViewportSize(viewport)
    await expect
      .poll(() =>
        page.locator('.monkey-lab').evaluate((root) => {
          const area = root
            .querySelector('.manuscript-frame')!
            .getBoundingClientRect()
          const photo = root
            .querySelector('.photo-header')!
            .getBoundingClientRect()
          const stage = root.closest('.replica-stage')!
          const matrix = new DOMMatrix(getComputedStyle(stage).transform)
          const controls = Array.from(
            root.querySelectorAll('.draft-actions button')
          ).filter((button) => getComputedStyle(button).display !== 'none')
          return (
            matrix.a === 1 &&
            matrix.b === 0 &&
            matrix.c === 0 &&
            area.top >= photo.bottom - 1 &&
            area.height >= 320 &&
            document.documentElement.scrollWidth <= innerWidth + 1 &&
            controls.every((button) => {
              const box = button.getBoundingClientRect()
              return box.left >= -1 && box.right <= innerWidth + 1
            })
          )
        })
      )
      .toBe(true)
    await expect(editor).toHaveValue(draft)
  }
  await expect(page.locator('.draft-actions-left > button').first()).toHaveCSS(
    'opacity',
    '1'
  )
  await page.locator('.save-button').scrollIntoViewIfNeeded()
  await expect(page.locator('.save-button')).toBeInViewport()
  await page.screenshot({
    path: 'test-results/monkey-portrait-article.png',
    fullPage: true,
  })
  await page.locator('.babel-entrance').click()
  await expect(page.locator('.babel-library-dialog')).toBeVisible()
  await page.locator('.modal-close-row .diamond-close-btn').click()
  await expect(editor).toHaveValue(draft)
})
