import { expect, type Page, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000
const ISLAND_EXIT_MAX_GEOMETRY_SHIFT = 1

interface IslandExitGeometrySample {
  bodyClass: string
  pageLeft: number
  pageTop: number
  routerLeft: number
  routerTop: number
}

interface IslandExitGeometryProbe {
  done: boolean
  initial: IslandExitGeometrySample
  samples: IslandExitGeometrySample[]
}

const readHeroExitMotion = (page: Page) =>
  page.locator('.hero-content').evaluate((heroContent) => {
    const readMotion = (selector: string) => {
      const element = heroContent.querySelector<HTMLElement>(selector)!
      return {
        x: Number.parseFloat(element.style.getPropertyValue('--hero-exit-x')),
        scale: Number.parseFloat(
          element.style.getPropertyValue('--hero-exit-scale')
        ),
        opacity: Number.parseFloat(
          element.style.getPropertyValue('--hero-exit-opacity')
        ),
      }
    }

    return {
      slogan: readMotion('.main-slogan'),
      carousel: readMotion('.recommend'),
    }
  })

const pageRoutes = [
  { path: '/', selector: '.home-page', title: /HOME|Anutrium/ },
  { path: '/archive', selector: '.archives-page', title: /ARCHIVE|作品集/ },
  { path: '/flanerie', selector: '.flanerie-page', title: /FLÂNERIE|旅程/ },
  { path: '/craft', selector: '.craft-page', title: /CRAFT|工具/ },
  { path: '/about', selector: '.about-page', title: /ABOUT|关于/ },
  {
    path: '/test',
    selector: '.island-page, .island-mobile-page',
    title: /ISLAND|个人海湾/,
  },
  {
    path: '/island/photography',
    selector: '.photography-page',
    title: /PHOTOGRAPHY|摄影作品/,
  },
  {
    path: '/island/merch-photography',
    selector: '.merch-page',
    title: /MERCH PHOTOGRAPHY|周边摄影/,
  },
  {
    path: '/island/illustration',
    selector: '.works-gallery-page',
    title: /ILLUSTRATION|绘画/,
  },
  {
    path: '/island/trainer-card',
    selector: '.works-gallery-page',
    title: /TRAINER CARD|训练家卡/,
  },
  {
    path: '/island/study-notes',
    selector: '.study-notes-page',
    title: /STUDY NOTES|学习笔记/,
  },
]

test.describe('top-level pages', () => {
  for (const route of pageRoutes) {
    test(`${route.path} renders page content`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector).first()).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})

test('home entry animation does not remount hydrated content', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const homePage = page.locator('.home-page')
  await expect(homePage).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  await homePage.evaluate((element) => {
    element.setAttribute('data-mount-probe', 'stable')
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(homePage).toHaveAttribute('data-mount-probe', 'stable')
})

test('desktop custom cursor is ready during entry and hides outside viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const cursor = page.locator('.cursor-position')
  await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.layout-page')).toHaveCSS('cursor', /dot\.svg/)

  await page.mouse.move(240, 180)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).toHaveClass(/\bcustom-cursor-enabled\b/)

  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }))
  })
  await expect(cursor).toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).not.toHaveClass(
    /\bcustom-cursor-enabled\b/
  )

  await page.mouse.move(280, 220)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).toHaveClass(/\bcustom-cursor-enabled\b/)
})

test('desktop navigation rolls text without moving route logos', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const archiveMenuItem = page.locator('.el-menu-item.ARCHIVE')
  await expect(archiveMenuItem).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(archiveMenuItem.locator('.menu-route-icon')).toHaveCount(0)

  const initial = await archiveMenuItem
    .locator('.main-title')
    .evaluate((roll) => {
      const characters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--current'),
      ]

      return {
        label: roll.getAttribute('aria-label'),
        characterCount: characters.length,
        delays: characters.map((character) =>
          Number.parseFloat(getComputedStyle(character).transitionDelay)
        ),
      }
    })

  expect(initial.label).toBe('ARCHIVE')
  expect(initial.characterCount).toBe(7)
  expect(initial.delays[3]).toBeLessThan(initial.delays[0])
  expect(initial.delays[3]).toBeLessThan(initial.delays[6])

  await archiveMenuItem.hover()
  await page.waitForTimeout(650)

  const hovered = await archiveMenuItem
    .locator('.main-title')
    .evaluate((roll) => {
      const bounds = roll.getBoundingClientRect()
      const currentCharacters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--current'),
      ]
      const incomingCharacters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--incoming'),
      ]

      return {
        currentMovedOut: currentCharacters.every(
          (character) => character.getBoundingClientRect().bottom < bounds.top
        ),
        filter: getComputedStyle(roll).filter,
        incomingAligned: incomingCharacters.every(
          (character) =>
            Math.abs(character.getBoundingClientRect().top - bounds.top) < 1
        ),
      }
    })

  expect(hovered.currentMovedOut).toBeTruthy()
  expect(hovered.filter).toContain('drop-shadow')
  expect(hovered.incomingAligned).toBeTruthy()
})

test('desktop footer social links roll text without glow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const socialLink = page.locator(
    '.footer-com .text-links .social-link--twitter'
  )
  const roll = socialLink.locator('.text-roll')
  await expect(roll).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(roll).toHaveAttribute('aria-label', 'X / TWITTER')

  await socialLink.hover()
  await page.waitForTimeout(550)

  const hovered = await roll.evaluate((element) => {
    const currentCharacters = [
      ...element.querySelectorAll<HTMLElement>('.text-roll__char--current'),
    ]
    const incomingCharacters = [
      ...element.querySelectorAll<HTMLElement>('.text-roll__char--incoming'),
    ]
    const getTranslateY = (character: HTMLElement) =>
      new DOMMatrixReadOnly(getComputedStyle(character).transform).m42
    const style = getComputedStyle(element)

    return {
      currentMovedOut: currentCharacters.every(
        (character) => getTranslateY(character) < 0
      ),
      filter: style.filter,
      incomingAligned: incomingCharacters.every(
        (character) => Math.abs(getTranslateY(character)) < 0.1
      ),
      textShadow: style.textShadow,
    }
  })

  expect(hovered.currentMovedOut).toBeTruthy()
  expect(hovered.filter).toBe('none')
  expect(hovered.incomingAligned).toBeTruthy()
  expect(hovered.textShadow).toBe('none')
})

test('archive and craft use their exchanged representative zodiac signs', async ({
  page,
}) => {
  const routeSigns = [
    { path: '/archive', sign: 'AQUARIUS' },
    { path: '/craft', sign: 'GEMINI' },
  ]

  for (const routeSign of routeSigns) {
    await page.goto(routeSign.path, { waitUntil: 'domcontentloaded' })
    await expect(
      page.locator('.zodiac-sign-face.is-active .zodiac-name')
    ).toHaveText(routeSign.sign, { timeout: PAGE_LOAD_TIMEOUT })
  }
})

test('archive section headings show their dynamic project totals', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const sectionCounts = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.archives-page .home-section-layout'
      )
    ).map((section) => {
      const count = section.querySelector<HTMLElement>(
        '.archive-section-count strong'
      )

      return {
        displayed: Number(count?.textContent),
        actual: section.querySelectorAll('.shared-work-card, .misc-card')
          .length,
        fontFamily: count ? window.getComputedStyle(count).fontFamily : '',
      }
    })
  )

  expect(sectionCounts).toHaveLength(3)
  for (const sectionCount of sectionCounts) {
    expect(sectionCount.displayed).toBe(sectionCount.actual)
    expect(sectionCount.fontFamily.toLowerCase()).toContain('anton')
  }
})

