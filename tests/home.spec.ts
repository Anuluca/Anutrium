import { expect, test } from '@playwright/test'

import { gotoHomeAboutOverlay } from './helpers/homeAboutOverlay'

const PAGE_LOAD_TIMEOUT = 20_000
const pageRoutes = [
  { path: '/', selector: '.temple-page', title: /HOME|Anutrium/ },
  { path: '/archive', selector: '.archives-page', title: /ARCHIVE|作品集/ },
  { path: '/flanerie', selector: '.flanerie-page', title: /FLÂNERIE|旅程/ },
  {
    path: '/creative?current=craft',
    selector: '.craft-content',
    title: /HOME|Anutrium/,
  },
  {
    path: '/atrium/collections',
    selector: '.island-collections-content',
    title: /COLLECTIBLES|收藏品/,
  },
  {
    path: '/atrium/notes',
    selector: '.island-notes-content',
    title: /NOTES|笔记/,
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

test('page theme color follows the active route', async ({ page }) => {
  const samples = [
    {
      path: '/',
      color: '#e23456',
      backgroundDark: '#380e1c',
      backgroundLight: '#3e101f',
    },
    {
      path: '/archive',
      color: '#3276fe',
      backgroundDark: '',
      backgroundLight: '',
    },
  ]

  for (const sample of samples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rootStyle = getComputedStyle(document.documentElement)
          return {
            backgroundDark: rootStyle
              .getPropertyValue('--page-theme-background-dark')
              .trim(),
            backgroundLight: rootStyle
              .getPropertyValue('--page-theme-background-light')
              .trim(),
            color: rootStyle.getPropertyValue('--page-theme-color').trim(),
          }
        })
      )
      .toEqual({
        backgroundDark: sample.backgroundDark,
        backgroundLight: sample.backgroundLight,
        color: sample.color,
      })
  }
})

test('desktop header suppresses the default focus ring', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })

  const logoButton = page.locator('.logo-box')
  await logoButton.focus()
  await expect(logoButton).toHaveCSS('outline-style', 'none')
})

test('archive and craft use their exchanged representative zodiac signs', async ({
  page,
}) => {
  const routeSigns = [
    { path: '/archive', sign: '♒' },
    { path: '/colorPalette', sign: '♊' },
  ]

  for (const routeSign of routeSigns) {
    await page.goto(routeSign.path, { waitUntil: 'domcontentloaded' })
    await expect(
      page.locator('.zodiac-sign-face.is-active .zodiac-glyph')
    ).toContainText(routeSign.sign, { timeout: PAGE_LOAD_TIMEOUT })
  }
})

test('archive groups all primary works by company above miscellaneous work', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.archives-page')).not.toHaveClass(
    /\broute-enter-active\b/
  )

  const expectedHeadings = [
    '国家电网',
    '文因互联',
    '江西中烟',
    'Anuluca',
    '其他工作项目',
  ]
  const expectedCounts = [4, 2, 1, 3, 6]
  const sections = page.locator('.archives-page .home-section-layout')
  await expect(sections).toHaveCount(expectedHeadings.length)

  for (let index = 0; index < expectedHeadings.length; index += 1) {
    const section = sections.nth(index)
    const count = section.locator('.number-count')

    await expect(section.locator('.home-section-title__text')).toHaveText(
      expectedHeadings[index]
    )
    await expect(section.locator('.home-section-rail__num')).toHaveText(
      `#${index + 1}`
    )
    await expect(section.locator('.shared-work-card')).toHaveCount(
      expectedCounts[index]
    )
    await section.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    )
    await expect(count).toHaveText(
      String(expectedCounts[index]).padStart(2, '0')
    )
  }

  for (let index = 0; index < expectedHeadings.length - 1; index += 1) {
    const cardCompanies = await sections
      .nth(index)
      .locator('.work-card-info > small:first-child')
      .allTextContents()
    expect(new Set(cardCompanies)).toEqual(new Set([expectedHeadings[index]]))
  }

  await expect(
    sections.last().locator('.misc-work-card.shared-work-card')
  ).toHaveCount(6)

  const englishTitleCenterOffsets = await sections
    .locator('.home-section-title')
    .evaluateAll((titles) =>
      titles.map((title) => {
        const englishTitle = title.querySelector<HTMLElement>(
          '.home-section-title__en'
        )!
        const titleBounds = title.getBoundingClientRect()
        const textRange = document.createRange()
        textRange.selectNodeContents(englishTitle)
        const textBounds = textRange.getBoundingClientRect()

        return Math.abs(
          textBounds.left +
            textBounds.width / 2 -
            (titleBounds.left + titleBounds.width / 2)
        )
      })
    )
  expect(Math.max(...englishTitleCenterOffsets)).toBeLessThanOrEqual(1)
})

test('archive availability preserves square contribution cells without a status column', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(
    page.locator('.availability-grid, .availability-item')
  ).toHaveCount(0)
  const panel = page.locator('.availability-panel')
  await panel.evaluate((element) =>
    element.getAnimations().forEach((animation) => animation.finish())
  )
  const geometry = await panel.evaluate((panel) => {
    const copy = panel
      .querySelector<HTMLElement>('.availability-copy')!
      .getBoundingClientRect()
    const graph = panel
      .querySelector<HTMLElement>('.availability-github')!
      .getBoundingClientRect()
    const calendar = panel.querySelector<SVGSVGElement>(
      '.github-contribution-graph__calendar'
    )!
    const calendarBounds = calendar.getBoundingClientRect()
    const cells = calendar.querySelector('rect')!.getBoundingClientRect()
    const actions = Array.from(
      panel.querySelectorAll<HTMLElement>('.availability-cta')
    ).map((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, width: rect.width }
    })
    return {
      graphHeight: graph.height,
      copyHeight: copy.height,
      cellRatio: cells.width / cells.height,
      calendarRatio: calendarBounds.width / calendarBounds.height,
      copyWidth: copy.width,
      actions,
    }
  })
  expect(geometry.cellRatio).toBeCloseTo(1, 2)
  expect(geometry.calendarRatio).toBeGreaterThan(7)
  expect(geometry.graphHeight).toBeLessThanOrEqual(geometry.copyHeight + 1)
  expect(geometry.actions).toHaveLength(2)
  if (testInfo.project.name.includes('mobile')) {
    expect(
      Math.abs(geometry.actions[0].top - geometry.actions[1].top)
    ).toBeLessThanOrEqual(1)
    for (const action of geometry.actions)
      expect(
        Math.abs(action.width * 2 - geometry.copyWidth)
      ).toBeLessThanOrEqual(3)
  }
})

test('section title stays centered above full-width content with a number', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const section = page.locator('.archives-page .home-section-layout').first()
  await expect(section).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(section.locator('.home-section-rail__label')).toHaveCount(0)
  const englishTitle = section.locator('.home-section-title__en')
  await expect(englishTitle).toHaveText('STATE GRID')
  expect(
    await englishTitle.evaluate((element) => element.childElementCount)
  ).toBe(0)

  const geometry = await section.evaluate((element) => {
    const layoutBounds = element.getBoundingClientRect()
    const titleBounds = element
      .querySelector<HTMLElement>('.home-section-title')!
      .getBoundingClientRect()
    const titleRowBounds = element
      .querySelector<HTMLElement>('.home-section-title-row')!
      .getBoundingClientRect()
    const contentBounds = element
      .querySelector<HTMLElement>('.home-section-content')!
      .getBoundingClientRect()

    return {
      contentLeftOffset: Math.abs(contentBounds.left - layoutBounds.left),
      titleCenterOffset: Math.abs(
        titleBounds.left +
          titleBounds.width / 2 -
          (titleRowBounds.left + titleRowBounds.width / 2)
      ),
      verticalLineContent: getComputedStyle(element, '::before').content,
    }
  })

  expect(geometry.contentLeftOffset).toBeLessThanOrEqual(1)
  expect(geometry.titleCenterOffset).toBeLessThanOrEqual(1)
  expect(geometry.verticalLineContent).toBe('none')
})

