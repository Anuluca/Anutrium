import { expect, type Page, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
  scrollPageToRatio,
} from './helpers/pagePosition'

const PAGE_LOAD_TIMEOUT = 20_000
const MAX_GEOMETRY_DELTA = 1

interface TestRouter {
  push: (path: string) => Promise<void>
  getRoutes: () => Array<{
    path: string
    meta: { pageFooter?: boolean }
  }>
}

type VueAppElement = HTMLElement & {
  __vue_app__?: {
    config: {
      globalProperties: {
        $router: TestRouter
      }
    }
  }
}

const dynamicRouteSamples: Record<string, string> = {
  '/flanerie/:vlogId': '/flanerie/nanchang',
  '/island/image-log/:albumId': '/island/image-log/covid',
  '/island/merch-photography/:collectionId':
    '/island/merch-photography/lucarioNoArm',
}

const navigateWithRouter = async (page: Page, path: string) => {
  await page.evaluate(async (targetPath) => {
    const app = document.querySelector<VueAppElement>('#app')

    await app?.__vue_app__?.config.globalProperties.$router.push(targetPath)
  }, path)

  await expect
    .poll(async () => new URL(page.url()).pathname, {
      timeout: PAGE_LOAD_TIMEOUT,
    })
    .toBe(path)
  await page.waitForTimeout(850)
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
}

const readPageFooterHorizontalGeometry = async (page: Page) =>
  page.locator('.bottom-text').evaluate((footer) => {
    const footerRect = footer.getBoundingClientRect()
    const panelRect = footer
      .querySelector<HTMLElement>('.page-footer-panel')!
      .getBoundingClientRect()
    return {
      appOverflowX: getComputedStyle(
        document.querySelector<HTMLElement>('#app')!
      ).overflowX,
      footerLeft: footerRect.left,
      footerRight: footerRect.right,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
    }
  })

