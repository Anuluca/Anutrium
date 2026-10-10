import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  await page.emulateMedia({
    reducedMotion:
      testInfo.title.includes('fades') || testInfo.title.includes('focus aims')
        ? 'no-preference'
        : 'reduce',
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
})

test('home centers its icon, then exposes scene shortcuts and enables all pillars', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
  await expect(page.locator('.desktop-menu, .mobile-menu-icon')).toHaveCount(0)
  const pillars = page.locator('.temple-obelisk')
  await expect(pillars).toHaveCount(4)
  for (const id of ['island', 'pokeyard']) {
    await expect(page.locator(`[data-obelisk="${id}"]`)).toBeEnabled()
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      id
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await page.keyboard.press('Escape')
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
  }
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.current-module-name')).toHaveCount(1)
  await expect(page.locator('.current-module-name')).toHaveText('ARCHIVE')
  if (mobile) await page.locator('.mobile-menu-icon').click()
  const actions = page.locator(
    mobile
      ? '.mobile-menu-items .temple-nav-action'
      : '.menu-box .temple-nav-action'
  )
  await expect(actions).toHaveCount(5)
  expect(
    await actions.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-temple-nav'))
    )
  ).toEqual(['archive', 'flanerie', 'pokeyard', 'island', 'about'])
  await expect(actions.filter({ hasText: 'POKÉYARD' })).toBeEnabled()
  await page
    .locator(
      `${
        mobile ? '.mobile-menu-items' : '.menu-box'
      } [data-temple-nav="flanerie"]`
    )
    .click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
})

test('embedded portfolio uses a desktop side detail and keeps mobile and expanded dialogs', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const mobile = testInfo.project.name.includes('mobile')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const panel = page.locator('.temple-focus-content .scroll-viewport__scroll')
  const card = panel.locator('.shared-work-card').first()
  await expect(card).toBeVisible({ timeout: 20000 })
  const initial = await page.locator('.temple-page').boundingBox()
  const panelBox = (await panel.boundingBox())!
  const viewport = page.viewportSize()!
  if (mobile) expect(panelBox.width).toBeGreaterThan(viewport.width * 0.8)
  else {
    expect(panelBox.width).toBeGreaterThan(viewport.width * 0.44)
    expect(panelBox.width).toBeLessThan(viewport.width * 0.5)
  }
  const before = await panel.evaluate((el) => el.scrollTop)
  await page.mouse.move(
    panelBox.x + panelBox.width / 2,
    panelBox.y + panelBox.height / 2
  )
  await page.mouse.wheel(0, 450)
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(before)
  expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
  await panel.evaluate((el) => {
    el.scrollTop = 0
  })
  await card.click()
  const modal = page.locator('.el-dialog')
  const detail = mobile ? modal : page.locator('.work-detail-inline')
  await expect(detail).toBeVisible()
  if (!mobile) {
    await expect(modal).toBeHidden()
    await expect(detail.locator('.diamond-close-btn')).toHaveCount(0)
    const summaryTops = await detail
      .locator('.aside-summary > .aside-field')
      .evaluateAll((fields) =>
        fields.map((field) => field.getBoundingClientRect().top)
      )
    expect(summaryTops).toHaveLength(3)
    expect(
      Math.max(...summaryTops) - Math.min(...summaryTops)
    ).toBeLessThanOrEqual(1)
    const layout = await detail.evaluate((el) => {
      const rect = (selector: string) =>
        el.querySelector(selector)!.getBoundingClientRect()
      const gallery = rect('.gallery-track-wrap')
      const links = Array.from(el.querySelectorAll('.link-item')).map((link) =>
        link.getBoundingClientRect()
      )
      return {
        galleryBottom: gallery.bottom,
        galleryRatio: gallery.width / gallery.height,
        titleTop: rect('.aside-title').top,
        confidentialTop: rect('.confidential-notice').top,
        detailsBottom: rect('.details-section').bottom,
        summaryGap: getComputedStyle(el.querySelector('.aside-summary')!)
          .columnGap,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        links: links.map(({ top, width }) => ({ top, width })),
      }
    })
    expect(layout.galleryBottom).toBeLessThan(layout.titleTop)
    expect(layout.galleryRatio).toBeCloseTo(16 / 9, 2)
    expect(layout.confidentialTop).toBeGreaterThan(layout.detailsBottom)
    expect(parseFloat(layout.summaryGap)).toBeCloseTo(
      parseFloat(layout.rootFontSize) * (32 / 30),
      1
    )
    expect(layout.links).toHaveLength(2)
    expect(layout.links[0].top).toBeCloseTo(layout.links[1].top, 0)
    expect(layout.links[0].width).toBeCloseTo(layout.links[1].width, 0)
    await expect(detail.locator('.gallery-slide img').first()).toHaveCSS(
      'object-fit',
      'contain'
    )
    const detailBox = (await detail.boundingBox())!
    expect(Math.abs(detailBox.y - panelBox.y)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(detailBox.y + detailBox.height - (panelBox.y + panelBox.height))
    ).toBeLessThanOrEqual(1)
    const companyBox = (await detail.locator('.aside-company').boundingBox())!
    expect(Math.abs(companyBox.x - detailBox.x)).toBeLessThanOrEqual(1)
    expect(detailBox.x).toBeGreaterThanOrEqual(0)
    expect(detailBox.x + detailBox.width).toBeLessThanOrEqual(
      viewport.width / 2
    )
    const secondCard = panel.locator('.shared-work-card').nth(1)
    const secondTitle = (await secondCard.locator('strong').textContent())!
    await secondCard.click()
    await expect(detail).toHaveAttribute('aria-label', secondTitle)
    const image = detail.locator('.gallery-slide').first()
    if (await image.count()) {
      await image.click()
      await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
      expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
      await page.keyboard.press('Escape')
      await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
      await expect(detail).toBeVisible()
    }
  }
  for (const selector of [
    '.aside-company-name',
    '.field-label',
    '.project-share-button',
  ])
    await expect(detail.locator(selector).first()).toHaveCSS(
      'color',
      'rgb(50, 118, 254)'
    )
  expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
  if (!mobile) {
    await card.click()
    await expect(detail).toBeVisible()
    await page.locator('.temple-expand').click()
    await expect(detail).toHaveCount(0)
    await expect(modal).toBeHidden()
    await expect(page.locator('.temple-menu')).toHaveAttribute(
      'aria-busy',
      'false'
    )
    await card.click()
    await expect(modal).toBeVisible()
    await expect(modal.locator('.diamond-close-btn')).toBeVisible()
    await expect(modal.locator('.aside-summary')).toHaveCSS('display', 'flex')
    expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
  }
})