test('flanerie section content and cards extend to the shared left edge', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const section = page.locator('.flanerie-page .home-section-layout').first()
  await expect(section).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  const geometry = await section.evaluate((element) => {
    const sectionBounds = element.getBoundingClientRect()
    const contentBounds = element
      .querySelector<HTMLElement>('.home-section-content')!
      .getBoundingClientRect()
    const cardBounds = element
      .querySelector<HTMLElement>('.vlog-image-reveal-entry')!
      .getBoundingClientRect()
    const titleBounds = element
      .querySelector<HTMLElement>('.home-section-title')!
      .getBoundingClientRect()
    const titleRowBounds = element
      .querySelector<HTMLElement>('.home-section-title-row')!
      .getBoundingClientRect()

    return {
      cardLeftOffset: Math.abs(cardBounds.left - sectionBounds.left),
      contentLeftOffset: Math.abs(contentBounds.left - sectionBounds.left),
      titleCenterOffset:
        titleBounds.left +
        titleBounds.width / 2 -
        (titleRowBounds.left + titleRowBounds.width / 2),
    }
  })

  expect(geometry.contentLeftOffset).toBeLessThanOrEqual(1)
  expect(geometry.cardLeftOffset).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.titleCenterOffset)).toBeLessThanOrEqual(1)
})

test('mobile section navigation expands from NAV and closes from the backdrop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const navigation = page.locator('.sections-fixed-nav')
  const toggle = navigation.locator('.sections-fixed-nav__toggle')
  const items = navigation.locator('.sections-fixed-nav__item')

  await expect(toggle).toBeVisible()
  await expect(items.first()).toBeHidden()
  const toggleSize = await toggle.boundingBox()
  if (!toggleSize) throw new Error('NAV trigger is unavailable')
  await toggle.click({ position: { x: 4, y: toggleSize.height - 4 } })

  await expect(navigation).toHaveClass(/\bis-mobile-open\b/)
  await expect(items.first()).toBeVisible()
  await expect(
    items.first().locator('.sections-fixed-nav__label')
  ).toBeVisible()
  const menu = navigation.locator('.sections-fixed-nav__menu')
  await expect
    .poll(() => menu.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1')

  const expandedGeometry = await navigation.evaluate((element) => {
    const menuElement = element.querySelector<HTMLElement>(
      '.sections-fixed-nav__menu'
    )!
    const navigationBounds = element.getBoundingClientRect()
    const menuBounds = menuElement.getBoundingClientRect()
    const lineBounds = element
      .querySelector<HTMLElement>('.sections-fixed-nav__line')!
      .getBoundingClientRect()
    const markerBounds = element
      .querySelector<HTMLElement>('.sections-fixed-nav__marker')!
      .getBoundingClientRect()

    return {
      anchorOffset: Math.max(
        Math.abs(menuBounds.left - navigationBounds.left),
        Math.abs(menuBounds.bottom - navigationBounds.bottom)
      ),
      navLabelOpacity: getComputedStyle(element, '::before').opacity,
      nodeCenterOffset: Math.abs(
        markerBounds.left +
          markerBounds.width / 2 -
          (lineBounds.left + lineBounds.width / 2)
      ),
      transformOrigin: getComputedStyle(menuElement).transformOrigin,
    }
  })
  expect(expandedGeometry.anchorOffset).toBeLessThanOrEqual(2)
  expect(expandedGeometry.navLabelOpacity).toBe('0')
  expect(expandedGeometry.nodeCenterOffset).toBeLessThanOrEqual(0.5)
  expect(expandedGeometry.transformOrigin).toMatch(/^0px /)

  const backdrop = page.locator('.sections-fixed-nav__backdrop')
  await expect(backdrop).toBeVisible()
  await expect
    .poll(() =>
      backdrop.evaluate((element) => {
        const filter = getComputedStyle(element).backdropFilter
        return Number.parseFloat(
          filter.match(/blur\((\d+(?:\.\d+)?)px\)/)?.[1] || '0'
        )
      })
    )
    .toBeGreaterThanOrEqual(4)
  const backdropBackground = await backdrop.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.backgroundColor,
      image: style.backgroundImage,
    }
  })
  expect(backdropBackground.color).toBe('rgba(0, 0, 0, 0)')
  expect(backdropBackground.image).toContain('radial-gradient')
  expect(backdropBackground.image).toMatch(/at (?:left bottom|0% 100%)/)
  expect(backdropBackground.image).toContain('rgba(0, 0, 0, 0.9)')

  await backdrop.click({ position: { x: 300, y: 100 } })
  await expect(backdrop).toHaveCount(0)
  await expect(items.first()).toBeHidden()

  await page
    .locator('.archives-page .home-section-layout')
    .first()
    .scrollIntoViewIfNeeded()
  const backToTop = page.locator('.back-to-top-button')
  await expect(backToTop).toBeVisible()
  await expect(navigation).not.toHaveClass(/\bis-page-end\b/)

  const navigationAlignment = await page.evaluate(() => {
    const navigationElement = document.querySelector<HTMLElement>(
      '.sections-fixed-nav'
    )!
    const backToTopElement = document.querySelector<HTMLElement>(
      '.back-to-top-button'
    )!
    const navigationBounds = navigationElement.getBoundingClientRect()
    const backToTopBounds = backToTopElement.getBoundingClientRect()
    const navLabelStyle = getComputedStyle(navigationElement, '::before')
    const navigationStyle = getComputedStyle(navigationElement)
    const backToTopStyle = getComputedStyle(backToTopElement)
    const context = document.createElement('canvas').getContext('2d')!
    context.font = `${navLabelStyle.fontWeight} ${navLabelStyle.fontSize} ${navLabelStyle.fontFamily}`
    const navLabelWidth = context.measureText('NAV').width
    const navLabelLeft = navigationBounds.left + parseFloat(navLabelStyle.left)

    return {
      widthDelta: Math.abs(backToTopBounds.width - navLabelWidth),
      centerOffset: Math.abs(
        backToTopBounds.left +
          backToTopBounds.width / 2 -
          (navLabelLeft + navLabelWidth / 2)
      ),
      verticalGap:
        parseFloat(navigationStyle.bottom) -
        (parseFloat(backToTopStyle.bottom) + backToTopBounds.height),
    }
  })
  expect(navigationAlignment.widthDelta).toBeLessThanOrEqual(1)
  expect(navigationAlignment.centerOffset).toBeLessThanOrEqual(1)
  expect(navigationAlignment.verticalGap).toBeGreaterThanOrEqual(3)
  expect(navigationAlignment.verticalGap).toBeLessThanOrEqual(6)
})

