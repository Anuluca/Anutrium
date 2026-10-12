import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
})

const openHome = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}

const recordReveal = async (page: Page) => {
  await page.evaluate(() => {
    const probe = {
      active: true,
      frames: [] as {
        opacity: number
        y: number
        content: boolean
        ready: boolean
      }[],
    }
    ;(window as any).menuRevealProbe = probe
    const sample = () => {
      if (!probe.active) return
      const panel = document.querySelector<HTMLElement>('.temple-menu')
      if (panel) {
        const css = getComputedStyle(panel)
        probe.frames.push({
          opacity: Number(css.opacity),
          y: new DOMMatrixReadOnly(css.transform).m42,
          content: !!panel.querySelector(
            '.archive-content, .journey-content, .not-found-content'
          ),
          ready: panel.dataset.contentReady === 'true',
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

const assertReveal = async (page: Page) => {
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await expect(page.locator('.temple-menu')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)'
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scroll = document.querySelector(
          '.temple-menu .scroll-viewport__scroll'
        )!
        const progress = document.querySelector(
          'body > .page-scroll-progress.is-embedded'
        )!
        return Math.abs(
          scroll.getBoundingClientRect().top -
            progress.getBoundingClientRect().top
        )
      })
    )
    .toBeLessThanOrEqual(1)
  const frames = await page.evaluate(() => {
    const probe = (window as any).menuRevealProbe
    probe.active = false
    return probe.frames as {
      opacity: number
      y: number
      content: boolean
      ready: boolean
    }[]
  })
  const content = frames.filter((frame) => frame.content)
  expect(content.length).toBeGreaterThan(5)
  expect(content[0].opacity, '内容挂载时必须仍处于透明起始态').toBe(0)
  expect(
    content.filter((frame) => frame.opacity > 0.05 && frame.opacity < 0.95)
      .length,
    '验证实际内容的中间帧，不能只验证动画类名'
  ).toBeGreaterThan(3)
  expect(content.some((frame) => frame.y > 5 && frame.opacity > 0)).toBe(true)
  expect(
    frames.filter((frame) => !frame.ready).every((frame) => frame.opacity === 0)
  ).toBe(true)
}

test('cold submenu waits for code and messages before its visible entrance', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  // 人为延迟超过整个旧入场时长，稳定复现内容在动画结束后才出现的问题。
  await page.route(
    '**/src/views/Archive/ArchiveContent.vue*',
    async (route) => {
      await gate
      await route.continue()
    }
  )
  await openHome(page)
  await recordReveal(page)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((button: HTMLButtonElement) => button.click())
  const panel = page.locator('.temple-menu')
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  await expect(panel).toHaveCSS('opacity', '0')
  await page.waitForTimeout(750)
  await expect(panel).toHaveCSS('opacity', '0')
  await expect(panel.locator('.archive-content')).toHaveCount(0)
  release()
  await assertReveal(page)
})

test('cached submenu still paints its starting state before revealing again', async ({
  page,
}) => {
  await openHome(page)
  const choose = () =>
    page
      .locator('[data-obelisk="archive"]')
      .evaluate((button: HTMLButtonElement) => button.click())
  await choose()
  await expect(page.locator('.archive-content')).toBeVisible()
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await recordReveal(page)
  await choose()
  await assertReveal(page)
})

test('late submenu resolution cannot reopen a menu after switching focus', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    '**/src/views/Archive/ArchiveContent.vue*',
    async (route) => {
      await gate
      await route.continue()
    }
  )
  await openHome(page)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.temple-menu')).toHaveAttribute(
    'aria-busy',
    'true'
  )
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.journey-content')).toBeVisible()
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  release()
  await page.evaluate(async () => {
    const { loadTempleFocusContent } = await import(
      '/src/views/Home/focusContentLoader.ts'
    )
    await loadTempleFocusContent('archive')
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
  await expect(page.locator('.archive-content')).toHaveCount(0)
  await expect(page.locator('.temple-menu')).toHaveAttribute(
    'aria-label',
    '旅程'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
})

test('reduced motion reveals ready content without a prolonged transition', async ({
  page,
}) => {
  await openHome(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.archive-content')).toBeVisible()
  const panel = page.locator('.temple-menu')
  await expect(panel).toHaveAttribute('data-content-ready', 'true')
  await expect(panel).toHaveCSS('opacity', '1')
  const durations = await panel.evaluate((element) =>
    getComputedStyle(element)
      .transitionDuration.split(',')
      .map((value) => parseFloat(value))
  )
  expect(Math.max(...durations)).toBeLessThan(0.01)
})
