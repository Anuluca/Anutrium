import { expect, test } from '@playwright/test'
import path from 'node:path'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    '桌面角标；移动菜单由 layout-mobile-menu 覆盖'
  )
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
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
  await page.route('https://use.typekit.net/**', (route) => route.abort())
})

test('home corners share footer content and open About', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 45000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const footer = page.locator('.page-footer-home')
  const info = page.locator('.home-about-action')
  await expect(footer).toHaveCount(1)
  await expect(info).toHaveCSS('opacity', '0.1')
  await expect(footer.locator('.footer-social-links')).toHaveCSS(
    'opacity',
    '0.5'
  )
  await expect(footer.locator('.page-footer-home__legal')).toHaveCSS(
    'opacity',
    '0.1'
  )
  const geometry = await page.evaluate(() => {
    const bounds = (s: string) =>
      document.querySelector(s)!.getBoundingClientRect()
    const social = bounds('.page-footer-home__social')
    const legal = bounds('.page-footer-home__legal')
    const license = bounds('.page-footer-home .footer-license')
    const copyright = bounds('.page-footer-home .footer-copyright')
    const info = bounds('.home-about-action')
    return {
      socialBottom: social.bottom,
      legalTop: legal.top,
      legalCenter: (legal.left + legal.right) / 2,
      socialCenter: (social.left + social.right) / 2,
      gap: copyright.left - license.right,
      infoLeft: info.left,
      infoTop: info.top,
      legalRight: legal.right,
      bottom: legal.bottom,
      width: innerWidth,
      height: innerHeight,
    }
  })
  expect(geometry.socialBottom).toBeLessThanOrEqual(geometry.legalTop)
  expect(
    Math.abs(geometry.legalCenter - geometry.width / 2)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(geometry.socialCenter - geometry.width / 2)
  ).toBeLessThanOrEqual(1)
  expect(geometry.gap).toBe(12)
  expect(geometry.width - geometry.infoLeft).toBeLessThan(64)
  expect(geometry.infoTop).toBeLessThan(100)
  expect(geometry.height - geometry.bottom).toBeLessThan(80)
  await expect(footer.locator('.footer-copyright')).toContainText(
    'DESIGNED & ENGINEERED BY ANULUCA.'
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(footer).toHaveClass(/home-footer-fade-leave-active/)
  await expect(footer).toBeHidden()
  await expect(info).toBeVisible()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.locator('.logo-box').click()
  await expect(footer).toBeVisible()
  await expect(info).toHaveCSS('opacity', '0.1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await info.click({ trial: true })
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  await expect(info).toHaveCSS('opacity', '0.8')
  await expect(info.locator('.about-info-icon')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await expect(page.locator('.header-brand-details')).toBeVisible()
  await expect(page.locator('.current-module-name')).toHaveText('ABOUT')
  const headerGroupCenter = await page
    .locator('.logo-box')
    .evaluate((element) => {
      const parts = [
        element.querySelector('.logo')!,
        element.querySelector('.site-brand')!,
        element.querySelector('.current-module-name')!,
      ].map((part) => part.getBoundingClientRect())
      const left = Math.min(...parts.map((part) => part.left))
      const right = Math.max(...parts.map((part) => part.right))
      return {
        center: (left + right) / 2,
        viewportCenter: innerWidth / 2,
      }
    })
  expect(headerGroupCenter.center).toBeCloseTo(
    headerGroupCenter.viewportCenter,
    0
  )
  await expect(page.locator('.desktop-menu')).toHaveCount(0)
  // 页头中的非交互空白区域也关闭 About。
  await page.locator('.el-menu-layout-all').evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
  })
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(footer).toBeVisible()
  await expect(info).not.toHaveClass(/is-about-open/)
  await expect(page.locator('.logo-box')).toHaveCSS('margin-top', '0px')
})

