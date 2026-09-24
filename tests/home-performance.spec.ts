import { expect, test } from '@playwright/test'

test('entry animation rotates and hands off to the SVG logo', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const canvas = page.locator('.entry-overlay-container canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  const entryScene = page.locator('.entry-overlay-container .scene-container')
  await expect
    .poll(() =>
      entryScene.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return Math.min(bounds.width, bounds.height)
      })
    )
    .toBeGreaterThan(500)
  await expect
    .poll(() =>
      entryScene.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const sceneCanvas = element.querySelector('canvas')!
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

        return Math.max(
          Math.abs(sceneCanvas.width - Math.round(bounds.width * pixelRatio)),
          Math.abs(sceneCanvas.height - Math.round(bounds.height * pixelRatio))
        )
      })
    )
    .toBeLessThanOrEqual(1)
  const canvasBounds = await canvas.boundingBox()
  expect(canvasBounds).not.toBeNull()
  await page.waitForTimeout(150)
  const firstFrame = await page.screenshot({ clip: canvasBounds! })
  await page.waitForTimeout(500)
  const secondFrame = await page.screenshot({ clip: canvasBounds! })
  expect(secondFrame.equals(firstFrame)).toBe(false)

  const svgLogo = page.locator('.logo-wrapper2')
  await expect(svgLogo).toHaveClass(/show/, { timeout: 5_000 })
  await expect(svgLogo).toHaveClass(/is-docking/, { timeout: 3_000 })
})

test('entry SVG logo docks with compositor-only FLIP geometry', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const svgLogo = page.locator('.logo-wrapper2')
  await expect(svgLogo).toHaveClass(/show/, { timeout: 15_000 })

  const sourceLayout = await svgLogo.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      top: style.top,
      left: style.left,
      width: style.width,
      height: style.height,
    }
  })

  await expect(svgLogo).toHaveClass(/is-docking/, { timeout: 3_000 })
  const dockingTarget = await page.evaluate(() => {
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('[data-entry-logo-target]')
    ).find((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      )
    })
    if (!target) return null

    const bounds = (
      target.querySelector<SVGElement>('svg') || target
    ).getBoundingClientRect()
    return {
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
    }
  })
  expect(dockingTarget).not.toBeNull()

  const dockingStyles = await svgLogo.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      layout: {
        top: style.top,
        left: style.left,
        width: style.width,
        height: style.height,
      },
      transitionProperties: style.transitionProperty
        .split(',')
        .map((property) => property.trim()),
      willChange: style.willChange
        .split(',')
        .map((property) => property.trim()),
      scaleAxes: style.scale.split(/\s+/).filter(Boolean),
    }
  })

  expect(dockingStyles.layout).toEqual(sourceLayout)
  expect(dockingStyles.transitionProperties).toEqual([
    'translate',
    'scale',
    'opacity',
    'color',
  ])
  expect(dockingStyles.willChange).toEqual(['translate', 'scale', 'opacity'])
  expect(dockingStyles.scaleAxes).toHaveLength(1)

  await page.waitForTimeout(300)
  const inFlightLayout = await svgLogo.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      top: style.top,
      left: style.left,
      width: style.width,
      height: style.height,
    }
  })
  expect(inFlightLayout).toEqual(sourceLayout)

  await expect
    .poll(
      async () =>
        page.evaluate((targetBounds) => {
          const logo = document.querySelector<HTMLElement>('.logo-wrapper2')
          if (!logo || !targetBounds) return false

          const logoBounds = logo.getBoundingClientRect()
          return [
            logoBounds.top - targetBounds.top,
            logoBounds.left - targetBounds.left,
            logoBounds.width - targetBounds.width,
            logoBounds.height - targetBounds.height,
          ].every((difference) => Math.abs(difference) <= 1)
        }, dockingTarget),
      { timeout: 1_800, intervals: [100] }
    )
    .toBe(true)
})

