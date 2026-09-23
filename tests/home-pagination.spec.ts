import { expect, type Page, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

const waitForActivePage = async (page: Page, id: string) => {
  const slide = page.locator(`#home-section-${id}`).locator('..')
  await expect(slide).toHaveClass(/swiper-slide-active/, {
    timeout: 3_000,
  })
  await expect
    .poll(() =>
      slide.evaluate((element) => {
        const swiper = element.closest('.home-page-swiper')
        return (
          element.getBoundingClientRect().top -
          (swiper?.getBoundingClientRect().top ?? 0)
        )
      })
    )
    .toBeCloseTo(0, 0)
  return slide
}

const dispatchSlowTouchSwipe = async (
  page: Page,
  startY: number,
  endY: number
) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 200, y: startY }],
  })
  await page.waitForTimeout(350)
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 200, y: startY + Math.sign(endY - startY) * 16 }],
  })
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 200, y: endY }],
  })
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await client.detach()
}

test('mobile home paging accepts a short slow swipe', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-swiper')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await dispatchSlowTouchSwipe(page, 520, 400)
  await waitForActivePage(page, 'about')
  await expect(
    page.locator('#home-section-about .home-about-copy')
  ).toHaveCount(1)
  await expect(page.locator('.home-page-slide.is-page-entering')).toHaveCount(0)
  await expect(
    page.locator('#home-section-about .dome-gallery__auto-rotation')
  ).toHaveCSS('animation-play-state', 'running, running')

  await dispatchSlowTouchSwipe(page, 520, 400)
  await expect(page.locator('#home-section-about').locator('..')).toHaveClass(
    /is-page-content-fading/
  )
  await waitForActivePage(page, 'archive')
  await expect(
    page.locator('#home-section-archive .home-archive-copy')
  ).toHaveCount(1)
  await expect(page.locator('.home-page-slide.is-page-entering')).toHaveCount(0)
  const archiveImages = page.locator(
    '#home-section-archive .archive-project-marquee img'
  )
  await expect(archiveImages).toHaveCount(20)
  expect(
    await archiveImages.evaluateAll((images) =>
      images.every((image) => image.getAttribute('loading') === 'eager')
    )
  ).toBe(true)
  await expect
    .poll(() =>
      archiveImages.evaluateAll((images) =>
        images.every(
          (image) =>
            image.complete &&
            image.currentSrc.length > 0 &&
            image.naturalWidth > 0
        )
      )
    )
    .toBe(true)

  await dispatchSlowTouchSwipe(page, 400, 520)
  await waitForActivePage(page, 'about')
})

test('home paging pauses the bottom marquee during transitions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => {
    const probe = {
      marqueePausedStates: [] as boolean[],
    }
    const probeWindow = window as Window & {
      __homeSectionTitleProbe?: typeof probe
    }
    probeWindow.__homeSectionTitleProbe = probe

    const marquee = document.querySelector<HTMLElement>('.marquee-wrapper')!
    const recordMarqueeState = () => {
      probe.marqueePausedStates.push(
        marquee.classList.contains('motion-paused')
      )
    }
    new MutationObserver(recordMarqueeState).observe(marquee, {
      attributeFilter: ['class'],
      attributes: true,
    })
    recordMarqueeState()
  })

  await page.mouse.wheel(0, 720)
  const marquee = page.locator('.marquee-wrapper')
  await waitForActivePage(page, 'about')
  await expect(marquee).not.toHaveClass(/motion-paused/)

  const firstEntryProbe = await page.evaluate(
    () =>
      (
        window as Window & {
          __homeSectionTitleProbe: {
            marqueePausedStates: boolean[]
          }
        }
      ).__homeSectionTitleProbe
  )
  expect(firstEntryProbe.marqueePausedStates).toContain(true)
  expect(firstEntryProbe.marqueePausedStates.at(-1)).toBe(false)

  await page.evaluate(() => {
    const swiper = (
      document.querySelector<HTMLElement>(
        '.home-page-swiper'
      ) as HTMLElement & {
        swiper: { slideTo: (index: number) => void }
      }
    ).swiper
    swiper.slideTo(2)
    window.setTimeout(() => swiper.slideTo(3), 80)
  })

  await expect(marquee).toHaveClass(/motion-paused/)
  await waitForActivePage(page, 'flanerie')
  await expect(marquee).not.toHaveClass(/motion-paused/)
  await expect(
    page.locator('#home-section-flanerie .scroll-section-title')
  ).toHaveCount(1)
})

test('home paging respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.mouse.wheel(0, 720)
  await waitForActivePage(page, 'about')

  const reducedState = await page.locator('.home-page-swiper').evaluate(() => {
    const swiperStyles = getComputedStyle(
      document.querySelector<HTMLElement>(
        '.home-page-swiper > .swiper-wrapper'
      )!
    )
    return {
      pageTransitionDuration: swiperStyles.transitionDuration,
    }
  })

  expect(Number.parseFloat(reducedState.pageTransitionDuration)).toBeLessThan(
    0.00001
  )
  await expect(page.locator('.marquee-wrapper')).toHaveClass(/motion-paused/)
})

test('home prevents native bounce from sub-threshold wheel input', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-swiper')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const state = await page.evaluate(() => {
    const wheelResults = [3, 8, 17, -3, -17].map((deltaY) => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 4,
        clientY: window.innerHeight / 2,
        deltaY,
      })
      const dispatched = window.dispatchEvent(event)
      return { defaultPrevented: event.defaultPrevented, dispatched }
    })

    return {
      bodyOverscrollBehavior: getComputedStyle(document.body)
        .overscrollBehavior,
      htmlOverscrollBehavior: getComputedStyle(document.documentElement)
        .overscrollBehavior,
      swiperTouchAction: getComputedStyle(
        document.querySelector<HTMLElement>('.home-page-swiper')!
      ).touchAction,
      wheelResults,
    }
  })

  expect(state.bodyOverscrollBehavior).toBe('none')
  expect(state.htmlOverscrollBehavior).toBe('none')
  expect(state.swiperTouchAction).toBe('none')
  expect(
    state.wheelResults.every(
      ({ defaultPrevented, dispatched }) => defaultPrevented && !dispatched
    )
  ).toBe(true)
})