/*
test('updated stamp follows the desktop nav rail and keeps its mobile header placement', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const metrics = await page.evaluate(() => {
    const stamp = document.querySelector<HTMLElement>('.header-updated')
    const header = document.querySelector<HTMLElement>('.page-header')
    const navigation = document.querySelector<HTMLElement>(
      '.sections-fixed-nav'
    )

    if (!stamp || !header) throw new Error('Updated stamp is unavailable')

    const stampBounds = stamp.getBoundingClientRect()
    const headerBounds = header.getBoundingClientRect()
    const navigationBounds = navigation?.getBoundingClientRect()
    const stampStyle = window.getComputedStyle(stamp)

    return {
      color: stampStyle.color,
      headerBottom: headerBounds.bottom,
      headerTop: headerBounds.top,
      navigationBottom: navigationBounds?.bottom ?? 0,
      opacityTarget: stampStyle.getPropertyValue('--updated-opacity').trim(),
      position: stampStyle.position,
      stampBottom: stampBounds.bottom,
      stampLeft: stampBounds.left,
      stampTop: stampBounds.top,
    }
  })

  expect(metrics.color).toBe('rgb(226, 52, 86)')

  if (testInfo.project.name.includes('mobile')) {
    expect(metrics.position).toBe('absolute')
    expect(metrics.stampTop).toBeGreaterThanOrEqual(metrics.headerTop)
    expect(metrics.stampBottom).toBeLessThanOrEqual(metrics.headerBottom)
    return
  }

  expect(metrics.position).toBe('fixed')
  expect(metrics.opacityTarget).toBe('0.16')
  expect(metrics.stampLeft).toBeLessThan(40)
  expect(metrics.stampTop).toBeGreaterThan(metrics.navigationBottom)
})
*/

test('home uses centered display headings and keeps scroll-aware navigation', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(page.locator('.home-page .home-section-layout')).toHaveCount(0)
  await expect(page.locator('.home-indexed-section')).toHaveCount(4)
  await expect(page.locator('.home-page .archive-entry')).toHaveCount(0)

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  await expect(navigationItems).toHaveCount(4)
  await navigationItems.nth(1).click()

  const worksSection = page.locator('#home-section-works')
  await expect
    .poll(() =>
      worksSection.evaluate((section) =>
        Math.abs(section.getBoundingClientRect().top)
      )
    )
    .toBeLessThan(180)
  await expect(navigationItems.nth(1)).toHaveAttribute(
    'aria-current',
    'location'
  )
  await expect(worksSection.locator('.scroll-reveal-title')).toHaveClass(
    /\bis-revealed\b/
  )

  const worksHeading = worksSection.locator('.home-section-title')
  await expect
    .poll(() =>
      worksHeading.evaluate((heading) => {
        const headingBounds = heading.getBoundingClientRect()
        const sectionBounds = heading
          .closest('section')!
          .getBoundingClientRect()

        return Math.abs(
          headingBounds.left +
            headingBounds.width / 2 -
            (sectionBounds.left + sectionBounds.width / 2)
        )
      })
    )
    .toBeLessThanOrEqual(1)

  const headingMetrics = await worksHeading.evaluate((heading) => {
    const headingBounds = heading.getBoundingClientRect()
    const headingWrapperBounds = heading.parentElement!.getBoundingClientRect()
    const englishTitleBounds = heading
      .querySelector('.home-section-title__en')!
      .getBoundingClientRect()
    const mainTitleBounds = heading
      .querySelector('.home-section-title__main')!
      .getBoundingClientRect()
    const englishTitleStyle = getComputedStyle(
      heading.querySelector('.home-section-title__en')!
    )
    const mainTitleStyle = getComputedStyle(
      heading.querySelector('.home-section-title__main')!
    )
    const headingWrapperStyle = getComputedStyle(heading.parentElement!)
    const shell = heading.closest('.home-section-shell') as HTMLElement
    const shellScale = shell.getBoundingClientRect().width / shell.offsetWidth
    const sectionBounds = heading.closest('section')!.getBoundingClientRect()
    const style = getComputedStyle(heading)

    return {
      animationName: headingWrapperStyle.animationName,
      bottomClearance:
        (headingWrapperBounds.bottom - mainTitleBounds.bottom) / shellScale,
      centerOffset: Math.abs(
        headingBounds.left +
          headingBounds.width / 2 -
          (sectionBounds.left + sectionBounds.width / 2)
      ),
      englishGap: mainTitleBounds.top - englishTitleBounds.bottom,
      englishFontFamily: englishTitleStyle.fontFamily,
      englishLetterSpacing: englishTitleStyle.letterSpacing,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      mainFontSize: Number.parseFloat(mainTitleStyle.fontSize),
      textAlign: style.textAlign,
      wrapperTransform: headingWrapperStyle.transform,
    }
  })

  expect(headingMetrics.bottomClearance).toBeGreaterThanOrEqual(8)
  expect(headingMetrics.animationName).toContain('home-section-heading-fade-in')
  expect(headingMetrics.wrapperTransform).toBe('none')
  expect(headingMetrics.centerOffset).toBeLessThanOrEqual(1)
  expect(headingMetrics.englishGap).toBeGreaterThanOrEqual(0)
  expect(headingMetrics.englishGap).toBeLessThanOrEqual(2)
  expect(headingMetrics.englishFontFamily.toLowerCase()).toContain('cn-custom')
  expect(headingMetrics.englishLetterSpacing).toBe('normal')
  expect(headingMetrics.fontSize).toBeGreaterThanOrEqual(21)
  expect(headingMetrics.fontSize).toBeLessThan(56)
  expect(headingMetrics.lineHeight).toBeGreaterThanOrEqual(
    headingMetrics.fontSize * 0.95
  )
  expect(headingMetrics.lineHeight).toBeLessThanOrEqual(headingMetrics.fontSize)
  expect(headingMetrics.mainFontSize).toBeLessThan(
    headingMetrics.fontSize * 0.9
  )
  expect(headingMetrics.textAlign).toBe('center')
})

