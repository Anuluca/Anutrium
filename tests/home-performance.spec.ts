import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('entry loading line keeps its horizon on tall desktop viewports', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const progress = page.locator('.entry-loading-progress')
  const canvas = page.locator('.entry-overlay-container canvas')
  await expect(progress).toBeVisible({ timeout: 15_000 })
  await expect(canvas).toBeVisible({ timeout: 15_000 })

  const geometry = await page.evaluate(() => {
    const progressBounds = document
      .querySelector<HTMLElement>('.entry-loading-progress')!
      .getBoundingClientRect()
    const canvasElement = document.querySelector<HTMLCanvasElement>(
      '.entry-overlay-container canvas'
    )!
    const canvasBounds = canvasElement.getBoundingClientRect()
    const canvasStyle = getComputedStyle(canvasElement)

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      progressTop: progressBounds.top,
      canvas: {
        left: canvasBounds.left,
        top: canvasBounds.top,
        width: canvasBounds.width,
        height: canvasBounds.height,
      },
      canvasTransform: canvasStyle.transform,
      crystalHalfHeight: parseFloat(
        document
          .querySelector<HTMLElement>(
            '.entry-overlay-container .scene-container'
          )!
          .style.getPropertyValue('--crystal-half-height')
      ),
    }
  })

  expect(geometry.progressTop).toBeCloseTo(
    // 真实初始机位的投影高度；窄长窗口的相机距离按宽高比增加。
    676.15,
    0
  )
  expect(geometry.canvasTransform).toBe('matrix(0.5, 0, 0, 0.5, 0, 0)')
  expect(geometry.canvas.width).toBeCloseTo(geometry.viewport.width / 2, 0)
  expect(geometry.canvas.height).toBeCloseTo(geometry.viewport.height / 2, 0)
  expect(geometry.canvas.left).toBeCloseTo(geometry.viewport.width / 4, 0)
  expect(
    geometry.canvas.top +
      geometry.canvas.height / 2 +
      geometry.crystalHalfHeight
  ).toBeCloseTo(geometry.progressTop, 0)
})

test('header loads the custom CJK font and uses semantic native navigation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15_000,
  })
  await expect(page.locator('.desktop-menu')).toBeVisible({ timeout: 15_000 })
  const headerState = await page.evaluate(async () => {
    await document.fonts.load('20px UnboundedSans', '路卡的自由庭院')
    const menu = document.querySelector('.desktop-menu')
    const menuItem = document.querySelector('.desktop-menu-item')

    return {
      customFontReady: document.fonts.check(
        '20px UnboundedSans',
        '路卡的自由庭院'
      ),
      cjkFontRequested: performance
        .getEntriesByType('resource')
        .some((entry) =>
          entry.name.includes('/fonts/unbounded/unboundedsans-u')
        ),
      menuTag: menu?.tagName,
      menuItemTag: menuItem?.tagName,
    }
  })

  expect(headerState).toEqual({
    customFontReady: true,
    cjkFontRequested: true,
    menuTag: 'NAV',
    menuItemTag: 'LI',
  })
})