test('home coordinates exits while changing between Passion and About Me', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(1_800)

  const forwardTimeline = await page.evaluate(
    () =>
      new Promise<{
        phaseTargetsApplied: number
        menuComplete: number
        passionComplete: number
        passionStopped: number
        marqueeComplete: number
        aboutMounted: number
        pageStarts: number
      }>((resolve, reject) => {
        const startedAt = performance.now()
        let phaseTargetsApplied = Number.NaN
        let menuComplete = Number.NaN
        let passionComplete = Number.NaN
        let passionStopped = Number.NaN
        let marqueeComplete = Number.NaN
        let aboutMounted = Number.NaN
        let pageStarts = Number.NaN

        window.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            clientX: 24,
            clientY: window.innerHeight / 2,
            deltaY: 720,
          })
        )

        const sample = () => {
          const elapsed = performance.now() - startedAt
          const home = document.querySelector<HTMLElement>('.home-page')!
          const layout = document.querySelector<HTMLElement>('.layout-page')!
          const header = document.querySelector<HTMLElement>(
            '.el-menu-layout-all'
          )!
          const hero = document.querySelector<HTMLElement>(
            '.home-page-slide--hero'
          )!
          const aboutSlide = document.querySelector<HTMLElement>(
            '.home-placeholder-slide--about'
          )!
          const slogan = document.querySelector<HTMLElement>('.main-slogan')!
          const recommend = document.querySelector<HTMLElement>(
            '.hero-content > .recommend'
          )!
          const marquee = document.querySelector<HTMLElement>(
            '.home-marquee-fixed-layer'
          )!
          const progress = Number.parseFloat(
            getComputedStyle(layout).getPropertyValue(
              '--header-scroll-progress'
            )
          )
          const blurOpacity = Number.parseFloat(
            getComputedStyle(header, '::before').opacity
          )
          const sloganOpacity = Number.parseFloat(
            getComputedStyle(slogan).opacity
          )
          const recommendOpacity = Number.parseFloat(
            getComputedStyle(recommend).opacity
          )
          const marqueeTop = marquee.getBoundingClientRect().top
          const headerBottom = header.getBoundingClientRect().bottom
          const marqueeTargetTop = new DOMMatrix(marquee.style.transform).m42

          if (
            Number.isNaN(phaseTargetsApplied) &&
            home.classList.contains('is-header-transition-staging') &&
            hero.classList.contains('is-hero-inactive') &&
            Math.abs(marqueeTargetTop - headerBottom) < 3
          ) {
            phaseTargetsApplied = elapsed
          }
          if (
            Number.isNaN(menuComplete) &&
            progress > 0.99 &&
            blurOpacity > 0.99
          ) {
            menuComplete = elapsed
          }
          if (
            Number.isNaN(passionComplete) &&
            sloganOpacity < 0.03 &&
            recommendOpacity < 0.03
          ) {
            passionComplete = elapsed
          }
          if (
            Number.isNaN(passionStopped) &&
            aboutSlide.classList.contains('swiper-slide-active') &&
            hero.classList.contains('is-page-leaving') &&
            Number.parseFloat(getComputedStyle(slogan).transitionDuration) ===
              0 &&
            Number.parseFloat(
              getComputedStyle(recommend).transitionDuration
            ) === 0
          ) {
            passionStopped = elapsed
          }
          if (
            Number.isNaN(aboutMounted) &&
            aboutSlide.querySelector('.home-page-content--about')
          ) {
            aboutMounted = elapsed
          }
          if (
            Number.isNaN(marqueeComplete) &&
            Math.abs(marqueeTop - headerBottom) < 3
          ) {
            marqueeComplete = elapsed
          }
          if (
            Number.isNaN(pageStarts) &&
            hero.getBoundingClientRect().top < -1
          ) {
            pageStarts = elapsed
          }

          const timeline = [
            phaseTargetsApplied,
            menuComplete,
            passionComplete,
            passionStopped,
            marqueeComplete,
            aboutMounted,
            pageStarts,
          ]
          if (timeline.every(Number.isFinite)) {
            resolve({
              phaseTargetsApplied,
              menuComplete,
              passionComplete,
              passionStopped,
              marqueeComplete,
              aboutMounted,
              pageStarts,
            })
            return
          }
          if (elapsed > 4_000) {
            reject(
              new Error(
                `Forward transition did not finish: ${JSON.stringify(timeline)}`
              )
            )
            return
          }
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
  )

  expect(forwardTimeline.phaseTargetsApplied).toBeLessThan(
    forwardTimeline.pageStarts
  )
  const usesTouchCarousel = await page.evaluate(
    () => window.matchMedia('(hover: none) and (pointer: coarse)').matches
  )
  if (usesTouchCarousel) {
    expect(
      forwardTimeline.pageStarts - forwardTimeline.phaseTargetsApplied
    ).toBeLessThan(500)
  } else {
    expect(
      forwardTimeline.pageStarts - forwardTimeline.phaseTargetsApplied
    ).toBeGreaterThan(550)
    expect(
      forwardTimeline.pageStarts - forwardTimeline.phaseTargetsApplied
    ).toBeLessThan(900)
  }
  expect(
    Math.abs(forwardTimeline.passionStopped - forwardTimeline.pageStarts)
  ).toBeLessThan(100)
  expect(forwardTimeline.aboutMounted).toBeLessThan(forwardTimeline.pageStarts)
  expect(forwardTimeline.aboutMounted).toBeGreaterThan(
    forwardTimeline.phaseTargetsApplied + (usesTouchCarousel ? 40 : 300)
  )
  await waitForActivePage(page, 'about')
  await page.waitForTimeout(100)

  const reverseTimeline = await page.evaluate(
    () =>
      new Promise<{
        phaseTargetsApplied: number
        menuComplete: number
        aboutExitComplete: number
        passionStarts: number
        pageStarts: number
      }>((resolve, reject) => {
        const startedAt = performance.now()
        let phaseTargetsApplied = Number.NaN
        let menuComplete = Number.NaN
        let aboutExitComplete = Number.NaN
        let passionStarts = Number.NaN
        let pageStarts = Number.NaN

        window.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            clientX: 24,
            clientY: window.innerHeight / 2,
            deltaY: -720,
          })
        )

        const sample = () => {
          const elapsed = performance.now() - startedAt
          const home = document.querySelector<HTMLElement>('.home-page')!
          const layout = document.querySelector<HTMLElement>('.layout-page')!
          const header = document.querySelector<HTMLElement>(
            '.el-menu-layout-all'
          )!
          const hero = document.querySelector<HTMLElement>(
            '.home-page-slide--hero'
          )!
          const aboutSlide = document.querySelector<HTMLElement>(
            '.home-placeholder-slide--about'
          )!
          const slogan = document.querySelector<HTMLElement>('.main-slogan')!
          const aboutContent = document.querySelector<HTMLElement>(
            '.home-page-content--about'
          )
          const progress = Number.parseFloat(
            getComputedStyle(layout).getPropertyValue(
              '--header-scroll-progress'
            )
          )
          const blurOpacity = Number.parseFloat(
            getComputedStyle(header, '::before').opacity
          )
          const sloganOpacity = Number.parseFloat(
            getComputedStyle(slogan).opacity
          )
          const aboutOpacity = aboutContent
            ? Number.parseFloat(getComputedStyle(aboutContent).opacity)
            : 0

          if (
            Number.isNaN(phaseTargetsApplied) &&
            home.classList.contains('is-header-transition-staging') &&
            aboutSlide.classList.contains('is-page-content-fading')
          ) {
            phaseTargetsApplied = elapsed
          }
          if (
            Number.isNaN(menuComplete) &&
            progress < 0.01 &&
            blurOpacity < 0.01
          ) {
            menuComplete = elapsed
          }
          if (Number.isNaN(aboutExitComplete) && aboutOpacity < 0.03) {
            aboutExitComplete = elapsed
          }
          if (Number.isNaN(passionStarts) && sloganOpacity > 0.03) {
            passionStarts = elapsed
          }
          if (
            Number.isNaN(pageStarts) &&
            hero.getBoundingClientRect().top > -window.innerHeight + 1
          ) {
            pageStarts = elapsed
          }

          const timeline = [
            phaseTargetsApplied,
            menuComplete,
            aboutExitComplete,
            passionStarts,
            pageStarts,
          ]
          if (timeline.every(Number.isFinite)) {
            resolve({
              phaseTargetsApplied,
              menuComplete,
              aboutExitComplete,
              passionStarts,
              pageStarts,
            })
            return
          }
          if (elapsed > 4_000) {
            reject(
              new Error(
                `Reverse transition did not finish: ${JSON.stringify(timeline)}`
              )
            )
            return
          }
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
  )

  expect(reverseTimeline.phaseTargetsApplied).toBeLessThanOrEqual(
    reverseTimeline.passionStarts
  )
  expect(reverseTimeline.menuComplete).toBeLessThanOrEqual(
    reverseTimeline.passionStarts
  )
  expect(reverseTimeline.aboutExitComplete).toBeLessThanOrEqual(
    reverseTimeline.passionStarts
  )
  expect(reverseTimeline.menuComplete).toBeLessThanOrEqual(
    reverseTimeline.pageStarts
  )
  expect(reverseTimeline.aboutExitComplete).toBeLessThanOrEqual(
    reverseTimeline.pageStarts
  )
  await expect
    .poll(() =>
      page
        .locator('.home-page-slide--hero')
        .evaluate((slide) => slide.getBoundingClientRect().top)
    )
    .toBeCloseTo(0, 0)
})