test('mobile entry background compresses downward into the footer target', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const overlay = page.locator('.entry-overlay-container')
  await expect(overlay).toHaveClass(/is-background-exiting/, {
    timeout: 15_000,
  })

  const geometry = await overlay.evaluate((element) => {
    const style = getComputedStyle(element)
    const footer = document.querySelector<HTMLElement>(
      '[data-entry-footer-target]'
    )!
    const footerBounds = footer.getBoundingClientRect()

    return {
      targetX: Number.parseFloat(style.getPropertyValue('--entry-bg-target-x')),
      targetY: Number.parseFloat(style.getPropertyValue('--entry-bg-target-y')),
      targetScaleX: Number.parseFloat(
        style.getPropertyValue('--entry-bg-target-scale-x')
      ),
      targetScaleY: Number.parseFloat(
        style.getPropertyValue('--entry-bg-target-scale-y')
      ),
      targetRadius: style.getPropertyValue('--entry-bg-target-radius').trim(),
      footer: {
        left: footerBounds.left,
        top: footerBounds.top,
        width: footerBounds.width,
        height: footerBounds.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
  })

  expect(Math.abs(geometry.targetX - geometry.footer.left)).toBeLessThanOrEqual(
    1
  )
  expect(Math.abs(geometry.targetY - geometry.footer.top)).toBeLessThanOrEqual(
    1
  )
  expect(geometry.targetScaleX).toBeCloseTo(
    geometry.footer.width / geometry.viewport.width,
    3
  )
  expect(geometry.targetScaleY).toBeCloseTo(
    geometry.footer.height / geometry.viewport.height,
    3
  )
  expect(geometry.targetScaleX).toBeGreaterThan(0.9)
  expect(geometry.targetScaleY).toBeLessThan(0.1)
  expect(geometry.targetY).toBeGreaterThan(geometry.viewport.height * 0.8)
  expect(geometry.targetRadius).toBe('0px')
})

test('header loads the custom CJK font and uses semantic native navigation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

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
        .some((entry) => entry.name.includes('unboundedsans-cjk-site.woff2')),
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

test('critical font preload does not register an unrestricted duplicate face after reload', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15_000,
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15_000,
  })

  const fontFaces = await page.evaluate(async () => {
    await document.fonts.load('400 16px UnboundedSans', 'ANUTRIUM')
    await document.fonts.load('400 16px UnboundedSans', '路卡庭院')

    return Array.from(document.fonts)
      .filter((fontFace) => fontFace.family === 'UnboundedSans')
      .map((fontFace) => ({
        status: fontFace.status,
        unicodeRange: fontFace.unicodeRange.replace(/\s/g, '').toUpperCase(),
      }))
  })

  expect(fontFaces).toHaveLength(2)
  expect(fontFaces.every(({ status }) => status === 'loaded')).toBe(true)
  expect(
    fontFaces.some(({ unicodeRange }) => unicodeRange.includes('U+0-FF'))
  ).toBe(true)
  expect(
    fontFaces.some(({ unicodeRange }) => unicodeRange.includes('U+3400-9FFF'))
  ).toBe(true)
  expect(
    fontFaces.some(({ unicodeRange }) => unicodeRange === 'U+0-10FFFF')
  ).toBe(false)
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

test('desktop header preserves its route insets without animating layout', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15_000,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 15_000,
  })
  await expect(page.locator('.name-center')).not.toHaveClass(/active/, {
    timeout: 15_000,
  })
  await page.evaluate(() => document.fonts.ready)
  await expect
    .poll(() =>
      page
        .locator('.name-center')
        .evaluate((element) => element.getBoundingClientRect().width)
    )
    .toBeLessThan(1)

  const header = page.locator('.el-menu-layout-all')
  const logo = page.locator('.logo-box')
  const readGeometry = () =>
    page.evaluate(() => {
      const headerElement = document.querySelector<HTMLElement>(
        '.el-menu-layout-all'
      )!
      const logoBounds = document
        .querySelector<HTMLElement>('.logo-box')!
        .getBoundingClientRect()
      const menuBounds = document
        .querySelector<HTMLElement>('.desktop-menu')!
        .getBoundingClientRect()
      const headerStyle = getComputedStyle(headerElement)

      return {
        logoLeft: logoBounds.left,
        logoWidth: logoBounds.width,
        menuRight: menuBounds.right,
        menuWidth: menuBounds.width,
        paddingLeft: headerStyle.paddingLeft,
        paddingRight: headerStyle.paddingRight,
        transitionProperty: headerStyle.transitionProperty,
      }
    })

  const homeGeometry = await readGeometry()
  expect(homeGeometry.transitionProperty).toBe('transform')

  await page.locator('.desktop-menu-item.FLANERIE a').click()
  await expect(page.locator('.home-page')).toHaveClass(/route-leave-active/)
  await expect(header).toHaveClass(/content-aligned/)

  const leavingGeometry = await readGeometry()
  expect(leavingGeometry.paddingLeft).toBe(homeGeometry.paddingLeft)
  expect(leavingGeometry.paddingRight).toBe(homeGeometry.paddingRight)

  await expect(page.locator('.flanerie-page')).toBeVisible({ timeout: 15_000 })
  await expect(header).toHaveClass(/content-aligned/)
  await expect
    .poll(() => logo.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe('none')
  await page.waitForTimeout(450)

  const innerGeometry = await readGeometry()
  expect(innerGeometry.paddingLeft).toBe(homeGeometry.paddingLeft)
  expect(innerGeometry.paddingRight).toBe(homeGeometry.paddingRight)
  expect(innerGeometry.logoLeft).toBeGreaterThan(homeGeometry.logoLeft + 20)
  expect(innerGeometry.menuRight).toBeLessThan(homeGeometry.menuRight - 20)
  expect(
    Math.abs(innerGeometry.logoWidth - homeGeometry.logoWidth)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(innerGeometry.menuWidth - homeGeometry.menuWidth)
  ).toBeLessThanOrEqual(1)
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

test('route title disappears immediately when returning home', async ({
  page,
}) => {
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
  await page.waitForTimeout(16)
  expect(await moduleName.count()).toBe(0)
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

test('zodiac rotation starts only after the previous route leaves', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator('.zodiac-sign-face.is-active .zodiac-glyph')
  ).toContainText('♌', { timeout: 15_000 })
  await page.addStyleTag({
    content: '.route-leave-active { transition-duration: 600ms !important; }',
  })

  await page.locator('.desktop-menu-item.ARCHIVE a').click()
  await expect(page.locator('.home-page')).toHaveClass(/route-leave-active/)
  await page.waitForTimeout(120)
  await expect(
    page.locator('.zodiac-sign-face.is-active .zodiac-glyph')
  ).toContainText('♌')

  await expect(page.locator('.archives-page')).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('.zodiac-sign-face.is-active .zodiac-glyph')
  ).toContainText('♒')
})

