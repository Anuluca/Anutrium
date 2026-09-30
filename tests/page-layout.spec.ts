import { expect, type Page, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000
const MAX_GEOMETRY_DELTA = 1

interface TestRouter {
  push: (path: string) => Promise<void>
  getRoutes: () => Array<{
    name?: string | symbol
    meta: { pageLayout?: unknown }
  }>
}

type VueAppElement = HTMLElement & {
  __vue_app__?: {
    config: {
      globalProperties: {
        $router: TestRouter
      }
    }
  }
}

const navigateWithRouter = async (page: Page, path: string) => {
  await page.evaluate(async (targetPath) => {
    const app = document.querySelector<VueAppElement>('#app')
    await app?.__vue_app__?.config.globalProperties.$router.push(targetPath)
  }, path)

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: PAGE_LOAD_TIMEOUT })
    .toBe(path)
}

test('every route explicitly configures a page layout', async ({ page }) => {
  await page.goto('/404', { waitUntil: 'domcontentloaded' })

  const invalidRoutes = await page.evaluate(() => {
    const app = document.querySelector<VueAppElement>('#app')
    return (
      app?.__vue_app__?.config.globalProperties.$router
        .getRoutes()
        .filter(
          (route) =>
            route.meta.pageLayout !== 'main' && route.meta.pageLayout !== 'sub'
        )
        .map((route) => String(route.name)) || []
    )
  })

  expect(invalidRoutes).toEqual([])
})

for (const route of [
  { path: '/', selector: '.home-page' },
  { path: '/404', selector: '.not-found-page' },
]) {
  test(`${route.path} uses the corner-aligned main page layout`, async ({
    page,
  }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(route.selector)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    })
    await expect(page.locator('.router-container')).toHaveClass(
      /\bpage-layout--main\b/
    )
    await expect(page.locator('.el-menu-layout-all')).not.toHaveClass(
      /\bcontent-aligned\b/
    )

    const geometry = await page.locator(route.selector).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const rootStyle = getComputedStyle(document.documentElement)
      const insetProperty = matchMedia(
        '(max-width: 1024px) and (hover: none) and (pointer: coarse)'
      ).matches
        ? '--footer-com-mobile-inline-inset'
        : '--desktop-shell-inline-inset'
      const insetValue = rootStyle.getPropertyValue(insetProperty).trim()
      const inset = insetValue.endsWith('rem')
        ? Number.parseFloat(insetValue) * Number.parseFloat(rootStyle.fontSize)
        : Number.parseFloat(insetValue)
      return {
        inset,
        left: bounds.left,
        right: window.innerWidth - bounds.right,
        paddingLeft: Number.parseFloat(style.paddingLeft),
        paddingRight: Number.parseFloat(style.paddingRight),
      }
    })

    expect(Math.abs(geometry.left - geometry.inset)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DELTA
    )
    expect(Math.abs(geometry.right - geometry.inset)).toBeLessThanOrEqual(
      MAX_GEOMETRY_DELTA
    )
    expect(geometry.paddingLeft).toBe(0)
    expect(geometry.paddingRight).toBe(0)
  })
}

for (const route of [
  { path: '/archive', selector: '.archives-page' },
  { path: '/flanerie', selector: '.flanerie-page' },
]) {
  test(`${route.path} keeps the inset sub page layout`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(route.selector)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    })
    await expect(page.locator('.router-container')).toHaveClass(
      /\bpage-layout--sub\b/
    )
    await expect(page.locator('.el-menu-layout-all')).toHaveClass(
      /\bcontent-aligned\b/
    )

    const geometry = await page.locator(route.selector).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        left: bounds.left,
        right: window.innerWidth - bounds.right,
      }
    })

    expect(geometry.left).toBeGreaterThan(MAX_GEOMETRY_DELTA)
    expect(geometry.right).toBeGreaterThan(MAX_GEOMETRY_DELTA)
  })
}