test('home unmounts each previous secondary section when the next one enters', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(1_800)
  await expect(page.locator('.home-corner-lines')).toHaveCount(0)
  await expect(page.locator('.hero-content')).toHaveCSS('scale', '1.08')

  await page.mouse.wheel(0, 720)
  await expect(page.locator('.home-corner-lines-enter-active')).toHaveCount(1)
  expect(
    await page
      .locator('.home-corner-lines-enter-active .home-corner-lines__corner')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName)
  ).toContain('homeCornerLineMoveIn')
  await waitForActivePage(page, 'about')
  await expect(page.locator('.home-page-content--about')).toHaveCount(1)
  await expect(page.locator('.home-corner-lines__corner')).toHaveCount(4)
  const cornerDecoration = await page.evaluate(() => {
    const corner = document.querySelector<HTMLElement>(
      '.home-corner-lines__corner--top-left'
    )!
    const cornerBounds = corner.getBoundingClientRect()
    const cornerStyles = getComputedStyle(corner)
    const cornerContainer = corner.closest<HTMLElement>('.home-corner-lines')!
    const footerBounds = document
      .querySelector<HTMLElement>('.footer-com')!
      .getBoundingClientRect()
    const marqueeTextBounds = document
      .querySelector<HTMLElement>('.marquee-showcase .text-solid')!
      .getBoundingClientRect()

    return {
      borderColor: cornerStyles.borderTopColor,
      footerLeft: footerBounds.left,
      footerRight: footerBounds.right,
      height: cornerBounds.height,
      left: cornerBounds.left,
      marqueeTextBottom: marqueeTextBounds.bottom,
      opacity: cornerStyles.opacity,
      position: getComputedStyle(cornerContainer).position,
      top: cornerBounds.top,
      topRight: document
        .querySelector<HTMLElement>('.home-corner-lines__corner--top-right')!
        .getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      width: cornerBounds.width,
      zIndex: Number.parseInt(getComputedStyle(cornerContainer).zIndex, 10),
      headerZIndex: Number.parseInt(
        getComputedStyle(
          document.querySelector<HTMLElement>('.el-menu-layout-all')!
        ).zIndex,
        10
      ),
    }
  })
  expect(cornerDecoration.borderColor).toBe('rgb(226, 52, 86)')
  expect(cornerDecoration.opacity).toBe('1')
  expect(cornerDecoration.position).toBe('fixed')
  expect(cornerDecoration.zIndex).toBeGreaterThan(cornerDecoration.headerZIndex)
  expect(cornerDecoration.left - cornerDecoration.footerLeft).toBeGreaterThan(1)
  expect(
    cornerDecoration.left - cornerDecoration.footerLeft
  ).toBeLessThanOrEqual(4)
  expect(
    cornerDecoration.footerRight - cornerDecoration.topRight
  ).toBeGreaterThan(1)
  expect(
    cornerDecoration.footerRight - cornerDecoration.topRight
  ).toBeLessThanOrEqual(4)
  expect(
    cornerDecoration.viewportWidth - cornerDecoration.topRight
  ).toBeCloseTo(cornerDecoration.left, 1)
  expect(cornerDecoration.top).toBeGreaterThan(0)
  expect(
    Math.abs(cornerDecoration.top - cornerDecoration.marqueeTextBottom)
  ).toBeLessThanOrEqual(8)
  expect(cornerDecoration.width).toBeGreaterThan(0)
  expect(cornerDecoration.width).toBeLessThanOrEqual(14)
  expect(cornerDecoration.height).toBeGreaterThan(0)
  expect(cornerDecoration.height).toBeLessThanOrEqual(14)
  await expect(
    page.getByRole('link', { name: 'MORE ABOUT ME' })
  ).toHaveAttribute('href', '/island')

  const moreLinks = {
    archive: {
      color: 'rgb(47, 117, 72)',
      href: '/archive',
      label: 'MORE ARCHIVES',
    },
    craft: {
      color: 'rgb(36, 67, 146)',
      href: '/craft',
      label: 'MORE CRAFTS',
    },
    flanerie: {
      color: 'rgb(138, 44, 27)',
      href: '/flanerie',
      label: 'MORE FLANERIES',
    },
  } as const

  for (const [previousPage, nextPage] of [
    ['about', 'archive'],
    ['archive', 'flanerie'],
    ['flanerie', 'craft'],
  ] as const) {
    await expect(page.locator('.home-page-slide.is-page-entering')).toHaveCount(
      0
    )
    await page.mouse.wheel(0, 720)
    await expect(page.locator('.home-corner-theme-enter-active')).toHaveCount(1)
    expect(
      await page
        .locator('.home-corner-theme-enter-active')
        .evaluate((element) => getComputedStyle(element).animationName)
    ).toContain('homeCornerLinesFlashIn')
    expect(
      await page
        .locator('.home-corner-theme-enter-active .home-corner-lines__corner')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName)
    ).toBe('none')
    await waitForActivePage(page, nextPage)
    await expect(
      page.locator(`.home-page-content--${previousPage}`)
    ).toHaveCount(0)
    await expect(page.locator(`.home-page-content--${nextPage}`)).toHaveCount(1)
    await expect(page.locator('.home-page-content--secondary')).toHaveCount(1)
    await expect(
      page.getByRole('link', { name: moreLinks[nextPage].label })
    ).toHaveAttribute('href', moreLinks[nextPage].href)
    await expect(
      page.locator('.home-corner-lines__corner--top-left')
    ).toHaveCSS('border-top-color', moreLinks[nextPage].color)

    if (nextPage === 'flanerie') {
      const flanerieSubtitle = page.locator('.home-flanerie-subtitle')
      await expect(flanerieSubtitle).toHaveCSS('animation-duration', '0.7s')
      await expect(flanerieSubtitle).toHaveCSS('animation-delay', '0.42s')
      await expect(flanerieSubtitle).toHaveCSS(
        'animation-timing-function',
        'ease-out'
      )
      const flanerieMoreAlignment = await page.evaluate(() => ({
        buttonLeft: document
          .querySelector<HTMLElement>('.home-flanerie-more')!
          .getBoundingClientRect().left,
        buttonMarginBottom: Number.parseFloat(
          getComputedStyle(
            document.querySelector<HTMLElement>('.home-flanerie-more')!
          ).marginBottom
        ),
        buttonMarginTop: Number.parseFloat(
          getComputedStyle(
            document.querySelector<HTMLElement>('.home-flanerie-more')!
          ).marginTop
        ),
        subtitleLeft: document
          .querySelector<HTMLElement>('.home-flanerie-subtitle')!
          .getBoundingClientRect().left,
      }))
      expect(
        Math.abs(
          flanerieMoreAlignment.buttonLeft - flanerieMoreAlignment.subtitleLeft
        )
      ).toBeLessThanOrEqual(1)
      expect(flanerieMoreAlignment.buttonMarginTop).toBeCloseTo(
        flanerieMoreAlignment.buttonMarginBottom,
        1
      )
    }
  }

  await expect(page.locator('.home-section-title')).toHaveCount(0)

  const craftGrid = page.locator('.home-craft-grid')
  const craftCards = craftGrid.locator('.home-craft-card')
  await expect(craftCards).toHaveCount(4)
  await expect(craftGrid.getByRole('heading', { level: 3 })).toHaveText([
    '配色提取器',
    '可视化贝塞尔曲线调整',
    '弹力球',
    '节拍器',
  ])
  const craftSubtitle = page.locator('.home-craft-subtitle')
  const craftDescription = page.locator('.home-craft-description')
  await expect(craftSubtitle).toHaveText('想到既做到。')
  await expect(craftDescription).toHaveText('借助Agent开发的一些常用工具')
  expect(
    await craftSubtitle.evaluate(
      (element) => getComputedStyle(element).animationName
    )
  ).toContain('homeAboutTextEnter')
  expect(
    await craftDescription.evaluate(
      (element) => getComputedStyle(element).animationName
    )
  ).toContain('homeCraftDescriptionEnter')
  expect(
    Number.parseFloat(
      await craftDescription.evaluate(
        (element) => getComputedStyle(element).animationDelay
      )
    )
  ).toBeGreaterThan(
    Number.parseFloat(
      await craftSubtitle.evaluate(
        (element) => getComputedStyle(element).animationDelay
      )
    )
  )
  await expect(page.getByText('开发中', { exact: true })).toHaveCount(0)

  const craftGridGeometry = await craftGrid.evaluate((grid) => {
    const gridBounds = grid.getBoundingClientRect()
    const subtitleBounds = document
      .querySelector<HTMLElement>('.home-craft-subtitle')!
      .getBoundingClientRect()
    const cardBounds = Array.from(
      grid.querySelectorAll<HTMLElement>('.home-craft-card'),
      (card) => card.getBoundingClientRect()
    )

    return {
      copyTranslate: getComputedStyle(
        document.querySelector<HTMLElement>('.home-craft-copy')!
      ).translate,
      centerOffset: Math.abs(
        gridBounds.left + gridBounds.width / 2 - window.innerWidth / 2
      ),
      columnCount: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      cardBounds: cardBounds.map((bounds) => ({
        bottom: bounds.bottom,
        left: bounds.left,
        top: bounds.top,
      })),
      gridStartsAfterSubtitle: gridBounds.top > subtitleBounds.bottom,
      cardWidth: getComputedStyle(grid.children[0] as HTMLElement).width,
      textAlign: getComputedStyle(grid.children[0] as HTMLElement).textAlign,
    }
  })
  const expectedCraftColumns = testInfo.project.name.includes('mobile') ? 2 : 3
  const firstRowCards = craftGridGeometry.cardBounds.slice(
    0,
    expectedCraftColumns
  )
  const firstSecondRowCard = craftGridGeometry.cardBounds[expectedCraftColumns]
  expect(craftGridGeometry.centerOffset).toBeLessThanOrEqual(1)
  expect(craftGridGeometry.columnCount).toBe(expectedCraftColumns)
  expect(
    Math.max(
      ...firstRowCards.map((bounds) =>
        Math.abs(bounds.top - firstRowCards[0].top)
      )
    )
  ).toBeLessThanOrEqual(1)
  expect(firstSecondRowCard.top).toBeGreaterThan(firstRowCards[0].bottom)
  expect(
    Math.abs(firstSecondRowCard.left - firstRowCards[0].left)
  ).toBeLessThanOrEqual(1)
  if (testInfo.project.name.includes('mobile')) {
    expect(craftGridGeometry.copyTranslate).toBe('none')
  } else {
    expect(
      Number.parseFloat(craftGridGeometry.copyTranslate.split(' ')[1])
    ).toBeLessThan(0)
  }
  expect(craftGridGeometry.gridStartsAfterSubtitle).toBe(true)
  expect(Number.parseFloat(craftGridGeometry.cardWidth)).toBeLessThan(320)
  expect(craftGridGeometry.textAlign).toBe('left')

  const craftMoreLink = page.getByRole('link', { name: 'MORE CRAFTS' })
  const craftMoreLinkStyle = await craftMoreLink.evaluate((link) => {
    const bounds = link.getBoundingClientRect()
    const styles = getComputedStyle(link)

    return {
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
      centerOffset: Math.abs(
        bounds.left + bounds.width / 2 - window.innerWidth / 2
      ),
      color: styles.color,
      fontFamily: styles.fontFamily,
      textShadow: styles.textShadow,
    }
  })
  expect(craftMoreLinkStyle.centerOffset).toBeLessThanOrEqual(1)
  expect(craftMoreLinkStyle.backgroundColor).toBe('rgb(36, 67, 146)')
  expect(craftMoreLinkStyle.boxShadow).not.toBe('none')
  expect(craftMoreLinkStyle.color).toBe('rgb(0, 0, 0)')
  expect(craftMoreLinkStyle.fontFamily.toLowerCase()).toContain('unboundedsans')
  expect(craftMoreLinkStyle.textShadow).toBe('none')

  await craftMoreLink.hover()
  await expect(craftMoreLink).toHaveCSS('background-position', '0px 0px')
  await expect(craftMoreLink).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('mobile home hides side indicators and lower corners at the footer', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.mouse.wheel(0, 720)
  await waitForActivePage(page, 'about')
  await page
    .locator('.home-page-indicator--left .home-page-indicator__item--craft')
    .getByRole('button')
    .click()
  await waitForActivePage(page, 'craft')

  const homePage = page.locator('.home-page')
  const leftIndicator = page.locator('.home-page-indicator--left')
  const bottomLeftCorner = page.locator(
    '.home-corner-lines__corner--bottom-left'
  )
  await expect(leftIndicator).toHaveCSS(
    'transition-property',
    'opacity, visibility, transform'
  )
  await expect(bottomLeftCorner).toHaveCSS(
    'transition-property',
    'opacity, visibility'
  )
  await page.waitForTimeout(750)
  await homePage.dispatchEvent('pointerdown', {
    clientY: 650,
    pointerId: 1,
    pointerType: 'touch',
  })
  await homePage.dispatchEvent('pointermove', {
    clientY: 520,
    pointerId: 1,
    pointerType: 'touch',
  })
  await homePage.dispatchEvent('pointerup', {
    clientY: 520,
    pointerId: 1,
    pointerType: 'touch',
  })

  await page.waitForTimeout(100)
  const fadingOutOpacity = await leftIndicator.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity)
  )
  expect(fadingOutOpacity).toBeGreaterThan(0)
  expect(fadingOutOpacity).toBeLessThan(1)
  await expect(homePage).toHaveClass(/is-craft-footer-visible/)
  await expect(leftIndicator).toBeHidden()
  await expect(page.locator('.home-page-indicator--right')).toBeHidden()
  await expect(
    page.locator('.home-corner-lines__corner--top-left')
  ).toBeVisible()
  await expect(
    page.locator('.home-corner-lines__corner--top-right')
  ).toBeVisible()
  await expect(
    page.locator('.home-corner-lines__corner--bottom-left')
  ).toBeHidden()
  await expect(
    page.locator('.home-corner-lines__corner--bottom-right')
  ).toBeHidden()

  const pageFooter = page.locator('#page-footer-portal > .bottom-text')
  await page.waitForTimeout(750)
  await pageFooter.dispatchEvent('pointerdown', {
    clientY: 420,
    pointerId: 2,
    pointerType: 'touch',
  })
  await pageFooter.dispatchEvent('pointermove', {
    clientY: 560,
    pointerId: 2,
    pointerType: 'touch',
  })
  await pageFooter.dispatchEvent('pointerup', {
    clientY: 560,
    pointerId: 2,
    pointerType: 'touch',
  })

  await page.waitForTimeout(100)
  const fadingInOpacity = await leftIndicator.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity)
  )
  expect(fadingInOpacity).toBeGreaterThan(0)
  expect(fadingInOpacity).toBeLessThan(1)
  await expect(homePage).not.toHaveClass(/is-craft-footer-visible/)
  await expect(leftIndicator).toBeVisible()
  await expect(bottomLeftCorner).toBeVisible()
})