test('home crystal keeps its drawing buffer in sync after the initial responsive layout', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const canvas = page.locator('.passion-logo canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })

  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const expectedWidth = Math.round(bounds.width * 0.75)
        const expectedHeight = Math.round(bounds.height * 0.75)

        return Math.max(
          Math.abs(element.width - expectedWidth),
          Math.abs(element.height - expectedHeight)
        )
      })
    )
    .toBeLessThanOrEqual(1)
})

test('home pauses hidden hero motion and resumes it on return', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const hero = page.locator('.home-page-slide--hero')
  const sloganShell = page.locator('.main-slogan-shell')
  const slogan = page.locator('.main-slogan')
  const recommend = page.locator('.hero-content > .recommend')
  const logo = page.locator('.passion-logo')
  await expect(hero).not.toHaveClass(/is-hero-initial-hidden/, {
    timeout: 20_000,
  })
  await expect(hero).not.toHaveClass(/is-hero-initial-entering/)
  await expect(sloganShell).toHaveCSS('will-change', 'auto')
  await expect(logo).toHaveCSS('opacity', '0.24')
  await expect(logo).toHaveCSS('transition-duration', '1.2s, 0.3s')
  await page.evaluate(() => document.fonts.ready)
  await logo.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined))
    )
  })
  expect(
    await logo.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).width)
    )
  ).toBeLessThan(1000)
  const passionCrystalPlacement = await page.evaluate(() => {
    const logoRect = document
      .querySelector<HTMLElement>('.passion-logo')!
      .getBoundingClientRect()
    const canvasRect = document
      .querySelector<HTMLCanvasElement>('.passion-logo canvas')!
      .getBoundingClientRect()
    const passionWindowRect = document
      .querySelector<HTMLElement>('.home-page-content--hero')!
      .getBoundingClientRect()

    return {
      logoCenterX: logoRect.left + logoRect.width / 2,
      logoCenterY: logoRect.top + logoRect.height / 2,
      windowCenterX: passionWindowRect.left + passionWindowRect.width / 2,
      expectedLogoCenterY:
        passionWindowRect.top + passionWindowRect.height * 0.47,
      logoWidth: logoRect.width,
      logoHeight: logoRect.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
    }
  })
  expect(
    Math.abs(
      passionCrystalPlacement.logoCenterX -
        passionCrystalPlacement.windowCenterX
    )
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      passionCrystalPlacement.logoCenterY -
        passionCrystalPlacement.expectedLogoCenterY
    )
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      passionCrystalPlacement.logoWidth - passionCrystalPlacement.canvasWidth
    )
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      passionCrystalPlacement.logoHeight - passionCrystalPlacement.canvasHeight
    )
  ).toBeLessThanOrEqual(1)
  await page.mouse.move(720, 500)
  await page.waitForTimeout(350)
  const crystalPositionBeforeMouse = await logo.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, top: rect.top }
  })
  await page.mouse.move(1000, 300)
  await expect
    .poll(() =>
      slogan.evaluate((element) =>
        Math.abs(parseFloat(element.style.getPropertyValue('--hero-rotate-y')))
      )
    )
    .toBeGreaterThan(0.1)
  const crystalPositionAfterMouse = await logo.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, top: rect.top }
  })
  expect(
    Math.abs(crystalPositionAfterMouse.left - crystalPositionBeforeMouse.left)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(crystalPositionAfterMouse.top - crystalPositionBeforeMouse.top)
  ).toBeLessThanOrEqual(1)

  await page.locator('.scroll-down-hint').click()
  await expect(hero).toHaveClass(/is-hero-exit-preparing/)
  await expect(logo).toHaveCSS('transition-duration', '0.6s, 0.125s')
  await expect(logo).toHaveCSS('transition-delay', '0s, 0.175s')
  expect(await page.locator('.home-about-gallery').count()).toBe(0)
  await expect(logo.locator('.draw-animation')).toHaveCount(0)
  await expect(page.locator('.logo-layer')).toHaveCount(0)
  await expect(sloganShell).toHaveCSS(
    'will-change',
    'translate, scale, opacity'
  )
  await expect(recommend).toHaveCSS('will-change', 'translate, scale, opacity')
  await expect(sloganShell).toHaveCSS(
    'transition-duration',
    '1.2s, 1.2s, 0.42s'
  )
  await expect(sloganShell).toHaveCSS('transition-delay', '0s, 0s, 0.245s')
  await expect(page.locator('.cards-viewport')).toHaveCount(0, {
    timeout: 1200,
  })
  await expect(logo).toHaveCount(1)
  await expect(page.locator('.sparkles-text')).toHaveCount(0)
  await expect(slogan).toHaveCount(1)
  await expect(page.locator('.home-placeholder-slide--about')).toHaveClass(
    /swiper-slide-active/
  )
  await expect(sloganShell).toHaveCSS('scale', '3')
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
  await expect(hero).toHaveClass(/is-hero-return-effects-deferred/)
  await expect(hero).toHaveClass(/swiper-slide-active/)
  await expect(page.locator('.cards-viewport')).toHaveCount(1)
  await expect(logo).toHaveCount(1)
  await expect(hero).toHaveClass(/is-page-entering/)
  await expect(logo.locator('.draw-animation')).toHaveCount(0)
  await expect(sloganShell).toHaveCSS(
    'transition-duration',
    '1.2s, 1.2s, 0.42s'
  )
  await expect(sloganShell).toHaveCSS('transition-delay', '0s, 0s, 0.245s')
  await expect(hero).not.toHaveClass(/is-hero-return-effects-deferred/)
  await expect(page.locator('.logo-layer')).toHaveCount(0)
  await expect
    .poll(() =>
      sloganShell.evaluate((element) => getComputedStyle(element).willChange)
    )
    .toBe('auto')
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
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )
  if (testInfo.project.name.includes('mobile')) {
    const mobileAlertClose = page.locator(
      '.mobile-experience-alert .el-alert__close-btn'
    )
    await expect(mobileAlertClose).toBeVisible()
    await mobileAlertClose.click()
    await expect(page.locator('.mobile-experience-alert')).toHaveCount(0)
  }
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
