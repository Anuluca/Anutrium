import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000
const CAT_ASSET_URL = 'https://assets.anuluca.com/other/cat_full.png'

test('Flora renders the complete responsive character profile', async ({
  page,
}, testInfo) => {
  await page.goto('/pet', { waitUntil: 'domcontentloaded' })

  const floraPage = page.locator('.flora-page')
  const cat = floraPage.locator('.flora-cat')
  const title = floraPage.locator('.flora-title')
  const profile = floraPage.locator('.flora-profile')
  const status = floraPage.locator('.flora-status')

  await expect(floraPage).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('body')).toHaveClass(/\bflora-shell\b/)
  await expect(status).toHaveText('页面开发中')
  await expect(status).toBeVisible()
  await expect(status).toHaveCSS('letter-spacing', 'normal')
  expect(
    Number.parseFloat(
      await status.evaluate((element) => getComputedStyle(element).fontSize)
    )
  ).toBeGreaterThanOrEqual(34)
  await expect(status).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(status).toHaveCSS('border-top-width', '0px')
  await expect(status).toHaveCSS('box-shadow', 'none')
  await expect(cat).toHaveAttribute('src', CAT_ASSET_URL)
  await expect(cat).toHaveAttribute('alt', '花花举起两只前爪的狸花猫')
  await expect(cat).toHaveCSS('animation-name', 'none')
  await expect(title).toHaveText('花花庭院')
  await expect(title).toHaveCSS('font-family', 'cn-custom, sans-serif')
  await expect(title).toHaveCSS('animation-name', 'none')
  await expect(title).toHaveCSS('letter-spacing', 'normal')
  await expect(title).toHaveCSS('transform', 'matrix(0.9, 0, 0, 1, 0, 0)')
  await expect(title.locator('.flora-title__character')).toHaveCount(0)
  expect(
    await title.evaluate((element) => getComputedStyle(element).textShadow)
  ).toMatch(/^rgba\(0, 0, 0, 0\.78\) 0px 0px (?!0px)\d+(?:\.\d+)?px$/)
  await expect(title).toHaveCSS('filter', 'none')
  const titleCopy = floraPage.locator('.flora-title-copy')
  await expect(titleCopy).toHaveText('花花庭院')
  await expect(titleCopy).toHaveCSS('font-family', 'cn-custom, sans-serif')
  await expect(titleCopy).toHaveAttribute('aria-hidden', 'true')
  await expect(titleCopy).toHaveCSS('color', 'rgb(226, 52, 86)')
  await expect(titleCopy).toHaveCSS('letter-spacing', 'normal')
  await expect(titleCopy).toHaveCSS(
    'transform',
    'matrix(0.99, 0, 0, 1.06, 0, 0)'
  )
  await expect(floraPage.locator('.flora-subtitle')).toHaveCount(0)
  await expect(profile).toContainText('花花')
  await expect(profile).toContainText('♀')
  await expect(profile).toContainText('Lv.14')
  await expect(profile).toContainText('草')
  await expect(profile).toContainText('恶')
  await expect(floraPage.locator('.flora-page__arc')).toHaveCount(0)
  await expect(profile.locator('.flora-type i')).toHaveCount(0)
  await expect(profile.locator('.flora-profile__symbols')).toHaveCount(0)
  await expect(page.locator('.not-found-page')).toHaveCount(0)
  await expect(page.locator('.pet-teaser')).toHaveCount(0)

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click({ force: true })
    await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
    await page
      .getByRole('button', { name: 'Switch to English' })
      .click({ force: true })
  } else {
    await page.getByRole('button', { name: 'En', exact: true }).click({
      force: true,
    })
  }
  await expect(title).toHaveText('Floratrium')
  await expect(titleCopy).toHaveText('Floratrium')

  await expect
    .poll(
      () =>
        cat.evaluate(
          (image) =>
            image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
        ),
      { timeout: PAGE_LOAD_TIMEOUT }
    )
    .toBe(true)

  const metrics = await page.evaluate(() => {
    const getRect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing Flora element: ${selector}`)

      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    const pageRect = getRect('.flora-page')
    const bodyRect = getRect('body')
    const appRect = getRect('#app')
    const routerRect = getRect('.router-container')
    const catRect = getRect('.flora-cat')
    const titleRect = getRect('.flora-title')
    const titleCopyRect = getRect('.flora-title-copy')
    const profileRect = getRect('.flora-profile')
    const profileStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.flora-profile')!
    )
    const titleStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.flora-title')!
    )

    return {
      pageRect,
      bodyRect,
      appRect,
      routerRect,
      catRect,
      titleRect,
      titleCopyRect,
      profileRect,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      profileRightRadius: Number.parseFloat(profileStyles.borderTopRightRadius),
      titleOverflow: titleStyles.overflow,
    }
  })

  expect(Math.abs(metrics.pageRect.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(metrics.pageRect.left)).toBeLessThanOrEqual(1)
  expect(metrics.pageRect.width).toBeCloseTo(metrics.viewport.width, 0)
  expect(Math.abs(metrics.bodyRect.left)).toBeLessThanOrEqual(1)
  expect(metrics.bodyRect.width).toBeCloseTo(metrics.viewport.width, 0)
  expect(Math.abs(metrics.appRect.left)).toBeLessThanOrEqual(1)
  expect(metrics.appRect.width).toBeCloseTo(metrics.viewport.width, 0)
  expect(Math.abs(metrics.routerRect.left)).toBeLessThanOrEqual(1)
  expect(metrics.routerRect.width).toBeCloseTo(metrics.viewport.width, 0)
  expect(metrics.pageRect.height).toBeGreaterThanOrEqual(
    metrics.viewport.height
  )
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1)
  expect(metrics.titleOverflow).toBe('visible')
  expect(metrics.catRect.top).toBeGreaterThanOrEqual(-1)
  expect(metrics.catRect.right).toBeLessThanOrEqual(metrics.viewport.width + 1)
  expect(metrics.titleRect.left).toBeGreaterThanOrEqual(-1)
  expect(metrics.titleRect.right).toBeLessThanOrEqual(
    metrics.viewport.width + 1
  )
  expect(metrics.titleCopyRect.left).toBeGreaterThanOrEqual(-1)
  expect(metrics.titleCopyRect.right).toBeLessThanOrEqual(
    metrics.viewport.width + 1
  )
  expect(metrics.profileRect.left).toBeGreaterThanOrEqual(-1)
  expect(metrics.profileRect.right).toBeLessThanOrEqual(
    metrics.viewport.width + 1
  )
  if (testInfo.project.name.includes('mobile')) {
    expect(metrics.profileRect.top).toBeGreaterThan(metrics.titleRect.bottom)
    expect(metrics.profileRightRadius).toBeGreaterThan(0)
  } else {
    expect(
      Math.abs(metrics.profileRect.right - metrics.viewport.width)
    ).toBeLessThanOrEqual(1)
    expect(metrics.profileRightRadius).toBe(0)
  }
})

test('Flora disables decorative motion and keeps route-leave geometry stable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/pet', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flora-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(
    /\bentry-logo-ready\b/,
    { timeout: PAGE_LOAD_TIMEOUT }
  )

  await expect(page.locator('.flora-cat')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.flora-orbit')).toHaveCount(0)
  await expect(page.locator('.flora-profile')).toHaveCSS(
    'animation-name',
    'none'
  )

  const geometryPromise = page.evaluate(
    () =>
      new Promise<{
        pageTopShift: number
        pageLeftShift: number
        containerTopShift: number
        containerLeftShift: number
      }>((resolve) => {
        const floraPage = document.querySelector<HTMLElement>('.flora-page')
        const routerContainer =
          document.querySelector<HTMLElement>('.router-container')
        if (!floraPage || !routerContainer) {
          throw new Error('Route-leave geometry targets are unavailable')
        }

        const pageBefore = floraPage.getBoundingClientRect()
        const containerBefore = routerContainer.getBoundingClientRect()

        document.addEventListener(
          'click',
          () => {
            requestAnimationFrame(() => {
              const pageDuring = floraPage.getBoundingClientRect()
              const containerDuring = routerContainer.getBoundingClientRect()
              resolve({
                pageTopShift: Math.abs(pageDuring.top - pageBefore.top),
                pageLeftShift: Math.abs(pageDuring.left - pageBefore.left),
                containerTopShift: Math.abs(
                  containerDuring.top - containerBefore.top
                ),
                containerLeftShift: Math.abs(
                  containerDuring.left - containerBefore.left
                ),
              })
            })
          },
          { capture: true, once: true }
        )
      })
  )
  await page.locator('.logo-box').click()
  const geometry = await geometryPromise

  expect(geometry.pageTopShift).toBeLessThanOrEqual(1)
  expect(geometry.pageLeftShift).toBeLessThanOrEqual(1)
  expect(geometry.containerTopShift).toBeLessThanOrEqual(1)
  expect(geometry.containerLeftShift).toBeLessThanOrEqual(1)
  await expect(page).toHaveURL(/\/$/, { timeout: 5_000 })
})