test('home title returns the active home module to Passion', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-swiper')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.locator('.home-page-swiper').evaluate((element) => {
    const swiper = (
      element as HTMLElement & {
        swiper: {
          allowSlideNext: boolean
          slideTo: (index: number, speed: number) => void
        }
      }
    ).swiper
    swiper.allowSlideNext = true
    swiper.slideTo(1, 0)
  })
  await waitForActivePage(page, 'about')
  await page.locator('.logo-box').click()
  await expect(page.locator('.home-page-slide--hero')).toHaveClass(
    /swiper-slide-active/,
    { timeout: 3_000 }
  )
  await expect(page).toHaveURL(/\/$/)
})

test('home Flanerie spacing and Craft grid follow the responsive layout', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const homeSwiper = page.locator('.home-page-swiper')
  await expect(homeSwiper).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  const showPage = async (index: number, id: string) => {
    await homeSwiper.evaluate((element, targetIndex) => {
      const swiper = (
        element as HTMLElement & {
          swiper: {
            allowSlideNext: boolean
            slideTo: (index: number, speed: number) => void
          }
        }
      ).swiper
      swiper.allowSlideNext = true
      swiper.slideTo(targetIndex, 0)
    }, index)
    await waitForActivePage(page, id)
  }

  await showPage(3, 'flanerie')
  const flanerieMargins = await page
    .locator('.home-flanerie-more')
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        bottom: Number.parseFloat(style.marginBottom),
        top: Number.parseFloat(style.marginTop),
      }
    })
  expect(flanerieMargins.top).toBeGreaterThan(0)
  expect(flanerieMargins.top).toBeCloseTo(flanerieMargins.bottom, 1)

  await showPage(4, 'craft')
  const craftSubtitle = page.locator('.home-craft-subtitle')
  const craftDescription = page.locator('.home-craft-description')
  await expect(craftSubtitle).toHaveText('想到既做到。')
  await expect(craftDescription).toHaveText('借助Agent开发的一些常用工具')
  expect(
    await craftDescription.evaluate(
      (element) => getComputedStyle(element).animationName
    )
  ).toContain('homeCraftDescriptionEnter')
  const craftEntranceDelays = await page.evaluate(() => ({
    description: Number.parseFloat(
      getComputedStyle(
        document.querySelector<HTMLElement>('.home-craft-description')!
      ).animationDelay
    ),
    title: Number.parseFloat(
      getComputedStyle(
        document.querySelector<HTMLElement>('.home-craft-subtitle')!
      ).animationDelay
    ),
  }))
  expect(craftEntranceDelays.description).toBeGreaterThan(
    craftEntranceDelays.title
  )
  const craftCards = page.locator('.home-craft-card')
  await expect(craftCards).toHaveCount(4)
  const craftLayout = await page
    .locator('.home-craft-grid')
    .evaluate((grid) => {
      const copy = document.querySelector<HTMLElement>('.home-craft-copy')!
      const gridBounds = grid.getBoundingClientRect()
      const cards = Array.from(
        grid.querySelectorAll<HTMLElement>('.home-craft-card'),
        (card) => card.getBoundingClientRect()
      )

      return {
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        centerOffset: Math.abs(
          gridBounds.left + gridBounds.width / 2 - window.innerWidth / 2
        ),
        copyTranslate: getComputedStyle(copy).translate,
        firstRowDelta: Math.abs(cards[0].top - cards[1].top),
        thirdCardStartsSecondRow: cards[2].top > cards[0].bottom,
        thirdCardLeftDelta: Math.abs(cards[2].left - cards[0].left),
      }
    })

  if (testInfo.project.name.includes('mobile')) {
    expect(craftLayout.columns).toBe(2)
    expect(craftLayout.centerOffset).toBeLessThanOrEqual(1)
    expect(craftLayout.copyTranslate).toBe('none')
    expect(craftLayout.firstRowDelta).toBeLessThanOrEqual(1)
    expect(craftLayout.thirdCardStartsSecondRow).toBe(true)
    expect(craftLayout.thirdCardLeftDelta).toBeLessThanOrEqual(1)
  } else {
    expect(craftLayout.columns).toBe(3)
    expect(
      Number.parseFloat(craftLayout.copyTranslate.split(' ')[1])
    ).toBeLessThan(0)
  }
})