test('mobile header branding keeps its horizontal geometry while scrolling', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const readBrandGeometry = () =>
    page.locator('.logo-box').evaluate((element) => {
      const logoBounds = element
        .querySelector<HTMLElement>('.logo')!
        .getBoundingClientRect()
      const titleBounds = element
        .querySelector<HTMLElement>('.right')!
        .getBoundingClientRect()

      return {
        logoLeft: logoBounds.left,
        logoTop: logoBounds.top,
        logoWidth: logoBounds.width,
        titleLeft: titleBounds.left,
        titleTop: titleBounds.top,
        titleWidth: titleBounds.width,
      }
    })
  const setScrollTop = async (top: number) => {
    await page.evaluate((nextTop) => {
      window.scrollTo(0, nextTop)
      document.scrollingElement?.scrollTo(0, nextTop)
      document.documentElement.scrollTop = nextTop
      document.body.scrollTop = nextTop
    }, top)
    await page.waitForTimeout(100)
  }

  const initial = await readBrandGeometry()
  await setScrollTop(50)
  const transitioning = await readBrandGeometry()
  await setScrollTop(120)
  const scrolled = await readBrandGeometry()

  for (const geometry of [transitioning, scrolled]) {
    const logoLeftShift = Math.abs(geometry.logoLeft - initial.logoLeft)
    expect(logoLeftShift).toBeLessThanOrEqual(1)
    expect(
      Math.abs(geometry.logoWidth - initial.logoWidth)
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(geometry.titleLeft - initial.titleLeft)
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(geometry.titleWidth - initial.titleWidth)
    ).toBeLessThanOrEqual(1)
  }
  expect(initial.logoTop - scrolled.logoTop).toBeGreaterThanOrEqual(1)
  expect(initial.logoTop - scrolled.logoTop).toBeLessThanOrEqual(5)
  expect(initial.titleTop - scrolled.titleTop).toBeGreaterThanOrEqual(1)
  expect(initial.titleTop - scrolled.titleTop).toBeLessThanOrEqual(5)
})

test('mobile first-load desktop recommendation is fixed and closable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const alert = page.locator('.mobile-experience-alert .el-alert')
  await expect(alert).toContainText('使用电脑访问以获得最佳体验', {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await alert.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished)
    )
  })

  const alertStyle = await alert.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const messageBounds = element
      .querySelector('.el-alert__message')!
      .getBoundingClientRect()
    const style = getComputedStyle(element)
    const titleStyle = getComputedStyle(
      element.querySelector('.el-alert__title')!
    )
    return {
      bottomOffset: Math.abs(window.innerHeight - bounds.bottom),
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter,
      borderTopColor: style.borderTopColor,
      borderRightWidth: style.borderRightWidth,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
      centerOffset: Math.abs(
        bounds.left + bounds.width / 2 - window.innerWidth / 2
      ),
      messageCenterOffset: Math.abs(
        messageBounds.left + messageBounds.width / 2 - window.innerWidth / 2
      ),
      viewportWidthOffset: Math.abs(bounds.width - window.innerWidth),
      fontSize: Number.parseFloat(titleStyle.fontSize),
      fontWeight: titleStyle.fontWeight,
      iconCount: element.querySelectorAll('.el-alert__icon svg').length,
      textAlign: getComputedStyle(element.querySelector('.el-alert__content')!)
        .textAlign,
      animationName: style.animationName,
      parentTagName: element.parentElement!.parentElement!.tagName,
      position: getComputedStyle(element.parentElement!).position,
      shadow: style.boxShadow,
      zIndex: getComputedStyle(element.parentElement!).zIndex,
    }
  })
  expect(alertStyle.bottomOffset).toBeLessThanOrEqual(1)
  expect(alertStyle.backgroundImage).toContain('linear-gradient')
  expect(alertStyle.backdropFilter).toContain('blur(8px)')
  expect(alertStyle.borderTopColor).toBe('rgb(226, 52, 86)')
  expect(alertStyle.borderRightWidth).toBe('0px')
  expect(alertStyle.borderBottomWidth).toBe('0px')
  expect(alertStyle.borderLeftWidth).toBe('0px')
  expect(alertStyle.centerOffset).toBeLessThanOrEqual(1)
  expect(alertStyle.messageCenterOffset).toBeLessThanOrEqual(1)
  expect(alertStyle.viewportWidthOffset).toBeLessThanOrEqual(1)
  expect(alertStyle.fontSize).toBeGreaterThan(12)
  expect(alertStyle.fontSize).toBeLessThan(15)
  expect(alertStyle.fontWeight).toBe('600')
  expect(alertStyle.iconCount).toBe(1)
  expect(alertStyle.textAlign).toBe('center')
  expect(alertStyle.animationName).toBe('none')
  expect(alertStyle.parentTagName).toBe('BODY')
  expect(alertStyle.position).toBe('fixed')
  expect(alertStyle.shadow).not.toBe('none')
  expect(alertStyle.zIndex).toBe('10000')

  const closeButton = alert.locator('.el-alert__close-btn')
  await expect(closeButton).toHaveText('别说了！')
  await expect(closeButton).toHaveCSS('color', 'rgb(113, 203, 125)')
  await expect(closeButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(closeButton).toHaveCSS('font-weight', '600')

  await page.locator('.mobile-menu-icon').click()
  await page.locator('.mobile-menu-language').click()
  await expect(alert.locator('.el-alert__title')).toHaveText(
    'VISIT ON DESKTOP FOR THE BEST EXPERIENCE'
  )
  await expect(closeButton).toHaveText('GOT IT!')
  await expect(alert.locator('.el-alert__title')).toHaveCSS(
    'font-family',
    'Anton, sans-serif'
  )
  await expect(closeButton).toHaveCSS('font-family', 'Anton, sans-serif')
  await expect(page.locator('.mobile-menu-panel')).toBeHidden()

  await closeButton.click()
  await expect(page.locator('.mobile-experience-alert')).toHaveClass(
    /mobile-experience-alert-leave-active/
  )
  await expect(page.locator('.mobile-experience-alert')).toHaveCSS(
    'transition-property',
    'opacity'
  )
  await expect(alert).toBeHidden()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(alert).toBeHidden()

  const dismissUntil = await page.evaluate(() =>
    Number.parseInt(
      window.localStorage.getItem(
        'anutrium:mobile-experience-alert-dismiss-until'
      ) ?? '',
      10
    )
  )
  expect(dismissUntil).toBeGreaterThan(Date.now() + 2 * 24 * 60 * 60 * 1000)
  expect(dismissUntil).toBeLessThanOrEqual(Date.now() + 3 * 24 * 60 * 60 * 1000)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.mobile-experience-alert')).toHaveCount(0)
})