test('embedded journey keeps its map, batches and return position', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const panel = page.locator('.temple-focus-content .scroll-viewport__scroll')
  await expect(panel.locator('.travel-map-shell')).toBeVisible()
  const card = panel.locator('.shared-vlog-card').first()
  await expect(card).toBeAttached()
  await card.scrollIntoViewIfNeeded()
  const scrollTop = await panel.evaluate((el) => el.scrollTop)
  await card.evaluate((el: HTMLButtonElement) => el.click())
  await expect(page).toHaveURL(/\/flanerie\/[^?]+\?from=home$/)
  await expect(page.locator('.flr-page')).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await expect(panel.locator('.shared-vlog-card').first()).toBeAttached()
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeCloseTo(scrollTop, -1)
  await panel
    .locator('.shared-vlog-card')
    .first()
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.flr-page')).toBeVisible()
  await page.locator('.detail-page-header__back').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 25000 }
  )
  await expect(panel.locator('.shared-vlog-card').first()).toBeAttached()
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeCloseTo(scrollTop, -1)
})

test('embedded content fades with the panel before it is unmounted', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  const root = page.locator('.temple-page')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.archive-content')).toBeVisible()
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(page.locator('.archive-content')).toBeAttached()
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(page.locator('.temple-menu')).toHaveCount(0)
})

test('focus expansion preserves scroll state and uses a progress bar without scroll masks', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const viewport = page.locator('.temple-focus-content')
  const scroll = viewport.locator('.scroll-viewport__scroll')
  await expect(scroll.locator('.shared-work-card').first()).toBeVisible({
    timeout: 15000,
  })
  await expect(viewport.locator('.page-hero-title')).toHaveCount(0)
  await expect(viewport).not.toHaveClass(/has-fixed-header/)
  await expect(viewport).toHaveCSS(
    'padding-top',
    testInfo.project.name.includes('mobile') ? '48px' : '40px'
  )
  await expect(scroll).toHaveCSS('mask-image', 'none')
  const viewportShift = await scroll.evaluate((el) => {
    const before = el.getBoundingClientRect().top
    el.scrollTop = 400
    return el.getBoundingClientRect().top - before
  })
  expect(Math.abs(viewportShift)).toBeLessThanOrEqual(1)
  await expect(scroll.locator('.page-hero-title')).toHaveCount(0)
  await expect(scroll).toHaveCSS('mask-image', 'none')
  await expect(
    page.locator('body > .page-scroll-progress.is-embedded')
  ).toBeVisible()
  if (testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.temple-expand')).toHaveCount(0)
    expect(
      await page
        .locator('.temple-page')
        .evaluate((el) => getComputedStyle(el, '::after').maskImage)
    ).toBe('none')
    return
  }
  const initialWidth = (await viewport.boundingBox())!.width
  const scrollTop = await scroll.evaluate((el) => el.scrollTop)
  await page.locator('.temple-expand').click()
  await expect(page.locator('.temple-page')).toHaveClass(
    /temple-page--expanded/
  )
  await expect
    .poll(async () => (await viewport.boundingBox())!.width)
    .toBeGreaterThan(page.viewportSize()!.width * 0.8)
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeCloseTo(scrollTop, -1)
  await page.locator('.temple-expand').click()
  await expect
    .poll(async () => (await viewport.boundingBox())!.width)
    .toBeCloseTo(initialWidth, -1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
})