test('home switches five full-screen pages vertically while marquee stays fixed', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-swiper')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const slides = page.locator(
    '.home-page-swiper > .swiper-wrapper > .home-page-slide'
  )
  await expect(slides).toHaveCount(5)
  await expect(slides.first()).toHaveClass(/swiper-slide-active/)
  await expect(page.locator('#home-section-about h2')).toHaveCount(0)
  await expect(page.locator('#home-section-archive h2')).toHaveCount(0)
  await expect(page.locator('#home-section-flanerie h2')).toHaveCount(0)
  await expect(page.locator('#home-section-craft h2')).toHaveCount(0)
  await expect(page.locator('.home-page-content')).toHaveCount(1)

  const pageIndicators = page.locator('.home-page-indicator')
  const leftIndicator = page.locator('.home-page-indicator--left')
  const rightIndicator = page.locator('.home-page-indicator--right')
  await expect(pageIndicators).toHaveCount(2)
  await expect(leftIndicator.locator('.home-page-indicator__item')).toHaveCount(
    5
  )
  await expect(
    rightIndicator.locator('.home-page-indicator__item')
  ).toHaveCount(5)
  await expect(leftIndicator).toBeHidden()
  await expect(rightIndicator).toBeHidden()

  const initialIndicatorGeometry = await page.evaluate(() => {
    const readSide = (side: 'left' | 'right') => {
      const indicator = document.querySelector<HTMLElement>(
        `.home-page-indicator--${side}`
      )!
      const active = indicator.querySelector<HTMLElement>(
        '.home-page-indicator__item.is-active'
      )!
      const marker = active.querySelector<HTMLElement>(
        '.home-page-indicator__marker'
      )!
      const title = active.querySelector<HTMLElement>(
        '.home-page-indicator__title'
      )!
      const activeBounds = active.getBoundingClientRect()
      const markerBounds = marker.getBoundingClientRect()
      const titleBounds = title.getBoundingClientRect()
      const inactive = indicator.querySelector<HTMLElement>(
        '.home-page-indicator__item:not(.is-active)'
      )!
      const inactiveTitle = inactive.querySelector<HTMLElement>(
        '.home-page-indicator__title'
      )!
      const styles = getComputedStyle(active)
      const inactiveTitleBounds = inactiveTitle.getBoundingClientRect()

      return {
        activeCenter: activeBounds.top + activeBounds.height / 2,
        activeColor: styles.color,
        activeTextShiftedInward:
          side === 'left'
            ? titleBounds.left > inactiveTitleBounds.left
            : titleBounds.right < inactiveTitleBounds.right,
        activeText: title.textContent,
        fontFamily: styles.fontFamily.toLowerCase(),
        fontSize: Number.parseFloat(styles.fontSize),
        indicatorTransform: getComputedStyle(indicator).transform,
        inactiveColor: getComputedStyle(inactive).color,
        itemHeight: activeBounds.height,
        lineHeight: Number.parseFloat(styles.lineHeight),
        markerColor: getComputedStyle(marker).backgroundColor,
        markerCenterOffset:
          markerBounds.top +
          markerBounds.height / 2 -
          (activeBounds.top + activeBounds.height / 2),
        markerHeight: markerBounds.height,
        markerIsOutside:
          side === 'left'
            ? markerBounds.right < titleBounds.left
            : markerBounds.left > titleBounds.right,
        markerWidth: markerBounds.width,
        position: getComputedStyle(indicator).position,
        trackTop: indicator
          .querySelector<HTMLElement>('.home-page-indicator__track')!
          .getBoundingClientRect().top,
        trackTransitionDuration: getComputedStyle(
          indicator.querySelector<HTMLElement>('.home-page-indicator__track')!
        ).transitionDuration,
      }
    }

    return {
      left: readSide('left'),
      right: readSide('right'),
      viewportCenter: window.innerHeight / 2,
    }
  })

  for (const side of [
    initialIndicatorGeometry.left,
    initialIndicatorGeometry.right,
  ]) {
    expect(
      Math.abs(side.activeCenter - initialIndicatorGeometry.viewportCenter)
    ).toBeLessThanOrEqual(1)
    expect(side.activeColor).toBe('rgb(226, 52, 86)')
    expect(side.activeTextShiftedInward).toBe(true)
    expect(side.activeText).toBe('PASSION')
    expect(side.fontFamily.toLowerCase()).toContain('anton')
    expect(side.fontSize).toBeGreaterThanOrEqual(17)
    expect(side.indicatorTransform).not.toBe('none')
    expect(side.inactiveColor).toBe('rgba(255, 255, 255, 0.3)')
    expect(side.itemHeight).toBeGreaterThan(side.fontSize)
    expect(side.itemHeight).toBeLessThan(side.fontSize * 2)
    expect(side.lineHeight).toBeCloseTo(side.fontSize, 1)
    expect(side.markerColor).toBe('rgb(226, 52, 86)')
    expect(Math.abs(side.markerCenterOffset)).toBeLessThan(4)
    expect(Math.abs(side.markerHeight - side.markerWidth)).toBeLessThan(0.25)
    expect(side.markerIsOutside).toBe(true)
    expect(side.position).toBe('fixed')
    expect(side.trackTransitionDuration).toBe('0s')
  }

  const contentGeometry = await page.evaluate(() => {
    const heroSection = document.querySelector<HTMLElement>('.hero-section')!
    const heroSlide = document.querySelector<HTMLElement>(
      '.home-page-slide--hero'
    )!
    const heroContent = document.querySelector<HTMLElement>(
      '.home-page-content--hero'
    )!
    const heroSectionBounds = heroSection.getBoundingClientRect()
    const heroContentBounds = heroContent.getBoundingClientRect()
    const secondarySlides = Array.from(
      document.querySelectorAll<HTMLElement>('.home-placeholder-slide')
    ).map((slide) => {
      const slideBounds = slide.getBoundingClientRect()

      return {
        backgroundColor: getComputedStyle(slide).backgroundColor,
        slideHeight: slideBounds.height,
      }
    })

    return {
      heroBackgroundColor: getComputedStyle(heroSlide).backgroundColor,
      heroDelta: {
        bottom: Math.abs(heroContentBounds.bottom - heroSectionBounds.bottom),
        left: Math.abs(heroContentBounds.left - heroSectionBounds.left),
        right: Math.abs(heroContentBounds.right - heroSectionBounds.right),
        top: Math.abs(heroContentBounds.top - heroSectionBounds.top),
      },
      secondarySlides,
      viewportHeight: window.innerHeight,
    }
  })

  expect(
    Object.values(contentGeometry.heroDelta).every((delta) => delta <= 1)
  ).toBe(true)
  expect(contentGeometry.heroBackgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(
    contentGeometry.secondarySlides.map((page) => page.backgroundColor)
  ).toEqual([
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 0, 0)',
  ])
  for (const secondarySlide of contentGeometry.secondarySlides) {
    expect(secondarySlide.slideHeight).toBeCloseTo(
      contentGeometry.viewportHeight,
      0
    )
  }

  const initialGeometry = await page.evaluate(() => {
    const marquee = document.querySelector<HTMLElement>(
      '.home-marquee-fixed-layer'
    )!
    const swiper = document.querySelector<HTMLElement>('.home-page-swiper')!
    const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const pageProgress = document.querySelector<HTMLElement>(
      '.page-scroll-progress'
    )!
    const pageProgressBounds = pageProgress.getBoundingClientRect()
    return {
      bodyHeight: document.body.scrollHeight,
      htmlHeight: document.documentElement.scrollHeight,
      marqueeOpacity: getComputedStyle(marquee).opacity,
      marqueePosition: getComputedStyle(marquee).position,
      marqueeTop: marquee.getBoundingClientRect().top,
      pageProgressBackground: getComputedStyle(pageProgress).backgroundColor,
      pageProgressBottomDelta: Math.abs(
        pageProgressBounds.bottom - window.innerHeight
      ),
      pageProgressFillBackground: getComputedStyle(pageProgress, '::after')
        .backgroundColor,
      pageProgressTopDelta: Math.abs(
        pageProgressBounds.top - menu.getBoundingClientRect().bottom
      ),
      pageProgressValue: Number.parseFloat(
        getComputedStyle(pageProgress).getPropertyValue(
          '--page-scroll-progress'
        )
      ),
      swiperHeight: swiper.getBoundingClientRect().height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(initialGeometry.marqueePosition).toBe('fixed')
  expect(initialGeometry.marqueeOpacity).toBe('1')
  expect(initialGeometry.pageProgressBackground).toBe(
    testInfo.project.name.includes('mobile')
      ? 'rgba(0, 0, 0, 0)'
      : 'rgba(0, 0, 0, 0.5)'
  )
  expect(initialGeometry.pageProgressFillBackground).toBe('rgb(226, 52, 86)')
  expect(initialGeometry.pageProgressTopDelta).toBeLessThanOrEqual(1)
  expect(initialGeometry.pageProgressBottomDelta).toBeLessThanOrEqual(1)
  expect(initialGeometry.pageProgressValue).toBe(0)
  expect(initialGeometry.swiperHeight).toBeCloseTo(
    initialGeometry.viewportHeight,
    0
  )
  expect(initialGeometry.bodyHeight).toBeLessThanOrEqual(
    initialGeometry.viewportHeight + 1
  )
  expect(initialGeometry.htmlHeight).toBeLessThanOrEqual(
    initialGeometry.viewportHeight + 1
  )

  const scrollDownHint = page.locator('.scroll-down-hint')
  await expect(scrollDownHint).toContainText('EXPLORE')
  await expect(scrollDownHint).toHaveCSS('position', 'fixed')
  await expect(scrollDownHint.locator('.scroll-down-hint__label')).toHaveCSS(
    'animation-name',
    'none'
  )
  await expect
    .poll(() =>
      scrollDownHint.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeGreaterThanOrEqual(0.99)
  const scrollDownHintBounds = await scrollDownHint.boundingBox()
  expect(scrollDownHintBounds).not.toBeNull()
  if (!scrollDownHintBounds) {
    throw new Error('Scroll down hint has no rendered bounds')
  }
  expect(
    Math.abs(
      scrollDownHintBounds.x +
        scrollDownHintBounds.width / 2 -
        initialGeometry.viewportWidth / 2
    )
  ).toBeLessThanOrEqual(1)
  expect(scrollDownHintBounds.y + scrollDownHintBounds.height).toBeLessThan(
    initialGeometry.viewportHeight
  )

  const initialHeroMotion = await page.evaluate(() => {
    const readCenter = (selector: string) => {
      const bounds = document
        .querySelector<HTMLElement>(selector)!
        .getBoundingClientRect()
      return {
        centerX: bounds.left + bounds.width / 2,
        centerY: bounds.top + bounds.height / 2,
      }
    }
    return {
      contentTop: document
        .querySelector<HTMLElement>('.hero-content')!
        .getBoundingClientRect().top,
      recommend: readCenter('.hero-content > .recommend'),
      slogan: readCenter('.main-slogan'),
    }
  })

  await page.mouse.move(20, 220)
  if (testInfo.project.name.includes('mobile')) {
    const homePage = page.locator('.home-page')
    await homePage.dispatchEvent('pointerdown', {
      clientY: 520,
      pointerId: 10,
      pointerType: 'touch',
    })
    await homePage.dispatchEvent('pointermove', {
      clientY: 340,
      pointerId: 10,
      pointerType: 'touch',
    })
    await homePage.dispatchEvent('pointerup', {
      clientY: 340,
      pointerId: 10,
      pointerType: 'touch',
    })
  } else {
    await page.mouse.wheel(0, 720)
  }
  expect(await page.locator('.home-about-gallery').count()).toBe(0)
  await page.waitForTimeout(80)
  await expect(scrollDownHint).toHaveClass(/is-page-transitioning/)
  expect(
    await scrollDownHint
      .locator('.scroll-down-hint__label')
      .evaluate((element) => getComputedStyle(element).animationName)
  ).toContain('scrollDownHintPageTransition')
  await expect(scrollDownHint.locator('.scroll-down-hint__rail')).toHaveCSS(
    'animation-delay',
    '0.13s'
  )
  const hintExitOpacity = await scrollDownHint.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity)
  )
  expect(hintExitOpacity).toBeGreaterThanOrEqual(0.99)
  await page.waitForTimeout(160)
  const heroLeadState = await page.evaluate(() => {
    const heroSlide = document.querySelector<HTMLElement>(
      '.home-page-slide--hero'
    )!
    const aboutSlide = document.querySelector<HTMLElement>(
      '.home-placeholder-slide--about'
    )!
    const sloganStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.main-slogan')!
    )
    const recommendStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.hero-content > .recommend')!
    )
    const marquee = document.querySelector<HTMLElement>(
      '.home-marquee-fixed-layer'
    )!
    return {
      aboutTop: aboutSlide.getBoundingClientRect().top,
      heroTop: heroSlide.getBoundingClientRect().top,
      marqueeFlat: marquee
        .querySelector<HTMLElement>('.marquee-wrapper')!
        .classList.contains('is-flat'),
      marqueeTop: marquee.getBoundingClientRect().top,
      recommendOpacity: Number.parseFloat(recommendStyles.opacity),
      recommendTranslateX: Number.parseFloat(recommendStyles.translate) || 0,
      sloganOpacity: Number.parseFloat(sloganStyles.opacity),
      sloganTranslateX: Number.parseFloat(sloganStyles.translate) || 0,
      viewportHeight: window.innerHeight,
    }
  })
  expect(heroLeadState.heroTop).toBeLessThanOrEqual(0)
  expect(heroLeadState.heroTop).toBeGreaterThan(-heroLeadState.viewportHeight)
  expect(heroLeadState.aboutTop).toBeGreaterThan(0)
  expect(heroLeadState.aboutTop).toBeLessThanOrEqual(
    heroLeadState.viewportHeight
  )
  expect(heroLeadState.marqueeFlat).toBe(true)
  expect(heroLeadState.marqueeTop).toBeLessThan(initialGeometry.marqueeTop)
  expect(heroLeadState.sloganOpacity).toBeGreaterThanOrEqual(0)
  expect(heroLeadState.sloganOpacity).toBeLessThan(1)
  expect(heroLeadState.recommendOpacity).toBeGreaterThanOrEqual(0)
  expect(heroLeadState.recommendOpacity).toBeLessThan(1)
  expect(heroLeadState.sloganTranslateX).toBeLessThan(0)
  expect(heroLeadState.recommendTranslateX).toBeGreaterThan(0)

  await expect(page.locator('.home-about-gallery')).toHaveCount(1)
  await expect(page.locator('.home-placeholder-slide--about')).toHaveClass(
    /is-page-entering/
  )
  const transitionState = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(
      '.home-page-content--hero'
    )!
    const about = document.querySelector<HTMLElement>(
      '.home-page-content--about'
    )!
    const layout = document.querySelector<HTMLElement>('.layout-page')!
    const header = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const heroContent = document.querySelector<HTMLElement>('.hero-content')!
    const slogan = document.querySelector<HTMLElement>('.main-slogan')!
    const recommend = document.querySelector<HTMLElement>(
      '.hero-content > .recommend'
    )!
    const aboutIntroduction = document.querySelector<HTMLElement>(
      '.home-about-introduction'
    )!
    const aboutGallery = document.querySelector<HTMLElement>(
      '.home-about-gallery'
    )!
    const sloganStyles = getComputedStyle(slogan)
    const recommendStyles = getComputedStyle(recommend)
    const readTranslate = (value: string) => {
      const [x = '0', y = '0'] = value.split(' ')
      return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
    }
    return {
      aboutOpacity: Number.parseFloat(getComputedStyle(about).opacity),
      aboutAnimationDelay: getComputedStyle(about).animationDelay,
      aboutTransform: getComputedStyle(about).transform,
      aboutTop: about.getBoundingClientRect().top,
      aboutTextAnimationDuration:
        getComputedStyle(aboutIntroduction).animationDuration,
      aboutTextAnimationDelay:
        getComputedStyle(aboutIntroduction).animationDelay,
      aboutTextAnimationName: getComputedStyle(aboutIntroduction).animationName,
      aboutGalleryAnimationDelay: getComputedStyle(aboutGallery).animationDelay,
      aboutGalleryAnimationDuration:
        getComputedStyle(aboutGallery).animationDuration,
      aboutGalleryAnimationName: getComputedStyle(aboutGallery).animationName,
      heroOpacity: Number.parseFloat(getComputedStyle(hero).opacity),
      heroTransform: getComputedStyle(hero).transform,
      heroTop: hero.getBoundingClientRect().top,
      heroContentTop: heroContent.getBoundingClientRect().top,
      recommendOpacity: Number.parseFloat(recommendStyles.opacity),
      recommendScale: Number.parseFloat(recommendStyles.scale),
      recommendTransitionDuration: recommendStyles.transitionDuration,
      recommendTranslate: readTranslate(recommendStyles.translate),
      sloganOpacity: Number.parseFloat(sloganStyles.opacity),
      sloganScale: Number.parseFloat(sloganStyles.scale),
      sloganTransitionDuration: sloganStyles.transitionDuration,
      sloganTranslate: readTranslate(sloganStyles.translate),
      heroSlideTop: document
        .querySelector<HTMLElement>('.home-page-slide--hero')!
        .getBoundingClientRect().top,
      enteringPage:
        document.querySelector<HTMLElement>('.is-page-entering')?.className,
      leavingPage:
        document.querySelector<HTMLElement>('.is-page-leaving')?.className,
      headerBackgroundOpacity: Number.parseFloat(
        getComputedStyle(header, '::after').opacity
      ),
      headerLayoutActive: header.classList.contains('scroll-layout-active'),
      headerProgress: Number.parseFloat(
        getComputedStyle(layout).getPropertyValue('--header-scroll-progress')
      ),
      headerScrolled: header.classList.contains('scrolled'),
      marqueeTransitionDuration: getComputedStyle(
        document.querySelector<HTMLElement>('.marquee-3d-container')!
      ).transitionDuration,
      indicatorItemHeight: document
        .querySelector<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__item'
        )!
        .getBoundingClientRect().height,
      indicatorTrackTop: document
        .querySelector<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__track'
        )!
        .getBoundingClientRect().top,
      indicatorTransitionDuration: getComputedStyle(
        document.querySelector<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__track'
        )!
      ).transitionDuration,
      activeItemTransitionDurations: getComputedStyle(
        document.querySelector<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__item.is-active'
        )!
      ).transitionDuration.split(', '),
      activeMarkerTransitionDurations: getComputedStyle(
        document.querySelector<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__item.is-active .home-page-indicator__marker'
        )!
      ).transitionDuration.split(', '),
      pageTransitionDuration: getComputedStyle(
        document.querySelector<HTMLElement>(
          '.home-page-swiper > .swiper-wrapper'
        )!
      ).transitionDuration,
      pageProgressValue: Number.parseFloat(
        getComputedStyle(
          document.querySelector<HTMLElement>('.page-scroll-progress')!
        ).getPropertyValue('--page-scroll-progress')
      ),
      leftIndicatorTransform: getComputedStyle(
        document.querySelector<HTMLElement>('.home-page-indicator--left')!
      ).transform,
      rightIndicatorTransform: getComputedStyle(
        document.querySelector<HTMLElement>('.home-page-indicator--right')!
      ).transform,
      leftIndicatorRowTransitionDelays: Array.from(
        document.querySelectorAll<HTMLElement>(
          '.home-page-indicator--left .home-page-indicator__item'
        )
      ).map((item) => getComputedStyle(item).transitionDelay),
      rightIndicatorRowTransitionDelays: Array.from(
        document.querySelectorAll<HTMLElement>(
          '.home-page-indicator--right .home-page-indicator__item'
        )
      ).map((item) => getComputedStyle(item).transitionDelay),
      viewportHeight: window.innerHeight,
    }
  })
  expect(transitionState.heroContentTop).toBeCloseTo(
    initialHeroMotion.contentTop,
    0
  )
  expect(transitionState.aboutTop).toBeGreaterThan(0)
  expect(transitionState.aboutTop).toBeLessThan(transitionState.viewportHeight)
  expect(transitionState.aboutAnimationDelay).toBe('0s, 0.2s')
  expect(transitionState.aboutTransform).not.toBe('none')
  expect(transitionState.aboutTextAnimationName).toContain('homeAboutTextEnter')
  expect(transitionState.aboutTextAnimationDuration).toBe('0.7s')
  expect(transitionState.aboutTextAnimationDelay).toBe('0.42s')
  expect(transitionState.aboutGalleryAnimationName).toContain(
    'homeAboutGalleryScaleEnter'
  )
  expect(transitionState.aboutGalleryAnimationName).toContain(
    'homeAboutGalleryFadeEnter'
  )
  expect(transitionState.aboutGalleryAnimationDelay).toBe('0.42s, 0.42s')
  expect(transitionState.aboutGalleryAnimationDuration).toBe('1s, 0.65s')
  expect(transitionState.heroOpacity).toBe(1)
  expect(transitionState.heroTransform).toBe('none')
  expect(transitionState.sloganOpacity).toBe(0)
  expect(transitionState.recommendOpacity).toBe(0)
  expect(transitionState.sloganTranslate.x).toBeLessThan(0)
  expect(transitionState.sloganTranslate.y).toBe(0)
  expect(transitionState.recommendTranslate.x).toBeGreaterThan(0)
  expect(transitionState.recommendTranslate.y).toBe(0)
  expect(transitionState.sloganScale).toBeGreaterThan(1)
  expect(transitionState.recommendScale).toBeGreaterThan(1)
  expect(transitionState.sloganTransitionDuration).toBe('0s')
  expect(transitionState.recommendTransitionDuration).toBe('0s')
  expect(transitionState.enteringPage).toContain(
    'home-placeholder-slide--about'
  )
  expect(transitionState.leavingPage).toContain('home-page-slide--hero')
  expect(transitionState.headerLayoutActive).toBe(true)
  expect(transitionState.headerScrolled).toBe(true)
  expect(transitionState.headerProgress).toBeCloseTo(1, 2)
  expect(transitionState.headerBackgroundOpacity).toBeCloseTo(1, 2)
  expect(
    transitionState.marqueeTransitionDuration
      .split(', ')
      .every((duration) => duration === '0.36s')
  ).toBe(true)
  const indicatorTravel =
    transitionState.indicatorTrackTop - initialIndicatorGeometry.left.trackTop
  expect(indicatorTravel).toBeLessThan(0)
  expect(indicatorTravel).toBeGreaterThanOrEqual(
    -transitionState.indicatorItemHeight - 0.1
  )
  expect(transitionState.indicatorTransitionDuration).not.toBe('0s')
  expect(
    Number.parseFloat(transitionState.indicatorTransitionDuration)
  ).toBeLessThan(Number.parseFloat(transitionState.pageTransitionDuration))
  expect(transitionState.pageTransitionDuration).toBe('0.6s')
  expect(transitionState.pageProgressValue).toBeGreaterThan(0)
  expect(transitionState.pageProgressValue).toBeLessThan(100 / 2)
  expect(
    transitionState.activeItemTransitionDurations.every(
      (duration) => duration === transitionState.indicatorTransitionDuration
    )
  ).toBe(true)
  expect(
    transitionState.activeMarkerTransitionDurations.every(
      (duration) => duration === transitionState.indicatorTransitionDuration
    )
  ).toBe(true)
  expect(transitionState.leftIndicatorTransform).not.toBe('none')
  expect(transitionState.rightIndicatorTransform).not.toBe('none')
  expect(transitionState.leftIndicatorRowTransitionDelays).toEqual([
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
  ])
  expect(transitionState.rightIndicatorRowTransitionDelays).toEqual([
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
    '0s, 0s',
  ])
  await waitForActivePage(page, 'about')
  await expect(scrollDownHint).toBeVisible()
  const aboutIntro = page.locator('.home-about-intro')
  const aboutDescription = page.locator('.home-about-description')
  const aboutActionSpacer = page.locator('.home-about-action-spacer')
  await expect(page.locator('.home-section-title')).toHaveCount(0)
  await expect(page.locator('.home-about-copy')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(aboutIntro).toHaveText('你好，我是路卡。')
  await expect(aboutIntro.locator('a')).toHaveCount(0)
  await expect(aboutIntro).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(aboutIntro).toHaveCSS('font-weight', '900')
  await expect(aboutDescription).toContainText('Anutrium记录着我的')
  await expect(aboutDescription).toContainText('我想把它们留存在网络中。')
  await expect(aboutDescription).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(aboutDescription.locator('.typed-text')).toHaveAttribute(
    'aria-label',
    /想法|生活片段|作品/
  )
  await expect(aboutDescription.locator('.random-typed-text')).toHaveCSS(
    'white-space',
    'nowrap'
  )
  const randomTypedText = aboutDescription.locator('.random-typed-text')
  await expect(randomTypedText).toHaveAttribute(
    'href',
    /\/(island|flanerie|works)$/
  )
  const typedText = randomTypedText.locator('.typed-text')
  const typedActiveText = typedText.locator(
    '.typed-text__active > span:first-child'
  )
  await expect
    .poll(async () => (await typedActiveText.textContent())?.length ?? 0)
    .toBe((await typedText.getAttribute('aria-label'))?.length ?? 0)
  await expect(typedText.locator('.typed-text__cursor')).toHaveCount(1)
  await expect
    .poll(() => randomTypedText.evaluate((element) => element.className), {
      intervals: [16],
      timeout: 5_000,
    })
    .toContain('is-deleting')
  await expect
    .poll(
      async () => {
        const fullLength =
          (await typedText.getAttribute('aria-label'))?.length ?? 0
        const visibleLength = (await typedActiveText.textContent())?.length ?? 0
        return visibleLength < fullLength
      },
      { intervals: [16], timeout: 1_000 }
    )
    .toBe(true)
  await expect(aboutDescription).toHaveCSS('font-weight', '600')
  await expect(page.locator('.home-about-highlight')).toHaveCount(0)
  await expect(aboutActionSpacer).toBeVisible()
  await expect(aboutActionSpacer).toHaveText('')
  await expect(randomTypedText).toHaveCSS('color', 'rgb(226, 52, 86)')
  await expect(page.locator('.home-about-copy')).toHaveCSS('z-index', '10')
  await expect(page.locator('.home-about-gallery')).toBeVisible()
  await expect(page.locator('.dome-gallery')).toHaveCount(1)
  await expect(page.locator('.dome-gallery__tile')).toHaveCount(200)
  const gallerySourceCount = await page
    .locator('.dome-gallery__tile img')
    .evaluateAll((images) => new Set(images.map((image) => image.src)).size)
  expect(gallerySourceCount).toBeLessThanOrEqual(20)
  await expect(page.locator('.dome-gallery__stage')).toHaveCSS(
    'mask-image',
    /linear-gradient/
  )
  await expect(
    page.locator('.dome-gallery__tile img').first()
  ).not.toHaveAttribute('loading', 'lazy')
  const sphere = page.locator('.dome-gallery__sphere')
  const initialSphereTransform = await sphere.evaluate(
    (element) => getComputedStyle(element).transform
  )
  await page.waitForTimeout(220)
  await expect
    .poll(() =>
      sphere.evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(initialSphereTransform)
  await page.locator('.dome-gallery__tile').first().dispatchEvent('click')
  await expect(page.locator('.dome-gallery__viewer')).toBeVisible()
  await expect(page.locator('.dome-gallery__preview-image')).toBeVisible()
  await expect(page.locator('.dome-gallery__preview-caption')).toHaveCount(1)
  await expect(page.locator('.dome-gallery__preview-caption')).toHaveCSS(
    'font-weight',
    '700'
  )
  await expect(page.locator('.dome-gallery__preview-caption')).toHaveCSS(
    'text-align',
    'left'
  )
  await expect(page.locator('.dome-gallery__preview-caption')).toHaveCSS(
    'letter-spacing',
    'normal'
  )
  await expect(page.locator('.dome-gallery__viewer-scrim')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(page.locator('.dome-gallery__stage')).not.toHaveCSS(
    'filter',
    'none'
  )
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.dome-gallery')).not.toHaveClass(/is-preview-open/)
  await expect(page.locator('.dome-gallery__viewer')).toHaveCount(0)
  await expect
    .poll(() =>
      page
        .locator('.page-scroll-progress')
        .evaluate((element) =>
          Number.parseFloat(
            getComputedStyle(element).getPropertyValue('--page-scroll-progress')
          )
        )
    )
    .toBeCloseTo(100 / 4, 1)
  await expect(leftIndicator).toBeVisible()
  await expect(rightIndicator).toBeVisible()
  await expect(page.locator('.el-menu-layout-all')).toHaveClass(/scrolled/)
  await expect(page.locator('.marquee-wrapper')).toHaveClass(/is-flat/)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')!
        const marquee = document.querySelector<HTMLElement>(
          '.home-marquee-fixed-layer'
        )!
        return Math.abs(
          marquee.getBoundingClientRect().top -
            menu.getBoundingClientRect().bottom
        )
      })
    )
    .toBeLessThanOrEqual(1)

  if (!testInfo.project.name.includes('mobile')) {
    const inactiveIndicatorItems = leftIndicator.locator(
      '.home-page-indicator__item:not(.is-active)'
    )
    const inactiveIndicatorTitle = inactiveIndicatorItems.first()
    const otherInactiveIndicatorTitle = inactiveIndicatorItems.nth(1)
    await page.mouse.move(320, 700)
    await expect(inactiveIndicatorTitle).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.3)'
    )
    const inactiveBounds = await inactiveIndicatorTitle.boundingBox()
    expect(inactiveBounds).not.toBeNull()
    if (!inactiveBounds) return
    await page.mouse.move(
      inactiveBounds.x + inactiveBounds.width / 2,
      inactiveBounds.y - 1
    )
    await expect(inactiveIndicatorTitle).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.6)'
    )
    await expect(otherInactiveIndicatorTitle).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.3)'
    )
    expect(
      await inactiveIndicatorTitle
        .locator('.home-page-indicator__title')
        .evaluate((element) => getComputedStyle(element).textShadow)
    ).toBe('none')
    await expect(
      leftIndicator.locator('.home-page-indicator__item.is-active')
    ).toHaveCSS('color', 'rgb(226, 52, 86)')
    await page.mouse.move(320, 700)
    await expect(inactiveIndicatorTitle).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.3)'
    )
    await expect(
      inactiveIndicatorTitle.locator('.home-page-indicator__title')
    ).toHaveCSS('text-shadow', 'none')
  }
  await expect(leftIndicator).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await expect(rightIndicator).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)'
  )

  for (const indicator of [leftIndicator, rightIndicator]) {
    const activeIndicator = indicator.locator(
      '.home-page-indicator__item.is-active'
    )
    await expect(activeIndicator).toContainText('ABOUT ME')
    await expect
      .poll(() =>
        activeIndicator.evaluate((item) => {
          const bounds = item.getBoundingClientRect()
          return Math.abs(
            bounds.top + bounds.height / 2 - window.innerHeight / 2
          )
        })
      )
      .toBeLessThanOrEqual(1)
  }

  await leftIndicator.getByRole('button', { name: 'CRAFT' }).click()
  await waitForActivePage(page, 'craft')
  await expect(
    leftIndicator.getByRole('button', { name: 'CRAFT' })
  ).toHaveAttribute('aria-current', 'page')

  await rightIndicator.getByRole('button', { name: 'ABOUT ME' }).click()
  await waitForActivePage(page, 'about')

  await page.mouse.wheel(0, 720)
  await waitForActivePage(page, 'archive')
  await expect(page.locator('.home-page-content--about')).toHaveCount(0)
  await expect(page.locator('.home-page-content')).toHaveCount(2)

  await page.mouse.wheel(0, 720)
  const flanerieSlide = await waitForActivePage(page, 'flanerie')
  await expect(flanerieSlide).toHaveCSS('opacity', '1')
  await expect(page.locator('.home-page-content--archive')).toHaveCount(0)

  await page.mouse.wheel(0, 720)
  for (let index = 0; index < 7; index += 1) {
    await page.waitForTimeout(90)
    await page.mouse.wheel(0, 40)
  }
  const craftSlide = await waitForActivePage(page, 'craft')
  await expect(craftSlide).toHaveCSS('opacity', '1')
  await expect(page.locator('.home-page-content--flanerie')).toHaveCount(0)
  await expect(page.locator('.home-page-content')).toHaveCount(2)
  await expect(page.locator('.home-page')).not.toHaveClass(
    /is-craft-footer-visible/
  )

  const craftState = await page.evaluate(() => {
    const marquee = document.querySelector<HTMLElement>(
      '.home-marquee-fixed-layer'
    )!
    const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const marqueeWrapper =
      marquee.querySelector<HTMLElement>('.marquee-wrapper')!
    const perspectivePlane = marquee.querySelector<HTMLElement>(
      '.marquee-3d-container'
    )!
    const perspectiveMatrix = new DOMMatrix(
      getComputedStyle(perspectivePlane).transform
    )
    return {
      activeSlides: document.querySelectorAll(
        '.home-page-swiper > .swiper-wrapper > .swiper-slide-active'
      ).length,
      headerScrolled: menu.classList.contains('scrolled'),
      marqueeFlat: marqueeWrapper.classList.contains('is-flat'),
      marqueeTop: marquee.getBoundingClientRect().top,
      marqueeTopDelta: Math.abs(
        marquee.getBoundingClientRect().top -
          menu.getBoundingClientRect().bottom
      ),
      perspectiveM23: perspectiveMatrix.m23,
      perspectiveM32: perspectiveMatrix.m32,
      pageProgressValue: Number.parseFloat(
        getComputedStyle(
          document.querySelector<HTMLElement>('.page-scroll-progress')!
        ).getPropertyValue('--page-scroll-progress')
      ),
      scrollY: window.scrollY,
    }
  })

  expect(craftState.activeSlides).toBe(1)
  expect(craftState.headerScrolled).toBe(true)
  expect(craftState.marqueeFlat).toBe(true)
  expect(craftState.pageProgressValue).toBe(100)
  expect(craftState.marqueeTopDelta).toBeLessThanOrEqual(1)
  expect(Math.abs(craftState.perspectiveM23)).toBeLessThanOrEqual(0.001)
  expect(Math.abs(craftState.perspectiveM32)).toBeLessThanOrEqual(0.001)
  expect(craftState.scrollY).toBeLessThanOrEqual(1)

  const craftContent = page.locator('.home-page-content--craft')
  const pageFooter = page.locator('#page-footer-portal > .bottom-text')
  await expect(
    page.locator('#home-section-craft .page-footer-anchor')
  ).toHaveCount(1)
  await expect(pageFooter).toHaveCount(1)

  await page.waitForTimeout(180)
  await page.mouse.wheel(0, 720)
  await expect(page.locator('.home-page')).toHaveClass(
    /is-craft-footer-visible/
  )
  await expect(scrollDownHint).toHaveAttribute('aria-hidden', 'true')
  await expect(scrollDownHint).toBeDisabled()
  await expect(pageFooter).not.toHaveAttribute('aria-hidden', 'true')
  const footerEntryState = await page.evaluate((initialMarqueeTop) => {
    const marquee = document.querySelector<HTMLElement>(
      '.home-marquee-fixed-layer'
    )!
    const footerPortal = document.querySelector<HTMLElement>(
      '#page-footer-portal'
    )!
    const marqueeStyles = getComputedStyle(marquee)
    const footerStyles = getComputedStyle(footerPortal)

    return {
      footerOpacity: footerStyles.opacity,
      footerTransitionProperty: footerStyles.transitionProperty,
      marqueeOpacity: marqueeStyles.opacity,
      marqueeTransitionProperty: marqueeStyles.transitionProperty,
      marqueeTopDelta: Math.abs(
        marquee.getBoundingClientRect().top - Number(initialMarqueeTop)
      ),
      marqueeTransform: marqueeStyles.transform,
    }
  }, craftState.marqueeTop)
  expect(footerEntryState.footerOpacity).toBe('1')
  expect(footerEntryState.footerTransitionProperty).not.toContain('opacity')
  expect(footerEntryState.marqueeTransitionProperty).toContain('opacity')
  expect(
    Number.parseFloat(footerEntryState.marqueeOpacity)
  ).toBeLessThanOrEqual(1)
  expect(footerEntryState.marqueeTopDelta).toBeLessThanOrEqual(1)
  expect(footerEntryState.marqueeTransform).toBe('none')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number.parseFloat(
          getComputedStyle(
            document.querySelector<HTMLElement>('.home-marquee-fixed-layer')!
          ).opacity
        )
      )
    )
    .toBeLessThan(0.05)
  await expect
    .poll(() =>
      pageFooter.evaluate((footer) => {
        const bounds = footer.getBoundingClientRect()
        return Math.abs(bounds.bottom - window.innerHeight)
      })
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(() =>
      craftContent.evaluate((content) => content.getBoundingClientRect().top)
    )
    .toBeLessThan(-40)
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1)

  await page.waitForTimeout(100)
  await pageFooter.hover()
  await page.mouse.wheel(0, -720)
  await expect(page.locator('.home-page')).not.toHaveClass(
    /is-craft-footer-visible/
  )
  await expect(scrollDownHint).toHaveAttribute('aria-hidden', 'false')
  await expect(scrollDownHint).toBeEnabled()
  await expect(pageFooter).toHaveAttribute('aria-hidden', 'true')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number.parseFloat(
          getComputedStyle(
            document.querySelector<HTMLElement>('.home-marquee-fixed-layer')!
          ).opacity
        )
      )
    )
    .toBeGreaterThan(0.95)
  await expect
    .poll(() =>
      craftContent.evaluate((content) =>
        Math.abs(content.getBoundingClientRect().top)
      )
    )
    .toBeLessThanOrEqual(1)

  if (testInfo.project.name.includes('mobile')) {
    const homePage = page.locator('.home-page')
    await page.waitForTimeout(750)
    await homePage.dispatchEvent('pointerdown', {
      clientY: 650,
      pointerId: 1,
      pointerType: 'touch',
    })
    await homePage.dispatchEvent('pointermove', {
      clientY: 520,
      pointerId: 1,
      pointerType: 'touch',
    })
    await homePage.dispatchEvent('pointerup', {
      clientY: 520,
      pointerId: 1,
      pointerType: 'touch',
    })
    await expect(homePage).toHaveClass(/is-craft-footer-visible/)
    await expect(leftIndicator).toBeHidden()
    await expect(rightIndicator).toBeHidden()
    await expect(
      page.locator('.home-corner-lines__corner--top-left')
    ).toBeVisible()
    await expect(
      page.locator('.home-corner-lines__corner--top-right')
    ).toBeVisible()
    await expect(
      page.locator('.home-corner-lines__corner--bottom-left')
    ).toBeHidden()
    await expect(
      page.locator('.home-corner-lines__corner--bottom-right')
    ).toBeHidden()

    await page.waitForTimeout(750)
    await pageFooter.dispatchEvent('pointerdown', {
      clientY: 420,
      pointerId: 2,
      pointerType: 'touch',
    })
    await pageFooter.dispatchEvent('pointermove', {
      clientY: 560,
      pointerId: 2,
      pointerType: 'touch',
    })
    await pageFooter.dispatchEvent('pointerup', {
      clientY: 560,
      pointerId: 2,
      pointerType: 'touch',
    })
    await expect(homePage).not.toHaveClass(/is-craft-footer-visible/)
    await page.waitForTimeout(750)
  }

  for (const id of ['flanerie', 'archive', 'about']) {
    await page.mouse.wheel(0, -720)
    await waitForActivePage(page, id)
  }
  await page.mouse.wheel(0, -720)
  await page.waitForTimeout(220)
  await expect(scrollDownHint).toHaveClass(/is-page-transitioning/)
  await expect(scrollDownHint).toHaveClass(/is-reverse/)
  expect(
    await scrollDownHint
      .locator('.scroll-down-hint__label')
      .evaluate((element) => getComputedStyle(element).animationDirection)
  ).toBe('reverse')
  const reverseHeaderState = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.home-page-slide--hero')!
    const heroContent = document.querySelector<HTMLElement>('.hero-content')!
    const sloganStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.main-slogan')!
    )
    const recommendStyles = getComputedStyle(
      document.querySelector<HTMLElement>('.hero-content > .recommend')!
    )
    const layout = document.querySelector<HTMLElement>('.layout-page')!
    const header = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    return {
      contentTop: heroContent.getBoundingClientRect().top,
      heroTop: hero.getBoundingClientRect().top,
      layoutActive: header.classList.contains('scroll-layout-active'),
      recommendOpacity: Number.parseFloat(recommendStyles.opacity),
      recommendScale: Number.parseFloat(recommendStyles.scale),
      recommendTranslateX: Number.parseFloat(recommendStyles.translate) || 0,
      progress: Number.parseFloat(
        getComputedStyle(layout).getPropertyValue('--header-scroll-progress')
      ),
      scrolled: header.classList.contains('scrolled'),
      sloganOpacity: Number.parseFloat(sloganStyles.opacity),
      sloganScale: Number.parseFloat(sloganStyles.scale),
      sloganTranslateX: Number.parseFloat(sloganStyles.translate) || 0,
      viewportHeight: window.innerHeight,
    }
  })
  expect(reverseHeaderState.contentTop).toBeCloseTo(
    initialHeroMotion.contentTop,
    0
  )
  expect(reverseHeaderState.sloganOpacity).toBeGreaterThan(0)
  expect(reverseHeaderState.sloganOpacity).toBeLessThan(1)
  expect(reverseHeaderState.recommendOpacity).toBeGreaterThan(0)
  expect(reverseHeaderState.recommendOpacity).toBeLessThan(1)
  expect(reverseHeaderState.sloganTranslateX).toBeLessThan(0)
  expect(reverseHeaderState.recommendTranslateX).toBeGreaterThan(0)
  expect(reverseHeaderState.sloganScale).toBeGreaterThan(1)
  expect(reverseHeaderState.recommendScale).toBeGreaterThan(1)
  expect(reverseHeaderState.layoutActive).toBe(false)
  expect(reverseHeaderState.scrolled).toBe(false)
  expect(reverseHeaderState.progress).toBeCloseTo(0, 2)
  await expect(slides.first()).toHaveClass(/swiper-slide-active/)
  await expect(page.locator('.el-menu-layout-all')).not.toHaveClass(/scrolled/)
  await expect(page.locator('.marquee-wrapper')).not.toHaveClass(/is-flat/)
  await expect
    .poll(() =>
      slides.first().evaluate((element) => element.getBoundingClientRect().top)
    )
    .toBeCloseTo(0, 0)
  await expect
    .poll(() =>
      page
        .locator('.main-slogan')
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity)
        )
    )
    .toBeGreaterThanOrEqual(0.99)
  await expect
    .poll(() =>
      page
        .locator('.hero-content > .recommend')
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity)
        )
    )
    .toBeGreaterThanOrEqual(0.99)
  await expect
    .poll(() =>
      scrollDownHint.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeGreaterThanOrEqual(0.99)
  await scrollDownHint.hover()
  await expect(scrollDownHint.locator('.scroll-down-hint__label')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await scrollDownHint.click()
  await waitForActivePage(page, 'about')
})