test('PageFooter keeps its geometry after leaving the personal bay', async ({
  page,
}) => {
  await page.goto('/craft', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const directGeometry = await readPageFooterHorizontalGeometry(page)

  await page.evaluate(async () => {
    const app = document.querySelector<VueAppElement>('#app')
    await app?.__vue_app__?.config.globalProperties.$router.push('/test')
  })
  await expect.poll(async () => new URL(page.url()).pathname).toBe('/test')

  await page.evaluate(async () => {
    const app = document.querySelector<VueAppElement>('#app')
    await app?.__vue_app__?.config.globalProperties.$router.push('/craft')
  })
  await expect.poll(async () => new URL(page.url()).pathname).toBe('/craft')
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(850)

  const returnedGeometry = await readPageFooterHorizontalGeometry(page)

  expect(directGeometry.appOverflowX).toBe('visible')
  expect(returnedGeometry.appOverflowX).toBe('visible')
  expect(
    Math.abs(returnedGeometry.footerLeft - directGeometry.footerLeft)
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
  expect(
    Math.abs(returnedGeometry.footerRight - directGeometry.footerRight)
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
  expect(
    Math.abs(returnedGeometry.panelLeft - directGeometry.panelLeft)
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
  expect(
    Math.abs(returnedGeometry.panelRight - directGeometry.panelRight)
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
})

test('every PageFooter route keeps its copyright row clear of FooterCom', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: 2048, height: 900 })
  }
  await page.goto('/404', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#app')).toBeAttached({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const configuredRoutePaths = await page.evaluate(() => {
    const app = document.querySelector<VueAppElement>('#app')
    return (
      app?.__vue_app__?.config.globalProperties.$router
        .getRoutes()
        .filter((route) => route.meta.pageFooter)
        .map((route) => route.path)
        .sort() || []
    )
  })
  const pageFooterRoutes = configuredRoutePaths.map((routePath) => {
    if (!routePath.includes(':')) return routePath

    const samplePath = dynamicRouteSamples[routePath]
    if (!samplePath) {
      throw new Error(
        `${routePath}: add a concrete path to dynamicRouteSamples before enabling pageFooter`
      )
    }
    return samplePath
  })

  for (const path of pageFooterRoutes) {
    await test.step(path, async () => {
      await navigateWithRouter(page, path)
      await page.evaluate(() => {
        document.body.scrollTop = document.body.scrollHeight
      })
      await page.waitForTimeout(100)

      const geometry = await page.locator('.bottom-text').evaluate((footer) => {
        const copyright =
          footer.querySelector<HTMLElement>('.footer-copyright')!
        const license = footer.querySelector<HTMLElement>('.footer-license')!
        const socialList = footer.querySelector<HTMLElement>(
          '.footer-social-links'
        )!
        const socialLinks = Array.from(
          socialList.querySelectorAll<HTMLElement>('.footer-social-links__item')
        )
        const weiboTrigger = socialLinks.find(
          (link) => link.ariaLabel === 'WEIBO'
        )
        const content = footer.querySelector<HTMLElement>(
          '.page-footer-content'
        )!
        const stickyLayer = footer.querySelector<HTMLElement>(
          '.page-footer-sticky-layer'
        )!
        const marquee = footer.querySelector<HTMLElement>('.tl-marquee')!
        const marqueeTrack =
          marquee.querySelector<HTMLElement>('.tl-marquee__inner')!
        const firstMarqueeItem = marquee.querySelector('span')
        const toolLayout =
          document.querySelector<HTMLElement>('.tool-page-layout')
        const toolRecommendationRow = document.querySelector<HTMLElement>(
          '.tool-recommendation-row'
        )
        const pageFooterAnchor = document.querySelector<HTMLElement>(
          '.page-footer-anchor'
        )
        const toolLayoutChildren = toolLayout
          ? Array.from(toolLayout.children)
          : []
        const footerCom = document.querySelector<HTMLElement>('.footer-com')!
        const footerComStyle = getComputedStyle(footerCom)
        const footerStyle = getComputedStyle(footer)
        const footerBackgroundStyle = getComputedStyle(footer, '::before')
        const marqueeStyle = getComputedStyle(marquee)
        const stickyBackgroundStyle = getComputedStyle(stickyLayer, '::before')
        const copyrightRect = copyright.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()
        const stickyLayerRect = stickyLayer.getBoundingClientRect()
        const footerComRect = footerCom.getBoundingClientRect()
        const footerComVisible = footerComStyle.display !== 'none'
        const expectedOffset = footerComVisible
          ? footerComRect.height +
            Math.max(0, window.innerHeight - footerComRect.bottom)
          : 0

        return {
          copyrightBottom: copyrightRect.bottom,
          contentBottom: contentRect.bottom,
          expectedOffset,
          footerComTop: footerComRect.top,
          footerComVisible,
          footerOffset: Number.parseFloat(
            footerStyle.getPropertyValue('--footer-com-offset')
          ),
          footerRootBackground: footerBackgroundStyle.content,
          firstMarqueeItem:
            firstMarqueeItem?.textContent?.trim().replace(/\s+/g, ' ') || '',
          firstMarqueeFont: firstMarqueeItem
            ? getComputedStyle(firstMarqueeItem).fontFamily
            : '',
          layerHeight: stickyLayerRect.height,
          marqueeBackground: marqueeStyle.backgroundImage,
          marqueeTrackCoversViewport:
            marqueeTrack.scrollWidth >= window.innerWidth * 1.2,
          stickyBackground: stickyBackgroundStyle.backgroundImage,
          stickyBackgroundBottom: Number.parseFloat(
            stickyBackgroundStyle.bottom
          ),
          stickyBackgroundTop: Number.parseFloat(stickyBackgroundStyle.top),
          stickyBackgroundWidth: Number.parseFloat(stickyBackgroundStyle.width),
          socialLabels: socialLinks.map((link) => link.ariaLabel),
          platformTags: socialLinks
            .filter((link) =>
              ['STEAM', 'SWITCH'].includes(link.ariaLabel || '')
            )
            .map((link) => link.tagName),
          socialDividerCount: socialList.querySelectorAll(
            '.footer-social-links__divider'
          ).length,
          socialListInsideFooter: footer.contains(socialList),
          socialPopoverCount: socialList.querySelectorAll(
            '.footer-social-links__tooltip, .footer-social-links__weibo-preview'
          ).length,
          weiboTriggerTag: weiboTrigger?.tagName,
          socialListOrder:
            Boolean(
              license.compareDocumentPosition(socialList) &
                Node.DOCUMENT_POSITION_FOLLOWING
            ) &&
            Boolean(
              socialList.compareDocumentPosition(copyright) &
                Node.DOCUMENT_POSITION_FOLLOWING
            ),
          toolRecommendationInsideFooter: Boolean(
            footer.querySelector('.tool-recommendation-row')
          ),
          toolRecommendationRowCount: document.querySelectorAll(
            '.tool-recommendation-row'
          ).length,
          toolRecommendationRowPrecedesFooterAnchor:
            !toolLayout ||
            toolLayoutChildren.indexOf(toolRecommendationRow!) <
              toolLayoutChildren.indexOf(pageFooterAnchor!),
          usesToolPageLayout: Boolean(toolLayout),
          contentHeight: contentRect.height,
          viewportWidth: window.innerWidth,
        }
      })

      expect(
        geometry.footerRootBackground,
        `${path}: shared root background`
      ).toBe('none')
      expect(geometry.firstMarqueeItem, `${path}: shared marquee content`).toBe(
        'ANUTRIUM 路卡庭院'
      )
      expect(
        geometry.firstMarqueeFont,
        `${path}: marquee font family`
      ).toContain('cn-custom')
      expect(
        geometry.marqueeBackground,
        `${path}: marquee background`
      ).not.toBe('none')
      expect(
        geometry.marqueeTrackCoversViewport,
        `${path}: marquee track must cover the viewport`
      ).toBe(true)
      expect(geometry.stickyBackground, `${path}: sticky background`).not.toBe(
        'none'
      )
      expect(
        Math.abs(geometry.stickyBackgroundTop),
        `${path}: sticky background top edge`
      ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
      expect(
        Math.abs(geometry.stickyBackgroundBottom),
        `${path}: sticky background bottom edge`
      ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
      expect(
        Math.abs(geometry.stickyBackgroundWidth - geometry.viewportWidth),
        `${path}: sticky background viewport width`
      ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
      expect(
        geometry.toolRecommendationInsideFooter,
        `${path}: tool recommendation must stay outside PageFooter`
      ).toBe(false)
      expect(geometry.socialListInsideFooter, `${path}: social list`).toBe(true)
      expect(
        geometry.socialListOrder,
        `${path}: social list order`
      ).toBeTruthy()
      expect(geometry.socialLabels, `${path}: social link order`).toEqual([
        'X',
        'WEIBO',
        'BILIBILI',
        'GITHUB',
        'MAIL',
        'STEAM',
        'SWITCH',
      ])
      expect(geometry.platformTags, `${path}: platform logo elements`).toEqual([
        'BUTTON',
        'BUTTON',
      ])
      expect(geometry.socialDividerCount, `${path}: platform divider`).toBe(1)
      expect(geometry.weiboTriggerTag, `${path}: weibo modal trigger`).toBe(
        'BUTTON'
      )
      expect(geometry.socialPopoverCount, `${path}: social popovers`).toBe(0)

      if (geometry.usesToolPageLayout) {
        expect(
          geometry.toolRecommendationRowCount,
          `${path}: tool recommendation row`
        ).toBe(1)
        expect(
          geometry.toolRecommendationRowPrecedesFooterAnchor,
          `${path}: tool recommendation/footer order`
        ).toBe(true)
      } else {
        expect(
          geometry.toolRecommendationRowCount,
          `${path}: non-tool recommendation row`
        ).toBe(0)
      }

      expect(
        Math.abs(geometry.footerOffset - geometry.expectedOffset),
        `${path}: FooterCom offset`
      ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
      expect(
        geometry.layerHeight + MAX_GEOMETRY_DELTA,
        `${path}: sticky layer height`
      ).toBeGreaterThanOrEqual(geometry.contentHeight)

      if (geometry.footerComVisible) {
        expect(
          geometry.copyrightBottom - geometry.footerComTop,
          `${path}: copyright/FooterCom boundary`
        ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
        expect(
          geometry.contentBottom - geometry.footerComTop,
          `${path}: content/FooterCom boundary`
        ).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
      }
    })
  }
})

test('footer social links expand horizontally on hover', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })
  await page.waitForTimeout(850)

  const socialItem = page.locator(
    '.footer-social-links__item[aria-label="WEIBO"]'
  )
  const socialItems = page.locator('.footer-social-links__item')
  const label = socialItem.locator('.footer-social-links__label')
  const collapsedWidth = await socialItem.evaluate(
    (element) => element.getBoundingClientRect().width
  )
  const initialPositions = await socialItems.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().x)
  )

  await socialItem.hover()
  const positionSamples: number[][] = []
  for (let frame = 0; frame < 8; frame += 1) {
    await page.waitForTimeout(60)
    positionSamples.push(
      await socialItems.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().x)
      )
    )
  }

  const expandedState = await socialItem.evaluate((element) => {
    const labelElement = element.querySelector<HTMLElement>(
      '.footer-social-links__label'
    )!

    return {
      width: element.getBoundingClientRect().width,
      labelOpacity: Number.parseFloat(getComputedStyle(labelElement).opacity),
    }
  })

  await expect(label).toHaveText('WEIBO')
  expect(expandedState.width).toBeGreaterThan(collapsedWidth + 20)
  expect(expandedState.labelOpacity).toBe(1)

  const finalPositions = positionSamples.at(-1)!
  finalPositions.forEach((finalPosition, itemIndex) => {
    const lowerBound = Math.min(initialPositions[itemIndex], finalPosition) - 1
    const upperBound = Math.max(initialPositions[itemIndex], finalPosition) + 1

    positionSamples.forEach((sample) => {
      expect(sample[itemIndex]).toBeGreaterThanOrEqual(lowerBound)
      expect(sample[itemIndex]).toBeLessThanOrEqual(upperBound)
    })
  })
})