test('about opens over the scene without navigation, preserves focus, and closes from the mask or Escape', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const mobile = testInfo.project.name.includes('mobile')
  const open = async () => {
    if (mobile) await page.locator('.mobile-menu-icon').click()
    await page
      .locator(
        `${
          mobile ? '.mobile-menu-items' : '.menu-box'
        } [data-temple-nav="about"]`
      )
      .click()
    await expect(page.locator('.about-overlay .about-page')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('.about-overlay .page-hero-title')).toHaveCount(0)
    await expect(page.locator('.current-module-name')).toHaveText('ABOUT')
    await expect(page.locator('.about-overlay__mask')).toHaveCSS(
      'backdrop-filter',
      'none'
    )
    await expect(page.locator('.about-overlay__mask')).toHaveCSS(
      'mask-image',
      'none'
    )
    await expect(page).toHaveURL(/\/$/)
  }
  await open()
  await page
    .locator('.about-overlay__mask')
    .click({ position: { x: 8, y: 160 } })
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await open()
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await expect(page.locator('.current-module-name')).toHaveText('FLÂNERIE')
  expect(await page.locator('.shared-vlog-card .shuffle-text').count()).toBe(0)
})

test('fullscreen home leaves without changing its page or router geometry', async ({
  page,
}) => {
  test.setTimeout(60000)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const sample = () =>
      [root, container].map((el) => {
        const r = el.getBoundingClientRect()
        return [r.top, r.left]
      })
    ;(window as any).leaveGeometry = { before: sample(), frames: [] }
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('route-leave-active')) return
      observer.disconnect()
      const tick = () => {
        if (!root.isConnected) return
        ;(window as any).leaveGeometry.frames.push(sample())
        requestAnimationFrame(tick)
      }
      tick()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    ;(
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/craft')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0, { timeout: 15000 })
  const data = await page.evaluate(() => (window as any).leaveGeometry)
  expect(data.frames.length).toBeGreaterThan(2)
  for (const frame of data.frames)
    for (let element = 0; element < 2; element++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[element][axis] - data.before[element][axis])
        ).toBeLessThanOrEqual(1)
})