test('About exit keeps Info mounted and returns Logo without a final jump', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const info = page.locator('.home-about-action')
  await expect(info).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const initial = await page.locator('.logo-box .logo').boundingBox()
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const result = await page.evaluate(async () => {
    const info = document.querySelector('.home-about-action')!
    const samples: { time: number; top: number; left: number }[] = []
    let interrupted = false
    const start = performance.now()
    document
      .querySelector('.el-menu-layout-all')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => {
      const sample = () => {
        const time = performance.now() - start
        interrupted ||=
          !info.isConnected ||
          info.classList.contains('home-corner-fade-leave-active') ||
          info.classList.contains('home-corner-fade-enter-active')
        const bounds = document
          .querySelector('.logo-box .logo')!
          .getBoundingClientRect()
        samples.push({ time, top: bounds.top, left: bounds.left })
        if (time >= 2800) resolve()
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return { interrupted, samples }
  })
  expect(result.interrupted).toBe(false)
  const ending = result.samples.filter((sample) => sample.time > 1850)
  for (let index = 1; index < ending.length; index++) {
    expect(
      Math.abs(ending[index].top - ending[index - 1].top)
    ).toBeLessThanOrEqual(1)
  }
  const last = result.samples.at(-1)!
  expect(Math.abs(last.top - initial!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(last.left - initial!.x)).toBeLessThanOrEqual(1)
})

test('home decorations wait for entrance while fullscreen stays visible', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const browser = window as typeof window & {
      cornerEntranceProbe: {
        early: boolean
        frames: number
        fades: boolean[]
        done: boolean
      }
    }
    const probe = (browser.cornerEntranceProbe = {
      early: false,
      frames: 0,
      fades: [false, false],
      done: false,
    })
    const sample = () => {
      if (probe.done) return
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      const corners = ['.page-footer-home', '.home-about-action'].map(
        (selector) => document.querySelector<HTMLElement>(selector)
      )
      if (stage && stage.dataset.entranceFinished !== 'true') {
        probe.frames++
        probe.early ||= corners.some(
          (el) =>
            el &&
            getComputedStyle(el).display !== 'none' &&
            getComputedStyle(el).visibility !== 'hidden'
        )
      } else if (stage) {
        corners.forEach((el, index) => {
          if (
            el?.classList.contains(
              index === 0
                ? 'home-footer-fade-enter-active'
                : 'home-corner-fade-enter-active'
            )
          )
            probe.fades[index] = true
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'false', {
    timeout: 30000,
  })
  await expect(page.locator('.page-footer-home')).toBeHidden()
  await expect(page.locator('.home-about-action')).toHaveCount(0)
  await expect(page.locator('.fullscreen')).toBeVisible()
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await expect(page.locator('.page-footer-home')).toHaveCSS('opacity', '1')
  await expect(page.locator('.home-about-action')).toHaveCSS('opacity', '0.1')
  await expect(page.locator('.fullscreen')).toHaveCount(1)
  const probe = await page.evaluate(() => {
    const probe = (
      window as typeof window & {
        cornerEntranceProbe: {
          early: boolean
          frames: number
          fades: boolean[]
          done: boolean
        }
      }
    ).cornerEntranceProbe
    probe.done = true
    return probe
  })
  expect(probe.early).toBe(false)
  expect(probe.frames).toBeGreaterThan(1)
  expect(probe.fades).toEqual([true, true])
})

for (const module of ['flanerie', 'sprigatito'] as const) {
  test(`home decorations appear with the clock when returning from ${module}`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const root = page.locator('.temple-page')
    const footer = page.locator('.page-footer-home')
    const info = page.locator('.home-about-action')
    const fullscreen = page.locator('.fullscreen')
    await expect(info).toBeVisible({ timeout: 45000 })
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    await expect(info).toHaveCSS('opacity', '0.1')
    await info.evaluate((element: HTMLElement) => {
      const sample = () => {
        const interrupted =
          !element.isConnected ||
          Number(getComputedStyle(element).opacity) < 0.1 ||
          document.querySelector('.home-about-action') !== element
        if (interrupted) element.dataset.continuityInterrupted = 'true'
        if (element.isConnected) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
    if (await alert.isVisible()) await alert.click()
    await page.evaluate((module) => {
      const app = document.querySelector('#app') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: {
              $pinia: { _s: Map<string, { request: (id: string) => void }> }
            }
          }
        }
      }
      app.__vue_app__.config.globalProperties.$pinia._s
        .get('temple-navigation')!
        .request(module)
    }, module)
    await expect(root).toHaveAttribute('data-selected', module)
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 15000,
    })
    await expect(footer).toBeHidden()
    await expect(fullscreen).toBeVisible()
    await expect(page.locator('.desktop-menu')).toBeVisible()
    const alignment = await page.evaluate(() => {
      const info = document
        .querySelector('.home-about-action')!
        .getBoundingClientRect()
      const slot = document
        .querySelector('.menu-about-placeholder')!
        .getBoundingClientRect()
      return {
        x: info.x - slot.x,
        y: info.y - slot.y,
        width: info.width - slot.width,
      }
    })
    expect(Math.abs(alignment.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(alignment.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(alignment.width)).toBeLessThanOrEqual(1)
    const logoPath = page.evaluate(async () => {
      const positions: number[] = []
      const started = performance.now()
      await new Promise<void>((resolve) => {
        const sample = () => {
          const bounds = document
            .querySelector('.logo-box .logo')!
            .getBoundingClientRect()
          positions.push(bounds.left + bounds.width / 2)
          if (performance.now() - started >= 2800) resolve()
          else requestAnimationFrame(sample)
        }
        sample()
      })
      return { positions, center: innerWidth / 2 }
    })
    await page.locator('.logo-box').click()
    await expect(root).toHaveAttribute('data-selected', 'none', {
      timeout: 10000,
    })
    await expect(root).toHaveAttribute('data-settled', 'false')
    await expect(footer).toBeHidden()
    await expect(info).toBeVisible()
    await expect(fullscreen).toBeVisible()
    // 镜头到位后，首页装饰与 slogan、时间在同一轮更新中开始渐显。
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(page.locator('.temple-clock-group')).toBeVisible()
    await expect(footer).toBeVisible()
    await expect(info).toBeVisible()
    await expect(footer).toHaveCSS('opacity', '1')
    await expect(info).toHaveCSS('opacity', '0.1')
    const path = await logoPath
    const minX = Math.min(path.positions[0], path.center) - 1
    const maxX = Math.max(path.positions[0], path.center) + 1
    for (const x of path.positions) {
      expect(x).toBeGreaterThanOrEqual(minX)
      expect(x).toBeLessThanOrEqual(maxX)
    }
    await expect(info).not.toHaveAttribute(
      'data-continuity-interrupted',
      'true'
    )
    await expect(fullscreen).toBeVisible()
  })
}
