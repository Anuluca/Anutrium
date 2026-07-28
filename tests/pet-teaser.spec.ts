import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

test('pet teaser plays its state sequence without opening Flora', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const teaser = page.locator('.pet-teaser')
  await expect(teaser).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(teaser).toHaveClass(/\bpet-teaser--ready\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(teaser).toHaveAttribute('aria-label', '播放花花互动动画')
  await expect(teaser.locator('.pet-teaser__ears')).toHaveAttribute(
    'draggable',
    'false'
  )
  await expect(teaser.locator('.pet-teaser__cat')).toHaveAttribute(
    'draggable',
    'false'
  )
  const ears = teaser.locator('.pet-teaser__ears-window')
  const interactionZone = teaser.locator('.pet-teaser__interaction-zone')
  const wand = teaser.locator('.pet-teaser__wand')
  const rod = teaser.locator('.pet-teaser__wand .wand-rod')
  const feather = teaser.locator('.pet-teaser__wand .wand-feather path')
  await expect(ears).toHaveCSS('pointer-events', 'none')
  await expect(teaser.locator('.pet-teaser__cat')).toHaveCSS(
    'pointer-events',
    'none'
  )
  await expect(rod).toHaveCount(1)
  await expect(rod).toHaveAttribute('d', 'M240 5 C213 6 178 26 150 48')
  await expect(rod).toHaveCSS('stroke', 'rgb(226, 52, 86)')
  await expect(feather).toHaveCount(1)
  await expect(feather).toHaveCSS('fill', 'rgb(226, 52, 86)')
  await expect(feather).toHaveCSS('stroke', 'none')
  await expect(feather).toHaveAttribute('fill-rule', 'nonzero')
  await expect(interactionZone).toHaveCSS('pointer-events', 'auto')
  await expect(teaser.locator('.wand-canvas')).toHaveAttribute(
    'preserveAspectRatio',
    'none'
  )
  await expect(teaser.locator('.pet-teaser__wand .wand-feather g')).toHaveCount(
    0
  )
  await expect(
    teaser.locator('.pet-teaser__wand circle, .pet-teaser__wand line')
  ).toHaveCount(0)

  let hoverAnimationStartTime: number | null = null
  if (!testInfo.project.name.includes('mobile')) {
    await interactionZone.hover()
    await expect(teaser).toHaveClass(/\bpet-teaser--hovering\b/)
    await expect(teaser).toHaveCSS('opacity', '0.8')
    await expect
      .poll(() =>
        rod.evaluate((element) => getComputedStyle(element).animationName)
      )
      .toContain('pet-rod-flex-hover')
    const maxConnectionGap = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const rod = document.querySelector<SVGPathElement>('.wand-rod')
          const featherPath =
            document.querySelector<SVGPathElement>('.wand-feather path')
          if (!rod || !featherPath) {
            throw new Error('Wand connection geometry is unavailable')
          }

          const startedAt = performance.now()
          let maximumGap = 0
          const sample = (time: number) => {
            const rodMatrix = rod.getScreenCTM()
            const featherMatrix = featherPath.getScreenCTM()
            if (!rodMatrix || !featherMatrix) {
              throw new Error('Wand connection matrix is unavailable')
            }

            const rodEndPoint = rod.getPointAtLength(rod.getTotalLength())
            const rodEnd = new DOMPoint(
              rodEndPoint.x,
              rodEndPoint.y
            ).matrixTransform(rodMatrix)
            const featherTail = new DOMPoint(16, 0.873).matrixTransform(
              featherMatrix
            )
            maximumGap = Math.max(
              maximumGap,
              Math.hypot(rodEnd.x - featherTail.x, rodEnd.y - featherTail.y)
            )

            if (time - startedAt < 820) {
              requestAnimationFrame(sample)
            } else {
              resolve(maximumGap)
            }
          }

          requestAnimationFrame(sample)
        })
    )
    expect(maxConnectionGap).toBeLessThanOrEqual(0.5)
    hoverAnimationStartTime = await wand.evaluate((element) => {
      const animation = element
        .getAnimations()
        .find((item) =>
          (item as CSSAnimation).animationName?.includes('pet-wand-hover')
        )
      if (!animation) throw new Error('Wand hover animation is unavailable')
      return Number(animation.startTime)
    })
  }

  await interactionZone.click()
  await expect(teaser).toHaveClass(/\bpet-teaser--activating\b/)
  await expect(teaser).toHaveAttribute('aria-disabled', 'true')
  await expect(teaser).toHaveCSS('opacity', '0.8')
  await expect(teaser.locator('.pet-teaser__cat')).toHaveCSS(
    'animation-delay',
    '0s'
  )
  expect(
    await wand.evaluate((element) => getComputedStyle(element).animationName)
  ).toContain('pet-wand-hover')
  await expect(wand).toHaveCSS('animation-duration', '0.65s')
  if (hoverAnimationStartTime !== null) {
    const activationStartTime = await wand.evaluate((element) => {
      const animation = element
        .getAnimations()
        .find((item) =>
          (item as CSSAnimation).animationName?.includes('pet-wand-hover')
        )
      if (!animation) {
        throw new Error('Wand activation animation is unavailable')
      }
      return Number(animation.startTime)
    })
    expect(activationStartTime).toBeCloseTo(hoverAnimationStartTime, 1)
  }
  await expect(ears).toHaveCSS('animation-delay', '0s')
  await expect(teaser.locator('.pet-teaser__cat')).toHaveCSS(
    'animation-duration',
    '0.65s'
  )
  await expect(ears).toHaveCSS('animation-duration', '0.65s')
  const catEntryKeyframes = await teaser
    .locator('.pet-teaser__cat')
    .evaluate((element) =>
      element
        .getAnimations()
        .flatMap((animation) => animation.effect?.getKeyframes() ?? [])
        .map((keyframe) => keyframe.transform)
    )
  expect(catEntryKeyframes[0]).toContain('translate(95%, 90%)')
  expect(catEntryKeyframes[0]).toContain('rotate(40deg)')
  expect(catEntryKeyframes[catEntryKeyframes.length - 1]).toContain(
    'rotate(0deg)'
  )
  await expect(teaser.locator('.pet-teaser__cat')).toHaveCSS(
    'animation-timing-function',
    'cubic-bezier(0.16, 1, 0.3, 1)'
  )

  const catWidthRatio = await teaser.evaluate((element) => {
    const cat = element.querySelector<HTMLElement>('.pet-teaser__cat')
    if (!cat) throw new Error('Pet cat is unavailable')
    return cat.offsetWidth / element.offsetWidth
  })
  expect(catWidthRatio).toBeCloseTo(
    testInfo.project.name.includes('mobile') ? 0.6 : 0.5,
    1
  )

  await expect(teaser).not.toHaveClass(/\bpet-teaser--activating\b/, {
    timeout: 1_300,
  })
  await expect(teaser).toHaveAttribute('aria-disabled', 'false')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.flora-page')).toHaveCount(0)
  await expect(teaser).toBeVisible()
})