test('archive loads the work detail modal on demand', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const firstWorkCard = page.locator('.works-grid .shared-work-card').first()

  await expect(firstWorkCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.modal-wrapper-dialog')).toHaveCount(0)
  await firstWorkCard.click()
  const dialog = page.locator('.modal-wrapper-dialog')
  await expect(dialog).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  const backgroundTitle = page.locator('.modal-background-title')
  await expect(backgroundTitle.locator('span').first()).toHaveText('项目详情')
  await expect(backgroundTitle).toHaveCSS('opacity', '0.1')
  await expect(
    backgroundTitle.locator('.modal-background-title__track')
  ).toHaveCSS('animation-play-state', 'running')
  const backgroundTitleStyle = await backgroundTitle.evaluate((element) => {
    const style = getComputedStyle(element)
    const track = element.querySelector<HTMLElement>(
      '.modal-background-title__track'
    )!
    const titleText = element.querySelector<HTMLElement>('span')!
    const titleTextStyle = getComputedStyle(titleText)
    return {
      centerDelta: Math.abs(
        element.getBoundingClientRect().left +
          element.getBoundingClientRect().width / 2 -
          (element.parentElement!.getBoundingClientRect().left +
            element.parentElement!.getBoundingClientRect().width / 2)
      ),
      fontFamily: style.fontFamily.toLowerCase(),
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
      opacity: style.opacity,
      trackAnimationName: getComputedStyle(track).animationName,
      trackAnimationPlayState: getComputedStyle(track).animationPlayState,
      transitionDuration: style.transitionDuration,
      textFillColor: titleTextStyle.webkitTextFillColor,
      textStrokeWidth: Number.parseFloat(titleTextStyle.webkitTextStrokeWidth),
      zIndex: Number.parseInt(style.zIndex, 10),
      dialogZIndex: Number.parseInt(
        getComputedStyle(
          document.querySelector<HTMLElement>('.modal-wrapper-dialog')!
        ).zIndex,
        10
      ),
    }
  })
  expect(backgroundTitleStyle.centerDelta).toBeLessThanOrEqual(1)
  expect(backgroundTitleStyle.fontFamily).toContain('unboundedsans')
  expect(backgroundTitleStyle.fontSize).toBeGreaterThan(70)
  expect(backgroundTitleStyle.fontWeight).toBe('800')
  expect(backgroundTitleStyle.opacity).toBe('0.1')
  expect(backgroundTitleStyle.trackAnimationName).toContain(
    'modalBackgroundTitleMarquee'
  )
  expect(backgroundTitleStyle.trackAnimationPlayState).toBe('running')
  expect(backgroundTitleStyle.transitionDuration).toBe('0.2s')
  expect(backgroundTitleStyle.textFillColor).toBe('rgba(0, 0, 0, 0)')
  expect(backgroundTitleStyle.textStrokeWidth).toBeGreaterThanOrEqual(1)
  expect(backgroundTitleStyle.zIndex).toBeGreaterThanOrEqual(0)
  expect(backgroundTitleStyle.zIndex).toBeLessThan(
    backgroundTitleStyle.dialogZIndex
  )
  await expect(dialog.locator('.aside-company-name')).toBeAttached()
  await expect(
    dialog.locator('.project-share-button.share-button')
  ).toBeAttached()
  const detailChrome = await dialog.evaluate((element) => {
    const companyName = element.querySelector<HTMLElement>(
      '.aside-company-name'
    )!
    const shareButton = element.querySelector<HTMLElement>(
      '.project-share-button.share-button'
    )!
    const confidentialTitle = element.querySelector<HTMLElement>(
      '.confidential-notice strong'
    )!
    const fieldLabels = Array.from(
      element.querySelectorAll<HTMLElement>('.field-label')
    )
    const aboutText = element.querySelector<HTMLElement>('.aside-desc p')
    const detailText = element.querySelector<HTMLElement>('.detail-text')
    const detailsLabel = element.querySelector<HTMLElement>('.details-label')
    const detailsLine = element.querySelector<HTMLElement>('.details-line')
    const fieldValues = Array.from(
      element.querySelectorAll<HTMLElement>('.field-val')
    )
    const linkItem = element.querySelector<HTMLElement>('.link-item')
    const linkFlowMark = element.querySelector<HTMLElement>('.link-flow-mark')

    return {
      aboutLineHeightRatio: aboutText
        ? Number.parseFloat(getComputedStyle(aboutText).lineHeight) /
          Number.parseFloat(getComputedStyle(aboutText).fontSize)
        : null,
      asideIdCount: element.querySelectorAll('.aside-id').length,
      companyColor: getComputedStyle(companyName).color,
      companyFontSize: Number.parseFloat(
        getComputedStyle(companyName).fontSize
      ),
      confidentialKickerCount: element.querySelectorAll('.confidential-kicker')
        .length,
      confidentialTitleWeight: confidentialTitle
        ? getComputedStyle(confidentialTitle).fontWeight
        : null,
      detailLineHeightRatio: detailText
        ? Number.parseFloat(getComputedStyle(detailText).lineHeight) /
          Number.parseFloat(getComputedStyle(detailText).fontSize)
        : null,
      detailsLabelLetterSpacing: detailsLabel
        ? getComputedStyle(detailsLabel).letterSpacing
        : null,
      detailsLabelFontSize: detailsLabel
        ? Number.parseFloat(getComputedStyle(detailsLabel).fontSize)
        : null,
      detailsLineBackgroundImage: detailsLine
        ? getComputedStyle(detailsLine).backgroundImage
        : null,
      detailsLineCount: element.querySelectorAll('.details-line').length,
      fieldLabelStyles: fieldLabels.map((label) => ({
        backgroundColor: getComputedStyle(label).backgroundColor,
        color: getComputedStyle(label).color,
        fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
        letterSpacing: getComputedStyle(label).letterSpacing,
        marginBottom: getComputedStyle(label).marginBottom,
        opacity: getComputedStyle(label).opacity,
      })),
      fieldValueFonts: fieldValues.map(
        (value) => getComputedStyle(value).fontFamily
      ),
      linkFlowMarkCount: linkFlowMark?.querySelectorAll('path').length ?? 0,
      linkItemTransform: linkItem ? getComputedStyle(linkItem).transform : null,
      shareBackground: getComputedStyle(shareButton).backgroundImage,
      shareBorderWidth: getComputedStyle(shareButton).borderWidth,
      shareCodeCount: shareButton.querySelectorAll('.share-button__code')
        .length,
    }
  })
  expect(detailChrome.asideIdCount).toBe(0)
  expect(detailChrome.companyColor).toBe('rgb(113, 203, 125)')
  expect(detailChrome.companyFontSize).toBeGreaterThan(12)
  expect(detailChrome.fieldLabelStyles.length).toBeGreaterThan(0)
  expect(detailChrome.fieldLabelStyles).toEqual(
    detailChrome.fieldLabelStyles.map(() => ({
      backgroundColor: 'rgba(0, 0, 0, 0)',
      color: 'rgb(113, 203, 125)',
      fontSize: detailChrome.fieldLabelStyles[0].fontSize,
      letterSpacing: 'normal',
      marginBottom: detailChrome.fieldLabelStyles[0].marginBottom,
      opacity: '0.8',
    }))
  )
  expect(detailChrome.fieldLabelStyles[0].fontSize).toBeGreaterThan(9)
  expect(
    Number.parseFloat(detailChrome.fieldLabelStyles[0].marginBottom)
  ).toBeGreaterThan(3)
  expect(
    detailChrome.fieldValueFonts.every((fontFamily) =>
      fontFamily.toLowerCase().includes('anton')
    )
  ).toBe(true)
  expect(detailChrome.detailsLabelLetterSpacing).toBe('normal')
  expect(detailChrome.detailsLabelFontSize).toBeGreaterThan(9)
  expect(detailChrome.detailsLineCount).toBe(1)
  expect(detailChrome.detailsLineBackgroundImage).toBe('none')
  expect(detailChrome.linkFlowMarkCount).toBe(2)
  expect(detailChrome.linkItemTransform).toBe('none')
  if (detailChrome.aboutLineHeightRatio !== null) {
    expect(detailChrome.aboutLineHeightRatio).toBeCloseTo(1.45, 2)
  }
  if (detailChrome.detailLineHeightRatio !== null) {
    expect(detailChrome.detailLineHeightRatio).toBeCloseTo(1.45, 2)
  }
  expect(detailChrome.confidentialKickerCount).toBe(0)
  if (detailChrome.confidentialTitleWeight) {
    expect(detailChrome.confidentialTitleWeight).toBe('700')
  }
  expect(detailChrome.shareBackground).toBe('none')
  expect(detailChrome.shareBorderWidth).toBe('0px')
  expect(detailChrome.shareCodeCount).toBe(0)

  if (testInfo.project.name.includes('mobile')) {
    const mobileLayout = await dialog.evaluate((element) => {
      const closeButton =
        element.querySelector<HTMLElement>('.diamond-close-btn')!
      const asideCompany = element.querySelector('.aside-company')!
      const asideDivider = element.querySelector('.aside-divider')!
      const asideLogo = element.querySelector('.aside-logo')!
      const modalAside = element.querySelector('.modal-aside')!
      const companyInfo = element.querySelector('.aside-company-info')!
      const companyName = element.querySelector('.aside-company-name')!
      const shareButton = element.querySelector('.project-share-button')!

      return {
        asideCompanyAlignItems: getComputedStyle(asideCompany).alignItems,
        asideCompanyHeight: (asideCompany as HTMLElement).offsetHeight,
        asideCompanyBottomGap:
          (asideDivider as HTMLElement).offsetTop -
          ((asideCompany as HTMLElement).offsetTop +
            (asideCompany as HTMLElement).offsetHeight),
        asideCompanyTopGap:
          (asideCompany as HTMLElement).offsetTop -
          (modalAside as HTMLElement).offsetTop,
        asideLogoWidth: (asideLogo as HTMLElement).offsetWidth,
        closeCenterDelta: Math.abs(
          closeButton.getBoundingClientRect().left +
            closeButton.getBoundingClientRect().width / 2 -
            (element.getBoundingClientRect().left +
              element.getBoundingClientRect().width / 2)
        ),
        closeIsBelowDialog:
          closeButton.getBoundingClientRect().top >=
          element.getBoundingClientRect().bottom,
        closeIsInViewport:
          closeButton.getBoundingClientRect().bottom <= window.innerHeight,
        companyInfoJustifyContent: getComputedStyle(companyInfo).justifyContent,
        companyNameFontSize: Number.parseFloat(
          getComputedStyle(companyName).fontSize
        ),
        dialogBottomGap:
          window.innerHeight -
          ((element as HTMLElement).offsetTop +
            (element as HTMLElement).offsetHeight),
        dialogTop: (element as HTMLElement).offsetTop,
        shareButtonAlignSelf: getComputedStyle(shareButton).alignSelf,
      }
    })

    expect(mobileLayout.closeCenterDelta).toBeLessThanOrEqual(1)
    expect(mobileLayout.closeIsBelowDialog).toBe(true)
    expect(mobileLayout.closeIsInViewport).toBe(true)
    expect(mobileLayout.asideCompanyHeight).toBeGreaterThanOrEqual(44)
    expect(mobileLayout.asideCompanyAlignItems).toBe('center')
    expect(
      Math.abs(
        mobileLayout.asideCompanyTopGap - mobileLayout.asideCompanyBottomGap
      )
    ).toBeLessThanOrEqual(1)
    expect(mobileLayout.asideLogoWidth).toBeGreaterThanOrEqual(44)
    expect(mobileLayout.companyNameFontSize).toBeGreaterThanOrEqual(15)
    expect(mobileLayout.companyInfoJustifyContent).toBe('center')
    expect(mobileLayout.shareButtonAlignSelf).toBe('center')
    expect(mobileLayout.dialogTop).toBeGreaterThanOrEqual(64)
    expect(mobileLayout.dialogBottomGap).toBeGreaterThanOrEqual(100)
  }
})

