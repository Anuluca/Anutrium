import { expect, type Page } from '@playwright/test'

export const babelBooks = Array.from({ length: 16 }, (_, index) => ({
  id: `8200000000000-00000000-0000-4000-8000-${String(index + 1).padStart(
    12,
    '0'
  )}`,
  title: `The Library Volume ${index + 1}`,
  createdAt: '2026-11-10T01:00:00.000Z',
  words: 3,
  characters: 16,
  preview: 'A saved sentence.',
  content: 'A saved sentence.',
}))

export async function mockBabelLibrary(page: Page) {
  const calls = { list: 0 }
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    (route) => {
      const url = new URL(route.request().url())
      const book = babelBooks.find((item) =>
        url.pathname.endsWith(`/${item.id}`)
      )
      if (book) return route.fulfill({ json: book })
      calls.list++
      return route.fulfill({ json: { articles: babelBooks, nextCursor: null } })
    }
  )
  return calls
}

export async function openMonkeyTypewriter(page: Page) {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.goto('/laboratory/monkey-typewriter', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect(page.locator('.babel-entrance')).toBeVisible()
}