test('about content uses the full-width feathered hover field without a glass plate', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const aboutSection = page.locator('#home-section-about')
  const aboutContent = aboutSection.locator('.manifesto-content')
  const hoverPattern = aboutContent.locator('.manifesto-hover-pattern')

  await page
    .locator('.home-sections-nav .sections-fixed-nav__item')
    .first()
    .click()
  await expect(aboutContent).toBeVisible()
  await expect(aboutSection.locator('.manifesto-visual')).toHaveCount(0)
  await expect(aboutSection.locator('.background-squares')).toHaveCount(0)

  const styles = await aboutContent.evaluate((element) => {
    const contentStyle = getComputedStyle(element)
    const copyStyle = getComputedStyle(
      element.querySelector('.manifesto-copy')!
    )
    const hoverPatternStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern')!
    )
    const edgeFeatherStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__edge-feather')!
    )
    const spotlightStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__spotlight')!
    )
    const gradientStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__gradient')!
    )
    const cipherStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__cipher')!
    )
    const highlightStyle = getComputedStyle(
      element.querySelector('.highlight')!
    )
    const descriptionStyle = getComputedStyle(element.querySelector('.desc')!)
    const linkStyle = getComputedStyle(
      element.querySelector('.manifesto-link')!
    )

    return {
      backdropFilter: gradientStyle.backdropFilter,
      backgroundImage: contentStyle.backgroundImage,
      borderTopWidth: contentStyle.borderTopWidth,
      boxShadow: contentStyle.boxShadow,
      cipherColor: cipherStyle.color,
      descriptionColor: descriptionStyle.color,
      edgeMaskImage: edgeFeatherStyle.maskImage,
      gradientColor: gradientStyle.backgroundColor,
      highlightColor: highlightStyle.color,
      highlightStrokeWidth: Number.parseFloat(
        highlightStyle.webkitTextStrokeWidth
      ),
      linkTextShadow: linkStyle.textShadow,
      maskImage: hoverPatternStyle.maskImage,
      spotlightMaskImage: spotlightStyle.maskImage,
      textAlign: copyStyle.textAlign,
      textShadow: copyStyle.textShadow,
    }
  })
  expect(styles.backdropFilter).toBe('none')
  expect(styles.backgroundImage).toBe('none')
  expect(styles.borderTopWidth).toBe('0px')
  expect(styles.boxShadow).toBe('none')
  expect(styles.cipherColor).toBe('rgba(255, 255, 255, 0.28)')
  expect(styles.descriptionColor).toBe('rgba(255, 255, 255, 0.62)')
  expect(styles.gradientColor).toBe('rgba(226, 52, 86, 0.46)')
  expect(styles.highlightColor).toBe('rgba(0, 0, 0, 0)')
  expect(styles.highlightStrokeWidth).toBeGreaterThan(1)
  expect(styles.linkTextShadow).toContain('rgb(0, 0, 0)')
  expect(styles.maskImage).toContain('linear-gradient')
  expect(styles.maskImage).toContain('18%')
  expect(styles.edgeMaskImage).toContain('linear-gradient')
  expect(styles.edgeMaskImage).toContain('12%')
  expect(styles.spotlightMaskImage).toContain('radial-gradient')
  expect(styles.textAlign).toBe('center')
  expect(styles.textShadow).not.toBe('none')

  await aboutContent.hover()
  await expect
    .poll(() =>
      hoverPattern.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeGreaterThan(0.95)
  await expect
    .poll(() =>
      hoverPattern
        .locator('.manifesto-hover-pattern__cipher')
        .evaluate((element) => element.textContent?.length ?? 0)
    )
    .toBeGreaterThan(3_000)
})

test('home titles and content move as one monotonic parallax group', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  const revealItems = page.locator(
    '.home-indexed-section .scroll-reveal-title, .home-indexed-section .scroll-reveal-content'
  )
  const moduleShells = page.locator('.home-indexed-section .home-section-shell')
  const worksSection = page.locator('#home-section-works')
  const worksShell = worksSection.locator('.home-section-shell')
  const readWorksMotion = () =>
    worksShell.evaluate((element) => ({
      offset: Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue(
          '--home-reveal-parallax-y'
        )
      ),
      scale: Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue(
          '--home-reveal-parallax-scale'
        )
      ),
    }))
  const readPageScrollTop = () =>
    page.evaluate(() =>
      Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        document.documentElement.scrollTop,
        document.body.scrollTop
      )
    )

  await navigationItems.nth(1).click()
  await expect
    .poll(() =>
      worksSection.evaluate((element) =>
        Math.abs(element.getBoundingClientRect().top)
      )
    )
    .toBeLessThan(180)
  await expect(revealItems).toHaveCount(8)
  await expect(moduleShells).toHaveCount(4)
  await expect
    .poll(() =>
      moduleShells.evaluateAll((elements) =>
        elements.every((element) =>
          ['--home-reveal-parallax-y', '--home-reveal-parallax-opacity'].every(
            (property) =>
              (element as HTMLElement).style.getPropertyValue(property)
          )
        )
      )
    )
    .toBe(true)
  await expect
    .poll(() =>
      revealItems.evaluateAll((elements) =>
        elements.every((element) => {
          const target = element as HTMLElement
          return (
            !target.style.getPropertyValue('--home-reveal-parallax-y') &&
            !target.style.getPropertyValue('--home-reveal-parallax-scale')
          )
        })
      )
    )
    .toBe(true)

  await page.waitForTimeout(700)
  const initialScrollTop = await readPageScrollTop()
  const initialMotion = await readWorksMotion()

  await page.mouse.wheel(0, 320)
  await expect.poll(readPageScrollTop).toBeGreaterThan(initialScrollTop + 40)
  await expect
    .poll(() =>
      worksShell.evaluate(
        (element, initialOffset) =>
          Math.abs(
            Number.parseFloat(
              (element as HTMLElement).style.getPropertyValue(
                '--home-reveal-parallax-y'
              )
            ) - Number(initialOffset)
          ),
        initialMotion.offset
      )
    )
    .toBeGreaterThan(0.5)

  const currentMotion = await readWorksMotion()
  const offsetDelta = currentMotion.offset - initialMotion.offset
  const scaleDelta = currentMotion.scale - initialMotion.scale
  expect(offsetDelta * scaleDelta).toBeGreaterThan(0)
  expect(Math.abs(scaleDelta / offsetDelta)).toBeCloseTo(0.22 / 120, 3)

  const motionValues = await moduleShells.evaluateAll((elements) =>
    elements.map((element) => {
      const target = element as HTMLElement
      return {
        offset: Math.abs(
          Number.parseFloat(
            target.style.getPropertyValue('--home-reveal-parallax-y')
          )
        ),
        scale:
          Number.parseFloat(
            target.style.getPropertyValue('--home-reveal-parallax-scale')
          ) || 1,
        opacity: Number.parseFloat(
          target.style.getPropertyValue('--home-reveal-parallax-opacity')
        ),
      }
    })
  )
  expect(motionValues.every(({ offset }) => offset <= 120.01)).toBe(true)
  expect(
    motionValues.every(({ scale }) => scale >= 0.78 && scale <= 1.22)
  ).toBe(true)
  expect(
    motionValues.every(({ opacity }) => opacity >= 0 && opacity <= 1)
  ).toBe(true)
  expect(motionValues.some(({ opacity }) => opacity < 0.99)).toBe(true)
})