test('404 page remains locked at the top', async ({ page }) => {
  await page.goto('/404', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.not-found-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('html')).toHaveClass(/\bnot-found-no-scroll\b/)
  await expect(page.locator('body')).toHaveClass(/\bnot-found-no-scroll\b/)

  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)

  const scrollTop = await page.evaluate(() =>
    Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop
    )
  )
  expect(scrollTop).toBe(0)

  await page.locator('.last-show-text').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('html')).not.toHaveClass(/\bnot-found-no-scroll\b/)
  await expect(page.locator('body')).not.toHaveClass(/\bnot-found-no-scroll\b/)
})

test('mobile menu locks background scrolling', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => window.scrollTo(0, 500))

  await page.locator('.mobile-menu-icon').click()
  const mobileMenu = page.locator('.mobile-menu-panel')
  await expect(mobileMenu).toHaveClass(/\bactive\b/)
  await expect(mobileMenu).toHaveCSS('background-image', /linear-gradient/)
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

test('mobile tool grids use one taller card per row', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  const samples = [
    { grid: '.home-craft-grid', path: '/' },
    { grid: '.tl-grid', path: '/creative?current=craft' },
  ]

  for (const sample of samples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    const grid = page.locator(sample.grid)
    await expect(grid).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
    await grid.scrollIntoViewIfNeeded()

    const cards = grid.locator('.shared-tool-card')
    await expect.poll(() => cards.count()).toBeGreaterThan(1)

    const geometry = await grid.evaluate((element) => {
      const cards = element.querySelectorAll<HTMLElement>('.shared-tool-card')
      const firstCard = cards[0].getBoundingClientRect()
      const secondCard = cards[1].getBoundingClientRect()
      const image = cards[0].querySelector<HTMLElement>('.tl-card__img-wrap')!
      const imageHeight = Number.parseFloat(getComputedStyle(image).height)
      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const fontSizes = Object.fromEntries(
        [
          ['.tl-card__index-num', 29.3333],
          ['.tl-card__index-slash', 23.4667],
          ['.tl-card__index-total', 23.4667],
          ['.tl-card__tag', 13.2],
          ['.tl-card__title', 24.9333],
          ['.tl-card__sub', 17.6],
          ['.tl-card__status', 13.2],
          ['.tl-card__cta', 14.6667],
        ].map(([selector, sourceSize]) => [
          selector,
          {
            actual: Number.parseFloat(
              getComputedStyle(cards[0].querySelector<HTMLElement>(selector)!)
                .fontSize
            ),
            expected: (Number(sourceSize) / 30) * rootFontSize,
          },
        ])
      )
      const bodyStyle = getComputedStyle(
        cards[0].querySelector<HTMLElement>('.tl-card__body')!
      )
      const footerStyle = getComputedStyle(
        cards[0].querySelector<HTMLElement>('.tl-card__footer')!
      )

      return {
        bodySpacing: {
          gap: Number.parseFloat(bodyStyle.gap),
          paddingLeft: Number.parseFloat(bodyStyle.paddingLeft),
          paddingTop: Number.parseFloat(bodyStyle.paddingTop),
        },
        expectedImageHeight: (280 / 30) * rootFontSize,
        expectedSpacing: {
          bodyGap: (10.6667 / 30) * rootFontSize,
          bodyPaddingLeft: (26.6667 / 30) * rootFontSize,
          bodyPaddingTop: (24 / 30) * rootFontSize,
          footerMarginTop: (10.6667 / 30) * rootFontSize,
          footerPaddingTop: (16 / 30) * rootFontSize,
        },
        fontSizes,
        footerSpacing: {
          marginTop: Number.parseFloat(footerStyle.marginTop),
          paddingTop: Number.parseFloat(footerStyle.paddingTop),
        },
        imageHeight,
        leftDelta: Math.abs(firstCard.left - secondCard.left),
        rowGap: secondCard.top - firstCard.bottom,
      }
    })

    expect(geometry.leftDelta).toBeLessThanOrEqual(1)
    expect(geometry.rowGap).toBeGreaterThanOrEqual(0)
    expect(geometry.imageHeight).toBeCloseTo(geometry.expectedImageHeight, 0)
    for (const fontSize of Object.values(geometry.fontSizes)) {
      expect(fontSize.actual).toBeCloseTo(fontSize.expected, 0)
    }
    expect(geometry.bodySpacing.gap).toBeCloseTo(
      geometry.expectedSpacing.bodyGap,
      0
    )
    expect(geometry.bodySpacing.paddingLeft).toBeCloseTo(
      geometry.expectedSpacing.bodyPaddingLeft,
      0
    )
    expect(geometry.bodySpacing.paddingTop).toBeCloseTo(
      geometry.expectedSpacing.bodyPaddingTop,
      0
    )
    expect(geometry.footerSpacing.marginTop).toBeCloseTo(
      geometry.expectedSpacing.footerMarginTop,
      0
    )
    expect(geometry.footerSpacing.paddingTop).toBeCloseTo(
      geometry.expectedSpacing.footerPaddingTop,
      0
    )
  }
})