test('mobile footer social link bar uses enlarged tap targets', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })
  await page.waitForTimeout(850)

  const geometry = await page
    .locator('.footer-social-links')
    .evaluate((bar) => {
      const items = Array.from(
        bar.querySelectorAll<HTMLElement>('.footer-social-links__item')
      )
      const icons = Array.from(
        bar.querySelectorAll<SVGElement>('.footer-social-links__icon')
      )
      const barRect = bar.getBoundingClientRect()

      return {
        barWidth: barRect.width,
        iconSizes: icons.map((icon) => icon.getBoundingClientRect().width),
        itemSizes: items.map((item) => item.getBoundingClientRect().width),
        viewportWidth: window.innerWidth,
      }
    })

  expect(geometry.itemSizes).toHaveLength(7)
  geometry.itemSizes.forEach((size) => {
    expect(size).toBeGreaterThanOrEqual(32)
    expect(size).toBeLessThanOrEqual(36)
  })
  geometry.iconSizes.forEach((size) => {
    expect(size).toBeGreaterThanOrEqual(14)
  })
  expect(geometry.barWidth).toBeLessThanOrEqual(geometry.viewportWidth)
})

test('footer modal preserves the page position while open and after closing', async ({
  page,
}) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(850)
  await scrollPageToRatio(page, 0.6)

  const initialPosition = await readPagePosition(page, '.about-page')
  const trigger = page.locator('.footer-social-links__item[aria-label="WEIBO"]')
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const modal = page.locator('.modal-wrapper-dialog')
  await expect(modal).toBeVisible()
  await page.waitForTimeout(550)

  expectPagePositionToMatch(
    await readPagePosition(page, '.about-page'),
    initialPosition,
    MAX_GEOMETRY_DELTA
  )

  await page.mouse.wheel(0, -600)
  await page.waitForTimeout(150)
  expectPagePositionToMatch(
    await readPagePosition(page, '.about-page'),
    initialPosition,
    MAX_GEOMETRY_DELTA
  )

  await modal.locator('.diamond-close-btn').click()
  await expect(modal).toBeHidden()
  await page.waitForTimeout(100)

  expectPagePositionToMatch(
    await readPagePosition(page, '.about-page'),
    initialPosition,
    MAX_GEOMETRY_DELTA
  )
})

