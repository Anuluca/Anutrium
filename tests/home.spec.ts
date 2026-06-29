import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

const pageRoutes = [
  { path: '/', selector: '.home-page', title: /HOME|Anutrium/ },
  { path: '/archive', selector: '.archives-page', title: /ARCHIVE|作品集/ },
  { path: '/flanerie', selector: '.flanerie-page', title: /FLÂNERIE|旅程/ },
  { path: '/craft', selector: '.craft-page', title: /CRAFT|工具/ },
  { path: '/about', selector: '.about-page', title: /ABOUT|关于/ },
]

test.describe('top-level pages', () => {
  for (const route of pageRoutes) {
    test(`${route.path} renders page content`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector).first()).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})

test('flanerie detail page renders', async ({ page }) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page).toHaveTitle(/长沙|CHANGSHA|FLÂNERIE/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.not-found-page')).toHaveCount(0)
})

const craftToolRoutes = [
  {
    path: '/colorPalette',
    selector: '.palette-tool',
    title: /COLOR PALETTE|调色盘/,
  },
  {
    path: '/easeStudio',
    selector: '.ease-tool',
    title: /EASE STUDIO|缓动工作室/,
  },
  {
    path: '/metronome',
    selector: '.metronome-tool',
    title: /METRONOME|节拍器/,
  },
  {
    path: '/bounceDynamics',
    selector: '.bounce-tool',
    title: /BOUNCING BALL|弹力球/,
  },
  {
    path: '/htmlEntities',
    selector: '.entity-tool',
    title: /HTML ENTITIES|HTML常用转义字符/,
  },
  {
    path: '/base64Codec',
    selector: '.codec-tool',
    title: /BASE64 CODEC|Base64加解密/,
  },
  {
    path: '/imageBase64',
    selector: '.image64-tool',
    title: /IMAGE BASE64|图片转Base64/,
  },
]

test.describe('craft tool pages', () => {
  for (const route of craftToolRoutes) {
    test(`${route.path} renders tool page`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector)).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})