test('pet teaser activation preserves the current route and scroll state', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => {
    document.body.scrollTop = 700
  })
  await expect(page.locator('.el-menu-layout-all')).toHaveClass(/\bscrolled\b/)

  const teaser = page.locator('.pet-teaser')
  await expect(teaser).toHaveClass(/\bpet-teaser--ready\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  const scrollTopBefore = await page.evaluate(() => document.body.scrollTop)
  await teaser.locator('.pet-teaser__interaction-zone').click()
  await expect(teaser).toHaveClass(/\bpet-teaser--activating\b/)
  await expect(teaser).not.toHaveClass(/\bpet-teaser--activating\b/, {
    timeout: 1_300,
  })
  await expect(teaser).toHaveAttribute('aria-disabled', 'false')
  await expect(page).toHaveURL(/\/archive$/)
  await expect(page.locator('.archives-page')).toBeVisible()
  await expect(page.locator('.flora-page')).toHaveCount(0)
  expect(await page.evaluate(() => document.body.scrollTop)).toBeCloseTo(
    scrollTopBefore,
    0
  )
})

test('pet teaser stays inside the viewport and avoids fixed controls', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const teaser = page.locator('.pet-teaser')
  await expect(teaser).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(teaser).toHaveClass(/\bpet-teaser--ready\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(teaser).toHaveCSS('opacity', '0.5', {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
    document.body.scrollTop = document.body.scrollHeight
  })

  const backToTop = page.locator('.back-to-top-button')
  await expect(backToTop).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  const earsImage = teaser.locator('.pet-teaser__ears')
  const idleEarsImageTop = await earsImage.evaluate(
    (element) => element.getBoundingClientRect().top
  )
  let movingEarsImageTop = idleEarsImageTop
  if (!testInfo.project.name.includes('mobile')) {
    await teaser.locator('.pet-teaser__interaction-zone').hover()
    await page.waitForTimeout(120)
    movingEarsImageTop = await earsImage.evaluate(
      (element) => element.getBoundingClientRect().top
    )
    await page.waitForTimeout(680)
  }

  const metrics = await page.evaluate(() => {
    const teaserElement = document.querySelector<HTMLElement>('.pet-teaser')
    const earsElement = document.querySelector<HTMLElement>(
      '.pet-teaser__ears-window'
    )
    const earsImage = document.querySelector<HTMLElement>('.pet-teaser__ears')
    const wandElement = document.querySelector<HTMLElement>('.pet-teaser__wand')
    const rodElement = document.querySelector<SVGPathElement>('.wand-rod')
    const featherElement =
      document.querySelector<SVGSVGElement>('.wand-feather')
    const featherPath =
      document.querySelector<SVGPathElement>('.wand-feather path')
    const backToTopElement = document.querySelector<HTMLElement>(
      '.back-to-top-button'
    )
    const footerElement = document.querySelector<HTMLElement>('.footer-com')
    if (
      !teaserElement ||
      !earsElement ||
      !earsImage ||
      !wandElement ||
      !rodElement ||
      !featherElement ||
      !featherPath ||
      !backToTopElement
    ) {
      throw new Error('Fixed control geometry is unavailable')
    }

    const teaserBounds = teaserElement.getBoundingClientRect()
    const earsBounds = earsElement.getBoundingClientRect()
    const earsImageBounds = earsImage.getBoundingClientRect()
    const wandBounds = wandElement.getBoundingClientRect()
    const rodBounds = rodElement.getBoundingClientRect()
    const featherBounds = featherElement.getBoundingClientRect()
    const backToTopBounds = backToTopElement.getBoundingClientRect()
    const footerBounds = footerElement?.getBoundingClientRect()
    const footerVisible =
      footerElement && window.getComputedStyle(footerElement).display !== 'none'
    const backToTopCenter = {
      x: backToTopBounds.left + backToTopBounds.width / 2,
      y: backToTopBounds.top + backToTopBounds.height / 2,
    }
    const topElement = document.elementFromPoint(
      backToTopCenter.x,
      backToTopCenter.y
    )
    const catCenterElement = document.elementFromPoint(
      earsBounds.left + earsBounds.width / 2,
      earsBounds.top + earsBounds.height / 2
    )
    const rodMatrix = rodElement.getScreenCTM()
    const featherMatrix = featherPath.getScreenCTM()
    if (!rodMatrix || !featherMatrix) {
      throw new Error('Wand transform matrix is unavailable')
    }

    const rodStart = new DOMPoint(
      rodElement.getPointAtLength(0).x,
      rodElement.getPointAtLength(0).y
    ).matrixTransform(rodMatrix)
    const rodEndPoint = rodElement.getPointAtLength(rodElement.getTotalLength())
    const rodEnd = new DOMPoint(rodEndPoint.x, rodEndPoint.y).matrixTransform(
      rodMatrix
    )
    const featherTail = new DOMPoint(16, 0.873).matrixTransform(featherMatrix)
    const visualLeft = Math.min(earsBounds.left, featherBounds.left)

    return {
      bodyOverflow:
        document.body.scrollWidth - document.documentElement.clientWidth,
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      insideViewport:
        teaserBounds.left >= -1 &&
        teaserBounds.top >= -1 &&
        teaserBounds.right <= window.innerWidth + 1 &&
        teaserBounds.bottom <= window.innerHeight + 1,
      rightGap: Math.abs(window.innerWidth - teaserBounds.right),
      rodRightGap: Math.abs(window.innerWidth - rodBounds.right),
      widthRatio: teaserBounds.width / window.innerWidth,
      wandWidthRatio: wandBounds.width / teaserBounds.width,
      wandHeightRatio: wandBounds.height / teaserBounds.height,
      earsWidthRatio: earsBounds.width / teaserBounds.width,
      earsRightOffsetRatio:
        (teaserBounds.right - earsBounds.right) / teaserBounds.width,
      visualWidthRatio: (window.innerWidth - visualLeft) / window.innerWidth,
      backToTopGap: visualLeft - backToTopBounds.right,
      rodDrop: rodEnd.y - rodStart.y,
      rodFeatherGap: Math.hypot(
        rodEnd.x - featherTail.x,
        rodEnd.y - featherTail.y
      ),
      opacity: Number.parseFloat(
        window.getComputedStyle(teaserElement).opacity
      ),
      earsImageTop: earsImageBounds.top,
      earsImageBottom: earsImageBounds.bottom,
      earsImageHeight: earsImageBounds.height,
      earsWindowTop: earsBounds.top,
      earsWindowBottom: earsBounds.bottom,
      earsClipPath: window.getComputedStyle(earsElement).clipPath,
      footerGap:
        footerVisible && footerBounds
          ? earsBounds.bottom - footerBounds.top
          : null,
      backToTopAccessible:
        topElement?.closest('.back-to-top-button') === backToTopElement,
      catAreaActivatesTeaser:
        catCenterElement?.closest('.pet-teaser') === teaserElement,
    }
  })

  expect(metrics.documentOverflow).toBeLessThanOrEqual(1)
  expect(metrics.bodyOverflow).toBeLessThanOrEqual(1)
  expect(metrics.insideViewport).toBe(true)
  expect(metrics.rightGap).toBeLessThanOrEqual(1)
  expect(metrics.rodRightGap).toBeLessThanOrEqual(1)
  expect(metrics.widthRatio).toBeLessThanOrEqual(0.3)
  expect(metrics.wandWidthRatio).toBeCloseTo(2 / 3, 2)
  expect(metrics.wandHeightRatio).toBeCloseTo(0.36, 2)
  expect(metrics.earsWidthRatio).toBeLessThanOrEqual(0.36)
  expect(metrics.earsRightOffsetRatio).toBeGreaterThanOrEqual(0.27)
  expect(metrics.visualWidthRatio).toBeLessThanOrEqual(0.23)
  expect(metrics.backToTopGap).toBeGreaterThanOrEqual(20)
  expect(metrics.rodDrop).toBeGreaterThan(8)
  expect(metrics.rodFeatherGap).toBeLessThanOrEqual(0.5)
  expect(metrics.opacity).toBeCloseTo(
    testInfo.project.name.includes('mobile') ? 0.5 : 0.8,
    2
  )
  expect(metrics.backToTopAccessible).toBe(true)
  expect(metrics.catAreaActivatesTeaser).toBe(true)
  if (!testInfo.project.name.includes('mobile')) {
    expect(movingEarsImageTop).toBeLessThan(idleEarsImageTop - 2)
    expect(
      (idleEarsImageTop - metrics.earsImageTop) / metrics.earsImageHeight
    ).toBeGreaterThanOrEqual(0.34)
    expect(
      (idleEarsImageTop - metrics.earsImageTop) / metrics.earsImageHeight
    ).toBeLessThanOrEqual(0.38)
    expect(
      (metrics.earsImageTop - metrics.earsWindowTop) / metrics.earsImageHeight
    ).toBeCloseTo(0.28, 1)
    expect(
      (metrics.earsImageBottom - metrics.earsWindowBottom) /
        metrics.earsImageHeight
    ).toBeCloseTo(0.28, 1)
    expect(metrics.earsClipPath).toMatch(/^inset\(28%/)
  }
  if (metrics.footerGap !== null) {
    expect(Math.abs(metrics.footerGap)).toBeLessThanOrEqual(1)

    const maxTransitionGap = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const ears = document.querySelector<HTMLElement>(
            '.pet-teaser__ears-window'
          )
          const footer = document.querySelector<HTMLElement>('.footer-com')
          if (!ears || !footer) {
            throw new Error('Footer transition geometry is unavailable')
          }

          const originalBottom = footer.style.bottom
          const currentBottom = Number.parseFloat(
            window.getComputedStyle(footer).bottom
          )
          footer.style.bottom = currentBottom > 5 ? '0px' : '10px'

          const startedAt = performance.now()
          let maximumGap = 0
          const sample = (time: number) => {
            maximumGap = Math.max(
              maximumGap,
              Math.abs(
                ears.getBoundingClientRect().bottom -
                  footer.getBoundingClientRect().top
              )
            )

            if (time - startedAt < 620) {
              requestAnimationFrame(sample)
            } else {
              footer.style.bottom = originalBottom
              resolve(maximumGap)
            }
          }

          requestAnimationFrame(sample)
        })
    )
    expect(maxTransitionGap).toBeLessThanOrEqual(1)
  }
})

test('pet teaser remains animation-only with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const teaser = page.locator('.pet-teaser')
  await expect(teaser).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(teaser).toHaveClass(/\bpet-teaser--ready\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(teaser.locator('.pet-teaser__ears')).toHaveCSS(
    'animation-name',
    'none'
  )

  await teaser.locator('.pet-teaser__interaction-zone').click()
  await page.waitForTimeout(250)
  await expect(teaser).not.toHaveClass(/\bpet-teaser--activating\b/, {
    timeout: 1_300,
  })
  await expect(teaser).toHaveAttribute('aria-disabled', 'false')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.flora-page')).toHaveCount(0)
})