test('footer logo rotation tracks the entire footer area', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })

  const footer = page.locator('.bottom-text')
  const logo = footer.locator('.footer-logo')
  const copyrightBox = await footer.locator('.footer-copyright').boundingBox()
  const logoButtonBox = await footer.locator('.footer-logo-link').boundingBox()

  expect(copyrightBox).not.toBeNull()
  expect(logoButtonBox).not.toBeNull()

  const pointerX = copyrightBox!.x + 12
  const pointerY = copyrightBox!.y + copyrightBox!.height / 2
  expect(pointerY).toBeGreaterThan(logoButtonBox!.y + logoButtonBox!.height)

  await page.mouse.move(pointerX, pointerY)
  await expect
    .poll(() => logo.getAttribute('style'))
    .not.toContain('rotateX(0deg) rotateY(0deg)')
})

test('Switch logo opens a copyable friend-code panel', async ({
  context,
  page,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:3000',
  })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })

  const trigger = page.locator(
    '.footer-social-links__item[aria-label="SWITCH"]'
  )
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const panel = page.locator('.switch-friend-panel')
  const openLink = panel.locator('.switch-friend-panel__open')
  await expect(panel).toBeVisible()
  await page.waitForTimeout(300)
  const profile = panel.locator('.switch-friend-panel__profile')
  await expect(profile.locator('img')).toHaveAttribute(
    'src',
    'https://assets.anuluca.com/other/IMG_5544(20260810-095343).png'
  )
  await expect(profile.locator('strong')).toHaveText('Anuluca')
  await expect(panel.locator('code')).toHaveText('SW code: SW-8028-6615-7213')
  await expect(openLink).toHaveAttribute(
    'href',
    'https://lounge.nintendo.com/friendcode/8028-6615-7213/DKT8GWxQWQ'
  )
  await expect(openLink).toHaveAttribute('target', '_blank')
  await expect(openLink).toHaveText('跳转到 Nintendo Switch App')

  const panelGeometry = await panel.evaluate((element) => {
    const panelRect = element.getBoundingClientRect()
    const triggerRect = document
      .querySelector<HTMLElement>(
        '.footer-social-links__item[aria-label="SWITCH"]'
      )!
      .getBoundingClientRect()
    const switchIconRect = document
      .querySelector<HTMLElement>(
        '.footer-social-links__item[aria-label="SWITCH"] .footer-social-links__icon'
      )!
      .getBoundingClientRect()
    const marqueeRect = document
      .querySelector<HTMLElement>('.tl-marquee')!
      .getBoundingClientRect()
    const stickyClip = document.querySelector<HTMLElement>(
      '.page-footer-sticky-clip'
    )!
    const topmostElement = document.elementFromPoint(
      panelRect.left + panelRect.width / 2,
      panelRect.top + 2
    )
    const openLinkRect = element
      .querySelector<HTMLElement>('.switch-friend-panel__open')!
      .getBoundingClientRect()

    const code = element.querySelector<HTMLElement>('code')!
    const codeLabel = element.querySelector<HTMLElement>(
      '.switch-friend-panel__code-label'
    )!
    const profileImage = element.querySelector<HTMLElement>(
      '.switch-friend-panel__profile img'
    )!
    const profileName = element.querySelector<HTMLElement>(
      '.switch-friend-panel__profile strong'
    )!
    const copyButton = element.querySelector<HTMLElement>(
      '.switch-friend-panel__copy'
    )!
    const copyButtonRect = copyButton.getBoundingClientRect()
    const openLinkStyle = getComputedStyle(
      element.querySelector<HTMLElement>('.switch-friend-panel__open')!
    )
    const panelStyle = getComputedStyle(element)

    return {
      isAboveTrigger: panelRect.bottom <= triggerRect.top,
      extendsAboveMarquee: panelRect.top < marqueeRect.bottom,
      panelIsTopmost:
        topmostElement === element || element.contains(topmostElement),
      panelWithinViewport:
        panelRect.left >= 0 && panelRect.right <= window.innerWidth,
      pageCenterDelta: Math.abs(
        panelRect.left + panelRect.width / 2 - window.innerWidth / 2
      ),
      copyButtonWithinViewport:
        copyButtonRect.left >= 0 && copyButtonRect.right <= window.innerWidth,
      topmostElement: topmostElement
        ? `${topmostElement.tagName}.${topmostElement.className}`
        : 'none',
      stickyClipPath: getComputedStyle(stickyClip).clipPath,
      iconCenterDelta: Math.abs(
        panelRect.left +
          panelRect.width / 2 -
          (switchIconRect.left + switchIconRect.width / 2)
      ),
      openButtonWidth: openLinkRect.width,
      codeLabelColor: getComputedStyle(codeLabel).color,
      codeFitsInline: code.scrollWidth <= code.clientWidth + 1,
      codeFontSize: Number.parseFloat(getComputedStyle(code).fontSize),
      profileImageSize: profileImage.getBoundingClientRect().width,
      profileNameFontSize: Number.parseFloat(
        getComputedStyle(profileName).fontSize
      ),
      codeTextAlign: getComputedStyle(code).textAlign,
      copyButtonBorderWidth: Number.parseFloat(
        getComputedStyle(copyButton).borderWidth
      ),
      openButtonFontFamily: openLinkStyle.fontFamily,
      openButtonFontSize: Number.parseFloat(openLinkStyle.fontSize),
      openButtonFontWeight: Number.parseInt(openLinkStyle.fontWeight, 10),
      openButtonBackgroundColor: openLinkStyle.backgroundColor,
      openButtonRadius: Number.parseFloat(openLinkStyle.borderRadius),
      panelRadius: Number.parseFloat(panelStyle.borderRadius),
      rootFontSize: Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize
      ),
      panelInnerWidth:
        panelRect.width -
        Number.parseFloat(getComputedStyle(element).paddingLeft) -
        Number.parseFloat(getComputedStyle(element).paddingRight) -
        Number.parseFloat(getComputedStyle(element).borderLeftWidth) -
        Number.parseFloat(getComputedStyle(element).borderRightWidth),
    }
  })
  expect(panelGeometry.isAboveTrigger).toBe(true)
  expect(panelGeometry.extendsAboveMarquee).toBe(true)
  expect(
    panelGeometry.panelIsTopmost,
    `topmost element: ${panelGeometry.topmostElement}; clip: ${panelGeometry.stickyClipPath}`
  ).toBe(true)
  if (testInfo.project.name === 'mobile-chrome') {
    const responsivePixel = (sourcePixels: number) =>
      (sourcePixels / 30) * panelGeometry.rootFontSize
    expect(panelGeometry.panelWithinViewport).toBe(true)
    expect(panelGeometry.pageCenterDelta).toBeLessThanOrEqual(1)
    expect(panelGeometry.copyButtonWithinViewport).toBe(true)
    expect(panelGeometry.codeFitsInline).toBe(true)
    expect(panelGeometry.profileImageSize).toBeCloseTo(responsivePixel(148), 0)
    expect(panelGeometry.profileNameFontSize).toBeCloseTo(
      responsivePixel(30),
      0
    )
    expect(panelGeometry.codeFontSize).toBeCloseTo(responsivePixel(28), 0)
    expect(panelGeometry.openButtonFontSize).toBeCloseTo(responsivePixel(24), 0)
  } else {
    expect(panelGeometry.iconCenterDelta).toBeLessThanOrEqual(1)
  }
  expect(panelGeometry.codeLabelColor).toBe('rgb(205, 40, 34)')
  expect(panelGeometry.codeTextAlign).toBe('left')
  expect(panelGeometry.copyButtonBorderWidth).toBe(0)
  expect(panelGeometry.openButtonFontFamily).toContain('alibaba-puhuiti')
  expect(panelGeometry.openButtonFontWeight).toBeGreaterThanOrEqual(800)
  expect(panelGeometry.openButtonBackgroundColor).toBe('rgb(205, 40, 34)')
  expect(panelGeometry.openButtonRadius).toBeGreaterThan(0)
  expect(panelGeometry.openButtonRadius).toBeLessThan(6)
  expect(panelGeometry.panelRadius).toBeGreaterThan(0)
  expect(panelGeometry.panelRadius).toBeLessThan(8)
  expect(panelGeometry.openButtonWidth).toBeCloseTo(
    panelGeometry.panelInnerWidth,
    0
  )

  const copyButton = panel.locator('.switch-friend-panel__copy')
  await copyButton.click()
  await expect(copyButton).toHaveAttribute('aria-label', '好友码已复制')
  await expect(page.locator('.el-message--success').last()).toContainText(
    'SW 好友码复制成功'
  )
  if (testInfo.project.name === 'mobile-chrome') {
    const messageGeometry = await page
      .locator('.el-message--success')
      .last()
      .evaluate((element) => {
        const messageBounds = element.getBoundingClientRect()
        const headerBounds = document
          .querySelector<HTMLElement>('.el-menu-layout-all')!
          .getBoundingClientRect()

        return {
          gap: messageBounds.top - headerBounds.bottom,
          headerBottom: headerBounds.bottom,
          inlineTop: (element as HTMLElement).style.top,
          messageTop: messageBounds.top,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }
      })
    expect(
      messageGeometry.gap,
      JSON.stringify(messageGeometry)
    ).toBeGreaterThanOrEqual(11)
  }
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('SW-8028-6615-7213')

  const copyButtonVisuals = await copyButton.evaluate((element) => {
    const iconPath = document.querySelector<SVGPathElement>(
      '.switch-friend-panel__open-icon path'
    )!

    return {
      backgroundColor: getComputedStyle(element).backgroundColor,
      connectionStrokeWidth: Number.parseFloat(
        getComputedStyle(iconPath).strokeWidth
      ),
    }
  })
  expect(copyButtonVisuals.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(copyButtonVisuals.connectionStrokeWidth).toBeGreaterThan(20)

  const englishButton = page.locator('.footer-com .language button').last()
  await englishButton.evaluate((element: HTMLButtonElement) => element.click())
  await expect(englishButton).toBeDisabled()
  const englishCopyButton = page.locator('.switch-friend-panel__copy')
  await expect(englishCopyButton).toBeVisible()
  await englishCopyButton.evaluate((element: HTMLButtonElement) =>
    element.click()
  )
  await expect(page.locator('.el-message--success').last()).toContainText(
    'SW friend code copied'
  )

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
})