test('desktop first-screen wheel snap keeps both directions exact and unlocked', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const heroTransformOrigins = await page
    .locator('.hero-content')
    .evaluate((heroContent) => {
      const readOrigin = (selector: string, verticalRatio: number) => {
        const element = heroContent.querySelector<HTMLElement>(selector)!
        const bounds = element.getBoundingClientRect()
        const [x, y] = getComputedStyle(element)
          .transformOrigin.split(' ')
          .map(Number.parseFloat)

        return {
          x,
          y,
          expectedX: bounds.width / 2,
          expectedY: bounds.height * verticalRatio,
        }
      }

      return {
        slogan: readOrigin('.main-slogan', 0.58),
        carousel: readOrigin('.recommend', 0.5),
      }
    })
  expect(heroTransformOrigins.slogan.x).toBeCloseTo(
    heroTransformOrigins.slogan.expectedX,
    0
  )
  expect(heroTransformOrigins.slogan.y).toBeCloseTo(
    heroTransformOrigins.slogan.expectedY,
    0
  )
  expect(heroTransformOrigins.carousel.x).toBeCloseTo(
    heroTransformOrigins.carousel.expectedX,
    0
  )
  expect(heroTransformOrigins.carousel.y).toBeCloseTo(
    heroTransformOrigins.carousel.expectedY,
    0
  )

  const secondScreen = page.locator('#home-section-about')
  const secondScreenTopAtPageStart = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )

  await page.mouse.move(40, 180)
  // 自动滚动期间的残余滚轮输入不应延长锁定时间。
  await page.mouse.wheel(0, 360)
  await page.waitForTimeout(200)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(750)

  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) =>
          Math.abs(section.getBoundingClientRect().top)
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  const settledTop = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )
  expect(Math.abs(settledTop)).toBeLessThanOrEqual(1)

  const exitedHeroMotion = await readHeroExitMotion(page)
  expect(exitedHeroMotion.slogan.x).toBeLessThan(-30)
  expect(exitedHeroMotion.carousel.x).toBeGreaterThan(30)
  expect(exitedHeroMotion.slogan.scale).toBeGreaterThan(1.5)
  expect(exitedHeroMotion.carousel.scale).toBeGreaterThan(1.5)
  expect(exitedHeroMotion.slogan.opacity).toBe(0)
  expect(exitedHeroMotion.carousel.opacity).toBe(0)

  await page.mouse.wheel(0, -360)
  await expect
    .poll(
      () =>
        secondScreen.evaluate(
          (section, initialTop) =>
            Math.abs(section.getBoundingClientRect().top - Number(initialTop)),
          secondScreenTopAtPageStart
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1)
  const returnedSecondScreenTop = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )
  expect(
    Math.abs(returnedSecondScreenTop - secondScreenTopAtPageStart)
  ).toBeLessThanOrEqual(1)

  const returnedHeroMotion = await readHeroExitMotion(page)
  expect(Math.abs(returnedHeroMotion.slogan.x)).toBeLessThanOrEqual(0.01)
  expect(Math.abs(returnedHeroMotion.carousel.x)).toBeLessThanOrEqual(0.01)
  expect(returnedHeroMotion.slogan.scale).toBe(1)
  expect(returnedHeroMotion.carousel.scale).toBe(1)
  expect(returnedHeroMotion.slogan.opacity).toBe(1)
  expect(returnedHeroMotion.carousel.opacity).toBe(1)

  await page.waitForTimeout(950)
  await page.mouse.wheel(0, 360)
  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) =>
          Math.abs(section.getBoundingClientRect().top)
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  await page.waitForTimeout(950)
  await page.mouse.wheel(0, 700)
  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) => section.getBoundingClientRect().top),
      { timeout: 3_000 }
    )
    .toBeLessThan(-80)
})

test('home reveal items fade out and replay whenever they re-enter the viewport', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  const worksSection = page.locator('#home-section-works')
  const worksHeading = worksSection.locator('.scroll-reveal-title')
  const worksContent = worksSection.locator('.scroll-reveal-content')
  const revealItems = page.locator(
    '.home-indexed-section .scroll-reveal-title, .home-indexed-section .scroll-reveal-content'
  )
  const readWorksHeadingEntryStartTime = () =>
    worksHeading.evaluate((element) => {
      const animation = element
        .getAnimations()
        .find(({ animationName }) =>
          animationName.includes('home-section-heading-fade-in')
        )
      return animation?.startTime ?? -1
    })

  await expect(revealItems).toHaveCount(8)
  await navigationItems.nth(1).click()
  await expect
    .poll(() =>
      worksHeading.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0
      })
    )
    .toBe(true)
  await expect(worksHeading).toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).toHaveClass(/\bis-revealed\b/)

  await expect.poll(readWorksHeadingEntryStartTime).toBeGreaterThanOrEqual(0)
  const firstEntryStartTime = await readWorksHeadingEntryStartTime()

  await page.waitForTimeout(950)
  await page.mouse.move(40, 180)
  await page.mouse.wheel(0, -5000)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeLessThanOrEqual(1)
  await expect(worksHeading).not.toHaveClass(/\bis-revealed\b/)
  await expect(worksHeading).toHaveClass(/\bis-reveal-exiting\b/)
  await expect(worksContent).not.toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).toHaveClass(/\bis-reveal-exiting\b/)
  await expect
    .poll(() =>
      worksHeading.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeLessThanOrEqual(0.01)

  await navigationItems.nth(1).click()
  await expect(worksHeading).toHaveClass(/\bis-revealed\b/)
  await expect(worksHeading).not.toHaveClass(/\bis-reveal-exiting\b/)
  await expect(worksContent).toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).not.toHaveClass(/\bis-reveal-exiting\b/)
  await expect
    .poll(readWorksHeadingEntryStartTime)
    .toBeGreaterThan(firstEntryStartTime)
})

test('home defers secondary journey images until interaction', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const firstJourneyCard = page
    .locator('.journey-grid .shared-vlog-card')
    .first()

  await expect(firstJourneyCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(firstJourneyCard.locator('.vlog-img--hover')).toHaveCount(0)
  await firstJourneyCard.hover()
  await expect(firstJourneyCard.locator('.vlog-img--hover')).toHaveCount(1)
})

test('home loads the work detail modal on demand', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const firstWorkCard = page.locator('.works-grid .shared-work-card').first()

  await expect(firstWorkCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.modal-wrapper-dialog')).toHaveCount(0)
  await firstWorkCard.click()
  await expect(page.locator('.modal-wrapper-dialog')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
})

test('personal bay menu entry redirects to 404', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/island"]').click()
  } else {
    await page.locator('.menu-box a[href="/island"]').click()
  }

  await expect(page).toHaveURL(/\/404$/)
  await expect(page.locator('.not-found-page')).toBeVisible()
})

test('hidden footer debug entry opens the personal bay test route', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const testEntry = page.getByRole('button', { name: '打开开发测试页' })
  await expect(testEntry).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await testEntry.click()

  await expect(page).toHaveURL(/\/test$/)
  await expect(
    page.locator('.island-page, .island-mobile-page').first()
  ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
})

test('mobile personal bay works use a taller two-by-two grid', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  const worksGrid = page.locator('.mobile-port--works .mobile-card-row')
  await expect(worksGrid).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  const gridTracks = await worksGrid.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      rows: style.gridTemplateRows.split(' ').length,
    }
  })

  expect(gridTracks).toEqual({ columns: 2, rows: 2 })

  const moduleHeights = await page.evaluate(() => ({
    works:
      document.querySelector('.mobile-port--works')?.getBoundingClientRect()
        .height ?? 0,
    notes:
      document.querySelector('.mobile-port--notes')?.getBoundingClientRect()
        .height ?? 0,
  }))

  expect(moduleHeights.works - moduleHeights.notes).toBeGreaterThanOrEqual(12)
})