test('home hero motion can overflow the inset route container', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const overflowState = await page.evaluate(() => {
    const selectors = [
      '.router-container',
      '.home-page',
      '.home-page-swiper',
      '.hero-section',
    ]
    const overflow = Object.fromEntries(
      selectors.map((selector) => [
        selector,
        getComputedStyle(document.querySelector<HTMLElement>(selector)!)
          .overflowX,
      ])
    )
    const homePage = document.querySelector<HTMLElement>('.home-page')!
    const homeBounds = homePage.getBoundingClientRect()

    return {
      clipPath: getComputedStyle(homePage).clipPath,
      documentHeight: document.scrollingElement!.scrollHeight,
      documentWidth: document.scrollingElement!.scrollWidth,
      homeInset: homeBounds.left,
      viewportHeight: window.innerHeight,
      overflow,
      viewportWidth: window.innerWidth,
    }
  })

  expect(overflowState.homeInset).toBeGreaterThan(MAX_GEOMETRY_DELTA)
  expect(overflowState.overflow).toEqual({
    '.hero-section': 'visible',
    '.home-page': 'visible',
    '.home-page-swiper': 'visible',
    '.router-container': 'visible',
  })
  expect(overflowState.clipPath).not.toBe('none')
  expect(overflowState.documentHeight).toBe(overflowState.viewportHeight)
  expect(overflowState.documentWidth).toBe(overflowState.viewportWidth)
})

test('home visual backgrounds span the viewport', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const swiper = page.locator('.home-page-swiper')
  const assertFullBleed = async (index: number, selector: string) => {
    await swiper.evaluate((element, targetIndex) => {
      const homeSwiper = element as HTMLElement & {
        swiper: { slideTo: (index: number, speed: number) => void }
      }
      homeSwiper.swiper.slideTo(targetIndex, 0)
    }, index)
    await expect(page.locator(selector)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const geometry = await page.locator(selector).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        documentWidth: document.scrollingElement!.scrollWidth,
        left: bounds.left,
        right: window.innerWidth - bounds.right,
        viewportWidth: window.innerWidth,
        width: bounds.width,
      }
    })

    expect(Math.abs(geometry.left)).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
    expect(Math.abs(geometry.right)).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
    expect(
      Math.abs(geometry.width - geometry.viewportWidth)
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
    expect(geometry.documentWidth).toBe(geometry.viewportWidth)
  }

  await assertFullBleed(2, '.home-archive-copy')
  await assertFullBleed(3, '.home-flanerie-map-viewport')
})

for (const transition of [
  {
    from: '/archive',
    to: '/flanerie',
    selector: '.archives-page',
    layoutClass: 'page-layout--sub',
  },
  {
    from: '/flanerie',
    to: '/archive',
    selector: '.flanerie-page',
    layoutClass: 'page-layout--sub',
  },
]) {
  test(`${transition.from} keeps its geometry while leaving for ${transition.to}`, async ({
    page,
  }) => {
    await page.goto(transition.from, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(transition.selector)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const samples = await page.evaluate(
      async ({ layoutClass, selector, targetPath }) => {
        const leavingPage = document.querySelector<HTMLElement>(selector)!
        const initial = leavingPage.getBoundingClientRect()
        const geometrySamples: Array<{
          left: number
          top: number
          layoutRetained: boolean
        }> = []
        const app = document.querySelector<VueAppElement>('#app')

        const navigation =
          app?.__vue_app__?.config.globalProperties.$router.push(targetPath)
        await new Promise<void>((resolve) => {
          const sample = () => {
            const currentPage = document.querySelector<HTMLElement>(selector)
            if (!currentPage) {
              resolve()
              return
            }
            const bounds = currentPage.getBoundingClientRect()
            geometrySamples.push({
              left: bounds.left - initial.left,
              top: bounds.top - initial.top,
              layoutRetained: document
                .querySelector('.router-container')!
                .classList.contains(layoutClass),
            })
            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        await navigation
        return geometrySamples
      },
      {
        layoutClass: transition.layoutClass,
        selector: transition.selector,
        targetPath: transition.to,
      }
    )

    await navigateWithRouter(page, transition.to)
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.every((sample) => sample.layoutRetained)).toBe(true)
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.left)))
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.top)))
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
  })
}