test('about mask fades immediately before content loads, aligns with the menu, and closes from blank space', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  if (testInfo.project.name.includes('mobile'))
    await page.locator('.mobile-menu-icon').click()
  const parent = testInfo.project.name.includes('mobile')
    ? '.mobile-menu-items'
    : '.menu-box'
  await page.locator(`${parent} [data-temple-nav="about"]`).evaluate((el) => {
    const samples: {
      backdrop: string
      alpha: number
      opacity: number
      hasContent: boolean
    }[] = []
    ;(window as any).aboutEnterSamples = samples
    ;(window as any).samplingAboutEnter = true
    const sample = () => {
      if (!(window as any).samplingAboutEnter) return
      const overlay = document.querySelector('.about-overlay')
      const mask = document.querySelector('.about-overlay__mask')
      if (overlay && mask) {
        samples.push({
          backdrop: getComputedStyle(mask).backdropFilter,
          alpha: parseFloat(
            getComputedStyle(mask).backgroundColor.split(',')[3] ?? '1'
          ),
          opacity: Number(getComputedStyle(overlay).opacity),
          hasContent: !!overlay.querySelector('.about-page'),
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    ;(el as HTMLButtonElement).click()
  })
  await expect(page.locator('.about-overlay')).toBeVisible()
  await expect(page.locator('.about-overlay__content')).toBeAttached()
  await expect(page.locator('.about-overlay__mask')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0.9)'
  )
  expect(
    await page
      .locator('.about-overlay')
      .evaluate((el) => getComputedStyle(el).transitionProperty)
  ).toContain('opacity')
  await expect(page.locator('.about-overlay .about-page')).toBeVisible({
    timeout: 12000,
  })
  await expect(page.locator('.about-overlay .about-page')).toHaveCSS(
    'opacity',
    '1'
  )
  const samples = await page.evaluate(() => {
    ;(window as any).samplingAboutEnter = false
    return (window as any).aboutEnterSamples as {
      backdrop: string
      alpha: number
      opacity: number
      hasContent: boolean
    }[]
  })
  expect(samples.every(({ backdrop }) => backdrop === 'none')).toBe(true)
  expect(samples.some(({ alpha }) => alpha > 0 && alpha < 0.9)).toBe(true)
  expect(samples.every(({ opacity }) => opacity === 1)).toBe(true)
  expect(samples.some(({ hasContent }) => hasContent)).toBe(true)
  expect(
    samples
      .filter(({ hasContent }) => hasContent)
      .every(({ alpha }) => alpha >= 0.89)
  ).toBe(true)
  const contentGeometry = await page
    .locator('.about-overlay__content')
    .evaluate((el) => {
      const bounds = el.getBoundingClientRect()
      const inset =
        innerWidth <= 768
          ? 24
          : parseFloat(getComputedStyle(document.documentElement).fontSize) *
            (1.33333 + 0.66667)
      return { left: bounds.left, right: innerWidth - bounds.right, inset }
    })
  expect(contentGeometry.left).toBeCloseTo(contentGeometry.inset, 0)
  expect(contentGeometry.right).toBeCloseTo(contentGeometry.inset, 0)
  const progress = page.locator(
    'body > .page-scroll-progress.is-embedded[style*="z-index: 1200"]'
  )
  await expect(progress).toHaveCount(1)
  expect(
    await progress.evaluate(
      (el) => innerWidth - el.getBoundingClientRect().right
    )
  ).toBeLessThanOrEqual(1)
  await page
    .locator('.about-overlay__mask')
    .click({ position: { x: 5, y: 180 } })
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(progress).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
})

test('module colors synchronize the page and model and all crystals remain hoverable', async ({
  page,
}, testInfo) => {
  const stage = page.locator('.temple-stage')
  await expect(page.locator('.site-brand')).toHaveCount(0)
  await expect(stage).toHaveAttribute('data-model', 'lucario')
  const originalModelColor = await stage.getAttribute('data-statue-color')
  if (!testInfo.project.name.includes('mobile')) {
    for (const [id, color, index] of [
      ['archive', '#3276fe', 0],
      ['flanerie', '#8a2c1b', 1],
      ['island', '#e23456', 2],
      ['pokeyard', '#f1c640', 3],
    ] as const) {
      const box = (await page.locator(`[data-obelisk="${id}"]`).boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25)
      await expect(stage).toHaveAttribute('data-hovered', id)
      await expect
        .poll(
          async () =>
            (await stage.getAttribute('data-cap-colors'))?.split(',')[index]
        )
        .toBe(color)
    }
  }
  for (const [id, color] of [
    ['archive', '#3276fe'],
    ['flanerie', '#8a2c1b'],
  ] as const) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      id
    )
    await expect(stage).toHaveAttribute('data-theme-color', color)
    await expect
      .poll(() => stage.getAttribute('data-statue-color'))
      .not.toBe(originalModelColor)
    expect(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--page-theme-color')
      )
    ).toBe(color)
    await expect(page.locator('.site-brand')).toHaveText('Anutrium')
    const rgb = color
      .match(/[0-9a-f]{2}/gi)!
      .map((channel) => parseInt(channel, 16))
    await expect(page.locator('.current-module-name')).toHaveCSS(
      'color',
      `rgb(${rgb.join(', ')})`
    )
    if (id === 'archive') {
      const accent = `rgb(${rgb.join(', ')})`
      await expect(page.locator('.work-card-corner').first()).toHaveCSS(
        'background-color',
        accent
      )
      await expect(page.locator('.work-card-info small').first()).toHaveCSS(
        'color',
        accent
      )
      await expect(page.locator('.availability-cta').first()).toHaveCSS(
        'color',
        accent
      )
      await expect(page.locator('.availability-github')).toHaveCSS(
        '--github-contribution-4',
        color
      )
      expect(
        await page
          .locator('.availability-panel')
          .evaluate(
            (element) => getComputedStyle(element, '::before').backgroundColor
          )
      ).toBe(accent)
    }
  }
  await page.keyboard.press('Escape')
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-theme-color', '#e23456')
  await expect(stage).toHaveAttribute('data-statue-color', originalModelColor!)
  await expect(page.locator('.site-brand')).toHaveCount(0)
})

test('expansion fades its header, resizes content and safely cancels when focus exits', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Mobile content already fills the screen'
  )
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.archive-content')).toBeVisible()
  const panel = page.locator('.temple-menu')
  await page.locator('.temple-expand').click()
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.temple-menu__body')).toHaveJSProperty(
    'inert',
    true
  )
  await expect
    .poll(() =>
      page.locator('.temple-menu').evaluate((el) => el.getAnimations().length)
    )
    .toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.temple-menu__body')).toHaveCSS('opacity', '1')
})