test('header keeps its size while the scrolled state moves it upward', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/entry-logo-ready/, {
    timeout: 15_000,
  })
  await expect(page.locator('.name-center')).not.toHaveClass(/active/, {
    timeout: 15_000,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1_000)

  const readHeaderGeometry = () =>
    page.evaluate((mobile) => {
      const selectors = [
        '.el-menu-layout-all',
        '.logo-box',
        '.logo-box > .logo',
        '.logo-box > .right',
        '.current-module-name',
        mobile ? '.mobile-menu-icon' : '.el-menu-layout-all > .desktop-menu',
        ...(mobile ? ['.mobile-menu-icon .hamburger'] : []),
      ]

      return Object.fromEntries(
        selectors.map((selector) => {
          const bounds = document
            .querySelector<HTMLElement>(selector)!
            .getBoundingClientRect()
          return [
            selector,
            {
              top: bounds.top,
              left: bounds.left,
              width: bounds.width,
              height: bounds.height,
            },
          ]
        })
      )
    }, testInfo.project.name.includes('mobile'))

  const initial = await readHeaderGeometry()
  await page.evaluate(() => document.body.scrollTo({ top: 120 }))
  await expect(page.locator('.el-menu-layout-all')).toHaveClass(
    /scroll-layout-active/
  )
  await page.waitForTimeout(300)
  const scrolled = await readHeaderGeometry()
  const headerOffset =
    scrolled['.el-menu-layout-all'].top - initial['.el-menu-layout-all'].top
  if (testInfo.project.name.includes('mobile')) {
    expect(headerOffset).toBeLessThan(-3)
    expect(headerOffset).toBeGreaterThan(-6)
  } else {
    expect(headerOffset).toBeLessThan(-8)
    expect(headerOffset).toBeGreaterThan(-12)
  }

  for (const selector of Object.keys(initial)) {
    expect(
      scrolled[selector].top - initial[selector].top,
      `${selector} top offset`
    ).toBeCloseTo(headerOffset, 0)
    for (const property of ['left', 'width', 'height'] as const) {
      expect(
        Math.abs(initial[selector][property] - scrolled[selector][property]),
        `${selector} ${property}`
      ).toBeLessThanOrEqual(1)
    }
  }
})

test('scrolled header excludes only its background region while particles keep moving', async ({
  page,
}) => {
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flanerie-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })
  const particles = page.locator('.particle-field')
  await expect(particles).toBeVisible({ timeout: 15_000 })
  await expect(particles).toHaveAttribute('data-motion-state', 'running')

  const initialBackingHeight = await particles.evaluate(
    (canvas) => (canvas as HTMLCanvasElement).height
  )
  await page.evaluate(() => document.body.scrollTo({ top: 120 }))
  await expect(page.locator('.el-menu-layout-all')).toHaveClass(/scrolled/)
  await expect(page.locator('.star-container')).toHaveClass(
    /has-background-top-inset/,
    { timeout: 2_000 }
  )

  const cutout = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const stars = document.querySelector<HTMLElement>('.star-container')!
    const particleViewport =
      document.querySelector<HTMLElement>('.particle-viewport')!
    const canvas = document.querySelector<HTMLCanvasElement>('.particle-field')!
    const headerBottom = header.getBoundingClientRect().bottom
    const particleBounds = particleViewport.getBoundingClientRect()

    return {
      canvasBackingHeight: canvas.height,
      canvasClientHeight: canvas.clientHeight,
      clipPath: getComputedStyle(stars).clipPath,
      headerBottom,
      motionState: canvas.dataset.motionState,
      particleHeight: particleBounds.height,
      particleTop: particleBounds.top,
      viewportHeight: window.innerHeight,
    }
  })

  expect(cutout.clipPath).not.toBe('none')
  expect(
    Math.abs(cutout.particleTop - cutout.headerBottom)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      cutout.particleHeight - (cutout.viewportHeight - cutout.headerBottom)
    )
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(cutout.canvasClientHeight - cutout.particleHeight)
  ).toBeLessThanOrEqual(1)
  expect(cutout.canvasBackingHeight).toBeLessThan(initialBackingHeight)
  expect(cutout.motionState).toBe('running')

  const firstFrame = await particles.evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL()
  )
  await page.waitForTimeout(120)
  const secondFrame = await particles.evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL()
  )
  expect(secondFrame).not.toBe(firstFrame)
})

test('route title flips upward when returning home', async ({ page }) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const moduleName = page.locator('.current-module-name')
  await expect(moduleName).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })

  await page
    .locator('.logo-box')
    .evaluate((element) => (element as HTMLButtonElement).click())
  await expect(page).toHaveURL(/\/$/)
  await expect(moduleName).toHaveClass(/module-name-leave-active/)
  expect(
    await moduleName
      .locator('.module-name-character')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName)
  ).toContain('module-name-character-leave')
  await expect(moduleName).toHaveCount(0, { timeout: 1_000 })
})

