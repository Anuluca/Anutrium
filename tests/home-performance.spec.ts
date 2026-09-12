import { expect, test } from '@playwright/test'

test('home pauses hidden hero motion and resumes it on return', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const hero = page.locator('.home-page-slide--hero')
  const slogan = page.locator('.main-slogan')
  const logo = page.locator('.logoWith3d')
  await expect(hero).not.toHaveClass(/is-hero-initial-hidden/, {
    timeout: 20_000,
  })
  await expect(hero).not.toHaveClass(/is-hero-initial-entering/)
  await page.mouse.move(1000, 300)
  await expect
    .poll(() =>
      slogan.evaluate((element) =>
        Math.abs(parseFloat(element.style.getPropertyValue('--hero-rotate-y')))
      )
    )
    .toBeGreaterThan(0.1)

  await page.locator('.scroll-down-hint').click()
  await expect(page.locator('.home-placeholder-slide--about')).toHaveClass(
    /swiper-slide-active/
  )
  await expect(logo).toHaveClass(/motion-paused/)
  await expect
    .poll(() =>
      slogan.evaluate((element) =>
        Math.abs(parseFloat(element.style.getPropertyValue('--hero-rotate-y')))
      )
    )
    .toBe(0)

  // 隐藏首屏后移动鼠标，不应再向首屏写入逐帧样式。
  await slogan.evaluate((element) => {
    const probe = {
      mutations: 0,
      observer: new MutationObserver((records) => {
        probe.mutations += records.length
      }),
    }
    probe.observer.observe(element, {
      attributes: true,
      attributeFilter: ['style'],
    })
    ;(window as any).__heroMotionProbe = probe
  })
  await page.mouse.move(200, 200, { steps: 20 })
  await page.mouse.move(1000, 600, { steps: 20 })
  await page.waitForTimeout(300)
  expect(
    await page.evaluate(() => {
      const probe = (window as any).__heroMotionProbe
      probe.observer.disconnect()
      return probe.mutations
    })
  ).toBe(0)

  await page
    .locator(
      '.home-page-indicator--left .home-page-indicator__item--hero button'
    )
    .click()
  await expect(hero).toHaveClass(/swiper-slide-active/)
  await expect(logo).not.toHaveClass(/motion-paused/)
  await page.mouse.move(300, 400)
  await expect
    .poll(() =>
      slogan.evaluate((element) =>
        Math.abs(parseFloat(element.style.getPropertyValue('--hero-rotate-y')))
      )
    )
    .toBeGreaterThan(0.1)
})

test('home paging settles on every screen after motion optimization', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )
  await page.locator('.scroll-down-hint').click()
  for (const id of ['about', 'archive', 'flanerie', 'craft', 'hero']) {
    if (id !== 'about') {
      await page
        .locator(
          `.home-page-indicator--left .home-page-indicator__item--${id} button`
        )
        .click()
    }
    const slide = page.locator(
      id === 'hero'
        ? '.home-page-slide--hero'
        : `.home-placeholder-slide--${id}`
    )
    await expect(slide).toHaveClass(/swiper-slide-active/)
    await expect
      .poll(() =>
        slide.evaluate((element) =>
          Math.abs(element.getBoundingClientRect().top)
        )
      )
      .toBeLessThanOrEqual(1)
    await expect(page.locator('.home-page-content--secondary')).toHaveCount(
      id === 'hero' ? 0 : 1
    )
  }
})