test('header fades in and out and its brand never stretches', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const logo = (await page.locator('.logo-box .logo').boundingBox())!
  expect(
    Math.abs(logo.x + logo.width / 2 - page.viewportSize()!.width / 2)
  ).toBeLessThanOrEqual(1)
  const mobile = testInfo.project.name.includes('mobile')
  const nav = page.locator(mobile ? '.mobile-menu-icon' : '.desktop-menu')
  const samples = await page.evaluate(
    async (selector) => {
      const frames: {
        logoMoving: boolean
        logoDuration: number
        fadeDuration: string
        navOpacity: number | null
      }[] = []
      document
        .querySelector<HTMLButtonElement>('[data-obelisk="archive"]')!
        .click()
      await new Promise<void>((resolve) => {
        const sample = () => {
          const logo = document.querySelector('.logo-box .logo')!
          const nav = document.querySelector(selector)
          const navOpacity = nav ? Number(getComputedStyle(nav).opacity) : null
          frames.push({
            logoMoving: logo.getAnimations().length > 0,
            logoDuration: Number(
              logo.getAnimations()[0]?.effect?.getTiming().duration || 0
            ),
            fadeDuration: nav ? getComputedStyle(nav).transitionDuration : '',
            navOpacity,
          })
          if (navOpacity === 1) resolve()
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return frames
    },
    mobile ? '.mobile-menu-icon' : '.desktop-menu'
  )
  expect(
    samples.some((frame) => frame.logoMoving && frame.navOpacity === null)
  ).toBe(true)
  expect(samples.some((frame) => frame.logoDuration === 2000)).toBe(true)
  expect(
    samples.some(
      (frame) =>
        frame.navOpacity !== null &&
        frame.navOpacity > 0 &&
        frame.navOpacity < 1
    )
  ).toBe(true)
  expect(
    samples
      .filter((frame) => frame.navOpacity !== null)
      .every((frame) => !frame.logoMoving)
  ).toBe(true)
  await expect(nav).toHaveCSS('opacity', '1')
  expect(samples.some((frame) => frame.fadeDuration === '0.8s')).toBe(true)
  const brand = page.locator('.site-brand')
  const focusedLogo = (await page.locator('.logo-box .logo').boundingBox())!
  const brandBox = (await brand.boundingBox())!
  const rootFont = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  )
  expect(brandBox.x - focusedLogo.x - focusedLogo.width).toBeCloseTo(
    rootFont * 0.16667,
    0
  )
  const before = (await brand.boundingBox())!.width
  await page.locator('.logo-box').hover()
  await page.waitForTimeout(850)
  expect((await brand.boundingBox())!.width).toBeCloseTo(before, 1)
  const navBefore = (await nav.boundingBox())!
  const brandBefore = (await brand.boundingBox())!
  const exitMotion = await page.evaluate(
    async (selector) => {
      const frames: {
        opacity: number
        navX: number
        logoMoving: boolean
        brandOpacity: number
        brandX: number
        brandWidth: number
      }[] = []
      let opacityTransition = false
      document
        .querySelector(selector)!
        .addEventListener('transitionrun', (event) => {
          if ((event as TransitionEvent).propertyName === 'opacity')
            opacityTransition = true
        })
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await new Promise<void>((resolve) => {
        const sample = () => {
          const nav = document.querySelector(selector)
          if (!nav) return resolve()
          const brand = document.querySelector('.site-brand')
          const brandBox = brand?.getBoundingClientRect()
          frames.push({
            opacity: Number(getComputedStyle(nav).opacity),
            navX: nav.getBoundingClientRect().x,
            logoMoving:
              document.querySelector('.logo-box .logo')!.getAnimations()
                .length > 0,
            brandOpacity: brand
              ? Number(getComputedStyle(brand.parentElement!).opacity)
              : 0,
            brandX: brandBox?.x || 0,
            brandWidth: brandBox?.width || 0,
          })
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return { frames, opacityTransition }
    },
    mobile ? '.mobile-menu-icon' : '.desktop-menu'
  )
  const exitFrames = exitMotion.frames
  expect(
    exitMotion.opacityTransition ||
      exitFrames.some((frame) => frame.opacity > 0 && frame.opacity < 1)
  ).toBe(true)
  for (const frame of exitFrames.filter((frame) => frame.opacity > 0)) {
    expect(Math.abs(frame.navX - navBefore.x)).toBeLessThanOrEqual(1)
  }
  for (const frame of exitFrames.filter((frame) => frame.brandOpacity > 0)) {
    expect(Math.abs(frame.brandX - brandBefore.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(frame.brandWidth - brandBefore.width)).toBeLessThanOrEqual(
      1
    )
  }
  expect(
    exitFrames.some((frame) => frame.opacity > 0 && frame.logoMoving)
  ).toBe(true)
  await expect(nav).toHaveCount(0)
  await expect(brand).toHaveCount(0)
  await expect
    .poll(async () => {
      const rect = (await page.locator('.logo-box .logo').boundingBox())!
      return Math.abs(rect.x + rect.width / 2 - page.viewportSize()!.width / 2)
    })
    .toBeLessThanOrEqual(1)
})

test('logo return stays continuous when the centered layout takes over', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk=archive]')
    .evaluate((el) => (el as HTMLElement).click())
  await expect(page.locator('.temple-menu')).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await expect(page.locator('.layout-page')).not.toHaveClass(
    /temple-header-default/
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const handoff = await page.evaluate(async () => {
    const logo = document.querySelector('.logo-box .logo')!
    const shell = document.querySelector('.layout-page')!
    const frames: { x: number; y: number; centered: boolean }[] = []
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await new Promise<void>((resolve) => {
      const sample = () => {
        frames.push({
          x: logo.getBoundingClientRect().x,
          y: logo.getBoundingClientRect().y,
          centered: shell.classList.contains('temple-header-default'),
        })
        if (frames.at(-1)!.centered) resolve()
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return frames.slice(-2)
  })
  expect(handoff).toHaveLength(2)
  expect(handoff[0].centered).toBe(false)
  expect(handoff[1].centered).toBe(true)
  expect(Math.abs(handoff[1].y - handoff[0].y)).toBeLessThanOrEqual(1)
  expect(Math.abs(handoff[1].x - handoff[0].x)).toBeLessThanOrEqual(1)
})

test('focused modules tint the half-screen zodiac and rotate to their configured signs', async ({
  page,
}) => {
  const chart = page.locator('.star-container')
  await expect(chart).toHaveClass(/is-red-layout/)
  for (const [id, glyph, color] of [
    ['archive', '♒︎', '#3276fe'],
    ['flanerie', '♐︎', '#8a2c1b'],
    ['island', '♓︎', '#e23456'],
    ['pokeyard', '♌︎', '#f1c640'],
  ]) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(chart).toHaveClass(/is-content-layout/)
    await expect(chart).toHaveClass(/is-theme-tinted/)
    await expect(
      chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
    ).toHaveText(glyph)
    await expect(chart).toHaveCSS('--chart-strong', color)
    const rgb = color
      .slice(1)
      .match(/../g)!
      .map((value) => parseInt(value, 16))
    await expect(chart.locator('.zodiac-static-art--tinted')).toHaveCSS(
      'background-color',
      `rgb(${rgb.join(', ')})`
    )
    await expect(
      chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
    ).toHaveCSS('color', `rgb(${rgb.join(', ')})`)
    await expect(chart).toHaveCSS('--stage-opacity', '0.15')
    if (id === 'island' || id === 'pokeyard') {
      await expect(page.locator('.temple-menu')).toBeVisible()
      await expect(
        page.locator('.archive-content, .journey-content')
      ).toHaveCount(0)
    }
  }
  await page.keyboard.press('Escape')
  await expect(chart).toHaveClass(/is-red-layout/)
  await expect(
    chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
  ).toHaveText('♓︎')
})

test('expansion fades to black while the viewport grows and keeps content visible', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Mobile content already fills the screen'
  )
  for (const id of ['archive', 'island']) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
    for (const expanded of [true, false]) {
      const frames = await page.evaluate(async () => {
        const panel = document.querySelector<HTMLElement>('.temple-menu')!
        const body = panel.querySelector<HTMLElement>('.temple-menu__body')!
        const viewport = panel.querySelector<HTMLElement>('.scroll-viewport')!
        const root = document.querySelector('.temple-page')!
        const shade = root.querySelector('.temple-fullscreen-shade')!
        const frames: {
          expanded: boolean
          width: number
          opacity: number
          clip: string
          viewportMotion: string
          resizing: boolean
          shadeOpacity: number
          stageVisibility: string
          shadeBackground: string
        }[] = []
        panel.querySelector<HTMLButtonElement>('.temple-expand')!.click()
        await new Promise<void>((resolve, reject) => {
          const started = performance.now()
          const sample = () => {
            frames.push({
              expanded: root.classList.contains('temple-page--expanded'),
              width: viewport.clientWidth,
              opacity: Number(getComputedStyle(body).opacity),
              clip: getComputedStyle(body).clipPath,
              viewportMotion: getComputedStyle(viewport).transform,
              resizing: panel.getAttribute('aria-busy') === 'true',
              shadeOpacity: Number(getComputedStyle(shade).opacity),
              stageVisibility: getComputedStyle(
                root.querySelector('.temple-stage')!
              ).visibility,
              shadeBackground: getComputedStyle(shade).backgroundImage,
            })
            if (
              frames.length > 1 &&
              panel.getAttribute('aria-busy') === 'false'
            )
              resolve()
            else if (performance.now() - started > 4000)
              reject(new Error('Resize did not settle'))
            else requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        return frames
      })
      expect(frames.every((frame) => frame.opacity === 1)).toBe(true)
      const targetFrames = frames.filter((frame) => frame.expanded === expanded)
      expect(targetFrames.length).toBeGreaterThan(1)
      const widths = targetFrames.map((frame) => frame.width)
      expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(
        page.viewportSize()!.width * 0.2
      )
      expect(new Set(widths).size).toBeGreaterThan(1)
      if (id === 'archive') {
        const columns = await page
          .locator('.works-grid')
          .first()
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
          )
        expect(columns).toBe(expanded ? 4 : 2)
      }
      if (expanded) {
        expect(
          targetFrames
            .filter((frame) => frame.resizing)
            .some((frame) => frame.shadeOpacity > 0 && frame.shadeOpacity < 1)
        ).toBe(true)
        expect(
          targetFrames
            .filter((frame) => frame.stageVisibility === 'hidden')
            .every((frame) => frame.shadeOpacity > 0.99)
        ).toBe(true)
        const shade = page.locator('.temple-fullscreen-shade')
        await expect(shade).toHaveCSS('opacity', '1')
        await expect(shade).toHaveCSS('mask-image', 'none')
        expect(
          await shade.evaluate((el) => getComputedStyle(el).backgroundImage)
        ).toContain('repeating-linear-gradient')
        await expect(page.locator('.temple-stage')).toHaveCSS(
          'visibility',
          'hidden'
        )
        await expect(page.locator('.temple-stage canvas')).toHaveCSS(
          'visibility',
          'hidden'
        )
        await expect(page.locator('.temple-obelisks')).toHaveCSS(
          'visibility',
          'hidden'
        )
      } else {
        await expect(page.locator('.temple-stage')).toHaveCSS(
          'visibility',
          'visible'
        )
        await expect(page.locator('.temple-stage canvas')).toHaveCSS(
          'visibility',
          'visible'
        )
        await expect(page.locator('.temple-obelisks')).toHaveCSS(
          'visibility',
          'visible'
        )
      }
      expect(new Set(frames.map((frame) => frame.shadeBackground)).size).toBe(1)
      await expect(page.locator('.temple-menu__header')).toHaveCount(0)
      await expect(page.locator('.temple-menu')).toHaveAttribute(
        'aria-busy',
        'false'
      )
    }
  }
})

test('theme fades directly from red to blue over 1.1 seconds', async ({
  page,
}) => {
  await page.mouse.move(20, 100)
  const sample = () =>
    page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')!
      const original = stage.dataset.statueColor!
      const colors: string[] = []
      const started = performance.now()
      const until = started + 1400
      let intermediate: string | undefined
      ;(
        document.querySelector(`[data-obelisk="archive"]`) as HTMLButtonElement
      ).click()
      await new Promise<void>((resolve) => {
        const frame = () => {
          colors.push(stage.dataset.statueColor!)
          const elapsed = performance.now() - started
          if (elapsed >= 700 && elapsed < 900)
            intermediate = stage.dataset.statueColor!
          if (performance.now() < until) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
      return { original, colors, intermediate }
    })
  for (const focus of [true, false]) {
    const result = await sample()
    expect(new Set(result.colors).size).toBeGreaterThan(6)
    const channels = result.colors.map((color) =>
      color
        .slice(1)
        .match(/../g)!
        .map((channel) => parseInt(channel, 16))
    )
    // 实际颜色直接在红、蓝之间过渡，既不闪黄，也不经过刻意去饱和的中性色。
    for (const [r, g, b] of channels) {
      const high = Math.max(r, g, b)
      const low = Math.min(r, g, b)
      const saturation = high ? (high - low) / high : 0
      const yellow = r > b && g > b && Math.abs(r - g) < (high - low) * 0.6
      expect(yellow && saturation > 0.25).toBe(false)
      expect(Math.max(r, b) - g).toBeGreaterThan(28)
    }
    expect(result.intermediate).toBeDefined()
    expect(result.intermediate).not.toBe(
      result.colors[result.colors.length - 1]
    )
    const final = channels[channels.length - 1]
    expect(focus ? final[2] > final[0] : final[0] > final[2]).toBe(true)
  }
})

test('focus exit waits for the submenu before restoring the scene', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const homeCamera = await stage.getAttribute('data-camera-position')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // 延长真实 CSS 退场，验证回程依赖完成信号，而不是写死菜单动画的等待时长。
  await page.addStyleTag({
    content: '.temple-menu { transition-duration: 2s !important; }',
  })
  const focused = await stage.evaluate((el) => [
    el.getAttribute('data-camera-position'),
    el.getAttribute('data-head-rotation'),
    el.getAttribute('data-head-nod-angle'),
    el.getAttribute('data-theme-color'),
  ])
  await page.keyboard.press('Escape')
  const panel = page.locator('.temple-menu')
  await expect(panel).toHaveClass(/temple-menu-reveal-leave-active/)
  await panel.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.pause()
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  await expect(root).toHaveAttribute('data-selected', 'archive')
  expect(
    await stage.evaluate((el) => [
      el.getAttribute('data-camera-position'),
      el.getAttribute('data-head-rotation'),
      el.getAttribute('data-head-nod-angle'),
      el.getAttribute('data-theme-color'),
    ])
  ).toEqual(focused)
  await panel.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.finish()
  })
  await expect(panel).toHaveCount(0)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-camera-position', homeCamera!)
  await expect(stage).toHaveAttribute('data-theme-color', '#e23456')
})

test('switching focus during submenu exit cancels the pending return', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addStyleTag({
    content: '.temple-menu { transition-duration: 2s !important; }',
  })
  const panel = await page.locator('.temple-menu').elementHandle()
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-menu')).toHaveClass(
    /temple-menu-reveal-leave-active/
  )
  await panel!.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.pause()
  })
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-selected', 'flanerie')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await panel!.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.finish()
  })
  await expect(page.locator('.temple-menu-reveal-leave-active')).toHaveCount(0)
  await expect(root).toHaveAttribute('data-selected', 'flanerie')
  await expect(page.locator('.journey-content')).toBeVisible()
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-head-aim',
    'flanerie'
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-theme-color',
    '#8a2c1b'
  )
})