test('hero news wheel uses only the center third without hijacking page scroll', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const recommend = page.locator('.hero-content > .recommend')
  const newsViewport = page.locator('.cards-viewport')
  await expect(recommend).toHaveCSS('opacity', '1', {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const bounds = await recommend.boundingBox()
  expect(bounds).not.toBeNull()
  if (!bounds) return

  const readNewsIndex = () =>
    newsViewport.evaluate(
      (element) =>
        (
          element as HTMLElement & {
            swiper?: { animating: boolean; realIndex: number }
          }
        ).swiper?.realIndex ?? -1
    )

  const initialNewsIndex = await readNewsIndex()
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  )
  await page.mouse.wheel(0, 240)
  await expect.poll(readNewsIndex).not.toBe(initialNewsIndex)
  const centerNewsIndex = await readNewsIndex()
  await expect(page.locator('.home-page-slide--hero')).toHaveClass(
    /swiper-slide-active/
  )

  await expect
    .poll(() =>
      newsViewport.evaluate((element) =>
        Boolean(
          (
            element as HTMLElement & {
              swiper?: { animating: boolean }
            }
          ).swiper?.animating
        )
      )
    )
    .toBe(false)

  await page.mouse.move(
    bounds.x + bounds.width / 6,
    bounds.y + bounds.height / 2
  )
  await page.mouse.wheel(0, 720)
  await waitForActivePage(page, 'about')
  expect(await readNewsIndex()).toBe(centerNewsIndex)

  await page.mouse.move(
    bounds.x + (bounds.width * 5) / 6,
    bounds.y + bounds.height / 2
  )
  await page.mouse.wheel(0, -720)
  await expect(page.locator('.home-page-slide--hero')).toHaveClass(
    /swiper-slide-active/
  )
  await expect
    .poll(() =>
      page
        .locator('.home-page-slide--hero')
        .evaluate((element) => element.getBoundingClientRect().top)
    )
    .toBeCloseTo(0, 0)
  expect(await readNewsIndex()).toBe(centerNewsIndex)

  await page.mouse.move(
    bounds.x + (bounds.width * 5) / 6,
    bounds.y + bounds.height / 2
  )
  await page.mouse.wheel(0, 720)
  await waitForActivePage(page, 'about')
  expect(await readNewsIndex()).toBe(centerNewsIndex)
})