test('mobile site title stays anchored while route names switch', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })
  await expect(page.locator('.current-module-name')).toContainText('ARCHIVE')
  await expect(page.locator('.name-center')).not.toHaveClass(/active/)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1_000)

  const geometry = await page.evaluate(async () => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__?: {
        config: {
          globalProperties: {
            $router: {
              push: (path: string) => Promise<unknown>
            }
          }
        }
      }
    }
    const router = app.__vue_app__?.config.globalProperties.$router
    const siteTitle = document.querySelector<HTMLElement>('.site-title-slot')!
    const samples: number[] = [siteTitle.getBoundingClientRect().left]
    const outgoingPositions: string[] = []
    const startedAt = performance.now()

    const navigation = router?.push('/flanerie')
    await new Promise<void>((resolve) => {
      const sample = () => {
        samples.push(siteTitle.getBoundingClientRect().left)
        const outgoing = document.querySelector<HTMLElement>(
          '.current-module-name.module-name-leave-active'
        )
        if (outgoing) {
          outgoingPositions.push(getComputedStyle(outgoing).position)
        }

        if (performance.now() - startedAt >= 1_300) {
          resolve()
          return
        }
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await navigation

    return {
      end: siteTitle.getBoundingClientRect().left,
      outgoingPositions,
      samples,
    }
  })

  await expect(page).toHaveURL(/\/flanerie\/?$/)
  await expect(page.locator('.current-module-name')).toContainText('FLÂNERIE')
  expect(geometry.outgoingPositions.length).toBeGreaterThan(0)
  expect(new Set(geometry.outgoingPositions)).toEqual(new Set(['relative']))

  const start = geometry.samples[0]
  const expectedMin = Math.min(start, geometry.end) - 1
  const expectedMax = Math.max(start, geometry.end) + 1
  expect(Math.min(...geometry.samples)).toBeGreaterThanOrEqual(expectedMin)
  expect(Math.max(...geometry.samples)).toBeLessThanOrEqual(expectedMax)
})

test('new route mounts only after the previous route unmounts', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })

  await page.evaluate(() => {
    const container = document.querySelector('.router-container')!
    const oldRoute = container.querySelector('.archives-page')!
    const transitionState = {
      newMounted: false,
      newMountedBeforeOldUnmounted: false,
      oldUnmounted: false,
    }
    const containsRoute = (node: Node, selector: string) =>
      node instanceof Element &&
      (node.matches(selector) || !!node.querySelector(selector))
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node === oldRoute || containsRoute(node, '.archives-page')) {
            transitionState.oldUnmounted = true
          }
        }
        for (const node of record.addedNodes) {
          if (!containsRoute(node, '.home-page')) continue
          transitionState.newMounted = true
          if (!transitionState.oldUnmounted) {
            transitionState.newMountedBeforeOldUnmounted = true
          }
        }
      }
    })
    observer.observe(container, { childList: true, subtree: true })
    ;(window as any).__routeMountProbe = { observer, transitionState }
  })

  await page
    .locator('.logo-box')
    .evaluate((element) => (element as HTMLButtonElement).click())
  await expect(page.locator('.home-page')).toBeVisible({ timeout: 15_000 })

  const result = await page.evaluate(() => {
    const probe = (window as any).__routeMountProbe
    probe.observer.disconnect()
    return probe.transitionState as {
      newMounted: boolean
      newMountedBeforeOldUnmounted: boolean
      oldUnmounted: boolean
    }
  })
  expect(result).toEqual({
    newMounted: true,
    newMountedBeforeOldUnmounted: false,
    oldUnmounted: true,
  })
})