test('mobile pages respect route layout gutters', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  for (const path of ['/', '/archive', '/colorPalette', '/flanerie']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.main-container')).toBeAttached({
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const gutter = await page
      .locator('.router-container')
      .evaluate((element) => {
        const style = getComputedStyle(element)
        const bounds = element.getBoundingClientRect()

        return {
          left: bounds.left + Number.parseFloat(style.paddingLeft),
          layout: element.classList.contains('page-layout--main')
            ? 'main'
            : 'sub',
          minimumExpected: window.innerWidth * 0.06,
          right:
            window.innerWidth -
            bounds.right +
            Number.parseFloat(style.paddingRight),
        }
      })

    if (gutter.layout === 'main') {
      expect(gutter.left).toBeGreaterThan(0)
    } else {
      expect(gutter.left).toBeGreaterThanOrEqual(gutter.minimumExpected - 1)
    }
    expect(gutter.right).toBeCloseTo(gutter.left, 1)
  }
})

test('mobile changelog gives more width to update content', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await gotoHomeAboutOverlay(page)
  const majorItem = page.locator('.timeline-item.is-major')
  const regularCard = page.locator('.log-card.is-regular-card').first()
  await expect(majorItem).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(regularCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })

  const geometry = await page.evaluate(() => {
    const changelog = document.querySelector<HTMLElement>('.changelog-block')!
    const major = document.querySelector<HTMLElement>(
      '.timeline-item.is-major'
    )!
    const majorSide = major.querySelector<HTMLElement>('.log-side.is-major')!
    const majorVersion = majorSide.querySelector<HTMLElement>('strong')!
    const majorLabel = majorSide.querySelector<HTMLElement>('small')!
    const regular = document.querySelector<HTMLElement>(
      '.log-card.is-regular-card'
    )!
    const regularVersion = regular.querySelector<HTMLElement>(
      '.log-inline-version'
    )!
    const latestLabel = regular.querySelector<HTMLElement>('.log-latest')!
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const changelogBounds = changelog.getBoundingClientRect()
    const cardRightEdges = Array.from(
      changelog.querySelectorAll<HTMLElement>('.log-card')
    ).map((card) => card.getBoundingClientRect().right)

    return {
      cardRightEdges,
      changelogRight: changelogBounds.right,
      expectedMajorSideWidth: (112 / 30) * rootFontSize,
      expectedRegularColumnWidth: (80 / 30) * rootFontSize,
      latestLabelSize: Number.parseFloat(
        getComputedStyle(latestLabel).fontSize
      ),
      majorGap: Number.parseFloat(getComputedStyle(major).columnGap),
      majorLabelSize: Number.parseFloat(getComputedStyle(majorLabel).fontSize),
      majorSideWidth: Number.parseFloat(
        getComputedStyle(major).gridTemplateColumns.split(' ')[1]
      ),
      majorVersionSize: Number.parseFloat(
        getComputedStyle(majorVersion).fontSize
      ),
      regularColumnWidth: Number.parseFloat(
        getComputedStyle(regular).gridTemplateColumns.split(' ')[0]
      ),
      regularVersionSize: Number.parseFloat(
        getComputedStyle(regularVersion).fontSize
      ),
      rootFontSize,
    }
  })

  expect(geometry.majorSideWidth).toBeCloseTo(
    geometry.expectedMajorSideWidth,
    0
  )
  expect(geometry.regularColumnWidth).toBeCloseTo(
    geometry.expectedRegularColumnWidth,
    0
  )
  expect(geometry.majorGap).toBeCloseTo((10 / 30) * geometry.rootFontSize, 0)
  expect(geometry.majorVersionSize).toBeCloseTo(geometry.rootFontSize, 0)
  expect(geometry.majorLabelSize).toBeCloseTo(geometry.rootFontSize * 0.56, 0)
  expect(geometry.regularVersionSize).toBeCloseTo(
    geometry.rootFontSize * 0.84,
    0
  )
  expect(geometry.latestLabelSize).toBeCloseTo(geometry.rootFontSize * 0.42, 0)
  for (const rightEdge of geometry.cardRightEdges) {
    expect(rightEdge).toBeLessThan(geometry.changelogRight)
  }
})

test('mobile roadmap and neighbour cards use revised typography', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoHomeAboutOverlay(page)
  const roadmapCard = page.locator('.roadmap-tag').first()
  const neighbourCard = page.locator('.neighbor-card').first()
  await expect(roadmapCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(neighbourCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })

  const typography = await page.evaluate(() => {
    const roadmap = document.querySelector<HTMLElement>('.roadmap-tag')!
    const neighbourDescription =
      document.querySelector<HTMLElement>('.nb-desc')!
    const neighbourTitle = document.querySelector<HTMLElement>('.nb-name')!
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const readFontSize = (selector: string) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>(selector)!)
          .fontSize
      )

    return {
      neighbourDescription: readFontSize('.nb-desc'),
      neighbourDescriptionWhiteSpace:
        getComputedStyle(neighbourDescription).whiteSpace,
      neighbourTitle: readFontSize('.nb-name'),
      neighbourTitleWhiteSpace: getComputedStyle(neighbourTitle).whiteSpace,
      roadmapHeight: roadmap.getBoundingClientRect().height,
      roadmapIndex: readFontSize('.roadmap-tag__index'),
      roadmapMinHeight: Number.parseFloat(getComputedStyle(roadmap).minHeight),
      roadmapText: readFontSize('.roadmap-tag__text'),
      rootFontSize,
    }
  })

  expect(typography.roadmapIndex).toBeCloseTo(
    typography.rootFontSize * 1.3333,
    0
  )
  expect(typography.roadmapText).toBeCloseTo(typography.rootFontSize * 0.72, 0)
  expect(typography.roadmapHeight).toBeCloseTo(
    typography.roadmapMinHeight + 2,
    0
  )
  expect(typography.neighbourTitle).toBeCloseTo(
    typography.rootFontSize * 0.76,
    0
  )
  expect(typography.neighbourDescription).toBeCloseTo(
    typography.rootFontSize * 0.48,
    0
  )
  expect(typography.neighbourTitleWhiteSpace).toBe('nowrap')
  expect(typography.neighbourDescriptionWhiteSpace).toBe('normal')
})

test('mobile menu stays above fixed page navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const pageNavigation = page.locator('.detail-sections-nav')
  const navigationToggle = pageNavigation.locator('.sections-fixed-nav__toggle')
  await expect(navigationToggle).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

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
  await expect(navigationToggle).toBeVisible()
})