test('WEIBO opens its widget in a modal without social popovers', async ({
  page,
}) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(
    page.locator(
      '.footer-social-links__tooltip, .footer-social-links__weibo-preview'
    )
  ).toHaveCount(0)
  await expect(page.locator('.footer-com .social-preview')).toHaveCount(0)
  const footerComSocialOrder = await page
    .locator('.footer-com .text-links .social-trigger')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('aria-label'))
    )
  expect(footerComSocialOrder).toEqual([
    'X / TWITTER',
    'WEIBO',
    'BILIBILI',
    'GITHUB',
    'MAIL',
  ])

  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })
  await page.locator('.footer-social-links__item[aria-label="WEIBO"]').click()

  const modal = page.locator('.modal-wrapper-dialog')
  await expect(modal).toBeVisible()
  await expect(modal.locator('iframe')).toHaveAttribute(
    'src',
    /uid=8248788427&verifier=4357a699/
  )
  await expect(modal.locator('iframe')).toHaveClass(/no-cursor/)

  const closePlacement = await modal.evaluate((dialog) => {
    const dialogRect = dialog.getBoundingClientRect()
    const closeRect = dialog
      .querySelector<HTMLElement>('.diamond-close-btn')!
      .getBoundingClientRect()

    return {
      centerDelta: Math.abs(
        closeRect.left +
          closeRect.width / 2 -
          (dialogRect.left + dialogRect.width / 2)
      ),
      outsideBottom: closeRect.top >= dialogRect.bottom,
    }
  })

  expect(closePlacement.centerDelta).toBeLessThanOrEqual(MAX_GEOMETRY_DELTA)
  expect(closePlacement.outsideBottom).toBe(true)

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(modal.locator('iframe')).toHaveCount(0)
})