test('page progress component follows ordinary document scrolling', async ({
  page,
}) => {
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const progress = page.locator('.page-scroll-progress')
  await expect(progress).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          ) - window.innerHeight
      )
    )
    .toBeGreaterThan(1)

  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          document.body.scrollTo({ top: document.body.scrollHeight })
        )
        return progress.evaluate((element) =>
          Number.parseFloat(
            getComputedStyle(element).getPropertyValue('--page-scroll-progress')
          )
        )
      },
      { timeout: 20_000 }
    )
    .toBeGreaterThanOrEqual(99)

  const geometry = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const progress = document.querySelector<HTMLElement>(
      '.page-scroll-progress'
    )!
    const rootStyle = getComputedStyle(document.documentElement)
    const frameBlockSize = Number.parseFloat(rootStyle.paddingTop) || 0
    const frameInlineSize = Number.parseFloat(rootStyle.paddingRight) || 0
    const menuBounds = menu.getBoundingClientRect()
    const progressBounds = progress.getBoundingClientRect()

    return {
      menuLeftDelta: Math.abs(menuBounds.left - frameInlineSize),
      menuRightDelta: Math.abs(
        menuBounds.right - (window.innerWidth - frameInlineSize)
      ),
      progressTopDelta: Math.abs(progressBounds.top - menuBounds.bottom),
      progressRightDelta: Math.abs(
        progressBounds.right - (window.innerWidth - frameInlineSize)
      ),
      progressBottomDelta: Math.abs(
        progressBounds.bottom - (window.innerHeight - frameBlockSize)
      ),
    }
  })

  for (const delta of Object.values(geometry)) {
    expect(delta).toBeLessThanOrEqual(1)
  }
})