test('mobile detail section navigation uses the shared NAV interaction', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const navigation = page.locator('.detail-sections-nav')
  const toggle = navigation.locator('.sections-fixed-nav__toggle')
  const items = navigation.locator('.sections-fixed-nav__item')

  await expect(toggle).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(items.first()).toBeHidden()
  await toggle.click()

  await expect(navigation).toHaveClass(/\bis-mobile-open\b/)
  await expect(items.first()).toBeVisible()
  await expect(
    items.first().locator('.sections-fixed-nav__label')
  ).toBeVisible()
  await expect(page.locator('.sections-fixed-nav__backdrop')).toBeVisible()

  await items.last().click()
  await expect(navigation).not.toHaveClass(/\bis-mobile-open\b/)
  await expect(page.locator('.sections-fixed-nav__backdrop')).toHaveCount(0)
  await expect(items.first()).toBeHidden()
})

test('mobile fixed page navigation hides at the page bottom', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  const routeSamples = [
    { path: '/', selector: '.home-sections-nav' },
    {
      path: '/archive',
      selector: '.sections-fixed-nav:not(.home-sections-nav)',
    },
    { path: '/flanerie/changsha', selector: '.detail-sections-nav' },
  ]

  for (const sample of routeSamples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    const pageNavigation = page.locator(sample.selector)
    await expect(pageNavigation).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

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
        return pageNavigation.evaluate((element) => ({
          isPageEnd: element.classList.contains('is-page-end'),
          pointerEvents: getComputedStyle(element).pointerEvents,
          visibility: getComputedStyle(element).visibility,
        }))
      })
      .toEqual({
        isPageEnd: true,
        pointerEvents: 'none',
        visibility: 'hidden',
      })

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
    await expect(pageNavigation).not.toHaveClass(/\bis-page-end\b/)
    await expect(pageNavigation).toBeVisible()
  }
})

