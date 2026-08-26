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
  const activationMetrics = await teaser.evaluate((element) => {
    const cat = element.querySelector<HTMLElement>('.pet-teaser__cat')
    const ears = element.querySelector<HTMLElement>('.pet-teaser__ears-window')
    const wand = element.querySelector<HTMLElement>('.pet-teaser__wand')
    if (!cat || !ears || !wand) {
      throw new Error('Pet activation elements are unavailable')
    }

    const rootStyles = getComputedStyle(element)
    const catStyles = getComputedStyle(cat)
    const earsStyles = getComputedStyle(ears)
    const wandStyles = getComputedStyle(wand)
    const wandAnimation = wand
      .getAnimations()
      .find((item) =>
        (item as CSSAnimation).animationName?.includes('pet-wand-hover')
      )

    return {
      ariaDisabled: element.getAttribute('aria-disabled'),
      opacity: rootStyles.opacity,
      catDelay: catStyles.animationDelay,
      catDuration: catStyles.animationDuration,
      catTiming: catStyles.animationTimingFunction,
      earsDelay: earsStyles.animationDelay,
      earsDuration: earsStyles.animationDuration,
      wandAnimationName: wandStyles.animationName,
      wandDuration: wandStyles.animationDuration,
      wandStartTime: Number(wandAnimation?.startTime),
      catEntryKeyframes: cat
        .getAnimations()
        .flatMap((animation) => animation.effect?.getKeyframes() ?? [])
        .map((keyframe) => keyframe.transform),
      catWidthRatio: cat.offsetWidth / element.offsetWidth,
    }
  })

  expect(activationMetrics.ariaDisabled).toBe('true')
  expect(activationMetrics.opacity).toBe('0.8')
  expect(activationMetrics.catDelay).toBe('0s')
  expect(activationMetrics.wandAnimationName).toContain('pet-wand-hover')
  expect(activationMetrics.wandDuration).toBe('0.65s')
  if (hoverAnimationStartTime !== null) {
    expect(activationMetrics.wandStartTime).toBeCloseTo(
      hoverAnimationStartTime,
      1
    )
  }
  expect(activationMetrics.earsDelay).toBe('0s')
  expect(activationMetrics.catDuration).toBe('0.65s')
  expect(activationMetrics.earsDuration).toBe('0.65s')
  expect(activationMetrics.catEntryKeyframes[0]).toContain(
    'translate(95%, 90%)'
  )
  expect(activationMetrics.catEntryKeyframes[0]).toContain('rotate(40deg)')
  expect(
    activationMetrics.catEntryKeyframes[
      activationMetrics.catEntryKeyframes.length - 1
    ]
  ).toContain('rotate(0deg)')
  expect(activationMetrics.catTiming).toBe('cubic-bezier(0.16, 1, 0.3, 1)')
  expect(activationMetrics.catWidthRatio).toBeCloseTo(
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

  await page.evaluate((isMobile) => {
    const scrollTop = isMobile
      ? 700
      : Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
    window.scrollTo(0, scrollTop)
    document.scrollingElement?.scrollTo(0, scrollTop)
    document.documentElement.scrollTop = scrollTop
    document.body.scrollTop = scrollTop
  }, testInfo.project.name.includes('mobile'))

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
      backToTopHeight: backToTopBounds.height,
      backToTopRightGap: window.innerWidth - backToTopBounds.right,
      backToTopVerticalGap: teaserBounds.top - backToTopBounds.bottom,
      backToTopWidth: backToTopBounds.width,
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
  expect(metrics.insideViewport).toBe(true)
  expect(metrics.rightGap).toBeLessThanOrEqual(1)
  expect(metrics.rodRightGap).toBeLessThanOrEqual(1)
  expect(metrics.widthRatio).toBeLessThanOrEqual(0.3)
  expect(metrics.wandWidthRatio).toBeCloseTo(2 / 3, 2)
  expect(metrics.wandHeightRatio).toBeCloseTo(0.36, 2)
  expect(metrics.earsWidthRatio).toBeLessThanOrEqual(0.36)
  expect(metrics.earsRightOffsetRatio).toBeGreaterThanOrEqual(0.27)
  expect(metrics.visualWidthRatio).toBeLessThanOrEqual(0.23)
  if (testInfo.project.name.includes('mobile')) {
    expect(metrics.backToTopHeight).toBeCloseTo(36, 0)
    expect(metrics.backToTopRightGap).toBeCloseTo(17, 0)
    expect(metrics.backToTopVerticalGap).toBeGreaterThanOrEqual(32)
    expect(metrics.backToTopWidth).toBeCloseTo(36, 0)
  } else {
    expect(metrics.backToTopGap).toBeGreaterThanOrEqual(20)
  }
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
    expect(maxTransitionGap).toBeLessThanOrEqual(1.5)
  }
})

test('mobile pet teaser is compact and hides at the page bottom', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const teaser = page.locator('.pet-teaser')
  await expect(teaser).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(teaser).toHaveClass(/\bpet-teaser--ready\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const widthRatio = await teaser.evaluate(
    (element) => element.getBoundingClientRect().width / window.innerWidth
  )
  expect(widthRatio).toBeCloseTo(0.24, 1)

  await expect
    .poll(async () => {
      await page.evaluate(() => {
        const scrollTop =
          Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          ) -
          window.innerHeight -
          60
        window.scrollTo(0, scrollTop)
        document.scrollingElement?.scrollTo(0, scrollTop)
        document.documentElement.scrollTop = scrollTop
        document.body.scrollTop = scrollTop
      })
      return teaser.evaluate((element) => ({
        isPageEnd: element.classList.contains('pet-teaser--page-end'),
        pointerEvents: getComputedStyle(element).pointerEvents,
        visibility: getComputedStyle(element).visibility,
      }))
    })
    .toEqual({
      isPageEnd: true,
      pointerEvents: 'none',
      visibility: 'hidden',
    })
  await expect(teaser).toHaveAttribute('aria-disabled', 'true')
  await expect(teaser).toHaveAttribute('tabindex', '-1')
  const backToTop = page.locator('.back-to-top-button')
  await expect(backToTop).toBeVisible()
  await expect
    .poll(() =>
      backToTop.evaluate(
        (element) => window.innerHeight - element.getBoundingClientRect().bottom
      )
    )
    .toBeCloseTo(25, 0)

  await page.evaluate(() => {
    const scrollTop = Math.max(
      window.scrollY,
      document.scrollingElement?.scrollTop || 0,
      document.documentElement.scrollTop,
      document.body.scrollTop
    )
    window.scrollTo(0, scrollTop - 100)
    document.scrollingElement?.scrollTo(0, scrollTop - 100)
    document.documentElement.scrollTop = scrollTop - 100
    document.body.scrollTop = scrollTop - 100
  })

  await expect(teaser).not.toHaveClass(/\bpet-teaser--page-end\b/)
  await expect(teaser).toBeVisible()
  await expect(teaser).toHaveAttribute('tabindex', '0')
  await expect
    .poll(() =>
      backToTop.evaluate(
        (element) => window.innerHeight - element.getBoundingClientRect().bottom
      )
    )
    .toBeGreaterThan(70)
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