test('cards and harbor panels use the changelog flip entrance', async ({
  page,
}, testInfo) => {
  await page.goto('/craft', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const craftAnimations = await page.evaluate(() => {
    const getAnimationName = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element)
        .animationName

    return {
      filter: getAnimationName('.craft-filter'),
      card: getAnimationName('.shared-tool-card'),
      image: getAnimationName('.shared-tool-card .tl-card__img-wrap'),
      index: getAnimationName('.shared-tool-card .tl-card__index'),
      imageDelay: getComputedStyle(
        document.querySelector(
          '.shared-tool-card .tl-card__img-wrap'
        ) as Element
      ).animationDelay,
      indexDelay: getComputedStyle(
        document.querySelector('.shared-tool-card .tl-card__index') as Element
      ).animationDelay,
    }
  })
  expect(craftAnimations.filter).toContain('craftFilterIn')
  expect(craftAnimations.card).toContain('toolCardIn')
  expect(craftAnimations.image).toContain('toolCardMediaRise')
  expect(craftAnimations.index).toContain('toolCardMediaRise')
  expect(craftAnimations.indexDelay).toBe(craftAnimations.imageDelay)

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  const panelSelector = testInfo.project.name.includes('mobile')
    ? '.mobile-port'
    : '.port-panel'
  await expect(page.locator(panelSelector).first()).toBeAttached({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  const panelAnimation = await page
    .locator(panelSelector)
    .first()
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(panelAnimation).toContain(
    testInfo.project.name.includes('mobile')
      ? 'mobile-port-enter'
      : 'port-enter'
  )
})

test('mobile menu locks background scrolling', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => window.scrollTo(0, 500))

  await page.locator('.mobile-menu-icon').click()
  await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  await expect(page.locator('html')).toHaveClass(/mobile-menu-scroll-locked/)
  await expect(page.locator('.router-container')).not.toHaveCSS(
    'filter',
    'none'
  )
  const lockedScrollPosition = await page.evaluate(() => window.scrollY)

  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(100)

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(lockedScrollPosition)

  await page.locator('.mobile-menu-icon').click()
  await expect(page.locator('html')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect(page.locator('.router-container')).toHaveCSS('filter', 'none')
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(lockedScrollPosition)
})

test('mobile menu stays above fixed page navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const pageNavigation = page.locator('.detail-sections-nav')
  await expect(pageNavigation).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  await page.locator('.mobile-menu-icon').click()
  await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  await expect(pageNavigation).toHaveCSS('visibility', 'hidden')

  const menuOwnsNavigationPoint = await pageNavigation.evaluate((nav) => {
    const navBounds = nav.getBoundingClientRect()
    const menuBounds = document
      .querySelector('.mobile-menu-panel')!
      .getBoundingClientRect()
    const topElement = document.elementFromPoint(
      navBounds.left + navBounds.width / 2,
      Math.min(navBounds.bottom, menuBounds.bottom) - 1
    )
    return Boolean(topElement?.closest('.mobile-menu-panel'))
  })
  expect(menuOwnsNavigationPoint).toBe(true)

  await page.locator('.mobile-menu-icon').click()
  await expect(pageNavigation).toBeVisible()
})

test('background motion resumes when navigation interrupts scrolling', async ({
  page,
}, testInfo) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect(page.locator('.star-container')).toHaveClass(
    /\bis-motion-paused\b/
  )

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/craft"]').click()
  } else {
    await page.locator('.menu-box a[href="/craft"]').click()
  }

  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.star-container')).not.toHaveClass(
    /\bis-motion-paused\b/
  )
  await expect
    .poll(() =>
      page
        .locator('.star-container')
        .evaluate((container) => [
          getComputedStyle(
            container.querySelector('.zodiac-static-art') as Element
          ).animationName,
          (container.querySelector('.star-field') as HTMLCanvasElement).dataset
            .motionState,
        ])
    )
    .toEqual(['none', 'running'])
})

test('WebGL star field stays bounded and uses one GPU point buffer', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const starField = page.locator('.star-field')
  await expect(starField).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(starField).toHaveAttribute('data-motion-state', 'running')

  const metrics = await starField.evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl')
    const rect = canvas.getBoundingClientRect()
    const container = canvas.closest('.star-container') as HTMLElement
    const starViewport = canvas.closest('.star-viewport') as HTMLElement
    const zodiacStage = container.querySelector('.zodiac-stage') as HTMLElement
    const triangleStage = container.querySelector(
      '.zodiac-triangle-stage'
    ) as HTMLElement
    const haloStyle = getComputedStyle(container, '::before')
    const containerStyle = getComputedStyle(container)

    return {
      background: containerStyle.backgroundImage,
      contextAvailable: !!gl,
      renderer: canvas.dataset.renderer,
      starCount: Number(canvas.dataset.starCount),
      targetFps: Number(canvas.dataset.targetFps),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      maxBackingWidth: Math.ceil(rect.width * 1.5),
      maxBackingHeight: Math.ceil(rect.height * 1.5),
      starLayer: Number(getComputedStyle(starViewport).zIndex),
      zodiacLayer: Number(getComputedStyle(zodiacStage).zIndex),
      triangleLayer: Number(getComputedStyle(triangleStage).zIndex),
      haloBackground: haloStyle.backgroundImage,
      haloAnimation: haloStyle.animationName,
      haloFilter: haloStyle.filter,
    }
  })

  expect(metrics.contextAvailable).toBe(true)
  expect(metrics.renderer).toBe('webgl')
  expect(metrics.starCount).toBe(120)
  expect(metrics.targetFps).toBeLessThanOrEqual(30)
  expect(metrics.backingWidth).toBeLessThanOrEqual(metrics.maxBackingWidth)
  expect(metrics.backingHeight).toBeLessThanOrEqual(metrics.maxBackingHeight)
  expect(metrics.starLayer).toBeGreaterThan(metrics.zodiacLayer)
  expect(metrics.starLayer).toBeGreaterThan(metrics.triangleLayer)
  expect(metrics.background).toContain('radial-gradient')
  expect(metrics.background).toContain('linear-gradient')
  expect(metrics.haloBackground).toContain('repeating-linear-gradient')
  expect(metrics.haloAnimation).toBe('none')
  expect(metrics.haloFilter).toBe('none')
  await expect(page.locator('.star-vector-layer')).toHaveCount(0)
})

