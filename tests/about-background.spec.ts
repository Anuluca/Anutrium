import { expect, test } from '@playwright/test'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test('About fades and suspends the retained background until completely closed', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.addInitScript(() => {
    const browser = window as typeof window & { backgroundDraws: number }
    browser.backgroundDraws = 0
    const original = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).closest('.temple-stage'))
        browser.backgroundDraws++
      return original.apply(this, args)
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.temple-page')
  const background = page.locator('.temple-underlay')
  await expect(root).toHaveAttribute('data-settled', 'true', {
    timeout: 45000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.works-grid').first()).toBeVisible()
  await expect(page.locator('.temple-menu')).toHaveAttribute(
    'data-content-ready',
    'true'
  )
  const canvas = await page.locator('.temple-stage canvas').elementHandle()
  const module = await page.locator('.works-grid').first().elementHandle()
  const scroll = page.locator('.temple-menu .scroll-viewport__scroll').first()
  const scrollTop = await scroll.evaluate((el) => {
    el.scrollTop = Math.min(200, el.scrollHeight - el.clientHeight)
    return el.scrollTop
  })
  const bounds = await background.boundingBox()
  const celestial = page.locator('.celestial-viewport')
  await expect(celestial).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openHomeAboutOverlay(page)
  await expect(celestial).toBeHidden()
  await expect(page.locator('.zodiac-stage')).toBeHidden()
  await expect(page.locator('.particle-viewport')).toBeHidden()
  await expect(background).toHaveAttribute('inert', '')
  // 中途仍保留在 DOM 中进行透明度过渡，结束后停止参与布局和合成。
  await expect(background).toHaveClass(/temple-about-background-leave-active/)
  await expect(background).toHaveCSS('display', 'none')
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  const draws = await page.evaluate(
    () =>
      (window as typeof window & { backgroundDraws: number }).backgroundDraws
  )
  expect(draws).toBeGreaterThan(0)
  await page.waitForTimeout(450)
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { backgroundDraws: number }).backgroundDraws
    )
  ).toBe(draws)
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveClass(
    /about-menu-leave-active/
  )
  await expect(background).toHaveCSS('display', 'none')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(celestial).toBeVisible()
  await expect(background).toBeVisible()
  await expect(background).toHaveCSS('opacity', '1')
  expect(await canvas!.evaluate((el) => el.isConnected)).toBe(true)
  expect(await module!.evaluate((el) => el.isConnected)).toBe(true)
  expect(await background.boundingBox()).toEqual(bounds)
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrollTop)
  await expect(root).toHaveAttribute('data-selected', 'archive')
  // 重开也必须正确恢复，不能遗留 display:none 或 inert。
  await openHomeAboutOverlay(page)
  await expect(background).toHaveCSS('display', 'none')
  await page.keyboard.press('Escape')
  await expect(background).toHaveCSS('opacity', '1')
  await expect(background).not.toHaveAttribute('inert', '')
})