test('particle background remains active after route navigation', async ({
  page,
}, _testInfo) => {
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-motion-state',
    'running'
  )

  await page.evaluate(() =>
    (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/colorPalette')
  )

  await expect(page.locator('.palette-tool')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect
    .poll(() =>
      page
        .locator('.star-container')
        .evaluate((container) => [
          getComputedStyle(
            container.querySelector('.zodiac-static-art') as Element
          ).animationName,
          (container.querySelector('.particles-bg') as HTMLCanvasElement)
            .dataset.motionState,
        ])
    )
    .toEqual(['none', 'running'])
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

test('about friend links use responsive rows and reveal complete descriptions on hover', async ({
  page,
}, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile')
  await gotoHomeAboutOverlay(page)
  const grid = page.locator('.neighbors-grid')
  const cards = grid.locator('.neighbor-card')

  await expect(cards).toHaveCount(2, { timeout: PAGE_LOAD_TIMEOUT })
  await cards.first().scrollIntoViewIfNeeded()

  const metrics = await grid.evaluate((element) => {
    const gridBounds = element.getBoundingClientRect()
    const rows = [...element.querySelectorAll('.neighbor-card')].map((card) => {
      const bounds = card.getBoundingClientRect()
      const description = card.querySelector('.nb-desc') as HTMLElement
      const logo = card.querySelector('.nb-logo img') as HTMLImageElement
      const centeredContent = card
        .querySelector('.nb-centered-content')!
        .getBoundingClientRect()
      const headingBounds = card
        .querySelector('.nb-heading')!
        .getBoundingClientRect()
      const logoBounds = card.querySelector('.nb-logo')!.getBoundingClientRect()
      const flowMark = card.querySelector('.link-flow-mark') as SVGElement

      return {
        bottom: bounds.bottom,
        centeredContentOffset:
          centeredContent.left +
          centeredContent.width / 2 -
          (bounds.left + bounds.width / 2),
        description: description.textContent?.trim() ?? '',
        descriptionClipPath: getComputedStyle(description).clipPath,
        descriptionOpacity: getComputedStyle(description).opacity,
        descriptionWhiteSpace: getComputedStyle(description).whiteSpace,
        dividerAfterHeight: Number.parseFloat(
          getComputedStyle(card.parentElement!, '::after').height
        ),
        dividerBeforeWidth: Number.parseFloat(
          getComputedStyle(card.parentElement!, '::before').width
        ),
        headingTextAlign: getComputedStyle(
          card.querySelector('.nb-heading') as Element
        ).textAlign,
        host: card.querySelector('.nb-host')?.textContent?.trim() ?? '',
        href: (card as HTMLAnchorElement).href,
        flowMarkPathCount: flowMark.querySelectorAll('path').length,
        headingCenterY: headingBounds.top + headingBounds.height / 2,
        left: bounds.left,
        logoAlt: logo.alt,
        logoCenterY: logoBounds.top + logoBounds.height / 2,
        name: card.querySelector('.nb-name')?.textContent?.trim() ?? '',
        cardBorderBottomWidth: Number.parseFloat(
          getComputedStyle(card).borderBottomWidth
        ),
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      }
    })

    return {
      columnGap: Number.parseFloat(getComputedStyle(element).columnGap),
      gridBorderTopWidth: Number.parseFloat(
        getComputedStyle(element).borderTopWidth
      ),
      gridWidth: gridBounds.width,
      rows,
    }
  })

  expect(metrics.rows).toHaveLength(2)
  expect(metrics.gridBorderTopWidth).toBe(0)
  expect(
    metrics.rows.every(
      ({ cardBorderBottomWidth }) => cardBorderBottomWidth === 0
    )
  ).toBe(true)
  if (isMobile) {
    expect(
      metrics.rows.every(({ width }) => Math.abs(width - metrics.gridWidth) < 1)
    ).toBe(true)
    expect(metrics.rows[1].top).toBeGreaterThanOrEqual(
      metrics.rows[0].bottom - 1
    )
    expect(metrics.rows[1].dividerAfterHeight).toBeGreaterThan(0)
  } else {
    const expectedCardWidth = (metrics.gridWidth - metrics.columnGap * 2) / 3
    expect(
      metrics.rows.every(({ width }) => Math.abs(width - expectedCardWidth) < 1)
    ).toBe(true)
    expect(Math.abs(metrics.rows[1].top - metrics.rows[0].top)).toBeLessThan(1)
    expect(metrics.rows[1].left).toBeGreaterThanOrEqual(metrics.rows[0].right)
    expect(metrics.rows[1].dividerBeforeWidth).toBeGreaterThan(0)
  }
  expect(
    metrics.rows.every(
      ({
        centeredContentOffset,
        description,
        descriptionClipPath,
        descriptionOpacity,
        descriptionWhiteSpace,
        headingTextAlign,
        host,
        href,
        flowMarkPathCount,
        logoAlt,
        name,
      }) =>
        Boolean(description && host && href && logoAlt && name) &&
        flowMarkPathCount === 2 &&
        (isMobile || Math.abs(centeredContentOffset) < 1) &&
        descriptionWhiteSpace === 'normal' &&
        (isMobile
          ? descriptionOpacity === '1' && descriptionClipPath === 'none'
          : descriptionOpacity === '0' &&
            descriptionClipPath.includes('100%')) &&
        headingTextAlign === (isMobile ? 'left' : 'center')
    )
  ).toBe(true)

  await cards.first().hover()
  await expect(cards.first().locator('.nb-name')).toHaveCSS(
    'color',
    'rgb(5, 5, 5)'
  )
  await expect(cards.first().locator('.nb-host')).toHaveCSS(
    'color',
    'rgb(22, 56, 199)'
  )
  await expect(cards.first().locator('.nb-desc')).toHaveCSS('opacity', '1')
  if (isMobile) {
    await expect(cards.first().locator('.nb-desc')).toHaveCSS(
      'clip-path',
      'none'
    )
    await expect(cards.first().locator('.nb-logo')).toHaveCSS('opacity', '1')
  } else {
    await expect(cards.first().locator('.nb-desc')).toHaveCSS(
      'clip-path',
      'inset(0px)'
    )
    await expect(cards.first().locator('.nb-logo')).toHaveCSS('opacity', '0')
    await expect
      .poll(() =>
        cards.first().evaluate((card) => {
          const heading = card
            .querySelector('.nb-heading')!
            .getBoundingClientRect()
          const logo = card.querySelector('.nb-logo')!.getBoundingClientRect()
          const offset =
            heading.top + heading.height / 2 - (logo.top + logo.height / 2)
          return offset > 6 && offset < 10
        })
      )
      .toBe(true)
    const swappedPositions = await cards.first().evaluate((card) => {
      const heading = card.querySelector('.nb-heading')!.getBoundingClientRect()
      const description = card
        .querySelector('.nb-desc')!
        .getBoundingClientRect()
      const logo = card.querySelector('.nb-logo')!.getBoundingClientRect()
      return {
        descriptionCenterY: description.top + description.height / 2,
        headingCenterY: heading.top + heading.height / 2,
        logoCenterY: logo.top + logo.height / 2,
      }
    })
    expect(
      swappedPositions.headingCenterY - swappedPositions.logoCenterY
    ).toBeGreaterThan(6)
    expect(
      swappedPositions.headingCenterY - swappedPositions.logoCenterY
    ).toBeLessThan(10)
    expect(swappedPositions.descriptionCenterY).toBeGreaterThan(
      swappedPositions.headingCenterY
    )
  }
  await cards.first().hover()
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate((card) => getComputedStyle(card, '::after').transform)
    )
    .toMatch(/^matrix\(1, 0, 0, 1, 0, 0\)$/)
  await expect(cards.first().locator('.link-flow-mark')).toHaveCSS(
    'opacity',
    '0.82'
  )
  const flowMarkGeometry = await cards.first().evaluate((card) => {
    const cardBounds = card.getBoundingClientRect()
    const markBounds = card
      .querySelector('.link-flow-mark')!
      .getBoundingClientRect()
    const content = card.querySelector('.nb-centered-content')!
    const mark = card.querySelector('.link-flow-mark')!
    const svg = mark.querySelector('svg')!
    const svgMatrix = svg.getScreenCTM()!
    return {
      contentZIndex: Number.parseInt(getComputedStyle(content).zIndex, 10),
      heightDelta: Math.abs(cardBounds.height - markBounds.height),
      markZIndex: Number.parseInt(getComputedStyle(mark).zIndex, 10),
      rightGap: cardBounds.right - markBounds.right,
      scaleRatio: Math.abs(svgMatrix.a / svgMatrix.d),
    }
  })
  expect(flowMarkGeometry.scaleRatio).toBeCloseTo(1, 2)
  expect(flowMarkGeometry.contentZIndex).toBeGreaterThan(
    flowMarkGeometry.markZIndex
  )
  expect(flowMarkGeometry.heightDelta).toBeLessThan(1)
  expect(flowMarkGeometry.rightGap).toBeGreaterThanOrEqual(0)
  expect(flowMarkGeometry.rightGap).toBeLessThan(10)

  for (const card of await cards.all()) {
    await card.hover()
    await expect(card.locator('.nb-desc')).toHaveCSS('opacity', '1')
    expect(
      await card.evaluate((element) => element.getBoundingClientRect().height)
    ).toBeLessThan(220)
    await expect
      .poll(() =>
        card.locator('.nb-desc').evaluate((description) => {
          const element = description as HTMLElement
          return (
            element.scrollHeight <= element.clientHeight + 1 &&
            element.scrollWidth <= element.clientWidth + 1
          )
        })
      )
      .toBe(true)
  }
})

test('about updates open in two stages and scroll all entries', async ({
  page,
}) => {
  await gotoHomeAboutOverlay(page)
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.entry-overlay-container')).toBeHidden({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const dock = page.locator('.about-update-dock')
  const changelogTrigger = dock
    .locator('.about-update-trigger')
    .filter({ hasText: '更新日志' })
  const roadmapTrigger = dock
    .locator('.about-update-trigger')
    .filter({ hasText: '未来更新' })
  await expect(changelogTrigger).toBeVisible()
  await expect(roadmapTrigger).toBeVisible()
  await expect(
    dock.locator('.about-update-trigger__index, .about-update-trigger svg')
  ).toHaveCount(0)

  const initialScrollTop = await page.evaluate(() => document.body.scrollTop)
  await changelogTrigger.click()
  await expect(changelogTrigger.locator('span')).toHaveCSS(
    'text-decoration-line',
    'underline'
  )
  await expect(
    dock.locator('#about-changelog-panel .update-program__meta > span').first()
  ).toHaveCSS('text-decoration-line', 'none')

  const panel = dock.locator('.about-update-dock__panel')
  const body = panel.locator('.update-program__body')
  const animation = await panel.evaluate((element) => {
    const barDuration = Number.parseFloat(
      getComputedStyle(element).animationDuration
    )
    const bodyDelay = Number.parseFloat(
      getComputedStyle(element.querySelector('.update-program__body')!)
        .animationDelay
    )
    return { barDuration, bodyDelay }
  })
  expect(animation.barDuration).toBeGreaterThan(0)
  expect(animation.bodyDelay).toBeGreaterThanOrEqual(animation.barDuration)
  await expect(panel.locator('.update-program__collapse')).toHaveText('×')

  const titleMetrics = await panel
    .locator('.update-program__bar')
    .evaluate((bar) => {
      const barBounds = bar.getBoundingClientRect()
      const title = bar.querySelector('.update-program__path')!
      const titleBounds = title.getBoundingClientRect()
      return {
        horizontalOffset: Math.abs(
          titleBounds.left +
            titleBounds.width / 2 -
            (barBounds.left + barBounds.width / 2)
        ),
        verticalOffset: Math.abs(
          titleBounds.top +
            titleBounds.height / 2 -
            (barBounds.top + barBounds.height / 2)
        ),
        fontFamily: getComputedStyle(title).fontFamily,
      }
    })
  expect(titleMetrics.horizontalOffset).toBeLessThanOrEqual(1)
  expect(titleMetrics.verticalOffset).toBeLessThanOrEqual(1)
  expect(titleMetrics.fontFamily).toContain('Anton')

  await body.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished)
    )
  })
  await expect(
    panel.locator('#about-changelog-panel .update-program__entry')
  ).toHaveCount(5)
  await expect(
    panel.locator('#about-changelog-panel .update-program__details li')
  ).toHaveCount(30)
  await expect(
    panel.locator('.update-program__navigation, .update-program__counter')
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: '只看重大更新' })).toHaveCount(
    0
  )

  const scroll = await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    return {
      top: element.scrollTop,
      maximum: element.scrollHeight - element.clientHeight,
    }
  })
  expect(scroll.maximum).toBeGreaterThan(0)
  expect(scroll.top).toBeGreaterThan(0)

  await roadmapTrigger.click()
  const roadmapBody = dock.locator('.update-program__body')
  await roadmapBody.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished)
    )
  })
  await expect(
    dock.locator('#about-roadmap-panel .update-program__entry')
  ).toHaveCount(3)
  expect(
    Math.abs(
      (await page.evaluate(() => document.body.scrollTop)) - initialScrollTop
    )
  ).toBeLessThanOrEqual(1)

  await page.mouse.click(5, 5)
  await expect(panel).toHaveCount(0)

  await roadmapTrigger.click()
  await panel.locator('.update-program__collapse').click()
  await expect(panel).toHaveCount(0)
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