test('leaving personal bay restores document scrolling', async ({
  page,
}, testInfo) => {
  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator('.island-page, .island-mobile-page').first()
  ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/"]').click()
  } else {
    await page.locator('.menu-box a[href="/"]').click()
  }

  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('body')).not.toHaveClass(
    /island-(?:pc|mobile)-shell/
  )
  await expect(page.locator('html')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect(page.locator('body')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY))
    .not.toBe('hidden')

  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
  await page.mouse.wheel(0, 900)
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThan(50)

  await page.evaluate(() => {
    window.scrollTo(0, 700)
    document.documentElement.scrollTop = 700
    document.body.scrollTop = 700
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThan(50)
  await expect(page.locator('.el-menu-layout-all')).toHaveClass(/\bscrolled\b/)

  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
  await page.evaluate(() => {
    window.scrollTo(0, 700)
    document.documentElement.scrollTop = 700
    document.body.scrollTop = 700
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThan(50)
})

test('personal bay keeps its geometry stable throughout route leave', async ({
  page,
}, testInfo) => {
  const isMobileProject = testInfo.project.name.includes('mobile')
  const islandSelector = isMobileProject
    ? '.island-mobile-page'
    : '.island-page'

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(islandSelector)).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  if (isMobileProject) {
    await page.locator('.mobile-menu-icon').click()
    await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  }

  await page.evaluate((selector) => {
    const probeWindow = window as typeof window & {
      __islandExitGeometryProbe?: IslandExitGeometryProbe
    }
    const readGeometry = (): IslandExitGeometrySample | null => {
      const islandPage = document.querySelector(selector)
      const routerContainer = document.querySelector('.router-container')
      if (!islandPage || !routerContainer) return null

      const pageBounds = islandPage.getBoundingClientRect()
      const routerBounds = routerContainer.getBoundingClientRect()
      return {
        bodyClass: document.body.className,
        pageLeft: pageBounds.left,
        pageTop: pageBounds.top,
        routerLeft: routerBounds.left,
        routerTop: routerBounds.top,
      }
    }

    const initial = readGeometry()
    if (!initial) throw new Error('Personal bay geometry probe is unavailable')

    const probe: IslandExitGeometryProbe = {
      done: false,
      initial,
      samples: [],
    }
    probeWindow.__islandExitGeometryProbe = probe

    let missingFrames = 0
    let sampledFrames = 0
    const sampleFrame = () => {
      const geometry = readGeometry()
      sampledFrames += 1

      if (geometry) {
        probe.samples.push(geometry)
        missingFrames = 0
      } else {
        missingFrames += 1
      }

      if (missingFrames >= 3 || sampledFrames >= 120) {
        probe.done = true
        return
      }

      window.requestAnimationFrame(sampleFrame)
    }

    sampleFrame()
  }, islandSelector)

  const destinationLink = isMobileProject
    ? page.locator('.mobile-menu-items a[href="/craft"]')
    : page.locator('.menu-box a[href="/craft"]')
  await destinationLink.click()
  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect
    .poll(() =>
      page.evaluate(() => {
        const probeWindow = window as typeof window & {
          __islandExitGeometryProbe?: IslandExitGeometryProbe
        }
        return probeWindow.__islandExitGeometryProbe?.done ?? false
      })
    )
    .toBe(true)

  const probe = await page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __islandExitGeometryProbe?: IslandExitGeometryProbe
    }
    return probeWindow.__islandExitGeometryProbe
  })
  expect(probe).toBeDefined()
  expect(probe!.samples.length).toBeGreaterThan(1)
  expect(
    probe!.samples.some((sample) =>
      sample.bodyClass.includes(
        isMobileProject
          ? 'island-mobile-shell-leaving'
          : 'island-pc-shell-leaving'
      )
    )
  ).toBe(true)

  const maxShifts = probe!.samples.reduce(
    (currentMax, sample) => ({
      pageLeft: Math.max(
        currentMax.pageLeft,
        Math.abs(sample.pageLeft - probe!.initial.pageLeft)
      ),
      pageTop: Math.max(
        currentMax.pageTop,
        Math.abs(sample.pageTop - probe!.initial.pageTop)
      ),
      routerLeft: Math.max(
        currentMax.routerLeft,
        Math.abs(sample.routerLeft - probe!.initial.routerLeft)
      ),
      routerTop: Math.max(
        currentMax.routerTop,
        Math.abs(sample.routerTop - probe!.initial.routerTop)
      ),
    }),
    { pageLeft: 0, pageTop: 0, routerLeft: 0, routerTop: 0 }
  )
  expect(maxShifts.pageLeft).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
  expect(maxShifts.pageTop).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
  expect(maxShifts.routerLeft).toBeLessThanOrEqual(
    ISLAND_EXIT_MAX_GEOMETRY_SHIFT
  )
  expect(maxShifts.routerTop).toBeLessThanOrEqual(
    ISLAND_EXIT_MAX_GEOMETRY_SHIFT
  )
})

test('flanerie detail page renders', async ({ page }) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page).toHaveTitle(/长沙|CHANGSHA|FLÂNERIE/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.not-found-page')).toHaveCount(0)
})

test('flanerie photos use sequential shutter entrances', async ({ page }) => {
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })
  const gallery = page.locator('.flr-gallery .media-gallery')
  await gallery.scrollIntoViewIfNeeded()
  await expect(gallery).toHaveClass(/\bis-entered\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const shutterAnimations = await gallery.evaluate((element) => {
    const frames = element.querySelectorAll('.media-gallery__frame')
    return [...frames].slice(0, 2).map((frame) => {
      const style = getComputedStyle(frame)
      const cornerStyle = getComputedStyle(frame, '::after')
      return {
        name: style.animationName,
        delay: Number.parseFloat(style.animationDelay),
        cornerName: cornerStyle.animationName,
        cornerBackground: cornerStyle.backgroundImage,
      }
    })
  })

  expect(shutterAnimations).toHaveLength(2)
  expect(
    shutterAnimations.every((animation) =>
      animation.name.includes('media-gallery-shutter-in')
    )
  ).toBeTruthy()
  expect(
    shutterAnimations.every(
      (animation) =>
        animation.cornerName.includes('media-gallery-corners-expand') &&
        !animation.cornerBackground.includes('transparent')
    )
  ).toBeTruthy()
  expect(shutterAnimations[1].delay).toBeGreaterThan(shutterAnimations[0].delay)
})

test('detail back navigation restores the previous scroll position', async ({
  page,
}) => {
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flanerie-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const maxScrollTop = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      ) - window.innerHeight
  )
  test.skip(maxScrollTop < 300, 'Page is not tall enough to test scrolling')

  const expectedScrollTop = Math.min(700, maxScrollTop)
  await page.evaluate((top) => {
    window.scrollTo(0, top)
    document.documentElement.scrollTop = top
    document.body.scrollTop = top
  }, expectedScrollTop)
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThanOrEqual(expectedScrollTop - 1)

  await page
    .locator('.shared-vlog-card[role="button"]')
    .first()
    .evaluate((element: HTMLElement) => element.click())
  await expect(page).toHaveURL(/\/flanerie\/[^/?#]+/)
  await page.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL(/\/flanerie$/)
  await expect
    .poll(() =>
      page.evaluate(
        (expected) =>
          Math.abs(
            Math.max(
              window.scrollY,
              document.documentElement.scrollTop,
              document.body.scrollTop
            ) - expected
          ),
        expectedScrollTop
      )
    )
    .toBeLessThanOrEqual(2)
})

test('merch photography detail page renders', async ({ page }) => {
  await page.goto('/island/merch-photography/pokemondoll', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.merch-detail-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page).toHaveTitle(/MERCH PHOTOGRAPHY|周边摄影/)
})

test('personal bay work cards match their gallery item counts', async ({
  page,
}) => {
  const workModules = [
    { title: '绘画', path: '/island/illustration' },
    { title: '训练家卡', path: '/island/trainer-card' },
  ]

  await page.goto('/test', { waitUntil: 'domcontentloaded' })

  for (const workModule of workModules) {
    const card = page
      .locator('.bay-card:visible, .mobile-bay-card:visible')
      .filter({ hasText: workModule.title })
    await expect(card).toHaveCount(1)
    const cardCount = Number(
      await card
        .locator('.card-count-number, .mobile-card-info b > span')
        .innerText()
    )

    await page.goto(workModule.path, { waitUntil: 'domcontentloaded' })
    const galleryCount = await page.locator('.media-gallery__card').count()

    expect(cardCount).toBe(galleryCount)
    await page.goto('/test', { waitUntil: 'domcontentloaded' })
  }
})

