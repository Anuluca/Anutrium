import { expect, type Page, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

const waitForActivePage = async (page: Page, id: string) => {
  const slide = page.locator(`#home-section-${id}`).locator('..')
  await expect(slide).toHaveClass(/swiper-slide-active/, {
    timeout: 3_000,
  })
  await expect
    .poll(() =>
      slide.evaluate((element) => element.getBoundingClientRect().top)
    )
    .toBeCloseTo(0, 0)
  return slide
}

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
    expect(side.fontFamily).toContain('anton')
    expect(side.fontSize).toBeGreaterThanOrEqual(17)
    expect(side.indicatorTransform).not.toBe('none')
    expect(side.inactiveColor).toBe('rgba(255, 255, 255, 0.3)')
    expect(side.itemHeight).toBeCloseTo(side.fontSize, 1)
    expect(side.lineHeight).toBeCloseTo(side.fontSize, 1)
    expect(side.markerColor).toBe('rgb(226, 52, 86)')
    expect(side.markerCenterOffset).toBeGreaterThan(0)
    expect(side.markerCenterOffset).toBeLessThan(3)
    expect(side.markerHeight).toBeCloseTo(side.markerWidth, 1)
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
    'rgba(72, 187, 120, 0.1)',
    'rgba(237, 137, 54, 0.1)',
    'rgba(66, 153, 225, 0.1)',
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
  expect(initialGeometry.pageProgressBackground).toBe('rgb(0, 0, 0)')
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
  await expect(page.locator('.home-about-gallery')).toHaveCount(1)
  await page.waitForTimeout(80)
  const hintExitOpacity = await scrollDownHint.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity)
  )
  expect(hintExitOpacity).toBeGreaterThan(0)
  expect(hintExitOpacity).toBeLessThan(1)
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
  expect(heroLeadState.sloganOpacity).toBeGreaterThan(0)
  expect(heroLeadState.sloganOpacity).toBeLessThan(1)
  expect(heroLeadState.recommendOpacity).toBeGreaterThan(0)
  expect(heroLeadState.recommendOpacity).toBeLessThan(1)
  expect(heroLeadState.sloganTranslateX).toBeLessThan(0)
  expect(heroLeadState.recommendTranslateX).toBeGreaterThan(0)

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const about = document.querySelector<HTMLElement>(
            '.home-page-content--about'
          )
          const aboutCopy = document.querySelector<HTMLElement>(
            '.home-placeholder-slide--about .home-about-copy'
          )
          if (!about || !aboutCopy) return false
          const aboutOpacity = Number.parseFloat(
            getComputedStyle(about).opacity
          )
          const sloganOpacity = Number.parseFloat(
            getComputedStyle(
              document.querySelector<HTMLElement>('.main-slogan')!
            ).opacity
          )
          const recommendOpacity = Number.parseFloat(
            getComputedStyle(
              document.querySelector<HTMLElement>('.hero-content > .recommend')!
            ).opacity
          )
          const heroBounds = document
            .querySelector<HTMLElement>('.hero-content')!
            .getBoundingClientRect()
          const aboutBounds = aboutCopy.getBoundingClientRect()
          return (
            sloganOpacity > 0 &&
            sloganOpacity < 1 &&
            recommendOpacity > 0 &&
            recommendOpacity < 1 &&
            aboutOpacity > 0 &&
            aboutOpacity < 1 &&
            heroBounds.bottom > 0 &&
            aboutBounds.top < window.innerHeight
          )
        }),
      { intervals: [16], timeout: 2_000 }
    )
    .toBe(true)
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
    const aboutTitle = document.querySelector<HTMLElement>('.home-about-title')!
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
      aboutTitleAnimationName: getComputedStyle(aboutTitle).animationName,
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
        getComputedStyle(header, '::before').opacity
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
  expect(transitionState.aboutTitleAnimationName).toBe('none')
  expect(transitionState.aboutTextAnimationName).toContain('homeAboutTextEnter')
  expect(transitionState.aboutTextAnimationDuration).toBe('0.7s')
  expect(transitionState.aboutTextAnimationDelay).toBe('0.42s')
  expect(transitionState.aboutGalleryAnimationName).toContain(
    'homeAboutGalleryEnter'
  )
  expect(transitionState.aboutGalleryAnimationDelay).toBe('0.42s')
  expect(transitionState.aboutGalleryAnimationDuration).toBe('0.65s')
  expect(transitionState.heroOpacity).toBe(1)
  expect(transitionState.heroTransform).toBe('none')
  expect(transitionState.sloganOpacity).toBeGreaterThan(0)
  expect(transitionState.sloganOpacity).toBeLessThan(1)
  expect(transitionState.recommendOpacity).toBeGreaterThan(0)
  expect(transitionState.recommendOpacity).toBeLessThan(1)
  expect(transitionState.sloganTranslate.x).toBeLessThan(0)
  expect(transitionState.sloganTranslate.y).toBe(0)
  expect(transitionState.recommendTranslate.x).toBeGreaterThan(0)
  expect(transitionState.recommendTranslate.y).toBe(0)
  expect(transitionState.sloganScale).toBeGreaterThan(1)
  expect(transitionState.recommendScale).toBeGreaterThan(1)
  expect(transitionState.sloganTransitionDuration).toContain('1.2s')
  expect(transitionState.recommendTransitionDuration).toContain('1.2s')
  expect(transitionState.enteringPage).toContain(
    'home-placeholder-slide--about'
  )
  expect(transitionState.leavingPage).toContain('home-page-slide--hero')
  expect(transitionState.headerLayoutActive).toBe(true)
  expect(transitionState.headerScrolled).toBe(false)
  expect(transitionState.headerProgress).toBeGreaterThan(0)
  expect(transitionState.headerProgress).toBeLessThan(1)
  expect(transitionState.headerBackgroundOpacity).toBeCloseTo(
    transitionState.headerProgress,
    2
  )
  expect(transitionState.headerProgress).toBeCloseTo(
    Math.abs(transitionState.heroSlideTop) / transitionState.viewportHeight,
    2
  )
  expect(transitionState.marqueeTransitionDuration).toBe('0.36s')
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
  const aboutTitle = page.locator('.home-about-title')
  const aboutIntro = page.locator('.home-about-intro')
  const aboutDescription = page.locator('.home-about-description')
  const aboutHighlight = page.locator('.home-about-highlight')
  await expect(aboutTitle).toHaveText('ABOUT ME')
  await expect(aboutTitle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(aboutTitle).toHaveCSS('color', 'rgb(226, 52, 86)')
  await expect(aboutTitle).toHaveCSS('position', 'absolute')
  const aboutTitleOffset = await aboutTitle.evaluate((title) => {
    const copy = title.closest<HTMLElement>('.home-about-copy')!
    return title.getBoundingClientRect().top - copy.getBoundingClientRect().top
  })
  expect(aboutTitleOffset).toBeGreaterThan(0)
  expect(aboutTitleOffset).toBeLessThan(32)
  await expect(page.locator('.home-section-title')).toHaveCount(1)
  await expect(page.locator('.home-about-copy')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  expect(
    (
      await aboutTitle.evaluate((el) => getComputedStyle(el).fontFamily)
    ).toLowerCase()
  ).toContain('anton')
  await expect(aboutIntro).toHaveText('你好，我是路卡。')
  await expect(aboutIntro).toHaveCSS('background-color', 'rgb(0, 0, 0)')
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
  await expect(aboutHighlight).toContainText('《宝可梦 黑／白》')
  await expect(aboutHighlight).toHaveCSS('font-style', 'italic')
  await expect(aboutHighlight).toHaveCSS('font-weight', '400')
  await expect(aboutHighlight).toHaveCSS('opacity', '0.35')
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

  await page.mouse.wheel(0, 720)
  for (let index = 0; index < 7; index += 1) {
    await page.waitForTimeout(90)
    await page.mouse.wheel(0, 40)
  }
  const craftSlide = await waitForActivePage(page, 'craft')
  await expect(craftSlide).toHaveCSS('opacity', '1')
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
  expect(reverseHeaderState.layoutActive).toBe(true)
  expect(reverseHeaderState.scrolled).toBe(false)
  expect(reverseHeaderState.progress).toBeGreaterThan(0)
  expect(reverseHeaderState.progress).toBeLessThan(1)
  expect(reverseHeaderState.progress).toBeCloseTo(
    Math.abs(reverseHeaderState.heroTop) / reverseHeaderState.viewportHeight,
    2
  )
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

  await page.mouse.wheel(0, 100_000)
  await expect
    .poll(() =>
      progress.evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue('--page-scroll-progress')
        )
      )
    )
    .toBeGreaterThanOrEqual(99)

  const geometry = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')!
    const progress = document.querySelector<HTMLElement>(
      '.page-scroll-progress'
    )!
    const progressBounds = progress.getBoundingClientRect()

    return {
      bottomDelta: Math.abs(progressBounds.bottom - window.innerHeight),
      topDelta: Math.abs(
        progressBounds.top - menu.getBoundingClientRect().bottom
      ),
    }
  })

  expect(geometry.topDelta).toBeLessThanOrEqual(1)
  expect(geometry.bottomDelta).toBeLessThanOrEqual(1)
})
