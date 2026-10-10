import { expect, test } from '@playwright/test'
import path from 'node:path'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('https://assets.anuluca.com/fonts/unbounded/**', (route) =>
    route.fulfill({
      path: path.resolve(
        'scripts/fonts/generated',
        path.basename(new URL(route.request().url()).pathname)
      ),
      contentType: 'font/woff2',
      headers: { 'access-control-allow-origin': '*' },
    })
  )
})

for (const embedded of [false, true]) {
  test(`about ${
    embedded ? 'overlay' : 'route'
  } renders lower content throughout its first continuous scroll`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000)
    await page.goto(embedded ? '/' : '/about', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('.footer-bottom-gradient')).toHaveClass(
      /footer-bottom-gradient--ready/,
      { timeout: 25000 }
    )
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 25000,
    })
    if (embedded) {
      await expect(page.locator('.temple-stage')).toHaveAttribute(
        'aria-busy',
        'false',
        { timeout: 25000 }
      )
      await page
        .locator('[data-obelisk="archive"]')
        .evaluate((el: HTMLButtonElement) => el.click())
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      const mobile = testInfo.project.name.includes('mobile')
      if (mobile) await page.locator('.mobile-menu-icon').click()
      await page
        .locator(
          `${
            mobile ? '.mobile-menu-items' : '.menu-box'
          } [data-temple-nav="about"]`
        )
        .click()
    }
    const about = page.locator(
      embedded ? '.about-overlay .about-page' : '.about-page'
    )
    await expect(about).toBeAttached({ timeout: 20000 })
    await expect(about.locator('.page-hero-title')).toHaveCount(
      embedded ? 0 : 1
    )
    const lower = about.locator('#about-neighbors')
    // 离屏区域在首次滚动前必须已具备真实尺寸，不能依赖滚动结束再显示。
    const initial = await lower.evaluate((el) => ({
      opacity: getComputedStyle(el).opacity,
      deferred: getComputedStyle(el).contentVisibility,
    }))
    expect(initial.opacity).toBe('1')
    expect(initial.deferred).toBe('visible')
    await expect(about).toHaveCSS('opacity', '1')
    const scroll = embedded
      ? page.locator('.about-overlay .scroll-viewport__scroll')
      : page.locator('body')
    await page.evaluate(() => document.fonts.ready)
    // 覆盖扫描线完整周期，验证动画不会制造多余滚动空间或移动声明。
    const scanlineGeometry = await about.evaluate(async (element) => {
      const root = element.closest('.scroll-viewport__scroll') ?? document.body
      const credits = element.querySelector('.asset-credits')!
      const animation = element
        .querySelector('.passion-back')!
        .getAnimations({ subtree: true })
        .find((animation) =>
          (animation as CSSAnimation).animationName.startsWith(
            'passion-scanline'
          )
        )!
      animation.pause()
      const samples: { height: number; creditsTop: number }[] = []
      for (const time of [0, 1200, 2400, 3600, 4799]) {
        animation.currentTime = time
        await new Promise<number>(requestAnimationFrame)
        samples.push({
          height: root.scrollHeight,
          creditsTop: credits.getBoundingClientRect().top,
        })
      }
      animation.play()
      return samples
    })
    for (const sample of scanlineGeometry) {
      expect(
        Math.abs(sample.height - scanlineGeometry[0].height)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(sample.creditsTop - scanlineGeometry[0].creditsTop)
      ).toBeLessThanOrEqual(1)
    }
    const bounds = embedded
      ? (await scroll.boundingBox())!
      : {
          x: 0,
          y: 0,
          width: page.viewportSize()!.width,
          height: page.viewportSize()!.height,
        }
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height * 0.7
    )
    let sawLowerContent = false
    for (let step = 0; step < 16; step++) {
      await page.mouse.wheel(0, 100)
      await page.waitForTimeout(30)
      const state = await lower.evaluate((el) => {
        const container = el.closest('.scroll-viewport__scroll')
        const viewport = container?.getBoundingClientRect()
        const bounds = el.getBoundingClientRect()
        return {
          intersects:
            bounds.top < (viewport?.bottom ?? innerHeight) &&
            bounds.bottom > (viewport?.top ?? 0),
          height: bounds.height,
          opacity: getComputedStyle(el).opacity,
          hiddenChildren: [
            ...el.querySelectorAll('.nb-name, .nb-host, .asset-credits'),
          ].some((child) => getComputedStyle(child).visibility === 'hidden'),
        }
      })
      if (!state.intersects) continue
      sawLowerContent = true
      expect(state.height).toBeGreaterThan(100)
      expect(state.opacity).toBe('1')
      expect(state.hiddenChildren).toBe(false)
    }
    expect(sawLowerContent).toBe(true)
    expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    await expect(about.locator('.asset-credits p').last()).toBeInViewport()
  })
}