test('image log groups fall back when English labels are missing', async ({
  page,
}) => {
  await page.goto('/island/image-log/million', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.image-log-detail-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page
    .getByRole('button', { name: 'Switch to English' })
    .evaluate((button: HTMLButtonElement) => button.click())

  await expect
    .poll(() => page.locator('.detail-section-header__label').allTextContents())
    .toEqual(['老房子', '文档', '旧照片'])
})

for (const galleryRoute of [
  '/island/photography',
  '/island/merch-photography/pokemondoll',
]) {
  test(`${galleryRoute} uses the journey detail shutter entrance`, async ({
    page,
  }) => {
    await page.goto(galleryRoute, { waitUntil: 'domcontentloaded' })
    const gallery = page.locator('.media-gallery--staggered').first()
    await expect(gallery).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
    await gallery.scrollIntoViewIfNeeded()
    await expect(gallery).toHaveClass(/is-entered/, {
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const entrance = await gallery.evaluate((element) => {
      const cards = [
        ...element.querySelectorAll('.media-gallery__frame'),
      ].slice(0, 2)

      return {
        cardAnimations: cards.map(
          (card) => getComputedStyle(card).animationName
        ),
        cardDelays: cards.map((card) =>
          Number.parseFloat(getComputedStyle(card).animationDelay)
        ),
      }
    })

    expect(
      entrance.cardAnimations.every((name) =>
        name.includes('media-gallery-shutter-in')
      )
    ).toBeTruthy()
    expect(entrance.cardDelays[1]).toBeGreaterThan(entrance.cardDelays[0])
  })
}

test('work detail modal plays text and gallery entrance animations', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.locator('.shared-work-card').first().click()
  await expect(page.locator('.modal-wrapper-dialog')).toBeVisible()
  await expect(page.locator('.aside-title .typed-text')).toHaveCount(1)

  const galleryAnimation = await page
    .locator('.gallery-carousel')
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(galleryAnimation).toContain('galleryVertical3dIn')

  const confidentialAnimation = await page
    .locator('.confidential-notice')
    .evaluate((element) => getComputedStyle(element, '::after').animationName)
  expect(confidentialAnimation).toContain('confidentialMetalSheen')
})

test('about modules use sequenced entrance animations', async ({ page }) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.changelog-block')).toBeAttached({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const animation = await page.locator('.changelog-block').evaluate((block) => {
    const aboutPage = block.closest('.about-page')!
    const items = [...block.querySelectorAll('.timeline-item')]
    const headerStyle = getComputedStyle(
      block.querySelector('.section-header') as Element
    )
    const passionStyle = getComputedStyle(
      aboutPage.querySelector('.passion-back') as Element
    )
    const passionLogo = aboutPage.querySelector(
      '.passion-logo-bg'
    ) as HTMLElement
    const passionLogoStyle = getComputedStyle(passionLogo)
    const passionLogoKeyframes =
      (
        passionLogo.getAnimations()[0]?.effect as KeyframeEffect | undefined
      )?.getKeyframes() ?? []
    const neighborsBlock = aboutPage.querySelector('.neighbors-block')
    const neighborsBlockStyle = getComputedStyle(neighborsBlock as Element)
    return {
      headerName: headerStyle.animationName,
      headerDelay: Number.parseFloat(headerStyle.animationDelay),
      itemNames: items.map((item) => getComputedStyle(item).animationName),
      itemDelays: items.map((item) =>
        Number.parseFloat(getComputedStyle(item).animationDelay)
      ),
      itemDurations: items.map((item) =>
        Number.parseFloat(getComputedStyle(item).animationDuration)
      ),
      passionName: passionStyle.animationName,
      passionDelay: Number.parseFloat(passionStyle.animationDelay),
      passionDuration: Number.parseFloat(passionStyle.animationDuration),
      passionLogoName: passionLogoStyle.animationName,
      passionLogoDelay: Number.parseFloat(passionLogoStyle.animationDelay),
      passionLogoDuration: Number.parseFloat(
        passionLogoStyle.animationDuration
      ),
      passionLogoKeyframeCount: passionLogoKeyframes.length,
      neighborsBlockName: neighborsBlockStyle.animationName,
      neighborsBlockDelay: Number.parseFloat(
        neighborsBlockStyle.animationDelay
      ),
    }
  })

  expect(animation.headerName).toContain('changelogHeaderIn')
  expect(animation.passionName).toContain('passionCrtOn')
  expect(animation.passionLogoName).toContain('passionLogoDropIn')
  expect(animation.passionDelay).toBeGreaterThan(animation.headerDelay)
  expect(animation.passionDelay - animation.headerDelay).toBeLessThanOrEqual(
    0.2
  )
  expect(animation.passionLogoDelay).toBeGreaterThanOrEqual(
    animation.passionDelay + animation.passionDuration
  )
  expect(animation.passionLogoDuration).toBeGreaterThan(1.7)
  expect(animation.passionLogoKeyframeCount).toBe(2)
  expect(animation.neighborsBlockName).toContain('neighborsBlockIn')
  expect(animation.neighborsBlockDelay).toBeGreaterThanOrEqual(
    animation.passionDelay + animation.passionDuration
  )
  expect(
    animation.itemNames.every((name) => name.includes('changelogItemIn'))
  ).toBeTruthy()
  expect(animation.itemDelays[0] - animation.headerDelay).toBeLessThanOrEqual(
    0.16
  )
  expect(animation.itemDelays[1]).toBeGreaterThan(animation.itemDelays[0])

  await expect
    .poll(() =>
      page.locator('.passion-logo-bg canvas').evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement
        const bounds = element.getBoundingClientRect()
        return Math.min(
          element.width,
          element.height,
          bounds.width,
          bounds.height
        )
      })
    )
    .toBeGreaterThan(0)
})

