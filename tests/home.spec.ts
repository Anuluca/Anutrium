import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

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
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(lockedScrollPosition)
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
    const haloStyle = getComputedStyle(container, '::before')

    return {
      contextAvailable: !!gl,
      renderer: canvas.dataset.renderer,
      starCount: Number(canvas.dataset.starCount),
      targetFps: Number(canvas.dataset.targetFps),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      maxBackingWidth: Math.ceil(rect.width * 1.5),
      maxBackingHeight: Math.ceil(rect.height * 1.5),
      haloBackground: haloStyle.backgroundImage,
      haloAnimation: haloStyle.animationName,
      haloFilter: haloStyle.filter,
    }
  })

  expect(metrics.contextAvailable).toBe(true)
  expect(metrics.renderer).toBe('webgl')
  expect(metrics.starCount).toBe(140)
  expect(metrics.targetFps).toBeLessThanOrEqual(30)
  expect(metrics.backingWidth).toBeLessThanOrEqual(metrics.maxBackingWidth)
  expect(metrics.backingHeight).toBeLessThanOrEqual(metrics.maxBackingHeight)
  expect(metrics.haloBackground).toContain('rgba(0, 216, 143, 0.06)')
  expect(metrics.haloBackground).toContain('rgba(154, 118, 255, 0.08)')
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
    () => document.documentElement.scrollHeight - window.innerHeight
  )
  test.skip(maxScrollTop < 300, 'Page is not tall enough to test scrolling')

  const expectedScrollTop = Math.min(700, maxScrollTop)
  await page.evaluate((top) => window.scrollTo(0, top), expectedScrollTop)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
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
        (expected) => Math.abs(window.scrollY - expected),
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
    const items = [...block.querySelectorAll('.timeline-item')]
    const headerStyle = getComputedStyle(
      block.querySelector('.section-header') as Element
    )
    const passionStyle = getComputedStyle(
      block.parentElement?.querySelector('.passion-section') as Element
    )
    const neighborsBlock =
      block.parentElement?.parentElement?.querySelector('.neighbors-block')
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
      neighborsBlockName: neighborsBlockStyle.animationName,
      neighborsBlockDelay: Number.parseFloat(
        neighborsBlockStyle.animationDelay
      ),
    }
  })

  expect(animation.headerName).toContain('changelogHeaderIn')
  expect(animation.passionName).toContain('passionCrtOn')
  expect(animation.passionDelay).toBeGreaterThan(animation.headerDelay)
  expect(animation.passionDelay - animation.headerDelay).toBeLessThanOrEqual(
    0.2
  )
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