test('STEAM opens the aggregated profile modal', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:3000',
  })
  await page.route(
    'https://anutrium-steam-api.tilucario.workers.dev/profile',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
        },
        body: JSON.stringify({
          meta: {
            steamId: '76561198000000000',
            vanity: 'anuluca',
            profileUrl: 'https://steamcommunity.com/id/anuluca/',
            updatedAt: '2026-08-10T10:00:00.000Z',
            unavailable: {},
          },
          profile: {
            steamid: '76561198000000000',
            communityvisibilitystate: 3,
            personaname: 'Anuluca',
            profileurl: 'https://steamcommunity.com/id/anuluca/',
            avatar: 'https://example.com/avatar.jpg',
            avatarmedium: 'https://example.com/avatar.jpg',
            avatarfull: 'https://example.com/avatar.jpg',
            personastate: 1,
            timecreated: 1262304000,
            lastlogoff: 1786352400,
            loccountrycode: 'CN',
          },
          ownedGames: {
            game_count: 60,
            games: [
              {
                appid: 10,
                name: 'Test Game One',
                playtime_forever: 600,
                rtime_last_played: 1786352400,
              },
              {
                appid: 20,
                name: 'Test Game Two',
                playtime_forever: 120,
              },
              ...Array.from({ length: 58 }, (_, index) => ({
                appid: index + 30,
                name: `Test Game ${index + 3}`,
                playtime_forever: 119 - index,
              })),
            ],
          },
          recentGames: {
            total_count: 5,
            games: [
              {
                appid: 10,
                name: 'Test Game One',
                capsule_image:
                  'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/10/custom/capsule_231x87_schinese.jpg',
                playtime_forever: 600,
                playtime_2weeks: 90,
              },
              ...Array.from({ length: 4 }, (_, index) => ({
                appid: index + 101,
                name: `Recent Game ${index + 2}`,
                playtime_forever: 300 - index,
                playtime_2weeks: 60 - index,
              })),
            ],
          },
          level: { player_level: 42 },
        }),
      })
    }
  )

  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.bottom-text')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })
  await page
    .locator('.footer-social-links__item[aria-label="STEAM"]')
    .evaluate((element: HTMLButtonElement) => element.click())

  const modal = page.locator('.modal-wrapper-dialog').filter({
    has: page.locator('.steam-profile-panel'),
  })
  await expect(modal).toBeVisible()
  await expect(modal.locator('.steam-profile-identity h2')).toHaveText(
    'Anuluca'
  )
  const avatarStyle = await modal
    .locator('.steam-profile-header > img')
    .evaluate((element) => ({
      borderRadius: Number.parseFloat(getComputedStyle(element).borderRadius),
      borderColor: getComputedStyle(element).borderColor,
      marginTop: Number.parseFloat(getComputedStyle(element).marginTop),
    }))
  expect(avatarStyle.borderRadius).toBe(0)
  expect(avatarStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(avatarStyle.marginTop).toBeGreaterThan(0)
  const externalButton = modal.locator('.steam-profile-external')
  await expect(externalButton.locator('.el-icon')).toHaveCount(1)
  const externalAlignment = await externalButton.evaluate((element) => ({
    alignItems: getComputedStyle(element).alignItems,
    width: element.getBoundingClientRect().width,
    panelWidth: element.parentElement?.getBoundingClientRect().width || 0,
  }))
  expect(externalAlignment.alignItems).toBe('center')
  expect(externalAlignment.width).toBeCloseTo(externalAlignment.panelWidth, 0)
  await expect(
    modal.locator('.steam-profile-scroll + .steam-profile-external')
  ).toBeVisible()
  await expect(modal.locator('.steam-profile-level')).toContainText('42')
  await expect(modal.locator('.steam-profile-stats')).not.toContainText('42')
  await expect(modal.locator('.steam-recent-games')).toContainText(
    'Test Game One'
  )
  await expect(modal.locator('.steam-recent-games a')).toHaveCount(3)
  const recentGameVisuals = await modal
    .locator('.steam-recent-games a')
    .first()
    .evaluate((element) => ({
      backgroundImage: getComputedStyle(
        element.querySelector('.steam-recent-game-image') as HTMLElement
      ).backgroundImage,
      overlay: getComputedStyle(element, '::after').backgroundImage,
      borderWidth: Number.parseFloat(getComputedStyle(element).borderWidth),
      cardWidth: element.getBoundingClientRect().width,
      textWidth: (
        element.querySelector(':scope > div') as HTMLElement
      ).getBoundingClientRect().width,
    }))
  expect(recentGameVisuals.overlay).toContain('linear-gradient')
  expect(recentGameVisuals.backgroundImage).toContain(
    '/steam/apps/10/custom/capsule_231x87_schinese.jpg'
  )
  expect(recentGameVisuals.borderWidth).toBe(0)
  expect(recentGameVisuals.textWidth).toBeGreaterThan(
    recentGameVisuals.cardWidth * 0.85
  )
  await expect(modal.locator('.steam-profile-tabs button')).toHaveCount(2)
  await expect(modal.locator('.steam-profile-kicker')).toHaveCount(0)
  await expect(modal.locator('.steam-profile-private-note')).toHaveCount(0)

  const friendCodeRow = modal.locator('.steam-profile-details dd.is-copyable')
  await expect(friendCodeRow).toContainText('326757638')
  const detailRowHeights = await modal
    .locator('.steam-profile-details dt, .steam-profile-details dd')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height)
    )
  expect(
    Math.max(...detailRowHeights) - Math.min(...detailRowHeights)
  ).toBeLessThan(0.1)
  await friendCodeRow.locator('.steam-profile-copy').click()
  await expect(page.locator('.el-message--success').last()).toContainText(
    'Steam 好友码复制成功'
  )
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('326757638')

  await modal.locator('.steam-profile-tabs button').nth(1).click()
  await expect(modal.locator('.steam-game-row')).toHaveCount(30)
  const gameSearch = modal.locator('.steam-game-search input')
  await gameSearch.fill('Test Game One')
  await expect(modal.locator('.steam-game-row')).toHaveCount(1)
  await expect(modal.locator('.steam-game-row')).toContainText('Test Game One')
  await expect(modal.locator('.steam-profile-more')).toHaveCount(0)
  await gameSearch.fill('')
  await expect(modal.locator('.steam-game-row')).toHaveCount(30)

  const backgroundScrollTop = await page.evaluate(() => document.body.scrollTop)
  const profileScroll = modal.locator('.steam-profile-scroll')
  const modalScrollRegion = modal.locator('.modal-scroll-region')
  await profileScroll.hover()
  await page.mouse.wheel(0, 600)
  await expect
    .poll(async () =>
      Math.max(
        await profileScroll.evaluate((element) => element.scrollTop),
        await modalScrollRegion.evaluate((element) => element.scrollTop)
      )
    )
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(
    backgroundScrollTop
  )

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('PageFooter stays outside the route scale transition', async ({
  page,
}) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#page-footer-portal > .bottom-text')).toHaveCount(
    1,
    { timeout: PAGE_LOAD_TIMEOUT }
  )

  await page.evaluate(() => {
    const app = document.querySelector<VueAppElement>('#app')
    void app?.__vue_app__?.config.globalProperties.$router.push('/archive')
  })

  await expect(page.locator('.route-enter-active')).toHaveCount(1, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const isolation = await page.evaluate(() => {
    const routeRoot = document.querySelector<HTMLElement>(
      '.route-enter-active'
    )!
    const footers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '#page-footer-portal > .bottom-text'
      )
    )
    const activeFooter = footers.at(-1)!

    return {
      activeFooterTransform: getComputedStyle(activeFooter).transform,
      footerInAnimatedRoute: Boolean(
        activeFooter.closest('.route-enter-active')
      ),
      footerParentId: activeFooter.parentElement?.id,
      routeTransform: getComputedStyle(routeRoot).transform,
      visibleFooterCount: footers.filter(
        (footer) => getComputedStyle(footer).display !== 'none'
      ).length,
    }
  })

  expect(isolation.routeTransform).not.toBe('none')
  expect(isolation.footerParentId).toBe('page-footer-portal')
  expect(isolation.footerInAnimatedRoute).toBe(false)
  expect(isolation.activeFooterTransform).toBe('none')
  expect(isolation.visibleFooterCount).toBe(1)
})