test('about page uses a full-height hero above an aligned 2:1 updates grid', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-updates-grid')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(2400)

  const metrics = await page.locator('.about-updates-grid').evaluate((grid) => {
    const aboutPage = grid.closest('.about-page')!
    const bounds = grid.getBoundingClientRect()
    const heroBounds = aboutPage
      .querySelector('.about-hero-section')!
      .getBoundingClientRect()
    const passionSection = aboutPage.querySelector('.passion-section')!
    const passionBounds = passionSection.getBoundingClientRect()
    const passionBack = passionSection.querySelector('.passion-back')!
    const passionCrosshair = passionSection.querySelector('.passion-crosshair')!
    const passionContent = passionSection.querySelector('.passion-content')!
    const passionContentBounds = passionContent.getBoundingClientRect()
    const passionLogo = passionSection.querySelector(
      '.passion-logo-bg'
    ) as HTMLElement
    const passionLogoBounds = passionLogo.getBoundingClientRect()
    const firstScreenHint = aboutPage.querySelector('.about-scroll-indicator')!
    const firstScreenHintBounds = firstScreenHint.getBoundingClientRect()
    const secondScreenHint = grid.querySelector('.about-back-first-screen')!
    const secondScreenHintBounds = secondScreenHint.getBoundingClientRect()
    const secondScreenLine = secondScreenHint.querySelector(
      '.about-scroll-line--up'
    )!
    const passionCodeFontSize = Number.parseFloat(
      getComputedStyle(passionSection.querySelector('.passion-color-code')!)
        .fontSize
    )
    const changelog = grid.querySelector('.changelog-block')!
    const changelogBounds = changelog.getBoundingClientRect()
    const changelogHeaderBounds = changelog
      .querySelector('.section-header')!
      .getBoundingClientRect()
    const changelogEnglishSize = Number.parseFloat(
      getComputedStyle(changelog.querySelector('.section-title .changelog')!)
        .fontSize
    )
    const roadmap = grid.querySelector('.roadmap-block')!
    const roadmapBounds = roadmap.getBoundingClientRect()
    const roadmapHeaderBounds = roadmap
      .querySelector('.section-header')!
      .getBoundingClientRect()
    const roadmapEnglishSize = Number.parseFloat(
      getComputedStyle(roadmap.querySelector('.section-title .changelog')!)
        .fontSize
    )
    const roadmapTagLefts = [...roadmap.querySelectorAll('.roadmap-tag')].map(
      (tag) => tag.getBoundingClientRect().left
    )
    const passionBackMask = getComputedStyle(passionBack).maskImage
    const passionCrosshairMask = getComputedStyle(passionCrosshair).maskImage
    const passionLogoMask = getComputedStyle(passionLogo).maskImage

    return {
      changelogEnglishSize,
      changelogHeaderHeight: changelogHeaderBounds.height,
      changelogHeaderTop: changelogHeaderBounds.top,
      changelogTop: changelogBounds.top,
      columnsRatio: changelogBounds.width / roadmapBounds.width,
      defaultChangelogCount: grid.querySelectorAll(
        '.timeline-item:not(.is-changelog-preview)'
      ).length,
      heroBottom: heroBounds.bottom,
      heroHeight: heroBounds.height,
      heroTop: heroBounds.top,
      firstScreenHintBottomGap:
        heroBounds.bottom - firstScreenHintBounds.bottom,
      firstScreenHintText: firstScreenHint.textContent?.trim() ?? '',
      passionBackMask,
      passionCodeFontSize,
      passionContentBottomGap:
        passionBounds.bottom - passionContentBounds.bottom,
      passionCopyCount: passionSection.querySelectorAll('.passion-copy').length,
      passionCrosshairMask,
      passionBottom: passionBounds.bottom,
      passionHeight: passionBounds.height,
      passionLogoAspectRatio:
        passionLogo.offsetWidth / passionLogo.offsetHeight,
      passionLogoMask,
      passionLogoTop: passionLogoBounds.top,
      passionTop: passionBounds.top,
      passionWidth: passionBounds.width,
      roadmapEnglishSize,
      roadmapHeaderHeight: roadmapHeaderBounds.height,
      roadmapHeaderTop: roadmapHeaderBounds.top,
      roadmapTagLefts,
      roadmapTagTitle:
        roadmap
          .querySelector('.section-title .changelog')
          ?.textContent?.trim() ?? '',
      changelogTagTitle:
        changelog
          .querySelector('.section-title .changelog')
          ?.textContent?.trim() ?? '',
      roadmapTop: roadmapBounds.top,
      updatesDocumentTop: bounds.top + document.body.scrollTop,
      updatesTop: bounds.top,
      viewportHeight: window.innerHeight,
      width: bounds.width,
      secondaryTitleCount: grid.querySelectorAll('.section-title > .cn').length,
      previewChangelogCount: grid.querySelectorAll(
        '.timeline-item.is-changelog-preview'
      ).length,
      secondScreenHintAnimationDirection: getComputedStyle(
        secondScreenLine,
        '::after'
      ).animationDirection,
      secondScreenHintText: secondScreenHint.textContent?.trim() ?? '',
      secondScreenHintTopGap: secondScreenHintBounds.top - bounds.top,
    }
  })

  expect(metrics.heroHeight).toBeCloseTo(
    metrics.viewportHeight - metrics.heroTop,
    0
  )
  expect(metrics.heroBottom).toBeCloseTo(metrics.viewportHeight, 0)
  expect(metrics.updatesTop).toBeCloseTo(metrics.heroBottom, 0)
  expect(metrics.firstScreenHintBottomGap).toBeGreaterThan(20)
  expect(metrics.firstScreenHintBottomGap).toBeLessThan(65)
  expect(metrics.firstScreenHintText).toBe('继续探索')
  expect(metrics.secondScreenHintTopGap).toBeGreaterThan(70)
  expect(metrics.secondScreenHintTopGap).toBeLessThan(110)
  expect(metrics.secondScreenHintText).toBe('返回第一屏')
  expect(metrics.secondScreenHintAnimationDirection).toBe('reverse')
  expect(metrics.defaultChangelogCount).toBe(3)
  expect(metrics.previewChangelogCount).toBe(1)
  expect(metrics.passionBackMask).toContain('linear-gradient')
  expect(metrics.passionCrosshairMask).toContain('linear-gradient')
  expect(metrics.passionLogoMask).toBe('none')
  expect(metrics.passionLogoAspectRatio).toBeCloseTo(1, 2)
  expect(metrics.passionLogoTop).toBeLessThan(metrics.passionTop)
  expect(metrics.passionTop).toBeLessThan(metrics.changelogTop)
  expect(metrics.passionCopyCount).toBe(0)
  expect(metrics.passionCodeFontSize).toBeGreaterThan(60)
  expect(metrics.passionContentBottomGap).toBeGreaterThan(40)
  expect(Math.abs(metrics.changelogTop - metrics.roadmapTop)).toBeLessThan(1)
  expect(
    Math.abs(metrics.changelogHeaderTop - metrics.roadmapHeaderTop)
  ).toBeLessThan(1)
  expect(metrics.changelogHeaderTop - metrics.updatesTop).toBeGreaterThan(125)
  expect(metrics.changelogHeaderHeight).toBe(metrics.roadmapHeaderHeight)
  expect(metrics.changelogEnglishSize).toBe(metrics.roadmapEnglishSize)
  expect(metrics.secondaryTitleCount).toBe(0)
  expect(metrics.columnsRatio).toBeCloseTo(2, 1)
  expect(metrics.passionWidth).toBeCloseTo(metrics.width, 0)
  expect(metrics.heroBottom - metrics.passionBottom).toBeGreaterThan(60)
  expect(metrics.heroBottom - metrics.passionBottom).toBeLessThan(105)
  expect(metrics.passionHeight).toBeGreaterThan(metrics.width / 2.7)
  expect(new Set(metrics.roadmapTagLefts.map(Math.round)).size).toBe(1)
  expect(metrics.changelogTagTitle).toBe('< 更新日志 />')
  expect(metrics.roadmapTagTitle).toBe('< 未来更新 />')

  await page.mouse.wheel(0, 300)
  await expect
    .poll(() => page.evaluate(() => document.body.scrollTop))
    .toBeGreaterThanOrEqual(Math.floor(metrics.updatesDocumentTop) - 1)

  await page.waitForTimeout(950)
  await page.locator('.about-back-first-screen').click()
  await expect.poll(() => page.evaluate(() => document.body.scrollTop)).toBe(0)
})

const craftToolRoutes = [
  {
    path: '/colorPalette',
    selector: '.palette-tool',
    title: /COLOR EXTRACTOR|配色提取器/,
  },
  {
    path: '/easeStudio',
    selector: '.ease-tool',
    title: /EASE STUDIO|可视化贝塞尔曲线调整/,
  },
  {
    path: '/metronome',
    selector: '.metronome-tool',
    title: /METRONOME|节拍器/,
  },
  {
    path: '/bounceDynamics',
    selector: '.bounce-tool',
    title: /BOUNCING BALL|弹力球/,
  },
  {
    path: '/htmlEntities',
    selector: '.entity-tool',
    title: /HTML ENTITIES|HTML常用转义字符/,
  },
  {
    path: '/base64Codec',
    selector: '.codec-tool',
    title: /BASE64 CODEC|Base64加解密/,
  },
  {
    path: '/imageBase64',
    selector: '.image64-tool',
    title: /IMAGE BASE64|图片转Base64/,
  },
]

test.describe('craft tool pages', () => {
  for (const route of craftToolRoutes) {
    test(`${route.path} renders tool page`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector)).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})