test('focus aims the head at the pillar and restores delayed pointer tracking on exit', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const stage = page.locator('.temple-stage')
  for (const [id, sign] of [
    ['flanerie', -1],
    ['island', 1],
  ] as const) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(stage).toHaveAttribute('data-head-aim', id)
    expect(
      Number(await stage.getAttribute('data-head-turn-progress'))
    ).toBeLessThan(1)
    await expect(page.locator('.temple-focus-content')).toBeAttached()
    await expect(stage).toHaveAttribute('data-head-turn-progress', '1.000')
    const pose = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    expect(pose[1] * sign).toBeGreaterThan(
      testInfo.project.name.includes('mobile') ? 0.15 : 0.35
    )
    await page.mouse.move(page.viewportSize()!.width * 0.8, 120)
    await page.waitForTimeout(250)
    const after = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    expect(
      Math.max(...after.map((value, i) => Math.abs(value - pose[i])))
    ).toBeLessThan(0.00001)
  }
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-head-aim', 'center')
  await page.mouse.move(page.viewportSize()!.width * 0.05, 120)
  await page.mouse.move(page.viewportSize()!.width * 0.95, 120)
  await expect(stage).toHaveAttribute('data-head-aim', 'pointer')
  expect(
    Math.abs(
      Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
    )
  ).toBeLessThan(0.001)
  await page.mouse.move(page.viewportSize()!.width * 0.8, 120)
  await expect
    .poll(async () =>
      Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
    )
    .toBeGreaterThan(0.05)
})

test('pillar hover colors the shaft and dims the environment with a reversible transition', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Touch devices do not have persistent hover'
  )
  const stage = page.locator('.temple-stage')
  const before = await stage.getAttribute('data-body-colors')
  const statue = await stage.getAttribute('data-statue-color')
  const box = (await page.locator('[data-obelisk="archive"]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25)
  await expect(stage).toHaveAttribute('data-hovered', 'archive')
  await expect
    .poll(async () =>
      Number(await stage.getAttribute('data-environment-brightness'))
    )
    .toBeLessThan(0.5)
  await expect(stage).not.toHaveAttribute('data-body-colors', before!)
  await expect(stage).not.toHaveAttribute('data-statue-color', statue!)
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-environment-brightness', '1.000')
  await expect(stage).toHaveAttribute('data-body-colors', before!)
  await expect(stage).toHaveAttribute('data-statue-color', statue!)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-hovered', 'none')
  await expect(stage).toHaveAttribute('data-environment-brightness', '0.420')
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-environment-brightness', '1.000')
})
